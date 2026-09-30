import { describe, expect, it } from 'vitest'
import { ErroDominio } from './acionamento'
import {
  ASSUNTO_CONVITE,
  emailDoConvite,
  expiracaoDoConvite,
  linkDoConvite,
  momentoDoConvite,
  normalizarEmail,
  situacaoDoAcesso,
  verificarConvite,
} from './convites'

describe('normalizarEmail', () => {
  it('tira espaços e maiúsculas (o Better Auth procura o login em minúsculas)', () => {
    expect(normalizarEmail('  Ana.Nova@Teste.DEV ')).toBe('ana.nova@teste.dev')
  })
  it('vazio, só espaços ou nulo vira null', () => {
    expect(normalizarEmail('   ')).toBeNull()
    expect(normalizarEmail('')).toBeNull()
    expect(normalizarEmail(null)).toBeNull()
    expect(normalizarEmail(undefined)).toBeNull()
  })
})

describe('expiracaoDoConvite', () => {
  it('vale por 7 dias a partir de agora', () => {
    expect(expiracaoDoConvite(new Date('2026-09-29T12:00:00Z')).toISOString()).toBe(
      '2026-10-06T12:00:00.000Z',
    )
  })
})

describe('momentoDoConvite', () => {
  const agora = new Date('2026-09-30T12:00:00.000Z')

  it('é agora quando não há convite anterior ou o anterior é mais antigo', () => {
    expect(momentoDoConvite(null, agora)).toEqual(agora)
    expect(momentoDoConvite(new Date('2026-09-30T11:59:59.999Z'), agora)).toEqual(agora)
  })

  it('fica 1 ms depois do anterior no mesmo milissegundo ou à frente: a ordem nunca empata', () => {
    expect(momentoDoConvite(agora, agora).toISOString()).toBe('2026-09-30T12:00:00.001Z')
    expect(momentoDoConvite(new Date('2026-09-30T12:00:05.000Z'), agora).toISOString()).toBe(
      '2026-09-30T12:00:05.001Z',
    )
  })
})

describe('linkDoConvite', () => {
  it('aponta para /convite do app do prestador com o token', () => {
    expect(linkDoConvite('http://localhost:5174', 'abc')).toBe(
      'http://localhost:5174/convite?token=abc',
    )
  })
  it('não duplica a barra e codifica o token', () => {
    expect(linkDoConvite('https://app.russo.com.br/', 'a+b/c')).toBe(
      'https://app.russo.com.br/convite?token=a%2Bb%2Fc',
    )
  })
})

describe('verificarConvite', () => {
  const erro = (fn: () => unknown) => {
    try {
      fn()
    } catch (e) {
      return e
    }
    throw new Error('não lançou')
  }

  it('devolve o e-mail normalizado, que vira o login', () => {
    expect(
      verificarConvite({ prestadorId: 'p2', email: ' Ana@Teste.dev', contaDoEmail: null }),
    ).toBe('ana@teste.dev')
  })

  it('recusa prestador sem e-mail', () => {
    const e = erro(() => verificarConvite({ prestadorId: 'p2', email: '  ', contaDoEmail: null }))
    expect(e).toBeInstanceOf(ErroDominio)
    expect(e).toMatchObject({
      codigo: 'prestador_sem_email',
      message: 'Cadastre um e-mail para enviar o convite',
      status: 409,
    })
  })

  it('recusa e-mail de outra conta: gestor ou outro prestador', () => {
    for (const contaDoEmail of [{ prestadorId: null }, { prestadorId: 'p3' }]) {
      const e = erro(() =>
        verificarConvite({ prestadorId: 'p2', email: 'x@teste.dev', contaDoEmail }),
      )
      expect(e).toMatchObject({
        codigo: 'email_em_uso',
        message: 'Este e-mail já é usado por outra conta',
        status: 409,
      })
    }
  })

  it('recusa o que o login do Better Auth não aceita: dois endereços, nome junto, incompleto', () => {
    // Com vírgula ou ponto e vírgula, o nodemailer entregaria o link a todos os endereços.
    for (const email of [
      'a@x.com; b@y.com',
      'a@x.com, b@y.com',
      'Ana <a@x.com>',
      'ana@',
      'ana.x.com',
    ]) {
      const e = erro(() => verificarConvite({ prestadorId: 'p2', email, contaDoEmail: null }))
      expect(e).toBeInstanceOf(ErroDominio)
      expect(e).toMatchObject({
        codigo: 'email_invalido',
        message: 'O e-mail do cadastro não é válido',
        status: 409,
      })
    }
  })

  it('aceita endereços comuns com subdomínio, + e hífen', () => {
    expect(
      verificarConvite({
        prestadorId: 'p2',
        email: 'Ana.Costa+Russo@mail.ribeiro-reparos.com.br',
        contaDoEmail: null,
      }),
    ).toBe('ana.costa+russo@mail.ribeiro-reparos.com.br')
  })

  it('aceita o e-mail que já é do usuário do próprio prestador', () => {
    expect(
      verificarConvite({
        prestadorId: 'p2',
        email: 'ana@teste.dev',
        contaDoEmail: { prestadorId: 'p2' },
      }),
    ).toBe('ana@teste.dev')
  })
})

