export type Papel = 'gestor' | 'prestador'

export interface UsuarioSessao {
  id: string
  nome: string
  email: string
  papel: Papel
  prestadorId: string | null
}

export type Ambiente = { Variables: { usuario: UsuarioSessao | null } }
