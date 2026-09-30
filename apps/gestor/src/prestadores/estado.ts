import { reactive, watch } from 'vue'
import { sessao } from '../sessao'
import type { FiltroPrestadores } from './lista'

/**
 * Busca e filtro da tela de Prestadores. Ficam em memória ao trocar de tela, como no protótipo, e
 * voltam ao padrão quando muda o usuário da sessão (sair da conta ou entrar com outra).
 */
export const estadoPrestadores = reactive<{ busca: string; filtro: FiltroPrestadores }>({
  busca: '',
  filtro: 'todos',
})

export function reiniciarPrestadores(): void {
  estadoPrestadores.busca = ''
  estadoPrestadores.filtro = 'todos'
}

watch(
  () => sessao.usuario?.id,
  () => reiniciarPrestadores(),
)
