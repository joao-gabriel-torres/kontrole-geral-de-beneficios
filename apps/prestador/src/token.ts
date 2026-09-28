import { Preferences } from '@capacitor/preferences'

const CHAVE = 'kgb.token'
let cache: string | null = null

export async function carregarToken(): Promise<string | null> {
  cache = (await Preferences.get({ key: CHAVE })).value
  return cache
}

export function obterToken(): string | null {
  return cache
}

export async function salvarToken(token: string | null): Promise<void> {
  cache = token
  if (token) await Preferences.set({ key: CHAVE, value: token })
  else await Preferences.remove({ key: CHAVE })
}
