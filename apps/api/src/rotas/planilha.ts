import { OpenAPIHono } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'

/** Planilha de credenciados (prévia e confirmação da importação, exportação e modelo). */
export const rotasPlanilha = new OpenAPIHono<Ambiente>()
