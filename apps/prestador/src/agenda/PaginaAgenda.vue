<script setup lang="ts">
import FaixaDias from './FaixaDias.vue'
import { usarAgenda } from './usarAgenda'

const { dias, rotulo, escolher } = usarAgenda()
</script>

<template>
  <div class="pagina">
    <h1 class="titulo">Agenda</h1>
    <FaixaDias :dias="dias" @escolher="escolher" />
    <h2 class="rotulo-dia">{{ rotulo }}</h2>
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
.rotulo-dia {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
</style>
