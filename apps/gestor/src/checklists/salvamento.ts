import { shallowRef, type ShallowRef } from 'vue'

/** Espera depois da última alteração antes de salvar (spec: 600 ms, como o autosave do prestador). */
export const ESPERA_SALVAMENTO = 600

export interface OpcoesCanal<T> {
  salvar: (valor: T) => Promise<unknown>
  /** Falso: o valor fica só na tela e não vai para a API (ex.: nome vazio). */
  podeEnviar?: (valor: T) => boolean
  aoFalhar?: (erro: unknown) => void
  espera?: number
}

export interface Canal<T> {
  /** O que a tela mostra no lugar do valor salvo; `undefined` mostra o salvo. */
  readonly rascunho: Readonly<ShallowRef<T | undefined>>
  alterar(valor: T): void
  /** Fim da edição: o rascunho sai assim que não houver envio pendente (a tela volta ao salvo). */
  soltar(): void
  /** Envia na hora o que esperava o debounce; resolve quando a fila de envios terminar. */
  descarregar(): Promise<void>
  /** Esquece o rascunho e o envio agendado (ex.: o tipo foi excluído). */
  descartar(): void
}

/**
 * Um campo que salva sozinho: a tela mostra o rascunho na hora e a API recebe o valor 600 ms depois
 * da última alteração. Os envios saem em série (o próximo só depois da resposta do anterior), então
 * a ordem das gravações é a das alterações. O rascunho continua na tela, mesmo depois de salvo, até
 * `soltar()`: assim a resposta da API (com trim) não mexe no que ainda está sendo digitado.
 */
export function criarCanal<T>({
  salvar,
  podeEnviar = () => true,
  aoFalhar,
  espera = ESPERA_SALVAMENTO,
}: OpcoesCanal<T>): Canal<T> {
  const rascunho = shallowRef<T>()
  let versao = 0
  let enviada = 0
  let solto = true
  let pendentes = 0
  let temporizador: ReturnType<typeof setTimeout> | undefined
  let fila: Promise<void> = Promise.resolve()

  function limparSeLivre() {
    if (solto && pendentes === 0 && temporizador === undefined) rascunho.value = undefined
  }

  async function enviarAgora() {
    const valor = rascunho.value
    if (valor === undefined || versao === enviada || !podeEnviar(valor)) return
    enviada = versao
    try {
      await salvar(valor)
    } catch (erro) {
      aoFalhar?.(erro)
    }
  }

  function enfileirar(): Promise<void> {
    clearTimeout(temporizador)
    temporizador = undefined
    pendentes++
    fila = fila.then(enviarAgora).finally(() => {
      pendentes--
      limparSeLivre()
    })
    return fila
  }

  return {
    rascunho,
    alterar(valor) {
      rascunho.value = valor
      versao++
      solto = false
      clearTimeout(temporizador)
      temporizador = setTimeout(() => void enfileirar(), espera)
    },
    soltar() {
      solto = true
      limparSeLivre()
    },
    descarregar() {
      return temporizador === undefined ? fila : enfileirar()
    },
    descartar() {
      clearTimeout(temporizador)
      temporizador = undefined
      enviada = versao
      solto = true
      rascunho.value = undefined
    },
  }
}
