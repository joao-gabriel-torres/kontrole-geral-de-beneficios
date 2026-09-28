import { describe, expect, it } from 'vitest'
import { criarApp } from './app'

const app = criarApp()

describe('app', () => {
  it('GET /api/health responde ok', async () => {
    const r = await app.request('/api/health')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ ok: true })
  })

  it('publica o documento OpenAPI 3.1 com as rotas', async () => {
    const r = await app.request('/api/openapi.json')
    expect(r.status).toBe(200)
    const doc = (await r.json()) as { openapi: string; paths: Record<string, unknown> }
    expect(doc.openapi).toBe('3.1.0')
    expect(doc.paths).toHaveProperty('/api/health')
  })

  it('serve a documentação em /api/docs', async () => {
    const r = await app.request('/api/docs')
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toMatch(/text\/html/)
  })

  it('responde 404 no formato de erro padrão', async () => {
    const r = await app.request('/api/nao-existe')
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({
      erro: { codigo: 'nao_encontrado', mensagem: 'Rota não encontrada' },
    })
  })

  it('libera CORS com credenciais para origens confiáveis', async () => {
    const r = await app.request('/api/health', {
      method: 'OPTIONS',
      headers: { origin: 'capacitor://localhost', 'access-control-request-method': 'GET' },
    })
    expect(r.headers.get('access-control-allow-origin')).toBe('capacitor://localhost')
    expect(r.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('não libera CORS para origem desconhecida', async () => {
    const r = await app.request('/api/health', {
      method: 'OPTIONS',
      headers: { origin: 'https://site-estranho.com', 'access-control-request-method': 'GET' },
    })
    expect(r.headers.get('access-control-allow-origin')).toBeNull()
  })
})
