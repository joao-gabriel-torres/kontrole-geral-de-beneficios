import { readonly, ref } from 'vue'

const aberto = ref(false)

/** O modal Novo acionamento é um só: abre pela lista ou pelo Painel e é mostrado pelo layout. */
export const novoAcionamento = {
  aberto: readonly(aberto),
  abrir(): void {
    aberto.value = true
  },
  fechar(): void {
    aberto.value = false
  },
}
