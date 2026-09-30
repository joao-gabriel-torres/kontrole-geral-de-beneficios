import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { TAMANHO_MAXIMO_ENDERECO } from '../dominio/localizacao'
import { corpoErro, respostaErro } from '../erros'
import { exigePapel } from '../middlewares/acesso'
import { GeocodificacaoIndisponivel, localizarEndereco } from '../servicos/geocodificacao'

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

/** Geocodificação do "Ver no mapa" do Novo acionamento. */
export const rotasGeocodificacao = new OpenAPIHono<Ambiente>().openapi(
  rotaLocalizar,
  async (c) => {
    try {
      return c.json(await localizarEndereco(c.req.valid('query').endereco), 200)
    } catch (erro) {
      if (erro instanceof GeocodificacaoIndisponivel) {
        return c.json(corpoErro('geocodificacao_indisponivel', erro.message), 502)
      }
      throw erro
    }
  },
)
