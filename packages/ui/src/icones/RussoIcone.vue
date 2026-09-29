<script setup lang="ts">
import { computed } from 'vue'
import { GEOMETRIA_ICONES, type NomeIcone } from './geometria'

const props = withDefaults(defineProps<{ nome: NomeIcone; tamanho?: number | string }>(), {
  tamanho: 24,
})
const geometria = computed(() => GEOMETRIA_ICONES[props.nome])
</script>

<template>
  <!-- eslint-disable vue/no-v-html -- geometria estática e confiável, copiada dos SVGs do protótipo -->
  <svg
    class="russo-icone"
    :width="tamanho"
    :height="tamanho"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    v-html="geometria"
  />
  <!-- eslint-enable vue/no-v-html -->
</template>

<style scoped>
.russo-icone {
  display: block;
  flex: none;
}
</style>
