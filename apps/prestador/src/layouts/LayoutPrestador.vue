<script setup lang="ts">
import { ABAS } from '../abas'
import AbasPrestador from '../componentes/AbasPrestador.vue'
</script>

<template>
  <div class="layout">
    <main class="conteudo"><RouterView /></main>
    <AbasPrestador :itens="ABAS" />
  </div>
</template>

<style scoped>
.layout {
  height: 100dvh;
  display: flex;
  flex-direction: column;
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
