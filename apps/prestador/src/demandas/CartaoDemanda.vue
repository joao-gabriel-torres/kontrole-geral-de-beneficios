<script setup lang="ts">
import type { ResumoAcionamento } from '@kgb/api-client'
import { BarraProgresso, dataISO, progresso, quandoCurto, StatusChip } from '@kgb/ui'
import { computed } from 'vue'

const props = defineProps<{ acionamento: ResumoAcionamento }>()
defineEmits<{ abrir: [] }>()

const a = computed(() => props.acionamento)
const quando = computed(() =>
  quandoCurto(a.value.data, a.value.inicio, a.value.fim, dataISO(new Date())),
)
const tipos = computed(() => a.value.tipos.map((t) => t.nome).join(' + '))
</script>

<template>
  <div
    class="cartao"
    role="button"
    tabindex="0"
    @click="$emit('abrir')"
    @keydown.enter="$emit('abrir')"
    @keydown.space.prevent="$emit('abrir')"
  >
    <div class="linha-meta">
      <span class="meta">{{ a.codigo }} · {{ quando }}</span>
    </div>
    <div class="titulo-cartao">{{ a.titulo }}</div>
    <div class="cliente">{{ a.cliente }} · {{ tipos }}</div>
    <div class="linha-progresso">
      <BarraProgresso
        class="barra"
        :percentual="progresso(a.etapas).percentual"
        trilho="var(--kgb-divisor)"
      />
      <StatusChip :status="a.status" :inviavel="a.inviavel" tamanho="p" />
    </div>
  </div>
</template>

<style scoped>
.cartao {
  padding: 16px;
  border-radius: 16px;
  background: var(--kgb-superficie1);
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
}
.linha-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}
.meta {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-terciario);
}
.titulo-cartao {
  font-size: 15px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.cliente {
  font-size: 12px;
  color: var(--kgb-secundario);
}
.linha-progresso {
  display: flex;
  align-items: center;
  gap: 10px;
}
.barra {
  flex: 1;
}
</style>
