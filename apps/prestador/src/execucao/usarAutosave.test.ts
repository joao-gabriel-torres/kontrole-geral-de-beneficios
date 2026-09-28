import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'
import { usarAutosave } from './usarAutosave'

function preparar(inicial: string | null = '', salvar = vi.fn(async (_texto: string) => {})) {
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
