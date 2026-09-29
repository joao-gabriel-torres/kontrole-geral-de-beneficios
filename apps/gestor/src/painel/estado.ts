import { ref, watch } from 'vue'
import { sessao } from '../sessao'
import type { Periodo } from './formatos'

/**
 * Período do Painel, guardado enquanto o app está aberto (sobrevive a abrir o Detalhe e voltar).
 * Volta a 7 dias quando a sessão acaba, para o próximo login começar do padrão.
 */
export const periodoPainel = ref<Periodo>(7)

watch(
  () => sessao.usuario,
  (usuario) => {
    if (!usuario) periodoPainel.value = 7
  },
  { flush: 'sync' },
)
