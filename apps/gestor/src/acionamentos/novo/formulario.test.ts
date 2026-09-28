import { describe, expect, it } from 'vitest'
import { PRESTADORES, TIPOS } from '../../../test/fixtures'
import {
  alternarTipo,
  corpoDoFormulario,
  formularioInicial,
  formularioValido,
  prestadorPadrao,
  previaChecklist,
  rotuloContagem,
  rotuloPrestador,
  type FormularioAcionamento,
} from './formulario'

const valido = (dados: Partial<FormularioAcionamento> = {}): FormularioAcionamento => ({
  ...formularioInicial('2026-09-28', PRESTADORES),
  titulo: 'Vazamento no banheiro social',
  tipoIds: ['t1'],
  cliente: 'Edifício Aurora',
  endereco: 'Rua Harmonia, 410 · Vila Madalena',
  ...dados,
})

describe('formulário do Novo acionamento', () => {
  it('abre com hoje, 09:00–11:00 e o Carlos (p1)', () => {
    expect(formularioInicial('2026-09-28', PRESTADORES)).toEqual({
      titulo: '',
      tipoIds: [],
      cliente: '',
      endereco: '',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      prestadorId: 'p1',
    })
  })
  it('sem o Carlos entre os ativos, escolhe o primeiro; sem prestadores, nenhum', () => {
    expect(prestadorPadrao(PRESTADORES.filter((p) => p.id !== 'p1'))).toBe('p2')
    expect(prestadorPadrao([])).toBe('')
  })
  it('é válido com título, tipo, cliente, endereço, data, início < fim e prestador', () => {
    expect(formularioValido(valido())).toBe(true)
  })
  it.each([
    ['título vazio', { titulo: '   ' }],
    ['sem tipo', { tipoIds: [] }],
    ['cliente vazio', { cliente: '' }],
    ['endereço vazio', { endereco: ' ' }],
    ['sem data', { data: '' }],
    ['início igual ao fim', { inicio: '11:00', fim: '11:00' }],
    ['início depois do fim', { inicio: '14:00', fim: '09:30' }],
    ['sem prestador', { prestadorId: '' }],
  ])('é inválido com %s', (_, dados) => {
    expect(formularioValido(valido(dados))).toBe(false)
  })
  it('liga e desliga um tipo, guardando a ordem de escolha', () => {
    expect(alternarTipo(['t1'], 't6')).toEqual(['t1', 't6'])
    expect(alternarTipo(['t1', 't6'], 't1')).toEqual(['t6'])
  })
  it('monta a prévia do checklist na ordem de escolha, com a contagem', () => {
    const previa = previaChecklist(TIPOS, ['t6', 't1'])
    expect(previa.map((t) => [t.nome, t.etapas.length])).toEqual([
      ['Reparo em gesso', 4],
      ['Vazamento', 5],
    ])
    expect(rotuloContagem(previa)).toBe('9 itens no checklist')
    expect(rotuloContagem([])).toBe('0 itens no checklist')
    expect(rotuloContagem(previaChecklist(TIPOS, ['t9']))).toBe('1 item no checklist')
  })
  it('rótulo do prestador: "Nome · Região", ou só o nome sem região', () => {
    expect(PRESTADORES.map(rotuloPrestador)).toEqual([
      'Ana Ribeiro · Zona Sul',
      'Carlos Mendes · Zona Oeste',
      'Pedro Lima',
    ])
  })
  it('manda os textos aparados para a API', () => {
    expect(
      corpoDoFormulario(
        valido({ titulo: '  Vazamento ', cliente: ' Aurora ', endereco: ' Rua A ' }),
      ),
    ).toEqual({
      titulo: 'Vazamento',
      cliente: 'Aurora',
      endereco: 'Rua A',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
  })
})
