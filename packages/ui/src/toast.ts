import { ref, type Ref } from 'vue'

export interface Toast {
  mensagem: Ref<string | null>
  mostrar(texto: string): void
}

/** Aviso curto que some sozinho (2,6 s, como no protótipo). Mensagem nova substitui a anterior. */
export function usarToast(duracao = 2600): Toast {
  const mensagem = ref<string | null>(null)
  let temporizador: ReturnType<typeof setTimeout> | undefined
  return {
    mensagem,
    mostrar(texto: string) {
      clearTimeout(temporizador)
      mensagem.value = texto
      temporizador = setTimeout(() => {
        mensagem.value = null
      }, duracao)
    },
  }
}
