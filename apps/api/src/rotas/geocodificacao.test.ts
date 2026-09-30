import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import type { Coordenadas, EnderecoDoPonto } from '../dominio/localizacao'
import {
  criarGeocodificadorNominatim,
  GeocodificacaoIndisponivel,
  trocarGeocodificador,
  USER_AGENT_NOMINATIM,
  type Geocodificador,
} from '../servicos/geocodificacao'

const OSCAR_FREIRE: Coordenadas = { latitude: -23.5671492, longitude: -46.6644067 }

const app = criarApp()
let gestora: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
})

afterEach(() => trocarGeocodificador(null))

const localizar = (endereco: string | null, headers = gestora) =>
  app.request(
    endereco === null
      ? '/api/geocodificacao'
      : `/api/geocodificacao?endereco=${encodeURIComponent(endereco)}`,
    { headers },
  )

/** Geocodificador que falha o teste se for consultado; `trocar` substitui só o que o teste usa. */
const NAO_ERA_PARA_CONSULTAR: Geocodificador = {
  localizar: async () => {
    throw new Error('não era para consultar')
  },
  enderecoDoPonto: async () => {
    throw new Error('não era para consultar')
  },
}
const trocar = (parte: Partial<Geocodificador>) =>
  trocarGeocodificador({ ...NAO_ERA_PARA_CONSULTAR, ...parte })
const naoEraParaConsultar = () => trocar({})

/** Geocodificador falso: responde pelo texto da consulta e anota cada consulta recebida. */
function falso(respostas: Record<string, Coordenadas | null> = {}) {
  const consultas: string[] = []
  trocar({
    async localizar(consulta) {
      consultas.push(consulta)
      return respostas[consulta] ?? null
    },
  })
  return consultas
}

