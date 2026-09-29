import { describe, expect, it } from 'vitest'
import { assinar, assinaturaValida, caminhoAssinadoFoto } from './assinatura'

const partes = (caminho: string) => {
  const url = new URL(caminho, 'http://x')
  return {
    id: url.pathname.split('/').at(-1)!,
    exp: url.searchParams.get('exp')!,
    sig: url.searchParams.get('sig')!,
  }
}

describe('URL assinada de foto', () => {
  const agora = Date.parse('2026-09-28T13:10:00Z')

  it('gera um caminho que vale para aquela foto', () => {
    const caminho = caminhoAssinadoFoto('foto-1', agora)
    expect(caminho).toMatch(/^\/api\/arquivos\/fotos\/foto-1\?exp=\d+&sig=[0-9a-f]{64}$/)
    const { id, exp, sig } = partes(caminho)
    expect(assinaturaValida(id, exp, sig, agora)).toBe(true)
  })
  it('vale por pelo menos 1 hora e é estável dentro da mesma hora (bom para cache)', () => {
    const { exp } = partes(caminhoAssinadoFoto('foto-1', agora))
    expect(Number(exp) * 1000 - agora).toBeGreaterThanOrEqual(3600_000)
    expect(caminhoAssinadoFoto('foto-1', agora + 60_000)).toBe(caminhoAssinadoFoto('foto-1', agora))
  })
  it('recusa assinatura adulterada, de outra foto ou vencida', () => {
    const { exp, sig } = partes(caminhoAssinadoFoto('foto-1', agora))
    expect(
      assinaturaValida(
        'foto-1',
        exp,
        sig.replace(/.$/, (c) => (c === '0' ? '1' : '0')),
        agora,
      ),
    ).toBe(false)
    expect(assinaturaValida('foto-2', exp, sig, agora)).toBe(false)
    expect(assinaturaValida('foto-1', exp, sig, Number(exp) * 1000 + 1)).toBe(false)
    expect(assinaturaValida('foto-1', 'abc', sig, agora)).toBe(false)
    expect(assinaturaValida('foto-1', exp, 'xyz', agora)).toBe(false)
  })
  it('assinar é determinístico', () => {
    expect(assinar('f', 100)).toBe(assinar('f', 100))
    expect(assinar('f', 100)).not.toBe(assinar('f', 101))
  })
})
