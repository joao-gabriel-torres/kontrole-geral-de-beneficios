<script setup lang="ts">
import type { ResumoAcionamento } from '@kgb/api-client'
import { dataISO, quandoCurto, RussoIcone, urlMapa } from '@kgb/ui'
import { computed } from 'vue'
import { rotuloProximo } from './inicio'

const props = defineProps<{ acionamento: ResumoAcionamento }>()
defineEmits<{ abrir: [] }>()

const a = computed(() => props.acionamento)
const quando = computed(() =>
  quandoCurto(a.value.data, a.value.inicio, a.value.fim, dataISO(new Date())),
)
</script>

<template>
  <div class="proximo">
    <div class="linha-selo">
      <!-- O protótipo mostra o ponto laranja nos dois estados do selo. -->
      <span class="ponto" />
      <span class="selo">{{ rotuloProximo(a.status) }}</span>
      <span class="codigo">{{ a.codigo }}</span>
    </div>
    <div>
      <div class="quando">{{ quando }}</div>
      <div class="titulo-proximo">{{ a.titulo }}</div>
      <div class="local">{{ a.cliente }} · {{ a.endereco }}</div>
    </div>
    <div class="botoes">
      <a class="rota" :href="urlMapa(a.endereco)" target="_blank" rel="noopener">
        <RussoIcone nome="pin" :tamanho="18" />Rota
      </a>
      <button type="button" class="abrir" @click="$emit('abrir')">Abrir checklist</button>
    </div>
  </div>
</template>

<style scoped>
.proximo {
  background: var(--kgb-primaria);
  border-radius: 24px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  color: #fff;
}
.linha-selo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ponto {
  width: 8px;
  height: 8px;
  border-radius: 4px;
  background: var(--kgb-laranja);
}
.selo,
.codigo {
  font-size: 12px;
  font-weight: 600;
  opacity: 0.8;
}
.selo {
  flex: 1;
}
.quando {
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
}
.titulo-proximo {
  font-size: 16px;
  font-weight: 600;
  margin-top: 4px;
}
.local {
  font-size: 13px;
  opacity: 0.75;
  margin-top: 2px;
}
.botoes {
  display: flex;
  gap: 8px;
}
.rota {
  flex: 1;
  height: 44px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}
.abrir {
  flex: 1.4;
  height: 44px;
  border: 0;
  border-radius: 14px;
  background: #fff;
  color: var(--kgb-primaria);
  font-size: 14px;
  font-weight: 700;
}
</style>
