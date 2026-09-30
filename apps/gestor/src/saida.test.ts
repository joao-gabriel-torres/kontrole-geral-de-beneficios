import { describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { aguardar, montar } from '../test/montar'
import { estadoLista } from './acionamentos/estadoLista'
import { novoAcionamento } from './acionamentos/novo/estado'
import { usarSaida } from './saida'
import { sair } from './sessao'

vi.mock('./sessao', () => ({ sair: vi.fn(), sessao: { usuario: null } }))

const ComSaida = defineComponent({
  setup: () => ({ encerrar: usarSaida() }),
  render: () => null,
})

describe('usarSaida', () => {
  it('encerra a sessão, limpa o cache, a lista e o modal, e volta ao login', async () => {
    const { tela, router, consultas } = await montar(ComSaida, { rota: '/acionamentos' })
    consultas.setQueryData(['qualquer'], 1)
    estadoLista.filtro = 'aguardando'
    estadoLista.busca = 'forro'
    novoAcionamento.abrir()

    await (tela.vm as unknown as { encerrar: () => Promise<void> }).encerrar()
    await aguardar()

    expect(sair).toHaveBeenCalledOnce()
    expect(consultas.getQueryData(['qualquer'])).toBeUndefined()
    expect(estadoLista).toEqual({ filtro: 'todos', busca: '' })
    expect(novoAcionamento.aberto.value).toBe(false)
    expect(router.currentRoute.value.name).toBe('login')
  })
})
