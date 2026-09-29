import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel, usuarioLogado } from '../middlewares/acesso'
import { IdParam } from '../schemas'
import { enviarConvite } from '../servicos/convites'

export const ConviteEnviadoSchema = z
  .object({
    email: z.string().openapi({ description: 'E-mail que recebeu o convite e vira o login' }),
    expiraEm: z.string().openapi({ description: 'Validade do link (ISO 8601)' }),
  })
  .openapi('ConviteEnviado')

const rotaConvite = createRoute({
  method: 'post',
  path: '/api/prestadores/{id}/convite',
  tags: ['Prestadores'],
  summary: 'Envia ou reenvia o convite de acesso do prestador por e-mail',
  description:
    'Cria ou atualiza o usuário do prestador (sem senha) e manda um link de uso único, válido por 7 dias, para ele criar a senha. Invalida os convites anteriores. Quem já tem senha recebe o mesmo convite, que funciona como redefinição.',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { params: IdParam },
  responses: {
    200: {
      description: 'Convite enviado',
      content: { 'application/json': { schema: ConviteEnviadoSchema } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    404: respostaErro('Prestador não encontrado ou excluído'),
    409: respostaErro('Prestador sem e-mail, ou e-mail usado por outra conta'),
    502: respostaErro('O servidor de e-mail não aceitou a mensagem'),
  },
})

/** Convite por e-mail para o acesso do prestador ao app. */
export const rotasConvites = new OpenAPIHono<Ambiente>().openapi(rotaConvite, async (c) =>
  c.json(await enviarConvite(c.req.valid('param').id, usuarioLogado(c)), 200),
)
