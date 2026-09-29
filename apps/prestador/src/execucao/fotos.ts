import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

/** Fotos saem do app com no máximo 1600px no lado maior, em JPEG 0,8 (spec, seção Fotos). */
export const LADO_MAXIMO = 1600
export const QUALIDADE_JPEG = 0.8

export type OrigemFoto = 'camera' | 'galeria'

export interface FotoCapturada {
  arquivo: Blob
  /** Momento da captura, em ISO com o fuso do aparelho. */
  tiradaEm: string
}

export function dimensoesAlvo(
  largura: number,
  altura: number,
  maximo = LADO_MAXIMO,
): { largura: number; altura: number; fator: number } {
  const fator = Math.min(1, maximo / Math.max(largura, altura))
  return {
    largura: Math.max(1, Math.round(largura * fator)),
    altura: Math.max(1, Math.round(altura * fator)),
    fator,
  }
}

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** "2026-09-28T15:10:05-03:00": hora local do aparelho com o deslocamento do fuso. */
export function isoComFuso(d: Date): string {
  const deslocamento = -d.getTimezoneOffset()
  const sinal = deslocamento >= 0 ? '+' : '-'
  const abs = Math.abs(deslocamento)
  const data = `${d.getFullYear()}-${doisDigitos(d.getMonth() + 1)}-${doisDigitos(d.getDate())}`
  const hora = `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}:${doisDigitos(d.getSeconds())}`
  return `${data}T${hora}${sinal}${doisDigitos(Math.floor(abs / 60))}:${doisDigitos(abs % 60)}`
}

type Imagem = { largura: number; altura: number; fonte: CanvasImageSource; liberar: () => void }

async function decodificar(arquivo: Blob): Promise<Imagem> {
  try {
    const bitmap = await createImageBitmap(arquivo, { imageOrientation: 'from-image' })
    return {
      largura: bitmap.width,
      altura: bitmap.height,
      fonte: bitmap,
      liberar: () => bitmap.close(),
    }
  } catch {
    // Alguns WebViews não decodificam todos os formatos em createImageBitmap; a <img> decodifica.
    const url = URL.createObjectURL(arquivo)
    const img = new Image()
    img.src = url
    try {
      await img.decode()
    } catch (erro) {
      URL.revokeObjectURL(url)
      throw erro
    }
    return {
      largura: img.naturalWidth,
      altura: img.naturalHeight,
      fonte: img,
      liberar: () => URL.revokeObjectURL(url),
    }
  }
}

/** Redimensiona no canvas e converte para JPEG. */
export async function redimensionar(arquivo: Blob): Promise<Blob> {
  const imagem = await decodificar(arquivo)
  const canvas = document.createElement('canvas')
  try {
    const { largura, altura } = dimensoesAlvo(imagem.largura, imagem.altura)
    canvas.width = largura
    canvas.height = altura
    const contexto = canvas.getContext('2d')
    if (!contexto) throw new Error('Canvas indisponível')
    // O JPEG não tem transparência: sem um fundo, o transparente de um PNG sairia preto.
    contexto.fillStyle = '#fff'
    contexto.fillRect(0, 0, largura, altura)
    contexto.drawImage(imagem.fonte, 0, 0, largura, altura)
    return await new Promise<Blob>((pronto, falhou) =>
      canvas.toBlob(
        (blob) => (blob ? pronto(blob) : falhou(new Error('Falha ao gerar o JPEG'))),
        'image/jpeg',
        QUALIDADE_JPEG,
      ),
    )
  } finally {
    // Devolve a memória do canvas já: o WebView do iOS tem um teto de memória de canvas, e uma
    // sessão longa de fotos começaria a falhar esperando o coletor de lixo.
    canvas.width = 0
    canvas.height = 0
    imagem.liberar()
  }
}

/** Grava o momento da captura e só depois redimensiona (que pode levar alguns segundos). */
export async function prepararArquivo(
  arquivo: Blob,
  reduzir: (arquivo: Blob) => Promise<Blob> = redimensionar,
): Promise<FotoCapturada> {
  const tiradaEm = isoComFuso(new Date())
  return { arquivo: await reduzir(arquivo), tiradaEm }
}

/** O plugin rejeita com esta mensagem quando a pessoa fecha a câmera ou a galeria sem escolher. */
const cancelou = (erro: unknown) => /cancel/i.test(erro instanceof Error ? erro.message : '')

/** Câmera ou galeria nativas (Capacitor). `null` quando a pessoa desiste. */
export async function capturarNativa(origem: OrigemFoto): Promise<FotoCapturada | null> {
  try {
    const foto = await Camera.getPhoto({
      source: origem === 'camera' ? CameraSource.Camera : CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: 90,
      correctOrientation: true,
    })
    const tiradaEm = isoComFuso(new Date())
    if (!foto.webPath) return null
    const original = await (await fetch(foto.webPath)).blob()
    return { arquivo: await redimensionar(original), tiradaEm }
  } catch (erro) {
    if (cancelou(erro)) return null
    throw erro
  }
}
