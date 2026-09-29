import type { PrestadorOpcao, TipoDemanda } from '@kgb/api-client'
import type { NovoAcionamento } from '../dados'

export interface FormularioAcionamento {
  titulo: string
  tipoIds: string[]
  cliente: string
  endereco: string
  data: string
  inicio: string
  fim: string
  prestadorId: string
}

/** O protótipo abre o formulário com o Carlos (p1). Sem ele entre os ativos, vale o primeiro. */
export const PRESTADOR_PADRAO = 'p1'

export function prestadorPadrao(prestadores: readonly PrestadorOpcao[]): string {
  return prestadores.find((p) => p.id === PRESTADOR_PADRAO)?.id ?? prestadores[0]?.id ?? ''
}

export function formularioInicial(
  hoje: string,
  prestadores: readonly PrestadorOpcao[],
): FormularioAcionamento {
  return {
    titulo: '',
    tipoIds: [],
    cliente: '',
    endereco: '',
    data: hoje,
    inicio: '09:00',
    fim: '11:00',
    prestadorId: prestadorPadrao(prestadores),
  }
}

/** Título, ≥ 1 tipo, cliente, endereço, data, início < fim (HH:MM) e prestador. */
export function formularioValido(f: FormularioAcionamento): boolean {
  return Boolean(
    f.titulo.trim() &&
    f.tipoIds.length &&
    f.cliente.trim() &&
    f.endereco.trim() &&
    f.data &&
    f.inicio &&
    f.fim &&
    f.inicio < f.fim &&
    f.prestadorId,
  )
}

export function alternarTipo(tipoIds: readonly string[], id: string): string[] {
  return tipoIds.includes(id) ? tipoIds.filter((t) => t !== id) : [...tipoIds, id]
}

export interface PreviaTipo {
  id: string
  nome: string
  cor: string
  etapas: readonly string[]
}

/** O checklist que será copiado, na ordem em que os tipos foram escolhidos. */
export function previaChecklist(
  tipos: readonly TipoDemanda[],
  tipoIds: readonly string[],
): PreviaTipo[] {
  return tipoIds.flatMap((id) => {
    const t = tipos.find((x) => x.id === id)
    return t ? [{ id: t.id, nome: t.nome, cor: t.cor, etapas: t.checklist }] : []
  })
}

export function rotuloContagem(previa: readonly PreviaTipo[]): string {
  const n = previa.reduce((soma, t) => soma + t.etapas.length, 0)
  return `${n} ${n === 1 ? 'item' : 'itens'} no checklist`
}

export function rotuloPrestador(p: PrestadorOpcao): string {
  return p.regiao ? `${p.nome} · ${p.regiao}` : p.nome
}

export function corpoDoFormulario(f: FormularioAcionamento): NovoAcionamento {
  return {
    titulo: f.titulo.trim(),
    cliente: f.cliente.trim(),
    endereco: f.endereco.trim(),
    data: f.data,
    inicio: f.inicio,
    fim: f.fim,
    tipoIds: [...f.tipoIds],
    prestadorId: f.prestadorId,
  }
}
