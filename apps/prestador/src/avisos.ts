import { usarToast } from '@kgb/ui'

/** Toast único do app: fica no layout, então sobrevive à troca de tela. */
export const avisos = usarToast()

export function avisar(texto: string): void {
  avisos.mostrar(texto)
}
