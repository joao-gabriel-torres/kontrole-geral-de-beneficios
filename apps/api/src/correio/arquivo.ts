import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Correio, MensagemEmail } from './tipos'

/** Instante, um sufixo aleatório (dois e-mails no mesmo milissegundo) e o destinatário. */
function nomeDoArquivo(mensagem: MensagemEmail): string {
  const instante = new Date().toISOString().replace(/[:.]/g, '-')
  const sufixo = randomBytes(3).toString('hex')
  const destino = mensagem.para.toLowerCase().replace(/[^a-z0-9@._-]/g, '_')
  return `${instante}-${sufixo}-${destino}.html`
}

/**
 * Desenvolvimento, sem servidor de e-mail: grava cada e-mail como HTML na pasta e mostra no log
 * onde ficou e os links do texto (o do convite, por exemplo).
 */
export function criarCorreioDeArquivo(
  pasta: string,
  avisar: (linha: string) => void = console.info,
): Correio {
  return {
    async enviar(mensagem) {
      await mkdir(pasta, { recursive: true })
      const caminho = join(pasta, nomeDoArquivo(mensagem))
      await writeFile(caminho, mensagem.html, 'utf8')
      const links = mensagem.texto.match(/https?:\/\/\S+/g) ?? []
      avisar(
        [`[correio] "${mensagem.assunto}" para ${mensagem.para}: ${caminho}`, ...links].join(
          '\n  ',
        ),
      )
    },
  }
}
