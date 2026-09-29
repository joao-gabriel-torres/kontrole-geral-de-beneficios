<script setup lang="ts">
withDefaults(defineProps<{ percentual: number; trilho?: string }>(), {
  trilho: 'var(--kgb-superficie2)',
})
</script>

<template>
  <div
    class="barra"
    role="progressbar"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="percentual"
    :style="{ background: trilho }"
  >
    <div class="preenchimento" :style="{ width: `${percentual}%` }" />
  </div>
</template>

<style scoped>
.barra {
  height: 6px;
  border-radius: 3px;
  overflow: hidden;
}
.preenchimento {
  height: 100%;
  background: var(--kgb-primaria);
}
</style>
