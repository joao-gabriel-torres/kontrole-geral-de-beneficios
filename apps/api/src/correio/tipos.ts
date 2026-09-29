export interface MensagemEmail {
  para: string
  assunto: string
  /** Versão em texto puro, para quem não abre HTML. */
  texto: string
  html: string
}

/** Envio de e-mail: SMTP em produção, arquivo em desenvolvimento, memória nos testes. */
export interface Correio {
  enviar(mensagem: MensagemEmail): Promise<void>
}
