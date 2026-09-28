import { codigoAcionamento, type Prisma } from '@kgb/db'
import { caminhoAssinadoFoto } from '../arquivos/assinatura'
import type { Regras } from '../dominio/acionamento'
import { horarioSP } from '../dominio/datas'
import type { DetalheAcionamento, Foto, ResumoAcionamento } from '../schemas'

export const PREFIXO_PLACEHOLDER = 'placeholder:'

export const incluirResumo = {
  prestador: { select: { id: true, nome: true, cor: true } },
  demandas: {
    orderBy: { ordem: 'asc' },
    select: { tipoNome: true, cor: true, etapas: { select: { feita: true } } },
  },
  eventos: {
    where: { tipo: { in: ['enviado', 'inviabilidade_enviada'] } },
    orderBy: { em: 'desc' },
    take: 1,
    select: { em: true },
  },
} satisfies Prisma.AcionamentoInclude

export const incluirDetalhe = {
  prestador: { select: { id: true, nome: true, cor: true } },
  demandas: {
    orderBy: { ordem: 'asc' },
    include: {
      etapas: { orderBy: { ordem: 'asc' }, include: { fotos: { orderBy: { tiradaEm: 'asc' } } } },
    },
  },
  fotos: {
    where: { contexto: { in: ['conclusao', 'inviabilidade'] } },
    orderBy: { tiradaEm: 'asc' },
  },
  revisoes: { orderBy: { em: 'asc' } },
  eventos: { orderBy: { em: 'asc' } },
} satisfies Prisma.AcionamentoInclude

export type AcionamentoResumo = Prisma.AcionamentoGetPayload<{ include: typeof incluirResumo }>
export type AcionamentoDetalhe = Prisma.AcionamentoGetPayload<{ include: typeof incluirDetalhe }>

const dataIso = (d: Date) => d.toISOString().slice(0, 10)

export function paraFoto(
  f: { id: string; storageKey: string; tiradaEm: Date },
  agora = Date.now(),
): Foto {
  const placeholder = f.storageKey.startsWith(PREFIXO_PLACEHOLDER)
  return {
    id: f.id,
    url: placeholder ? null : caminhoAssinadoFoto(f.id, agora),
    cor: placeholder ? f.storageKey.slice(PREFIXO_PLACEHOLDER.length) : null,
    horario: horarioSP(f.tiradaEm),
    tiradaEm: f.tiradaEm.toISOString(),
  }
}

function camposBase(
  a: Omit<AcionamentoResumo, 'demandas' | 'eventos'>,
  demandas: readonly { tipoNome: string; cor: string; etapas: readonly { feita: boolean }[] }[],
  ultimoEnvio: Date | undefined,
): ResumoAcionamento {
  const etapas = demandas.flatMap((d) => d.etapas)
  return {
    id: a.id,
    codigo: codigoAcionamento(a.numero),
    titulo: a.titulo,
    cliente: a.cliente,
    endereco: a.endereco,
    data: dataIso(a.data),
    inicio: a.inicio,
    fim: a.fim,
    status: a.status,
    inviavel: a.inviavel,
    prestador: a.prestador,
    tipos: demandas.map((d) => ({ nome: d.tipoNome, cor: d.cor })),
    etapas: { feitas: etapas.filter((e) => e.feita).length, total: etapas.length },
    ultimoEnvioEm: ultimoEnvio?.toISOString() ?? null,
  }
}

export function paraResumo(a: AcionamentoResumo): ResumoAcionamento {
  return camposBase(a, a.demandas, a.eventos[0]?.em)
}

function motivoDe(dados: Prisma.JsonValue | null): string | null {
  if (
    dados &&
    typeof dados === 'object' &&
    !Array.isArray(dados) &&
    typeof dados.motivo === 'string'
  ) {
    return dados.motivo
  }
  return null
}

export function paraDetalhe(
  a: AcionamentoDetalhe,
  regras: Regras,
  agora = Date.now(),
): DetalheAcionamento {
  const envios = a.eventos.filter((e) => e.tipo === 'enviado' || e.tipo === 'inviabilidade_enviada')
  const foto = (f: Parameters<typeof paraFoto>[0]) => paraFoto(f, agora)
  return {
    ...camposBase(a, a.demandas, envios.at(-1)?.em),
    criadoEm: a.criadoEm.toISOString(),
    iniciadoEm: a.iniciadoEm?.toISOString() ?? null,
    comentarioConclusao: a.comentarioConclusao,
    regras,
    demandas: a.demandas.map((d) => ({
      id: d.id,
      tipoNome: d.tipoNome,
      cor: d.cor,
      etapas: d.etapas.map((e) => ({
        id: e.id,
        texto: e.texto,
        feita: e.feita,
        comentario: e.comentario,
        fotos: e.fotos.map(foto),
      })),
    })),
    fotosConclusao: a.fotos.filter((f) => f.contexto === 'conclusao').map(foto),
    inviabilidade: a.inviavel
      ? {
          comentario: a.inviabilidadeComentario ?? '',
          fotos: a.fotos.filter((f) => f.contexto === 'inviabilidade').map(foto),
        }
      : null,
    revisoes: a.revisoes.map((r) => ({
      decisao: r.decisao,
      motivo: r.motivo,
      em: r.em.toISOString(),
    })),
    eventos: a.eventos.map((e) => ({
      tipo: e.tipo,
      em: e.em.toISOString(),
      motivo: motivoDe(e.dados),
    })),
  }
}
