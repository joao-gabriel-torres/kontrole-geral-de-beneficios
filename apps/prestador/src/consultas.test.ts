import { MutationObserver } from '@tanstack/vue-query'
import { describe, expect, it, vi } from 'vitest'
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

  it('erro sem corpo no formato da API ainda vira ErroApi com mensagem genérica', () => {
    expect(() => exigir({ error: 'x', response: resposta(500) })).toThrow(MENSAGEM_SEM_CONEXAO)
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
})
