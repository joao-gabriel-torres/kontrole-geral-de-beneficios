import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarAcionamento, formularioFoto } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { armazenamento } from '../arquivos'
import { prisma } from '../db'

const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
})

afterEach(() => vi.restoreAllMocks())

const post = (caminho: string, headers: Record<string, string>, corpo?: unknown) =>
  app.request(caminho, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })

async function detalhe(id: string) {
  return (await app.request(`/api/acionamentos/${id}`, { headers: gestora })).json()
}

async function levarAteAguardando(id: string) {
  expect((await post(`/api/acionamentos/${id}/iniciar`, carlos)).status).toBe(200)
  const foto = await app.request(`/api/acionamentos/${id}/fotos`, {
    method: 'POST',
    headers: carlos,
    body: formularioFoto({ contexto: 'conclusao' }),
  })
  expect(foto.status).toBe(201)
  expect((await post(`/api/acionamentos/${id}/enviar`, carlos)).status).toBe(200)
}

describe('POST /api/acionamentos', () => {
  it('cria com uma demanda por tipo e cópia das etapas', async () => {
    const maior = (await prisma.acionamento.aggregate({ _max: { numero: true } }))._max.numero ?? 0
    const r = await post('/api/acionamentos', gestora, {
      titulo: 'Vazamento e gesso',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      data: '2026-10-01',
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1', 't6'],
      prestadorId: 'p1',
    })
    expect(r.status).toBe(201)
    const criado = await r.json()
    expect(criado).toMatchObject({
      codigo: `AC-${maior + 1}`,
      status: 'aberto',
      tipos: [{ nome: 'Vazamento' }, { nome: 'Reparo em gesso' }],
      etapas: { feitas: 0, total: 9 },
    })
    const d = await detalhe(criado.id)
    expect(d.demandas[1].etapas.map((e: { texto: string }) => e.texto)).toEqual([
      'Remover parte danificada',
      'Aplicar placa ou massa nova',
      'Lixar e nivelar',
      'Retocar pintura',
    ])
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['criado'])
  })

  it('grava o assinante e o CEP (só dígitos) quando informados', async () => {
    const id = await criarAcionamento(app, gestora, { assinanteId: 'a1', cep: '01304-001' })
    const gravado = await prisma.acionamento.findUniqueOrThrow({ where: { id } })
    expect(gravado).toMatchObject({ assinanteId: 'a1', cep: '01304001' })
  })

  it('sem assinante e sem CEP, grava null nos dois', async () => {
    const id = await criarAcionamento(app, gestora)
    const gravado = await prisma.acionamento.findUniqueOrThrow({ where: { id } })
    expect(gravado).toMatchObject({ assinanteId: null, cep: null })
  })

  it('recusa assinante inexistente ou inativo (422 assinante_invalido)', async () => {
    const inexistente = await post('/api/acionamentos', gestora, {
      titulo: 'X',
      cliente: 'C',
      endereco: 'Rua A, 1 · Centro',
      data: '2026-10-01',
      inicio: '09:00',
      fim: '10:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
      assinanteId: 'nao-existe',
    })
    expect(inexistente.status).toBe(422)
    expect(await inexistente.json()).toMatchObject({
      erro: { codigo: 'assinante_invalido', mensagem: 'Escolha um assinante ativo' },
    })

    await prisma.assinante.update({ where: { id: 'a2' }, data: { status: 'inativo' } })
    try {
      const inativo = await post('/api/acionamentos', gestora, {
        titulo: 'X',
        cliente: 'C',
        endereco: 'Rua A, 1 · Centro',
        data: '2026-10-01',
        inicio: '09:00',
        fim: '10:00',
        tipoIds: ['t1'],
        prestadorId: 'p1',
        assinanteId: 'a2',
      })
      expect(inativo.status).toBe(422)
    } finally {
      await prisma.assinante.update({ where: { id: 'a2' }, data: { status: 'ativo' } })
    }
  })

  it('recusa CEP malformado (422 cep_invalido)', async () => {
    const r = await post('/api/acionamentos', gestora, {
      titulo: 'X',
      cliente: 'C',
      endereco: 'Rua A, 1 · Centro',
      data: '2026-10-01',
      inicio: '09:00',
      fim: '10:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
      cep: '12',
    })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'cep_invalido' } })
  })

  it('texto com byte nulo no corpo: 422 de validação, não 404', async () => {
    // O Postgres recusa \0 num texto (22021). Na URL isso é um id que não existe; no corpo, é
    // entrada inválida.
    const antes = await prisma.acionamento.count()
    const r = await post('/api/acionamentos', gestora, {
      titulo: 'Vazamento\u0000 no banheiro',
      cliente: 'C',
      endereco: 'Rua A, 1 · Centro',
      data: '2026-10-01',
      inicio: '09:00',
      fim: '10:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject({
      erro: { codigo: 'validacao', mensagem: 'Dados inválidos' },
    })
    expect(await prisma.acionamento.count()).toBe(antes)
  })

  it('editar o checklist do tipo depois não muda o acionamento já criado', async () => {
    const id = await criarAcionamento(app, gestora, { tipoIds: ['t8'] })
    const original = await prisma.tipoDemanda.findUniqueOrThrow({ where: { id: 't8' } })
    await prisma.tipoDemanda.update({ where: { id: 't8' }, data: { checklist: ['Outra coisa'] } })
    try {
      const d = await detalhe(id)
      expect(d.demandas[0].etapas.map((e: { texto: string }) => e.texto)).toEqual(
        original.checklist,
      )
    } finally {
      await prisma.tipoDemanda.update({
        where: { id: 't8' },
        data: { checklist: original.checklist },
      })
    }
  })

  it.each([
    [{ inicio: '11:00', fim: '10:00' }, 'horario_invalido'],
    [{ tipoIds: [] }, 'tipo_invalido'],
    [{ tipoIds: ['nao-existe'] }, 'tipo_invalido'],
    [{ prestadorId: 'p5' }, 'prestador_inativo'],
    [{ titulo: '   ' }, 'campo_obrigatorio'],
    [{ data: '2026-02-31' }, 'validacao'],
    [{ inicio: '9h' }, 'validacao'],
  ])('recusa %j com %s', async (extra, codigo) => {
    const r = await post('/api/acionamentos', gestora, {
      titulo: 'X',
      cliente: 'Y',
      endereco: 'Z',
      data: '2026-10-01',
      inicio: '09:00',
      fim: '10:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
      ...extra,
    })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject({ erro: { codigo } })
  })

  it('prestador não cria acionamento', async () => {
    const r = await post('/api/acionamentos', carlos, {})
    expect(r.status).toBe(403)
  })
})

