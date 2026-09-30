import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi, type OpcoesChamada, type RespostaFalsa } from '../../test/api-falsa'
import { aguardar, montar } from '../../test/montar'
import { api } from '../api'
import { modaisAbertos } from '../modais'
import { toastGestor } from '../toast'
import { estadoPrestadores, reiniciarPrestadores } from './estado'
import ModalExcluir from './ModalExcluir.vue'
import ModalPrestador from './ModalPrestador.vue'
import type { PrestadorCadastro } from './lista'
import PaginaPrestadores from './PaginaPrestadores.vue'
import ModalImportacao from './planilha/ModalImportacao.vue'
import { baixarModeloPlanilha, exportarPlanilha } from './planilha/acoes'
import { importacao } from './planilha/estado'
import { PREVIA_EXEMPLO, prestador, SEED_PRESTADORES, TIPOS_SEED } from './teste/dados'

vi.mock('../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))
vi.mock('../sessao', () => ({
  sessao: { usuario: { id: 'u-renata', nome: 'Renata Silva' } },
  sair: vi.fn(),
}))
vi.mock('./planilha/acoes', () => ({
  exportarPlanilha: vi.fn(async () => {}),
  baixarModeloPlanilha: vi.fn(async () => {}),
}))

type Tela = Awaited<ReturnType<typeof montar>>['tela']

describe('PaginaPrestadores', () => {
  let simulada: ReturnType<typeof simularApi>
  let cadastro: () => RespostaFalsa | Promise<RespostaFalsa>
  let salvar: () => RespostaFalsa
  let excluir: () => RespostaFalsa
  let previa: () => RespostaFalsa | Promise<RespostaFalsa>
  let importar: () => RespostaFalsa | Promise<RespostaFalsa>
  let convidar: () => RespostaFalsa
  let alvo: HTMLElement

  beforeEach(() => {
    alvo = document.createElement('div')
    alvo.id = 'modais-gestor'
    document.body.appendChild(alvo)
    reiniciarPrestadores()
    importacao.fechar()
    toastGestor.mensagem.value = null
    cadastro = () => ({ data: SEED_PRESTADORES })
    salvar = () => ({ data: prestador({ id: 'p7', nome: 'Pedro Lima' }) })
    excluir = () => ({ data: { ok: true } })
    previa = () => ({ data: PREVIA_EXEMPLO })
    importar = () => ({ data: { novos: 2, atualizados: 3, desativados: 0 } })
    convidar = () => ({
      data: { email: 'ana@ribeiroreparos.com.br', expiraEm: '2026-10-06T12:00:00Z' },
    })
    simulada = simularApi(api, {
      'GET /api/prestadores/cadastro': () => cadastro(),
      'GET /api/tipos': TIPOS_SEED,
      'POST /api/prestadores': () => salvar(),
      'PATCH /api/prestadores/{id}': () => salvar(),
      'PATCH /api/prestadores/{id}/status': ({ body }: OpcoesChamada) => ({
        data: prestador({ status: (body as { status: 'ativo' | 'inativo' }).status }),
      }),
      'DELETE /api/prestadores/{id}': () => excluir(),
      'POST /api/prestadores/planilha/previa': () => previa(),
      'POST /api/prestadores/planilha/importacao': () => importar(),
      'POST /api/prestadores/{id}/convite': () => convidar(),
    })
  })
  afterEach(() => alvo.remove())

  const abrir = () => montar(PaginaPrestadores, { rota: '/prestadores', anexar: true })
  const linhas = (tela: Tela) => tela.findAll('.linha')
  const linhaDe = (tela: Tela, nome: string) =>
    linhas(tela).find((l) => l.find('.nome').text() === nome)!
  const botao = (w: Pick<Tela, 'findAll'>, texto: string) =>
    w.findAll('button').find((b) => b.text() === texto)!
  const modal = (tela: Tela) => tela.findComponent(ModalPrestador)
  const confirmacao = (tela: Tela) => tela.findComponent(ModalExcluir)

  describe('lista', () => {
    it('mostra o título e quantos estão ativos', async () => {
      const { tela } = await abrir()
      expect(tela.find('h1').text()).toBe('Prestadores')
      expect(tela.find('.subtitulo').text()).toBe('5 ativos de 6 credenciados')
      // O cabeçalho de Prestadores usa gap 10 no protótipo (os outros, 12).
      expect(tela.find('.cabecalho').attributes('style')).toContain('gap: 10px')
    })

    it('enquanto carrega, não mostra contagens nem o vazio', async () => {
      cadastro = () => new Promise(() => {})
      const { tela } = await abrir()
      expect(tela.find('.subtitulo').exists()).toBe(false)
      expect(tela.findAll('.filtro .n').map((n) => n.text())).toEqual(['', '', ''])
      expect(tela.text()).not.toContain('Nenhum prestador encontrado.')
    })

    it('erro ao carregar vira a mensagem da API no cartão', async () => {
      cadastro = () => erroApi(503, 'indisponivel', 'Serviço indisponível')
      const { tela } = await abrir()
      expect(tela.find('.lista .aviso').text()).toBe('Serviço indisponível')
    })

    it('cada linha traz documento, telefone, e-mail, especialidades, carga e status', async () => {
      const { tela } = await abrir()
      expect(linhas(tela).map((l) => l.find('.nome').text())).toEqual([
        'Ana Ribeiro',
        'Carlos Mendes',
        'João Pires',
        'Luciana Prado',
        'Marina Costa',
        'Roberto Alves',
      ])
      const ana = linhaDe(tela, 'Ana Ribeiro')
      expect(ana.find('.documento').text()).toBe('27.415.903/0001-44 · Zona Sul')
      expect(ana.find('.telefone').text()).toBe('(11) 97120-5588')
      expect(ana.find('.email').text()).toBe('ana@ribeiroreparos.com.br')
      expect(ana.findAll('.especialidades span').map((s) => s.text())).toEqual([
        'Pintura',
        'Reparo em gesso',
        '+1',
      ])
      expect(ana.find('.carga').text()).toBe('2 em aberto · 17 no total')
      expect(ana.find('[role="switch"]').attributes('aria-checked')).toBe('true')
      expect(ana.find('[role="switch"]').text()).toBe('Ativo')
    })

    it('inativo: avatar cinza, colunas esmaecidas e switch "Inativo"', async () => {
      const { tela } = await abrir()
      const roberto = linhaDe(tela, 'Roberto Alves')
      expect(roberto.classes()).toContain('inativo')
      expect(roberto.find('.avatar').attributes('style')).toContain(
        'background: rgb(166, 166, 166)',
      )
      expect(roberto.find('[role="switch"]').text()).toBe('Inativo')
      expect(roberto.find('[role="switch"]').attributes('aria-checked')).toBe('false')
    })

    it('os filtros mostram a contagem e filtram', async () => {
      const { tela } = await abrir()
      expect(tela.findAll('.filtro').map((f) => f.text())).toEqual([
        'Todos6',
        'Ativos5',
        'Inativos1',
      ])
      await tela.findAll('.filtro')[2]!.trigger('click')
      expect(linhas(tela).map((l) => l.find('.nome').text())).toEqual(['Roberto Alves'])
      expect(tela.findAll('.filtro')[2]!.attributes('aria-pressed')).toBe('true')
    })

    it('a busca filtra enquanto se digita e mostra o vazio', async () => {
      const { tela } = await abrir()
      await tela.find('.busca input').setValue('zona oeste')
      expect(linhas(tela).map((l) => l.find('.nome').text())).toEqual([
        'Carlos Mendes',
        'Marina Costa',
      ])
      await tela.find('.busca input').setValue('xyz')
      expect(linhas(tela)).toHaveLength(0)
      expect(tela.find('.lista .aviso').text()).toBe('Nenhum prestador encontrado.')
      expect(estadoPrestadores.busca).toBe('xyz')
    })
  })

  describe('switch', () => {
    it('desativa na hora, com o toast, sem abrir a edição', async () => {
      const { tela } = await abrir()
      await linhaDe(tela, 'Carlos Mendes').find('[role="switch"]').trigger('click')
      await aguardar()
      expect(simulada.chamadas('PATCH', '/api/prestadores/{id}/status')[0]).toMatchObject({
        params: { path: { id: 'p1' } },
        body: { status: 'inativo' },
      })
      expect(toastGestor.mensagem.value).toBe('Carlos Mendes desativado')
      expect(modal(tela).exists()).toBe(false)
    })

    it('reativa quem está inativo', async () => {
      const { tela } = await abrir()
      await linhaDe(tela, 'Roberto Alves').find('[role="switch"]').trigger('click')
      await aguardar()
      expect(simulada.chamadas('PATCH', '/api/prestadores/{id}/status')[0]!.body).toEqual({
        status: 'ativo',
      })
      expect(toastGestor.mensagem.value).toBe('Roberto Alves reativado')
    })

    it('erro da API vira toast', async () => {
      simularApi(api, {
        'GET /api/prestadores/cadastro': SEED_PRESTADORES,
        'GET /api/tipos': TIPOS_SEED,
        'PATCH /api/prestadores/{id}/status': () =>
          erroApi(404, 'nao_encontrado', 'Prestador não encontrado'),
      })
      const { tela } = await abrir()
      await linhaDe(tela, 'Carlos Mendes').find('[role="switch"]').trigger('click')
      await aguardar()
      expect(toastGestor.mensagem.value).toBe('Prestador não encontrado')
    })
  })

  describe('exclusão', () => {
    it('bloqueada: explica, oferece Desativar e não oferece Excluir', async () => {
      const { tela } = await abrir()
      await linhaDe(tela, 'Ana Ribeiro').find('button[title="Excluir"]').trigger('click')
      await aguardar()
      const c = confirmacao(tela)
      expect(c.find('.titulo').text()).toBe('Excluir Ana Ribeiro ?')
      expect(c.find('.texto').text()).toBe(
        'Ana Ribeiro tem 2 acionamentos em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir.',
      )
      expect(c.findAll('button').map((b) => b.text())).toEqual(['Cancelar', 'Desativar'])
      expect(modal(tela).exists()).toBe(false)
      expect(modaisAbertos.value).toBe(1)
    })

    it('"Desativar" desativa e fecha', async () => {
      const { tela } = await abrir()
      await linhaDe(tela, 'Ana Ribeiro').find('button[title="Excluir"]').trigger('click')
      await aguardar()
      await botao(confirmacao(tela), 'Desativar').trigger('click')
      await aguardar()
      expect(simulada.chamadas('PATCH', '/api/prestadores/{id}/status')[0]).toMatchObject({
        params: { path: { id: 'p2' } },
        body: { status: 'inativo' },
      })
      expect(toastGestor.mensagem.value).toBe('Ana Ribeiro desativado')
      expect(confirmacao(tela).exists()).toBe(false)
      expect(modaisAbertos.value).toBe(0)
    })

    it('livre: exclui com o toast e fecha', async () => {
      const { tela } = await abrir()
      await linhaDe(tela, 'Roberto Alves').find('button[title="Excluir"]').trigger('click')
      await aguardar()
      const c = confirmacao(tela)
      expect(c.find('.texto').text()).toBe(
        'O histórico de acionamentos é mantido nos relatórios. Essa ação não pode ser desfeita.',
      )
      await botao(c, 'Excluir').trigger('click')
      await aguardar()
      expect(simulada.chamadas('DELETE', '/api/prestadores/{id}')[0]).toMatchObject({
        params: { path: { id: 'p5' } },
      })
      expect(toastGestor.mensagem.value).toBe('Roberto Alves excluído')
      expect(confirmacao(tela).exists()).toBe(false)
    })

    it('se ganhou acionamento no meio do caminho (409), passa ao estado bloqueado', async () => {
      const { tela } = await abrir()
      await linhaDe(tela, 'Roberto Alves').find('button[title="Excluir"]').trigger('click')
      await aguardar()
      excluir = () =>
        erroApi(409, 'prestador_com_acionamentos', 'Roberto Alves tem 1 acionamento em aberto.')
      cadastro = () => ({
        data: SEED_PRESTADORES.map((p) => (p.id === 'p5' ? { ...p, emAberto: 1 } : p)),
      })
      await botao(confirmacao(tela), 'Excluir').trigger('click')
      await aguardar()
      const c = confirmacao(tela)
      expect(c.find('.texto').text()).toContain('Roberto Alves tem 1 acionamento em aberto.')
      expect(c.findAll('button').map((b) => b.text())).toEqual(['Cancelar', 'Desativar'])
    })

    it('Cancelar fecha sem gravar', async () => {
      const { tela } = await abrir()
      await linhaDe(tela, 'Roberto Alves').find('button[title="Excluir"]').trigger('click')
      await aguardar()
      await botao(confirmacao(tela), 'Cancelar').trigger('click')
      expect(confirmacao(tela).exists()).toBe(false)
      expect(simulada.chamadas('DELETE', '/api/prestadores/{id}')).toHaveLength(0)
    })
  })

  describe('Novo e Editar', () => {
    async function abrirNovo() {
      const r = await abrir()
      await botao(r.tela, 'Novo prestador').trigger('click')
      await aguardar()
      return r
    }
    const campo = (tela: Tela, placeholder: string) =>
      modal(tela).find(`input[placeholder="${placeholder}"]`)
    const salvarBotao = (tela: Tela) => botao(modal(tela), 'Salvar')

    it('Novo abre vazio, sem erro e com o Salvar claro, e não salva inválido', async () => {
      const { tela } = await abrirNovo()
      expect(modal(tela).find('.titulo').text()).toBe('Novo prestador')
      expect(modal(tela).find('.erro').exists()).toBe(false)
      expect(salvarBotao(tela).classes()).toContain('inativo')
      await salvarBotao(tela).trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/prestadores')).toHaveLength(0)
      expect(
        modal(tela)
          .findAll('.especialidade')
          .map((b) => b.text()),
      ).toEqual(TIPOS_SEED.map((t) => t.nome))
    })

    it('CEP com menos de 8 dígitos vira erro na linha do formulário', async () => {
      const { tela } = await abrirNovo()
      await campo(tela, 'Nome').setValue('Pedro Lima')
      await campo(tela, '000.000.000-00').setValue('529.982.247-25')
      await campo(tela, '(11) 90000-0000').setValue('(11) 91234-5678')
      await campo(tela, '00000-000').setValue('0100')
      expect(modal(tela).find('.erro').text()).toBe('Informe um CEP com 8 dígitos')
      expect(salvarBotao(tela).classes()).toContain('inativo')
      await campo(tela, '00000-000').setValue('01001000')
      expect(modal(tela).find('.erro').exists()).toBe(false)
    })

    it('o erro aparece ao digitar, na ordem do protótipo', async () => {
      const { tela } = await abrirNovo()
      await campo(tela, 'Nome').setValue('Ana')
      expect(modal(tela).find('.erro').text()).toBe('CPF ou CNPJ inválido')
      await campo(tela, '000.000.000-00').setValue('318.402.117-50')
      expect(modal(tela).find('.erro').text()).toBe('Documento já cadastrado para Carlos Mendes')
      await campo(tela, '000.000.000-00').setValue('529.982.247-25')
      expect(modal(tela).find('.erro').text()).toBe('Informe o telefone com DDD')
    })

    it('credencia, fecha e avisa', async () => {
      const { tela } = await abrirNovo()
      await campo(tela, 'Nome').setValue('Pedro Lima')
      await campo(tela, '000.000.000-00').setValue('529.982.247-25')
      await campo(tela, '(11) 90000-0000').setValue('(11) 91234-5678')
      await campo(tela, 'Zona Oeste').setValue('Centro')
      await campo(tela, '00000-000').setValue('01001-000')
      await botao(modal(tela), 'Pintura').trigger('click')
      await botao(modal(tela), 'Vazamento').trigger('click')
      expect(salvarBotao(tela).classes()).not.toContain('inativo')
      await salvarBotao(tela).trigger('click')
      await salvarBotao(tela).trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/prestadores')).toHaveLength(1)
      expect(simulada.chamadas('POST', '/api/prestadores')[0]!.body).toEqual({
        nome: 'Pedro Lima',
        documento: '529.982.247-25',
        telefone: '(11) 91234-5678',
        email: '',
        regiao: 'Centro',
        cep: '01001-000',
        especialidades: ['t5', 't1'],
      })
      expect(toastGestor.mensagem.value).toBe('Prestador credenciado')
      expect(modal(tela).exists()).toBe(false)
    })

    async function credenciarPedro(tela: Tela, email = '') {
      await campo(tela, 'Nome').setValue('Pedro Lima')
      await campo(tela, '000.000.000-00').setValue('529.982.247-25')
      await campo(tela, '(11) 90000-0000').setValue('(11) 91234-5678')
      await campo(tela, 'email@exemplo.com').setValue(email)
      await salvarBotao(tela).trigger('click')
      await aguardar()
    }

    it('com e-mail, avisa que o convite de acesso foi enviado', async () => {
      salvar = () => ({
        data: {
          ...prestador({ id: 'p7', nome: 'Pedro Lima', acesso: 'convidado' }),
          convite: { situacao: 'enviado', email: 'pedro@lima.com', mensagem: null },
        },
      })
      const { tela } = await abrirNovo()
      await credenciarPedro(tela, 'pedro@lima.com')
      expect(toastGestor.mensagem.value).toBe(
        'Prestador credenciado. Convite enviado para pedro@lima.com',
      )
    })

    it('se o convite não sai, o cadastro fica e o aviso diz por quê', async () => {
      salvar = () => ({
        data: {
          ...prestador({ id: 'p7', nome: 'Pedro Lima', acesso: 'pendente' }),
          convite: {
            situacao: 'falhou',
            email: 'pedro@lima.com',
            mensagem: 'Não foi possível enviar o e-mail do convite. Tente de novo.',
          },
        },
      })
      const { tela } = await abrirNovo()
      await credenciarPedro(tela, 'pedro@lima.com')
      expect(toastGestor.mensagem.value).toBe(
        'Prestador credenciado, mas o convite não saiu: Não foi possível enviar o e-mail do convite. Tente de novo.',
      )
      expect(modal(tela).exists()).toBe(false)
    })

    it('e-mail que não é um endereço aparece na linha de erro', async () => {
      const { tela } = await abrirNovo()
      await campo(tela, 'Nome').setValue('Pedro Lima')
      await campo(tela, '000.000.000-00').setValue('529.982.247-25')
      await campo(tela, '(11) 90000-0000').setValue('(11) 91234-5678')
      await campo(tela, 'email@exemplo.com').setValue('pedro@lima.com; ana@x.com')
      expect(modal(tela).find('.erro').text()).toBe('Informe um e-mail válido')
      expect(salvarBotao(tela).classes()).toContain('inativo')
    })

    it('erro de validação da API aparece na linha de erro e some ao editar', async () => {
      salvar = () => erroApi(422, 'documento_invalido', 'CPF ou CNPJ inválido')
      const { tela } = await abrirNovo()
      await campo(tela, 'Nome').setValue('Pedro Lima')
      await campo(tela, '000.000.000-00').setValue('529.982.247-26')
      await campo(tela, '(11) 90000-0000').setValue('(11) 91234-5678')
      await salvarBotao(tela).trigger('click')
      await aguardar()
      expect(modal(tela).find('.erro').text()).toBe('CPF ou CNPJ inválido')
      expect(salvarBotao(tela).classes()).toContain('inativo')
      expect(toastGestor.mensagem.value).toBeNull()
      await campo(tela, '000.000.000-00').setValue('529.982.247-25')
      expect(modal(tela).find('.erro').exists()).toBe(false)
    })

    it('Editar abre formatado, com as especialidades marcadas, e salva com PATCH', async () => {
      salvar = () => ({ data: prestador() })
      const { tela } = await abrir()
      await linhaDe(tela, 'Carlos Mendes').find('.nome').trigger('click')
      await aguardar()
      const m = modal(tela)
      expect(m.find('.titulo').text()).toBe('Editar prestador')
      expect((campo(tela, '000.000.000-00').element as HTMLInputElement).value).toBe(
        '318.402.117-50',
      )
      expect((campo(tela, '(11) 90000-0000').element as HTMLInputElement).value).toBe(
        '(11) 98734-2210',
      )
      expect((campo(tela, '00000-000').element as HTMLInputElement).value).toBe('05422-001')
      expect(
        m
          .findAll('.especialidade')
          .filter((b) => b.attributes('aria-pressed') === 'true')
          .map((b) => b.text()),
      ).toEqual(['Vazamento', 'Revisão elétrica', 'Ponto de luz', 'Troca de disjuntor'])
      expect(m.find('.erro').exists()).toBe(false)
      await salvarBotao(tela).trigger('click')
      await aguardar()
      expect(simulada.chamadas('PATCH', '/api/prestadores/{id}')[0]).toMatchObject({
        params: { path: { id: 'p1' } },
        body: {
          documento: '318.402.117-50',
          cep: '05422-001',
          especialidades: ['t1', 't2', 't3', 't4'],
        },
      })
      expect(toastGestor.mensagem.value).toBe('Cadastro atualizado')
    })

    it('os modais recebem o foco sem rolar (no telefone o painel começa acima da tela)', async () => {
      const foco = vi.spyOn(HTMLElement.prototype, 'focus')
      const { tela } = await abrirNovo()
      const painel = modal(tela).find('[role="dialog"]').element
      expect(foco.mock.contexts).toContain(painel)
      expect(foco.mock.calls[foco.mock.contexts.indexOf(painel)]).toEqual([{ preventScroll: true }])
      await botao(modal(tela), 'Cancelar').trigger('click')
      await linhaDe(tela, 'Ana Ribeiro').find('button[title="Excluir"]').trigger('click')
      await aguardar()
      const alerta = confirmacao(tela).find('[role="alertdialog"]').element
      expect(foco.mock.calls[foco.mock.contexts.indexOf(alerta)]).toEqual([{ preventScroll: true }])
      foco.mockRestore()
    })

    it('Cancelar e o X fecham sem gravar', async () => {
      const { tela } = await abrirNovo()
      await botao(modal(tela), 'Cancelar').trigger('click')
      expect(modal(tela).exists()).toBe(false)
      await botao(tela, 'Novo prestador').trigger('click')
      await aguardar()
      await modal(tela).find('button[aria-label="Fechar"]').trigger('click')
      expect(modal(tela).exists()).toBe(false)
      expect(simulada.chamadas('POST', '/api/prestadores')).toHaveLength(0)
    })
  })

  describe('convite de acesso no Editar', () => {
    const botaoConvite = (tela: Tela) => {
      const b = modal(tela).find('button.convite')
      return b.exists() ? b : undefined
    }
    async function editar(nome: string, acesso: PrestadorCadastro['acesso']) {
      cadastro = () => ({
        data: SEED_PRESTADORES.map((p) => (p.nome === nome ? { ...p, acesso } : p)),
      })
      const r = await abrir()
      await linhaDe(r.tela, nome).find('.nome').trigger('click')
      await aguardar()
      return r
    }

    it('quem já tem senha vê "Redefinir acesso", que manda o convite de novo (o Carlos do seed)', async () => {
      convidar = () => ({
        data: { email: 'carlos.mendes@email.com', expiraEm: '2026-10-07T12:00:00.000Z' },
      })
      const { tela } = await editar('Carlos Mendes', 'ativo')
      expect(botaoConvite(tela)!.text()).toBe('Redefinir acesso')
      await botaoConvite(tela)!.trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/prestadores/{id}/convite')).toEqual([
        { params: { path: { id: 'p1' } } },
      ])
      expect(toastGestor.mensagem.value).toBe('Convite enviado para carlos.mendes@email.com')
    })

    it('sem e-mail não há o que enviar', async () => {
      const { tela } = await editar('Carlos Mendes', 'sem_email')
      expect(botaoConvite(tela)).toBeUndefined()
    })

    it('pendente: "Enviar convite de acesso" manda o convite e avisa', async () => {
      const { tela } = await editar('Ana Ribeiro', 'pendente')
      expect(botaoConvite(tela)!.text()).toBe('Enviar convite de acesso')
      await botaoConvite(tela)!.trigger('click')
      await aguardar()
      expect(simulada.chamadas('POST', '/api/prestadores/{id}/convite')).toEqual([
        { params: { path: { id: 'p2' } } },
      ])
      expect(toastGestor.mensagem.value).toBe('Convite enviado para ana@ribeiroreparos.com.br')
      expect(modal(tela).exists()).toBe(true)
    })

    it('convidado: "Reenviar convite"', async () => {
      const { tela } = await editar('Ana Ribeiro', 'convidado')
      expect(botaoConvite(tela)!.text()).toBe('Reenviar convite')
    })

    it('com o e-mail alterado e ainda não salvo, o botão some (iria para o antigo)', async () => {
      const { tela } = await editar('Ana Ribeiro', 'pendente')
      await modal(tela).find('input[placeholder="email@exemplo.com"]').setValue('nova@ana.com')
      expect(botaoConvite(tela)).toBeUndefined()
    })

    it('erro da API vira aviso', async () => {
      convidar = () => erroApi(409, 'email_em_uso', 'Este e-mail já é usado por outra conta')
      const { tela } = await editar('Ana Ribeiro', 'pendente')
      await botaoConvite(tela)!.trigger('click')
      await aguardar()
      expect(toastGestor.mensagem.value).toBe('Este e-mail já é usado por outra conta')
    })
  })

  describe('planilha (etapa 2)', () => {
    it('Exportar e Baixar modelo chamam as ações da planilha', async () => {
      const { tela } = await abrir()
      await botao(tela, 'Exportar planilha').trigger('click')
      await botao(tela, 'Baixar modelo da planilha').trigger('click')
      expect(exportarPlanilha).toHaveBeenCalledOnce()
      expect(baixarModeloPlanilha).toHaveBeenCalledOnce()
    })

    it('Subir planilha entrega o arquivo à importação e zera o campo', async () => {
      const { tela } = await abrir()
      const input = tela.find('input[type="file"]')
      expect(input.attributes('accept')).toBe('.xlsx,.xls,.csv')
      const arquivo = new File(['x'], 'credenciados.xlsx')
      Object.defineProperty(input.element, 'files', { value: [arquivo], configurable: true })
      await input.trigger('change')
      await aguardar()
      expect(importacao.arquivo.value).toBe(arquivo)
      expect((input.element as HTMLInputElement).value).toBe('')
    })

    describe('Conferir importação', () => {
      const conferencia = (tela: Tela) => tela.findComponent(ModalImportacao)
      async function anexar(nome = 'credenciados.csv') {
        const r = await abrir()
        const input = r.tela.find('input[type="file"]')
        Object.defineProperty(input.element, 'files', {
          value: [new File(['x'], nome)],
          configurable: true,
        })
        await input.trigger('change')
        await aguardar()
        return r
      }
      const formularioImportado = () => {
        const [chamada] = simulada.chamadas('POST', '/api/prestadores/planilha/importacao')
        return (chamada as unknown as { bodySerializer: () => FormData }).bodySerializer()
      }

      it('mostra o arquivo, o resumo e cada linha com o selo', async () => {
        const { tela } = await anexar()
        const c = conferencia(tela)
        expect(c.find('.titulo').text()).toBe('Conferir importação')
        expect(c.find('.arquivo').text()).toBe('credenciados.csv')
        expect(c.find('.resumo').text()).toBe(
          '2 novos · 3 atualizados · 3 com erro (serão ignorados)',
        )
        const itens = c.findAll('.item')
        expect(itens.map((i) => i.find('.nome').text())).toEqual([
          'Carlos Mendes',
          'Ana Ribeiro',
          'Pedro Lima',
          'Fernanda Souza',
          'Roberto Alves',
          '(sem nome)',
          'Bruno Castro',
          'Carlos M.',
        ])
        expect(itens[0]!.find('.documento').text()).toBe('318.402.117-50')
        expect(itens[0]!.find('.especialidades').text()).toBe(
          'Vazamento, Revisão elétrica, Ponto de luz',
        )
        expect(itens.map((i) => [i.find('.selo').text(), i.find('.selo').classes()[1]])).toEqual([
          ['Atualizar', 'atualizar'],
          ['Atualizar', 'atualizar'],
          ['Novo', 'novo'],
          ['Novo', 'novo'],
          ['Atualizar', 'atualizar'],
          ['Sem nome', 'erro'],
          ['Documento inválido', 'erro'],
          ['Duplicado na planilha', 'erro'],
        ])
      })

      it('sem documento ou sem especialidades mostra "—"', async () => {
        previa = () => ({
          data: {
            ...PREVIA_EXEMPLO,
            linhas: [
              {
                nome: 'Ana',
                documento: '',
                especialidades: [],
                acao: 'erro',
                selo: 'Documento inválido',
              },
            ],
          },
        })
        const { tela } = await anexar()
        const item = conferencia(tela).find('.item')
        expect(item.find('.documento').text()).toBe('—')
        expect(item.find('.especialidades').text()).toBe('—')
      })

      it('o bloco dos ausentes lista os nomes e alterna o switch', async () => {
        const { tela } = await anexar()
        const bloco = conferencia(tela).find('.ausentes')
        expect(bloco.find('.rotulo').text()).toBe('Desativar quem não está na planilha')
        expect(bloco.find('.descricao').text()).toBe(
          '3 credenciados ativos não estão na planilha: João Pires, Marina Costa, Luciana Prado',
        )
        expect(bloco.attributes('aria-pressed')).toBe('false')
        await bloco.trigger('click')
        expect(bloco.attributes('aria-pressed')).toBe('true')
        expect(bloco.find('.trilho').classes()).toContain('ligado')
      })

      it('sem ausentes, sem o bloco', async () => {
        previa = () => ({ data: { ...PREVIA_EXEMPLO, ausentes: [] } })
        const { tela } = await anexar()
        expect(conferencia(tela).find('.ausentes').exists()).toBe(false)
      })

      it('Importar envia o arquivo, fecha, avisa e recarrega a lista', async () => {
        const { tela } = await anexar()
        await botao(conferencia(tela), 'Importar').trigger('click')
        await aguardar()
        const formulario = formularioImportado()
        expect((formulario.get('arquivo') as File).name).toBe('credenciados.csv')
        expect(formulario.get('desativarAusentes')).toBe('false')
        expect(conferencia(tela).exists()).toBe(false)
        expect(toastGestor.mensagem.value).toBe('Planilha importada: 2 novos, 3 atualizados')
        expect(simulada.chamadas('GET', '/api/prestadores/cadastro')).toHaveLength(2)
      })

      it('com o switch ligado, pede para desativar os ausentes', async () => {
        const { tela } = await anexar()
        await conferencia(tela).find('.ausentes').trigger('click')
        await botao(conferencia(tela), 'Importar').trigger('click')
        await aguardar()
        expect(formularioImportado().get('desativarAusentes')).toBe('true')
      })

      it('sem nada a importar, o Importar fica claro e não chama a API', async () => {
        previa = () => ({
          data: { ...PREVIA_EXEMPLO, resumo: { novos: 0, atualizados: 0, erros: 3 } },
        })
        const { tela } = await anexar()
        const importarBotao = botao(conferencia(tela), 'Importar')
        expect(importarBotao.classes()).toContain('inativo')
        expect(importarBotao.attributes('aria-disabled')).toBe('true')
        await importarBotao.trigger('click')
        await aguardar()
        expect(simulada.chamadas('POST', '/api/prestadores/planilha/importacao')).toHaveLength(0)
        expect(conferencia(tela).exists()).toBe(true)
      })

      it('clique duplo em Importar grava uma vez', async () => {
        let responder!: (r: RespostaFalsa) => void
        importar = () => new Promise((pronto) => (responder = pronto))
        const { tela } = await anexar()
        const importarBotao = botao(conferencia(tela), 'Importar')
        await importarBotao.trigger('click')
        await importarBotao.trigger('click')
        await aguardar()
        expect(simulada.chamadas('POST', '/api/prestadores/planilha/importacao')).toHaveLength(1)
        responder({ data: { novos: 2, atualizados: 3, desativados: 0 } })
        await aguardar()
        expect(conferencia(tela).exists()).toBe(false)
      })

      it('erro ao importar vira toast e a conferência continua aberta', async () => {
        importar = () =>
          erroApi(
            409,
            'planilha_conflito',
            'Os cadastros mudaram durante a importação. Confira a planilha de novo.',
          )
        const { tela } = await anexar()
        await botao(conferencia(tela), 'Importar').trigger('click')
        await aguardar()
        expect(toastGestor.mensagem.value).toBe(
          'Os cadastros mudaram durante a importação. Confira a planilha de novo.',
        )
        expect(conferencia(tela).exists()).toBe(true)
      })

      it('Cancelar, o X e o Esc fecham sem gravar', async () => {
        for (const fechar of [
          (t: Tela) => botao(conferencia(t), 'Cancelar').trigger('click'),
          (t: Tela) => conferencia(t).find('button[aria-label="Fechar"]').trigger('click'),
          async () => {
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
            await aguardar()
          },
        ]) {
          const { tela } = await anexar()
          expect(conferencia(tela).exists()).toBe(true)
          await fechar(tela)
          expect(conferencia(tela).exists()).toBe(false)
          expect(importacao.previa.value).toBeNull()
        }
        expect(simulada.chamadas('POST', '/api/prestadores/planilha/importacao')).toHaveLength(0)
      })

      it('erro na prévia vira toast e não abre a conferência', async () => {
        previa = () => erroApi(422, 'planilha_vazia', 'Não encontramos linhas na planilha')
        const { tela } = await anexar()
        expect(conferencia(tela).exists()).toBe(false)
        expect(toastGestor.mensagem.value).toBe('Não encontramos linhas na planilha')
      })
    })
  })
})
