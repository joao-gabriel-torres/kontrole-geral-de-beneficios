import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../env'

const UMA_HORA = 3600

const chaveDeAssinatura = createHmac('sha256', env.BETTER_AUTH_SECRET)
  .update('kgb:arquivos:fotos')
  .digest()

export function assinar(fotoId: string, expira: number): string {
  return createHmac('sha256', chaveDeAssinatura).update(`${fotoId}.${expira}`).digest('hex')
}

/**
 * Caminho assinado para a foto. A validade termina numa hora "cheia", com pelo menos 1 hora de
 * folga, para a mesma URL servir de cache durante a hora.
 */
export function caminhoAssinadoFoto(fotoId: string, agoraMs = Date.now()): string {
  const expira = (Math.floor(agoraMs / 1000 / UMA_HORA) + 2) * UMA_HORA
  return `/api/arquivos/fotos/${encodeURIComponent(fotoId)}?exp=${expira}&sig=${assinar(fotoId, expira)}`
}

export function assinaturaValida(
  fotoId: string,
  exp: string,
  sig: string,
  agoraMs = Date.now(),
): boolean {
  const expira = Number(exp)
  if (!Number.isInteger(expira) || expira * 1000 < agoraMs || !/^[0-9a-f]{64}$/.test(sig))
    return false
  return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(assinar(fotoId, expira), 'hex'))
}