describe('GET /api/geocodificacao', () => {
  it('exige sessão de gestor', async () => {
    naoEraParaConsultar()
    expect((await app.request('/api/geocodificacao?endereco=Rua')).status).toBe(401)
    const carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
    expect((await localizar('Rua Oscar Freire, 900 · Jardins', carlos)).status).toBe(403)
  })

  it('devolve a posição do endereço, com 6 casas, consultando com o bairro e a cidade', async () => {
    const consultas = falso({ 'Rua Oscar Freire, 900, Jardins, São Paulo': OSCAR_FREIRE })
    const r = await localizar('Rua Oscar Freire, 900 · Jardins')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({ latitude: -23.567149, longitude: -46.664407 })
    expect(consultas).toEqual(['Rua Oscar Freire, 900, Jardins, São Paulo'])
  })

  it('sem resultado com o bairro, tenta só com rua, número e cidade', async () => {
    const consultas = falso({ 'Rua Antônio Agu, 100, Osasco, SP': OSCAR_FREIRE })
    const r = await localizar('Rua Antônio Agu, 100 · Centro · Osasco - SP')
    expect(r.status).toBe(200)
    expect(consultas).toEqual([
      'Rua Antônio Agu, 100, Centro, Osasco, SP',
      'Rua Antônio Agu, 100, Osasco, SP',
    ])
  })

  it('endereço vazio, ausente ou longo demais é 422, sem consultar', async () => {
    naoEraParaConsultar()
    for (const vazio of [null, '', '   ']) {
      const r = await localizar(vazio)
      expect(r.status).toBe(422)
      expect(await r.json()).toEqual({
        erro: { codigo: 'endereco_obrigatorio', mensagem: 'Informe o endereço' },
      })
    }
    const longo = await localizar(`Rua ${'a'.repeat(300)}`)
    expect(longo.status).toBe(422)
    expect(await longo.json()).toEqual({
      erro: { codigo: 'endereco_longo', mensagem: 'O endereço passa de 300 caracteres' },
    })
  })

  it('nenhuma consulta achou: 404 localizacao_nao_encontrada', async () => {
    const consultas = falso()
    const r = await localizar('Rua Que Não Existe, 1 · Lugar Nenhum')
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({
      erro: {
        codigo: 'localizacao_nao_encontrada',
        mensagem: 'Não encontramos este endereço no mapa',
      },
    })
    expect(consultas).toHaveLength(2)
  })

  it('resultado fora do Brasil conta como não encontrado (nada de coordenada inventada)', async () => {
    falso({ 'Rua Oscar Freire, 900, São Paulo': { latitude: 40.7128, longitude: -74.006 } })
    const r = await localizar('Rua Oscar Freire, 900')
    expect(r.status).toBe(404)
  })

  it('geocodificador fora do ar é 502 geocodificacao_indisponivel', async () => {
    trocar({
      localizar: async () => {
        throw new GeocodificacaoIndisponivel()
      },
    })
    const r = await localizar('Rua Oscar Freire, 900 · Jardins')
    expect(r.status).toBe(502)
    expect(await r.json()).toEqual({
      erro: {
        codigo: 'geocodificacao_indisponivel',
        mensagem: 'O serviço de mapas não respondeu, tente de novo',
      },
    })
  })

  it('guarda o resultado por endereço normalizado (acentos, maiúsculas e espaços)', async () => {
    const consultas = falso({ 'Rua Antônio Agu, 100, Centro, Osasco, SP': OSCAR_FREIRE })
    expect((await localizar('Rua Antônio Agu, 100 · Centro · Osasco - SP')).status).toBe(200)
    const deNovo = await localizar('  rua antonio   agu, 100 · CENTRO · osasco - sp ')
    expect(deNovo.status).toBe(200)
    expect(await deNovo.json()).toEqual({ latitude: -23.567149, longitude: -46.664407 })
    expect(consultas).toHaveLength(1)
  })

  it('guarda também o "não encontrado", mas não a falha do serviço', async () => {
    const consultas = falso()
    expect((await localizar('Rua Nenhuma, 1')).status).toBe(404)
    expect((await localizar('Rua Nenhuma, 1')).status).toBe(404)
    expect(consultas).toHaveLength(1)

    let falhas = 0
    trocar({
      localizar: async () => {
        falhas += 1
        if (falhas === 1) throw new GeocodificacaoIndisponivel()
        return OSCAR_FREIRE
      },
    })
    expect((await localizar('Rua Oscar Freire, 900')).status).toBe(502)
    expect((await localizar('Rua Oscar Freire, 900')).status).toBe(200)
  })

  it('pedidos simultâneos do mesmo endereço fazem uma consulta só', async () => {
    let liberar: (c: Coordenadas) => void = () => {}
    let chamadas = 0
    trocar({
      localizar: () => {
        chamadas += 1
        return new Promise((resolver) => (liberar = resolver))
      },
    })
    const pedidos = [localizar('Rua Oscar Freire, 900'), localizar('Rua Oscar Freire, 900')]
    await new Promise((r) => setTimeout(r, 50))
    liberar(OSCAR_FREIRE)
    const respostas = await Promise.all(pedidos)
    expect(respostas.map((r) => r.status)).toEqual([200, 200])
    expect(chamadas).toBe(1)
  })
})

/** O endereço do ponto do Edifício Aurora arrastado uns quarteirões (Rua Harmonia, 412). */
const PONTO_HARMONIA: Coordenadas = { latitude: -23.557, longitude: -46.6905 }
const ENDERECO_HARMONIA: EnderecoDoPonto = {
  cep: '05435000',
  logradouro: 'Rua Harmonia',
  numero: '412',
  bairro: 'Vila Madalena',
  cidade: 'São Paulo',
  uf: 'SP',
}

const enderecoDoPonto = (latitude: string | null, longitude: string | null, headers = gestora) => {
  const busca = new URLSearchParams()
  if (latitude !== null) busca.set('latitude', latitude)
  if (longitude !== null) busca.set('longitude', longitude)
  return app.request(`/api/geocodificacao/reversa?${busca}`, { headers })
}

