import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import {
  CepIndisponivel,
  criarBuscaViaCep,
  trocarBuscaCep,
  type EnderecoCep,
} from '../servicos/cep'

const PAULISTA: EnderecoCep = {
  cep: '01310200',
  logradouro: 'Avenida Paulista',
  bairro: 'Bela Vista',
  cidade: 'São Paulo',
}

const app = criarApp()
let gestora: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
})

afterEach(() => trocarBuscaCep(null))

const consultar = (cep: string, headers = gestora) => app.request(`/api/cep/${cep}`, { headers })

describe('GET /api/cep/{cep}', () => {
  it('exige sessão de gestor', async () => {
    expect((await app.request('/api/cep/01310200')).status).toBe(401)
    const carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
    expect((await consultar('01310200', carlos)).status).toBe(403)
  })

  it('devolve o endereço do CEP, aceitando o hífen no caminho', async () => {
    trocarBuscaCep({ buscar: async () => PAULISTA })
    const r = await consultar('01310-200')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual(PAULISTA)
  })

  it('CEP malformado é 422 sem consultar o ViaCEP', async () => {
    trocarBuscaCep({
      buscar: async () => {
        throw new Error('não era para consultar')
      },
    })
    const r = await consultar('123')
    expect(r.status).toBe(422)
    expect(await r.json()).toEqual({
      erro: { codigo: 'cep_invalido', mensagem: 'Informe um CEP com 8 dígitos' },
    })
  })

  it('CEP inexistente é 404', async () => {
    trocarBuscaCep({ buscar: async () => null })
    const r = await consultar('99999999')
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({
      erro: { codigo: 'cep_nao_encontrado', mensagem: 'CEP não encontrado' },
    })
  })

  it('ViaCEP fora do ar é 502', async () => {
    trocarBuscaCep({
      buscar: async () => {
        throw new CepIndisponivel('O serviço de CEP não respondeu, tente de novo')
      },
    })
    const r = await consultar('01310200')
    expect(r.status).toBe(502)
    expect(await r.json()).toEqual({
      erro: {
        codigo: 'cep_indisponivel',
        mensagem: 'O serviço de CEP não respondeu, tente de novo',
      },
    })
  })
})

describe('criarBuscaViaCep', () => {
  const resposta = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  it('consulta o ViaCEP e traduz a resposta (localidade → cidade, CEP sem hífen)', async () => {
    let url = ''
    const busca = criarBuscaViaCep(async (entrada) => {
      url = String(entrada)
      return resposta({
        cep: '01310-200',
        logradouro: 'Avenida Paulista',
        complemento: 'de 1512 a 2132 - lado par',
        bairro: 'Bela Vista',
        localidade: 'São Paulo',
        uf: 'SP',
      })
    })
    expect(await busca.buscar('01310200')).toEqual(PAULISTA)
    expect(url).toBe('https://viacep.com.br/ws/01310200/json/')
  })

  it('CEP geral (sem logradouro) vem com textos vazios, não 404', async () => {
    const busca = criarBuscaViaCep(async () =>
      resposta({ cep: '13570-000', localidade: 'São Carlos', uf: 'SP' }),
    )
    expect(await busca.buscar('13570000')).toEqual({
      cep: '13570000',
      logradouro: '',
      bairro: '',
      cidade: 'São Carlos',
    })
  })

  it('resposta {"erro":"true"} vira null (CEP não encontrado)', async () => {
    const busca = criarBuscaViaCep(async () => resposta({ erro: 'true' }))
    expect(await busca.buscar('99999999')).toBeNull()
  })

  it.each([
    [
      'fetch que rejeita (timeout/abort)',
      criarBuscaViaCep(async () => Promise.reject(new Error('abort'))),
    ],
    ['status fora do 2xx', criarBuscaViaCep(async () => resposta({}, 500))],
    [
      'corpo que não é JSON',
      criarBuscaViaCep(async () => new Response('<html>fora do ar</html>', { status: 200 })),
    ],
  ])('%s vira CepIndisponivel', async (_nome, busca) => {
    await expect(busca.buscar('01310200')).rejects.toBeInstanceOf(CepIndisponivel)
  })
})
