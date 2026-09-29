import type { components } from '@kgb/api-client'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { readonly, ref, shallowRef, watch } from 'vue'
import { api } from '../../api'
import { exigir, mensagemDeErro } from '../../erros'
import { sessao } from '../../sessao'
import { toastGestor } from '../../toast'
import { CHAVES_PRESTADORES } from '../dados'

export type PreviaPlanilha = components['schemas']['PreviaPlanilha']
export type ResultadoImportacao = components['schemas']['ResultadoImportacao']

/** O multipart da planilha: o arquivo com o nome original e os campos extras. */
export function formularioPlanilha(arquivo: File, campos: Record<string, string> = {}): FormData {
  const formulario = new FormData()
  formulario.set('arquivo', arquivo, arquivo.name)
  for (const [chave, valor] of Object.entries(campos)) formulario.set(chave, valor)
  return formulario
}

const arquivo = shallowRef<File | null>(null)
const previa = shallowRef<PreviaPlanilha | null>(null)
const desativarAusentes = ref(false)
/** Só a resposta do último pedido abre a conferência (outro arquivo ou fechar descartam). */
let pedido = 0

/**
 * Importação da planilha de credenciados. "Subir planilha" entrega o arquivo a `abrir`, que pede
 * a prévia (nada é gravado); a página mostra "Conferir importação" enquanto houver prévia. Erros
 * da prévia ("Não encontramos linhas na planilha", "Não foi possível ler o arquivo"…) viram toast.
 */
export const importacao = {
  arquivo: readonly(arquivo),
  previa: readonly(previa),
  desativarAusentes: readonly(desativarAusentes),
  async abrir(escolhido: File): Promise<void> {
    const meu = ++pedido
    try {
      const resposta = await exigir(
        api.POST('/api/prestadores/planilha/previa', {
          body: {} as never,
          bodySerializer: () => formularioPlanilha(escolhido),
        }),
      )
      if (meu !== pedido) return
      arquivo.value = escolhido
      previa.value = resposta
      desativarAusentes.value = false
    } catch (e) {
      if (meu === pedido) toastGestor.mostrar(mensagemDeErro(e))
    }
  },
  alternarDesativar(): void {
    desativarAusentes.value = !desativarAusentes.value
  },
  fechar(): void {
    pedido++
    arquivo.value = null
    previa.value = null
    desativarAusentes.value = false
  },
}

// Outra conta não herda a conferência aberta.
watch(
  () => sessao.usuario?.id,
  () => importacao.fechar(),
)

/** "Importar": manda o arquivo de novo (a API recalcula e aplica numa transação). */
export function usarImportarPlanilha() {
  const consultas = useQueryClient()
  return useMutation({
    mutationFn: ({ arquivo, desativarAusentes }: { arquivo: File; desativarAusentes: boolean }) =>
      exigir(
        api.POST('/api/prestadores/planilha/importacao', {
          body: {} as never,
          bodySerializer: () =>
            formularioPlanilha(arquivo, { desativarAusentes: String(desativarAusentes) }),
        }),
      ),
    onSuccess: () => void consultas.invalidateQueries({ queryKey: CHAVES_PRESTADORES.todos }),
  })
}
