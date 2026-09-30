import { nomeDeBusca } from '@kgb/db'
import { prisma } from '../db'
import { montarEndereco } from '../dominio/cep'
import { ordenarPorNome } from '../dominio/prestadores'

/** A lista suspensa do modal mostra poucos: quem quer outro assinante refina a busca. */
export const LIMITE_ASSINANTES = 8

/** O `contains` do Prisma não escapa os curingas do LIKE: `%` e `_` da busca são texto. */
const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, '\\$&')

/**
 * Assinantes ativos cujo nome contém a busca (sem acentos e sem maiúsculas), por nome, no máximo 8.
 * Filtra e limita no banco, pela coluna `nomeBusca` (o nome já sem acentos e em minúsculas).
 */
export async function buscarAssinantes(busca: string) {
  const termo = nomeDeBusca(busca.trim())
  const encontrados = await prisma.assinante.findMany({
    where: {
      status: 'ativo',
      excluidoEm: null,
      ...(termo ? { nomeBusca: { contains: escaparLike(termo) } } : {}),
    },
    orderBy: [{ nomeBusca: 'asc' }, { id: 'asc' }],
    take: LIMITE_ASSINANTES,
  })
  return ordenarPorNome(encontrados).map((a) => ({
    id: a.id,
    nome: a.nome,
    cep: a.cep,
    logradouro: a.logradouro,
    numero: a.numero,
    complemento: a.complemento,
    bairro: a.bairro,
    cidade: a.cidade,
    endereco: montarEndereco(a),
  }))
}
