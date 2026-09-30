import { formularioFoto, formularioInviabilidade, type DetalheAcionamento } from '@kgb/api-client'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, type Ref } from 'vue'
import { api } from '../api'
import { avisar } from '../avisos'
import {
  CHAVES,
  exigir,
  MENSAGEM_FOTO_GRANDE,
  MENSAGEM_FOTOS_GRANDES,
  mensagemDeErro,
} from '../consultas'
import type { FotoCapturada } from './fotos'

export type ContextoFoto = 'etapa' | 'conclusao'

/** Mutação do Detalhe em andamento. */
interface Pedido {
  /** Outra mutação esteve em voo em algum momento da vida desta. */
  sobreposto: boolean
}

/**
 * A API monta o Detalhe da resposta depois do commit e fora do lock: com duas mutações em voo, a
 * resposta da primeira pode trazer um retrato anterior ao commit da segunda e chegar por último.
 * Só a resposta de uma mutação que ficou sozinha do começo ao fim é certamente a mais nova.
 */
function criarPedidos() {
  const emVoo = new Set<Pedido>()
  return {
    abrir(): Pedido {
      const pedido = { sobreposto: emVoo.size > 0 }
      emVoo.forEach((outro) => (outro.sobreposto = true))
      emVoo.add(pedido)
      return pedido
    },
    /** Encerra o pedido; `true` quando a resposta dele pode ir direto para o cache. */
    fechar(pedido: Pedido | undefined): boolean {
      if (!pedido) return false
      emVoo.delete(pedido)
      return !pedido.sobreposto
    },
  }
}

