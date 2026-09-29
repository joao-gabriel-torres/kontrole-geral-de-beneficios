import type { DetalheAcionamento } from '@kgb/api-client'
import { momento } from '@kgb/ui'
import { describe, expect, it } from 'vitest'
import {
  avaliarEnvio,
  faixaDoStatus,
  mostrarConclusao,
  podeEditar,
  resumoEtapa,
  textoFotosObrigatorias,
  validarInviabilidade,
} from './regras'

const regras = (photoMin = 1, requireAllSteps = false) => ({ photoMin, requireAllSteps })

describe('podeEditar', () => {
  it('só em execução ou reprovado', () => {
    expect(podeEditar('em_andamento')).toBe(true)
    expect(podeEditar('reprovado')).toBe(true)
    expect(podeEditar('aberto')).toBe(false)
    expect(podeEditar('aguardando')).toBe(false)
    expect(podeEditar('aprovado')).toBe(false)
  })
})

describe('avaliarEnvio', () => {
  const etapas = { feitas: 3, total: 5 }

  it('sem a foto de conclusão, bloqueia e diz quantas faltam', () => {
    expect(avaliarEnvio({ regras: regras(), fotosConclusao: 0, etapas })).toEqual({
      pode: false,
      falta: 'Adicione 1 foto da conclusão para enviar',
    })
  })

  it('usa o plural quando faltam várias fotos', () => {
    expect(avaliarEnvio({ regras: regras(3), fotosConclusao: 1, etapas }).falta).toBe(
      'Adicione 2 fotos da conclusão para enviar',
    )
  })

  it('com requireAllSteps, exige todas as etapas depois das fotos', () => {
    expect(avaliarEnvio({ regras: regras(1, true), fotosConclusao: 1, etapas })).toEqual({
      pode: false,
      falta: 'Conclua todas as etapas para enviar',
    })
    expect(avaliarEnvio({ regras: regras(1, true), fotosConclusao: 0, etapas }).falta).toBe(
      'Adicione 1 foto da conclusão para enviar',
    )
  })

  it('libera o envio quando as regras estão cumpridas', () => {
    expect(avaliarEnvio({ regras: regras(), fotosConclusao: 1, etapas })).toEqual({
      pode: true,
      falta: null,
    })
    expect(
      avaliarEnvio({ regras: regras(2, true), fotosConclusao: 2, etapas: { feitas: 5, total: 5 } }),
    ).toEqual({ pode: true, falta: null })
  })
})

describe('resumoEtapa', () => {
  it('junta fotos e comentário na linha azul', () => {
    expect(resumoEtapa(2, 'Trocado o sifão')).toBe('2 fotos · comentário')
    expect(resumoEtapa(1, null)).toBe('1 foto')
    expect(resumoEtapa(0, 'ok')).toBe('comentário')
    expect(resumoEtapa(0, '')).toBe('')
  })
})

describe('textoFotosObrigatorias', () => {
  it('usa singular e plural', () => {
    expect(textoFotosObrigatorias(1)).toBe('1 foto obrigatória')
    expect(textoFotosObrigatorias(3)).toBe('3 fotos obrigatórias')
  })
})

type Parcial = Partial<DetalheAcionamento>
const detalhe = (d: Parcial) =>
  ({
    status: 'aberto',
    inviavel: false,
    revisoes: [],
    ultimoEnvioEm: null,
    fotosConclusao: [],
    comentarioConclusao: null,
    ...d,
  }) as DetalheAcionamento

describe('faixaDoStatus', () => {
  it('reprovado mostra o motivo da última revisão', () => {
    const d = detalhe({
      status: 'reprovado',
      revisoes: [
        { decisao: 'reprovado', motivo: 'Primeiro motivo', em: '2026-09-20T10:00:00Z' },
        { decisao: 'reprovado', motivo: 'A foto ficou escura', em: '2026-09-27T21:30:00Z' },
      ],
    })
    expect(faixaDoStatus(d)).toEqual({ tipo: 'reprovado', motivo: 'A foto ficou escura' })
  })

  it('aguardando mostra quando foi enviado, com o título da inviabilidade se for o caso', () => {
    const envio = '2026-09-28T11:45:00.000Z'
    expect(faixaDoStatus(detalhe({ status: 'aguardando', ultimoEnvioEm: envio }))).toEqual({
      tipo: 'aguardando',
      titulo: 'Enviado para aprovação',
      quando: momento(envio),
    })
    expect(
      faixaDoStatus(detalhe({ status: 'aguardando', inviavel: true, ultimoEnvioEm: envio })),
    ).toMatchObject({ titulo: 'Inviabilidade enviada para análise' })
  })

  it('aprovado confirma o serviço ou a inviabilidade', () => {
    expect(faixaDoStatus(detalhe({ status: 'aprovado' }))).toEqual({
      tipo: 'aprovado',
      titulo: 'Serviço aprovado pelo gestor',
    })
    expect(faixaDoStatus(detalhe({ status: 'aprovado', inviavel: true }))).toEqual({
      tipo: 'aprovado',
      titulo: 'Inviabilidade confirmada pelo gestor',
    })
  })

  it('aberto e em execução não têm faixa', () => {
    expect(faixaDoStatus(detalhe({ status: 'aberto' }))).toBeNull()
    expect(faixaDoStatus(detalhe({ status: 'em_andamento' }))).toBeNull()
  })
})

describe('mostrarConclusao', () => {
  const foto = { id: 'f', url: null, cor: '#8E9AAF', horario: '10:00', tiradaEm: '' }
  it('aparece para editar, ou quando já tem fotos ou comentário final', () => {
    expect(mostrarConclusao(detalhe({ status: 'em_andamento' }))).toBe(true)
    expect(mostrarConclusao(detalhe({ status: 'aberto' }))).toBe(false)
    expect(mostrarConclusao(detalhe({ status: 'aprovado', fotosConclusao: [foto] }))).toBe(true)
    expect(mostrarConclusao(detalhe({ status: 'aguardando', comentarioConclusao: 'ok' }))).toBe(
      true,
    )
  })
})

describe('validarInviabilidade', () => {
  it('exige motivo e de 1 a 5 fotos', () => {
    expect(validarInviabilidade({ comentario: 'Sem acesso ao imóvel', fotos: 1 })).toBe(true)
    expect(validarInviabilidade({ comentario: '   ', fotos: 1 })).toBe(false)
    expect(validarInviabilidade({ comentario: 'Sem acesso', fotos: 0 })).toBe(false)
    expect(validarInviabilidade({ comentario: 'Sem acesso', fotos: 5 })).toBe(true)
    expect(validarInviabilidade({ comentario: 'Sem acesso', fotos: 6 })).toBe(false)
  })
})
