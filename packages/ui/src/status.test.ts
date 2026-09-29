import { describe, expect, it } from 'vitest'
import codigoPrototipo from '../../../docs/design/acionamentos-data.js?raw'
import { ESTILOS_STATUS, estiloStatus } from './status'

type EstiloPrototipo = { l: string; bg: string; fg: string }

function statusDoPrototipo(): Record<string, EstiloPrototipo> {
  const janela: { ACD?: { ST: Record<string, EstiloPrototipo> } } = {}
  new Function('window', codigoPrototipo)(janela)
  return janela.ACD!.ST
}

describe('estilos de status', () => {
  it('são idênticos à tabela do protótipo', () => {
    const prototipo = statusDoPrototipo()
    for (const [chave, estilo] of Object.entries(ESTILOS_STATUS)) {
      expect({ rotulo: estilo.rotulo, fundo: estilo.fundo, texto: estilo.texto }).toEqual({
        rotulo: prototipo[chave]!.l,
        fundo: prototipo[chave]!.bg,
        texto: prototipo[chave]!.fg,
      })
    }
  })

  it('aprovado + inviável vira "Inviável"', () => {
    expect(estiloStatus('aprovado', true).rotulo).toBe('Inviável')
  })

  it('aguardando + inviável vira "Inviabilidade em análise" com as cores de aguardando', () => {
    expect(estiloStatus('aguardando', true)).toEqual({
      rotulo: 'Inviabilidade em análise',
      fundo: '#FFEBDC',
      texto: '#B85200',
    })
  })
})
