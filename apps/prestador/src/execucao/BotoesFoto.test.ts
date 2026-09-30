import { Capacitor } from '@capacitor/core'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { prepararArquivo, capturarNativa } = vi.hoisted(() => ({
  prepararArquivo: vi.fn(),
  capturarNativa: vi.fn(),
}))
vi.mock('./fotos', async (original) => ({
  ...(await original<typeof import('./fotos')>()),
  prepararArquivo,
  capturarNativa,
}))
const { default: BotoesFoto } = await import('./BotoesFoto.vue')

function escolherArquivo(input: HTMLInputElement, arquivo: File) {
  Object.defineProperty(input, 'files', { value: [arquivo], configurable: true })
  input.dispatchEvent(new Event('change'))
}

type Botoes = ReturnType<typeof mount>
const galeria = (botoes: Botoes) =>
  botoes.findAll('button.bloco-foto').find((b) => b.text() === 'Galeria')!

describe('BotoesFoto', () => {
  beforeEach(() => {
    prepararArquivo.mockReset()
    capturarNativa.mockReset()
  })
  afterEach(() => vi.restoreAllMocks())

  it('tem Câmera (com captura traseira) e Galeria, só imagens', () => {
    const botoes = mount(BotoesFoto, { props: { cor: 'azul' } })
    expect(botoes.findAll('button.bloco-foto').map((b) => b.text())).toEqual(['Câmera', 'Galeria'])
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
  })

  it('na web, a Galeria é um botão que recebe foco pelo teclado e abre o seletor', async () => {
    const botoes = mount(BotoesFoto, { props: { cor: 'azul' }, attachTo: document.body })
    const botao = galeria(botoes)
    expect(botao.attributes('type')).toBe('button')
    ;(botao.element as HTMLElement).focus()
    expect(document.activeElement).toBe(botao.element)
    const input = botoes.find('input[data-origem="galeria"]').element as HTMLInputElement
    const clicar = vi.spyOn(input, 'click')
    await botao.trigger('click')
    expect(clicar).toHaveBeenCalled()
  })

  it('no aparelho, a Galeria abre a galeria nativa e entrega a foto', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true)
    const pronta = { arquivo: new Blob(['j']), tiradaEm: '2026-09-28T15:10:00-03:00' }
    capturarNativa.mockResolvedValue(pronta)
    const botoes = mount(BotoesFoto, { props: { cor: 'azul' } })
    const input = botoes.find('input[data-origem="galeria"]').element as HTMLInputElement
    const clicar = vi.spyOn(input, 'click')
    await galeria(botoes).trigger('click')
    await flushPromises()
    expect(capturarNativa).toHaveBeenCalledWith('galeria')
    expect(clicar).not.toHaveBeenCalled()
    expect(botoes.emitted('foto')).toEqual([[pronta]])
  })

  it('mostra um bloco "Carregando…" enquanto a foto é preparada', async () => {
    let pronta: (foto: unknown) => void = () => {}
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
