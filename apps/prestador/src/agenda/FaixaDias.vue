<script setup lang="ts">
import type { DiaDaAgenda } from './dias'

defineProps<{ dias: readonly DiaDaAgenda[] }>()
defineEmits<{ escolher: [data: string] }>()
</script>

<template>
  <div class="faixa">
    <!-- Botão nativo com display:flex e sem aria-label: o nome acessível fica "Qua 30", como no
         protótipo (os spans viram blocos e o Chromium separa os textos). -->
    <button
      v-for="d in dias"
      :key="d.data"
      type="button"
      class="dia"
      :class="{ selecionado: d.selecionado, 'com-atendimento': d.temAtendimento }"
      :aria-pressed="d.selecionado"
      @click="$emit('escolher', d.data)"
    >
      <span class="dia-semana">{{ d.diaSemana }}</span>
      <span class="numero">{{ d.numero }}</span>
      <span class="ponto" />
    </button>
  </div>
</template>

<style scoped>
.faixa {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}
.dia {
  border: 0;
  height: 68px;
  border-radius: 14px;
  background: var(--kgb-superficie1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
}
.dia-semana {
  font-size: 11px;
  font-weight: 600;
  color: var(--kgb-terciario);
}
.numero {
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
/* Ocupa espaço mesmo transparente: o layout não salta entre dias com e sem atendimento. */
.ponto {
  width: 5px;
  height: 5px;
  border-radius: 3px;
  background: transparent;
}
.com-atendimento .ponto {
  background: var(--kgb-primaria);
}
.selecionado {
  background: var(--kgb-primaria);
}
.selecionado .dia-semana,
.selecionado .numero {
  color: #fff;
}
.selecionado.com-atendimento .ponto {
  background: #fff;
}
</style>
