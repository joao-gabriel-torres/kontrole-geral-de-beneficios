import type { CorpoErro } from '@kgb/api-client'
import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'

/** Chaves do vue-query: depois de cada mutação, a lista, o detalhe e o Início são invalidados. */
export const CHAVES = {
  inicio: ['inicio'] as const,
  lista: ['acionamentos'] as const,
  detalhe: (id: string) => ['acionamento', id] as const,
}

/** Só para falha de rede (o pedido nem chegou a ter resposta). */
export const MENSAGEM_SEM_CONEXAO = 'Não foi possível falar com o servidor. Verifique sua conexão.'
/** 5xx sem o corpo da API: proxy ou servidor fora do ar. O problema não é o Wi-Fi do prestador. */
export const MENSAGEM_SERVIDOR = 'O servidor está com problemas. Tente de novo em instantes.'
/** 413 do proxy no envio de uma foto: o mesmo texto que a API usa para o limite da rota. */
export const MENSAGEM_FOTO_GRANDE = 'A foto passa de 10 MB'
/** 413 do proxy na inviabilidade (até 5 fotos juntas): o mesmo texto que a API usa na rota. */
export const MENSAGEM_FOTOS_GRANDES = 'As fotos passam do limite'
/** Outra resposta fora do formato da API (o mesmo texto neutro do gestor). */
export const MENSAGEM_FALHA = 'Não foi possível falar com o servidor. Tente de novo.'

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

export interface OpcoesExigir {
  /**
   * Texto de um 413 sem o corpo da API (o proxy barrou o envio antes dela). Depende do que a rota
   * recebe: uma foto, várias fotos juntas. Sem ele, o 413 usa o texto neutro.
   */
  limite?: string
}

/** Resposta que não veio da API (página de erro do proxy, corpo vazio): a mensagem vem do status. */
function erroForaDoFormato(status: number, { limite }: OpcoesExigir): ErroApi {
  if (status === 413 && limite) return new ErroApi('arquivo_grande', status, limite)
  if (status >= 500) return new ErroApi('servidor', status, MENSAGEM_SERVIDOR)
  return new ErroApi('desconhecido', status, MENSAGEM_FALHA)
}

/** Resposta do openapi-fetch → dados, ou `ErroApi` com a mensagem que a API mandou. */
export function exigir<T>(
  resultado: { data?: T; error?: unknown; response: Response },
  opcoes: OpcoesExigir = {},
): T {
  const { data, error, response } = resultado
  if (error === undefined && response.ok) return data as T
  if (ehCorpoErro(error)) throw new ErroApi(error.erro.codigo, response.status, error.erro.mensagem)
  throw erroForaDoFormato(response.status, opcoes)
}

/** Texto para o aviso: o que a API (ou o status) disse; sem resposta nenhuma, falha de rede. */
export function mensagemDeErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : MENSAGEM_SEM_CONEXAO
}

/**
 * Um 4xx é a resposta definitiva da API (não encontrado, sessão recusada): repetir só atrasa em
 * 1 s o aviso e a volta ao login. Falha de rede e 5xx repetem uma vez.
 */
export function repetirConsulta(falhas: number, erro: unknown): boolean {
  if (erro instanceof ErroApi && erro.status >= 400 && erro.status < 500) return false
  return falhas < 1
}

/** `aoPerderSessao` é chamado quando a API recusa a sessão (401) numa consulta ou numa ação. */
export function criarClienteConsultas(aoPerderSessao?: () => void): QueryClient {
  const aoErro = (erro: unknown) => {
    if (erro instanceof ErroApi && erro.status === 401) aoPerderSessao?.()
  }
  return new QueryClient({
    queryCache: new QueryCache({ onError: aoErro }),
    mutationCache: new MutationCache({ onError: aoErro }),
    defaultOptions: { queries: { retry: repetirConsulta, refetchOnWindowFocus: false } },
  })
}
