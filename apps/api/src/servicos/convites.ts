import { randomBytes, randomUUID } from 'node:crypto'
import { Prisma } from '@kgb/db'
import { HTTPException } from 'hono/http-exception'
import type { UsuarioSessao } from '../contexto'
import { correio } from '../correio'
import { prisma } from '../db'
import { ErroDominio } from '../dominio/acionamento'
import {
  emailDoConvite,
  expiracaoDoConvite,
  linkDoConvite,
  MENSAGENS_CONVITE,
  normalizarEmail,
  PREFIXO_CONVITE,
  situacaoDoAcesso,
  verificarConvite,
  type AcessoPrestador,
} from '../dominio/convites'
import { env } from '../env'
import { ErroHttp, naoEncontrado } from '../erros'

export type { AcessoPrestador } from '../dominio/convites'

export interface ConviteEnviado {
  /** E-mail que recebeu o convite e vira o login. */
  email: string
  /** Validade do link (ISO). */
  expiraEm: string
}

/** O servidor de e-mail recusou ou não respondeu: 502 com uma mensagem para a gestão. */
export class ErroEnvioConvite extends HTTPException {
  constructor(causa: unknown) {
    super(502, {
      message: 'Não foi possível enviar o e-mail do convite. Tente de novo.',
      cause: causa,
    })
  }
}

/** Os convites (tokens de redefinição do Better Auth) de um usuário. */
export function convitesDoUsuario(userId: string): Prisma.VerificationWhereInput {
  return { value: userId, identifier: { startsWith: PREFIXO_CONVITE } }
}

interface PrestadorTravado {
  nome: string
  email: string | null
  excluidoEm: Date | null
}

/**
 * Envia (ou reenvia) o convite de acesso: cria ou atualiza o usuário do prestador, troca o token
 * de redefinição do Better Auth por um novo de 7 dias e manda o e-mail. Quem já tem senha recebe
 * o mesmo convite, que funciona como redefinição. Só a gestão convida.
 */
export async function enviarConvite(
  prestadorId: string,
  autor: Pick<UsuarioSessao, 'papel'>,
  agora = new Date(),
): Promise<ConviteEnviado> {
  if (autor.papel !== 'gestor') {
    throw new ErroHttp(403, 'sem_permissao', 'Seu papel não tem acesso a este recurso')
  }
  const token = randomBytes(32).toString('base64url')
  const identificador = `${PREFIXO_CONVITE}${token}`
  const expiraEm = expiracaoDoConvite(agora)

  const { nome, email } = await prisma
    .$transaction(async (tx) => {
      // Convites simultâneos do mesmo prestador ficam em fila: só o último token sobrevive.
      const [prestador] = await tx.$queryRaw<PrestadorTravado[]>`
        SELECT nome, email, "excluidoEm" FROM prestador WHERE id = ${prestadorId} FOR UPDATE`
      if (!prestador || prestador.excluidoEm) throw naoEncontrado('Prestador')
      const normalizado = normalizarEmail(prestador.email)
      const contaDoEmail = normalizado
        ? await tx.user.findFirst({
            where: { email: { equals: normalizado, mode: 'insensitive' } },
            select: { prestadorId: true },
          })
        : null
      const email = verificarConvite({ prestadorId, email: prestador.email, contaDoEmail })

      const existente = await tx.user.findUnique({ where: { prestadorId }, select: { id: true } })
      const usuario = existente
        ? await tx.user.update({
            where: { id: existente.id },
            data: { name: prestador.nome, email },
            select: { id: true },
          })
        : await tx.user.create({
            data: { id: randomUUID(), name: prestador.nome, email, role: 'prestador', prestadorId },
            select: { id: true },
          })

      await tx.verification.deleteMany({ where: convitesDoUsuario(usuario.id) })
      // O mesmo registro que o internalAdapter do Better Auth grava (identificador em texto puro,
      // sem verification.storeIdentifier), mas nesta transação: usa a conexão que segura a trava
      // do prestador, em vez de pedir outra ao pool, e some junto se a transação falhar.
      await tx.verification.create({
        data: {
          id: randomUUID(),
          identifier: identificador,
          value: usuario.id,
          expiresAt: expiraEm,
        },
      })
      return { nome: prestador.nome, email }
    })
    .catch((erro: unknown) => {
      // Outra conta pegou o e-mail entre a conferência e a gravação.
      if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
        throw new ErroDominio('email_em_uso', MENSAGENS_CONVITE.emailEmUso, 409)
      }
      throw erro
    })

  const mensagem = emailDoConvite({
    nome,
    email,
    link: linkDoConvite(env.URL_APP_PRESTADOR, token),
  })
  try {
    await correio().enviar({ para: email, ...mensagem })
  } catch (erro) {
    // Sem e-mail, o link nunca chega: o token sai para o prestador não parecer convidado.
    await prisma.verification.deleteMany({ where: { identifier: identificador } })
    console.error(`[correio] falha ao enviar o convite para ${email}`, erro)
    throw new ErroEnvioConvite(erro)
  }
  return { email, expiraEm: expiraEm.toISOString() }
}

/** Situação do acesso de cada prestador (ids desconhecidos ficam de fora). */
export async function acessosDosPrestadores(
  ids: readonly string[],
  agora = new Date(),
): Promise<Map<string, AcessoPrestador>> {
  if (ids.length === 0) return new Map()
  const prestadores = await prisma.prestador.findMany({
    where: { id: { in: [...ids] } },
    select: {
      id: true,
      email: true,
      usuario: {
        select: {
          id: true,
          accounts: {
            where: { providerId: 'credential', password: { not: null } },
            select: { id: true },
          },
        },
      },
    },
  })
  const usuarios = prestadores.flatMap((p) => (p.usuario ? [p.usuario.id] : []))
  const convites = usuarios.length
    ? await prisma.verification.findMany({
        where: {
          value: { in: usuarios },
          identifier: { startsWith: PREFIXO_CONVITE },
          expiresAt: { gt: agora },
        },
        select: { value: true },
      })
    : []
  const convidados = new Set(convites.map((c) => c.value))
  return new Map(
    prestadores.map((p) => [
      p.id,
      situacaoDoAcesso({
        email: p.email,
        temSenha: (p.usuario?.accounts.length ?? 0) > 0,
        conviteValido: p.usuario ? convidados.has(p.usuario.id) : false,
      }),
    ]),
  )
}
