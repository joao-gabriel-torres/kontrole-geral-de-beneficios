import { randomBytes, randomUUID } from 'node:crypto'
import { Prisma } from '@kgb/db'
import type { UsuarioSessao } from '../contexto'
import { correio } from '../correio'
import { prisma } from '../db'
import { ErroDominio } from '../dominio/acionamento'
import {
  emailDoConvite,
  expiracaoDoConvite,
  identificadorGravado,
  linkDoConvite,
  MENSAGENS_CONVITE,
  momentoDoConvite,
  normalizarEmail,
  PREFIXO_CONVITE,
  PREFIXO_CONVITE_GRAVADO,
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
export class ErroEnvioConvite extends ErroHttp {
  constructor(causa: unknown) {
    super(502, 'envio_email_falhou', MENSAGENS_CONVITE.envioFalhou, { cause: causa })
    this.name = 'ErroEnvioConvite'
  }
}

/** Registros de convite: os com hash e os antigos, em texto puro, que valem até vencer. */
const EH_CONVITE = {
  OR: [
    { identifier: { startsWith: PREFIXO_CONVITE_GRAVADO } },
    { identifier: { startsWith: PREFIXO_CONVITE } },
  ],
} satisfies Prisma.VerificationWhereInput

/** Os convites (tokens de redefinição do Better Auth) de um usuário. */
export function convitesDoUsuario(userId: string): Prisma.VerificationWhereInput {
  return { value: userId, ...EH_CONVITE }
}

/** Outra conta pegou o e-mail entre a conferência e a gravação: o índice único responde. */
function recusarEmailDuplicado(erro: unknown): never {
  if (erro instanceof Prisma.PrismaClientKnownRequestError && erro.code === 'P2002') {
    throw new ErroDominio('email_em_uso', MENSAGENS_CONVITE.emailEmUso, 409)
  }
  throw erro
}

/** A conta que já usa o e-mail (sem diferenciar maiúsculas), se houver. */
const contaDoEmail = (tx: Prisma.TransactionClient, email: string) =>
  tx.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { prestadorId: true },
  })

/**
 * Leva a troca do e-mail do cadastro ao login do usuário vinculado, com a mesma checagem de
 * conflito do convite. Os convites pendentes caem, porque o link foi para o endereço antigo. Sem
 * usuário vinculado, sem e-mail novo ou com o mesmo e-mail, o login fica como está.
 * Roda na transação da edição, com a linha do prestador travada.
 */
export async function sincronizarLogin(
  tx: Prisma.TransactionClient,
  prestadorId: string,
  emailAnterior: string | null,
  emailNovo: string | null,
): Promise<void> {
  const novo = normalizarEmail(emailNovo)
  if (!novo || novo === normalizarEmail(emailAnterior)) return
  const usuario = await tx.user.findUnique({ where: { prestadorId }, select: { id: true } })
  if (!usuario) return
  const email = verificarConvite({
    prestadorId,
    email: novo,
    contaDoEmail: await contaDoEmail(tx, novo),
  })
  await tx.user.update({ where: { id: usuario.id }, data: { email } }).catch(recusarEmailDuplicado)
  await tx.verification.deleteMany({ where: convitesDoUsuario(usuario.id) })
}

interface PrestadorTravado {
  nome: string
  email: string | null
  excluidoEm: Date | null
}

/**
 * Envia (ou reenvia) o convite de acesso: cria ou atualiza o usuário do prestador, grava um token
 * de redefinição do Better Auth de 7 dias e manda o e-mail. Quem já tem senha recebe o mesmo
 * convite, que funciona como redefinição. Só a gestão convida.
 *
 * Os convites anteriores só caem depois que o e-mail sai: um reenvio que falha no servidor de
 * e-mail deixa valendo o link que o prestador já recebeu.
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
  const identificador = identificadorGravado(`${PREFIXO_CONVITE}${token}`)
  const expiraEm = expiracaoDoConvite(agora)

  const { nome, email, usuarioId, criadoEm } = await prisma
    .$transaction(async (tx) => {
      // Convites simultâneos do mesmo prestador nascem em fila, cada um depois do anterior
      // (momentoDoConvite). No fim sobra só o mais novo entre os que saíram.
      const [prestador] = await tx.$queryRaw<PrestadorTravado[]>`
        SELECT nome, email, "excluidoEm" FROM prestador WHERE id = ${prestadorId} FOR UPDATE`
      if (!prestador || prestador.excluidoEm) throw naoEncontrado('Prestador')
      const normalizado = normalizarEmail(prestador.email)
      const email = verificarConvite({
        prestadorId,
        email: prestador.email,
        contaDoEmail: normalizado ? await contaDoEmail(tx, normalizado) : null,
      })

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

      const ultimo = await tx.verification.findFirst({
        where: convitesDoUsuario(usuario.id),
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      })
      const criadoEm = momentoDoConvite(ultimo?.createdAt ?? null, agora)
      // O mesmo registro que o internalAdapter do Better Auth grava com o storeIdentifier de
      // auth.ts (só o hash do identificador), mas nesta transação: usa a conexão que segura a
      // trava do prestador, em vez de pedir outra ao pool, e some junto se a transação falhar.
      await tx.verification.create({
        data: {
          id: randomUUID(),
          identifier: identificador,
          value: usuario.id,
          expiresAt: expiraEm,
          createdAt: criadoEm,
        },
      })
      return { nome: prestador.nome, email, usuarioId: usuario.id, criadoEm }
    })
    .catch(recusarEmailDuplicado)

  const mensagem = emailDoConvite({
    nome,
    email,
    link: linkDoConvite(env.URL_APP_PRESTADOR, token),
  })
  try {
    await correio().enviar({ para: email, ...mensagem })
  } catch (erro) {
    // Sem e-mail, o link nunca chega: só este token sai, e o convite anterior continua valendo.
    await prisma.verification.deleteMany({ where: { identifier: identificador } })
    console.error(`[correio] falha ao enviar o convite para ${email}`, erro)
    throw new ErroEnvioConvite(erro)
  }
  // O e-mail saiu: os convites anteriores a este deixam de valer. Um mais novo, se houver, fica.
  await prisma.verification.deleteMany({
    where: { ...convitesDoUsuario(usuarioId), createdAt: { lt: criadoEm } },
  })
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
          expiresAt: { gt: agora },
          ...EH_CONVITE,
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
