import { describe, expect, it } from 'vitest'
import { ASSINANTES, PRESTADORES, TIPOS } from '../../../test/fixtures'
import {
  alternarTipo,
  camposDoPonto,
  CENTRO_SAO_PAULO,
  cepDeReferencia,
  chaveDaLocalizacao,
  cidadeForaDaCapital,
  corpoDoFormulario,
  digitosCep,
  enderecoDoFormulario,
  enderecoDoMapa,
  erroDoCep,
  filtrarPrestadores,
  formatarCep,
  formularioInicial,
  formularioValido,
  gruposDeTipos,
  montarEndereco,
  posicaoConhecida,
  prestadorMaisProximo,
  prestadorPadrao,
  previaChecklist,
  rotuloContagem,
  rotuloPrestador,
  tipoDoEnter,
  ufDoCep,
  type FormularioAcionamento,
} from './formulario'

const aurora = ASSINANTES.find((a) => a.id === 'a1')!

const valido = (dados: Partial<FormularioAcionamento> = {}): FormularioAcionamento => ({
  ...formularioInicial('2026-09-28', PRESTADORES),
  titulo: 'Vazamento no banheiro social',
  tipoIds: ['t1'],
  assinante: aurora,
  ...dados,
})

/** Atendimento em outro endereço, com o CEP já consultado. */
const outroEndereco = (dados: Partial<FormularioAcionamento> = {}) =>
  valido({
    outroEndereco: true,
    cep: '01310-200',
    logradouro: 'Avenida Paulista',
    numero: '1578',
    bairro: 'Bela Vista',
    cidade: 'São Paulo',
    ...dados,
  })

describe('formulário do Novo acionamento', () => {
  it('abre com hoje, 09:00–11:00, sem cliente e com o Carlos (p1)', () => {
    expect(formularioInicial('2026-09-28', PRESTADORES)).toEqual({
      titulo: '',
      tipoIds: [],
      assinante: null,
      outroEndereco: false,
      cep: '',
      cepInexistente: false,
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      prestadorId: 'p1',
      localizacao: null,
      pinoMovido: false,
    })
  })

  it('sem o Carlos entre os ativos, escolhe o primeiro; sem prestadores, nenhum', () => {
    expect(prestadorPadrao(PRESTADORES.filter((p) => p.id !== 'p1'))).toBe('p2')
    expect(prestadorPadrao([])).toBe('')
  })

  it('é válido com título, tipo, cliente escolhido, data, início < fim e prestador', () => {
    expect(formularioValido(valido())).toBe(true)
  })

  it.each([
    ['título vazio', { titulo: '   ' }],
    ['sem tipo', { tipoIds: [] }],
    ['sem cliente escolhido', { assinante: null }],
    ['sem data', { data: '' }],
    ['início igual ao fim', { inicio: '11:00', fim: '11:00' }],
    ['início depois do fim', { inicio: '14:00', fim: '09:30' }],
    ['sem prestador', { prestadorId: '' }],
  ])('é inválido com %s', (_, dados) => {
    expect(formularioValido(valido(dados))).toBe(false)
  })

  describe('em outro endereço', () => {
    it('é válido com CEP de 8 dígitos, rua e número (complemento e bairro são opcionais)', () => {
      expect(formularioValido(outroEndereco())).toBe(true)
      expect(formularioValido(outroEndereco({ bairro: '', complemento: '' }))).toBe(true)
    })
    it.each([
      ['CEP incompleto', { cep: '01310-20' }],
      ['sem CEP', { cep: '' }],
      ['sem rua', { logradouro: ' ' }],
      ['sem número', { numero: '  ' }],
      ['CEP que não existe (404 da consulta)', { cepInexistente: true }],
    ])('é inválido com %s', (_, dados) => {
      expect(formularioValido(outroEndereco(dados))).toBe(false)
    })
    it('o CEP inexistente só conta em outro endereço', () => {
      expect(formularioValido(valido({ cepInexistente: true }))).toBe(true)
    })
  })

  it('liga e desliga um tipo, guardando a ordem de escolha', () => {
    expect(alternarTipo(['t1'], 't6')).toEqual(['t1', 't6'])
    expect(alternarTipo(['t1', 't6'], 't1')).toEqual(['t6'])
  })

  it('monta a prévia do checklist na ordem de escolha, com a contagem', () => {
    const previa = previaChecklist(TIPOS, ['t6', 't1'])
    expect(previa.map((t) => [t.nome, t.etapas.length])).toEqual([
      ['Reparo em gesso', 4],
      ['Vazamento', 5],
    ])
    expect(rotuloContagem(previa)).toBe('9 itens no checklist')
    expect(rotuloContagem([])).toBe('0 itens no checklist')
    expect(rotuloContagem(previaChecklist(TIPOS, ['t9']))).toBe('1 item no checklist')
  })

  it('rótulo do prestador: "Nome · Região", ou só o nome sem região', () => {
    expect(PRESTADORES.map(rotuloPrestador)).toEqual([
      'Ana Ribeiro · Zona Sul',
      'Carlos Mendes · Zona Oeste',
      'Pedro Lima',
    ])
  })
})

