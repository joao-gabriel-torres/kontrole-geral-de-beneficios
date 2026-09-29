import { OpenAPIHono } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'

/** Cadastro de prestadores (lista de gestão, criar, editar, status, excluir). */
export const rotasCadastroPrestadores = new OpenAPIHono<Ambiente>()
