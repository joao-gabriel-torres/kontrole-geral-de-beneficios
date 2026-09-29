import type { Correio, MensagemEmail } from './tipos'

export interface CorreioEmMemoria extends Correio {
  readonly enviados: MensagemEmail[]
}

/** Guarda os e-mails numa lista, para os testes lerem (use com `trocarCorreio`). */
export function criarCorreioEmMemoria(): CorreioEmMemoria {
  const enviados: MensagemEmail[] = []
  return {
    enviados,
    async enviar(mensagem) {
      enviados.push(mensagem)
    },
  }
}