describe('busca de tipos', () => {
  const nomes = (grupos: ReturnType<typeof gruposDeTipos>) =>
    grupos.map((g) => [g.categoria, g.tipos.map((t) => t.nome)])

  it('agrupa por categoria em ordem alfabética, com "Outros" (sem categoria) no fim', () => {
    expect(nomes(gruposDeTipos(TIPOS, ''))).toEqual([
      ['Acabamento', ['Reparo em gesso']],
      ['Elétrica', ['Revisão elétrica']],
      ['Hidráulica', ['Vazamento']],
      ['Outros', ['Vistoria']],
    ])
  })

  it('filtra pelo nome do tipo, sem acentos e sem maiúsculas', () => {
    expect(nomes(gruposDeTipos(TIPOS, '  ELETRICA '))).toEqual([['Elétrica', ['Revisão elétrica']]])
    expect(nomes(gruposDeTipos(TIPOS, 'gesso'))).toEqual([['Acabamento', ['Reparo em gesso']]])
  })

  it('filtra pelo nome da categoria (inclusive "Outros")', () => {
    expect(nomes(gruposDeTipos(TIPOS, 'hidraul'))).toEqual([['Hidráulica', ['Vazamento']]])
    expect(nomes(gruposDeTipos(TIPOS, 'outros'))).toEqual([['Outros', ['Vistoria']]])
  })

  it('sem resultado, nenhum grupo', () => {
    expect(gruposDeTipos(TIPOS, 'jardinagem')).toEqual([])
  })

  it('o Enter liga o primeiro que casa pelo nome; sem nenhum, o primeiro pela categoria', () => {
    const tipos = [...TIPOS, { ...TIPOS[1]!, id: 't3', nome: 'Ponto de luz' }]
    const doEnter = (busca: string) => tipoDoEnter(gruposDeTipos(tipos, busca), busca)?.nome
    expect(doEnter('eletr')).toBe('Revisão elétrica')
    expect(doEnter('ELÉTRICA')).toBe('Revisão elétrica')
    expect(doEnter('hidraul')).toBe('Vazamento')
    expect(doEnter('jardim')).toBeUndefined()
  })

  it('ordena os tipos pelo nome dentro da categoria', () => {
    const eletricos = [
      { ...TIPOS[1]!, id: 'x1', nome: 'Troca de disjuntor' },
      { ...TIPOS[1]!, id: 'x2', nome: 'Ponto de luz' },
      TIPOS[1]!,
    ]
    expect(nomes(gruposDeTipos(eletricos, ''))).toEqual([
      ['Elétrica', ['Ponto de luz', 'Revisão elétrica', 'Troca de disjuntor']],
    ])
  })
})

