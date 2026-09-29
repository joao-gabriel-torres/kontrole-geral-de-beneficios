import { resolverUrl, type Foto } from '@kgb/api-client'
import { BASE_API } from '../../api'

/** A foto real vem com caminho assinado relativo à API; a de exemplo não tem URL (bloco colorido). */
export function urlFoto(foto: Pick<Foto, 'url'>): string | null {
  return resolverUrl(BASE_API, foto.url)
}
