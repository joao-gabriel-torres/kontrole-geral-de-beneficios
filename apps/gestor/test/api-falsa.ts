import type { Mock } from 'vitest'

export interface OpcoesChamada {
  params?: { path?: Record<string, string>; query?: Record<string, unknown> }
  body?: unknown
}
export interface RespostaFalsa {
  data?: unknown
  error?: unknown
  status?: number
}
type Manipulador = (opcoes: OpcoesChamada) => RespostaFalsa | Promise<RespostaFalsa>

/**
 * Liga os mocks de `api.GET` e `api.POST` (de `vi.mock('…/api')`) a respostas por rota, no formato
 * do openapi-fetch. A chave é "MÉTODO caminho" ("GET /api/tipos"); o valor é o `data` da resposta
 * ou uma função que recebe as opções da chamada e devolve `{ data } | { error, status }`.
 */
export function simularApi(api: { GET: unknown; POST: unknown }, rotas: Record<string, unknown>) {
  const responder =
    (metodo: 'GET' | 'POST') =>
    async (caminho: string, opcoes: OpcoesChamada = {}) => {
      const chave = `${metodo} ${caminho}`
      if (!(chave in rotas)) throw new Error(`Rota não simulada: ${chave}`)
      const rota = rotas[chave]
      const r: RespostaFalsa =
        typeof rota === 'function' ? await (rota as Manipulador)(opcoes) : { data: rota }
      const status = r.status ?? (r.error === undefined ? 200 : 422)
      return { data: r.data, error: r.error, response: { status, ok: status < 400 } }
    }
  const get = api.GET as Mock
  const post = api.POST as Mock
  get.mockReset()
  post.mockReset()
  get.mockImplementation(responder('GET'))
  post.mockImplementation(responder('POST'))
  return {
    chamadas(metodo: 'GET' | 'POST', caminho: string): OpcoesChamada[] {
      const mock = metodo === 'GET' ? get : post
      return mock.mock.calls
        .filter(([c]) => c === caminho)
        .map(([, o]) => (o ?? {}) as OpcoesChamada)
    },
  }
}

export const erroApi = (status: number, codigo: string, mensagem: string): RespostaFalsa => ({
  status,
  error: { erro: { codigo, mensagem } },
})
