<script setup lang="ts">
import type { Periodo } from './formatos'

const periodo = defineModel<Periodo>({ required: true })
const OPCOES: readonly Periodo[] = [7, 30]
</script>

<template>
  <div class="seletor" role="group" aria-label="Período">
    <button
      v-for="p in OPCOES"
      :key="p"
      type="button"
      :class="{ ativo: periodo === p }"
      :aria-pressed="periodo === p"
      @click="periodo = p"
    >
      {{ p }} dias
    </button>
  </div>
</template>

<style scoped>
.seletor {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--kgb-superficie2);
  border-radius: 12px;
}
button {
  border: 0;
  height: 32px;
  padding: 0 12px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 600;
  background: transparent;
  color: var(--kgb-secundario);
  box-shadow: none;
}
.ativo {
  background: var(--kgb-branco);
  color: var(--kgb-tinta);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}
</style>
