import { api } from '../../api'
import { exigir } from '../../erros'
import { toastGestor } from '../../toast'
import { NOME_MODELO, nomeDaExportacao } from './textos'

/** Ações da planilha de credenciados chamadas pela tela de Prestadores. */

/** Entrega o arquivo ao navegador como download. */
function salvar(arquivo: Blob, nome: string): void {
  const url = URL.createObjectURL(arquivo)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** "Exportar planilha": baixa os credenciados e avisa ("Falha ao exportar" no erro). */
export async function exportarPlanilha(): Promise<void> {
  try {
    const arquivo = await exigir(api.GET('/api/prestadores/planilha', { parseAs: 'blob' }))
    salvar(arquivo, nomeDaExportacao(new Date()))
    toastGestor.mostrar('Planilha exportada')
  } catch {
    toastGestor.mostrar('Falha ao exportar')
  }
}

/** "Baixar modelo da planilha": sem toast de sucesso, como no protótipo. */
export async function baixarModeloPlanilha(): Promise<void> {
  try {
    salvar(
      await exigir(api.GET('/api/prestadores/planilha/modelo', { parseAs: 'blob' })),
      NOME_MODELO,
    )
  } catch {
    toastGestor.mostrar('Falha ao baixar modelo')
  }
}
