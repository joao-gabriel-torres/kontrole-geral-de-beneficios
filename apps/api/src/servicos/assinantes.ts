import { prisma } from '../db'
import { montarEndereco } from '../dominio/cep'
import { ordenarPorNome } from '../dominio/prestadores'

/** A lista suspensa do modal mostra poucos: quem quer outro assinante refina a busca. */
export const LIMITE_ASSINANTES = 8

const semAcentos = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

/** Assinantes ativos cujo nome contém a busca (sem acentos), por nome, no máximo 8. */
export async function buscarAssinantes(busca: string) {
  const ativos = await prisma.assinante.findMany({
    where: { status: 'ativo', excluidoEm: null },
  })
  const termo = semAcentos(busca)
  const encontrados = termo ? ativos.filter((a) => semAcentos(a.nome).includes(termo)) : ativos
  return ordenarPorNome(encontrados)
    .slice(0, LIMITE_ASSINANTES)
    .map((a) => ({
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