describe('situacaoDoAcesso', () => {
  it('ativo quando já tem senha, mesmo que o e-mail tenha saído do cadastro', () => {
    expect(situacaoDoAcesso({ email: 'a@x.dev', temSenha: true, conviteValido: true })).toBe(
      'ativo',
    )
    expect(situacaoDoAcesso({ email: null, temSenha: true, conviteValido: false })).toBe('ativo')
  })
  it('sem_email quando não há e-mail nem senha', () => {
    expect(situacaoDoAcesso({ email: ' ', temSenha: false, conviteValido: false })).toBe(
      'sem_email',
    )
  })
  it('convidado com convite válido', () => {
    expect(situacaoDoAcesso({ email: 'a@x.dev', temSenha: false, conviteValido: true })).toBe(
      'convidado',
    )
  })
  it('pendente com e-mail, sem convite válido nem senha', () => {
    expect(situacaoDoAcesso({ email: 'a@x.dev', temSenha: false, conviteValido: false })).toBe(
      'pendente',
    )
  })
})

describe('emailDoConvite', () => {
  const link = 'http://localhost:5174/convite?token=abc123'
  const email = emailDoConvite({ nome: 'Ana Ribeiro', email: 'ana@teste.dev', link })

  it('tem o assunto do spec', () => {
    expect(email.assunto).toBe('Seu acesso ao app da Russo Assistência')
    expect(ASSUNTO_CONVITE).toBe(email.assunto)
  })

  it('no texto: saudação pelo primeiro nome, o login, o link e a validade', () => {
    expect(email.texto).toMatch(/^Olá, Ana!/)
    expect(email.texto).toContain('ana@teste.dev')
    expect(email.texto).toContain(`Criar minha senha: ${link}`)
    expect(email.texto).toContain('O link vale por 7 dias.')
  })

  it('no HTML: o botão "Criar minha senha" em #0069BD apontando para o link', () => {
    expect(email.html).toMatch(
      /<a href="http:\/\/localhost:5174\/convite\?token=abc123"[^>]*background:#0069BD[^>]*>Criar minha senha<\/a>/,
    )
    expect(email.html).toContain('Olá, Ana!')
    expect(email.html).toContain('ana@teste.dev')
    expect(email.html).toContain('O link vale por 7 dias.')
    expect(email.html).toContain(`<title>${email.assunto}</title>`)
  })

  it('escapa HTML vindo do cadastro', () => {
    const perigoso = emailDoConvite({
      nome: '<script>alert(1)</script> Silva',
      email: 'a"b@teste.dev',
      link: 'http://app/convite?token=x&y',
    })
    expect(perigoso.html).not.toContain('<script>')
    expect(perigoso.html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(perigoso.html).toContain('a&quot;b@teste.dev')
    expect(perigoso.html).toContain('href="http://app/convite?token=x&amp;y"')
  })

  it('nome vazio vira só "Olá!"', () => {
    expect(emailDoConvite({ nome: '  ', email: 'a@x.dev', link }).texto).toMatch(/^Olá!\n/)
  })
})
