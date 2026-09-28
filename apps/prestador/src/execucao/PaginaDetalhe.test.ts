import type { DetalheAcionamento } from '@kgb/api-client'
import { momento, urlMapa } from '@kgb/ui'
import { flushPromises } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { comEtapas, detalheExemplo, fotoExemplo } from '../../test/detalhe'
import { montar } from '../../test/montar'
import { avisos } from '../avisos'

const { api } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}))
vi.mock('../api', () => ({ api, baseApi: 'http://api' }))
const { default: PaginaDetalhe } = await import('./PaginaDetalhe.vue')
const { default: BotoesFoto } = await import('./BotoesFoto.vue')

const ok = (data: unknown, status = 200) => ({ data, response: new Response(null, { status }) })
const erro = (status: number, codigo: string, mensagem: string) => ({
  error: { erro: { codigo, mensagem } },
  response: new Response(null, { status }),
})
const caminho = (id = 'a1') => ({ params: { path: { id } } })

async function abrir(d: DetalheAcionamento) {
  api.GET.mockResolvedValue(ok(d))
  return montar(PaginaDetalhe, { rotaInicial: `/demandas/${d.id}` })
}

describe('PaginaDetalhe', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    avisos.mensagem.value = null
  })
  afterEach(() => vi.useRealTimers())

  describe('cabeçalho e informações', () => {
    it('busca o acionamento da rota e mostra código, status, título, cliente e informações', async () => {
      const { wrapper } = await abrir(detalheExemplo())
      expect(api.GET).toHaveBeenCalledWith('/api/acionamentos/{id}', caminho())
      expect(wrapper.find('.codigo-cabecalho').text()).toBe('AC-1063')
      expect(wrapper.find('.chip-status').text()).toBe('Agendado')
      expect(wrapper.find('.titulo-detalhe').text()).toBe('Vazamento no teto do banheiro')
      expect(wrapper.find('.cliente-detalhe').text()).toBe('Edifício Aurora')
      const linhas = wrapper.findAll('.info .texto-info').map((l) => l.text())
      expect(linhas).toEqual([
        '28/09/2026 · 10:30–12:30',
        'Rua Bela Cintra, 1200 · Consolação',
        'Vazamento + Reparo em gesso',
      ])
      expect(wrapper.find('.info a').attributes('href')).toBe(
        urlMapa('Rua Bela Cintra, 1200 · Consolação'),
      )
    })

    it('voltar retorna à tela anterior, ou às Demandas quando abriu direto', async () => {
      api.GET.mockResolvedValue(ok(detalheExemplo()))
      const { wrapper, router } = await montar(PaginaDetalhe, { rotaInicial: '/demandas/a1' })
      await wrapper.find('.voltar').trigger('click')
      await flushPromises()
      expect(router.currentRoute.value.name).toBe('demandas')
    })
  })

  describe('checklist', () => {
    it('mostra o progresso geral e por demanda', async () => {
      const { wrapper } = await abrir(detalheExemplo())
      expect(wrapper.find('.progresso-checklist').text()).toBe('1/3')
      expect(wrapper.find('.checklist [role="progressbar"]').attributes('aria-valuenow')).toBe('33')
      const grupos = wrapper
        .findAll('.grupo-cabecalho')
        .map((g) => [g.find('.nome-grupo').text(), g.findAll('span').at(-1)!.text()])
      expect(grupos).toEqual([
        ['Vazamento', '1/2'],
        ['Reparo em gesso', '0/1'],
      ])
    })

    it('marca a etapa no servidor quando o atendimento está em execução', async () => {
      const d = detalheExemplo({ status: 'em_andamento' })
      const { wrapper } = await abrir(d)
      api.PATCH.mockResolvedValue(ok(d))
      await wrapper.findAll('.caixa')[1]!.trigger('click')
      await flushPromises()
      expect(api.PATCH).toHaveBeenCalledWith('/api/acionamentos/{id}/etapas/{etapaId}', {
        params: { path: { id: 'a1', etapaId: 'e2' } },
        body: { feita: true },
      })
    })

    it('só visualiza as etapas quando está aguardando', async () => {
      const { wrapper } = await abrir(detalheExemplo({ status: 'aguardando' }))
      await wrapper.findAll('.caixa')[1]!.trigger('click')
      await flushPromises()
      expect(api.PATCH).not.toHaveBeenCalled()
    })

    it('mostra o resumo azul com fotos e comentário', async () => {
      const d = comEtapas(detalheExemplo({ status: 'em_andamento' }), 0, [
        {
          id: 'e1',
          texto: 'Localizar o ponto do vazamento',
          feita: true,
          comentario: 'Ralo entupido',
          fotos: [fotoExemplo('f1'), fotoExemplo('f2')],
        },
      ])
      const { wrapper } = await abrir(d)
      expect(wrapper.find('.resumo').text()).toBe('2 fotos · comentário')
    })

    it('o chevron expande a etapa; só leitura e sem dados diz "Sem fotos ou comentários."', async () => {
      const { wrapper } = await abrir(detalheExemplo({ status: 'aprovado' }))
      expect(wrapper.find('.expandido').exists()).toBe(false)
      await wrapper.findAll('.chevron')[0]!.trigger('click')
      expect(wrapper.find('.expandido').text()).toBe('Sem fotos ou comentários.')
      expect(wrapper.find('.expandido textarea').exists()).toBe(false)
      expect(wrapper.findAll('.expandido .bloco-foto')).toHaveLength(0)
    })

    it('abrir outra etapa fecha a anterior', async () => {
      const { wrapper } = await abrir(detalheExemplo({ status: 'em_andamento' }))
      await wrapper.findAll('.chevron')[0]!.trigger('click')
      await wrapper.findAll('.texto-clicavel')[1]!.trigger('click')
      expect(wrapper.findAll('.expandido')).toHaveLength(1)
      expect(wrapper.findAll('.etapa')[1]!.find('.expandido').exists()).toBe(true)
    })

    it('na etapa editável, remove foto, anexa foto e salva o comentário sozinho', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const d = comEtapas(detalheExemplo({ status: 'reprovado' }), 0, [
        { id: 'e1', texto: 'Localizar', feita: true, comentario: null, fotos: [fotoExemplo('f1')] },
      ])
      const { wrapper } = await abrir(d)
      await wrapper.find('.chevron').trigger('click')
      const expandido = wrapper.find('.expandido')

      api.DELETE.mockResolvedValue(ok({ ok: true }))
      await expandido.find('[aria-label="Remover foto"]').trigger('click')
      await flushPromises()
      expect(api.DELETE).toHaveBeenCalledWith('/api/acionamentos/{id}/fotos/{fotoId}', {
        params: { path: { id: 'a1', fotoId: 'f1' } },
      })

      api.POST.mockResolvedValue(ok(fotoExemplo('f9'), 201))
      const arquivo = new Blob(['jpeg'], { type: 'image/jpeg' })
      wrapper
        .findAllComponents(BotoesFoto)[0]!
        .vm.$emit('foto', { arquivo, tiradaEm: '2026-09-28T15:10:00-03:00' })
      await flushPromises()
      const [rota, opcoes] = api.POST.mock.calls[0]!
      expect(rota).toBe('/api/acionamentos/{id}/fotos')
      expect(opcoes.params).toEqual({ path: { id: 'a1' } })
      const formulario = opcoes.bodySerializer() as FormData
      expect(formulario.get('contexto')).toBe('etapa')
      expect(formulario.get('etapaId')).toBe('e1')
      expect(formulario.get('tiradaEm')).toBe('2026-09-28T15:10:00-03:00')
      expect(formulario.get('arquivo')).toBeInstanceOf(Blob)

      api.PATCH.mockResolvedValue(ok(d))
      await expandido.find('textarea').setValue('Ralo entupido')
      expect(api.PATCH).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(600)
      expect(api.PATCH).toHaveBeenCalledWith('/api/acionamentos/{id}/etapas/{etapaId}', {
        params: { path: { id: 'a1', etapaId: 'e1' } },
        body: { comentario: 'Ralo entupido' },
      })
    })
  })

  describe('conclusão do serviço', () => {
    it('pede a foto obrigatória e salva o comentário final sozinho', async () => {
      vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
      const d = detalheExemplo({
        status: 'em_andamento',
        regras: { photoMin: 2, requireAllSteps: false },
      })
      const { wrapper } = await abrir(d)
      const conclusao = wrapper.find('.conclusao')
      expect(conclusao.find('.obrigatorias').text()).toBe('2 fotos obrigatórias')
      api.PATCH.mockResolvedValue(ok(d))
      await conclusao.find('textarea').setValue('Tudo testado')
      await vi.advanceTimersByTimeAsync(600)
      expect(api.PATCH).toHaveBeenCalledWith('/api/acionamentos/{id}/conclusao', {
        ...caminho(),
        body: { comentario: 'Tudo testado' },
      })
    })

    it('some quando não há o que mostrar (agendado)', async () => {
      const { wrapper } = await abrir(detalheExemplo())
      expect(wrapper.find('.conclusao').exists()).toBe(false)
    })
  })

  describe('faixas de aviso', () => {
    it('reprovado mostra o motivo do gestor', async () => {
      const { wrapper } = await abrir(
        detalheExemplo({
          status: 'reprovado',
          revisoes: [{ decisao: 'reprovado', motivo: 'Foto escura', em: '2026-09-27T21:30:00Z' }],
        }),
      )
      expect(wrapper.find('.faixa .titulo-faixa').text()).toBe('Reprovado pelo gestor')
      expect(wrapper.find('.faixa .texto-faixa').text()).toBe('Foto escura')
    })

    it('aguardando mostra o envio e não tem barra de ações', async () => {
      const envio = '2026-09-28T11:45:00.000Z'
      const { wrapper } = await abrir(
        detalheExemplo({ status: 'aguardando', ultimoEnvioEm: envio }),
      )
      expect(wrapper.find('.faixa .titulo-faixa').text()).toBe('Enviado para aprovação')
      expect(wrapper.find('.faixa .texto-faixa').text()).toBe(
        `${momento(envio)} · aguarde a conferência do gestor`,
      )
      expect(wrapper.find('.barra-acoes').exists()).toBe(false)
    })

    it('aprovado confirma o serviço', async () => {
      const { wrapper } = await abrir(detalheExemplo({ status: 'aprovado' }))
      expect(wrapper.find('.faixa').text()).toBe('Serviço aprovado pelo gestor')
    })

    it('inviável mostra o motivo e as fotos', async () => {
      const { wrapper } = await abrir(
        detalheExemplo({
          status: 'aguardando',
          inviavel: true,
          inviabilidade: { comentario: 'Sem acesso ao imóvel', fotos: [fotoExemplo('i1')] },
        }),
      )
      const cartao = wrapper.find('.cartao-inviavel')
      expect(cartao.text()).toContain('Motivo da inviabilidade')
      expect(cartao.text()).toContain('Sem acesso ao imóvel')
      expect(cartao.findAll('.miniatura')).toHaveLength(1)
    })
  })

  describe('barra de ações', () => {
    it('agendado: inicia o atendimento e avisa', async () => {
      const { wrapper } = await abrir(detalheExemplo())
      const barra = wrapper.find('.barra-acoes')
      expect(barra.find('.principal').text()).toBe('Iniciar atendimento')
      expect(barra.find('.link-inviavel').text()).toBe('Marcar como inviável')
      api.POST.mockResolvedValue(ok(detalheExemplo({ status: 'em_andamento' })))
      await barra.find('.principal').trigger('click')
      await flushPromises()
      expect(api.POST).toHaveBeenCalledWith('/api/acionamentos/{id}/iniciar', caminho())
      expect(avisos.mensagem.value).toBe('Atendimento iniciado')
      expect(wrapper.find('.chip-status').text()).toBe('Em execução')
      expect(wrapper.find('.barra-acoes .principal').text()).toBe('Enviar para aprovação')
    })

    it('em execução sem a foto de conclusão: envio bloqueado e aviso laranja', async () => {
      const { wrapper } = await abrir(detalheExemplo({ status: 'em_andamento' }))
      const barra = wrapper.find('.barra-acoes')
      expect(barra.find('.aviso-falta').text()).toBe('Adicione 1 foto da conclusão para enviar')
      expect(barra.find('.principal').attributes('disabled')).toBeDefined()
      await barra.find('.principal').trigger('click')
      expect(api.POST).not.toHaveBeenCalled()
    })

    it('com a foto de conclusão: envia para aprovação e avisa', async () => {
      const d = detalheExemplo({ status: 'reprovado', fotosConclusao: [fotoExemplo('c1')] })
      const { wrapper } = await abrir(d)
      const barra = wrapper.find('.barra-acoes')
      expect(barra.find('.aviso-falta').exists()).toBe(false)
      expect(barra.find('.principal').attributes('disabled')).toBeUndefined()
      api.POST.mockResolvedValue(ok({ ...d, status: 'aguardando' }))
      await barra.find('.principal').trigger('click')
      await flushPromises()
      expect(api.POST).toHaveBeenCalledWith('/api/acionamentos/{id}/enviar', caminho())
      expect(avisos.mensagem.value).toBe('Enviado para aprovação')
      expect(wrapper.find('.barra-acoes').exists()).toBe(false)
    })

    it('erro da API vira aviso com a mensagem dela', async () => {
      const d = detalheExemplo({ status: 'em_andamento', fotosConclusao: [fotoExemplo('c1')] })
      const { wrapper } = await abrir(d)
      api.POST.mockResolvedValue(
        erro(422, 'fotos_insuficientes', 'Adicione 1 foto da conclusão para enviar'),
      )
      await wrapper.find('.barra-acoes .principal').trigger('click')
      await flushPromises()
      expect(avisos.mensagem.value).toBe('Adicione 1 foto da conclusão para enviar')
      expect(wrapper.find('.chip-status').text()).toBe('Em execução')
    })

    it('com requireAllSteps e etapas pendentes, pede para concluir as etapas', async () => {
      const { wrapper } = await abrir(
        detalheExemplo({
          status: 'em_andamento',
          fotosConclusao: [fotoExemplo('c1')],
          regras: { photoMin: 1, requireAllSteps: true },
        }),
      )
      expect(wrapper.find('.aviso-falta').text()).toBe('Conclua todas as etapas para enviar')
    })
  })

  describe('comentários ainda não salvos', () => {
    async function abrirNoRouter(d: DetalheAcionamento) {
      api.GET.mockResolvedValue(ok(d))
      const rotas = [
        { path: '/demandas', name: 'demandas', component: { template: '<div />' } },
        { path: '/demandas/:id', name: 'detalhe', component: PaginaDetalhe },
      ]
      return montar({ template: '<RouterView />' }, { rotas, rotaInicial: `/demandas/${d.id}` })
    }

    it('sair do detalhe antes dos 600 ms salva os comentários no acionamento certo', async () => {
      const d = detalheExemplo({ status: 'em_andamento' })
      const { wrapper, router } = await abrirNoRouter(d)
      api.PATCH.mockResolvedValue(ok(d))
      await wrapper.find('.chevron').trigger('click')
      await wrapper.find('.expandido textarea').setValue('Ralo entupido')
      await wrapper.find('.conclusao textarea').setValue('Tudo testado')
      await router.push('/demandas')
      await flushPromises()
      expect(api.PATCH).toHaveBeenCalledWith('/api/acionamentos/{id}/etapas/{etapaId}', {
        params: { path: { id: 'a1', etapaId: 'e1' } },
        body: { comentario: 'Ralo entupido' },
      })
      expect(api.PATCH).toHaveBeenCalledWith('/api/acionamentos/{id}/conclusao', {
        ...caminho(),
        body: { comentario: 'Tudo testado' },
      })
    })

    it('enviar logo depois de digitar salva o comentário final antes de enviar', async () => {
      const d = detalheExemplo({ status: 'em_andamento', fotosConclusao: [fotoExemplo('c1')] })
      const { wrapper } = await abrir(d)
      api.PATCH.mockResolvedValue(ok({ ...d, comentarioConclusao: 'Tudo testado' }))
      api.POST.mockResolvedValue(ok({ ...d, status: 'aguardando' }))
      await wrapper.find('.conclusao textarea').setValue('Tudo testado')
      await wrapper.find('.barra-acoes .principal').trigger('click')
      await flushPromises()
      expect(api.PATCH).toHaveBeenCalledWith('/api/acionamentos/{id}/conclusao', {
        ...caminho(),
        body: { comentario: 'Tudo testado' },
      })
      expect(api.POST).toHaveBeenCalledWith('/api/acionamentos/{id}/enviar', caminho())
      expect(api.PATCH.mock.invocationCallOrder[0]).toBeLessThan(
        api.POST.mock.invocationCallOrder[0]!,
      )
      expect(avisos.mensagem.value).toBe('Enviado para aprovação')
    })

    it('se o comentário pendente não salvar, não envia (o aviso mostra o erro)', async () => {
      const d = detalheExemplo({ status: 'em_andamento', fotosConclusao: [fotoExemplo('c1')] })
      const { wrapper } = await abrir(d)
      api.PATCH.mockResolvedValue(erro(409, 'transicao_invalida', 'Não dá para alterar agora.'))
      await wrapper.find('.conclusao textarea').setValue('Tudo testado')
      await wrapper.find('.barra-acoes .principal').trigger('click')
      await flushPromises()
      expect(api.POST).not.toHaveBeenCalled()
      expect(avisos.mensagem.value).toBe('Não dá para alterar agora.')
    })

    it('marcar como inviável também salva antes o comentário da etapa', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:previa')
      URL.revokeObjectURL = vi.fn()
      const d = detalheExemplo({ status: 'em_andamento' })
      const { wrapper } = await abrir(d)
      api.PATCH.mockResolvedValue(ok(d))
      api.POST.mockResolvedValue(ok({ ...d, status: 'aguardando', inviavel: true }))
      await wrapper.find('.chevron').trigger('click')
      await wrapper.find('.expandido textarea').setValue('Sem acesso ao forro')
      await wrapper.find('.link-inviavel').trigger('click')
      await wrapper.find('.painel textarea').setValue('Cliente ausente')
      wrapper
        .findAllComponents(BotoesFoto)
        .find((b) => b.props('cor') === 'coral')!
        .vm.$emit('foto', { arquivo: new Blob(['j']), tiradaEm: '2026-09-28T15:10:00-03:00' })
      await flushPromises()
      await wrapper.find('.painel .enviar').trigger('click')
      await flushPromises()
      expect(api.PATCH).toHaveBeenCalledWith('/api/acionamentos/{id}/etapas/{etapaId}', {
        params: { path: { id: 'a1', etapaId: 'e1' } },
        body: { comentario: 'Sem acesso ao forro' },
      })
      expect(api.PATCH.mock.invocationCallOrder[0]).toBeLessThan(
        api.POST.mock.invocationCallOrder[0]!,
      )
    })
  })

  describe('marcar como inviável', () => {
    it('envia motivo e fotos num único POST multipart, avisa e fecha o painel', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:previa')
      URL.revokeObjectURL = vi.fn()
      const { wrapper } = await abrir(detalheExemplo())
      expect(wrapper.find('.painel').exists()).toBe(false)
      await wrapper.find('.link-inviavel').trigger('click')
      const painel = wrapper.find('.painel')
      await painel.find('textarea').setValue('Cliente ausente')
      const arquivo = new Blob(['jpeg'], { type: 'image/jpeg' })
      const botoes = wrapper.findAllComponents(BotoesFoto).find((b) => b.props('cor') === 'coral')!
      botoes.vm.$emit('foto', { arquivo, tiradaEm: '2026-09-28T15:10:00-03:00' })
      await flushPromises()
      api.POST.mockResolvedValue(
        ok(
          detalheExemplo({
            status: 'aguardando',
            inviavel: true,
            inviabilidade: { comentario: 'Cliente ausente', fotos: [fotoExemplo('i1')] },
          }),
        ),
      )
      await wrapper.find('.painel .enviar').trigger('click')
      await flushPromises()
      expect(api.POST).toHaveBeenCalledTimes(1)
      const [rota, opcoes] = api.POST.mock.calls[0]!
      expect(rota).toBe('/api/acionamentos/{id}/inviavel')
      expect(opcoes.params).toEqual({ path: { id: 'a1' } })
      const formulario = opcoes.bodySerializer() as FormData
      expect(formulario.get('comentario')).toBe('Cliente ausente')
      expect(formulario.getAll('arquivos')).toHaveLength(1)
      expect(avisos.mensagem.value).toBe('Inviabilidade enviada ao gestor')
      expect(wrapper.find('.painel').exists()).toBe(false)
      expect(wrapper.find('.chip-status').text()).toBe('Inviabilidade em análise')
    })

    it('se a API recusar, o painel continua aberto com o que foi preenchido', async () => {
      URL.createObjectURL = vi.fn(() => 'blob:previa')
      URL.revokeObjectURL = vi.fn()
      const { wrapper } = await abrir(detalheExemplo())
      await wrapper.find('.link-inviavel').trigger('click')
      await wrapper.find('.painel textarea').setValue('Cliente ausente')
      wrapper
        .findAllComponents(BotoesFoto)
        .find((b) => b.props('cor') === 'coral')!
        .vm.$emit('foto', { arquivo: new Blob(['j']), tiradaEm: '2026-09-28T15:10:00-03:00' })
      await flushPromises()
      api.POST.mockResolvedValue(erro(409, 'transicao_invalida', 'Não pode agora.'))
      await wrapper.find('.painel .enviar').trigger('click')
      await flushPromises()
      expect(avisos.mensagem.value).toBe('Não pode agora.')
      expect((wrapper.find('.painel textarea').element as HTMLTextAreaElement).value).toBe(
        'Cliente ausente',
      )
    })
  })
})
