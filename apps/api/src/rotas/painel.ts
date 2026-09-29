import { OpenAPIHono } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'

/** Painel do gestor (GET /api/painel). */
export const rotasPainel = new OpenAPIHono<Ambiente>()
