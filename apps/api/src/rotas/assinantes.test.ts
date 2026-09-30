import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { beforeAll, describe, expect, it } from 'vitest'
import { corpo } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

interface Assinante {
  id: string
  nome: string
  cep: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  endereco: string
}

const app = criarApp()
let gestora: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
})

const buscar = (busca?: string) =>
  corpo<Assinante[]>(
    app.request(`/api/assinantes${busca === undefined ? '' : `?busca=${busca}`}`, {
      headers: gestora,
    }),
  )

describe('GET /api/assinantes', () => {
  it('exige sessão', async () => {
    expect((await app.request('/api/assinantes')).status).toBe(401)
  })

  it('é só para a gestão', async () => {
    const carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
    expect((await app.request('/api/assinantes', { headers: carlos })).status).toBe(403)
  })

  it('sem busca devolve no máximo 8, em ordem de nome', async () => {
    const lista = await buscar()
    expect(lista).toHaveLength(8)
    const nomes = lista.map((a) => a.nome)
    expect(nomes).toEqual([...nomes].sort((a, b) => a.localeCompare(b, 'pt-BR')))
  })

  it('acha por nome sem acentos e sem maiúsculas, com endereço montado e CEP', async () => {
    const lista = await buscar('CLINICA')
    expect(lista).toHaveLength(1)
    expect(lista[0]).toMatchObject({
      nome: 'Clínica Vida',
      cep: '01304001',
      logradouro: 'Rua Augusta',
      numero: '1492',
      complemento: null,
      bairro: 'Consolação',
      cidade: 'São Paulo',
      endereco: 'Rua Augusta, 1492 · Consolação',
    })
  })

  it('o endereço traz o complemento depois do número, quando o assinante tem', async () => {
    const { id } = await prisma.assinante.findFirstOrThrow({ where: { nome: 'Clínica Vida' } })
    await prisma.assinante.update({ where: { id }, data: { complemento: 'sala 52' } })
    try {
      const [clinica] = await buscar('clinica')
      expect(clinica).toMatchObject({
        complemento: 'sala 52',
        endereco: `${clinica!.logradouro}, ${clinica!.numero}, sala 52 · ${clinica!.bairro}`,
      })
    } finally {
      await prisma.assinante.update({ where: { id }, data: { complemento: null } })
    }
  })

  it('sem resultado devolve lista vazia', async () => {
    expect(await buscar('zzzzzz')).toEqual([])
  })
})
