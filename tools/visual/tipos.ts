export type Modo = 'gw' | 'gm' | 'pa'

export interface Regiao {
  nome: string
  x: number
  y: number
  largura: number
  altura: number
}

/** Clique aplicado do mesmo jeito no protótipo e no app, em ordem, depois de abrir a tela. */
export interface Passo {
  clicar: string
  /** Como achar o alvo: botão pelo nome acessível (padrão), link ou texto exato. */
  papel?: 'button' | 'link' | 'text'
}

export interface Caso {
  nome: string
  modo: Modo
  /** Texto do botão de navegação que leva à tela no protótipo (vazio = tela inicial). */
  navegarPrototipo?: string
  app: 'gestor' | 'prestador'
  rota: string
  passos?: Passo[]
  regioes: Regiao[]
}

/** Área útil do app, igual à área do protótipo sem a barra do topo e sem a barra de status falsa. */
export const VIEWPORT_APP: Record<Modo, { width: number; height: number }> = {
  gw: { width: 1440, height: 844 },
  gm: { width: 375, height: 768 },
  pa: { width: 375, height: 768 },
}

/** A tela inteira do app (menos a faixa da barra de rolagem à direita). */
export function telaInteira(modo: Modo): Regiao {
  const { width, height } = VIEWPORT_APP[modo]
  return { nome: 'tela', x: 0, y: 0, largura: width - 8, altura: height }
}
