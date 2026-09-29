import * as XLSX from 'xlsx'
import { ErroDominio } from '../dominio/acionamento'
import {
  decodificarTexto,
  detectarSeparador,
  mapearTabela,
  type Celula,
  type LinhaLida,
} from '../dominio/planilha'

/** `.xlsx` (ZIP) ou `.xls` (OLE2) vão direto ao SheetJS; o resto é lido como CSV. */
const ehBinario = (b: Uint8Array) =>
  (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) ||
  (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0)

const doisDigitos = (n: number) => String(n).padStart(2, '0')

/** Célula de data do Excel (número com formato de data) vira AAAA-MM-DD pelo serial, sem fuso. */
function valorDaCelula(c: XLSX.CellObject | undefined): Celula {
  if (!c || c.t === 'e' || c.t === 'z') return ''
  if (c.t === 'n' && typeof c.z === 'string' && XLSX.SSF.is_date(c.z)) {
    const d = XLSX.SSF.parse_date_code(c.v as number)
    return `${d.y}-${doisDigitos(d.m)}-${doisDigitos(d.d)}`
  }
  return c.v as Celula
}

/**
 * Lê a primeira aba de um .xlsx, .xls ou .csv. O CSV é decodificado aqui (BOM, UTF-8 ou
 * Windows-1252), com o separador detectado, e lido só como texto.
 */
export function lerPlanilha(bytes: Uint8Array): LinhaLida[] {
  let livro: XLSX.WorkBook
  try {
    if (ehBinario(bytes)) {
      livro = XLSX.read(bytes, { type: 'buffer', dense: true, cellNF: true })
    } else {
      const texto = decodificarTexto(bytes)
      livro = XLSX.read(texto, {
        type: 'string',
        raw: true,
        dense: true,
        FS: detectarSeparador(texto),
      })
    }
  } catch {
    throw new ErroDominio('planilha_ilegivel', 'Não foi possível ler o arquivo')
  }
  const aba = livro.Sheets[livro.SheetNames[0] ?? '']
  const dados = aba?.['!data'] ?? []
  // `map` mantém os buracos das linhas e células que não existem na aba.
  return mapearTabela(dados.map((linha) => linha?.map(valorDaCelula)))
}

/** Um .xlsx com a aba "Credenciados", todas as células como texto. */
export function gerarXlsx(
  linhas: readonly (readonly string[])[],
  larguras?: readonly number[],
): Uint8Array {
  const aba = XLSX.utils.aoa_to_sheet(linhas.map((l) => [...l]))
  if (larguras) aba['!cols'] = larguras.map((wch) => ({ wch }))
  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, aba, 'Credenciados')
  return new Uint8Array(
    XLSX.write(livro, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer,
  )
}
