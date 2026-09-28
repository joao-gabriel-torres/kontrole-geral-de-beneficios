import { onScopeDispose, ref, watch, type Ref } from 'vue'

/** Espera depois da última digitação antes de salvar (spec: 600 ms, sem botão). */
export const ESPERA_AUTOSAVE = 600

interface OpcoesAutosave {
  /** Valor atual no servidor (o cache do vue-query). */
  valor: () => string | null
  salvar: (texto: string) => Promise<unknown>
  espera?: number
}

/**
 * Comentário que salva sozinho. Enquanto houver edição local ainda não confirmada pelo servidor,
 * as mudanças do servidor (resposta de outra mutação, refetch) não sobrescrevem o texto. Ao sair da
 * tela, o envio pendente é disparado na hora.
 */
export function usarAutosave({ valor, salvar, espera = ESPERA_AUTOSAVE }: OpcoesAutosave): {
  texto: Ref<string>
  digitar: (texto: string) => void
} {
  const texto = ref(valor() ?? '')
  let editando = false
  let versao = 0
  let temporizador: ReturnType<typeof setTimeout> | undefined

  async function enviar() {
    temporizador = undefined
    const enviada = versao
    try {
      await salvar(texto.value)
      if (versao === enviada) editando = false
    } catch {
      // Fica "editando": o texto local continua valendo e a próxima digitação tenta de novo.
    }
  }

  function digitar(novo: string) {
    texto.value = novo
    editando = true
    versao++
    clearTimeout(temporizador)
    temporizador = setTimeout(() => void enviar(), espera)
  }

  watch(valor, (novo) => {
    if (!editando) texto.value = novo ?? ''
  })

  onScopeDispose(() => {
    if (temporizador === undefined) return
    clearTimeout(temporizador)
    void enviar()
  })

  return { texto, digitar }
}
