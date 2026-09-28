import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { GEOMETRIA_ICONES, type NomeIcone } from './geometria'
import RussoIcone from './RussoIcone.vue'

describe('RussoIcone', () => {
  it('desenha o ícone do protótipo com traço 1.5 na cor atual', () => {
    const svg = mount(RussoIcone, { props: { nome: 'dashboard', tamanho: 20 } }).find('svg')
    expect(svg.attributes()).toMatchObject({
      width: '20',
      height: '20',
      viewBox: '0 0 24 24',
      stroke: 'currentColor',
      'stroke-width': '1.5',
    })
    expect(svg.findAll('rect')).toHaveLength(4)
  })

  it('tem os 20 ícones de traço do protótipo', () => {
    expect(Object.keys(GEOMETRIA_ICONES)).toHaveLength(20)
  })
})

describe('geometria', () => {
  const pasta = join(import.meta.dirname, '../../../../docs/design/assets/icons')
  const normalizar = (svg: string) =>
    svg
      .replace(/<metadata>[\s\S]*<\/metadata>/, '')
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>\s*$/, '')
      .replace(/><\/(path|rect|circle)>/g, '/>')
      .trim()

  it.each(Object.keys(GEOMETRIA_ICONES) as NomeIcone[])(
    '%s é idêntico ao SVG do protótipo',
    (nome) => {
      const original = readFileSync(join(pasta, `${nome}.svg`), 'utf8')
      expect(GEOMETRIA_ICONES[nome]).toBe(normalizar(original))
    },
  )
})
