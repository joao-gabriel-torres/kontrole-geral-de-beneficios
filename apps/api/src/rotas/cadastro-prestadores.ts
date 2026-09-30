import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel, usuarioLogado } from '../middlewares/acesso'
import { IdParam } from '../schemas'
import {
  alterarStatus,
  atualizarPrestador,
  criarPrestador,
  excluirPrestador,
  listarCadastro,
} from '../servicos/prestadores'

const STATUS_PRESTADOR = ['ativo', 'inativo'] as const
const ACESSOS = ['sem_email', 'pendente', 'convidado', 'ativo'] as const

export const PrestadorCadastroSchema = z
  .object({
    id: z.string(),
    nome: z.string(),
    documento: z.string().openapi({ description: 'Só dígitos (11 ou 14)' }),
    telefone: z.string().openapi({ description: 'Só dígitos, com DDD' }),
    email: z.string().nullable(),
    regiao: z.string().nullable(),
    cep: z.string().nullable().openapi({ description: 'Só os 8 dígitos' }),
    status: z.enum(STATUS_PRESTADOR),
    cor: z.string(),
    credenciadoDesde: z.string().openapi({ description: 'AAAA-MM-DD' }),
    especialidades: z
      .array(z.object({ id: z.string(), nome: z.string() }))
      .openapi({ description: 'Na ordem cadastrada, sem os tipos excluídos' }),
    emAberto: z
      .number()
      .int()
      .openapi({ description: 'Acionamentos agendados, em execução, reprovados ou aguardando' }),
    total: z.number().int(),
    acesso: z.enum(ACESSOS).openapi({
      description:
        'Acesso ao app: ativo (tem senha), convidado (convite válido), pendente (tem e-mail, sem convite válido nem senha) ou sem_email',
    }),
  })
  .openapi('PrestadorCadastro')

export const PrestadorCredenciadoSchema = PrestadorCadastroSchema.extend({
  convite: z.object({
    situacao: z.enum(['enviado', 'falhou', 'sem_email']),
    email: z.string().nullable(),
    mensagem: z
      .string()
      .nullable()
      .openapi({ description: 'Por que o convite não saiu (o cadastro vale mesmo assim)' }),
  }),
}).openapi('PrestadorCredenciado')

export const DadosPrestadorSchema = z
  .object({
    nome: z.string().max(200),
    documento: z.string().max(40).openapi({ description: 'CPF ou CNPJ, com ou sem máscara' }),
    telefone: z.string().max(40),
    email: z.string().max(200).nullable().optional(),
    regiao: z.string().max(120).nullable().optional(),
    cep: z
      .string()
      .max(20)
      .nullable()
      .optional()
      .openapi({ description: '8 dígitos, com ou sem hífen' }),
    especialidades: z
      .array(z.string().max(64))
      .max(50)
      .openapi({ description: 'Ids dos tipos, na ordem escolhida' }),
  })
  .openapi('DadosPrestador')

export const StatusPrestadorSchema = z
  .object({ status: z.enum(STATUS_PRESTADOR) })
  .openapi('StatusPrestador')

const apenasGestor = exigePapel('gestor')
const cadastro = {
  description: 'Cadastro do prestador',
  content: { 'application/json': { schema: PrestadorCadastroSchema } },
}
const errosDeAcesso = {
  401: respostaErro('Sem sessão'),
  403: respostaErro('Só para a gestão'),
}
const corpoDados = {
  body: { content: { 'application/json': { schema: DadosPrestadorSchema } }, required: true },
}

const rotaListar = createRoute({
  method: 'get',
  path: '/api/prestadores/cadastro',
  tags: ['Prestadores'],
  summary: 'Prestadores não excluídos, por nome, com especialidades e carga',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  responses: {
    200: {
      description: 'Cadastro',
      content: { 'application/json': { schema: z.array(PrestadorCadastroSchema) } },
    },
    ...errosDeAcesso,
  },
})

const rotaCriar = createRoute({
  method: 'post',
  path: '/api/prestadores',
  tags: ['Prestadores'],
  summary: 'Credencia um prestador (ativo, desde hoje) e, com e-mail, envia o convite de acesso',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  request: corpoDados,
  responses: {
    201: {
      description: 'Credenciado, com o resultado do convite',
      content: { 'application/json': { schema: PrestadorCredenciadoSchema } },
    },
    ...errosDeAcesso,
    409: respostaErro('Documento já cadastrado'),
    422: respostaErro('Dados inválidos'),
  },
})

const rotaEditar = createRoute({
  method: 'patch',
  path: '/api/prestadores/{id}',
  tags: ['Prestadores'],
  summary: 'Edita o cadastro (status, cor e data de credenciamento não mudam)',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  request: { params: IdParam, ...corpoDados },
  responses: {
    200: cadastro,
    ...errosDeAcesso,
    404: respostaErro('Prestador não encontrado'),
    409: respostaErro('Documento já cadastrado'),
    422: respostaErro('Dados inválidos'),
  },
})

const rotaStatus = createRoute({
  method: 'patch',
  path: '/api/prestadores/{id}/status',
  tags: ['Prestadores'],
  summary: 'Ativa ou desativa (o switch da lista e o "Desativar" da exclusão)',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  request: {
    params: IdParam,
    body: { content: { 'application/json': { schema: StatusPrestadorSchema } }, required: true },
  },
  responses: {
    200: cadastro,
    ...errosDeAcesso,
    404: respostaErro('Prestador não encontrado'),
    422: respostaErro('Dados inválidos'),
  },
})

const rotaExcluir = createRoute({
  method: 'delete',
  path: '/api/prestadores/{id}',
  tags: ['Prestadores'],
  summary: 'Exclui (lógico) quem não tem acionamentos em aberto e derruba a sessão dele',
  security: [{ Bearer: [] }],
  middleware: apenasGestor,
  request: { params: IdParam },
  responses: {
    200: {
      description: 'Excluído',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
    ...errosDeAcesso,
    404: respostaErro('Prestador não encontrado'),
    409: respostaErro('Prestador com acionamentos em aberto'),
  },
})

/** Cadastro de prestadores (lista de gestão, criar, editar, status, excluir). */
export const rotasCadastroPrestadores = new OpenAPIHono<Ambiente>()
  .openapi(rotaListar, async (c) => c.json(await listarCadastro(), 200))
  .openapi(rotaCriar, async (c) =>
    c.json(await criarPrestador(c.req.valid('json'), usuarioLogado(c)), 201),
  )
  .openapi(rotaEditar, async (c) =>
    c.json(await atualizarPrestador(c.req.valid('param').id, c.req.valid('json')), 200),
  )
  .openapi(rotaStatus, async (c) =>
    c.json(await alterarStatus(c.req.valid('param').id, c.req.valid('json').status), 200),
  )
  .openapi(rotaExcluir, async (c) => {
    await excluirPrestador(c.req.valid('param').id)
    return c.json({ ok: true as const }, 200)
  })
