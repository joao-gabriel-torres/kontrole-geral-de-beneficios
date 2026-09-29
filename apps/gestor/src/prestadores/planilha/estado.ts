import { readonly, ref } from 'vue'

const arquivo = ref<File | null>(null)

/**
 * Importação da planilha de credenciados. "Subir planilha" entrega aqui o arquivo escolhido.
 *
 * Etapa 2: `abrir` passa a pedir a prévia (`POST /api/prestadores/planilha/previa`) e a página
 * mostra o modal "Conferir importação" enquanto houver arquivo; toasts "Não encontramos linhas na
 * planilha" e "Não foi possível ler o arquivo" quando a prévia não abre.
 */
export const importacao = {
  arquivo: readonly(arquivo),
  abrir(escolhido: File): void {
    arquivo.value = escolhido
  },
  fechar(): void {
    arquivo.value = null
  },
}
