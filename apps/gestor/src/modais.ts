import { onBeforeUnmount, onMounted, readonly, ref } from 'vue'

const abertos = ref(0)

/** Quantos modais das telas estão abertos agora: o layout deixa o resto da tela inerte. */
export const modaisAbertos = readonly(abertos)

/**
 * Registra um modal de tela enquanto o componente que chama estiver montado. O modal em si vai com
 * `<Teleport defer to="#modais-gestor">`, que fica na coluna de conteúdo, fora da área inerte (no
 * protótipo, o fundo escuro cobre só a coluna de conteúdo, não a barra lateral).
 */
export function usarModalAberto(): void {
  onMounted(() => abertos.value++)
  onBeforeUnmount(() => abertos.value--)
}
