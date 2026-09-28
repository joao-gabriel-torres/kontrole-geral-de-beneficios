<script setup lang="ts">
import { MiniaturaFoto } from '@kgb/ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import BotoesFoto from './BotoesFoto.vue'
import type { FotoCapturada } from './fotos'
import { MAXIMO_FOTOS_INVIAVEL, validarInviabilidade } from './regras'

const props = defineProps<{ aberto: boolean; enviando: boolean }>()
const emit = defineEmits<{ fechar: []; enviar: [comentario: string, arquivos: Blob[]] }>()

/** Fotos ainda não enviadas: ficam só no aparelho até "Enviar ao gestor". */
interface FotoLocal {
  id: number
  arquivo: Blob
  previa: string
  horario: string
}

const comentario = ref('')
const fotos = ref<FotoLocal[]>([])
let proximoId = 0

const valido = computed(() =>
  validarInviabilidade({ comentario: comentario.value, fotos: fotos.value.length }),
)

function limpar() {
  fotos.value.forEach((f) => URL.revokeObjectURL(f.previa))
  fotos.value = []
  comentario.value = ''
}

watch(
  () => props.aberto,
  (aberto) => {
    if (!aberto) limpar()
  },
)
onBeforeUnmount(limpar)

function adicionar(foto: FotoCapturada) {
  if (fotos.value.length >= MAXIMO_FOTOS_INVIAVEL) return
  fotos.value.push({
    id: ++proximoId,
    arquivo: foto.arquivo,
    previa: URL.createObjectURL(foto.arquivo),
    // "2026-09-28T15:10:00-03:00" → "15:10", a hora local da captura.
    horario: foto.tiradaEm.slice(11, 16),
  })
}

function remover(id: number) {
  const foto = fotos.value.find((f) => f.id === id)
  if (foto) URL.revokeObjectURL(foto.previa)
  fotos.value = fotos.value.filter((f) => f.id !== id)
}

function enviar() {
  if (!valido.value || props.enviando) return
  emit(
    'enviar',
    comentario.value.trim(),
    fotos.value.map((f) => f.arquivo),
  )
}
</script>

<template>
  <div
    v-if="aberto"
    class="sobreposicao"
    role="dialog"
    aria-modal="true"
    aria-labelledby="titulo-inviavel"
    @keydown.esc="$emit('fechar')"
  >
    <div class="painel">
      <div class="alca" />
      <div>
        <div id="titulo-inviavel" class="titulo-painel">Marcar como inviável</div>
        <div class="explicacao">
          Explique o motivo e registre pelo menos 1 foto. O gestor vai conferir.
        </div>
      </div>
      <textarea v-model="comentario" class="motivo" placeholder="Motivo" />
      <div class="fotos">
        <MiniaturaFoto
          v-for="foto in fotos"
          :key="foto.id"
          :tamanho="68"
          :url="foto.previa"
          :horario="foto.horario"
          removivel
          @remover="remover(foto.id)"
        />
        <BotoesFoto v-if="fotos.length < MAXIMO_FOTOS_INVIAVEL" cor="coral" @foto="adicionar" />
      </div>
      <div class="botoes">
        <button type="button" class="cancelar" @click="$emit('fechar')">Cancelar</button>
        <button type="button" class="enviar" :disabled="!valido" @click="enviar">
          Enviar ao gestor
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* No protótipo a sobreposição cobre a tela do aparelho inteira (position absolute na moldura). */
.sobreposicao {
  position: fixed;
  inset: 0;
  background: var(--kgb-sobreposicao);
  z-index: 30;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.painel {
  background: #fff;
  border-radius: 24px 24px 0 0;
  padding: 12px 24px 28px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.alca {
  width: 40px;
  height: 5px;
  border-radius: 3px;
  background: var(--kgb-divisor);
  align-self: center;
}
.titulo-painel {
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.explicacao {
  font-size: 13px;
  color: var(--kgb-secundario);
}
.motivo {
  height: 96px;
  resize: none;
  border: 1px solid var(--kgb-divisor);
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  outline: 0;
}
.motivo:focus {
  border-color: var(--kgb-tinta);
}
.fotos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.botoes {
  display: flex;
  gap: 8px;
}
/* Sem padding no protótipo: vale o padrão do navegador para <button>. */
.cancelar,
.enviar {
  height: 48px;
  border: 0;
  border-radius: 16px;
  padding: 1px 6px;
  font-size: 14px;
  font-weight: 600;
}
.cancelar {
  flex: 1;
  background: var(--kgb-superficie2);
  color: var(--kgb-texto);
}
.enviar {
  flex: 1.6;
  background: var(--kgb-tinta);
  color: #fff;
}
.enviar:disabled {
  background: var(--kgb-superficie2);
  color: #a29eb6;
  cursor: default;
}
</style>
