import { describe, expect, it, vi } from 'vitest'
import { criarClienteAuth } from './auth'

describe('criarClienteAuth', () => {
  it('no app com token, manda Bearer e não manda cookies', async () => {
    const fetch = vi.fn<(url: string | URL | Request, init?: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
    )
    const auth = criarClienteAuth({
      baseURL: 'http://api.teste',
      obterToken: () => 'tok',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await auth.signOut()
    const init = fetch.mock.calls[0]?.[1]
    expect(init?.credentials).toBe('omit')
    expect(new Headers(init?.headers).get('authorization')).toBe('Bearer tok')
  })

  it('no gestor web, manda cookies', async () => {
    const fetch = vi.fn(async () => new Response('{}', { status: 200 }))
    const auth = criarClienteAuth({
      baseURL: 'http://api.teste',
      fetch: fetch as unknown as typeof globalThis.fetch,
    })
    await auth.signOut()
    expect((fetch.mock.calls[0] as unknown[])[1]).toMatchObject({ credentials: 'include' })
  })
})
