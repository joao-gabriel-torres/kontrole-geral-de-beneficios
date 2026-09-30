import { GESTORA_DEV, semear } from '@kgb/db/seed'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hojeSP } from '../../test/dados'
import type { UsuarioSessao } from '../contexto'
import { prisma } from '../db'
import { criarAcionamento } from './acionamentos'

const GESTORA: UsuarioSessao = {
  id: GESTORA_DEV.id,
  nome: GESTORA_DEV.nome,
  email: GESTORA_DEV.email,
  papel: 'gestor',
  prestadorId: null,
}

const dados = (prestadorId: string) => ({
  titulo: 'Corrida com a exclusão',
  cliente: 'Cliente Teste',
  endereco: 'Rua Teste, 1 · Centro',
  data: hojeSP(),
  inicio: '09:00',
  fim: '10:00',
  tipoIds: ['t1'],
  prestadorId,
})

beforeAll(() => semear(prisma))
afterAll(() => semear(prisma))

/** Espera alguma consulta deste banco ficar parada numa trava. */
async function esperarTrava() {
  for (let i = 0; i < 250; i++) {
    const [{ esperando }] = await prisma.$queryRaw<{ esperando: number }[]>`
      SELECT count(*)::int AS esperando FROM pg_stat_activity
      WHERE datname = current_database() AND wait_event_type = 'Lock'`
    if (esperando > 0) return
    await new Promise((r) => setTimeout(r, 20))
  }
  throw new Error('nenhuma consulta ficou esperando a trava')
}

describe('criarAcionamento', () => {
  it('no meio de uma exclusão do prestador, espera e recusa o excluído', async () => {
    const antes = await prisma.acionamento.count({ where: { prestadorId: 'p6' } })
    let liberar = () => {}
    const liberado = new Promise<void>((r) => (liberar = r))
    let avisar = () => {}
    const travou = new Promise<void>((r) => (avisar = r))

    // A exclusão (excluirPrestador) trava a linha, confere que não há nada em aberto e marca
    // excluidoEm; aqui ela fica aberta até a criação chegar à trava.
    const exclusao = prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM prestador WHERE id = 'p6' FOR UPDATE`
      await tx.prestador.update({
        where: { id: 'p6' },
        data: { excluidoEm: new Date(), status: 'inativo' },
      })
      avisar()
      await liberado
    })
    await travou
    const criacao = criarAcionamento(GESTORA, dados('p6')).then(
      () => null,
      (e: unknown) => e,
    )
    await esperarTrava()
    liberar()
    await exclusao

    expect(await criacao).toMatchObject({
      codigo: 'prestador_inativo',
      message: 'Escolha um prestador ativo',
    })
    expect(await prisma.acionamento.count({ where: { prestadorId: 'p6' } })).toBe(antes)
  })
})
