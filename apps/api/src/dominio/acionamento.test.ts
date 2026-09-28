import { describe, expect, it } from 'vitest'
import {
  exigirStatus,
  normalizarNovoAcionamento,
  verificarEnvio,
  verificarInviabilidade,
  verificarRevisao,
  type StatusAcionamento,
} from './acionamento'

function erroDe(fn: () => unknown): unknown {
  try {
    fn()
  } catch (erro) {
    return erro
  }
  throw new Error('a função não lançou erro')
}

const TODOS: StatusAcionamento[] = ['aberto', 'em_andamento', 'aguardando', 'reprovado', 'aprovado']
const regras = { photoMin: 1, requireAllSteps: false }

describe('exigirStatus', () => {
  it.each([
    ['iniciar', ['aberto']],
    ['editar', ['em_andamento', 'reprovado']],
    ['enviar', ['em_andamento', 'reprovado']],
    ['marcarInviavel', ['aberto', 'em_andamento', 'reprovado']],
    ['revisar', ['aguardando']],
  ] as const)('%s só é permitido em %j', (acao, permitidos) => {
    for (const status of TODOS) {
      if ((permitidos as readonly string[]).includes(status)) {
        expect(() => exigirStatus(acao, status)).not.toThrow()
      } else {
        expect(erroDe(() => exigirStatus(acao, status))).toMatchObject({
          codigo: 'transicao_invalida',
          status: 409,
        })
      }
    }
  })
})

describe('verificarEnvio', () => {
  const base = {
    status: 'em_andamento' as const,
    fotosConclusao: 1,
    etapas: [{ feita: false }],
    regras,
  }

  it('libera com a foto mínima, mesmo com etapas pendentes (requireAllSteps desligado)', () => {
    expect(() => verificarEnvio(base)).not.toThrow()
  })
  it('pede a foto que falta com o texto do protótipo', () => {
    expect(erroDe(() => verificarEnvio({ ...base, fotosConclusao: 0 }))).toMatchObject({
      codigo: 'fotos_insuficientes',
      status: 422,
      message: 'Adicione 1 foto da conclusão para enviar',
    })
    expect(
      erroDe(() =>
        verificarEnvio({ ...base, fotosConclusao: 1, regras: { ...regras, photoMin: 3 } }),
      ),
    ).toMatchObject({ message: 'Adicione 2 fotos da conclusão para enviar' })
  })
  it('exige todas as etapas quando requireAllSteps está ligado', () => {
    expect(
      erroDe(() => verificarEnvio({ ...base, regras: { photoMin: 1, requireAllSteps: true } })),
    ).toMatchObject({ codigo: 'etapas_pendentes', message: 'Conclua todas as etapas para enviar' })
  })
  it('confere o status antes das fotos', () => {
    expect(
      erroDe(() => verificarEnvio({ ...base, status: 'aberto', fotosConclusao: 0 })),
    ).toMatchObject({
      codigo: 'transicao_invalida',
    })
  })
})

describe('verificarInviabilidade', () => {
  it('devolve o motivo aparado', () => {
    expect(
      verificarInviabilidade({ status: 'aberto', comentario: '  Laje protendida  ', fotos: 1 }),
    ).toBe('Laje protendida')
  })
  it('exige motivo e pelo menos uma foto', () => {
    expect(
      erroDe(() => verificarInviabilidade({ status: 'aberto', comentario: '  ', fotos: 1 })),
    ).toMatchObject({
      codigo: 'motivo_obrigatorio',
    })
    expect(
      erroDe(() => verificarInviabilidade({ status: 'aberto', comentario: 'x', fotos: 0 })),
    ).toMatchObject({
      codigo: 'fotos_insuficientes',
    })
  })
  it('não vale para quem já está aguardando', () => {
    expect(
      erroDe(() => verificarInviabilidade({ status: 'aguardando', comentario: 'x', fotos: 1 })),
    ).toMatchObject({
      codigo: 'transicao_invalida',
    })
  })
})

describe('verificarRevisao', () => {
  it('aprovar dispensa motivo', () => {
    expect(verificarRevisao({ status: 'aguardando', decisao: 'aprovado', motivo: '' })).toBeNull()
  })
  it('reprovar exige motivo, com o texto do protótipo', () => {
    expect(
      erroDe(() => verificarRevisao({ status: 'aguardando', decisao: 'reprovado', motivo: ' ' })),
    ).toMatchObject({
      codigo: 'motivo_obrigatorio',
      message: 'Escreva o motivo da reprovação',
    })
    expect(
      verificarRevisao({ status: 'aguardando', decisao: 'reprovado', motivo: ' Foto escura ' }),
    ).toBe('Foto escura')
  })
  it('só revisa o que está aguardando', () => {
    expect(
      erroDe(() => verificarRevisao({ status: 'aprovado', decisao: 'aprovado' })),
    ).toMatchObject({
      codigo: 'transicao_invalida',
    })
  })
})

describe('normalizarNovoAcionamento', () => {
  const dados = {
    titulo: ' Vazamento ',
    cliente: ' Edifício Aurora ',
    endereco: ' Rua Harmonia, 410 · Vila Madalena ',
    data: '2026-09-28',
    inicio: '09:00',
    fim: '11:00',
    tipoIds: ['t1', 't1', 't6'],
    prestadorId: 'p1',
  }

  it('apara textos e remove tipos repetidos, mantendo a ordem', () => {
    expect(normalizarNovoAcionamento(dados)).toMatchObject({
      titulo: 'Vazamento',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      tipoIds: ['t1', 't6'],
    })
  })
  it.each([
    ['titulo', 'Informe o título'],
    ['cliente', 'Informe o cliente'],
    ['endereco', 'Informe o endereço'],
  ] as const)('exige %s', (campo, mensagem) => {
    expect(erroDe(() => normalizarNovoAcionamento({ ...dados, [campo]: '   ' }))).toMatchObject({
      codigo: 'campo_obrigatorio',
      message: mensagem,
    })
  })
  it('exige ao menos um tipo', () => {
    expect(erroDe(() => normalizarNovoAcionamento({ ...dados, tipoIds: [] }))).toMatchObject({
      codigo: 'tipo_invalido',
    })
  })
  it('exige início antes do fim', () => {
    expect(
      erroDe(() => normalizarNovoAcionamento({ ...dados, inicio: '11:00', fim: '11:00' })),
    ).toMatchObject({
      codigo: 'horario_invalido',
    })
  })
})
