<script setup lang="ts">
import { computed } from 'vue'
import RussoIcone from '../icones/RussoIcone.vue'

type Tamanho = 64 | 68 | 80 | 96 | 120

const props = withDefaults(
  defineProps<{
    tamanho: Tamanho
    url?: string | null
    cor?: string | null
    horario: string
    removivel?: boolean
  }>(),
  { url: null, cor: null, removivel: false },
)
defineEmits<{ remover: [] }>()

/** Medidas do carimbo e do ícone por tamanho, copiadas do protótipo. */
const MEDIDAS: Record<
  Tamanho,
  { recuo: number; padding: number; fonte: number; icone: number | null }
> = {
  64: { recuo: 4, padding: 4, fonte: 10, icone: null },
  68: { recuo: 4, padding: 4, fonte: 10, icone: 20 },
  80: { recuo: 5, padding: 5, fonte: 10, icone: 22 },
  96: { recuo: 5, padding: 5, fonte: 10, icone: 24 },
  120: { recuo: 6, padding: 5, fonte: 11, icone: 28 },
}

const medidas = computed(() => MEDIDAS[props.tamanho])
const estilo = computed(() => ({
  width: `${props.tamanho}px`,
  height: `${props.tamanho}px`,
  background: props.url ? 'transparent' : (props.cor ?? '#8FA3A0'),
}))
const estiloCarimbo = computed(() => ({
  left: `${medidas.value.recuo}px`,
  bottom: `${medidas.value.recuo}px`,
  padding: `0 ${medidas.value.padding}px`,
  fontSize: `${medidas.value.fonte}px`,
}))
</script>

<template>
  <div class="miniatura" :style="estilo">
    <img v-if="url" :src="url" alt="" class="imagem" />
    <div v-else-if="medidas.icone" class="icone-placeholder">
      <RussoIcone nome="image" :tamanho="medidas.icone" />
    </div>
    <div class="carimbo" :style="estiloCarimbo">{{ horario }}</div>
    <button
      v-if="removivel"
      type="button"
      class="remover"
      aria-label="Remover foto"
      @click="$emit('remover')"
    >
      <RussoIcone nome="cancel" :tamanho="14" />
    </button>
  </div>
</template>

<style scoped>
.miniatura {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  flex: none;
}
.imagem {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.icone-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  opacity: 0.6;
}
.carimbo {
  position: absolute;
  font-weight: 600;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  border-radius: 4px;
}
.remover {
  position: absolute;
  top: 3px;
  right: 3px;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.9);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--kgb-tinta);
}
</style>
