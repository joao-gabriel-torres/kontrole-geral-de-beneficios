import { describe, expect, it, vi } from 'vitest'

vi.mock('./api', () => ({
  api: { GET: vi.fn() },
  auth: { signIn: { email: vi.fn() }, signOut: vi.fn() },
}))
const { decidirAcesso, destinoSeguro } = await import('./router')

const gestora = { id: 'u', nome: 'Renata', email: 'r@x', papel: 'gestor' as const, prestador: null }
const rota = (fullPath: string, publica = false) => ({ fullPath, meta: { publica } })

describe('decidirAcesso', () => {
  it('manda para o login guardando o destino', () => {
    expect(decidirAcesso(null, rota('/aprovacoes'))).toEqual({
      tipo: 'redirecionar',
      para: { name: 'login', query: { voltar: '/aprovacoes' } },
    })
  })
  it('deixa abrir o login sem sessão', () => {
    expect(decidirAcesso(null, rota('/login', true))).toEqual({ tipo: 'seguir' })
  })
  it('tira do login quem já está logado', () => {
    expect(decidirAcesso(gestora, rota('/login', true))).toEqual({
      tipo: 'redirecionar',
      para: { name: 'painel' },
    })
  })
  it('recusa o papel prestador', () => {
    expect(decidirAcesso({ ...gestora, papel: 'prestador' }, rota('/painel'))).toEqual({
      tipo: 'papel-errado',
    })
  })
  it('libera a gestora', () => {
    expect(decidirAcesso(gestora, rota('/painel'))).toEqual({ tipo: 'seguir' })
  })
})

describe('destinoSeguro', () => {
  it('aceita caminhos internos', () => {
    expect(destinoSeguro('/aprovacoes')).toBe('/aprovacoes')
  })
  it('recusa redirecionamento para outro site', () => {
    expect(destinoSeguro('//site-estranho.com')).toEqual({ name: 'painel' })
    expect(destinoSeguro('https://site-estranho.com')).toEqual({ name: 'painel' })
    expect(destinoSeguro(undefined)).toEqual({ name: 'painel' })
  })
})
