<script setup lang="ts">
import { AvisoToast } from '@kgb/ui'
import { useRoute } from 'vue-router'
import { ABAS } from '../abas'
import { avisos } from '../avisos'
import AbasPrestador from '../componentes/AbasPrestador.vue'

const route = useRoute()
const mensagem = avisos.mensagem
</script>

<template>
  <div class="layout">
    <main class="conteudo"><RouterView /></main>
    <AbasPrestador v-if="!route.meta.semAbas" :itens="ABAS" />
    <AvisoToast :mensagem="mensagem" variante="prestador" />
  </div>
</template>

<style scoped>
.layout {
  height: 100dvh;
  display: flex;
  flex-direction: column;
  position: relative;
  background: var(--kgb-branco);
  padding-top: env(safe-area-inset-top);
}
.conteudo {
  flex: 1;
  min-height: 0;
  overflow: auto;
  position: relative;
}
</style>
