import type { TipoDemanda } from '@kgb/api-client'
import { onScopeDispose } from 'vue'
import type { AtualizacaoTipo } from './dados'
import { criarCanal, type Canal } from './salvamento'

interface CanaisDoTipo {
  nome: Canal<string>
  checklist: Canal<string[]>
}

export interface OpcoesEdicao {
  salvar: (id: string, corpo: AtualizacaoTipo) => Promise<unknown>
  aoFalhar: (erro: unknown) => void
}

/**
 * Os rascunhos da tela, por tipo: o nome e o checklist salvam sozinhos (600 ms depois da última
 * alteração), cada um na sua fila. A tela mostra o rascunho no lugar do salvo:
 * - o do nome sai ao deixar o campo (nome vazio não é enviado e volta ao último salvo);
 * - o do checklist sai quando o tipo deixa de ser o selecionado.
 * Ao sair da tela, o que esperava o debounce é enviado na hora.
 */
export function usarEdicaoTipos({ salvar, aoFalhar }: OpcoesEdicao) {
  const canais = new Map<string, CanaisDoTipo>()

  function de(id: string): CanaisDoTipo {
    let c = canais.get(id)
    if (!c) {
      c = {
        nome: criarCanal<string>({
          salvar: (nome) => salvar(id, { nome }),
          podeEnviar: (nome) => nome.trim() !== '',
          aoFalhar,
        }),
        checklist: criarCanal<string[]>({
          salvar: (checklist) => salvar(id, { checklist }),
          aoFalhar,
        }),
      }
      canais.set(id, c)
    }
    return c
  }

  onScopeDispose(() => {
    for (const c of canais.values()) {
      void c.nome.descarregar()
      void c.checklist.descarregar()
    }
  })

  return {
    /** O tipo como a tela mostra: com os rascunhos no lugar do que está salvo. */
    exibir(t: TipoDemanda): TipoDemanda {
      const c = de(t.id)
      return {
        ...t,
        nome: c.nome.rascunho.value ?? t.nome,
        checklist: c.checklist.rascunho.value ?? t.checklist,
      }
    },
    renomear: (id: string, nome: string) => de(id).nome.alterar(nome),
    soltarNome: (id: string) => de(id).nome.soltar(),
    alterarChecklist: (id: string, checklist: string[]) => de(id).checklist.alterar(checklist),
    /** O tipo deixou de ser o selecionado: a tela volta a mostrar o salvo quando não houver envio. */
    soltar(id: string) {
      de(id).nome.soltar()
      de(id).checklist.soltar()
    },
    /** O tipo foi excluído: nada dele é enviado depois. */
    descartar(id: string) {
      de(id).nome.descartar()
      de(id).checklist.descartar()
      canais.delete(id)
    },
  }
}
