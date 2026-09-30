import { inflateRawSync } from 'node:zlib'
import type { Prisma } from '@kgb/db'
import * as XLSX from 'xlsx'
import type { UsuarioSessao } from '../contexto'
import { prisma } from '../db'
import { ErroDominio } from '../dominio/acionamento'
import { dataSP } from '../dominio/datas'
import { corDoPrestador } from '../dominio/documentos'
import {
  CABECALHO_PLANILHA,
  decodificarTexto,
  detectarSeparador,
  LARGURAS_EXPORTACAO,
  LIMITE_DESCOMPACTADO,
  LINHA_MODELO,
  linhasDeExportacao,
  mapearTabelaComColunas,
  montarPrevia,
  NOME_MODELO,
  nomeDaExportacao,
  TAMANHO_MAXIMO_PLANILHA,
  type Celula,
  type Campo,
  type LinhaLida,
  type Previa,
} from '../dominio/planilha'
import { ErroHttp } from '../erros'

const ehZip = (b: Uint8Array) => b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04
const ehOle = (b: Uint8Array) => b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0
/** `.xlsx` (ZIP) ou `.xls` (OLE2) vão direto ao SheetJS; o resto é lido como CSV ou TSV. */
const ehBinario = (b: Uint8Array) => ehZip(b) || ehOle(b)

/**
 * Se o ZIP passa de `limite` bytes descompactado. Percorre as entradas como o SheetJS (o fim do
 * diretório central, cada entrada dele e o cabeçalho local para onde ela aponta) e descompacta
 * cada uma até o fim do fluxo, com teto no que falta: não crê nos tamanhos declarados, que um
 * arquivo malicioso falseia, e conta de novo as entradas que repetem os mesmos dados. Estrutura
 * que não se lê fica para o SheetJS recusar.
 */
export function passaDoLimiteDescompactado(bytes: Uint8Array, limite: number): boolean {
  const visao = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const u16 = (i: number) => (i >= 0 && i + 2 <= bytes.length ? visao.getUint16(i, true) : 0)
  const u32 = (i: number) => (i >= 0 && i + 4 <= bytes.length ? visao.getUint32(i, true) : 0)
  let fim = bytes.length - 4
  while (fim >= 0 && u32(fim) !== 0x06054b50) fim--
  if (fim < 0) return false
  const entradas = u16(fim + 8)
  let central = u32(fim + 16)
  let total = 0
  for (let n = 0; n < entradas; n++) {
    if (u32(central) !== 0x02014b50) return false
    const local = u32(central + 42)
    central += 46 + u16(central + 28) + u16(central + 30) + u16(central + 32)
    if (u32(local) !== 0x04034b50) return false
    const inicio = local + 30 + u16(local + 26) + u16(local + 28)
    if (u16(local + 8) !== 8) {
      // Guardada sem compressão: ocupa o que declara, dentro do próprio arquivo.
      total += Math.min(u32(local + 18), Math.max(bytes.length - inicio, 0))
    } else {
      try {
        const dados = inflateRawSync(bytes.subarray(inicio), {
          maxOutputLength: limite - total + 1,
        })
        total += dados.length
      } catch (e) {
        if ((e as { code?: unknown }).code === 'ERR_BUFFER_TOO_LARGE') return true
        return false
      }
    }
    if (total > limite) return true
  }
  return false
}

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
 * Lê a primeira aba de um .xlsx, .xls, .csv ou .tsv. O texto é decodificado aqui (BOM, UTF-8,
 * UTF-16 ou Windows-1252), com o separador detectado (`,`, `;` ou tabulação), e lido só como texto.
 */
export function lerPlanilha(bytes: Uint8Array): LinhaLida[] {
  return lerPlanilhaComColunas(bytes).linhas
}

/**
 * Como `lerPlanilha`, dizendo também quais campos o cabeçalho trouxe. Um .xlsx que passa do limite
 * descompactado é recusado antes do SheetJS, que descompacta tudo em memória.
 */
