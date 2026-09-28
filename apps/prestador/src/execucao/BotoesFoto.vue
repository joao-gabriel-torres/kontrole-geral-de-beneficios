<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { RussoIcone } from '@kgb/ui'
import { ref } from 'vue'
import { avisar } from '../avisos'
import { capturarNativa, prepararArquivo, type FotoCapturada, type OrigemFoto } from './fotos'

withDefaults(
  defineProps<{
    /** azul: etapas e conclusão; coral: painel "Marcar como inviável". */
    cor: 'azul' | 'coral'
    /** Fotos que a tela ainda está enviando: aparecem como blocos "Carregando…". */
    pendentes?: number
  }>(),
  { pendentes: 0 },
)
const emit = defineEmits<{ foto: [foto: FotoCapturada] }>()

const nativo = Capacitor.isNativePlatform()
const inputCamera = ref<HTMLInputElement>()
/** Fotos sendo preparadas (câmera nativa aberta, redimensionamento). */
const preparando = ref(0)

async function entregar(obter: () => Promise<FotoCapturada | null>, origem: OrigemFoto) {
  preparando.value++
  try {
    const foto = await obter()
    preparando.value--
    if (foto) emit('foto', foto)
  } catch {
    preparando.value--
    avisar(
      origem === 'camera'
        ? 'Não foi possível usar a câmera. Confira a permissão nos ajustes do aparelho.'
        : 'Não foi possível abrir a foto escolhida.',
    )
  }
}

function abrirCamera() {
  if (nativo) void entregar(() => capturarNativa('camera'), 'camera')
  else inputCamera.value?.click()
}

function abrirGaleriaNativa(evento: Event) {
  if (!nativo) return
  evento.preventDefault()
  void entregar(() => capturarNativa('galeria'), 'galeria')
}

function aoEscolher(evento: Event, origem: OrigemFoto) {
  const input = evento.target as HTMLInputElement
  const arquivo = input.files?.[0]
  input.value = ''
  if (arquivo) void entregar(() => prepararArquivo(arquivo), origem)
}
</script>

<template>
  <div
    v-for="n in preparando + pendentes"
    :key="`pendente-${n}`"
    class="bloco-pendente"
    role="status"
  >
    Carregando…
  </div>
  <button type="button" class="bloco-foto" :class="cor" @click="abrirCamera">
    <RussoIcone nome="camera" :tamanho="20" class="icone" />Câmera
  </button>
  <input
    ref="inputCamera"
    data-origem="camera"
    type="file"
    accept="image/*"
    capture="environment"
    class="escondido"
    @change="aoEscolher($event, 'camera')"
  />
  <label class="bloco-foto" :class="cor" @click="abrirGaleriaNativa">
    <input
      data-origem="galeria"
      type="file"
      accept="image/*"
      class="escondido"
      @change="aoEscolher($event, 'galeria')"
    />
    <RussoIcone nome="image" :tamanho="20" class="icone" />Galeria
  </label>
</template>

<style scoped>
.bloco-foto {
  width: 68px;
  height: 68px;
  border: 1px dashed var(--kgb-primaria);
  border-radius: 12px;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 11px;
  font-weight: 600;
  color: var(--kgb-primaria-escura);
  cursor: pointer;
}
.bloco-foto.coral {
  border-color: var(--kgb-coral);
  color: var(--kgb-inviavel);
}
.icone {
  color: var(--kgb-tinta);
}
/* Não existe no protótipo: só aparece enquanto uma foto é preparada ou enviada. */
.bloco-pendente {
  width: 68px;
  height: 68px;
  border-radius: 12px;
  background: var(--kgb-superficie2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.escondido {
  display: none;
}
</style>
