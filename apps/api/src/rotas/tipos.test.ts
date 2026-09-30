import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, semear } from '@kgb/db/seed'
import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import { corpo, criarAcionamento } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

interface Tipo {
  id: string
  nome: string
  cor: string
  categoria: string | null
  checklist: string[]
}
interface Detalhe {
  demandas: { tipoNome: string; cor: string; etapas: { texto: string }[] }[]
}

const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>

// Cada teste muda os tipos: volta ao seed antes (o seed apaga as sessões, então o login vem
// depois) e no fim, para os arquivos seguintes encontrarem os 8 tipos.
beforeEach(async () => {
  await semear(prisma)
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
})
afterAll(() => semear(prisma))

const pedir = (
  metodo: 'POST' | 'PATCH' | 'DELETE',
  caminho: string,
  headers: Record<string, string>,
  dados?: unknown,
) =>
  app.request(caminho, {
    method: metodo,
    headers: { ...headers, 'content-type': 'application/json' },
    body: dados === undefined ? undefined : JSON.stringify(dados),
  })
const listar = () => corpo<Tipo[]>(app.request('/api/tipos', { headers: gestora }))
const detalhe = (id: string) =>
  corpo<Detalhe>(app.request(`/api/acionamentos/${id}`, { headers: gestora }))
const erro = (codigo: string, mensagem?: string) => ({
  erro: mensagem === undefined ? { codigo } : { codigo, mensagem },
})

describe('POST /api/tipos', () => {
  it('cria com trim, checklist vazio e a cor da paleta pela quantidade de tipos', async () => {
    const r = await pedir('POST', '/api/tipos', gestora, { nome: '  Jardinagem  ' })
    expect(r.status).toBe(201)
    const criado = (await r.json()) as Tipo
    expect(criado).toEqual({
      id: expect.any(String),
      nome: 'Jardinagem',
      cor: '#0069BD',
      categoria: null,
      checklist: [],
    })
    const segundo = await corpo<Tipo>(pedir('POST', '/api/tipos', gestora, { nome: 'Dedetização' }))
    expect(segundo.cor).toBe('#FC7608')
    const nomes = (await listar()).map((t) => t.nome)
    expect(nomes.slice(-2)).toEqual(['Jardinagem', 'Dedetização'])
  })

  it('recusa nome vazio (422)', async () => {
    const r = await pedir('POST', '/api/tipos', gestora, { nome: '   ' })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject(erro('nome_obrigatorio', 'Informe o nome do tipo'))
  })

  it('recusa o nome de outro tipo, sem acentos e sem maiúsculas (409)', async () => {
    const r = await pedir('POST', '/api/tipos', gestora, { nome: 'revisao ELETRICA' })
    expect(r.status).toBe(409)
    expect(await r.json()).toMatchObject(erro('nome_duplicado', 'Já existe um tipo com esse nome'))
  })

  it('recusa nome com mais de 60 caracteres (422)', async () => {
    const r = await pedir('POST', '/api/tipos', gestora, { nome: 'a'.repeat(61) })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject(erro('texto_longo'))
  })

  it('dois pedidos com o mesmo nome ao mesmo tempo: um cria e o outro recebe 409', async () => {
    const respostas = await Promise.all([
      pedir('POST', '/api/tipos', gestora, { nome: 'Jardim' }),
      pedir('POST', '/api/tipos', gestora, { nome: 'jardim' }),
    ])
    expect(respostas.map((r) => r.status).sort()).toEqual([201, 409])
    expect((await listar()).filter((t) => t.nome.toLowerCase() === 'jardim')).toHaveLength(1)
  })

  it('é só para a gestão', async () => {
    expect((await pedir('POST', '/api/tipos', carlos, { nome: 'X' })).status).toBe(403)
    expect((await pedir('POST', '/api/tipos', {}, { nome: 'X' })).status).toBe(401)
  })
})

