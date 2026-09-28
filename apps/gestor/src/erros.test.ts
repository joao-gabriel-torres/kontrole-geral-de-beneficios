import { describe, expect, it } from 'vitest'
import { ErroApi, exigir, MENSAGEM_FALHA, mensagemDeErro } from './erros'

const resposta = (status: number) => ({ status }) as Response

describe('exigir', () => {
  it('devolve os dados da resposta', async () => {
    await expect(
      exigir(Promise.resolve({ data: { ok: 1 }, response: resposta(200) })),
    ).resolves.toEqual({
      ok: 1,
    })
  })
  it('lança ErroApi com o código e a mensagem da API', async () => {
    const pedido = Promise.resolve({
      error: { erro: { codigo: 'motivo_obrigatorio', mensagem: 'Escreva o motivo da reprovação' } },
      response: resposta(422),
    })
    await expect(exigir(pedido)).rejects.toMatchObject({
      name: 'ErroApi',
      codigo: 'motivo_obrigatorio',
      status: 422,
      message: 'Escreva o motivo da reprovação',
    })
  })
  it('sem corpo de erro, usa a mensagem padrão', async () => {
    await expect(
      exigir(Promise.resolve({ error: 'x', response: resposta(502) })),
    ).rejects.toMatchObject({
      message: MENSAGEM_FALHA,
      status: 502,
    })
  })
})

describe('mensagemDeErro', () => {
  it('usa a mensagem da API ou a padrão (falha de rede)', () => {
    expect(mensagemDeErro(new ErroApi('Tipo de demanda inválido', 'tipo_invalido', 422))).toBe(
      'Tipo de demanda inválido',
    )
    expect(mensagemDeErro(new TypeError('Failed to fetch'))).toBe(MENSAGEM_FALHA)
  })
})
