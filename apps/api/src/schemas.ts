import { z } from '@hono/zod-openapi'

export const STATUS = ['aberto', 'em_andamento', 'aguardando', 'reprovado', 'aprovado'] as const
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/

export const IdParam = z.object({ id: z.string().openapi({ param: { name: 'id', in: 'path' } }) })

export const FotoSchema = z
  .object({
    id: z.string(),
    url: z
      .string()
      .nullable()
      .openapi({ description: 'Caminho assinado; null nas fotos de exemplo' }),
    cor: z.string().nullable().openapi({ description: 'Cor do bloco das fotos de exemplo' }),
    horario: z.string(),
    tiradaEm: z.string(),
  })
  .openapi('Foto')

export const ResumoAcionamentoSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    titulo: z.string(),
    cliente: z.string(),
    endereco: z.string(),
    data: z.string(),
    inicio: z.string(),
    fim: z.string(),
    status: z.enum(STATUS),
    inviavel: z.boolean(),
    prestador: z.object({ id: z.string(), nome: z.string(), cor: z.string() }),
    tipos: z.array(z.object({ nome: z.string(), cor: z.string() })),
    etapas: z.object({ feitas: z.number().int(), total: z.number().int() }),
    ultimoEnvioEm: z.string().nullable(),
  })
  .openapi('ResumoAcionamento')

export const DetalheAcionamentoSchema = ResumoAcionamentoSchema.extend({
  criadoEm: z.string(),
  iniciadoEm: z.string().nullable(),
  comentarioConclusao: z.string().nullable(),
  regras: z.object({ photoMin: z.number().int(), requireAllSteps: z.boolean() }),
  demandas: z.array(
    z.object({
      id: z.string(),
      tipoNome: z.string(),
      cor: z.string(),
      etapas: z.array(
        z.object({
          id: z.string(),
          texto: z.string(),
          feita: z.boolean(),
          comentario: z.string().nullable(),
          fotos: z.array(FotoSchema),
        }),
      ),
    }),
  ),
  fotosConclusao: z.array(FotoSchema),
  inviabilidade: z.object({ comentario: z.string(), fotos: z.array(FotoSchema) }).nullable(),
  revisoes: z.array(
    z.object({
      decisao: z.enum(['aprovado', 'reprovado']),
      motivo: z.string().nullable(),
      em: z.string(),
    }),
  ),
  eventos: z.array(
    z.object({
      tipo: z.enum([
        'criado',
        'iniciado',
        'enviado',
        'inviabilidade_enviada',
        'aprovado',
        'reprovado',
      ]),
      em: z.string(),
      motivo: z.string().nullable(),
    }),
  ),
}).openapi('DetalheAcionamento')

export const TipoDemandaSchema = z
  .object({ id: z.string(), nome: z.string(), cor: z.string(), checklist: z.array(z.string()) })
  .openapi('TipoDemanda')

export const PrestadorOpcaoSchema = z
  .object({ id: z.string(), nome: z.string(), regiao: z.string().nullable(), cor: z.string() })
  .openapi('PrestadorOpcao')

export const FiltroListaSchema = z.object({
  status: z.enum(['aberto', 'em_andamento', 'aguardando', 'reprovado', 'finalizados']).optional(),
  busca: z.string().max(200).optional(),
})

export const NovoAcionamentoSchema = z
  .object({
    titulo: z.string().max(200),
    cliente: z.string().max(200),
    endereco: z.string().max(300),
    data: z.iso.date(),
    inicio: z.string().regex(HORARIO),
    fim: z.string().regex(HORARIO),
    tipoIds: z.array(z.string()).max(20),
    prestadorId: z.string(),
  })
  .openapi('NovoAcionamento')

export const RevisaoSchema = z
  .object({ decisao: z.enum(['aprovado', 'reprovado']), motivo: z.string().max(2000).optional() })
  .openapi('NovaRevisao')

export const EtapaPatchSchema = z
  .object({ feita: z.boolean().optional(), comentario: z.string().max(2000).optional() })
  .openapi('AtualizacaoEtapa')

export const ConclusaoPatchSchema = z
  .object({ comentario: z.string().max(2000) })
  .openapi('AtualizacaoConclusao')

export const FotoFormSchema = z.object({
  // opcional no schema: a ausência vira o erro de domínio `arquivo_obrigatorio` no serviço
  arquivo: z.any().optional().openapi({ type: 'string', format: 'binary' }),
  contexto: z.enum(['etapa', 'conclusao']),
  etapaId: z.string().optional(),
  tiradaEm: z.iso.datetime({ offset: true }).optional(),
})

export const InviavelFormSchema = z.object({
  comentario: z.string().max(2000),
  // opcional no schema: nenhuma foto vira o erro de domínio `fotos_insuficientes` no serviço
  arquivos: z
    .any()
    .optional()
    .openapi({ type: 'array', items: { type: 'string', format: 'binary' } }),
})

export const InicioPrestadorSchema = z
  .object({
    // `union` com null gera `anyOf: [$ref, null]`, que o openapi-typescript lê como `T | null`
    // (o `.nullable()` gera `allOf` com `type: ["object","null"]` e vira uma interseção inútil).
    proximo: z.union([ResumoAcionamentoSchema, z.null()]),
    hoje: z.array(ResumoAcionamentoSchema),
    metricas: z.object({
      hoje: z.number().int(),
      noMes: z.number().int(),
      aprovacao: z.object({ taxa: z.number().int(), dePrimeira: z.number().int().nullable() }),
      paraCorrigir: z.number().int(),
    }),
    rotaDoDia: z.array(z.string()),
  })
  .openapi('InicioPrestador')

export type ResumoAcionamento = z.infer<typeof ResumoAcionamentoSchema>
export type DetalheAcionamento = z.infer<typeof DetalheAcionamentoSchema>
export type Foto = z.infer<typeof FotoSchema>
