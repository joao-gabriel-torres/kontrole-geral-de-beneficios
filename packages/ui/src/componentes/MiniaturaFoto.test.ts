import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import MiniaturaFoto from './MiniaturaFoto.vue'

describe('MiniaturaFoto', () => {
  it('mostra a imagem e o carimbo de horário', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 80, url: '/f.jpg', horario: '10:05' } })
    expect(m.find('img').attributes('src')).toBe('/f.jpg')
    expect(m.find('.carimbo').text()).toBe('10:05')
    expect(m.attributes('style')).toContain('width: 80px')
  })
  it('foto de exemplo: bloco colorido com o ícone de imagem', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 68, cor: '#8FA3A0', horario: '09:15' } })
    expect(m.find('img').exists()).toBe(false)
    expect(m.attributes('style')).toContain('background: rgb(143, 163, 160)')
    expect(m.find('.icone-placeholder svg').attributes('width')).toBe('20')
  })
  it('no tamanho 64 o protótipo não mostra o ícone', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 64, cor: '#8FA3A0', horario: '09:15' } })
    expect(m.find('.icone-placeholder').exists()).toBe(false)
  })
  it('sem url e sem cor, usa o bloco neutro', () => {
    const m = mount(MiniaturaFoto, { props: { tamanho: 68, horario: '09:15' } })
    expect(m.attributes('style')).toContain('background: rgb(143, 163, 160)')
  })
  it('removível: mostra o X e avisa ao remover', async () => {
    const m = mount(MiniaturaFoto, {
      props: { tamanho: 68, cor: '#8FA3A0', horario: '09:15', removivel: true },
    })
    await m.find('button[aria-label="Remover foto"]').trigger('click')
    expect(m.emitted('remover')).toHaveLength(1)
  })
})
