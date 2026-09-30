import { normalizarCep } from '../dominio/cep'
import { ErroHttp } from '../erros'

/** O que o modal precisa para preencher o endereço de um CEP. */
export interface EnderecoCep {
  /** Só os 8 dígitos. */
  cep: string
  logradouro: string
  bairro: string
  cidade: string
}

/** Consulta de CEP atrás de interface: a real vai ao ViaCEP, os testes injetam uma falsa. */
export interface BuscaCep {
  /** Recebe o CEP já normalizado (8 dígitos); devolve null quando o CEP não existe. */
  buscar(cep: string): Promise<EnderecoCep | null>
}

/** O ViaCEP não respondeu (timeout, erro de rede, status ou corpo inesperado). */
export class CepIndisponivel extends Error {
  constructor(mensagem = 'O serviço de CEP não respondeu, tente de novo') {
    super(mensagem)
    this.name = 'CepIndisponivel'
  }
}

export const TEMPO_LIMITE_VIACEP = 5000

interface RespostaViaCep {
  erro?: unknown
  cep?: string
  logradouro?: string
  bairro?: string
  localidade?: string
}

/** Implementação real: https://viacep.com.br, com timeout curto. */
export function criarBuscaViaCep(executarFetch: typeof fetch = fetch): BuscaCep {
  return {
    async buscar(cep) {
      let dados: RespostaViaCep
      try {
        const resposta = await executarFetch(`https://viacep.com.br/ws/${cep}/json/`, {
          signal: AbortSignal.timeout(TEMPO_LIMITE_VIACEP),
        })
        if (!resposta.ok) throw new CepIndisponivel()
        dados = (await resposta.json()) as RespostaViaCep
      } catch {
        throw new CepIndisponivel()
      }
      if (dados.erro) return null
      return {
        cep: (dados.cep ?? cep).replace('-', ''),
        logradouro: dados.logradouro ?? '',
        bairro: dados.bairro ?? '',
        cidade: dados.localidade ?? '',
      }
    },
  }
}

let buscaCep: BuscaCep = criarBuscaViaCep()

/** Troca a implementação nos testes; null volta ao ViaCEP real. */
export function trocarBuscaCep(busca: BuscaCep | null): void {
  buscaCep = busca ?? criarBuscaViaCep()
}

/** Valida o CEP, consulta a busca em uso e traduz "não achou" em 404. */
export async function consultarCep(cepInformado: string): Promise<EnderecoCep> {
  const cep = normalizarCep(cepInformado)
  const endereco = await buscaCep.buscar(cep)
  if (!endereco) throw new ErroHttp(404, 'cep_nao_encontrado', 'CEP não encontrado')
  return endereco
}
