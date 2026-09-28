<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'
import { api } from '../api'
import NavInferior from '../componentes/NavInferior.vue'
import NavLateral from '../componentes/NavLateral.vue'
import { ITENS_NAVEGACAO } from '../navegacao'
import { sessao } from '../sessao'

const { mdAndUp } = useDisplay()
const rota = useRoute()
const aprovacoes = ref(0)

async function atualizarFila() {
  try {
    const { data } = await api.GET('/api/acionamentos/contagem')
    aprovacoes.value = data?.aguardando ?? 0
  } catch {
    aprovacoes.value = 0
  }
}

onMounted(atualizarFila)
watch(() => rota.name, atualizarFila)
</script>

<template>
  <div class="layout" :class="{ compacto: !mdAndUp }">
    <NavLateral
      v-if="mdAndUp"
      :itens="ITENS_NAVEGACAO"
      :aprovacoes="aprovacoes"
      :usuario="sessao.usuario?.nome ?? ''"
    />
    <div class="coluna">
      <main class="conteudo"><RouterView /></main>
      <NavInferior v-if="!mdAndUp" :itens="ITENS_NAVEGACAO" :aprovacoes="aprovacoes" />
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