describe('PATCH /api/tipos/:id', () => {
  it('renomeia com trim e grava o checklist inteiro, sem as etapas vazias', async () => {
    const r = await pedir('PATCH', '/api/tipos/t8', gestora, {
      nome: ' Chaveiro 24h ',
      checklist: [' Avaliar fechadura ', '', '   ', 'Testar chaves'],
    })
    expect(r.status).toBe(200)
    const esperado = {
      id: 't8',
      nome: 'Chaveiro 24h',
      cor: '#A6A6A6',
      categoria: 'Segurança',
      checklist: ['Avaliar fechadura', 'Testar chaves'],
    }
    expect(await r.json()).toEqual(esperado)
    expect((await listar()).at(-1)).toEqual(esperado)
  })

  it('só o nome: o checklist fica como estava', async () => {
    const tipo = await corpo<Tipo>(pedir('PATCH', '/api/tipos/t6', gestora, { nome: 'Gesso' }))
    expect(tipo.nome).toBe('Gesso')
    expect(tipo.checklist).toHaveLength(4)
  })

  it('só o checklist: o nome fica como estava', async () => {
    const tipo = await corpo<Tipo>(
      pedir('PATCH', '/api/tipos/t6', gestora, { checklist: ['Uma etapa'] }),
    )
    expect(tipo).toMatchObject({ nome: 'Reparo em gesso', checklist: ['Uma etapa'] })
  })

  it('grava a categoria com trim e limpa com null (a tela mostra "Outros")', async () => {
    const tipo = await corpo<Tipo>(
      pedir('PATCH', '/api/tipos/t8', gestora, { categoria: ' Serralheria ' }),
    )
    expect(tipo).toMatchObject({ nome: 'Chaveiro', categoria: 'Serralheria' })
    const limpo = await corpo<Tipo>(pedir('PATCH', '/api/tipos/t8', gestora, { categoria: null }))
    expect(limpo.categoria).toBeNull()
  })

  it('só a categoria: nome e checklist ficam como estavam', async () => {
    const tipo = await corpo<Tipo>(
      pedir('PATCH', '/api/tipos/t6', gestora, { categoria: 'Reformas' }),
    )
    expect(tipo).toMatchObject({ nome: 'Reparo em gesso', categoria: 'Reformas' })
    expect(tipo.checklist).toHaveLength(4)
  })

  it('recusa categoria com mais de 60 caracteres (422)', async () => {
    const r = await pedir('PATCH', '/api/tipos/t8', gestora, { categoria: 'a'.repeat(61) })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject(
      erro('texto_longo', 'A categoria pode ter até 60 caracteres'),
    )
  })

  it('o próprio nome em outra grafia não conta como duplicado', async () => {
    const r = await pedir('PATCH', '/api/tipos/t5', gestora, { nome: 'PINTURA' })
    expect(r.status).toBe(200)
    expect(await r.json()).toMatchObject({ nome: 'PINTURA' })
  })

  it('recusa o nome de outro tipo (409) e nome vazio (422)', async () => {
    const duplicado = await pedir('PATCH', '/api/tipos/t1', gestora, { nome: 'revisão elétrica' })
    expect(duplicado.status).toBe(409)
    expect(await duplicado.json()).toMatchObject(erro('nome_duplicado'))
    const vazio = await pedir('PATCH', '/api/tipos/t1', gestora, { nome: ' ' })
    expect(vazio.status).toBe(422)
    expect(await vazio.json()).toMatchObject(erro('nome_obrigatorio'))
    expect((await listar())[0]!.nome).toBe('Vazamento')
  })

  it('recusa etapa com mais de 200 caracteres (422)', async () => {
    const r = await pedir('PATCH', '/api/tipos/t1', gestora, { checklist: ['c'.repeat(201)] })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject(erro('texto_longo'))
  })

  it('404 para tipo inexistente ou excluído', async () => {
    const inexistente = await pedir('PATCH', '/api/tipos/nao-existe', gestora, { nome: 'X' })
    expect(inexistente.status).toBe(404)
    await prisma.tipoDemanda.update({ where: { id: 't7' }, data: { excluidoEm: new Date() } })
    expect((await pedir('PATCH', '/api/tipos/t7', gestora, { nome: 'X' })).status).toBe(404)
  })

  it('editar o tipo não muda o acionamento já criado', async () => {
    const id = await criarAcionamento(app, gestora, { tipoIds: ['t3'] })
    const antes = await detalhe(id)
    const r = await pedir('PATCH', '/api/tipos/t3', gestora, {
      nome: 'Ponto de luz novo',
      checklist: ['Outra coisa'],
    })
    expect(r.status).toBe(200)
    const depois = await detalhe(id)
    expect(depois.demandas).toEqual(antes.demandas)
    expect(depois.demandas[0]).toMatchObject({ tipoNome: 'Ponto de luz', cor: '#5D627D' })
    expect(depois.demandas[0]!.etapas).toHaveLength(4)
  })

  it('é só para a gestão', async () => {
    expect((await pedir('PATCH', '/api/tipos/t1', carlos, { nome: 'X' })).status).toBe(403)
    expect((await pedir('PATCH', '/api/tipos/t1', {}, { nome: 'X' })).status).toBe(401)
  })
})

