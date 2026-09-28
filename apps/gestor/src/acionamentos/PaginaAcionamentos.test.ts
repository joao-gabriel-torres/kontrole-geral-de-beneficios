import { beforeEach, describe, expect, it, vi } from 'vitest'
import { simularApi } from '../../test/api-falsa'
import { contagem, resumo } from '../../test/fixtures'
import { aguardar, montar } from '../../test/montar'
import { api } from '../api'
import { estadoLista, reiniciarLista } from './estadoLista'
import { novoAcionamento } from './novo/estado'
import PaginaAcionamentos from './PaginaAcionamentos.vue'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

describe('PaginaAcionamentos', () => {
  let simulada: ReturnType<typeof simularApi>
  let lista: ReturnType<typeof resumo>[]
  beforeEach(() => {
    reiniciarLista()
    novoAcionamento.fechar()
    lista = [
      resumo(),
      resumo({
        id: 'a1061',
        codigo: 'AC-1061',
        titulo: 'Reparo em gesso no quarto',
        status: 'reprovado',
      }),
    ]
    simulada = simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/acionamentos': () => ({ data: lista }),
    })
  })

  const ultimaConsulta = () => simulada.chamadas('GET', '/api/acionamentos').at(-1)!.params!.query

  it('mostra os filtros com a contagem de cada status e "Todos" ativo', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    const filtros = tela.findAll('.filtro')
    expect(filtros.map((f) => [f.text().replace(/\d+$/, ''), f.find('.n').text()])).toEqual([
      ['Todos', '70'],
      ['Agendados', '7'],
      ['Em execução', '1'],
      ['Aguardando', '3'],
      ['Reprovados', '2'],
      ['Finalizados', '57'],
    ])
    expect(tela.find('.filtro.ativo').text()).toBe('Todos70')
    expect(tela.find('.filtro.ativo').attributes('aria-pressed')).toBe('true')
  })

  it('mostra cada linha como no protótipo e abre o Detalhe', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    const linha = tela.findAll('a.linha')[0]!
    expect(linha.find('.titulo').text()).toBe('Revisão elétrica e troca de disjuntor')
    expect(linha.find('.sub').text()).toBe('AC-1059 · Colégio Aprender')
    expect(linha.find('.tipos').text()).toBe('Revisão elétrica + Troca de disjuntor')
    expect(linha.find('.prestador').text()).toBe('CMCarlos Mendes')
    expect(linha.find('.data').text()).toBe('27/09/2026')
    expect(linha.find('.horario').text()).toBe('08:00–11:00')
    expect(linha.find('.etapas').text()).toBe('7/10 etapas')
    expect(linha.find('[role="progressbar"]').attributes('aria-valuenow')).toBe('70')
    expect(linha.find('.status').text()).toBe('Aguardando aprovação')
    expect(linha.attributes('href')).toBe('/acionamentos/a1059')
  })

  it('ao escolher um filtro, consulta só aquele status e o guarda', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    expect(ultimaConsulta()).toEqual({ status: undefined, busca: undefined })
    await tela.findAll('.filtro')[5]!.trigger('click')
    await aguardar()
    expect(ultimaConsulta()).toEqual({ status: 'finalizados', busca: undefined })
    expect(estadoLista.filtro).toBe('finalizados')
    expect(tela.find('.filtro.ativo').text()).toBe('Finalizados57')
  })

  it('busca uma vez só, com o termo aparado, depois que a digitação para', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    const antes = simulada.chamadas('GET', '/api/acionamentos').length
    const campo = tela.find('input')
    await campo.setValue('vaz')
    await campo.setValue('  vazamento ')
    await aguardar()
    expect(simulada.chamadas('GET', '/api/acionamentos')).toHaveLength(antes)
    await new Promise((pronto) => setTimeout(pronto, 350))
    await aguardar()
    const novas = simulada.chamadas('GET', '/api/acionamentos').slice(antes)
    expect(novas.map((c) => c.params!.query!.busca)).toEqual(['vazamento'])
  })

  it('lista vazia mostra o aviso', async () => {
    lista = []
    const { tela } = await montar(PaginaAcionamentos)
    expect(tela.find('.aviso').text()).toBe('Nenhum acionamento encontrado.')
  })

  it('"Novo acionamento" abre o modal', async () => {
    const { tela } = await montar(PaginaAcionamentos)
    await tela.find('button.novo').trigger('click')
    expect(novoAcionamento.aberto.value).toBe(true)
  })
})
