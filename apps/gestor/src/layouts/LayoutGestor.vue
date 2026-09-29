<script setup lang="ts">
import { AvisoToast } from '@kgb/ui'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { usarContagem } from '../acionamentos/dados'
import ModalNovoAcionamento from '../acionamentos/novo/ModalNovoAcionamento.vue'
import { novoAcionamento } from '../acionamentos/novo/estado'
import NavInferior from '../componentes/NavInferior.vue'
import NavLateral from '../componentes/NavLateral.vue'
import { modaisAbertos } from '../modais'
import { ITENS_NAVEGACAO } from '../navegacao'
import { usarSaida } from '../saida'
import { sessao } from '../sessao'
import { toastGestor } from '../toast'

const { mdAndUp } = useDisplay()
const rota = useRoute()
const encerrarSessao = usarSaida()
const { data: contagem, refetch } = usarContagem()
const aprovacoes = computed(() => contagem.value?.aguardando ?? 0)
const { mensagem } = toastGestor
const modalAberto = novoAcionamento.aberto
const telaInerte = computed(() => modalAberto.value || modaisAbertos.value > 0)
const conteudo = ref<HTMLElement>()

// A fila muda também pelas ações do prestador: o badge se atualiza a cada troca de tela.
watch(
  () => rota.name,
  () => void refetch(),
)
/** Rota do Detalhe → rota da tela de onde ele foi aberto (a do "voltar"). */
const ORIGEM_DO_DETALHE: Record<string, string> = {
  acionamento: 'acionamentos',
  aprovacao: 'aprovacoes',
  'painel-acionamento': 'painel',
}
const TELAS_DE_ORIGEM = new Set(Object.values(ORIGEM_DO_DETALHE))
/** Rolagem de cada tela de origem na última vez em que a gestora saiu dela. */
const rolagens = new Map<string, number>()
const telaAtual = () => [rota.path, String(rota.name ?? '')] as const

// A área de conteúdo é a mesma entre as telas: cada tela nova começa no topo. Antes de desenhar a
// tela nova (flush 'pre'), a rolagem ainda é a da anterior: a da lista fica guardada.
watch(telaAtual, (_, [caminhoAnterior, nomeAnterior]) => {
  if (!conteudo.value) return
  if (TELAS_DE_ORIGEM.has(nomeAnterior)) rolagens.set(caminhoAnterior, conteudo.value.scrollTop)
  conteudo.value.scrollTop = 0
})
// Voltando do Detalhe para a lista de onde ele foi aberto, ela reabre na mesma rolagem (os dados
// vêm do cache, então as linhas já estão lá depois do desenho).
watch(
  telaAtual,
  async ([caminho, nome], [, nomeAnterior]) => {
    const rolagem = rolagens.get(caminho)
    if (ORIGEM_DO_DETALHE[nomeAnterior] !== nome || rolagem === undefined) return
    await nextTick()
    if (conteudo.value) conteudo.value.scrollTop = rolagem
  },
  { flush: 'post' },
)
</script>

<template>
  <div class="layout" :class="{ compacto: !mdAndUp }">
    <NavLateral
      v-if="mdAndUp"
      :itens="ITENS_NAVEGACAO"
      :aprovacoes="aprovacoes"
      :usuario="sessao.usuario?.nome ?? ''"
      @sair="encerrarSessao"
    />
    <div class="coluna">
      <!-- Com um modal aberto, a tela por trás dele fica inerte: o Tab não chega nela. -->
      <main ref="conteudo" class="conteudo" :inert="telaInerte || undefined"><RouterView /></main>
      <NavInferior
        v-if="!mdAndUp"
        :itens="ITENS_NAVEGACAO"
        :aprovacoes="aprovacoes"
        :inert="telaInerte || undefined"
      />
      <ModalNovoAcionamento v-if="modalAberto" @fechar="novoAcionamento.fechar()" />
      <!-- Destino dos modais das telas (usarModalAberto + Teleport). -->
      <div id="modais-gestor" />
      <AvisoToast :mensagem="mensagem" variante="gestor" />
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  height: 100dvh;
  background: var(--kgb-superficie1);
  overflow: hidden;
}
.coluna {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  position: relative;
}
.conteudo {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 28px 32px 40px;
}
.compacto .conteudo {
  padding: 16px 16px 24px;
}
</style>
