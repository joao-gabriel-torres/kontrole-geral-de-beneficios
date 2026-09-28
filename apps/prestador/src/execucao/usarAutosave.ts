import { onScopeDispose, ref, watch, type Ref } from 'vue'

/** Espera depois da última digitação antes de salvar (spec: 600 ms, sem botão). */
export const ESPERA_AUTOSAVE = 600

interface OpcoesAutosave {
  /** Valor atual no servidor (o cache do vue-query). */
  valor: () => string | null
  salvar: (texto: string) => Promise<unknown>
  espera?: number
}

export interface Autosave {
  texto: Ref<string>
  digitar: (texto: string) => void
  /**
   * Salva agora o que ainda não foi confirmado (debounce pendente, envio em andamento ou envio que
   * falhou) e resolve quando o servidor confirmar. Rejeita se não conseguir salvar.
   */
  descarregar: () => Promise<void>
}

/**
 * Comentário que salva sozinho. Enquanto houver edição local ainda não confirmada pelo servidor,
 * as mudanças do servidor (resposta de outra mutação, refetch) não sobrescrevem o texto. Ao sair da
 * tela, o que estiver pendente é enviado na hora.
 */
export function usarAutosave({
  valor,
  salvar,
  espera = ESPERA_AUTOSAVE,
}: OpcoesAutosave): Autosave {
  const texto = ref(valor() ?? '')
  let editando = false
  let versao = 0
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let emVoo: Promise<boolean> | null = null

  /** Envia o texto atual; resolve `true` se o servidor confirmou. */
  function enviar(): Promise<boolean> {
    clearTimeout(temporizador)
    temporizador = undefined
    const enviada = versao
    const envio = salvar(texto.value).then(
      () => {
        if (versao === enviada) editando = false
        return true
      },
      // Fica "editando": o texto local continua valendo e o próximo envio tenta de novo.
      () => false,
    )
    emVoo = envio
    void envio.then(() => {
      if (emVoo === envio) emVoo = null
    })
    return envio
  }

  async function descarregar(): Promise<void> {
    clearTimeout(temporizador)
    temporizador = undefined
    if (emVoo) await emVoo
    if (editando && !(await enviar())) throw new Error('Não foi possível salvar o comentário')
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
    descarregar().catch(() => {
      // O erro já virou aviso na mutação; a tela saiu, não há onde manter o texto.
    })
  })

  return { texto, digitar, descarregar }
}
