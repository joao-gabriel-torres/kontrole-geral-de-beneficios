export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024

export type TipoImagem =
  | { mime: 'image/jpeg'; extensao: 'jpg' }
  | { mime: 'image/png'; extensao: 'png' }
  | { mime: 'image/webp'; extensao: 'webp' }
  | { mime: 'image/heic'; extensao: 'heic' }

const MARCAS_HEIC = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'])
const ascii = (b: Uint8Array, inicio: number, fim: number) =>
  String.fromCharCode(...b.subarray(inicio, fim))

/** Identifica a imagem pelos primeiros bytes (nunca pelo nome ou pelo Content-Type). */
export function detectarTipoImagem(b: Uint8Array): TipoImagem | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff)
    return { mime: 'image/jpeg', extensao: 'jpg' }
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) {
    return { mime: 'image/png', extensao: 'png' }
  }
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP')
    return { mime: 'image/webp', extensao: 'webp' }
  if (ascii(b, 4, 8) === 'ftyp' && MARCAS_HEIC.has(ascii(b, 8, 12)))
    return { mime: 'image/heic', extensao: 'heic' }
  return null
}

const MIME_POR_EXTENSAO: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

export function mimeDaChave(chave: string): string {
  return MIME_POR_EXTENSAO[chave.split('.').at(-1) ?? ''] ?? 'application/octet-stream'
}
