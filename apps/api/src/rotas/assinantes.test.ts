import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
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
  latitude: number | null
  longitude: number | null
}

const app = criarApp()
let gestora: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
})
afterEach(() => vi.restoreAllMocks())

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
      cep: '01310200',
      logradouro: 'Av. Paulista',
      numero: '1578',
      complemento: null,
      bairro: 'Bela Vista',
      cidade: 'São Paulo',
      endereco: 'Av. Paulista, 1578 · Bela Vista',
      latitude: null,
      longitude: null,
    })
  })

  it('traz a localização conferida no mapa, quando o assinante tem', async () => {
    const { id } = await prisma.assinante.findFirstOrThrow({ where: { nome: 'Clínica Vida' } })
    await prisma.assinante.update({
      where: { id },
      data: { latitude: -23.561414, longitude: -46.655881 },
    })
    try {
      const [clinica] = await buscar('clinica')
      expect(clinica).toMatchObject({ latitude: -23.561414, longitude: -46.655881 })
    } finally {
      await prisma.assinante.update({ where: { id }, data: { latitude: null, longitude: null } })
    }
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

  it('filtra e limita no banco, pelo nome de busca: não carrega todos os ativos', async () => {
    const consulta = vi.spyOn(prisma.assinante, 'findMany')
    const lista = await buscar(encodeURIComponent('ESCRITÓRIO'))
    expect(lista.map((a) => a.nome)).toEqual(['Escritório Nunes & Lima'])
    expect(consulta).toHaveBeenCalledOnce()
    expect(consulta.mock.calls[0]![0]).toMatchObject({
      where: { status: 'ativo', excluidoEm: null, nomeBusca: { contains: 'escritorio' } },
      take: 8,
    })
  })

  it('com muitos que casam, devolve os 8 primeiros por nome', async () => {
    const endereco = {
      cep: '01001000',
      logradouro: 'Praça da Sé',
      numero: '1',
      bairro: 'Sé',
      cidade: 'São Paulo',
    }
    const nomes = Array.from(
      { length: 12 },
      (_, i) => `Condomínio Teste ${String(i).padStart(2, '0')}`,
    )
    await prisma.assinante.createMany({ data: nomes.map((nome) => ({ nome, ...endereco })) })
    try {
      const lista = await buscar('condominio teste')
      expect(lista.map((a) => a.nome)).toEqual(nomes.slice(0, 8))
    } finally {
      await prisma.assinante.deleteMany({ where: { nome: { in: nomes } } })
    }
  })

  it('% e _ na busca são texto, não curingas', async () => {
    expect(await buscar(encodeURIComponent('%'))).toEqual([])
    expect(await buscar('_')).toEqual([])
    expect(await buscar(encodeURIComponent('Cl_nica'))).toEqual([])
  })

  it('sem resultado devolve lista vazia', async () => {
    expect(await buscar('zzzzzz')).toEqual([])
  })
})
