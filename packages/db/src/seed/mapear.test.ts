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
