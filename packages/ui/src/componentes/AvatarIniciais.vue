<script setup lang="ts">
import { computed } from 'vue'
import { iniciais } from '../formatos'

const props = withDefaults(
  defineProps<{ nome: string; tamanho?: number; cor?: string; tamanhoFonte?: number }>(),
  { tamanho: 36, cor: 'var(--kgb-tinta)', tamanhoFonte: 13 },
)
const estilo = computed(() => ({
  width: `${props.tamanho}px`,
  height: `${props.tamanho}px`,
  background: props.cor,
  fontSize: `${props.tamanhoFonte}px`,
}))
</script>

<template>
  <div class="avatar" :style="estilo" aria-hidden="true">{{ iniciais(nome) }}</div>
</template>

<style scoped>
.avatar {
  border-radius: 50%;
  color: #fff;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
</style>
