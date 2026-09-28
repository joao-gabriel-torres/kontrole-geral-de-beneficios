import { reactive } from 'vue'
import type { FiltroLista } from './filtros'

/**
 * Filtro e busca da lista, guardados enquanto o app está aberto: voltar do Detalhe mantém o filtro,
 * como no protótipo. Criar um acionamento volta para "Todos" sem busca.
 */
export const estadoLista = reactive<{ filtro: FiltroLista; busca: string }>({
  filtro: 'todos',
  busca: '',
})

export function reiniciarLista(): void {
  estadoLista.filtro = 'todos'
  estadoLista.busca = ''
}
