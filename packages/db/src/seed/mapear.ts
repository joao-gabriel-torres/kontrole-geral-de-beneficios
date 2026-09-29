import { randomUUID } from 'node:crypto'
import type { Prisma } from '../generated/prisma/client'
import type { AcionamentoPrototipo, DadosPrototipo, FotoPrototipo } from './prototipo'

export const SENHA_DEV = 'russo2026'
export const GESTORA_DEV = {
  id: 'u-renata',
  nome: 'Renata Silva',
  email: 'renata@russo.dev',
} as const
export const EMAIL_PRESTADOR_DEV = 'carlos@russo.dev'
const PRESTADOR_COM_LOGIN = 'p1'
const FUSO = '-03:00'

export interface UsuarioSeed {
  id: string
  nome: string
  email: string
  papel: 'gestor' | 'prestador'
  prestadorId: string | null
  comSenha: boolean
}

export interface DadosSeed {
  tipos: Prisma.TipoDemandaCreateManyInput[]
  prestadores: { dados: Prisma.PrestadorCreateManyInput; especialidades: string[] }[]
  usuarios: UsuarioSeed[]
  acionamentos: Prisma.AcionamentoCreateManyInput[]
  demandas: Prisma.DemandaCreateManyInput[]
  etapas: Prisma.EtapaCreateManyInput[]
  fotos: Prisma.FotoCreateManyInput[]
  revisoes: Prisma.RevisaoCreateManyInput[]
  eventos: Prisma.EventoAcionamentoCreateManyInput[]
}

const digitos = (texto: string) => texto.replace(/\D/g, '')
const dataPura = (iso: string) => new Date(`${iso}T00:00:00Z`)
const instante = (data: string, hora: string) => new Date(`${data}T${hora}:00${FUSO}`)
const idUsuarioPrestador = (prestadorId: string) => `u-${prestadorId}`

export function mapearDadosPrototipo(p: DadosPrototipo): DadosSeed {
  const dados: DadosSeed = {
    tipos: p.types.map((t) => ({ id: t.id, nome: t.name, cor: t.color, checklist: t.checklist })),
    prestadores: p.pros.map((x) => ({
      dados: {
        id: x.id,
        nome: x.name,
        documento: digitos(x.doc),
        telefone: digitos(x.phone),
        email: x.email || null,
        regiao: x.region || null,
        status: x.status,
        credenciadoDesde: dataPura(x.since),
        cor: x.color,
        excluidoEm: x.deleted ? new Date() : null,
      },
      especialidades: x.types,
    })),
    usuarios: [
      { ...GESTORA_DEV, papel: 'gestor', prestadorId: null, comSenha: true },
      ...p.pros.map((x) => ({
        id: idUsuarioPrestador(x.id),
        nome: x.name,
        email: x.id === PRESTADOR_COM_LOGIN ? EMAIL_PRESTADOR_DEV : x.email,
        papel: 'prestador' as const,
        prestadorId: x.id,
        comSenha: x.id === PRESTADOR_COM_LOGIN,
      })),
    ],
    acionamentos: [],
    demandas: [],
    etapas: [],
    fotos: [],
    revisoes: [],
    eventos: [],
  }
  for (const a of p.acs) mapearAcionamento(a, dados)
  return dados
}

function mapearAcionamento(a: AcionamentoPrototipo, d: DadosSeed) {
  const id = randomUUID()
  const autorPrestador = idUsuarioPrestador(a.pid)

  const foto = (
    f: FotoPrototipo,
    contexto: 'etapa' | 'conclusao' | 'inviabilidade',
    etapaId: string | null = null,
  ): Prisma.FotoCreateManyInput => ({
    id: randomUUID(),
    acionamentoId: id,
    contexto,
    etapaId,
    storageKey: `placeholder:${f.bg ?? '#8FA3A0'}`,
    tiradaEm: instante(a.date, f.stamp),
  })

  const evento = (
    tipo: Prisma.EventoAcionamentoCreateManyInput['tipo'],
    em: string,
    autorId: string,
    extra?: Prisma.InputJsonValue,
  ) => {
    d.eventos.push({
      id: randomUUID(),
      acionamentoId: id,
      tipo,
      em: new Date(em),
      autorId,
      ...(extra ? { dados: extra } : {}),
    })
  }

  d.acionamentos.push({
    id,
    numero: Number(a.code.replace('AC-', '')),
    titulo: a.title,
    cliente: a.client,
    endereco: a.address,
    data: dataPura(a.date),
    inicio: a.start,
    fim: a.end,
    prestadorId: a.pid,
    status: a.status,
    inviavel: a.inviavel,
    criadoEm: new Date(a.createdAt),
    iniciadoEm: a.startedAt ? new Date(a.startedAt) : null,
    comentarioConclusao: a.finalComment || null,
    inviabilidadeComentario: a.inv?.comment ?? null,
    criadoPorId: GESTORA_DEV.id,
  })

  a.demandas.forEach((demanda, i) => {
    const demandaId = randomUUID()
    d.demandas.push({
      id: demandaId,
      acionamentoId: id,
      tipoId: demanda.typeId,
      tipoNome: demanda.typeName,
      cor: demanda.color,
      ordem: i,
    })
    demanda.steps.forEach((etapa, j) => {
      const etapaId = randomUUID()
      d.etapas.push({
        id: etapaId,
        demandaId,
        ordem: j,
        texto: etapa.text,
        feita: etapa.done,
        comentario: etapa.comment || null,
      })
      for (const f of etapa.photos) d.fotos.push(foto(f, 'etapa', etapaId))
    })
  })
  for (const f of a.finalPhotos) d.fotos.push(foto(f, 'conclusao'))
  for (const f of a.inv?.photos ?? []) d.fotos.push(foto(f, 'inviabilidade'))

  evento('criado', a.createdAt, GESTORA_DEV.id)
  if (a.startedAt) evento('iniciado', a.startedAt, autorPrestador)
  a.subs.forEach((envio, i) => {
    const ultimo = i === a.subs.length - 1
    evento(a.inviavel && ultimo ? 'inviabilidade_enviada' : 'enviado', envio, autorPrestador)
    const revisao = a.reviews[i]
    if (!revisao) return
    const decisao = revisao.d === 'a' ? 'aprovado' : 'reprovado'
    d.revisoes.push({
      id: randomUUID(),
      acionamentoId: id,
      decisao,
      motivo: revisao.reason || null,
      em: new Date(revisao.at),
      gestorId: GESTORA_DEV.id,
    })
    evento(
      decisao,
      revisao.at,
      GESTORA_DEV.id,
      revisao.reason ? { motivo: revisao.reason } : undefined,
    )
  })
}
