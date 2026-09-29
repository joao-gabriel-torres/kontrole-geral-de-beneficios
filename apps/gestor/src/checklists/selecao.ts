import { ref } from 'vue'

/**
 * O tipo selecionado na tela, em estado de módulo: sobrevive a sair e voltar para a tela. `null`
 * (ou um id que não existe mais) é o primeiro da lista.
 */
export const tipoSelecionado = ref<string | null>(null)
