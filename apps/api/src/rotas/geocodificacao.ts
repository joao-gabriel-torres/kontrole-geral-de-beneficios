import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { TAMANHO_MAXIMO_ENDERECO } from '../dominio/localizacao'
import { corpoErro, respostaErro } from '../erros'
import { exigePapel } from '../middlewares/acesso'
import {
  buscarEnderecoDoPonto,
  GeocodificacaoIndisponivel,
  localizarEndereco,
} from '../servicos/geocodificacao'

export const LocalizacaoSchema = z
  .object({
    latitude: z.number().openapi({ description: 'Graus decimais, 6 casas' }),
    longitude: z.number().openapi({ description: 'Graus decimais, 6 casas' }),
  })
  .openapi('Localizacao')

const rotaLocalizar = createRoute({
  method: 'get',
  path: '/api/geocodificacao',
  tags: ['Acionamentos'],
  summary: 'Posição de um endereço no mapa (Nominatim), para conferir no Novo acionamento',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: {
    query: z.object({
      endereco: z
        .string()
        .optional()
        .openapi({
          description: `No formato do sistema ("Rua Harmonia, 410 · Vila Madalena", com " · Osasco - SP" no fim fora da capital); até ${TAMANHO_MAXIMO_ENDERECO} caracteres`,
        }),
    }),
  },
  responses: {
    200: {
      description: 'Posição do primeiro resultado',
      content: { 'application/json': { schema: LocalizacaoSchema } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    404: respostaErro('Endereço não encontrado no mapa (localizacao_nao_encontrada)'),
    422: respostaErro('Endereço vazio ou longo demais'),
    502: respostaErro('O serviço de mapas não respondeu (geocodificacao_indisponivel)'),
  },
})

export const EnderecoDoPontoSchema = z
  .object({
    cep: z.string().nullable().openapi({ description: 'Só os 8 dígitos; null quando não há' }),
    logradouro: z.string().nullable(),
    numero: z.string().nullable(),
    bairro: z.string().nullable(),
    cidade: z.string().nullable(),
    uf: z.string().nullable().openapi({ description: 'Sigla ("SP")' }),
  })
  .openapi('EnderecoDoPonto')

const coordenada = (nome: string, exemplo: string) =>
  z
    .string()
    .max(40)
    .optional()
    .openapi({ description: `${nome} em graus decimais, com ponto ("${exemplo}")` })

const rotaEnderecoDoPonto = createRoute({
  method: 'get',
  path: '/api/geocodificacao/reversa',
  tags: ['Acionamentos'],
  summary:
    'Endereço de um ponto do mapa (Nominatim reverse), para o pino movido no Novo acionamento',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: {
    query: z.object({
      latitude: coordenada('Latitude', '-23.557'),
      longitude: coordenada('Longitude', '-46.6905'),
    }),
  },
  responses: {
    200: {
      description: 'O endereço mais próximo do ponto; null no que o mapa não sabe',
      content: { 'application/json': { schema: EnderecoDoPontoSchema } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    404: respostaErro('Nenhum endereço no ponto (localizacao_nao_encontrada)'),
    422: respostaErro('Ponto ausente, que não é número ou fora do Brasil (localizacao_invalida)'),
    502: respostaErro('O serviço de mapas não respondeu (geocodificacao_indisponivel)'),
  },
})

/** Geocodificação do mapa do Novo acionamento: a posição do endereço e o endereço do ponto. */
export const rotasGeocodificacao = new OpenAPIHono<Ambiente>()
  .openapi(rotaLocalizar, async (c) => {
    try {
      return c.json(await localizarEndereco(c.req.valid('query').endereco), 200)
    } catch (erro) {
      if (erro instanceof GeocodificacaoIndisponivel) {
        return c.json(corpoErro('geocodificacao_indisponivel', erro.message), 502)
      }
      throw erro
    }
  })
  .openapi(rotaEnderecoDoPonto, async (c) => {
    const { latitude, longitude } = c.req.valid('query')
    try {
      return c.json(await buscarEnderecoDoPonto(latitude, longitude), 200)
    } catch (erro) {
      if (erro instanceof GeocodificacaoIndisponivel) {
        return c.json(corpoErro('geocodificacao_indisponivel', erro.message), 502)
      }
      throw erro
    }
  })
