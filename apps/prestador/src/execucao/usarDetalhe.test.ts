import type { DetalheAcionamento } from '@kgb/api-client'
import type { QueryClient } from '@tanstack/vue-query'
import { flushPromises } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, ref } from 'vue'
import { comEtapas, detalheExemplo, fotoExemplo } from '../../test/detalhe'
import { montar } from '../../test/montar'
import { avisos } from '../avisos'
import { CHAVES } from '../consultas'

const { api } = vi.hoisted(() => ({
  api: { GET: vi.fn(), POST: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
}))
vi.mock('../api', () => ({ api, baseApi: 'http://api' }))
const { usarDetalhe } = await import('./usarDetalhe')

type Resposta = { data?: unknown; error?: unknown; response: Response }
const ok = (data: unknown): Resposta => ({ data, response: new Response(null, { status: 200 }) })
const erro = (status: number, mensagem: string): Resposta => ({
  error: { erro: { codigo: 'transicao_invalida', mensagem } },
  response: new Response(null, { status }),
})

/** Resposta que o teste resolve na hora que quiser (para inverter a ordem de chegada). */
function adiada() {
  let resolver!: (r: Resposta) => void
  const promessa = new Promise<Resposta>((ok) => (resolver = ok))
  return { promessa, resolver }
}

type Etapa = DetalheAcionamento['demandas'][number]['etapas'][number]
const etapa = (id: string, feita: boolean, extra: Partial<Etapa> = {}): Etapa => ({
  id,
  texto: `Etapa ${id}`,
  feita,
  comentario: null,
  fotos: [],
  ...extra,
})
/** Retrato do Detalhe em execução, com e2 e e3 (e a foto f1 em e2, se houver). */
function retrato({ e2 = false, e3 = false, foto = false } = {}): DetalheAcionamento {
  const base = detalheExemplo({ status: 'em_andamento' })
  const fotos = foto ? [fotoExemplo('f1')] : []
  const d = comEtapas(base, 0, [etapa('e1', true), etapa('e2', e2, { fotos })])
  return comEtapas(d, 1, [etapa('e3', e3)])
}
const foto = { arquivo: new Blob(['j']), tiradaEm: '2026-09-28T15:10:00-03:00' }

/** `anterior`: o cache de uma montagem anterior (o prestador saiu do Detalhe e voltou). */
async function montarDetalhe(anterior?: QueryClient) {
  let acoes!: ReturnType<typeof usarDetalhe>
  const Detalhe = defineComponent({
    setup() {
      acoes = usarDetalhe(ref('a1'))
      return () => h('div')
    },
  })
  const { cliente, wrapper } = await montar(Detalhe, { cliente: anterior })
  const estado = () => {
    const d = cliente.getQueryData<DetalheAcionamento>(CHAVES.detalhe('a1'))!
    const etapas = d.demandas.flatMap((dm) => dm.etapas)
    const e = (id: string) => etapas.find((x) => x.id === id)!
    return { e2: e('e2').feita, e3: e('e3').feita, fotos: e('e2').fotos.length }
  }
  return { acoes, cliente, estado, wrapper }
}

/** Estado no banco: o GET devolve o retrato atual; cada teste faz os "commits" na ordem que quer. */
let servidor = { e2: false, e3: false, foto: false }

describe('usarDetalhe: ordem das respostas no cache', () => {
  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    servidor = { e2: false, e3: false, foto: false }
    api.GET.mockImplementation(async () => ok(retrato(servidor)))
  })

  it('uma marcação sozinha grava a resposta, sem buscar o Detalhe de novo', async () => {
    const { acoes, estado } = await montarDetalhe()
    api.PATCH.mockImplementationOnce(async () => {
      servidor.e2 = true
      return ok(retrato(servidor))
    })
    await acoes.marcarEtapa('e2', true)
    await flushPromises()
    expect(estado()).toMatchObject({ e2: true, e3: false })
    expect(api.GET).toHaveBeenCalledTimes(1)
  })

  it('duas marcações com as respostas fora de ordem: a antiga não desfaz a mais nova', async () => {
    const { acoes, estado } = await montarDetalhe()
    const a = adiada()
    const b = adiada()
    api.PATCH.mockReturnValueOnce(a.promessa).mockReturnValueOnce(b.promessa)
    void acoes.marcarEtapa('e2', true)
    void acoes.marcarEtapa('e3', true)
    await flushPromises()
    expect(api.PATCH).toHaveBeenCalledTimes(2)
    servidor = { e2: true, e3: true, foto: false }
    // A resposta de e3 (já com as duas) chega primeiro; a de e2, um retrato anterior ao commit
    // de e3, chega por último.
    b.resolver(ok(retrato({ e2: true, e3: true })))
    await flushPromises()
    a.resolver(ok(retrato({ e2: true })))
    await flushPromises()
    expect(estado()).toMatchObject({ e2: true, e3: true })
  })

  it('saiu do Detalhe e voltou: a marcação da tela anterior, sobreposta, não desfaz a da nova', async () => {
    const anterior = await montarDetalhe()
    const a = adiada()
    const b = adiada()
    api.PATCH.mockReturnValueOnce(a.promessa).mockReturnValueOnce(b.promessa)
    void anterior.acoes.marcarEtapa('e2', true)
    await flushPromises()
    // A mutação continua em voo depois de a tela sair; a nova tela é outra instância.
    anterior.wrapper.unmount()
    const nova = await montarDetalhe(anterior.cliente)
    void nova.acoes.marcarEtapa('e3', true)
    await flushPromises()
    expect(api.PATCH).toHaveBeenCalledTimes(2)
    servidor = { e2: true, e3: true, foto: false }
    b.resolver(ok(retrato({ e2: true, e3: true })))
    await flushPromises()
    // A resposta da tela anterior é um retrato de antes do commit de e3 e chega por último.
    a.resolver(ok(retrato({ e2: true })))
    await flushPromises()
    expect(nova.estado()).toMatchObject({ e2: true, e3: true })
  })

  it('outro acionamento não conta como sobreposição: a marcação sozinha grava sem buscar de novo', async () => {
    const outro = await montarDetalhe()
    const emVoo = adiada()
    api.PATCH.mockReturnValueOnce(emVoo.promessa)
    void outro.acoes.marcarEtapa('e2', true)
    await flushPromises()
    const Outro = defineComponent({
      setup() {
        const acoes = usarDetalhe(ref('a2'))
        void acoes.marcarEtapa('x1', true)
        return () => h('div')
      },
    })
    api.PATCH.mockImplementationOnce(async () => ok(detalheExemplo({ id: 'a2' })))
    await montar(Outro, { cliente: outro.cliente })
    await flushPromises()
    const gets = api.GET.mock.calls.filter(([, opcoes]) => opcoes.params.path.id === 'a2')
    expect(gets).toHaveLength(1)
    emVoo.resolver(ok(retrato({ e2: true })))
    await flushPromises()
  })

  it('um GET do Detalhe que já estava em voo não desfaz a marcação que respondeu antes dele', async () => {
    const { acoes, cliente, estado } = await montarDetalhe()
    const antigo = adiada()
    api.GET.mockReturnValueOnce(antigo.promessa)
    void cliente.invalidateQueries({ queryKey: CHAVES.detalhe('a1') })
    await flushPromises()
    api.PATCH.mockImplementationOnce(async () => {
      servidor.e2 = true
      return ok(retrato(servidor))
    })
    await acoes.marcarEtapa('e2', true)
    await flushPromises()
    // O GET antigo leu o banco antes do commit da marcação e só agora responde.
    antigo.resolver(ok(retrato()))
    await flushPromises()
    expect(estado()).toMatchObject({ e2: true })
  })

  it('foto e marcação ao mesmo tempo: o refetch da foto não desfaz a marcação', async () => {
    const { acoes, estado } = await montarDetalhe()
    const envioFoto = adiada()
    const patch = adiada()
    const getDaFoto = adiada()
    api.POST.mockReturnValueOnce(envioFoto.promessa)
    api.PATCH.mockReturnValueOnce(patch.promessa)
    void acoes.adicionarFoto('etapa', foto, 'e2')
    void acoes.marcarEtapa('e2', true)
    await flushPromises()
    api.GET.mockReturnValueOnce(getDaFoto.promessa)
    servidor = { e2: true, e3: false, foto: true }
    envioFoto.resolver(ok({ id: 'f1' }))
    await flushPromises()
    // A resposta da marcação é um retrato de antes do commit da foto.
    patch.resolver(ok(retrato({ e2: true })))
    await flushPromises()
    // O GET disparado pela foto leu o banco antes do commit da marcação.
    getDaFoto.resolver(ok(retrato({ foto: true })))
    await flushPromises()
    expect(estado()).toEqual({ e2: true, e3: false, fotos: 1 })
  })

  it('com uma foto demorada, a marcação aparece sem esperar a foto terminar', async () => {
    const { acoes, estado } = await montarDetalhe()
    const envioFoto = adiada()
    api.POST.mockReturnValueOnce(envioFoto.promessa)
    api.PATCH.mockImplementationOnce(async () => {
      servidor.e2 = true
      return ok(retrato(servidor))
    })
    void acoes.adicionarFoto('etapa', foto, 'e2')
    await flushPromises()
    await acoes.marcarEtapa('e2', true)
    await flushPromises()
    expect(estado()).toMatchObject({ e2: true, fotos: 0 })
    servidor.foto = true
    envioFoto.resolver(ok({ id: 'f1' }))
    await flushPromises()
    expect(estado()).toEqual({ e2: true, e3: false, fotos: 1 })
  })

  it('na sobreposição, a ação de status segura o "ocupado" até o Detalhe novo chegar', async () => {
    const { acoes, estado } = await montarDetalhe()
    const patch = adiada()
    const post = adiada()
    api.PATCH.mockReturnValueOnce(patch.promessa)
    api.POST.mockReturnValueOnce(post.promessa)
    void acoes.marcarEtapa('e2', true)
    void acoes.enviar()
    await flushPromises()
    const getFinal = adiada()
    api.GET.mockReturnValueOnce(getFinal.promessa)
    servidor = { e2: true, e3: false, foto: false }
    post.resolver(ok(retrato({ e2: true })))
    await flushPromises()
    // A resposta do envio chegou sobreposta pela marcação: sem o estado final, o botão
    // "Enviar para aprovação" voltaria ativo com o status antigo (segundo toque daria 409).
    expect(acoes.ocupado.value).toBe(true)
    getFinal.resolver(ok(retrato(servidor)))
    await flushPromises()
    expect(acoes.ocupado.value).toBe(false)
    patch.resolver(ok(retrato({ e2: true })))
    await flushPromises()
    expect(estado()).toMatchObject({ e2: true, e3: false })
  })

  it('duas marcações sobrepostas e uma falha: o cache termina no estado do servidor', async () => {
    const { acoes, estado } = await montarDetalhe()
    const a = adiada()
    const b = adiada()
    api.PATCH.mockReturnValueOnce(a.promessa).mockReturnValueOnce(b.promessa)
    void acoes.marcarEtapa('e2', true)
    void acoes.marcarEtapa('e3', true)
    await flushPromises()
    servidor.e3 = true
    b.resolver(ok(retrato({ e3: true })))
    await flushPromises()
    a.resolver(erro(409, 'Não pode agora.'))
    await flushPromises()
    expect(estado()).toMatchObject({ e2: false, e3: true })
  })
})

describe('usarDetalhe: 413 sem o corpo da API (o proxy barrou o envio)', () => {
  const barrado = (): Resposta => ({ error: '', response: new Response(null, { status: 413 }) })

  beforeEach(() => {
    Object.values(api).forEach((f) => f.mockReset())
    avisos.mensagem.value = null
    api.GET.mockImplementation(async () => ok(retrato()))
  })

  it('no envio de uma foto, avisa o limite de 10 MB da foto', async () => {
    const { acoes } = await montarDetalhe()
    api.POST.mockResolvedValueOnce(barrado())
    await acoes.adicionarFoto('etapa', foto, 'e2')
    expect(avisos.mensagem.value).toBe('A foto passa de 10 MB')
  })

  it('na inviabilidade (até 5 fotos juntas), avisa o limite das fotos, não o de uma foto', async () => {
    const { acoes } = await montarDetalhe()
    api.POST.mockResolvedValueOnce(barrado())
    expect(await acoes.marcarInviavel('Sem acesso', [foto.arquivo])).toBe(false)
    expect(avisos.mensagem.value).toBe('As fotos passam do limite')
  })
})
