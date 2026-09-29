<script setup lang="ts">
import type { ResumoAcionamento } from '@kgb/api-client'
import { intervalo, RussoIcone, StatusChip } from '@kgb/ui'
import { computed } from 'vue'

const props = defineProps<{ acionamento: ResumoAcionamento }>()
defineEmits<{ abrir: [] }>()

const a = computed(() => props.acionamento)
const tipos = computed(() => a.value.tipos.map((t) => t.nome).join(' + '))
</script>

<template>
  <div class="linha">
    <!-- Só o cartão abre o Detalhe; a coluna da hora e o espaço entre eles não. -->
    <div class="hora">{{ a.inicio }}</div>
    <div
      class="cartao"
      role="button"
      tabindex="0"
      @click="$emit('abrir')"
      @keydown.enter="$emit('abrir')"
      @keydown.space.prevent="$emit('abrir')"
    >
      <div class="titulo-cartao">{{ a.titulo }}</div>
      <div class="horario">{{ intervalo(a.inicio, a.fim) }} · {{ tipos }}</div>
      <div class="endereco">
        <RussoIcone nome="pin" :tamanho="14" class="pin" />{{ a.endereco }}
      </div>
      <StatusChip class="chip" :status="a.status" :inviavel="a.inviavel" tamanho="p" />
    </div>
  </div>
</template>

<style scoped>
.linha {
  display: flex;
  gap: 12px;
}
.hora {
  width: 44px;
  flex: none;
  padding-top: 14px;
  font-size: 13px;
  font-weight: 700;
  color: var(--kgb-tinta);
}
.cartao {
  flex: 1;
  min-width: 0;
  padding: 14px;
  border-radius: 16px;
  background: var(--kgb-superficie1);
  display: flex;
  flex-direction: column;
  gap: 6px;
  cursor: pointer;
}
.titulo-cartao {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.horario {
  font-size: 12px;
  color: var(--kgb-secundario);
}
.endereco {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--kgb-terciario);
}
/* O pin do protótipo é o SVG original (#262A3B) a 60%, não o cinza do texto. */
.pin {
  color: var(--kgb-tinta);
  opacity: 0.6;
}
.chip {
  align-self: flex-start;
}
</style>
