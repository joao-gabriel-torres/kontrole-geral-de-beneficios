import { MutationObserver } from '@tanstack/vue-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CHAVES,
  criarClienteConsultas,
  ErroApi,
  exigir,
  MENSAGEM_SEM_CONEXAO,
  mensagemDeErro,
} from './consultas'

const resposta = (status: number) => new Response(null, { status })

describe('exigir', () => {
  it('devolve os dados de uma resposta de sucesso', () => {
    expect(exigir({ data: { ok: true }, response: resposta(200) })).toEqual({ ok: true })
  })

  it('transforma o corpo de erro da API num ErroApi com código, status e mensagem', () => {
    const corpo = {
      erro: { codigo: 'fotos_insuficientes', mensagem: 'Adicione 1 foto da conclusão para enviar' },
    }
    const chamar = () => exigir({ error: corpo, response: resposta(422) })
    expect(chamar).toThrow(ErroApi)
    expect(chamar).toThrow(
      expect.objectContaining({
        codigo: 'fotos_insuficientes',
        status: 422,
        message: 'Adicione 1 foto da conclusão para enviar',
      }),
    )
  })

  describe('resposta fora do formato da API (proxy, servidor fora do ar) não é falta de conexão', () => {
    const falhar = (status: number, corpo: unknown = `<html>${status}</html>`) => {
      try {
        exigir({ error: corpo, response: resposta(status) })
      } catch (e) {
        return e as ErroApi
      }
      throw new Error('exigir deveria ter lançado')
    }

    it('5xx (502 do proxy, 500 sem corpo) avisa que o servidor está com problemas', () => {
      for (const [status, corpo] of [
        [502, '<html>502 Bad Gateway</html>'],
        [503, ''],
        [500, 'x'],
      ] as const) {
        const e = falhar(status, corpo)
        expect(e).toBeInstanceOf(ErroApi)
        expect(e).toMatchObject({ status, codigo: 'servidor' })
        expect(e.message).toBe('O servidor está com problemas. Tente de novo em instantes.')
      }
    })

    it('413 do proxy num envio de foto avisa o limite de 10 MB, como a API', () => {
      expect(falhar(413)).toMatchObject({
        status: 413,
        codigo: 'arquivo_grande',
        message: 'A foto passa de 10 MB',
      })
    })

    it('outro 4xx sem corpo da API usa o texto neutro', () => {
      const e = falhar(404)
      expect(e).toMatchObject({ status: 404, codigo: 'desconhecido' })
      expect(e.message).toBe('Não foi possível falar com o servidor. Tente de novo.')
      expect(e.message).not.toBe(MENSAGEM_SEM_CONEXAO)
    })
  })
})

describe('mensagemDeErro', () => {
  it('usa a mensagem da API', () => {
    expect(
      mensagemDeErro(new ErroApi('transicao_invalida', 409, 'Este atendimento já foi iniciado.')),
    ).toBe('Este atendimento já foi iniciado.')
  })

  it('erro de rede vira o aviso de conexão', () => {
    expect(mensagemDeErro(new TypeError('Failed to fetch'))).toBe(MENSAGEM_SEM_CONEXAO)
  })
})

describe('CHAVES', () => {
  it('separa o detalhe por id', () => {
    expect(CHAVES.detalhe('a1')).toEqual(['acionamento', 'a1'])
    expect(CHAVES.lista).toEqual(['acionamentos'])
    expect(CHAVES.inicio).toEqual(['inicio'])
  })
})

describe('criarClienteConsultas', () => {
  it('401 numa consulta ou ação avisa que a sessão caiu; outros erros não', async () => {
    const aoPerderSessao = vi.fn()
    const consultas = criarClienteConsultas(aoPerderSessao)
    const falhar = (status: number) => () => Promise.reject(new ErroApi('x', status, 'falhou'))

    await consultas
      .fetchQuery({ queryKey: ['a'], queryFn: falhar(500), retry: false })
      .catch(() => {})
    expect(aoPerderSessao).not.toHaveBeenCalled()
    await consultas
      .fetchQuery({ queryKey: ['b'], queryFn: falhar(401), retry: false })
      .catch(() => {})
    expect(aoPerderSessao).toHaveBeenCalledTimes(1)
    await new MutationObserver(consultas, { mutationFn: falhar(401) }).mutate().catch(() => {})
    expect(aoPerderSessao).toHaveBeenCalledTimes(2)
  })

  describe('novas tentativas', () => {
    afterEach(() => vi.useRealTimers())

    /** Quantas vezes a consulta foi chamada antes de 1 s e no total, com a falha dada. */
    async function tentativas(falha: unknown) {
      vi.useFakeTimers()
      const consultas = criarClienteConsultas()
      const buscar = vi.fn(() => Promise.reject(falha))
      const consulta = consultas.fetchQuery({ queryKey: ['c'], queryFn: buscar })
      consulta.catch(() => {})
      await vi.advanceTimersByTimeAsync(999)
      const antesDe1s = buscar.mock.calls.length
      await vi.advanceTimersByTimeAsync(5000)
      await consulta.catch(() => {})
      return { antesDe1s, total: buscar.mock.calls.length }
    }

    it('4xx é resposta definitiva: não repete (o 404 e a volta ao login não atrasam 1 s)', async () => {
      expect(await tentativas(new ErroApi('x', 404, 'falhou'))).toEqual({ antesDe1s: 1, total: 1 })
      expect(await tentativas(new ErroApi('x', 401, 'falhou'))).toEqual({ antesDe1s: 1, total: 1 })
    })

    it('5xx e falha de rede repetem uma vez, depois de 1 s', async () => {
      const esperado = { antesDe1s: 1, total: 2 }
      expect(await tentativas(new ErroApi('x', 502, 'falhou'))).toEqual(esperado)
      expect(await tentativas(new TypeError('Failed to fetch'))).toEqual(esperado)
    })
  })
})
