import { describe, expect, it } from 'vitest'
import { detalhe } from '../../../test/fixtures'
import { MENSAGENS_REVISAO, prepararRevisao, rotulosDecisao, ultimaDecisao } from './decisao'

describe('rótulos da decisão', () => {
  it('conclusão normal', () => {
    expect(rotulosDecisao(false)).toEqual({
      titulo: 'Confira e decida',
      aprovar: 'Aprovar conclusão',
      reprovar: 'Reprovar',
    })
  })
  it('inviabilidade em análise', () => {
    expect(rotulosDecisao(true)).toEqual({
      titulo: 'O prestador marcou como inviável',
      aprovar: 'Confirmar inviabilidade',
      reprovar: 'Recusar inviabilidade',
    })
  })
})

describe('prepararRevisao', () => {
  it('reprovar exige motivo (espaços não contam)', () => {
    expect(prepararRevisao('reprovado', '   ')).toEqual({
      ok: false,
      mensagem: 'Escreva o motivo da reprovação',
    })
  })
  it('reprovar com motivo manda o motivo aparado', () => {
    expect(prepararRevisao('reprovado', '  Falta a foto do quadro. ')).toEqual({
      ok: true,
      corpo: { decisao: 'reprovado', motivo: 'Falta a foto do quadro.' },
    })
  })
  it('aprovar dispensa a observação e a manda quando existe', () => {
    expect(prepararRevisao('aprovado', '')).toEqual({ ok: true, corpo: { decisao: 'aprovado' } })
    expect(prepararRevisao('aprovado', 'Ficou ótimo')).toEqual({
      ok: true,
      corpo: { decisao: 'aprovado', motivo: 'Ficou ótimo' },
    })
  })
  it('mensagens dos toasts', () => {
    expect(MENSAGENS_REVISAO).toEqual({
      aprovado: 'Conclusão aprovada',
      reprovado: 'Devolvido ao prestador para correção',
      semMotivo: 'Escreva o motivo da reprovação',
    })
  })
})

describe('ultimaDecisao', () => {
  const revisoes = [
    {
      decisao: 'reprovado' as const,
      motivo: 'A foto final não mostra o retoque.',
      em: '2026-09-24T16:40:00.000Z',
    },
    { decisao: 'aprovado' as const, motivo: null, em: '2026-09-24T19:10:00.000Z' },
  ]
  it('mostra a última revisão quando não está aguardando', () => {
    expect(ultimaDecisao(detalhe({ status: 'aprovado', revisoes }))).toEqual({
      rotulo: 'Aprovado em 24/09 · 16:10',
      motivo: null,
    })
    expect(ultimaDecisao(detalhe({ status: 'reprovado', revisoes: revisoes.slice(0, 1) }))).toEqual(
      { rotulo: 'Reprovado em 24/09 · 13:40', motivo: 'A foto final não mostra o retoque.' },
    )
  })
  it('aguardando ou sem revisão: nada', () => {
    expect(ultimaDecisao(detalhe({ status: 'aguardando', revisoes }))).toBeNull()
    expect(ultimaDecisao(detalhe({ status: 'em_andamento', revisoes: [] }))).toBeNull()
  })
})
