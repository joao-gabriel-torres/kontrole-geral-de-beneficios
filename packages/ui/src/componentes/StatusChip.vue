<script setup lang="ts">
import { computed } from 'vue'
import { estiloStatus, type StatusAcionamento } from '../status'

const props = withDefaults(
  defineProps<{ status: StatusAcionamento; inviavel?: boolean; tamanho?: 'p' | 'm' | 'g' }>(),
  { inviavel: false, tamanho: 'm' },
)
const estilo = computed(() => estiloStatus(props.status, props.inviavel))
</script>

<template>
  <span class="chip" :class="tamanho" :style="{ background: estilo.fundo, color: estilo.texto }">
    {{ estilo.rotulo }}
  </span>
</template>

<style scoped>
.chip {
  font-weight: 600;
  border-radius: 999px;
  white-space: nowrap;
}
.p {
  font-size: 11px;
  padding: 2px 8px;
}
.m {
  font-size: 12px;
  padding: 3px 10px;
}
.g {
  font-size: 13px;
  padding: 6px 12px;
}
</style>
