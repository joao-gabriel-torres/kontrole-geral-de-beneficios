export const MENSAGEM_FALHA = 'Não foi possível falar com o servidor. Tente de novo.'

export class ErroApi extends Error {
  constructor(
    mensagem: string,
    readonly codigo: string,
    readonly status: number,
  ) {
    super(mensagem)
    this.name = 'ErroApi'
  }
}

interface RespostaApi {
  data?: unknown
  error?: unknown
  response: { status: number }
}

/** Devolve o `data` de uma resposta do openapi-fetch, ou lança `ErroApi` com a mensagem da API. */
export async function exigir<R extends RespostaApi>(
  pedido: Promise<R>,
): Promise<NonNullable<R['data']>> {
  const { data, error, response } = await pedido
  if (error === undefined && data !== undefined && data !== null) {
    return data as NonNullable<R['data']>
  }
  const corpo = error as { erro?: { codigo?: string; mensagem?: string } } | undefined
  throw new ErroApi(
    corpo?.erro?.mensagem ?? MENSAGEM_FALHA,
    corpo?.erro?.codigo ?? 'desconhecido',
    response.status,
  )
}

/** Texto para o toast: a mensagem da API ou, em falha de rede, a mensagem padrão. */
export function mensagemDeErro(erro: unknown): string {
  return erro instanceof ErroApi ? erro.message : MENSAGEM_FALHA
}
