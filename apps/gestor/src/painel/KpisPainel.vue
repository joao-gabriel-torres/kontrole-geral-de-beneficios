<script setup lang="ts">
import type { Kpi } from './apresentacao'

defineProps<{ kpis: readonly Kpi[] }>()
</script>

<template>
  <div class="kpis">
    <template v-for="k in kpis" :key="k.rotulo">
      <RouterLink v-if="k.destino" :to="k.destino" class="kpi acao">
        <div class="rotulo">{{ k.rotulo }}</div>
        <div class="valor">{{ k.valor }}</div>
        <div class="sub">{{ k.sub }}</div>
      </RouterLink>
      <div v-else class="kpi">
        <div class="rotulo">{{ k.rotulo }}</div>
        <div class="valor">{{ k.valor }}</div>
        <div class="sub">{{ k.sub }}</div>
      </div>
    </template>
  </div>
</template>

<style scoped>
.kpis {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}
.kpi {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}
.kpi:hover {
  box-shadow: var(--kgb-sombra-elevado);
}
.acao {
  cursor: pointer;
}
.rotulo {
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-secundario);
}
.valor {
  font-size: 28px;
  line-height: 36px;
  font-weight: 700;
  color: var(--kgb-tinta);
  letter-spacing: -0.02em;
}
.sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--kgb-terciario);
}
</style>
