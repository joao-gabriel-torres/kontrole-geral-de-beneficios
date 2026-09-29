import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { usarAutosave } from './usarAutosave'

type Salvar = (texto: string) => Promise<unknown>

function preparar(inicial: string | null = '', salvar = vi.fn<Salvar>(async () => {})) {
  const servidor = ref<string | null>(inicial)
  const escopo = effectScope()
  const autosave = escopo.run(() => usarAutosave({ valor: () => servidor.value, salvar }))!
  return { servidor, escopo, salvar, ...autosave }
}

describe('usarAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('começa com o valor do servidor (null vira vazio)', () => {
    expect(preparar('Trocado o sifão').texto.value).toBe('Trocado o sifão')
    expect(preparar(null).texto.value).toBe('')
  })

  it('salva uma vez, 600 ms depois da última digitação, com o texto final', async () => {
    const { digitar, salvar } = preparar()
    digitar('a')
    await vi.advanceTimersByTimeAsync(300)
    digitar('ab')
    await vi.advanceTimersByTimeAsync(300)
    digitar('abc')
    await vi.advanceTimersByTimeAsync(599)
    expect(salvar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar).toHaveBeenCalledWith('abc')
  })

  it('não sobrescreve o que está sendo digitado quando o servidor muda', async () => {
    const { digitar, texto, servidor } = preparar('antigo')
    digitar('novo texto')
    servidor.value = 'resposta atrasada'
    await nextTick()
    expect(texto.value).toBe('novo texto')
  })

  it('depois do salvamento confirmado, volta a acompanhar o servidor', async () => {
    const { digitar, texto, servidor } = preparar('antigo')
    digitar('meu texto')
    await vi.advanceTimersByTimeAsync(600)
    servidor.value = 'meu texto'
    await nextTick()
    servidor.value = 'mudou em outro lugar'
    await nextTick()
    expect(texto.value).toBe('mudou em outro lugar')
  })

  it('texto digitado durante o salvamento continua protegido', async () => {
    let concluir = () => {}
    const salvar = vi.fn(() => new Promise<void>((ok) => (concluir = ok)))
    const { digitar, texto, servidor } = preparar('', salvar)
    digitar('primeiro')
    await vi.advanceTimersByTimeAsync(600)
    digitar('primeiro e segundo')
    concluir()
    await vi.advanceTimersByTimeAsync(0)
    servidor.value = 'primeiro'
    await nextTick()
    expect(texto.value).toBe('primeiro e segundo')
  })

  it('ao sair da tela com envio pendente, salva na hora', async () => {
    const { digitar, salvar, escopo } = preparar()
    digitar('não perca isto')
    escopo.stop()
    expect(salvar).toHaveBeenCalledWith('não perca isto')
  })

  it('descarregar envia na hora o que esperava o debounce e resolve depois de salvar', async () => {
    let concluir = () => {}
    const salvar = vi.fn(() => new Promise<void>((ok) => (concluir = ok)))
    const { digitar, descarregar } = preparar('', salvar)
    digitar('Tudo testado')
    let pronto = false
    const descarga = descarregar().then(() => (pronto = true))
    expect(salvar).toHaveBeenCalledWith('Tudo testado')
    await vi.advanceTimersByTimeAsync(0)
    expect(pronto).toBe(false)
    concluir()
    await descarga
    await vi.advanceTimersByTimeAsync(600)
    expect(salvar).toHaveBeenCalledTimes(1)
  })

  it('descarregar espera o salvamento em andamento e não reenvia o mesmo texto', async () => {
    let concluir = () => {}
    const salvar = vi.fn(() => new Promise<void>((ok) => (concluir = ok)))
    const { digitar, descarregar } = preparar('', salvar)
    digitar('Tudo testado')
    await vi.advanceTimersByTimeAsync(600)
    const descarga = descarregar()
    concluir()
    await descarga
    expect(salvar).toHaveBeenCalledTimes(1)
  })

  it('descarregar sem nada pendente não chama o servidor', async () => {
    const { descarregar, salvar } = preparar('já salvo')
    await descarregar()
    expect(salvar).not.toHaveBeenCalled()
  })

  it('descarregar rejeita quando não consegue salvar, e reenvia o texto que falhou antes', async () => {
    const salvar = vi.fn<Salvar>().mockRejectedValueOnce(new Error('rede'))
    const { digitar, descarregar } = preparar('', salvar)
    digitar('texto')
    await vi.advanceTimersByTimeAsync(600)
    salvar.mockRejectedValueOnce(new Error('rede'))
    await expect(descarregar()).rejects.toThrow()
    salvar.mockResolvedValueOnce(undefined)
    await descarregar()
    expect(salvar).toHaveBeenCalledTimes(3)
    expect(salvar).toHaveBeenLastCalledWith('texto')
  })

  it('se o salvamento falha, mantém o texto local', async () => {
    const salvar = vi.fn(async () => {
      throw new Error('rede')
    })
    const { digitar, texto, servidor } = preparar('antigo', salvar)
    digitar('texto que falhou')
    await vi.advanceTimersByTimeAsync(600)
    servidor.value = 'antigo'
    await nextTick()
    expect(texto.value).toBe('texto que falhou')
  })
})
