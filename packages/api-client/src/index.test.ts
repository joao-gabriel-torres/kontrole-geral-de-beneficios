import { describe, expect, it, vi } from 'vitest'
import { criarClienteApi } from './index'

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
