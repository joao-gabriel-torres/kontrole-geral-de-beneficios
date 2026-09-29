import { describe, expect, it } from 'vitest'
import {
  avisoDeImportacao,
  NOME_MODELO,
  nomeDaExportacao,
  resumoDaPrevia,
  textoDosAusentes,
} from './textos'

describe('resumoDaPrevia', () => {
  it('novos e atualizados, com os erros só quando há', () => {
    expect(resumoDaPrevia({ novos: 2, atualizados: 3, erros: 3 })).toBe(
      '2 novos · 3 atualizados · 3 com erro (serão ignorados)',
    )
    expect(resumoDaPrevia({ novos: 0, atualizados: 6, erros: 0 })).toBe('0 novos · 6 atualizados')
  })
  it('no singular com 1', () => {
    expect(resumoDaPrevia({ novos: 1, atualizados: 1, erros: 1 })).toBe(
      '1 novo · 1 atualizado · 1 com erro (será ignorado)',
    )
  })
})

describe('textoDosAusentes', () => {
  it('um só', () => {
    expect(textoDosAusentes(['Carlos Mendes'])).toBe(
      '1 credenciado ativo não está na planilha: Carlos Mendes',
    )
  })
  it('vários, todos os nomes', () => {
    expect(textoDosAusentes(['João Pires', 'Marina Costa', 'Luciana Prado'])).toBe(
      '3 credenciados ativos não estão na planilha: João Pires, Marina Costa, Luciana Prado',
    )
  })
})

describe('avisoDeImportacao', () => {
  it('o toast do protótipo, no singular com 1', () => {
    expect(avisoDeImportacao({ novos: 2, atualizados: 3 })).toBe(
      'Planilha importada: 2 novos, 3 atualizados',
    )
    expect(avisoDeImportacao({ novos: 1, atualizados: 0 })).toBe(
      'Planilha importada: 1 novo, 0 atualizados',
    )
  })
})

describe('nomes dos arquivos', () => {
  it('a exportação leva a data de hoje em São Paulo', () => {
    expect(nomeDaExportacao(new Date('2026-09-29T12:00:00Z'))).toBe(
      'credenciados-russo-29-09-2026.xlsx',
    )
    // 01:30 em UTC ainda é dia 29 em São Paulo.
    expect(nomeDaExportacao(new Date('2026-09-30T01:30:00Z'))).toBe(
      'credenciados-russo-29-09-2026.xlsx',
    )
  })
  it('o modelo tem nome fixo', () => {
    expect(NOME_MODELO).toBe('modelo-credenciados-russo.xlsx')
  })
})