/** Geocodificador falso do ponto: responde pela chave "lat,lng" e anota cada ponto consultado. */
function falsoDoPonto(respostas: Record<string, EnderecoDoPonto | null> = {}) {
  const pontos: Coordenadas[] = []
  trocar({
    async enderecoDoPonto(ponto) {
      pontos.push(ponto)
      return respostas[`${ponto.latitude},${ponto.longitude}`] ?? null
    },
  })
  return pontos
}

describe('GET /api/geocodificacao/reversa', () => {
  it('exige sessão de gestor', async () => {
    naoEraParaConsultar()
    expect(
      (await app.request('/api/geocodificacao/reversa?latitude=-23.557&longitude=-46.6905')).status,
    ).toBe(401)
    const carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
    expect((await enderecoDoPonto('-23.557', '-46.6905', carlos)).status).toBe(403)
  })

  it('devolve o endereço do ponto, consultando a posição com 6 casas', async () => {
    const pontos = falsoDoPonto({ '-23.557,-46.6905': ENDERECO_HARMONIA })
    const r = await enderecoDoPonto('-23.5570001', '-46.69050004')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual(ENDERECO_HARMONIA)
    expect(pontos).toEqual([PONTO_HARMONIA])
  })

  it('o que o mapa não sabe vem null', async () => {
    const semNumero = { ...ENDERECO_HARMONIA, cep: null, numero: null, bairro: null }
    falsoDoPonto({ '-23.557,-46.6905': semNumero })
    const r = await enderecoDoPonto('-23.557', '-46.6905')
    expect(r.status).toBe(200)
    expect(await r.json()).toEqual({
      cep: null,
      logradouro: 'Rua Harmonia',
      numero: null,
      bairro: null,
      cidade: 'São Paulo',
      uf: 'SP',
    })
  })

  it('posição ausente, que não é número ou fora do Brasil é 422, sem consultar', async () => {
    naoEraParaConsultar()
    const casos: [string | null, string | null, string][] = [
      [null, null, 'Informe a latitude e a longitude'],
      ['-23.557', null, 'Informe a latitude e a longitude'],
      ['', '-46.6905', 'Informe a latitude e a longitude'],
      ['abc', '-46.6905', 'Informe a latitude e a longitude em graus decimais'],
      ['40.7128', '-74.006', 'A localização precisa ficar no Brasil'],
    ]
    for (const [latitude, longitude, mensagem] of casos) {
      const r = await enderecoDoPonto(latitude, longitude)
      expect(r.status, `${latitude}, ${longitude}`).toBe(422)
      expect(await r.json()).toEqual({ erro: { codigo: 'localizacao_invalida', mensagem } })
    }
  })

  it('sem endereço no ponto: 404 localizacao_nao_encontrada', async () => {
    falsoDoPonto()
    const r = await enderecoDoPonto('-23.557', '-46.6905')
    expect(r.status).toBe(404)
    expect(await r.json()).toEqual({
      erro: {
        codigo: 'localizacao_nao_encontrada',
        mensagem: 'Não encontramos um endereço neste ponto do mapa',
      },
    })
  })

  it('geocodificador fora do ar é 502 geocodificacao_indisponivel', async () => {
    trocar({
      enderecoDoPonto: async () => {
        throw new GeocodificacaoIndisponivel()
      },
    })
    const r = await enderecoDoPonto('-23.557', '-46.6905')
    expect(r.status).toBe(502)
    expect(await r.json()).toEqual({
      erro: {
        codigo: 'geocodificacao_indisponivel',
        mensagem: 'O serviço de mapas não respondeu, tente de novo',
      },
    })
  })

  it('guarda o resultado por ponto (6 casas), também o "não encontrado", mas não a falha', async () => {
    const pontos = falsoDoPonto({ '-23.557,-46.6905': ENDERECO_HARMONIA })
    expect((await enderecoDoPonto('-23.557', '-46.6905')).status).toBe(200)
    expect((await enderecoDoPonto('-23.5570002', '-46.6905')).status).toBe(200)
    expect((await enderecoDoPonto('-23.6', '-46.7')).status).toBe(404)
    expect((await enderecoDoPonto('-23.6', '-46.7')).status).toBe(404)
    expect(pontos).toHaveLength(2)

    let falhas = 0
    trocar({
      enderecoDoPonto: async () => {
        falhas += 1
        if (falhas === 1) throw new GeocodificacaoIndisponivel()
        return ENDERECO_HARMONIA
      },
    })
    expect((await enderecoDoPonto('-23.557', '-46.6905')).status).toBe(502)
    expect((await enderecoDoPonto('-23.557', '-46.6905')).status).toBe(200)
  })
})