describe('busca de prestadores', () => {
  it('filtra por nome ou região, sem acentos, mantendo a ordem da API (proximidade)', () => {
    expect(filtrarPrestadores(PRESTADORES, '').map((p) => p.id)).toEqual(['p2', 'p1', 'p7'])
    expect(filtrarPrestadores(PRESTADORES, 'oeste').map((p) => p.id)).toEqual(['p1'])
    expect(filtrarPrestadores(PRESTADORES, 'LIMA').map((p) => p.id)).toEqual(['p7'])
    expect(filtrarPrestadores(PRESTADORES, 'xyz')).toEqual([])
  })

  it('o mais próximo é o primeiro da lista do CEP, só quando ele tem CEP', () => {
    expect(prestadorMaisProximo('01310200', PRESTADORES)).toBe('p2')
    expect(prestadorMaisProximo('', PRESTADORES)).toBeUndefined()
    const semCep = PRESTADORES.map((p) => ({ ...p, cep: null }))
    expect(prestadorMaisProximo('01310200', semCep)).toBeUndefined()
    expect(prestadorMaisProximo('01310200', [])).toBeUndefined()
  })
})

describe('CEP e endereço', () => {
  it('só os dígitos, no máximo 8', () => {
    expect(digitosCep(' 01310-200 ')).toBe('01310200')
    expect(digitosCep('013102009')).toBe('01310200')
  })

  it('formata com hífen a partir do sexto dígito', () => {
    expect(formatarCep('01310200')).toBe('01310-200')
    expect(formatarCep('013102')).toBe('01310-2')
    expect(formatarCep('01310')).toBe('01310')
    expect(formatarCep('')).toBe('')
  })

  it('erro só para CEP começado e incompleto', () => {
    expect(erroDoCep('')).toBe('')
    expect(erroDoCep('01310-200')).toBe('')
    expect(erroDoCep('0131')).toBe('Informe um CEP com 8 dígitos')
  })

  it('monta o endereço no formato do protótipo, com o complemento depois do número', () => {
    const base = { logradouro: 'Avenida Paulista', numero: '1578', bairro: 'Bela Vista' }
    expect(montarEndereco({ ...base, complemento: '' })).toBe('Avenida Paulista, 1578 · Bela Vista')
    expect(montarEndereco({ ...base, complemento: ' conj. 12 ' })).toBe(
      'Avenida Paulista, 1578, conj. 12 · Bela Vista',
    )
    expect(montarEndereco({ ...base, bairro: '', complemento: '' })).toBe('Avenida Paulista, 1578')
  })

  it('o endereço e o CEP são os do assinante, ou os digitados em outro endereço', () => {
    expect(enderecoDoFormulario(valido())).toBe('Rua Harmonia, 410 · Vila Madalena')
    expect(cepDeReferencia(valido())).toBe('05433000')
    expect(enderecoDoFormulario(valido({ assinante: null }))).toBe('')
    expect(cepDeReferencia(valido({ assinante: null }))).toBe('')

    const outro = outroEndereco({ complemento: 'sala 3' })
    expect(enderecoDoFormulario(outro)).toBe('Avenida Paulista, 1578, sala 3 · Bela Vista')
    expect(cepDeReferencia(outro)).toBe('01310200')
    expect(cepDeReferencia(outroEndereco({ cep: '0131' }))).toBe('')
  })

  it.each([
    ['01310200', 'SP'],
    ['06010000', 'SP'],
    ['19999999', 'SP'],
    ['20040002', 'RJ'],
    ['29000000', 'ES'],
    ['30130010', 'MG'],
    ['40010000', 'BA'],
    ['49000000', 'SE'],
    ['50010000', 'PE'],
    ['57000000', 'AL'],
    ['58000000', 'PB'],
    ['59000000', 'RN'],
    ['60000000', 'CE'],
    ['64000000', 'PI'],
    ['65000000', 'MA'],
    ['66000000', 'PA'],
    ['68900000', 'AP'],
    ['69000000', 'AM'],
    ['69301000', 'RR'],
    ['69400000', 'AM'],
    ['69900000', 'AC'],
    ['70040010', 'DF'],
    ['72800000', 'GO'],
    ['73000000', 'DF'],
    ['73700000', 'GO'],
    ['76801000', 'RO'],
    ['77000000', 'TO'],
    ['78000000', 'MT'],
    ['79000000', 'MS'],
    ['80010000', 'PR'],
    ['88010000', 'SC'],
    ['90010000', 'RS'],
    ['00999999', ''],
    ['0131', ''],
  ])('a UF sai da faixa de CEP dos Correios: %s → "%s"', (cep, uf) => {
    expect(ufDoCep(cep)).toBe(uf)
  })

  it('a cidade só entra no endereço fora da capital, com a UF', () => {
    expect(cidadeForaDaCapital('Osasco', '06010-000')).toBe('Osasco - SP')
    expect(cidadeForaDaCapital(' Niterói ', '24020000')).toBe('Niterói - RJ')
    expect(cidadeForaDaCapital('São Paulo', '01310200')).toBe('')
    expect(cidadeForaDaCapital('sao paulo', '01310200')).toBe('')
    expect(cidadeForaDaCapital('', '06010000')).toBe('')
  })

  it('com outra cidade, o endereço termina com "Cidade - UF"', () => {
    const base = { logradouro: 'Rua X', numero: '12', complemento: '', bairro: 'Centro' }
    expect(montarEndereco({ ...base, cidade: 'Osasco - SP' })).toBe(
      'Rua X, 12 · Centro · Osasco - SP',
    )
    expect(montarEndereco({ ...base, bairro: '', cidade: 'Osasco - SP' })).toBe(
      'Rua X, 12 · Osasco - SP',
    )

    const osasco = outroEndereco({ cep: '06010-000', ...base, cidade: 'Osasco' })
    expect(enderecoDoFormulario(osasco)).toBe('Rua X, 12 · Centro · Osasco - SP')
    expect(enderecoDoMapa({ ...osasco, complemento: 'casa 2' })).toBe(
      'Rua X, 12 · Centro · Osasco - SP',
    )
    expect(corpoDoFormulario(osasco).endereco).toBe('Rua X, 12 · Centro · Osasco - SP')

    // O assinante de outra cidade também: o endereço de exibição da API não traz a cidade.
    const deOsasco = valido({
      assinante: { ...aurora, cep: '06010000', cidade: 'Osasco', endereco: 'Rua X, 12 · Centro' },
    })
    expect(enderecoDoFormulario(deOsasco)).toBe('Rua X, 12 · Centro · Osasco - SP')
    expect(enderecoDoMapa(deOsasco)).toBe('Rua X, 12 · Centro · Osasco - SP')
  })

  it('o mapa usa o endereço sem o complemento, e só com rua e número', () => {
    expect(enderecoDoMapa(valido())).toBe('Rua Harmonia, 410 · Vila Madalena')
    expect(enderecoDoMapa(outroEndereco({ complemento: 'sala 3' }))).toBe(
      'Avenida Paulista, 1578 · Bela Vista',
    )
    expect(enderecoDoMapa(outroEndereco({ numero: '' }))).toBe('')
    expect(enderecoDoMapa(valido({ assinante: null }))).toBe('')
  })
})

