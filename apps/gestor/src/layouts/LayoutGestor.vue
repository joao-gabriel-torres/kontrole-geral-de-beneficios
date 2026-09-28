<script setup lang="ts">
import { AvisoToast } from '@kgb/ui'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDisplay } from 'vuetify'
import { usarContagem } from '../acionamentos/dados'
import ModalNovoAcionamento from '../acionamentos/novo/ModalNovoAcionamento.vue'
import { novoAcionamento } from '../acionamentos/novo/estado'
import NavInferior from '../componentes/NavInferior.vue'
import NavLateral from '../componentes/NavLateral.vue'
import { ITENS_NAVEGACAO } from '../navegacao'
import { sair, sessao } from '../sessao'
import { toastGestor } from '../toast'

const { mdAndUp } = useDisplay()
const rota = useRoute()
const router = useRouter()
const consultas = useQueryClient()
const { data: contagem, refetch } = usarContagem()
const aprovacoes = computed(() => contagem.value?.aguardando ?? 0)
const { mensagem } = toastGestor
const modalAberto = novoAcionamento.aberto
const conteudo = ref<HTMLElement>()

// A fila muda também pelas ações do prestador: o badge se atualiza a cada troca de tela.
watch(
  () => rota.name,
  () => void refetch(),
)
// A área de conteúdo é a mesma entre as telas: cada tela nova começa no topo.
watch(
  () => rota.path,
  () => {
    if (conteudo.value) conteudo.value.scrollTop = 0
  },
)

async function encerrarSessao() {
  await sair()
  consultas.clear()
  await router.replace({ name: 'login' })
}
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
      <main ref="conteudo" class="conteudo"><RouterView /></main>
      <NavInferior v-if="!mdAndUp" :itens="ITENS_NAVEGACAO" :aprovacoes="aprovacoes" />
      <ModalNovoAcionamento v-if="modalAberto" @fechar="novoAcionamento.fechar()" />
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
