import { readonly, ref, watch } from 'vue'
import { sessao } from '../../sessao'

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

// O formulário tem cliente e endereço: nada dele sobrevive à troca de conta (saída OU sessão
// recusada). Fechar desmonta o modal e descarta o que estava preenchido.
watch(
  () => sessao.usuario,
  () => novoAcionamento.fechar(),
)