export function lerPlanilhaComColunas(bytes: Uint8Array) {
  if (ehZip(bytes) && passaDoLimiteDescompactado(bytes, LIMITE_DESCOMPACTADO)) {
    throw new ErroHttp(413, 'planilha_grande', 'A planilha passa de 50 MB descompactada')
  }
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
  return mapearTabelaComColunas(dados.map((linha) => linha?.map(valorDaCelula)))
}

/** Um .xlsx com a aba "Credenciados", todas as células como texto. */
export function gerarXlsx(
  linhas: readonly (readonly string[])[],
  larguras?: readonly number[],
): Uint8Array<ArrayBuffer> {
  const aba = XLSX.utils.aoa_to_sheet(linhas.map((l) => [...l]))
  if (larguras) aba['!cols'] = larguras.map((wch) => ({ wch }))
  const livro = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(livro, aba, 'Credenciados')
  return new Uint8Array(
    XLSX.write(livro, { type: 'buffer', bookType: 'xlsx', compression: true }) as Buffer,
  )
}

type Db = Prisma.TransactionClient | typeof prisma

/** O arquivo enviado no multipart, com o limite de 5 MB. */
async function lerArquivo(arquivo: unknown) {
  if (!(arquivo instanceof File)) {
    throw new ErroDominio('arquivo_obrigatorio', 'Envie o arquivo da planilha')
  }
  if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) {
    throw new ErroHttp(413, 'planilha_grande', 'A planilha passa de 5 MB')
  }
  const { linhas, presentes } = lerPlanilhaComColunas(new Uint8Array(await arquivo.arrayBuffer()))
  return { nome: arquivo.name, linhas, presentes }
}

/** Os não excluídos na ordem de cadastro (a ordem dos ausentes e da exportação). */
const ORDEM_DE_CADASTRO = [
  { criadoEm: 'asc' },
  { id: 'asc' },
] satisfies Prisma.PrestadorOrderByWithRelationInput[]

async function previaNoBanco(
  db: Db,
  linhas: readonly LinhaLida[],
  presentes: ReadonlySet<Campo>,
): Promise<Previa> {
  const [existentes, tipos] = await Promise.all([
    db.prestador.findMany({
      where: { excluidoEm: null },
      orderBy: ORDEM_DE_CADASTRO,
      select: { id: true, nome: true, documento: true, status: true },
    }),
    db.tipoDemanda.findMany({ where: { excluidoEm: null }, select: { id: true, nome: true } }),
  ])
  return montarPrevia(linhas, existentes, tipos, presentes)
}

export type PreviaPlanilha = Omit<Previa, 'gravacoes'>

/** A conferência: lê o arquivo e calcula os selos, o resumo e os ausentes, sem gravar nada. */
export async function previaDaPlanilha(arquivo: unknown): Promise<PreviaPlanilha> {
  const { linhas, presentes } = await lerArquivo(arquivo)
  const {
    linhas: selos,
    resumo,
    ausentes,
    novosComEmail,
  } = await previaNoBanco(prisma, linhas, presentes)
  return { linhas: selos, resumo, ausentes, novosComEmail }
}

export interface ResultadoImportacao {
  novos: number
  atualizados: number
  desativados: number
}

const dataPura = (iso: string) => new Date(`${iso}T00:00:00Z`)
const ehDuplicado = (e: unknown) => (e as { code?: unknown } | null)?.code === 'P2002'

/**
 * Recalcula a prévia e aplica tudo numa transação: cria os novos (cor pela posição do cadastro,
 * hoje ou a data da planilha), sobrescreve os atualizados (cor e, sem data válida, a data de
 * credenciamento ficam), desativa os ausentes se pedido e grava a auditoria.
 */
