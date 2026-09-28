<script setup lang="ts">
import { EmConstrucao, RussoIcone } from '@kgb/ui'
import { computed } from 'vue'
import PaginaGestor from '../../componentes/PaginaGestor.vue'

const props = defineProps<{ id: string; origem: 'acionamentos' | 'aprovacoes' }>()
const voltar = computed(() =>
  props.origem === 'aprovacoes'
    ? { rota: 'aprovacoes', rotulo: 'Aprovações' }
    : { rota: 'acionamentos', rotulo: 'Acionamentos' },
)
</script>

<template>
  <PaginaGestor :largura="1180">
    <RouterLink :to="{ name: voltar.rota }" class="voltar">
      <RussoIcone nome="chevron-right" :tamanho="18" class="seta" />{{ voltar.rotulo }}
    </RouterLink>
    <EmConstrucao />
  </PaginaGestor>
</template>

<style scoped>
.voltar {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.voltar:hover {
  color: var(--kgb-secundario);
}
.seta {
  transform: rotate(180deg);
  color: var(--kgb-tinta);
}
</style>
