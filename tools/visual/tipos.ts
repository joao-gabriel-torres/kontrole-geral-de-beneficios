export type Modo = 'gw' | 'gm' | 'pa'

export interface Regiao {
  nome: string
  x: number
  y: number
  largura: number
  altura: number
}

/** Ação aplicada do mesmo jeito no protótipo e no app, em ordem, depois de abrir a tela. */
export type Passo =
  | {
      /** Clica no alvo achado pelo nome acessível: botão (padrão), link ou texto exato. */
      clicar: string
      papel?: 'button' | 'link' | 'text'
      /** Aceita nome que só começa com o texto: "Corrigir" acha "Corrigir 1" (contagens mudam). */
      inicio?: boolean
    }
  /** Preenche o campo achado pelo placeholder (ou, se não houver, pelo rótulo). */
  | { preencher: string; com: string }
  /** Anexa um arquivo de `tools/visual/fixtures/` ao primeiro campo de arquivo da tela. */
  | { anexar: string }
  /** Espera em ms, por exemplo até um toast sumir (toasts ficam fora da comparação). */
  | { esperar: number }

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
