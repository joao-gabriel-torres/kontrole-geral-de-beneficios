import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { prisma } from '../db'
import { respostaErro } from '../erros'
import { exigeLogin, usuarioLogado } from '../middlewares/acesso'

export const UsuarioSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    email: z.string(),
    papel: z.enum(['gestor', 'prestador']),
    prestador: z.object({ id: z.string(), nome: z.string() }).nullable(),
  })
  .openapi('Usuario')

const rota = createRoute({
  method: 'get',
  path: '/api/me',
  tags: ['Sessão'],
  summary: 'Usuário da sessão atual',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  responses: {
    200: {
      description: 'Usuário logado',
      content: { 'application/json': { schema: UsuarioSchema } },
    },
    401: respostaErro('Sem sessão'),
  },
})

export const rotasMe = new OpenAPIHono<Ambiente>().openapi(rota, async (c) => {
  const u = usuarioLogado(c)
  const prestador = u.prestadorId
    ? await prisma.prestador.findUnique({
        where: { id: u.prestadorId },
        select: { id: true, nome: true },
      })
    : null
  return c.json({ id: u.id, nome: u.nome, email: u.email, papel: u.papel, prestador }, 200)
})
