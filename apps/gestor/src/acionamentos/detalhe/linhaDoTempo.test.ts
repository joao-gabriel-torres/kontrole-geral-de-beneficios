import { describe, expect, it } from 'vitest'
import { CORES_HISTORICO, montarLinhaDoTempo } from './linhaDoTempo'

const ev = (tipo: string, em: string, motivo: string | null = null) =>
  ({ tipo, em, motivo }) as Parameters<typeof montarLinhaDoTempo>[0][number]

describe('linha do tempo do Detalhe', () => {
  it('usa os rótulos do protótipo e a data de São Paulo', () => {
    const itens = montarLinhaDoTempo([
      ev('criado', '2026-09-22T19:20:00.000Z'),
      ev('iniciado', '2026-09-24T13:00:00.000Z'),
      ev('enviado', '2026-09-24T15:10:00.000Z'),
      ev('reprovado', '2026-09-24T16:40:00.000Z', 'A foto final não mostra o retoque da pintura.'),
      ev('enviado', '2026-09-24T17:40:00.000Z'),
      ev('aprovado', '2026-09-24T19:10:00.000Z'),
    ])
    expect(itens).toEqual([
      { titulo: 'Acionamento criado', quando: '22/09 · 16:20', nota: null, cor: '#ADB3BC' },
      { titulo: 'Atendimento iniciado', quando: '24/09 · 10:00', nota: null, cor: '#ADB3BC' },
      { titulo: 'Enviado para aprovação', quando: '24/09 · 12:10', nota: null, cor: '#ADB3BC' },
      {
        titulo: 'Reprovado',
        quando: '24/09 · 13:40',
        nota: 'A foto final não mostra o retoque da pintura.',
        cor: '#FF6A5D',
      },
      { titulo: 'Reenviado para aprovação', quando: '24/09 · 14:40', nota: null, cor: '#ADB3BC' },
      { titulo: 'Aprovado', quando: '24/09 · 16:10', nota: null, cor: '#0069BD' },
    ])
    expect(CORES_HISTORICO).toEqual({
      aprovado: '#0069BD',
      reprovado: '#FF6A5D',
      neutro: '#ADB3BC',
    })
  })

  it('uma inviabilidade recusada conta como envio: o envio seguinte é reenvio', () => {
    const titulos = montarLinhaDoTempo([
      ev('criado', '2026-09-20T12:00:00.000Z'),
      ev('inviabilidade_enviada', '2026-09-21T12:00:00.000Z'),
      ev('reprovado', '2026-09-21T13:00:00.000Z', 'Dá para fazer, sim.'),
      ev('enviado', '2026-09-21T15:00:00.000Z'),
    ]).map((i) => i.titulo)
    expect(titulos).toEqual([
      'Acionamento criado',
      'Inviabilidade enviada',
      'Reprovado',
      'Reenviado para aprovação',
    ])
  })

  it('mostra a observação de uma aprovação, quando houver', () => {
    const [item] = montarLinhaDoTempo([ev('aprovado', '2026-09-24T19:10:00.000Z', 'Ficou ótimo.')])
    expect(item!.nota).toBe('Ficou ótimo.')
  })

  it('ordena por data; no mesmo instante, segue a ordem natural do fluxo', () => {
    const titulos = montarLinhaDoTempo([
      ev('inviabilidade_enviada', '2026-09-25T12:30:00.000Z'),
      ev('aprovado', '2026-09-25T14:00:00.000Z'),
      ev('iniciado', '2026-09-25T12:30:00.000Z'),
      ev('criado', '2026-09-23T19:20:00.000Z'),
    ]).map((i) => i.titulo)
    expect(titulos).toEqual([
      'Acionamento criado',
      'Atendimento iniciado',
      'Inviabilidade enviada',
      'Aprovado',
    ])
  })
})
