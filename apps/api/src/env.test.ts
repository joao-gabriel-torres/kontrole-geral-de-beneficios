import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parse } from 'dotenv'
import { describe, expect, it } from 'vitest'
import { EsquemaEnv, lerEnv } from './env'

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

  it('SMTP_URL só aceita smtp:// ou smtps:// e ensina a codificar a senha', () => {
    const remetente = { EMAIL_REMETENTE: 'Russo <nao-responda@exemplo.com>' }
    expect(ler({ SMTP_URL: 'smtp://usuario:senha@localhost:1025', ...remetente }).success).toBe(
      true,
    )
    for (const url of [
      'localhost:1025',
      'javascript:alert(1)',
      'https://smtp.exemplo.com',
      // Chave SendGrid/SES sem percent-encoding: '/' e '#' quebram a URL.
      'smtps://apikey:SG.abc/def@smtp.sendgrid.net:465',
      'smtps://usuario:senha#123@smtp.exemplo.com:465',
    ]) {
      const r = ler({ SMTP_URL: url, ...remetente })
      expect(r.success).toBe(false)
      expect(r.error?.issues[0]?.message).toContain('encodeURIComponent')
    }
  })

  it('o .env.example documenta as três', () => {
    const exemplo = readFileSync(join(import.meta.dirname, '../../../.env.example'), 'utf8')
    for (const nome of ['SMTP_URL', 'EMAIL_REMETENTE', 'URL_APP_PRESTADOR']) {
      expect(exemplo).toMatch(new RegExp(`^${nome}=`, 'm'))
    }
  })
})

describe('produção (NODE_ENV=production)', () => {
  const segredo = 'q8Hn3T0x2J1mYvRkP9sWcL4bZ7eA5dF6gU0iO2pK3rM='
  const smtp = {
    SMTP_URL: 'smtps://usuario:senha@smtp.exemplo.com:465',
    EMAIL_REMETENTE: 'Russo <nao-responda@exemplo.com>',
  }
  const app = { URL_APP_PRESTADOR: 'https://app.russo.com.br' }
  const faltando = (fonte: Record<string, string>) => {
    const r = EsquemaEnv.safeParse({ ...base, BETTER_AUTH_SECRET: segredo, ...fonte })
    return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
  }

  it('exige SMTP_URL: sem ela nenhum convite chegaria ao prestador', () => {
    expect(faltando({ NODE_ENV: 'production', ...app })).toEqual(['SMTP_URL'])
  })

  it('exige URL_APP_PRESTADOR explícita: o padrão do dev é localhost', () => {
    expect(faltando({ NODE_ENV: 'production', ...smtp })).toEqual(['URL_APP_PRESTADOR'])
  })

  it('sobe com SMTP, remetente e endereço do app', () => {
    const r = EsquemaEnv.safeParse({
      ...base,
      BETTER_AUTH_SECRET: segredo,
      NODE_ENV: 'production',
      ...smtp,
      ...app,
    })
    expect(r.success).toBe(true)
    expect(r.data?.URL_APP_PRESTADOR).toBe('https://app.russo.com.br')
  })

  it('o .env.example copiado para produção não sobe', () => {
    const exemplo = parse(readFileSync(join(import.meta.dirname, '../../../.env.example'), 'utf8'))
    const producao = { ...exemplo, BETTER_AUTH_SECRET: segredo, NODE_ENV: 'production' }
    expect(faltando(producao)).toEqual(['SMTP_URL', 'URL_APP_PRESTADOR'])
    expect(faltando({ ...producao, SMTP_URL: smtp.SMTP_URL })).toEqual([
      'EMAIL_REMETENTE',
      'URL_APP_PRESTADOR',
    ])
  })
})

describe('CORS_ORIGINS', () => {
  const segredo = 'q8Hn3T0x2J1mYvRkP9sWcL4bZ7eA5dF6gU0iO2pK3rM='
  const ler = (CORS_ORIGINS: string) =>
    EsquemaEnv.safeParse({ ...base, BETTER_AUTH_SECRET: segredo, CORS_ORIGINS })

  it('separa as origens por vírgula, sem espaços nem itens vazios', () => {
    const r = ler(' https://gestor.russo.com.br , https://prestador.russo.com.br,,')
    expect(r.data?.CORS_ORIGINS).toEqual([
      'https://gestor.russo.com.br',
      'https://prestador.russo.com.br',
    ])
  })

  it('aceita as origens do dev e dos apps nativos', () => {
    const exemplo = parse(readFileSync(join(import.meta.dirname, '../../../.env.example'), 'utf8'))
    const r = ler(exemplo.CORS_ORIGINS ?? '')
    expect(r.success).toBe(true)
    expect(r.data?.CORS_ORIGINS).toContain('capacitor://localhost')
  })

  // O navegador manda a origem sem barra nem caminho, e o CORS e o Better Auth comparam o texto
  // exato: com a barra copiada da barra de endereços, o gestor do Pages nem conseguiria entrar.
  it('recusa endereço com barra ou caminho no fim e diz como escrever a origem', () => {
    for (const [errada, certa] of [
      ['https://gestor.russo.com.br/', 'https://gestor.russo.com.br'],
      ['https://kgb-gestor.pages.dev/login', 'https://kgb-gestor.pages.dev'],
      ['https://Gestor.Russo.com.br', 'https://gestor.russo.com.br'],
      ['https://gestor.russo.com.br:443', 'https://gestor.russo.com.br'],
    ] as const) {
      const r = ler(`http://localhost:5173,${errada}`)
      expect(r.success).toBe(false)
      expect(r.error?.issues[0]?.path).toEqual(['CORS_ORIGINS', 1])
      expect(r.error?.issues[0]?.message).toContain(`use "${certa}"`)
    }
  })

  it('recusa o que não é endereço', () => {
    // `localhost:5173` é uma URL válida para o `new URL` (esquema "localhost:"), mas não uma origem.
    for (const errada of ['gestor.russo.com.br', 'localhost:5173']) {
      const r = ler(errada)
      expect(r.success).toBe(false)
      expect(r.error?.issues[0]?.message).toContain('ex.: https://')
    }
  })
})

describe('lerEnv', () => {
  it('para a subida dizendo quais variáveis faltam e por quê', () => {
    const fonte = {
      ...base,
      BETTER_AUTH_SECRET: 'q8Hn3T0x2J1mYvRkP9sWcL4bZ7eA5dF6gU0iO2pK3rM=',
      NODE_ENV: 'production',
    }
    expect(() => lerEnv(fonte)).toThrow(/Em produção, defina SMTP_URL[\s\S]*URL_APP_PRESTADOR/)
  })

  it('fora de produção completa o endereço do app com o do dev', () => {
    const fonte = { ...base, BETTER_AUTH_SECRET: 'q8Hn3T0x2J1mYvRkP9sWcL4bZ7eA5dF6gU0iO2pK3rM=' }
    expect(lerEnv(fonte).URL_APP_PRESTADOR).toBe('http://localhost:5174')
  })
})
