import { dataISO } from '@kgb/ui'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { usarDemandas } from '../demandas/usarDemandas'
import { sessao } from '../sessao'
import {
  datasComAtendimento,
  doDia,
  faixaDeDias,
  naFaixa,
  rotuloDoDia,
  type DiaDaAgenda,
} from './dias'

/** O protótipo recalcula a tela a cada 30 s: depois da meia-noite, a faixa anda sozinha. */
export const INTERVALO_RELOGIO = 30_000

/**
 * Dia escolhido na faixa, guardado enquanto o app está aberto (estado de módulo), como o `aDay` do
 * protótipo: sobrevive a abrir o Detalhe e voltar e a trocar de aba. Guarda a data, não o índice, e
 * de quem é: outro login, ou a data fora da faixa depois da virada do dia, volta para hoje.
 */
const escolha = shallowRef<{ usuario: string; data: string } | null>(null)

export function reiniciarAgenda(): void {
  escolha.value = null
}

export function usarAgenda() {
  const hoje = ref(dataISO(new Date()))
  const relogio = setInterval(() => {
    hoje.value = dataISO(new Date())
  }, INTERVALO_RELOGIO)
  onBeforeUnmount(() => clearInterval(relogio))

  // A mesma consulta de Demandas: as mutações do Detalhe já invalidam esta lista.
  const { data, error, isSuccess } = usarDemandas()
  const usuario = computed(() => sessao.usuario?.id ?? '')
  const prestador = computed(() => sessao.usuario?.prestador?.id)

  /**
   * A lista em cache só vale se for de quem está logado. A chave não depende do usuário e sair da
   * conta no Início não limpa o cache: até o refetch voltar (ou sem rede), a lista seria a do
   * prestador anterior. Lista de outro conta como carregando.
   */
  const lista = computed(() => {
    const l = data.value
    return l?.every((a) => a.prestador.id === prestador.value) ? l : undefined
  })
  const carregada = computed(() => isSuccess.value && lista.value !== undefined)

  const selecionado = computed(() => {
    const e = escolha.value
    return e && e.usuario === usuario.value && naFaixa(e.data, hoje.value) ? e.data : hoje.value
  })
  const comAtendimento = computed(() => datasComAtendimento(lista.value ?? []))
  const dias = computed<DiaDaAgenda[]>(() =>
    faixaDeDias(hoje.value).map((d) => ({
      ...d,
      selecionado: d.data === selecionado.value,
      temAtendimento: comAtendimento.value.has(d.data),
    })),
  )
  const rotulo = computed(() => rotuloDoDia(selecionado.value, hoje.value))
  const itens = computed(() => doDia(lista.value ?? [], selecionado.value))

  function escolher(dataEscolhida: string) {
    escolha.value = { usuario: usuario.value, data: dataEscolhida }
  }

  return { dias, rotulo, itens, escolher, error, carregada }
}
