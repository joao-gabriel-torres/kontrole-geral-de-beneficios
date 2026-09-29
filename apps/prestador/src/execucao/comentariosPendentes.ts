import { inject, onScopeDispose, provide, type InjectionKey } from 'vue'

type Descarregar = () => Promise<void>

const CHAVE: InjectionKey<Set<Descarregar>> = Symbol('comentarios-pendentes')

/**
 * Chamado pela página do Detalhe. Devolve uma função que salva agora todos os comentários ainda não
 * confirmados (etapas e conclusão) e rejeita se algum não salvar. Use antes de mudar o status: depois
 * do envio a API não aceita mais editar comentários.
 */
export function proverComentariosPendentes(): () => Promise<void> {
  const registrados = new Set<Descarregar>()
  provide(CHAVE, registrados)
  return async () => {
    await Promise.all([...registrados].map((descarregar) => descarregar()))
  }
}

/** Chamado por cada campo com autosave dentro do Detalhe. */
export function registrarComentarioPendente(descarregar: Descarregar): void {
  const registrados = inject(CHAVE, null)
  if (!registrados) return
  registrados.add(descarregar)
  onScopeDispose(() => registrados.delete(descarregar))
}