/** Consulta do Detalhe e as ações do prestador sobre ele. */
export function usarDetalhe(id: Ref<string>) {
  const cliente = useQueryClient()
  const caminho = () => ({ params: { path: { id: id.value } } })

  const consulta = useQuery({
    queryKey: computed(() => CHAVES.detalhe(id.value)),
    queryFn: async () => exigir(await api.GET('/api/acionamentos/{id}', caminho())),
  })

  const fotosEnviando = ref<Record<string, number>>({})
  function contarEnvio(chave: string, delta: number) {
    fotosEnviando.value = {
      ...fotosEnviando.value,
      [chave]: (fotosEnviando.value[chave] ?? 0) + delta,
    }
  }

  function invalidarListas() {
    void cliente.invalidateQueries({ queryKey: CHAVES.lista })
    void cliente.invalidateQueries({ queryKey: CHAVES.inicio })
  }

  const pedidos = criarPedidos()
  /** Busca o Detalhe de novo; um GET que já estava em voo é cancelado (leu o banco antes). */
  const buscarDetalhe = () => cliente.invalidateQueries({ queryKey: CHAVES.detalhe(id.value) })

  /**
   * Mutação que devolve o Detalhe: grava a resposta no cache quando ela é certamente a mais nova.
   * Se outra mutação se sobrepôs, ou se um GET do Detalhe estava em voo (e pode chegar depois com
   * um retrato anterior), busca o estado final. Invalida a lista e o Início.
   */
  function acao<A>(executar: (args: A) => Promise<DetalheAcionamento>, sucesso?: string) {
    return useMutation({
      mutationFn: executar,
      onMutate: () => pedidos.abrir(),
      onSuccess: async (detalhe, _args, pedido) => {
        const chave = CHAVES.detalhe(id.value)
        const sozinho = pedidos.fechar(pedido)
        if (sozinho) {
          const getEmVoo = cliente.isFetching({ queryKey: chave }) > 0
          cliente.setQueryData(chave, detalhe)
          if (getEmVoo) void buscarDetalhe()
        }
        invalidarListas()
        if (sucesso) avisar(sucesso)
        // Sobreposta, a resposta é um retrato incerto: a mutação (e o "ocupado" dos botões de
        // status) só termina quando o estado final chega, senão o botão reativa com o status antigo.
        if (!sozinho) await buscarDetalhe()
      },
      onError: (erro, _args, pedido) => {
        pedidos.fechar(pedido)
        avisar(mensagemDeErro(erro))
      },
    })
  }

  /**
   * Mutação de foto: a API não devolve o Detalhe, então ele é buscado de novo. Conta como pedido
   * para as outras mutações saberem que houve sobreposição.
   */
  function acaoFoto<A>(executar: (args: A) => Promise<unknown>) {
    return useMutation({
      mutationFn: executar,
      onMutate: () => pedidos.abrir(),
      // Espera o Detalhe novo chegar: o bloco "Carregando…" só some quando a foto aparece.
      onSuccess: async (_resposta, _args, pedido) => {
        pedidos.fechar(pedido)
        invalidarListas()
        await buscarDetalhe()
      },
      onError: (erro, _args, pedido) => {
        pedidos.fechar(pedido)
        avisar(mensagemDeErro(erro))
      },
    })
  }

  const iniciar = acao(
    async () => exigir(await api.POST('/api/acionamentos/{id}/iniciar', caminho())),
    'Atendimento iniciado',
  )
  const enviar = acao(
    async () => exigir(await api.POST('/api/acionamentos/{id}/enviar', caminho())),
    'Enviado para aprovação',
  )
  const atualizarEtapa = acao(
    async ({ etapaId, ...body }: { etapaId: string; feita?: boolean; comentario?: string }) =>
      exigir(
        await api.PATCH('/api/acionamentos/{id}/etapas/{etapaId}', {
          params: { path: { id: id.value, etapaId } },
          body,
        }),
      ),
  )
  const comentarConclusao = acao(async (comentario: string) =>
    exigir(
      await api.PATCH('/api/acionamentos/{id}/conclusao', { ...caminho(), body: { comentario } }),
    ),
  )
  const marcarInviavel = acao(
    async ({ comentario, arquivos }: { comentario: string; arquivos: Blob[] }) =>
      exigir(
        await api.POST('/api/acionamentos/{id}/inviavel', {
          ...caminho(),
          body: {} as never,
          bodySerializer: () => formularioInviabilidade({ comentario, arquivos }),
        }),
        { limite: MENSAGEM_FOTOS_GRANDES },
      ),
    'Inviabilidade enviada ao gestor',
  )
  const adicionarFoto = acaoFoto(
    async ({
      contexto,
      foto,
      etapaId,
    }: {
      contexto: ContextoFoto
      foto: FotoCapturada
      etapaId?: string
    }) =>
      exigir(
        await api.POST('/api/acionamentos/{id}/fotos', {
          ...caminho(),
          body: {} as never,
          bodySerializer: () =>
            formularioFoto({ arquivo: foto.arquivo, contexto, etapaId, tiradaEm: foto.tiradaEm }),
        }),
        { limite: MENSAGEM_FOTO_GRANDE },
      ),
  )
  const removerFoto = acaoFoto(async (fotoId: string) =>
    exigir(
      await api.DELETE('/api/acionamentos/{id}/fotos/{fotoId}', {
        params: { path: { id: id.value, fotoId } },
      }),
    ),
  )

  return {
    detalhe: consulta.data,
    erro: consulta.error,
    carregando: consulta.isPending,
    ocupado: computed(
      () => iniciar.isPending.value || enviar.isPending.value || marcarInviavel.isPending.value,
    ),
    iniciar: () => iniciar.mutateAsync(undefined).catch(() => undefined),
    enviar: () => enviar.mutateAsync(undefined).catch(() => undefined),
    marcarEtapa: (etapaId: string, feita: boolean) =>
      atualizarEtapa.mutateAsync({ etapaId, feita }).catch(() => undefined),
    /** Rejeita em caso de erro: o autosave mantém o texto local. */
    comentarEtapa: (etapaId: string, comentario: string) =>
      atualizarEtapa.mutateAsync({ etapaId, comentario }),
    comentarConclusao: (comentario: string) => comentarConclusao.mutateAsync(comentario),
    marcarInviavel: (comentario: string, arquivos: Blob[]) =>
      marcarInviavel.mutateAsync({ comentario, arquivos }).then(
        () => true,
        () => false,
      ),
    /** Envios de foto em andamento, por etapa (id) ou 'conclusao'. */
    fotosEnviando,
    adicionarFoto: async (contexto: ContextoFoto, foto: FotoCapturada, etapaId?: string) => {
      const chave = etapaId ?? 'conclusao'
      contarEnvio(chave, 1)
      try {
        await adicionarFoto.mutateAsync({ contexto, foto, etapaId })
      } catch {
        // O aviso com o erro já foi mostrado pela mutação.
      } finally {
        contarEnvio(chave, -1)
      }
    },
    removerFoto: (fotoId: string) => removerFoto.mutateAsync(fotoId).catch(() => undefined),
  }
}
