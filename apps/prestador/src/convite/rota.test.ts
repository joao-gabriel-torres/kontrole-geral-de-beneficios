import { describe, expect, it, vi } from 'vitest'

vi.mock('../api', () => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn(), resetPassword: vi.fn() },
}))
const { decidirAcesso, rotas } = await import('../router')

const carlos = {
  id: 'u-p1',
  nome: 'Carlos',
  email: 'c@x',
  papel: 'prestador' as const,
  prestador: { id: 'p1', nome: 'Carlos' },
}
const convite = rotas.find((r) => r.name === 'convite')

describe('rota do convite', () => {
  it('/convite é pública', () => {
    expect(convite?.path).toBe('/convite')
    expect(convite?.meta?.publica).toBe(true)
  })

  it('abre sem sessão e também com sessão (o link pode chegar a um aparelho já logado)', () => {
    const destino = { fullPath: '/convite?token=abc', meta: convite?.meta ?? {} }
    expect(decidirAcesso(null, destino)).toEqual({ tipo: 'seguir' })
    expect(decidirAcesso(carlos, destino)).toEqual({ tipo: 'seguir' })
  })

  it('o login continua tirando quem já entrou', () => {
    const login = rotas.find((r) => r.name === 'login')
    expect(decidirAcesso(carlos, { fullPath: '/login', meta: login?.meta ?? {} })).toEqual({
      tipo: 'redirecionar',
      para: { name: 'inicio' },
    })
  })
})
