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

describe('variáveis do convite por e-mail', () => {
  const segredo = 'q8Hn3T0x2J1mYvRkP9sWcL4bZ7eA5dF6gU0iO2pK3rM='
  const ler = (extra: Record<string, string>) =>
    EsquemaEnv.safeParse({ ...base, BETTER_AUTH_SECRET: segredo, ...extra })

  it('sem SMTP_URL fica sem SMTP e o link aponta para o app do prestador em dev', () => {
    const r = ler({})
    expect(r.success).toBe(true)
    expect(r.data?.SMTP_URL).toBeUndefined()
    expect(r.data?.URL_APP_PRESTADOR).toBe('http://localhost:5174')
  })

  it('SMTP_URL vazia no .env conta como ausente', () => {
    const r = ler({ SMTP_URL: '', EMAIL_REMETENTE: '' })
    expect(r.success).toBe(true)
    expect(r.data?.SMTP_URL).toBeUndefined()
  })

  it('SMTP_URL exige EMAIL_REMETENTE', () => {
    const smtp = 'smtps://usuario:senha@smtp.exemplo.com:465'
    expect(ler({ SMTP_URL: smtp }).success).toBe(false)
    const r = ler({ SMTP_URL: smtp, EMAIL_REMETENTE: 'Russo <nao-responda@exemplo.com>' })
    expect(r.success).toBe(true)
    expect(r.data?.SMTP_URL).toBe(smtp)
  })

  it('recusa URL_APP_PRESTADOR que não é um endereço', () => {
    expect(ler({ URL_APP_PRESTADOR: 'localhost' }).success).toBe(false)
  })

  it('o .env.example documenta as três', () => {
    const exemplo = readFileSync(join(import.meta.dirname, '../../../.env.example'), 'utf8')
    for (const nome of ['SMTP_URL', 'EMAIL_REMETENTE', 'URL_APP_PRESTADOR']) {
      expect(exemplo).toMatch(new RegExp(`^${nome}=`, 'm'))
    }
  })
})
