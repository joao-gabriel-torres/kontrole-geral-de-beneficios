import { useQuery } from '@tanstack/vue-query'
import { computed, toValue, type MaybeRefOrGetter } from 'vue'
import { api } from '../api'
import { comLimite } from '../consultas'
import { ErroApi, exigir, mensagemDeErro } from '../erros'

/** Rua, bairro, cidade e UF de um CEP (ViaCEP pela API). Só consulta com os 8 dígitos. */
function usarEnderecoDoCep(cep: MaybeRefOrGetter<string>) {
  return useQuery({
    queryKey: computed(() => ['cep', toValue(cep)] as const),
    queryFn: ({ queryKey, signal }) =>
      exigir(
        comLimite(
          (s) => api.GET('/api/cep/{cep}', { params: { path: { cep: queryKey[1] } }, signal: s }),
          signal,
        ),
      ),
    enabled: computed(() => toValue(cep).length === 8),
    staleTime: Infinity,
  })
}

/** Rua e bairro que a gestora digita (os outros vêm do CEP, só para leitura). */
export interface CamposLivres {
  logradouro: boolean
  bairro: boolean
}

/**
 * A consulta do CEP de um formulário de endereço. `cep` são os dígitos a consultar (vazio, ou menos
 * de 8, não consulta).
 *
 * - `endereco`: o que o ViaCEP conhece do CEP em uso (só com os 8 dígitos).
 * - `inexistente`: o CEP não existe (404); o formulário bloqueia o envio até corrigir.
 * - `semResposta`: o ViaCEP não respondeu (502, tempo esgotado ou falha de rede).
 * - `livres`: rua e bairro vêm do CEP, só para leitura. São digitados num CEP geral de cidade (que
 *   vem sem eles) e quando o ViaCEP não responde; sem CEP, na consulta e num CEP que não existe, não.
 * - `mensagem`: a falha da consulta, para a linha de erro do CEP.
 */
export function usarConsultaCep(cep: MaybeRefOrGetter<string>) {
  const { data, error: falha, isFetching: consultando } = usarEnderecoDoCep(cep)
  const endereco = computed(() => (toValue(cep).length === 8 ? data.value : undefined))
  const inexistente = computed(
    () => falha.value instanceof ErroApi && falha.value.codigo === 'cep_nao_encontrado',
  )
  const semResposta = computed(() => !!falha.value && !inexistente.value)
  const livres = computed<CamposLivres>(() => {
    if (semResposta.value) return { logradouro: true, bairro: true }
    const e = endereco.value
    return { logradouro: !!e && !e.logradouro, bairro: !!e && !e.bairro }
  })
  const placeholderRua = computed(() =>
    consultando.value ? 'Buscando o CEP…' : 'Preenchida pelo CEP',
  )
  const mensagem = computed(() =>
    toValue(cep).length === 8 && falha.value ? mensagemDeErro(falha.value) : '',
  )
  return {
    endereco,
    falha,
    consultando,
    inexistente,
    semResposta,
    livres,
    placeholderRua,
    mensagem,
  }
}
