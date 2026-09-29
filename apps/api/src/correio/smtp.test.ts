import { createTransport } from 'nodemailer'
import { describe, expect, it } from 'vitest'
import { criarCorreioSmtp, type TransporteSmtp } from './smtp'

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
