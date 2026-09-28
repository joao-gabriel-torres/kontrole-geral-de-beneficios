import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { EsquemaEnv } from './env'

const base = {
  DATABASE_URL: 'postgresql://localhost:5432/kgb_test',
  BETTER_AUTH_URL: 'http://localhost:3000',
}

describe('EsquemaEnv', () => {
  it('recusa subir com o segredo de exemplo do .env.example', () => {
    const exemplo = readFileSync(join(import.meta.dirname, '../../../.env.example'), 'utf8')
    const segredo = /^BETTER_AUTH_SECRET="(.*)"$/m.exec(exemplo)?.[1]
    expect(segredo).toBeTruthy()
    expect(EsquemaEnv.safeParse({ ...base, BETTER_AUTH_SECRET: segredo }).success).toBe(false)
  })

  it('aceita um segredo gerado', () => {
    const resultado = EsquemaEnv.safeParse({
      ...base,
      BETTER_AUTH_SECRET: 'q8Hn3T0x2J1mYvRkP9sWcL4bZ7eA5dF6gU0iO2pK3rM=',
    })
    expect(resultado.success).toBe(true)
  })
})