describe('POST /api/acionamentos/:id/revisao', () => {
  it('aprova e registra a decisão', async () => {
    const id = await criarAcionamento(app, gestora)
    await levarAteAguardando(id)
    const r = await post(`/api/acionamentos/${id}/revisao`, gestora, { decisao: 'aprovado' })
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.status).toBe('aprovado')
    expect(d.revisoes).toEqual([{ decisao: 'aprovado', motivo: null, em: expect.any(String) }])
    expect(d.eventos.at(-1)).toMatchObject({ tipo: 'aprovado' })
    expect(
      (await post(`/api/acionamentos/${id}/revisao`, gestora, { decisao: 'aprovado' })).status,
    ).toBe(409)
  })

  it('reprovar exige motivo e devolve ao prestador', async () => {
    const id = await criarAcionamento(app, gestora)
    await levarAteAguardando(id)
    const semMotivo = await post(`/api/acionamentos/${id}/revisao`, gestora, {
      decisao: 'reprovado',
      motivo: ' ',
    })
    expect(semMotivo.status).toBe(422)
    expect(await semMotivo.json()).toMatchObject({
      erro: { codigo: 'motivo_obrigatorio', mensagem: 'Escreva o motivo da reprovação' },
    })
    const r = await post(`/api/acionamentos/${id}/revisao`, gestora, {
      decisao: 'reprovado',
      motivo: 'Foto escura',
    })
    const d = await r.json()
    expect(d.status).toBe('reprovado')
    expect(d.eventos.at(-1)).toMatchObject({ tipo: 'reprovado', motivo: 'Foto escura' })
  })

  it('recusar a inviabilidade apaga motivo, fotos e arquivos', async () => {
    const id = await criarAcionamento(app, gestora)
    const formulario = new FormData()
    formulario.set('comentario', 'Sem acesso ao local')
    formulario.append('arquivos', formularioFoto({}).get('arquivo') as File)
    expect(
      (
        await app.request(`/api/acionamentos/${id}/inviavel`, {
          method: 'POST',
          headers: carlos,
          body: formulario,
        })
      ).status,
    ).toBe(200)
    const chave = (
      await prisma.foto.findFirstOrThrow({
        where: { acionamentoId: id, contexto: 'inviabilidade' },
      })
    ).storageKey
    expect(await armazenamento.abrir(chave)).not.toBeNull()

    const r = await post(`/api/acionamentos/${id}/revisao`, gestora, {
      decisao: 'reprovado',
      motivo: 'Dá para fazer',
    })
    const d = await r.json()
    expect(d).toMatchObject({ status: 'reprovado', inviavel: false, inviabilidade: null })
    expect(
      await prisma.foto.count({ where: { acionamentoId: id, contexto: 'inviabilidade' } }),
    ).toBe(0)
    expect(await armazenamento.abrir(chave)).toBeNull()
  })

  it('recusar a inviabilidade grava mesmo se o arquivo não puder ser apagado', async () => {
    const id = await criarAcionamento(app, gestora)
    const formulario = new FormData()
    formulario.set('comentario', 'Sem acesso ao local')
    formulario.append('arquivos', formularioFoto({}).get('arquivo') as File)
    const inviavel = await app.request(`/api/acionamentos/${id}/inviavel`, {
      method: 'POST',
      headers: carlos,
      body: formulario,
    })
    expect(inviavel.status).toBe(200)
    vi.spyOn(armazenamento, 'remover').mockRejectedValueOnce(new Error('armazenamento fora do ar'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await post(`/api/acionamentos/${id}/revisao`, gestora, {
      decisao: 'reprovado',
      motivo: 'Dá para fazer',
    })
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ status: 'reprovado', inviavel: false })
  })

  it('só a gestão revisa', async () => {
    const id = await criarAcionamento(app, gestora)
    expect(
      (await post(`/api/acionamentos/${id}/revisao`, carlos, { decisao: 'aprovado' })).status,
    ).toBe(403)
  })
})
