import { OpenAPIHono } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'

/** Tipos de demanda e checklists (criar, editar, excluir). */
export const rotasTipos = new OpenAPIHono<Ambiente>()
