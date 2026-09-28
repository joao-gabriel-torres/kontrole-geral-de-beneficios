import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

/** Onde as fotos ficam guardadas. Hoje: disco local. Depois: S3/R2 com a mesma interface. */
export interface Armazenamento {
  salvar(chave: string, dados: Uint8Array, tipo: string): Promise<void>
  abrir(chave: string): Promise<Uint8Array | null>
  remover(chave: string): Promise<void>
}

export class ArmazenamentoDisco implements Armazenamento {
  private readonly pasta: string

  constructor(pasta: string) {
    this.pasta = resolve(pasta)
  }

  private caminho(chave: string): string {
    const alvo = resolve(this.pasta, chave)
    if (!alvo.startsWith(this.pasta + sep)) throw new Error(`Chave de arquivo inválida: ${chave}`)
    return alvo
  }

  async salvar(chave: string, dados: Uint8Array): Promise<void> {
    const alvo = this.caminho(chave)
    await mkdir(dirname(alvo), { recursive: true })
    await writeFile(alvo, dados)
  }

  async abrir(chave: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.caminho(chave)))
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw erro
    }
  }

  async remover(chave: string): Promise<void> {
    await rm(this.caminho(chave), { force: true })
  }
}
