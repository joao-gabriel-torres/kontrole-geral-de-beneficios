import { z } from '@hono/zod-openapi'

export const ErroSchema = z
  .object({
    erro: z.object({
      codigo: z.string(),
      mensagem: z.string(),
      campos: z.array(z.object({ campo: z.string(), mensagem: z.string() })).optional(),
    }),
  })
  .openapi('Erro')

export type CorpoErro = z.infer<typeof ErroSchema>

export function corpoErro(
  codigo: string,
  mensagem: string,
  campos?: { campo: string; mensagem: string }[],
): CorpoErro {
  return { erro: { codigo, mensagem, ...(campos ? { campos } : {}) } }
}

export function respostaErro(descricao: string) {
  return { description: descricao, content: { 'application/json': { schema: ErroSchema } } }
}

export class ErroHttp extends Error {
  constructor(
    readonly status: 401 | 403 | 404 | 409 | 413 | 415 | 422 | 502,
    readonly codigo: string,
    mensagem: string,
    opcoes?: ErrorOptions,
  ) {
    super(mensagem, opcoes)
    this.name = 'ErroHttp'
  }
}

export function naoEncontrado(oque = 'Acionamento'): ErroHttp {
  return new ErroHttp(404, 'nao_encontrado', `${oque} não encontrado`)
}
