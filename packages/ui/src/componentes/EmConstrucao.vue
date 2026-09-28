<script setup lang="ts">
withDefaults(defineProps<{ fundo?: string }>(), { fundo: 'var(--kgb-branco)' })
</script>

<template>
  <div class="em-construcao" :style="{ background: fundo }">
    Esta tela ainda está em construção.
  </div>
</template>

<style scoped>
.em-construcao {
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
</style>
