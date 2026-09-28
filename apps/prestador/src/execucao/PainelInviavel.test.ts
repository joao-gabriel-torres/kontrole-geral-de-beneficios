import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BotoesFoto from './BotoesFoto.vue'
import PainelInviavel from './PainelInviavel.vue'

const foto = (n: number) => ({
  arquivo: new Blob([`foto ${n}`], { type: 'image/jpeg' }),
  tiradaEm: `2026-09-28T15:1${n}:00-03:00`,
})

function montarPainel() {
  return mount(PainelInviavel, { props: { aberto: true, enviando: false } })
}
async function anexar(painel: ReturnType<typeof montarPainel>, n: number) {
  painel.findComponent(BotoesFoto).vm.$emit('foto', foto(n))
  await flushPromises()
}

describe('PainelInviavel', () => {
  beforeEach(() => {
    let n = 0
    URL.createObjectURL = vi.fn(() => `blob:previa-${++n}`)
    URL.revokeObjectURL = vi.fn()
  })
  afterEach(() => vi.restoreAllMocks())

  it('explica o que o gestor precisa e começa com o envio desabilitado', () => {
    const painel = montarPainel()
    expect(painel.find('.titulo-painel').text()).toBe('Marcar como inviável')
    expect(painel.find('.explicacao').text()).toBe(
      'Explique o motivo e registre pelo menos 1 foto. O gestor vai conferir.',
    )
    expect(painel.find('textarea').attributes('placeholder')).toBe('Motivo')
    expect(painel.find('.enviar').attributes('disabled')).toBeDefined()
    expect(painel.findComponent(BotoesFoto).props('cor')).toBe('coral')
  })

  it('com motivo e 1 foto, envia o motivo sem espaços nas pontas e as fotos', async () => {
    const painel = montarPainel()
    await painel.find('textarea').setValue('  Cliente ausente, portão trancado  ')
    expect(painel.find('.enviar').attributes('disabled')).toBeDefined()
    await anexar(painel, 1)
    expect(painel.findAll('.miniatura')).toHaveLength(1)
    expect(painel.find('.miniatura img').attributes('src')).toBe('blob:previa-1')
    expect(painel.find('.miniatura').text()).toContain('15:11')
    expect(painel.find('.enviar').attributes('disabled')).toBeUndefined()
    await painel.find('.enviar').trigger('click')
    expect(painel.emitted('enviar')).toEqual([
      ['Cliente ausente, portão trancado', [foto(1).arquivo]],
    ])
  })

  it('o X remove a foto e libera a prévia', async () => {
    const painel = montarPainel()
    await painel.find('textarea').setValue('Sem acesso')
    await anexar(painel, 1)
    await painel.find('[aria-label="Remover foto"]').trigger('click')
    expect(painel.findAll('.miniatura')).toHaveLength(0)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:previa-1')
    expect(painel.find('.enviar').attributes('disabled')).toBeDefined()
  })

  it('aceita no máximo 5 fotos: depois disso, Câmera e Galeria somem', async () => {
    const painel = montarPainel()
    for (const n of [1, 2, 3, 4, 5]) await anexar(painel, n)
    expect(painel.findAll('.miniatura')).toHaveLength(5)
    expect(painel.findComponent(BotoesFoto).exists()).toBe(false)
  })

  it('"Cancelar" fecha o painel', async () => {
    const painel = montarPainel()
    await painel.find('.cancelar').trigger('click')
    expect(painel.emitted('fechar')).toHaveLength(1)
  })

  it('reabrir começa vazio', async () => {
    const painel = montarPainel()
    await painel.find('textarea').setValue('Sem acesso')
    await anexar(painel, 1)
    await painel.setProps({ aberto: false })
    await painel.setProps({ aberto: true })
    expect((painel.find('textarea').element as HTMLTextAreaElement).value).toBe('')
    expect(painel.findAll('.miniatura')).toHaveLength(0)
  })

  it('não envia duas vezes enquanto o envio anterior não terminou', async () => {
    const painel = montarPainel()
    await painel.find('textarea').setValue('Sem acesso')
    await anexar(painel, 1)
    await painel.setProps({ enviando: true })
    await painel.find('.enviar').trigger('click')
    expect(painel.emitted('enviar')).toBeUndefined()
  })
})
