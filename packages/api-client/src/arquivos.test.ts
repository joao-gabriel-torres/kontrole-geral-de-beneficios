import { describe, expect, it } from 'vitest'
import { formularioFoto, formularioInviabilidade, resolverUrl } from './arquivos'

describe('resolverUrl', () => {
  it('prefixa a base da API nos caminhos assinados', () => {
    expect(resolverUrl('http://10.0.0.5:3000', '/api/arquivos/fotos/f?exp=1&sig=a')).toBe(
      'http://10.0.0.5:3000/api/arquivos/fotos/f?exp=1&sig=a',
    )
    expect(resolverUrl('http://api.teste/', '/api/x')).toBe('http://api.teste/api/x')
  })
  it('mantém URL absoluta e devolve null para foto de exemplo', () => {
    expect(resolverUrl('http://api', 'https://cdn/x.jpg')).toBe('https://cdn/x.jpg')
    expect(resolverUrl('http://api', null)).toBeNull()
  })
})

describe('formulários multipart', () => {
  it('monta a foto com contexto, etapa e horário', () => {
    const f = formularioFoto({
      arquivo: new Blob(['x'], { type: 'image/jpeg' }),
      contexto: 'etapa',
      etapaId: 'e1',
      tiradaEm: '2026-09-28T10:00:00-03:00',
    })
    expect(f.get('contexto')).toBe('etapa')
    expect(f.get('etapaId')).toBe('e1')
    expect(f.get('tiradaEm')).toBe('2026-09-28T10:00:00-03:00')
    expect(f.get('arquivo')).toBeInstanceOf(Blob)
  })
  it('foto da conclusão não leva etapa', () => {
    const f = formularioFoto({ arquivo: new Blob(['x']), contexto: 'conclusao' })
    expect(f.has('etapaId')).toBe(false)
  })
  it('monta a inviabilidade com várias fotos', () => {
    const f = formularioInviabilidade({
      comentario: 'Sem acesso',
      arquivos: [new Blob(['a']), new Blob(['b'])],
    })
    expect(f.get('comentario')).toBe('Sem acesso')
    expect(f.getAll('arquivos')).toHaveLength(2)
  })
})
