import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, Teleport } from 'vue'
import { mount } from '@vue/test-utils'
import { simularApi } from '../../test/api-falsa'
import { contagem } from '../../test/fixtures'
import { aguardar, montar } from '../../test/montar'
import { novoAcionamento } from '../acionamentos/novo/estado'
import { modaisAbertos, usarModalAberto } from '../modais'
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

  describe('rolagem ao trocar de tela', () => {
    async function naLista(rota: string, rolagem: number) {
      const montado = await montar(LayoutGestor, { rota })
      const conteudo = montado.tela.find('main.conteudo').element as HTMLElement
      conteudo.scrollTop = rolagem
      const ir = async (destino: string) => {
        await montado.router.push(destino)
        await aguardar()
      }
      return { ...montado, conteudo, ir }
    }

    it.each([
      ['/acionamentos', '/acionamentos/a1059'],
      ['/aprovacoes', '/aprovacoes/a1059'],
      ['/painel', '/painel/a1059'],
    ])('volta do Detalhe para %s na rolagem de onde saiu', async (lista, detalhe) => {
      const { conteudo, ir } = await naLista(lista, 500)
      await ir(detalhe)
      expect(conteudo.scrollTop).toBe(0)
      await ir(lista)
      expect(conteudo.scrollTop).toBe(500)
    })

    it('pelo Voltar do navegador (histórico) também restaura', async () => {
      const { conteudo, ir, router } = await naLista('/acionamentos', 640)
      await ir('/acionamentos/a1059')
      router.back()
      await aguardar()
      expect(router.currentRoute.value.path).toBe('/acionamentos')
      expect(conteudo.scrollTop).toBe(640)
    })

    it('guarda a rolagem da última saída da lista', async () => {
      const { conteudo, ir } = await naLista('/acionamentos', 500)
      await ir('/acionamentos/a1059')
      await ir('/acionamentos')
      conteudo.scrollTop = 900
      await ir('/acionamentos/a1060')
      await ir('/acionamentos')
      expect(conteudo.scrollTop).toBe(900)
    })

    it('mudar só a query (ex.: filtro na URL) não mexe na rolagem', async () => {
      const { conteudo, ir } = await naLista('/acionamentos', 500)
      await ir('/acionamentos?busca=vidro')
      expect(conteudo.scrollTop).toBe(500)
    })

    it('nas outras trocas, a tela abre no topo', async () => {
      const { conteudo, ir } = await naLista('/acionamentos', 500)
      await ir('/acionamentos/a1059')
      await ir('/aprovacoes')
      expect(conteudo.scrollTop).toBe(0)
      conteudo.scrollTop = 300
      await ir('/painel')
      expect(conteudo.scrollTop).toBe(0)
      await ir('/acionamentos')
      expect(conteudo.scrollTop).toBe(0)
    })
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

  it('um modal de tela (usarModalAberto) vai para fora do conteúdo e deixa o resto inerte', async () => {
    const Modal = defineComponent({
      setup() {
        usarModalAberto()
        return () =>
          h(Teleport, { to: '#modais-gestor', defer: true }, h('div', { role: 'dialog' }, 'Modal'))
      },
    })
    const { tela } = await montar(LayoutGestor, { rota: '/painel', anexar: true })
    expect(tela.find('#modais-gestor').exists()).toBe(true)
    const modal = mount(Modal, { attachTo: document.body })
    await aguardar()
    expect(modaisAbertos.value).toBe(1)
    expect(tela.find('#modais-gestor [role="dialog"]').exists()).toBe(true)
    expect(tela.find('main.conteudo').attributes('inert')).toBeDefined()
    // A navegação lateral também: o Tab não escapa do aria-modal para os links dela.
    expect(tela.find('nav.lateral').attributes('inert')).toBeDefined()
    modal.unmount()
    await aguardar()
    expect(modaisAbertos.value).toBe(0)
    expect(tela.find('main.conteudo').attributes('inert')).toBeUndefined()
    expect(tela.find('nav.lateral').attributes('inert')).toBeUndefined()
    tela.unmount()
  })

  it('com o Novo acionamento aberto, a NavLateral também fica inerte', async () => {
    simularApi(api, {
      'GET /api/acionamentos/contagem': contagem(),
      'GET /api/tipos': [],
      'GET /api/prestadores': [],
    })
    const { tela } = await montar(LayoutGestor, { rota: '/painel' })
    const lateral = () => tela.find('nav.lateral')
    expect(lateral().exists()).toBe(true)
    expect(lateral().attributes('inert')).toBeUndefined()
    novoAcionamento.abrir()
    await aguardar()
    expect(lateral().attributes('inert')).toBeDefined()
    novoAcionamento.fechar()
    await aguardar()
    expect(lateral().attributes('inert')).toBeUndefined()
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
