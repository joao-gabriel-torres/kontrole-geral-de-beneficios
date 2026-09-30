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
  assinantes: Prisma.AssinanteCreateManyInput[]
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

/** Categorias dos tipos do protótipo (spec "Novo acionamento inteligente"). */
const CATEGORIAS: Record<string, string> = {
  Vazamento: 'Hidráulica',
  'Revisão elétrica': 'Elétrica',
  'Ponto de luz': 'Elétrica',
  'Troca de disjuntor': 'Elétrica',
  Pintura: 'Acabamento',
  'Reparo em gesso': 'Acabamento',
  'Limpeza de ar-condicionado': 'Climatização',
  Chaveiro: 'Segurança',
}

/** CEP plausível para a região de cada prestador (conferidos no ViaCEP em 30/09/2026). */
const CEPS_PRESTADORES: Record<string, string> = {
  p1: '05422001', // Zona Oeste — Rua dos Pinheiros, Pinheiros
  p2: '04010000', // Zona Sul — Rua Domingos de Morais, Vila Mariana
  p3: '01001000', // Centro — Praça da Sé
  p4: '05018000', // Zona Oeste — Rua Cayowaá, Perdizes
  p5: '02011000', // Zona Norte — Rua Voluntários da Pátria, Santana
  p6: '03071000', // Zona Leste — Rua Cesário Galero, Tatuapé
}

/** CEPs reais dos logradouros dos endereços do protótipo (conferidos no ViaCEP em 30/09/2026). */
const CEPS_POR_LOGRADOURO: Record<string, string> = {
  'Rua Augusta': '01304001', // Consolação, 700–1680 lado par
  'Rua Apinajés': '05017000', // Perdizes
  'Av. Faria Lima': '04538132', // Itaim Bibi
  'Rua Tupi': '01233001', // Santa Cecília, lado ímpar
  'Rua Bela Cintra': '01415002', // Consolação, 588–1240 lado par
  'Rua Frei Caneca': '01307001', // Consolação, até 879 lado ímpar
  'Rua Oscar Freire': '01426002', // Cerqueira César/Jardins, 610–1290 lado par
  'Rua Teodoro Sampaio': '05406050', // Pinheiros, 808–1150 lado par
  'Rua Cayowaá': '05018001', // Perdizes, 701–1459
}

/** CEP de recuo para logradouro fora do mapa (Praça da Sé, conferido). */
const CEP_PADRAO = '01001000'

/** "Rua Augusta, 1492 · Consolação" → logradouro, número e bairro separados. */
function separarEndereco(endereco: string): { logradouro: string; numero: string; bairro: string } {
  const [rua = endereco, bairro = ''] = endereco.split(' · ')
  const virgula = rua.lastIndexOf(', ')
  if (virgula === -1) return { logradouro: rua, numero: '', bairro }
  return { logradouro: rua.slice(0, virgula), numero: rua.slice(virgula + 2), bairro }
}

/** Um assinante ativo por cliente distinto, com o endereço do primeiro acionamento dele. */
function mapearAssinantes(p: DadosPrototipo): Prisma.AssinanteCreateManyInput[] {
  const assinantes: Prisma.AssinanteCreateManyInput[] = []
  const vistos = new Set<string>()
  for (const a of p.acs) {
    if (vistos.has(a.client)) continue
    vistos.add(a.client)
    const { logradouro, numero, bairro } = separarEndereco(a.address)
    assinantes.push({
      id: `a${assinantes.length + 1}`,
      nome: a.client,
      cep: CEPS_POR_LOGRADOURO[logradouro] ?? CEP_PADRAO,
      logradouro,
      numero,
      complemento: null,
      bairro,
      cidade: 'São Paulo',
      status: 'ativo',
    })
  }
  return assinantes
}

export function mapearDadosPrototipo(p: DadosPrototipo): DadosSeed {
  const dados: DadosSeed = {
    tipos: p.types.map((t) => ({
      id: t.id,
      nome: t.name,
      cor: t.color,
      categoria: CATEGORIAS[t.name] ?? null,
      checklist: t.checklist,
    })),
    prestadores: p.pros.map((x) => ({
      dados: {
        id: x.id,
        nome: x.name,
        documento: digitos(x.doc),
        telefone: digitos(x.phone),
        email: x.email || null,
        regiao: x.region || null,
        cep: CEPS_PRESTADORES[x.id] ?? null,
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
    assinantes: mapearAssinantes(p),
    acionamentos: [],
    demandas: [],
    etapas: [],
    fotos: [],
    revisoes: [],
    eventos: [],
  }
  const assinantePorCliente = new Map(dados.assinantes.map((a) => [a.nome, a.id!]))
  for (const a of p.acs) mapearAcionamento(a, dados, assinantePorCliente)
  return dados
}

function mapearAcionamento(
  a: AcionamentoPrototipo,
  d: DadosSeed,
  assinantePorCliente: Map<string, string>,
) {
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
    assinanteId: assinantePorCliente.get(a.client) ?? null,
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