describe('criarGeocodificadorNominatim', () => {
  const resposta = (corpo: unknown, status = 200) =>
    new Response(JSON.stringify(corpo), {
      status,
      headers: { 'content-type': 'application/json' },
    })

  /** Relógio falso: o teste adianta `agora`; `esperar` só anota a espera, sem esperar de verdade. */
  function relogio() {
    const estado = { agora: 1_000_000, esperas: [] as number[] }
    return {
      estado,
      agora: () => estado.agora,
      esperar: async (ms: number) => {
        estado.esperas.push(ms)
      },
    }
  }

  const NOMINATIM_OSCAR_FREIRE = [
    {
      place_id: 8954766,
      lat: '-23.5671492',
      lon: '-46.6644067',
      display_name: 'Rua Oscar Freire, Cerqueira César, São Paulo, 01426-000, Brasil',
    },
  ]

  it('consulta o Nominatim com a política de uso (User-Agent, tempo limite) e lê lat/lon', async () => {
    const pedidos: { url: string; init?: RequestInit }[] = []
    const g = criarGeocodificadorNominatim({
      ...relogio(),
      executarFetch: async (entrada, init) => {
        pedidos.push({ url: String(entrada), init })
        return resposta(NOMINATIM_OSCAR_FREIRE)
      },
    })
    expect(await g.localizar('Rua Oscar Freire, 900, Jardins, São Paulo')).toEqual(OSCAR_FREIRE)
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]!.url).toBe(
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=br&q=' +
        encodeURIComponent('Rua Oscar Freire, 900, Jardins, São Paulo'),
    )
    const headers = new Headers(pedidos[0]!.init?.headers)
    expect(headers.get('user-agent')).toBe(USER_AGENT_NOMINATIM)
    expect(USER_AGENT_NOMINATIM).toBe('KGB-RussoAssistencia/1.0 (contato no README)')
    expect(pedidos[0]!.init?.signal).toBeInstanceOf(AbortSignal)
  })

  it('lista vazia é "não encontrado" (null)', async () => {
    const g = criarGeocodificadorNominatim({
      ...relogio(),
      executarFetch: async () => resposta([]),
    })
    expect(await g.localizar('Rua Nenhuma, 1, São Paulo')).toBeNull()
  })

  it.each([
    ['fetch que rejeita (tempo limite, rede)', async () => Promise.reject(new Error('abort'))],
    ['status fora do 2xx', async () => resposta({ error: 'bloqueado' }, 429)],
    ['corpo que não é JSON', async () => new Response('<html>fora do ar</html>', { status: 200 })],
    ['JSON que não é lista', async () => resposta({ erro: true })],
    ['lat/lon que não são números', async () => resposta([{ lat: 'x', lon: '' }])],
    ['sem lat/lon', async () => resposta([{ place_id: 1 }])],
  ])('%s vira GeocodificacaoIndisponivel', async (_nome, executarFetch: typeof fetch) => {
    const g = criarGeocodificadorNominatim({ ...relogio(), executarFetch })
    await expect(g.localizar('Rua A, 1, São Paulo')).rejects.toBeInstanceOf(
      GeocodificacaoIndisponivel,
    )
  })

  it('no máximo uma requisição por segundo', async () => {
    const r = relogio()
    let consultas = 0
    const g = criarGeocodificadorNominatim({
      ...r,
      executarFetch: async () => {
        consultas += 1
        return resposta([])
      },
    })
    // Três ao mesmo tempo: a segunda sai 1 s depois da primeira, a terceira 2 s depois.
    await Promise.all([g.localizar('A'), g.localizar('B'), g.localizar('C')])
    expect(r.estado.esperas).toEqual([1000, 2000])

    // Bem depois da última: sai na hora. Logo em seguida de outra: espera 1 s.
    r.estado.agora += 5000
    await g.localizar('D')
    expect(r.estado.esperas).toEqual([1000, 2000])
    await g.localizar('E')
    expect(r.estado.esperas).toEqual([1000, 2000, 1000])
    expect(consultas).toBe(5)
  })

  it('fila longa demais (mais de 5 s de espera) responde indisponível sem consultar', async () => {
    const r = relogio()
    let consultas = 0
    const g = criarGeocodificadorNominatim({
      agora: r.agora,
      esperar: () => new Promise(() => {}), // ninguém sai da fila neste teste
      executarFetch: async () => {
        consultas += 1
        return resposta([])
      },
    })
    const naFila = Array.from({ length: 6 }, (_, i) => g.localizar(`Rua ${i}`))
    void naFila
    await expect(g.localizar('Rua 7')).rejects.toBeInstanceOf(GeocodificacaoIndisponivel)
    expect(consultas).toBe(1)
  })

  describe('enderecoDoPonto (reverse)', () => {
    /** A resposta do Nominatim reverse (jsonv2, addressdetails=1) para a Rua Harmonia, 412. */
    const REVERSE_HARMONIA = {
      place_id: 12_345,
      lat: '-23.5570000',
      lon: '-46.6905000',
      category: 'building',
      type: 'yes',
      addresstype: 'building',
      display_name:
        '412, Rua Harmonia, Vila Madalena, Pinheiros, São Paulo, Região Imediata de São Paulo, São Paulo, 05435-000, Brasil',
      address: {
        house_number: '412',
        road: 'Rua Harmonia',
        suburb: 'Vila Madalena',
        city_district: 'Pinheiros',
        city: 'São Paulo',
        municipality: 'Região Imediata de São Paulo',
        state_district: 'Região Metropolitana de São Paulo',
        state: 'São Paulo',
        'ISO3166-2-lvl4': 'BR-SP',
        region: 'Região Sudeste',
        postcode: '05435-000',
        country: 'Brasil',
        country_code: 'br',
      },
    }
    const comEndereco = (address: Record<string, string>) => ({
      ...REVERSE_HARMONIA,
      address: { country_code: 'br', ...address },
    })
    const lerPonto = async (corpo: unknown) => {
      const g = criarGeocodificadorNominatim({
        ...relogio(),
        executarFetch: async () => resposta(corpo),
      })
      return g.enderecoDoPonto({ latitude: -23.557, longitude: -46.6905 })
    }

    it('consulta o reverse com a política de uso e lê o endereço', async () => {
      const pedidos: { url: string; init?: RequestInit }[] = []
      const g = criarGeocodificadorNominatim({
        ...relogio(),
        executarFetch: async (entrada, init) => {
          pedidos.push({ url: String(entrada), init })
          return resposta(REVERSE_HARMONIA)
        },
      })
      expect(await g.enderecoDoPonto({ latitude: -23.557, longitude: -46.6905 })).toEqual({
        cep: '05435000',
        logradouro: 'Rua Harmonia',
        numero: '412',
        bairro: 'Vila Madalena',
        cidade: 'São Paulo',
        uf: 'SP',
      })
      expect(pedidos).toHaveLength(1)
      expect(pedidos[0]!.url).toBe(
        'https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&lat=-23.557&lon=-46.6905',
      )
      const headers = new Headers(pedidos[0]!.init?.headers)
      expect(headers.get('user-agent')).toBe(USER_AGENT_NOMINATIM)
      expect(headers.get('accept-language')).toBe('pt-BR')
      expect(pedidos[0]!.init?.signal).toBeInstanceOf(AbortSignal)
    })

    it('o que falta vem null; o CEP só com 8 dígitos', async () => {
      expect(await lerPonto(comEndereco({ road: 'Rua Harmonia', postcode: '05435' }))).toEqual({
        cep: null,
        logradouro: 'Rua Harmonia',
        numero: null,
        bairro: null,
        cidade: null,
        uf: null,
      })
      const doisCeps = await lerPonto(
        comEndereco({ road: 'Rua A', postcode: '05435-000;05435-001', house_number: '12;14' }),
      )
      expect(doisCeps).toMatchObject({ cep: '05435000', numero: '12' })
    })

    it('bairro, cidade e rua: na falta de um nome, os seguintes', async () => {
      expect(
        await lerPonto(
          comEndereco({
            pedestrian: 'Calçadão da Rua A',
            neighbourhood: 'Jardim Um',
            city_district: 'Distrito',
            town: 'Embu das Artes',
            municipality: 'Região Imediata',
            state: 'São Paulo',
          }),
        ),
      ).toMatchObject({
        logradouro: 'Calçadão da Rua A',
        bairro: 'Jardim Um',
        cidade: 'Embu das Artes',
        uf: 'SP',
      })
      expect(
        await lerPonto(comEndereco({ road: 'Rua B', quarter: 'Setor Sul', village: 'Vila Rural' })),
      ).toMatchObject({ bairro: 'Setor Sul', cidade: 'Vila Rural' })
    })

    it('a UF vem do código ISO; sem ele, do nome do estado', async () => {
      expect(
        await lerPonto(comEndereco({ road: 'Rua C', state: 'Rio de Janeiro', city: 'Niterói' })),
      ).toMatchObject({ uf: 'RJ' })
      expect(
        await lerPonto(comEndereco({ road: 'Rua C', 'ISO3166-2-lvl4': 'BR-MG', state: 'X' })),
      ).toMatchObject({ uf: 'MG' })
    })

    it('"Unable to geocode", outro país ou nenhum dado de endereço é "não encontrado" (null)', async () => {
      expect(await lerPonto({ error: 'Unable to geocode' })).toBeNull()
      expect(
        await lerPonto({ ...REVERSE_HARMONIA, address: { road: 'Ruta 5', country_code: 'uy' } }),
      ).toBeNull()
      expect(await lerPonto(comEndereco({ state: 'São Paulo', country: 'Brasil' }))).toBeNull()
    })

    it.each([
      ['fetch que rejeita (tempo limite, rede)', async () => Promise.reject(new Error('abort'))],
      ['status fora do 2xx', async () => resposta({ error: 'bloqueado' }, 429)],
      ['corpo que não é JSON', async () => new Response('<html>fora do ar</html>')],
      ['JSON que não é objeto', async () => resposta([REVERSE_HARMONIA])],
      ['sem address nem error', async () => resposta({ place_id: 1 })],
    ])('%s vira GeocodificacaoIndisponivel', async (_nome, executarFetch: typeof fetch) => {
      const g = criarGeocodificadorNominatim({ ...relogio(), executarFetch })
      await expect(
        g.enderecoDoPonto({ latitude: -23.557, longitude: -46.6905 }),
      ).rejects.toBeInstanceOf(GeocodificacaoIndisponivel)
    })

    it('divide com a busca de endereços o limite de uma requisição por segundo', async () => {
      const r = relogio()
      const g = criarGeocodificadorNominatim({
        ...r,
        executarFetch: async (entrada) =>
          resposta(String(entrada).includes('/reverse') ? REVERSE_HARMONIA : []),
      })
      const ponto = { latitude: -23.557, longitude: -46.6905 }
      await Promise.all([g.localizar('A'), g.enderecoDoPonto(ponto), g.localizar('B')])
      expect(r.estado.esperas).toEqual([1000, 2000])
    })
  })
})
