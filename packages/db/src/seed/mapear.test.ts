import { beforeAll, describe, expect, it, vi } from 'vitest'
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, mapearDadosPrototipo, type DadosSeed } from './mapear'
import { carregarDadosPrototipo, type DadosPrototipo } from './prototipo'

function contarStatus(lista: { status?: string | null }[]) {
  const contagem: Record<string, number> = {}
  for (const item of lista) contagem[item.status!] = (contagem[item.status!] ?? 0) + 1
  return contagem
}

describe('mapearDadosPrototipo', () => {
  let prototipo: DadosPrototipo
  let seed: DadosSeed

  beforeAll(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-28T12:00:00-03:00'))
    prototipo = carregarDadosPrototipo()
    seed = mapearDadosPrototipo(prototipo)
    vi.useRealTimers()
  })

  it('traz os 8 tipos de demanda do handoff com seus checklists', () => {
    expect(seed.tipos.map((t) => t.nome)).toEqual([
      'Vazamento',
      'Revisão elétrica',
      'Ponto de luz',
      'Troca de disjuntor',
      'Pintura',
      'Reparo em gesso',
      'Limpeza de ar-condicionado',
      'Chaveiro',
    ])
    expect(seed.tipos[0]?.checklist).toHaveLength(5)
  })

  it('normaliza documento e telefone para dígitos e mantém as especialidades', () => {
    const carlos = seed.prestadores.find((p) => p.dados.id === 'p1')
    expect(carlos?.dados.documento).toBe('31840211750')
    expect(carlos?.dados.telefone).toBe('11987342210')
    expect(carlos?.especialidades).toEqual(['t1', 't2', 't3', 't4'])
  })

  it('gera um acionamento por linha do protótipo, numerado a partir de 1001', () => {
    expect(seed.acionamentos).toHaveLength(prototipo.acs.length)
    expect(seed.acionamentos.map((a) => a.numero)).toEqual(prototipo.acs.map((_, i) => 1001 + i))
  })

  it('preserva a distribuição de status do protótipo', () => {
    expect(contarStatus(seed.acionamentos)).toEqual(contarStatus(prototipo.acs))
    expect(contarStatus(seed.acionamentos).aguardando).toBe(3)
  })

  it('copia as etapas de cada demanda (snapshot do checklist)', () => {
    const etapasPrototipo = prototipo.acs.flatMap((a) => a.demandas.flatMap((d) => d.steps))
    expect(seed.etapas).toHaveLength(etapasPrototipo.length)
  })

  it('grava as fotos de exemplo como placeholders coloridos', () => {
    expect(seed.fotos.length).toBeGreaterThan(0)
    expect(seed.fotos.every((f) => /^placeholder:#[0-9A-F]{6}$/i.test(f.storageKey))).toBe(true)
  })

  it('monta a linha do tempo de uma reprovação seguida de aprovação', () => {
    const acionamento = seed.acionamentos.find((a) => a.titulo === 'Reparo no forro da sala')!
    const tipos = seed.eventos
      .filter((e) => e.acionamentoId === acionamento.id)
      .sort((x, y) => new Date(x.em!).getTime() - new Date(y.em!).getTime())
      .map((e) => e.tipo)
    expect(tipos).toEqual(['criado', 'iniciado', 'enviado', 'reprovado', 'enviado', 'aprovado'])
  })

  it('registra a inviabilidade com motivo, evento e foto', () => {
    const acionamento = seed.acionamentos.find((a) => a.titulo === 'Ponto de luz na garagem')!
    expect(acionamento.inviavel).toBe(true)
    expect(acionamento.inviabilidadeComentario).toMatch(/laje protendida/)
    const tipos = seed.eventos.filter((e) => e.acionamentoId === acionamento.id).map((e) => e.tipo)
    expect(tipos).toContain('inviabilidade_enviada')
    expect(
      seed.fotos.some((f) => f.acionamentoId === acionamento.id && f.contexto === 'inviabilidade'),
    ).toBe(true)
  })

  it('dá a categoria do spec a cada um dos 8 tipos', () => {
    expect(seed.tipos.map((t) => [t.nome, t.categoria])).toEqual([
      ['Vazamento', 'Hidráulica'],
      ['Revisão elétrica', 'Elétrica'],
      ['Ponto de luz', 'Elétrica'],
      ['Troca de disjuntor', 'Elétrica'],
      ['Pintura', 'Acabamento'],
      ['Reparo em gesso', 'Acabamento'],
      ['Limpeza de ar-condicionado', 'Climatização'],
      ['Chaveiro', 'Segurança'],
    ])
  })

  it('deriva um assinante ativo por cliente distinto, com endereço separado e CEP do bairro', () => {
    expect(seed.assinantes).toHaveLength(14)
    expect(seed.assinantes[0]).toEqual({
      id: 'a1',
      nome: 'Loja Casa Bela',
      cep: '01426002',
      logradouro: 'Rua Oscar Freire',
      numero: '900',
      complemento: null,
      bairro: 'Jardins',
      cidade: 'São Paulo',
      status: 'ativo',
    })
    expect(new Set(seed.assinantes.map((a) => a.nome)).size).toBe(14)
    expect(seed.assinantes.every((a) => /^\d{8}$/.test(a.cep))).toBe(true)
    expect(seed.assinantes.every((a) => a.status === 'ativo')).toBe(true)
  })

  it('cada assinante fica no endereço dos acionamentos do próprio cliente, com o CEP do trecho', () => {
    // Os acionamentos gerados ao acaso no protótipo sorteiam cliente e endereço separados: o
    // endereço vem dos escritos à mão (o primeiro de cada cliente), e o CEP é o do trecho da rua.
    const endereco = (a: DadosSeed['assinantes'][number]) =>
      `${a.logradouro}, ${a.numero} · ${a.bairro}`
    expect(seed.assinantes.map((a) => [a.nome, endereco(a), a.cep])).toEqual([
      ['Loja Casa Bela', 'Rua Oscar Freire, 900 · Jardins', '01426002'],
      ['Clínica Vida', 'Av. Paulista, 1578 · Bela Vista', '01310200'],
      ['Residência Souza', 'Rua Tupi, 221 · Santa Cecília', '01233001'],
      ['Hotel Ipê', 'Rua Frei Caneca, 569 · Consolação', '01307001'],
      ['Mercado Bom Preço', 'Av. Sumaré, 1100 · Perdizes', '05016110'],
      ['Padaria Pão Dourado', 'Rua Cardeal Arcoverde, 820 · Pinheiros', '05408001'],
      ['Academia Forma', 'Rua Augusta, 1492 · Consolação', '01304001'],
      ['Colégio Aprender', 'Rua Apinajés, 1500 · Perdizes', '05017000'],
      ['Edifício Aurora', 'Rua Harmonia, 410 · Vila Madalena', '05435000'],
      ['Escritório Nunes & Lima', 'Av. Faria Lima, 3144 · Itaim Bibi', '04538132'],
      ['Residencial Monte Verde', 'Rua Vergueiro, 2045 · Vila Mariana', '04101000'],
      ['Condomínio Parque das Flores', 'Av. Sumaré, 1100 · Perdizes', '05016110'],
      ['Residência Martins', 'Rua Teodoro Sampaio, 1020 · Pinheiros', '05406050'],
      ['Residência Alves', 'Rua Cayowaá, 740 · Perdizes', '05018001'],
    ])
    for (const a of seed.assinantes) {
      expect(
        prototipo.acs.some((ac) => ac.client === a.nome && ac.address === endereco(a)),
        `${a.nome}: ${endereco(a)} não é de um acionamento do cliente`,
      ).toBe(true)
    }
  })

  it('liga cada acionamento ao assinante do cliente', () => {
    const porNome = new Map(seed.assinantes.map((a) => [a.nome, a.id]))
    expect(seed.acionamentos.length).toBeGreaterThan(0)
    expect(seed.acionamentos.every((a) => a.assinanteId === porNome.get(a.cliente!))).toBe(true)
  })

  it('dá um CEP plausível da região a cada prestador', () => {
    expect(seed.prestadores.map((p) => p.dados.cep)).toEqual([
      '05422001',
      '04010000',
      '01001000',
      '05018000',
      '02011000',
      '03071000',
    ])
  })

  it('só a gestora e o prestador de dev recebem senha', () => {
    const comSenha = seed.usuarios
      .filter((u) => u.comSenha)
      .map((u) => [u.email, u.papel, u.prestadorId])
    expect(comSenha).toEqual([
      [GESTORA_DEV.email, 'gestor', null],
      [EMAIL_PRESTADOR_DEV, 'prestador', 'p1'],
    ])
    expect(seed.usuarios.filter((u) => u.papel === 'prestador')).toHaveLength(6)
  })
})
