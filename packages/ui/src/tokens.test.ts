import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { cores } from './tokens'

const kebab = (texto: string) => texto.replace(/[A-Z]/g, (letra) => `-${letra.toLowerCase()}`)

describe('tokens.css', () => {
  it('declara uma variável --kgb-* com o mesmo valor de cada cor de tokens.ts', () => {
    const css = readFileSync(join(import.meta.dirname, 'estilos', 'tokens.css'), 'utf8')
    for (const [nome, valor] of Object.entries(cores)) {
      expect(css.toLowerCase()).toContain(`--kgb-${kebab(nome)}: ${valor.toLowerCase()};`)
    }
  })
})
