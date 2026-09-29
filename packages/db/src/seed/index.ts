import { hashPassword } from 'better-auth/crypto'
import type { PrismaClient } from '../generated/prisma/client'
import { mapearDadosPrototipo, SENHA_DEV, type DadosSeed } from './mapear'
import { carregarDadosPrototipo } from './prototipo'

export { EMAIL_PRESTADOR_DEV, GESTORA_DEV, mapearDadosPrototipo, SENHA_DEV } from './mapear'
export type { DadosSeed, UsuarioSeed } from './mapear'
export { carregarDadosPrototipo } from './prototipo'

export interface ResumoSeed {
  tipos: number
  prestadores: number
  usuarios: number
  acionamentos: number
}

export function verificarAmbienteSeed(nodeEnv = process.env.NODE_ENV): void {
  if (nodeEnv === 'production') {
    throw new Error('Seed recusado com NODE_ENV=production: ele apaga os dados do banco.')
  }
}

/** Apaga os dados e recria tudo a partir do protótipo. Só para desenvolvimento e testes. */
export async function semear(
  prisma: PrismaClient,
  dados: DadosSeed = mapearDadosPrototipo(carregarDadosPrototipo()),
): Promise<ResumoSeed> {
  verificarAmbienteSeed()
  const hash = await hashPassword(SENHA_DEV)
  await prisma.$transaction(
    async (tx) => {
      await tx.foto.deleteMany()
      await tx.etapa.deleteMany()
      await tx.demanda.deleteMany()
      await tx.revisao.deleteMany()
      await tx.eventoAcionamento.deleteMany()
      await tx.acionamento.deleteMany()
      await tx.session.deleteMany()
      await tx.account.deleteMany()
      await tx.verification.deleteMany()
      await tx.user.deleteMany()
      await tx.prestador.deleteMany()
      await tx.tipoDemanda.deleteMany()
      await tx.configuracao.deleteMany()

      await tx.tipoDemanda.createMany({ data: dados.tipos })
      for (const p of dados.prestadores) {
        await tx.prestador.create({
          data: {
            ...p.dados,
            especialidades: {
              create: p.especialidades.map((tipoId, ordem) => ({ tipoId, ordem })),
            },
          },
        })
      }
      await tx.user.createMany({
        data: dados.usuarios.map((u) => ({
          id: u.id,
          name: u.nome,
          email: u.email,
          emailVerified: true,
          role: u.papel,
          prestadorId: u.prestadorId,
        })),
      })
      await tx.account.createMany({
        data: dados.usuarios
          .filter((u) => u.comSenha)
          .map((u) => ({
            id: `conta-${u.id}`,
            accountId: u.id,
            providerId: 'credential',
            userId: u.id,
            password: hash,
          })),
      })
      await tx.acionamento.createMany({ data: dados.acionamentos })
      await tx.demanda.createMany({ data: dados.demandas })
      await tx.etapa.createMany({ data: dados.etapas })
      await tx.foto.createMany({ data: dados.fotos })
      await tx.revisao.createMany({ data: dados.revisoes })
      await tx.eventoAcionamento.createMany({ data: dados.eventos })
      await tx.configuracao.create({ data: { id: 1 } })
      await tx.$executeRaw`SELECT setval(pg_get_serial_sequence('acionamento', 'numero'), (SELECT COALESCE(MAX(numero), 1) FROM acionamento))`
    },
    { timeout: 60_000 },
  )
  return {
    tipos: dados.tipos.length,
    prestadores: dados.prestadores.length,
    usuarios: dados.usuarios.length,
    acionamentos: dados.acionamentos.length,
  }
}
