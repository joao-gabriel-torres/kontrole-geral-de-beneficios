<script setup lang="ts">
import { EmConstrucao } from '@kgb/ui'
</script>

<template>
  <div class="pagina">
    <h1 class="titulo">Agenda</h1>
    <EmConstrucao fundo="var(--kgb-superficie1)" />
  </div>
</template>

<style scoped>
.pagina {
  padding: 8px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.titulo {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
</style>
