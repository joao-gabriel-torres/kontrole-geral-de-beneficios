import { deflateRawSync } from 'node:zlib'
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

function lancado(f: () => unknown): unknown {
  try {
    f()
  } catch (e) {
    return e
  }
  throw new Error('não lançou')
}

/**
 * Um ZIP mínimo (o formato do .xlsx) com uma entrada deflate de `descompactado` bytes, que declara
 * só 10 bytes descompactados; o diretório central pode repetir a entrada `copias` vezes.
 */
function zipInflado(descompactado: number, copias = 1): Uint8Array {
  const dados = deflateRawSync(Buffer.alloc(descompactado))
  const nome = Buffer.from('xl/worksheets/sheet1.xml')
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50, 0)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(dados.length, 18)
  local.writeUInt32LE(10, 22)
  local.writeUInt16LE(nome.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50, 0)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(dados.length, 20)
  central.writeUInt32LE(10, 24)
  central.writeUInt16LE(nome.length, 28)
  const diretorio = Buffer.concat(Array.from({ length: copias }, () => [central, nome]).flat())
  const fim = Buffer.alloc(22)
  fim.writeUInt32LE(0x06054b50, 0)
  fim.writeUInt16LE(copias, 8)
  fim.writeUInt16LE(copias, 10)
  fim.writeUInt32LE(diretorio.length, 12)
  fim.writeUInt32LE(local.length + nome.length + dados.length, 16)
  return new Uint8Array(Buffer.concat([local, nome, dados, diretorio, fim]))
}

describe('.xlsx inflado', () => {
  const MB = 1024 * 1024

  it('recusa antes da leitura quando passa de 50 MB descompactado, sem crer no tamanho declarado', () => {
    expect(lancado(() => lerPlanilha(zipInflado(50 * MB + 1)))).toMatchObject({
      status: 413,
      codigo: 'planilha_grande',
      message: 'A planilha passa de 50 MB descompactada',
    })
  })

  it('soma todas as entradas do diretório, mesmo as que repetem os mesmos dados', () => {
    expect(lancado(() => lerPlanilha(zipInflado(20 * MB, 3)))).toMatchObject({ status: 413 })
  })

  it('até 50 MB segue para a leitura', () => {
    expect(erroDe(() => lerPlanilha(zipInflado(50 * MB)))).toMatchObject({
      codigo: 'planilha_ilegivel',
    })
    const compactado = gerarXlsx([
      ['Nome', 'CPF'],
      ['Ana', '52998224725'],
    ])
    expect(lerPlanilha(compactado)).toEqual([expect.objectContaining({ nome: 'Ana' })])
  })
})

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

  it('"Texto Unicode" do Excel: UTF-16 com BOM, separado por tabulação', () => {
    const texto =
      'Nome\tCPF\tRegião\tEspecialidades\r\nJoão Pires\t012.345.678-90\tCentro\tPintura, Chaveiro\r\n'
    const utf16le = new Uint8Array(2 + texto.length * 2)
    utf16le.set([0xff, 0xfe])
    for (let i = 0; i < texto.length; i++) utf16le[2 + i * 2] = texto.charCodeAt(i)
    expect(lerPlanilha(utf16le)).toEqual([
      expect.objectContaining({
        nome: 'João Pires',
        documento: '012.345.678-90',
        regiao: 'Centro',
        especialidades: 'Pintura, Chaveiro',
      }),
    ])
  })

  it('TSV em UTF-8', () => {
    const [linha] = lerPlanilha(utf8ComBom('Nome\tCPF\nJoão Pires\t01234567890\n'))
    expect(linha).toMatchObject({ nome: 'João Pires', documento: '01234567890' })
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
