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
