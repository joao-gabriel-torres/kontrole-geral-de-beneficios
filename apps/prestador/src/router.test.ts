import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn() },
}))
const { decidirAcesso } = await import('./router')

const carlos = {
  id: 'u-p1',
  nome: 'Carlos',
  email: 'c@x',
  papel: 'prestador' as const,
  prestador: { id: 'p1', nome: 'Carlos' },
}
const rota = (fullPath: string, publica = false) => ({ fullPath, meta: { publica } })

describe('decidirAcesso (prestador)', () => {
  it('manda para o login sem sessão', () => {
    expect(decidirAcesso(null, rota('/agenda'))).toMatchObject({ tipo: 'redirecionar' })
  })
  it('recusa o papel gestor', () => {
    expect(decidirAcesso({ ...carlos, papel: 'gestor' }, rota('/inicio'))).toEqual({
      tipo: 'papel-errado',
    })
  })
  it('libera o prestador e tira do login quem já entrou', () => {
    expect(decidirAcesso(carlos, rota('/inicio'))).toEqual({ tipo: 'seguir' })
    expect(decidirAcesso(carlos, rota('/login', true))).toEqual({
      tipo: 'redirecionar',
      para: { name: 'inicio' },
    })
  })
})
