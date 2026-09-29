import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarAcionamento, formularioFoto, JPEG } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { auth } from '../auth'

const app = criarApp()
let gestora: Record<string, string>
let url = ''

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
  const carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
  const id = await criarAcionamento(app, gestora)
  const iniciar = await app.request(`/api/acionamentos/${id}/iniciar`, {
    method: 'POST',
    headers: carlos,
  })
  if (iniciar.status !== 200) throw new Error(`iniciar: HTTP ${iniciar.status}`)
  const r = await app.request(`/api/acionamentos/${id}/fotos`, {
    method: 'POST',
    headers: carlos,
    body: formularioFoto({ contexto: 'conclusao' }),
  })
  if (r.status !== 201) throw new Error(`foto: HTTP ${r.status}`)
  url = ((await r.json()) as { url: string }).url
})

afterEach(() => vi.restoreAllMocks())

describe('GET /api/arquivos/fotos/:id', () => {
  it('não lê a sessão, nem quando a imagem vai com credenciais', async () => {
    const getSession = vi.spyOn(auth.api, 'getSession')
    const r = await app.request(url, { headers: gestora })
    expect(r.status).toBe(200)
    expect(new Uint8Array(await r.arrayBuffer())).toEqual(JPEG)
    expect(getSession).not.toHaveBeenCalled()
  })

  it('manda o navegador não adivinhar o tipo do arquivo', async () => {
    const r = await app.request(url)
    expect(r.headers.get('x-content-type-options')).toBe('nosniff')
    expect(r.headers.get('content-type')).toBe('image/jpeg')
  })

  it('continua com o CORS das outras rotas', async () => {
    const r = await app.request(url, { headers: { origin: 'http://localhost:5173' } })
    expect(r.headers.get('access-control-allow-origin')).toBe('http://localhost:5173')
  })
})
