import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { prepararArquivo } = vi.hoisted(() => ({ prepararArquivo: vi.fn() }))
vi.mock('./fotos', async (original) => ({
  ...(await original<typeof import('./fotos')>()),
  prepararArquivo,
}))
const { default: BotoesFoto } = await import('./BotoesFoto.vue')

function escolherArquivo(input: HTMLInputElement, arquivo: File) {
  Object.defineProperty(input, 'files', { value: [arquivo], configurable: true })
  input.dispatchEvent(new Event('change'))
}

describe('BotoesFoto', () => {
  beforeEach(() => prepararArquivo.mockReset())

  it('tem Câmera (com captura traseira) e Galeria, só imagens', () => {
    const botoes = mount(BotoesFoto, { props: { cor: 'azul' } })
    expect(botoes.find('button.bloco-foto').text()).toBe('Câmera')
    expect(botoes.find('label.bloco-foto').text()).toBe('Galeria')
    const camera = botoes.find('input[data-origem="camera"]')
    expect(camera.attributes('accept')).toBe('image/*')
    expect(camera.attributes('capture')).toBe('environment')
    const galeria = botoes.find('input[data-origem="galeria"]')
    expect(galeria.attributes('accept')).toBe('image/*')
    expect(galeria.attributes('capture')).toBeUndefined()
  })

  it('a variante coral é a do painel de inviabilidade', () => {
    const botoes = mount(BotoesFoto, { props: { cor: 'coral' } })
    expect(botoes.findAll('.bloco-foto.coral')).toHaveLength(2)
  })

  it('a foto escolhida é preparada e emitida', async () => {
    const pronta = { arquivo: new Blob(['j']), tiradaEm: '2026-09-28T15:10:00-03:00' }
    prepararArquivo.mockResolvedValue(pronta)
    const botoes = mount(BotoesFoto, { props: { cor: 'azul' } })
    const arquivo = new File(['x'], 'foto.jpg', { type: 'image/jpeg' })
    escolherArquivo(
      botoes.find('input[data-origem="galeria"]').element as HTMLInputElement,
      arquivo,
    )
    await flushPromises()
    expect(prepararArquivo).toHaveBeenCalledWith(arquivo)
    expect(botoes.emitted('foto')).toEqual([[pronta]])
  })

  it('tocar em Câmera abre o seletor com captura', async () => {
    const botoes = mount(BotoesFoto, { props: { cor: 'azul' }, attachTo: document.body })
    const input = botoes.find('input[data-origem="camera"]').element as HTMLInputElement
    const clicar = vi.spyOn(input, 'click')
    await botoes.find('button.bloco-foto').trigger('click')
    expect(clicar).toHaveBeenCalled()
    botoes.unmount()
  })

  it('mostra um bloco "Carregando…" enquanto a foto é preparada', async () => {
    let pronta = (_: unknown) => {}
    prepararArquivo.mockReturnValue(new Promise((ok) => (pronta = ok)))
    const botoes = mount(BotoesFoto, { props: { cor: 'azul' } })
    escolherArquivo(
      botoes.find('input[data-origem="camera"]').element as HTMLInputElement,
      new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
    )
    await flushPromises()
    expect(botoes.findAll('.bloco-pendente')).toHaveLength(1)
    expect(botoes.find('.bloco-pendente').text()).toBe('Carregando…')
    pronta({ arquivo: new Blob(['j']), tiradaEm: '2026-09-28T15:10:00-03:00' })
    await flushPromises()
    expect(botoes.findAll('.bloco-pendente')).toHaveLength(0)
  })

  it('também mostra os envios em andamento que a tela informa', () => {
    const botoes = mount(BotoesFoto, { props: { cor: 'azul', pendentes: 2 } })
    expect(botoes.findAll('.bloco-pendente')).toHaveLength(2)
  })
})