describe('DELETE /api/tipos/:id', () => {
  it('exclui (lógico), some da lista e apaga as especialidades', async () => {
    expect(await prisma.prestadorEspecialidade.count({ where: { tipoId: 't8' } })).toBe(2)
    const r = await pedir('DELETE', '/api/tipos/t8', gestora)
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true })
    expect((await listar()).map((t) => t.id)).not.toContain('t8')
    const excluido = await prisma.tipoDemanda.findUniqueOrThrow({ where: { id: 't8' } })
    expect(excluido.excluidoEm).toBeInstanceOf(Date)
    expect(await prisma.prestadorEspecialidade.count({ where: { tipoId: 't8' } })).toBe(0)
    // As outras especialidades do João (p3) continuam.
    expect(await prisma.prestadorEspecialidade.count({ where: { prestadorId: 'p3' } })).toBe(3)
  })

  it('o acionamento criado antes continua com a cópia', async () => {
    const id = await criarAcionamento(app, gestora, { tipoIds: ['t8'] })
    const antes = await detalhe(id)
    expect((await pedir('DELETE', '/api/tipos/t8', gestora)).status).toBe(200)
    expect((await detalhe(id)).demandas).toEqual(antes.demandas)
    expect(antes.demandas[0]).toMatchObject({ tipoNome: 'Chaveiro' })
  })

  it('dá para recriar o nome de um tipo excluído', async () => {
    expect((await pedir('DELETE', '/api/tipos/t5', gestora)).status).toBe(200)
    const r = await pedir('POST', '/api/tipos', gestora, { nome: 'Pintura' })
    expect(r.status).toBe(201)
    // 7 tipos ativos depois da exclusão: a cor é a 8ª da paleta.
    expect(await r.json()).toMatchObject({ nome: 'Pintura', cor: '#47C272' })
  })

  it('recusa excluir o último tipo ativo (409)', async () => {
    await prisma.tipoDemanda.updateMany({
      where: { id: { not: 't1' } },
      data: { excluidoEm: new Date() },
    })
    const r = await pedir('DELETE', '/api/tipos/t1', gestora)
    expect(r.status).toBe(409)
    expect(await r.json()).toMatchObject(
      erro('ultimo_tipo', 'Mantenha pelo menos um tipo de demanda'),
    )
    expect((await listar()).map((t) => t.id)).toEqual(['t1'])
  })

  it('dois pedidos ao mesmo tempo nos dois últimos: um exclui e o outro recebe 409', async () => {
    await prisma.tipoDemanda.updateMany({
      where: { id: { notIn: ['t1', 't2'] } },
      data: { excluidoEm: new Date() },
    })
    const respostas = await Promise.all([
      pedir('DELETE', '/api/tipos/t1', gestora),
      pedir('DELETE', '/api/tipos/t2', gestora),
    ])
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await listar()).toHaveLength(1)
  })

  it('404 para tipo inexistente ou já excluído; só para a gestão', async () => {
    expect((await pedir('DELETE', '/api/tipos/nao-existe', gestora)).status).toBe(404)
    expect((await pedir('DELETE', '/api/tipos/t2', gestora)).status).toBe(200)
    expect((await pedir('DELETE', '/api/tipos/t2', gestora)).status).toBe(404)
    expect((await pedir('DELETE', '/api/tipos/t1', carlos)).status).toBe(403)
    expect((await pedir('DELETE', '/api/tipos/t1', {})).status).toBe(401)
  })
})