describe('corpo do POST', () => {
  it('manda o assinante, o endereço dele, o CEP e os textos aparados', () => {
    expect(corpoDoFormulario(valido({ titulo: '  Vazamento ' }))).toEqual({
      titulo: 'Vazamento',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      assinanteId: 'a1',
      cep: '05433000',
      data: '2026-09-28',
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
    })
  })

  it('em outro endereço, manda o endereço montado e o CEP digitado', () => {
    expect(
      corpoDoFormulario(outroEndereco({ numero: ' 1578 ', complemento: ' sala 3 ' })),
    ).toMatchObject({
      cliente: 'Edifício Aurora',
      endereco: 'Avenida Paulista, 1578, sala 3 · Bela Vista',
      assinanteId: 'a1',
      cep: '01310200',
    })
  })
})

describe('localização conferida no mapa', () => {
  const conferida = { latitude: -23.556789, longitude: -46.690123 }
  const auroraNoMapa = { ...aurora, latitude: -23.5571, longitude: -46.6912 }

  it('o POST leva latitude e longitude só quando a localização foi conferida', () => {
    expect(corpoDoFormulario(valido())).not.toHaveProperty('latitude')
    expect(corpoDoFormulario(valido())).not.toHaveProperty('longitude')
    expect(corpoDoFormulario(valido({ localizacao: conferida }))).toMatchObject(conferida)
  })

  it('o mapa abre na conferida; sem ela, na do assinante (só no endereço dele)', () => {
    expect(posicaoConhecida(valido({ localizacao: conferida }))).toEqual(conferida)
    expect(posicaoConhecida(valido({ assinante: auroraNoMapa }))).toEqual({
      latitude: -23.5571,
      longitude: -46.6912,
    })
    expect(posicaoConhecida(valido({ assinante: auroraNoMapa, localizacao: conferida }))).toEqual(
      conferida,
    )
    // Em outro endereço, a posição do assinante não vale; sem nenhuma, o mapa procura o endereço.
    expect(posicaoConhecida(outroEndereco({ assinante: auroraNoMapa }))).toBeNull()
    expect(posicaoConhecida(valido())).toBeNull()
    expect(posicaoConhecida(valido({ assinante: { ...aurora, latitude: -23.5 } }))).toBeNull()
    expect(posicaoConhecida(valido({ assinante: null }))).toBeNull()
  })

  it('o centro de São Paulo é a posição sem endereço no mapa', () => {
    expect(CENTRO_SAO_PAULO.latitude).toBeCloseTo(-23.55, 1)
    expect(CENTRO_SAO_PAULO.longitude).toBeCloseTo(-46.63, 1)
  })

  it('a chave muda com o cliente, com o CEP e com o endereço em uso (a conferida é descartada)', () => {
    const base = chaveDaLocalizacao(outroEndereco())
    // Não mudam o lugar: complemento, título, horários, prestador e a própria localização.
    expect(
      chaveDaLocalizacao(
        outroEndereco({
          complemento: 'sala 3',
          titulo: 'Outro',
          inicio: '10:00',
          prestadorId: 'p2',
          localizacao: conferida,
        }),
      ),
    ).toBe(base)
    expect(chaveDaLocalizacao(outroEndereco({ cep: '01310-201' }))).not.toBe(base)
    expect(chaveDaLocalizacao(outroEndereco({ numero: '1579' }))).not.toBe(base)
    expect(chaveDaLocalizacao(outroEndereco({ assinante: ASSINANTES[0]! }))).not.toBe(base)
    expect(chaveDaLocalizacao(outroEndereco({ outroEndereco: false }))).not.toBe(base)
    // No endereço do assinante, trocar de cliente muda a chave; o mesmo cliente, não.
    expect(chaveDaLocalizacao(valido({ assinante: { ...aurora } }))).toBe(
      chaveDaLocalizacao(valido()),
    )
    expect(chaveDaLocalizacao(valido({ assinante: ASSINANTES[2]! }))).not.toBe(
      chaveDaLocalizacao(valido()),
    )
  })

  it('o outro endereço preenchido pelo ponto do pino: CEP formatado, sem complemento', () => {
    expect(
      camposDoPonto({
        cep: '05435000',
        logradouro: 'Rua Harmonia',
        numero: '412',
        bairro: 'Vila Madalena',
        cidade: 'São Paulo',
        uf: 'SP',
      }),
    ).toEqual({
      cep: '05435-000',
      logradouro: 'Rua Harmonia',
      numero: '412',
      complemento: '',
      bairro: 'Vila Madalena',
      cidade: 'São Paulo',
    })
    // O que o mapa não sabe (ou a consulta que falhou) fica vazio, para a gestora completar.
    const vazio = { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '' }
    expect(camposDoPonto(null)).toEqual(vazio)
    expect(
      camposDoPonto({
        cep: null,
        logradouro: null,
        numero: null,
        bairro: null,
        cidade: null,
        uf: null,
      }),
    ).toEqual(vazio)
  })
})
