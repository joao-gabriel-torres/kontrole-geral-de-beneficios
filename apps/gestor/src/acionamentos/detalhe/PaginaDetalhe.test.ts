import type { DetalheAcionamento } from '@kgb/api-client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi, type RespostaFalsa } from '../../../test/api-falsa'
import { detalhe, foto } from '../../../test/fixtures'
import { aguardar, montar } from '../../../test/montar'
import { api } from '../../api'
import { toastGestor } from '../../toast'
import PaginaDetalhe from './PaginaDetalhe.vue'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

describe('PaginaDetalhe', () => {
  let atual: DetalheAcionamento
  let simulada: ReturnType<typeof simularApi>
  let revisao: (corpo: {
    decisao: string
    motivo?: string
  }) => RespostaFalsa | Promise<RespostaFalsa>

  beforeEach(() => {
    toastGestor.mensagem.value = null
    atual = detalhe()
    revisao = (corpo) => {
      atual = detalhe({
        status: corpo.decisao as DetalheAcionamento['status'],
        revisoes: [
          {
            decisao: corpo.decisao as 'aprovado',
            motivo: corpo.motivo ?? null,
            em: '2026-09-28T12:00:00.000Z',
          },
        ],
      })
      return { data: atual }
    }
    simulada = simularApi(api, {
      'GET /api/acionamentos/{id}': () => ({ data: atual }),
      'POST /api/acionamentos/{id}/revisao': (o: { body?: unknown }) =>
        revisao(o.body as { decisao: string; motivo?: string }),
    })
  })

  const abrir = (origem: 'acionamentos' | 'aprovacoes' | 'painel' = 'acionamentos') =>
    montar(PaginaDetalhe, { props: { id: 'a1059', origem } })

  it('volta para a tela de origem', async () => {
    const pelaLista = (await abrir()).tela.find('a.voltar')
    expect([pelaLista.text(), pelaLista.attributes('href')]).toEqual([
      'Acionamentos',
      '/acionamentos',
    ])
    const pelaFila = (await abrir('aprovacoes')).tela.find('a.voltar')
    expect([pelaFila.text(), pelaFila.attributes('href')]).toEqual(['Aprovações', '/aprovacoes'])
    const peloPainel = (await abrir('painel')).tela.find('a.voltar')
    expect([peloPainel.text(), peloPainel.attributes('href')]).toEqual(['Painel', '/painel'])
  })

  it('mostra código, título, status e o cartão de informações', async () => {
    const { tela } = await abrir()
    expect(tela.find('.codigo').text()).toBe('AC-1059')
    expect(tela.find('h1').text()).toBe('Revisão elétrica e troca de disjuntor')
    expect(tela.find('.topo').text()).toContain('Aguardando aprovação')
    const info = tela.find('.info')
    expect(info.text()).toContain('Colégio Aprender')
    expect(info.text()).toContain('27/09/2026 · 08:00–11:00')
    expect(info.text()).toContain('Carlos Mendes')
    const endereco = info.find('a.endereco')
    expect(endereco.text()).toBe('Rua Apinajés, 1500 · Perdizes')
    expect(endereco.attributes('href')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent('Rua Apinajés, 1500, Perdizes, São Paulo')}`,
    )
    expect(endereco.attributes('target')).toBe('_blank')
  })

  it('mostra as etapas de cada demanda (só leitura), com comentário e fotos de 80px', async () => {
    const { tela } = await abrir()
    const demanda = tela.find('.demanda')
    expect(demanda.find('.nome-demanda').text()).toBe('Revisão elétrica')
    expect(demanda.find('.prog').text()).toBe('1/2')
    const [feita, pendente] = demanda.findAll('.etapa')
    expect(feita!.find('.caixa').classes()).toContain('feita')
    expect(feita!.find('.caixa').attributes('aria-label')).toBe('Feita')
    expect(pendente!.find('.caixa').attributes('aria-label')).toBe('Pendente')
    expect(pendente!.find('.texto').classes()).toContain('pendente')
    expect(pendente!.find('.comentario').text()).toBe('Tomada da cozinha sem tensão')
    expect(feita!.find('.miniatura').attributes('style')).toContain('width: 80px')
    expect(tela.find('input[type="checkbox"]').exists()).toBe(false)
  })

  it('foto real vira imagem com a URL da API; foto de exemplo é o bloco colorido', async () => {
    atual = detalhe({
      fotosConclusao: [
        foto({ id: 'f9', url: '/api/arquivos/fotos/f9?exp=1&sig=x', cor: null }),
        foto(),
      ],
    })
    const { tela } = await abrir()
    const fotos = tela.findAll('.conclusao .miniatura')
    expect(fotos).toHaveLength(2)
    expect(fotos[0]!.find('img').attributes('src')).toBe(
      'http://api.test/api/arquivos/fotos/f9?exp=1&sig=x',
    )
    expect(fotos[0]!.attributes('style')).toContain('width: 120px')
    expect(fotos[1]!.find('img').exists()).toBe(false)
    expect(tela.find('.conclusao').text()).toContain(
      'Serviço finalizado e testado junto com o cliente.',
    )
  })

  it('aguardando: cartão de decisão e nenhuma "última decisão"', async () => {
    const { tela } = await abrir()
    expect(tela.find('.decisao .aprovar').text()).toBe('Aprovar conclusão')
    expect(tela.find('.ultima').exists()).toBe(false)
  })

  it('reprovar sem motivo avisa e não chama a API', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao .reprovar').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Escreva o motivo da reprovação')
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')).toHaveLength(0)
  })

  it('aprovar: envia, avisa e troca o cartão de decisão pela última decisão', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao .aprovar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')[0]).toMatchObject({
      params: { path: { id: 'a1059' } },
      body: { decisao: 'aprovado' },
    })
    expect(toastGestor.mensagem.value).toBe('Conclusão aprovada')
    expect(tela.find('.decisao').exists()).toBe(false)
    expect(tela.find('.ultima').text()).toContain('Aprovado em 28/09 · 09:00')
  })

  it('reprovar com motivo: envia o motivo, avisa e limpa a observação', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao textarea').setValue('Falta a foto do quadro')
    await tela.find('.decisao .reprovar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')[0]!.body).toEqual({
      decisao: 'reprovado',
      motivo: 'Falta a foto do quadro',
    })
    expect(toastGestor.mensagem.value).toBe('Devolvido ao prestador para correção')
    expect(tela.find('.ultima').text()).toContain('Falta a foto do quadro')
  })

  it('trocar de acionamento (mesmo componente, outro id) zera a observação', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao textarea').setValue('Falta a foto do quadro')
    await tela.setProps({ id: 'a2' })
    await aguardar()
    const observacao = tela.find('.decisao textarea').element as HTMLTextAreaElement
    expect(observacao.value).toBe('')
    await tela.find('.decisao .reprovar').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Escreva o motivo da reprovação')
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')).toHaveLength(0)
  })

  it('dois cliques em aprovar enviam uma revisão só', async () => {
    const { tela } = await abrir()
    await tela.find('.decisao .aprovar').trigger('click')
    await tela.find('.decisao .aprovar').trigger('click')
    await aguardar()
    expect(simulada.chamadas('POST', '/api/acionamentos/{id}/revisao')).toHaveLength(1)
  })

  it('durante o envio, o botão clicado mostra "Enviando…" e os dois travam', async () => {
    let responder!: () => void
    const resposta = revisao
    revisao = (corpo) => new Promise((ok) => (responder = () => ok(resposta(corpo))))
    const { tela } = await abrir()
    await tela.find('.decisao .aprovar').trigger('click')
    await aguardar()
    const aprovar = tela.find('.decisao .aprovar')
    expect(aprovar.text()).toBe('Enviando…')
    expect(aprovar.attributes('aria-busy')).toBe('true')
    expect(aprovar.attributes('disabled')).toBeDefined()
    expect(tela.find('.decisao .reprovar').attributes('disabled')).toBeDefined()
    expect(tela.find('.decisao .reprovar').text()).toBe('Reprovar')
    responder()
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Conclusão aprovada')
    expect(tela.find('.decisao').exists()).toBe(false)
  })

  it('se a API recusar (outra pessoa já decidiu), mostra a mensagem e recarrega', async () => {
    revisao = () =>
      erroApi(409, 'transicao_invalida', 'Este acionamento não está aguardando aprovação')
    const { tela } = await abrir()
    const leiturasAntes = simulada.chamadas('GET', '/api/acionamentos/{id}').length
    await tela.find('.decisao .aprovar').trigger('click')
    await aguardar()
    expect(toastGestor.mensagem.value).toBe('Este acionamento não está aguardando aprovação')
    expect(simulada.chamadas('GET', '/api/acionamentos/{id}').length).toBeGreaterThan(leiturasAntes)
  })

  it('aguardando + inviável: rótulos de inviabilidade e o cartão com o motivo e as fotos', async () => {
    atual = detalhe({
      inviavel: true,
      inviabilidade: {
        comentario: 'O teto da garagem é laje protendida.',
        fotos: [foto({ id: 'f7', horario: '09:30' })],
      },
    })
    const { tela } = await abrir()
    expect(tela.find('.topo').text()).toContain('Inviabilidade em análise')
    expect(tela.find('.decisao .titulo').text()).toBe('O prestador marcou como inviável')
    expect(tela.find('.decisao .aprovar').text()).toBe('Confirmar inviabilidade')
    expect(tela.find('.decisao .reprovar').text()).toBe('Recusar inviabilidade')
    const inv = tela.find('.inviabilidade')
    expect(inv.find('.titulo-inv').text()).toBe('Motivo da inviabilidade')
    expect(inv.text()).toContain('O teto da garagem é laje protendida.')
    expect(inv.find('.miniatura').attributes('style')).toContain('width: 96px')
  })

  it('histórico com os rótulos do protótipo', async () => {
    const { tela } = await abrir()
    expect(tela.findAll('.evento-titulo').map((e) => e.text())).toEqual([
      'Acionamento criado',
      'Atendimento iniciado',
      'Enviado para aprovação',
    ])
    expect(tela.findAll('.evento-quando').map((e) => e.text())).toEqual([
      '25/09 · 16:20',
      '27/09 · 08:00',
      '27/09 · 10:30',
    ])
  })

  it('acionamento inexistente mostra o aviso', async () => {
    simularApi(api, {
      'GET /api/acionamentos/{id}': () =>
        erroApi(404, 'nao_encontrado', 'Acionamento não encontrado'),
    })
    const { tela } = await abrir()
    expect(tela.find('.aviso').text()).toBe('Acionamento não encontrado.')
  })
})
