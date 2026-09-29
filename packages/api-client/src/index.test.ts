import { afterEach, describe, expect, it, vi } from 'vitest'
import { comTempoLimite, criarClienteApi, ErroTempoEsgotado } from './index'

function fetchFalso() {
  const chamadas: Request[] = []
  const fetch = vi.fn(async (req: Request) => {
    chamadas.push(req)
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  })
  return { fetch: fetch as unknown as typeof globalThis.fetch, chamadas }
}

describe('criarClienteApi', () => {
  it('envia o token como Bearer quando existe', async () => {
    const { fetch, chamadas } = fetchFalso()
    const api = criarClienteApi({ baseUrl: 'http://api.teste', obterToken: () => 'abc', fetch })
    const { data } = await api.GET('/api/health')
    expect(data).toEqual({ ok: true })
    expect(chamadas[0]?.url).toBe('http://api.teste/api/health')
    expect(chamadas[0]?.headers.get('authorization')).toBe('Bearer abc')
  })

  it('não envia Authorization quando não há token', async () => {
    const { fetch, chamadas } = fetchFalso()
    const api = criarClienteApi({ baseUrl: 'http://api.teste', obterToken: () => null, fetch })
    await api.GET('/api/health')
    expect(chamadas[0]?.headers.get('authorization')).toBeNull()
  })

  it('manda cookies junto (credentials: include) para o gestor web', async () => {
    const { fetch, chamadas } = fetchFalso()
    const api = criarClienteApi({ baseUrl: 'http://api.teste', fetch })
    await api.GET('/api/health')
    expect(chamadas[0]?.credentials).toBe('include')
  })
})

describe('cliente do app com token (prestador)', () => {
  it('não manda cookies, para não misturar sessões com o gestor no mesmo navegador', async () => {
    const { fetch, chamadas } = fetchFalso()
    const api = criarClienteApi({ baseUrl: 'http://api.teste', obterToken: () => 't', fetch })
    await api.GET('/api/health')
    expect(chamadas[0]?.credentials).toBe('omit')
  })
})

describe('comTempoLimite', () => {
  afterEach(() => vi.useRealTimers())

  it('desiste e aborta a requisição quando a API não responde a tempo', async () => {
    vi.useFakeTimers()
    let sinal: AbortSignal | undefined
    const pendente = comTempoLimite((s) => {
      sinal = s
      return new Promise(() => {})
    }, 8000)
    const resultado = pendente.catch((erro: unknown) => erro)
    await vi.advanceTimersByTimeAsync(8000)
    expect(await resultado).toBeInstanceOf(ErroTempoEsgotado)
    expect(sinal?.aborted).toBe(true)
  })

  it('devolve o resultado quando a API responde', async () => {
    await expect(comTempoLimite(async () => 'ok', 8000)).resolves.toBe('ok')
  })
})
