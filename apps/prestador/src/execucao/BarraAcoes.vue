<script setup lang="ts">
import type { DetalheAcionamento } from '@kgb/api-client'
import { computed } from 'vue'
import { podeEditar } from './regras'

const props = defineProps<{
  status: DetalheAcionamento['status']
  /** Resultado de `avaliarEnvio`. */
  envio: { pode: boolean; falta: string | null }
  ocupado: boolean
}>()
const emit = defineEmits<{ iniciar: []; enviar: []; inviavel: [] }>()

const aberto = computed(() => props.status === 'aberto')
const editavel = computed(() => podeEditar(props.status))

function principal() {
  if (props.ocupado) return
  if (aberto.value) emit('iniciar')
  else if (props.envio.pode) emit('enviar')
}
</script>

<template>
  <div v-if="aberto || editavel" class="barra-acoes">
    <div v-if="editavel && envio.falta" class="aviso-falta">{{ envio.falta }}</div>
    <button type="button" class="principal" :disabled="editavel && !envio.pode" @click="principal">
      {{ aberto ? 'Iniciar atendimento' : 'Enviar para aprovação' }}
    </button>
    <button type="button" class="link-inviavel" @click="$emit('inviavel')">
      Marcar como inviável
    </button>
  </div>
</template>

<style scoped>
/*
  Os 24px de baixo são do protótipo; no iPhone com barra de gestos, a área segura soma a altura do
  indicador de início (no navegador, env() vale 0).
*/
.barra-acoes {
  position: sticky;
  bottom: 0;
  background: #fff;
  border-top: 1px solid var(--kgb-divisor);
  padding: 12px 24px calc(24px + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.aviso-falta {
  font-size: 12px;
  font-weight: 500;
  color: var(--kgb-laranja-texto);
  text-align: center;
}
/* Os botões do protótipo não definem padding: vale o padrão do navegador (1px 6px). */
.principal {
  height: 48px;
  border: 0;
  border-radius: 16px;
  padding: 1px 6px;
  background: var(--kgb-primaria);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}
.principal:disabled {
  background: var(--kgb-primaria-tint-forte);
  color: var(--kgb-primaria-escura);
  cursor: default;
}
.link-inviavel {
  height: 32px;
  border: 0;
  padding: 1px 6px;
  background: transparent;
  color: var(--kgb-inviavel);
  font-size: 13px;
  font-weight: 600;
}
</style>
