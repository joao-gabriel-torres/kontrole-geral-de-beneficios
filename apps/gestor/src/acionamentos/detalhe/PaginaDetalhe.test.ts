import { describe, expect, it } from 'vitest'
import { montar } from '../../../test/montar'
import PaginaDetalhe from './PaginaDetalhe.vue'

describe('PaginaDetalhe (voltar)', () => {
  it('volta para Acionamentos quando veio da lista', async () => {
    const { tela } = await montar(PaginaDetalhe, { props: { id: 'a1', origem: 'acionamentos' } })
    const voltar = tela.find('a.voltar')
    expect(voltar.text()).toBe('Acionamentos')
    expect(voltar.attributes('href')).toBe('/acionamentos')
  })
  it('volta para Aprovações quando veio da fila', async () => {
    const { tela } = await montar(PaginaDetalhe, { props: { id: 'a1', origem: 'aprovacoes' } })
    expect(tela.find('a.voltar').text()).toBe('Aprovações')
    expect(tela.find('a.voltar').attributes('href')).toBe('/aprovacoes')
  })
})
