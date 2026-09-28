import type { CorpoErro } from '@kgb/api-client'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'

/** Chaves do vue-query: depois de cada mutação, a lista, o detalhe e o Início são invalidados. */
export const CHAVES = {
  inicio: ['inicio'] as const,
  lista: ['acionamentos'] as const,
  detalhe: (id: string) => ['acionamento', id] as const,
}

export const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Verifique sua conexão.'

export class ErroApi extends Error {
  constructor(
    readonly codigo: string,
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

function ehCorpoErro(valor: unknown): valor is CorpoErro {
  const erro = (valor as CorpoErro | null)?.erro
  return typeof erro?.mensagem === 'string' && typeof erro.codigo === 'string'
}

/** Resposta do openapi-fetch → dados, ou `ErroApi` com a mensagem que a API mandou. */
export function exigir<T>(resultado: { data?: T; error?: unknown; response: Response }): T {
  const { data, error, response } = resultado
  if (error === undefined && response.ok) return data as T
  if (ehCorpoErro(error)) throw new ErroApi(error.erro.codigo, response.status, error.erro.mensagem)
  throw new ErroApi('desconhecido', response.status, MENSAGEM_SEM_CONEXAO)
}

export function mensagemDeErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : MENSAGEM_SEM_CONEXAO
}

/** `aoPerderSessao` é chamado quando a API recusa a sessão (401) numa consulta ou numa ação. */
export function criarClienteConsultas(aoPerderSessao?: () => void): QueryClient {
  const aoErro = (erro: unknown) => {
    if (erro instanceof ErroApi && erro.status === 401) aoPerderSessao?.()
  }
  return new QueryClient({
    queryCache: new QueryCache({ onError: aoErro }),
    mutationCache: new MutationCache({ onError: aoErro }),
    defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
  })
}
