import { describe, expect, it } from 'vitest'
import { cores } from './tokens'
import { opcoesVuetify } from './vuetify'

describe('opcoesVuetify', () => {
  it('texto branco sobre as cores cheias do tema, como nos botões do protótipo', () => {
    const tema = opcoesVuetify().theme?.themes?.russo?.colors ?? {}
    for (const cor of ['primary', 'secondary', 'error', 'success', 'warning', 'info']) {
      expect(tema[`on-${cor}`], `on-${cor}`).toBe(cores.branco)
    }
  })
})
