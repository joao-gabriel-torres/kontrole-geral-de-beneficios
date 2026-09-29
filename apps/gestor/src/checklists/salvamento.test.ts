import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { criarCanal, type OpcoesCanal } from './salvamento'

type Salvar = (valor: string) => Promise<unknown>

function preparar(opcoes: Partial<OpcoesCanal<string>> = {}) {
  const salvar = vi.fn<Salvar>(async () => {})
  const aoFalhar = vi.fn()
  const canal = criarCanal<string>({ salvar, aoFalhar, ...opcoes })
  return { canal, salvar: (opcoes.salvar as typeof salvar | undefined) ?? salvar, aoFalhar }
}

/** Um salvar que só responde quando o teste mandar. */
function salvarControlado() {
  const respostas: { ok: () => void; falha: (e: unknown) => void }[] = []
  const salvar = vi.fn<Salvar>(
    () => new Promise((ok, falha) => respostas.push({ ok: () => ok(undefined), falha })),
  )
  return { salvar, respostas }
}

describe('criarCanal', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mostra o rascunho na hora e salva uma vez, 600 ms depois da última alteração', async () => {
    const { canal, salvar } = preparar()
    expect(canal.rascunho.value).toBeUndefined()
    canal.alterar('V')
    expect(canal.rascunho.value).toBe('V')
    await vi.advanceTimersByTimeAsync(300)
    canal.alterar('Va')
    await vi.advanceTimersByTimeAsync(599)
    expect(salvar).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(salvar).toHaveBeenCalledTimes(1)
    expect(salvar).toHaveBeenCalledWith('Va')
  })

  it('o rascunho continua depois de salvo, até soltar (o trim da API não apaga o que se digita)', async () => {
    const { canal } = preparar()
    canal.alterar('Testar ')
    await vi.advanceTimersByTimeAsync(600)
    expect(canal.rascunho.value).toBe('Testar ')
    canal.soltar()
    expect(canal.rascunho.value).toBeUndefined()
  })

  it('soltar com envio pendente: o rascunho sai quando o servidor responder', async () => {
    const { salvar, respostas } = salvarControlado()
    const { canal } = preparar({ salvar })
    canal.alterar('abc')
    canal.soltar()
    expect(canal.rascunho.value).toBe('abc')
    await vi.advanceTimersByTimeAsync(600)
    expect(canal.rascunho.value).toBe('abc')
    respostas[0]!.ok()
    await vi.advanceTimersByTimeAsync(0)
    expect(canal.rascunho.value).toBeUndefined()
  })

  it('em série: a alteração seguinte só é enviada depois da resposta da anterior', async () => {
    const { salvar, respostas } = salvarControlado()
    const { canal } = preparar({ salvar })
    canal.alterar('um')
    await vi.advanceTimersByTimeAsync(600)
    canal.alterar('um dois')
    await vi.advanceTimersByTimeAsync(600)
    expect(salvar).toHaveBeenCalledTimes(1)
    respostas[0]!.ok()
    await vi.advanceTimersByTimeAsync(0)
    expect(salvar).toHaveBeenCalledTimes(2)
    expect(salvar).toHaveBeenLastCalledWith('um dois')
  })

  it('podeEnviar falso não envia, e soltar volta ao salvo', async () => {
    const { canal, salvar } = preparar({ podeEnviar: (v) => v.trim() !== '' })
    canal.alterar('  ')
    await vi.advanceTimersByTimeAsync(600)
    expect(salvar).not.toHaveBeenCalled()
    expect(canal.rascunho.value).toBe('  ')
    canal.soltar()
    expect(canal.rascunho.value).toBeUndefined()
  })

  it('falha avisa uma vez e, ao soltar, a tela volta ao salvo', async () => {
    const erro = new Error('Já existe um tipo com esse nome')
    const salvar = vi.fn<Salvar>(async () => {
      throw erro
    })
    const { canal, aoFalhar } = preparar({ salvar })
    canal.alterar('Pintura')
    await vi.advanceTimersByTimeAsync(600)
    expect(aoFalhar).toHaveBeenCalledTimes(1)
    expect(aoFalhar).toHaveBeenCalledWith(erro)
    expect(canal.rascunho.value).toBe('Pintura')
    canal.soltar()
    expect(canal.rascunho.value).toBeUndefined()
  })

  it('descarregar envia na hora o que esperava o debounce e resolve depois da resposta', async () => {
    const { salvar, respostas } = salvarControlado()
    const { canal } = preparar({ salvar })
    canal.alterar('não perca isto')
    let terminou = false
    const descarga = canal.descarregar().then(() => (terminou = true))
    await vi.advanceTimersByTimeAsync(0)
    expect(salvar).toHaveBeenCalledWith('não perca isto')
    expect(terminou).toBe(false)
    respostas[0]!.ok()
    await descarga
    expect(terminou).toBe(true)
    await vi.advanceTimersByTimeAsync(600)
    expect(salvar).toHaveBeenCalledTimes(1)
  })

  it('descartar esquece o rascunho e o envio agendado', async () => {
    const { canal, salvar } = preparar()
    canal.alterar('some')
    canal.descartar()
    expect(canal.rascunho.value).toBeUndefined()
    await vi.advanceTimersByTimeAsync(600)
    await canal.descarregar()
    expect(salvar).not.toHaveBeenCalled()
  })
})
