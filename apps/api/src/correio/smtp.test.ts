import { createServer, type AddressInfo, type Socket } from 'node:net'
import { createTransport } from 'nodemailer'
import { describe, expect, it } from 'vitest'
import { criarCorreioSmtp, criarTransporteSmtp, LIMITES_SMTP, type TransporteSmtp } from './smtp'

/** Os fronts desistem da chamada em 8 s (TEMPO_LIMITE_PADRAO do @kgb/api-client). */
const TEMPO_LIMITE_DO_CLIENTE = 8_000

const mensagem = {
  para: 'ana@teste.dev',
  assunto: 'Seu acesso ao app da Russo Assistência',
  texto: 'Crie sua senha: http://app/convite?token=abc',
  html: '<p>Olá, Ana!</p>',
}

describe('correio SMTP (produção)', () => {
  it('entrega ao nodemailer remetente, destinatário, assunto, texto e HTML', async () => {
    // O transporte JSON do nodemailer monta a mensagem de verdade, sem rede.
    const real = createTransport({ jsonTransport: true })
    const montadas: Record<string, unknown>[] = []
    const transporte: TransporteSmtp = {
      async sendMail(opcoes) {
        const info = await real.sendMail(opcoes)
        montadas.push(JSON.parse(info.message) as Record<string, unknown>)
        return info
      },
    }
    await criarCorreioSmtp(
      'smtp://ignorado',
      'Russo Assistência <nao-responda@russo.dev>',
      transporte,
    ).enviar(mensagem)
    expect(montadas).toEqual([
      expect.objectContaining({
        from: { address: 'nao-responda@russo.dev', name: 'Russo Assistência' },
        to: [{ address: 'ana@teste.dev', name: '' }],
        subject: 'Seu acesso ao app da Russo Assistência',
        text: mensagem.texto,
        html: mensagem.html,
      }),
    ])
  })

  it('a falha do servidor SMTP chega a quem chamou', async () => {
    const transporte: TransporteSmtp = {
      sendMail: () => Promise.reject(new Error('535 Authentication failed')),
    }
    await expect(
      criarCorreioSmtp('smtp://x', 'n@russo.dev', transporte).enviar(mensagem),
    ).rejects.toThrow('535')
  })
})

describe('tempos limite do SMTP', () => {
  it('servidor que aceita a conexão e nunca cumprimenta: o transporte desiste antes do cliente', async () => {
    const conexoes = new Set<Socket>()
    const mudo = createServer((socket) => conexoes.add(socket))
    await new Promise<void>((pronto) => mudo.listen(0, '127.0.0.1', pronto))
    const { port } = mudo.address() as AddressInfo
    const inicio = Date.now()
    try {
      await expect(
        criarTransporteSmtp(`smtp://127.0.0.1:${port}`).sendMail({
          from: 'n@russo.dev',
          to: 'ana@teste.dev',
          subject: 'assunto',
          text: 'texto',
          html: '<p>html</p>',
        }),
      ).rejects.toThrow()
      expect(Date.now() - inicio).toBeLessThan(TEMPO_LIMITE_DO_CLIENTE)
    } finally {
      for (const socket of conexoes) socket.destroy()
      mudo.close()
    }
  }, 10_000)

  it('transporte que nunca responde: enviar rejeita no limite total', async () => {
    const nuncaResponde: TransporteSmtp = { sendMail: () => new Promise(() => {}) }
    await expect(
      criarCorreioSmtp('smtp://x', 'n@russo.dev', nuncaResponde, 50).enviar(mensagem),
    ).rejects.toThrow('O servidor de e-mail não respondeu')
  }, 2_000)

  it('o limite total cabe no tempo em que os fronts desistem', () => {
    expect(LIMITES_SMTP.totalMs).toBeLessThan(TEMPO_LIMITE_DO_CLIENTE)
  })
})
