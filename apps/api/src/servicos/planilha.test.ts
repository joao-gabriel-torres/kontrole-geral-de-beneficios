import { describe, expect, it } from 'vitest'
import * as XLSX from 'xlsx'
import { ErroDominio } from '../dominio/acionamento'
import { CABECALHO_PLANILHA, LARGURAS_EXPORTACAO, LINHA_MODELO } from '../dominio/planilha'
import { gerarXlsx, lerPlanilha } from './planilha'

const BOM = [0xef, 0xbb, 0xbf]
const utf8ComBom = (texto: string) => new Uint8Array([...BOM, ...new TextEncoder().encode(texto)])
/** Windows-1252 dos acentos do português (iguais ao Latin-1). */
const windows1252 = (texto: string) => Uint8Array.from(texto, (c) => c.charCodeAt(0))

function xlsxDe(linhas: unknown[][], preparar?: (aba: XLSX.WorkSheet) => void, tipo = 'xlsx') {
  const aba = XLSX.utils.aoa_to_sheet(linhas)
  preparar?.(aba)
  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, aba, 'Credenciados')
  return new Uint8Array(XLSX.write(livro, { type: 'buffer', bookType: tipo as XLSX.BookType }))
}

function erroDe(f: () => unknown): ErroDominio {
  try {
    f()
  } catch (e) {
    if (e instanceof ErroDominio) return e
    throw e
  }
  throw new Error('não lançou')
}

describe('lerPlanilha', () => {
  it('CSV UTF-8 com BOM, separado por vírgula, com aspas', () => {
    const [linha] = lerPlanilha(
      utf8ComBom(
        'Nome,CPF/CNPJ,Telefone,Especialidades\nJoão Pires,402.118.965-31,(11) 99402-1876,"Vazamento, Pintura"\n',
      ),
    )
    expect(linha).toMatchObject({
      nome: 'João Pires',
      documento: '402.118.965-31',
      telefone: '(11) 99402-1876',
      especialidades: 'Vazamento, Pintura',
    })
  })

  it('CSV do Excel em pt-BR: Windows-1252, separado por ponto e vírgula', () => {
    const [linha] = lerPlanilha(
      windows1252(
        'Nome;Região;Serviços;Situação\r\nJoão Pires;Centro;Pintura/Chaveiro;Inativo\r\n',
      ),
    )
    expect(linha).toMatchObject({
      nome: 'João Pires',
      regiao: 'Centro',
      especialidades: 'Pintura/Chaveiro',
      status: 'Inativo',
    })
  })

  it('CSV é lido como texto: o CPF com zero à esquerda continua com 11 dígitos', () => {
    const linhas = lerPlanilha(
      utf8ComBom('Nome,CPF,Credenciado desde\nA,01234567890,12/03/2024\nB,012.345.678-90,\n'),
    )
    expect(linhas.map((l) => [l.documento, l.credenciadoDesde])).toEqual([
      ['01234567890', '12/03/2024'],
      ['012.345.678-90', ''],
    ])
  })

  it('.xlsx: número vira texto com todos os dígitos e a célula de data vira AAAA-MM-DD', () => {
    const bytes = xlsxDe(
      [
        ['Nome', 'CNPJ', 'Credenciado desde'],
        ['Ana', 27415903000144, 45363],
      ],
      (aba) => {
        aba['C2']!.z = 'dd/mm/yyyy'
      },
    )
    expect(lerPlanilha(bytes)).toEqual([
      expect.objectContaining({
        nome: 'Ana',
        documento: '27415903000144',
        credenciadoDesde: '2024-03-12',
      }),
    ])
  })

  it('.xlsx: CPF digitado como número volta a ter os zeros à esquerda', () => {
    const bytes = xlsxDe([
      ['Nome', 'CPF'],
      ['Ana', 1234567890],
    ])
    expect(lerPlanilha(bytes)[0]).toMatchObject({ nome: 'Ana', documento: '01234567890' })
  })

  it('.xls (Excel 97–2003)', () => {
    const bytes = xlsxDe(
      [
        ['Nome', 'CPF'],
        ['Ana', '529.982.247-25'],
      ],
      undefined,
      'biff8',
    )
    expect(lerPlanilha(bytes)).toEqual([
      expect.objectContaining({ nome: 'Ana', documento: '529.982.247-25' }),
    ])
  })

  it('usa a primeira aba', () => {
    const livro = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([['Nome'], ['Primeira']]), 'A')
    XLSX.utils.book_append_sheet(livro, XLSX.utils.aoa_to_sheet([['Nome'], ['Segunda']]), 'B')
    const bytes = new Uint8Array(XLSX.write(livro, { type: 'buffer', bookType: 'xlsx' }))
    expect(lerPlanilha(bytes).map((l) => l.nome)).toEqual(['Primeira'])
  })

  it('arquivo que não abre: "Não foi possível ler o arquivo"', () => {
    const quebrado = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02])
    expect(erroDe(() => lerPlanilha(quebrado))).toMatchObject({
      codigo: 'planilha_ilegivel',
      message: 'Não foi possível ler o arquivo',
      status: 422,
    })
  })

  it('só o cabeçalho: "Não encontramos linhas na planilha"', () => {
    expect(erroDe(() => lerPlanilha(utf8ComBom('Nome,CPF\n')))).toMatchObject({
      codigo: 'planilha_vazia',
    })
  })
})

describe('gerarXlsx', () => {
  const reler = (bytes: Uint8Array) => XLSX.read(bytes, { type: 'buffer', cellStyles: true })

  it('aba "Credenciados" com todas as células como texto (vazias como "")', () => {
    const livro = reler(gerarXlsx([[...CABECALHO_PLANILHA], LINHA_MODELO]))
    expect(livro.SheetNames).toEqual(['Credenciados'])
    const aba = livro.Sheets['Credenciados']!
    expect(XLSX.utils.sheet_to_json(aba, { header: 1, defval: null })).toEqual([
      [...CABECALHO_PLANILHA],
      LINHA_MODELO,
    ])
    for (const endereco of ['A1', 'B2', 'H2']) expect(aba[endereco]).toMatchObject({ t: 's' })
    expect(aba['H2']!.v).toBe('')
    expect(aba['!cols']).toBeUndefined()
  })

  it('larguras das colunas quando pedidas', () => {
    const aba = reler(gerarXlsx([[...CABECALHO_PLANILHA]], LARGURAS_EXPORTACAO)).Sheets[
      'Credenciados'
    ]!
    expect(aba['!cols']?.map((c) => c.wch)).toEqual([...LARGURAS_EXPORTACAO])
  })
})
