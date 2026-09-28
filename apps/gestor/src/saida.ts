import { useQueryClient } from '@tanstack/vue-query'
import { useRouter } from 'vue-router'
import { reiniciarLista } from './acionamentos/estadoLista'
import { novoAcionamento } from './acionamentos/novo/estado'
import { sair } from './sessao'

/** Sair da conta sem deixar dados, filtro ou modal da sessão anterior para o próximo login. */
export function usarSaida(): () => Promise<void> {
  const router = useRouter()
  const consultas = useQueryClient()
  return async () => {
    await sair()
    consultas.clear()
    reiniciarLista()
    novoAcionamento.fechar()
    await router.replace({ name: 'login' })
  }
}
