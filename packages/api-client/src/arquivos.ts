/** Caminhos de foto vêm relativos à API; no app nativo a API fica em outra origem. */
export function resolverUrl(base: string, caminho: string | null): string | null {
  if (!caminho) return null
  if (/^https?:\/\//.test(caminho)) return caminho
  return `${base.replace(/\/$/, '')}${caminho}`
}

export function formularioFoto(dados: {
  arquivo: Blob
  contexto: 'etapa' | 'conclusao'
  etapaId?: string
  tiradaEm?: string
}): FormData {
  const formulario = new FormData()
  formulario.set('arquivo', dados.arquivo, 'foto.jpg')
  formulario.set('contexto', dados.contexto)
  if (dados.etapaId) formulario.set('etapaId', dados.etapaId)
  if (dados.tiradaEm) formulario.set('tiradaEm', dados.tiradaEm)
  return formulario
}

export function formularioInviabilidade(dados: {
  comentario: string
  arquivos: readonly Blob[]
}): FormData {
  const formulario = new FormData()
  formulario.set('comentario', dados.comentario)
  dados.arquivos.forEach((arquivo, i) =>
    formulario.append('arquivos', arquivo, `foto-${i + 1}.jpg`),
  )
  return formulario
}
