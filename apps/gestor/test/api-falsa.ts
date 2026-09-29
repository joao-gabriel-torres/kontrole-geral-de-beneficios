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

type Metodo = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
const METODOS: readonly Metodo[] = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE']

/**
 * Liga os mocks de `api.GET`, `api.POST` e, quando existirem, `api.PATCH`, `api.PUT` e
 * `api.DELETE` (de `vi.mock('…/api')`) a respostas por rota, no formato do openapi-fetch. A chave é
 * "MÉTODO caminho" ("GET /api/tipos"); o valor é o `data` da resposta ou uma função que recebe as
 * opções da chamada e devolve `{ data } | { error, status }`.
 */
export function simularApi(
  api: { GET: unknown; POST: unknown } & Partial<Record<Metodo, unknown>>,
  rotas: Record<string, unknown>,
) {
  const responder =
    (metodo: Metodo) =>
    async (caminho: string, opcoes: OpcoesChamada = {}) => {
      const chave = `${metodo} ${caminho}`
      if (!(chave in rotas)) throw new Error(`Rota não simulada: ${chave}`)
      const rota = rotas[chave]
      const r: RespostaFalsa =
        typeof rota === 'function' ? await (rota as Manipulador)(opcoes) : { data: rota }
      const status = r.status ?? (r.error === undefined ? 200 : 422)
      return { data: r.data, error: r.error, response: { status, ok: status < 400 } }
    }
  const mocks = new Map<Metodo, Mock>()
  for (const metodo of METODOS) {
    const mock = api[metodo] as Mock | undefined
    if (!mock) continue
    mock.mockReset()
    mock.mockImplementation(responder(metodo))
    mocks.set(metodo, mock)
  }
  return {
    chamadas(metodo: Metodo, caminho: string): OpcoesChamada[] {
      const mock = mocks.get(metodo)
      if (!mock) throw new Error(`api.${metodo} não foi simulado`)
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
