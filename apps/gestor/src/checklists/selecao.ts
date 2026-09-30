import { ref, watch } from 'vue'
import { sessao } from '../sessao'

/**
 * O tipo selecionado na tela, em estado de módulo: sobrevive a sair e voltar para a tela. `null`
 * (ou um id que não existe mais) é o primeiro da lista.
 */
export const tipoSelecionado = ref<string | null>(null)

// A próxima conta começa do primeiro da lista (saída, sessão recusada ou outro login).
watch(
  () => sessao.usuario,
  () => (tipoSelecionado.value = null),
)
