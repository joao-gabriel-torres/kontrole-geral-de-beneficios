import { OpenAPIHono } from '@hono/zod-openapi'
import { Scalar } from '@scalar/hono-api-reference'
import { cors } from 'hono/cors'
import { HTTPException } from 'hono/http-exception'
import { auth, guardaAuth } from './auth'
import type { Ambiente } from './contexto'
import { ErroDominio } from './dominio/acionamento'
import { env } from './env'
import { corpoErro, ErroHttp } from './erros'
import { sessao } from './middlewares/sessao'
import { rotasAcionamentos } from './rotas/acionamentos'
import { rotasArquivos } from './rotas/arquivos'
import { rotasAssinantes } from './rotas/assinantes'
import { rotasCadastroPrestadores } from './rotas/cadastro-prestadores'
import { rotasCatalogo } from './rotas/catalogo'
import { rotasConvites } from './rotas/convites'
import { rotasExecucao } from './rotas/execucao'
import { rotasPrestador } from './rotas/prestador'
import { rotasMe } from './rotas/me'
import { rotasPainel } from './rotas/painel'
import { rotasPlanilha } from './rotas/planilha'
import { rotasSaude } from './rotas/saude'
import { rotasTipos } from './rotas/tipos'

export const INFO_OPENAPI = {
  openapi: '3.1.0',
  info: {
    title: 'KGB API',
    version: '0.1.0',
    description: 'API do sistema de acionamentos da Russo Assistência',
  },
} as const

export function criarApp() {
  const app = new OpenAPIHono<Ambiente>({
    defaultHook: (resultado, c) => {
      if (!resultado.success) {
        const campos = resultado.error.issues.map((i) => ({
          campo: i.path.join('.'),
          mensagem: i.message,
        }))
        return c.json(corpoErro('validacao', 'Dados inválidos', campos), 422)
      }
    },
  })

  app.use(
    '/api/*',
    cors({
      origin: env.CORS_ORIGINS,
      credentials: true,
      allowHeaders: ['Content-Type', 'Authorization'],
      allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      exposeHeaders: ['set-auth-token'],
    }),
  )
  // A foto assinada responde sem ler a sessão: a <img> do gestor web leva cookie, e cada miniatura
  // faria uma consulta à toa.
  app.route('/', rotasArquivos)
  app.on(['GET', 'POST'], '/api/auth/*', guardaAuth, (c) => auth.handler(c.req.raw))
  app.use('/api/*', sessao)

  app.openAPIRegistry.registerComponent('securitySchemes', 'Bearer', {
    type: 'http',
    scheme: 'bearer',
  })
  app.route('/', rotasSaude)
  app.route('/', rotasMe)
  app.route('/', rotasAcionamentos)
  app.route('/', rotasAssinantes)
  app.route('/', rotasCatalogo)
  app.route('/', rotasExecucao)
  app.route('/', rotasPrestador)
  app.route('/', rotasPainel)
  app.route('/', rotasTipos)
  // A planilha antes do cadastro: /api/prestadores/planilha… não pode cair em /api/prestadores/{id}.
  app.route('/', rotasPlanilha)
  app.route('/', rotasConvites)
  app.route('/', rotasCadastroPrestadores)

  app.doc31('/api/openapi.json', INFO_OPENAPI)
  app.get('/api/docs', Scalar({ url: '/api/openapi.json' }))

  app.notFound((c) => c.json(corpoErro('nao_encontrado', 'Rota não encontrada'), 404))
  app.onError((erro, c) => {
    if (erro instanceof ErroDominio || erro instanceof ErroHttp) {
      return c.json(corpoErro(erro.codigo, erro.message), erro.status)
    }
    if (erro instanceof HTTPException) {
      const codigo =
        erro.status === 401 ? 'nao_autenticado' : erro.status === 403 ? 'sem_permissao' : 'erro'
      return c.json(corpoErro(codigo, erro.message), erro.status)
    }
    console.error(erro)
    return c.json(corpoErro('interno', 'Erro interno'), 500)
  })
  return app
}
