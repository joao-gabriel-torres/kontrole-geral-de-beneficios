import { describe, expect, it } from 'vitest'
import { carregarToken, obterToken, salvarToken } from './token'

describe('token do aparelho', () => {
  it('guarda, recarrega e apaga o token', async () => {
    await salvarToken('abc')
    expect(obterToken()).toBe('abc')
    expect(await carregarToken()).toBe('abc')
    await salvarToken(null)
    expect(obterToken()).toBeNull()
    expect(await carregarToken()).toBeNull()
  })
})
