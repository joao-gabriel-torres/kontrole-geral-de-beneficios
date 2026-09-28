import { beforeEach, describe, expect, it, vi } from 'vitest'
import { simularApi } from '../../test/api-falsa'
import { contagem } from '../../test/fixtures'
import { aguardar, montar } from '../../test/montar'
import { novoAcionamento } from '../acionamentos/novo/estado'
import { api } from '../api'
import { CHAVES } from '../consultas'
import { toastGestor } from '../toast'
import LayoutGestor from './LayoutGestor.vue'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))
vi.mock('../sessao', () => ({ sessao: { usuario: { nome: 'Renata Silva' } }, sair: vi.fn() }))

describe('LayoutGestor', () => {
  let aguardando: number
  beforeEach(() => {
    aguardando = 3
    simularApi(api, {
      'GET /api/acionamentos/contagem': () => ({ data: contagem({ aguardando }) }),
    })
  })

  it('o badge de Aprovações vem da contagem e se atualiza quando ela é invalidada', async () => {
    const { tela, consultas } = await montar(LayoutGestor, { rota: '/painel' })
    expect(tela.find('.badge').text()).toBe('3')
    aguardando = 2
    await consultas.invalidateQueries({ queryKey: CHAVES.acionamentos })
    await aguardar()
    expect(tela.find('.badge').text()).toBe('2')
  })

  it('mostra o aviso do gestor', async () => {
    const { tela } = await montar(LayoutGestor, { rota: '/painel' })
    toastGestor.mostrar('Conclusão aprovada')
    await aguardar()
    expect(tela.find('[role="status"]').text()).toBe('Conclusão aprovada')
  })

  it('mostra o modal Novo acionamento quando ele é aberto', async () => {
    simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/tipos': [],
      'GET /api/prestadores': [],
    })
    const { tela } = await montar(LayoutGestor, { rota: '/painel' })
    expect(tela.find('[role="dialog"]').exists()).toBe(false)
    novoAcionamento.abrir()
    await aguardar()
    expect(tela.find('.coluna [role="dialog"]').exists()).toBe(true)
    novoAcionamento.fechar()
  })

  it('com o modal aberto, a tela por trás fica inerte (o Tab não chega nela)', async () => {
    simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/tipos': [],
      'GET /api/prestadores': [],
    })
    const { tela } = await montar(LayoutGestor, { rota: '/painel' })
    expect(tela.find('main.conteudo').attributes('inert')).toBeUndefined()
    novoAcionamento.abrir()
    await aguardar()
    expect(tela.find('main.conteudo').attributes('inert')).toBeDefined()
    novoAcionamento.fechar()
    await aguardar()
    expect(tela.find('main.conteudo').attributes('inert')).toBeUndefined()
  })
})