export async function importarPlanilha(
  arquivo: unknown,
  opcoes: { desativarAusentes: boolean; autor: UsuarioSessao },
): Promise<ResultadoImportacao> {
  const { nome, linhas, presentes } = await lerArquivo(arquivo)
  try {
    return await prisma.$transaction(
      async (tx) => {
        // Uma importação por vez: a segunda espera e recalcula sobre o resultado da primeira.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('importacao_planilha'))`
        const previa = await previaNoBanco(tx, linhas, presentes)
        const { novos, atualizados, erros } = previa.resumo
        if (novos + atualizados === 0) {
          throw new ErroDominio(
            'planilha_sem_validas',
            'Nenhuma linha da planilha pode ser importada',
          )
        }
        const hoje = dataPura(dataSP(new Date()))
        let posicao = await tx.prestador.count()
        const vinculos: Prisma.PrestadorEspecialidadeCreateManyInput[] = []
        const atualizadosIds: string[] = []
        for (const g of previa.gravacoes) {
          const { especialidades, credenciadoDesde, ...campos } = g.dados
          let id: string
          if (g.acao === 'novo') {
            const criado = await tx.prestador.create({
              data: {
                ...campos,
                cor: corDoPrestador(posicao++),
                credenciadoDesde: credenciadoDesde ? dataPura(credenciadoDesde) : hoje,
              },
              select: { id: true },
            })
            id = criado.id
          } else {
            id = g.id
            if (g.dados.especialidades) atualizadosIds.push(id)
            await tx.prestador.update({
              where: { id },
              data: {
                ...campos,
                ...(credenciadoDesde ? { credenciadoDesde: dataPura(credenciadoDesde) } : {}),
              },
            })
          }
          especialidades?.forEach((tipoId, ordem) =>
            vinculos.push({ prestadorId: id, tipoId, ordem }),
          )
        }
        // Sem a coluna de especialidades na planilha, os vínculos gravados ficam como estão.
        await tx.prestadorEspecialidade.deleteMany({
          where: { prestadorId: { in: atualizadosIds } },
        })
        await tx.prestadorEspecialidade.createMany({ data: vinculos })
        const desativados =
          opcoes.desativarAusentes && previa.ausentes.length
            ? (
                await tx.prestador.updateMany({
                  where: { id: { in: previa.ausentes.map((a) => a.id) } },
                  data: { status: 'inativo' },
                })
              ).count
            : 0
        const resultado = { novos, atualizados, desativados }
        await tx.importacaoPlanilha.create({
          data: {
            autorId: opcoes.autor.id,
            autorNome: opcoes.autor.nome,
            arquivo: nome,
            ...resultado,
            ignorados: erros,
          },
        })
        return resultado
      },
      { timeout: 60_000 },
    )
  } catch (e) {
    if (!ehDuplicado(e)) throw e
    throw new ErroDominio(
      'planilha_conflito',
      'Os cadastros mudaram durante a importação. Confira a planilha de novo.',
      409,
    )
  }
}

export interface ArquivoPlanilha {
  nome: string
  conteudo: Uint8Array<ArrayBuffer>
}

/** Exportação: os não excluídos na ordem de cadastro, com as especialidades não excluídas. */
export async function planilhaDeCredenciados(): Promise<ArquivoPlanilha> {
  const lista = await prisma.prestador.findMany({
    where: { excluidoEm: null },
    orderBy: ORDEM_DE_CADASTRO,
    include: {
      especialidades: {
        where: { tipo: { excluidoEm: null } },
        orderBy: { ordem: 'asc' },
        select: { tipo: { select: { nome: true } } },
      },
    },
  })
  const linhas = linhasDeExportacao(
    lista.map((p) => ({
      ...p,
      especialidades: p.especialidades.map((e) => e.tipo.nome),
      credenciadoDesde: p.credenciadoDesde.toISOString().slice(0, 10),
    })),
  )
  return {
    nome: nomeDaExportacao(dataSP(new Date())),
    conteudo: gerarXlsx([[...CABECALHO_PLANILHA], ...linhas], LARGURAS_EXPORTACAO),
  }
}

export const modeloDaPlanilha = (): ArquivoPlanilha => ({
  nome: NOME_MODELO,
  conteudo: gerarXlsx([[...CABECALHO_PLANILHA], LINHA_MODELO]),
})
