<script setup lang="ts">
import { resolverUrl, type DetalheAcionamento } from '@kgb/api-client'
import { MiniaturaFoto, RussoIcone } from '@kgb/ui'
import { computed } from 'vue'
import { baseApi } from '../api'
import BotoesFoto from './BotoesFoto.vue'
import type { FotoCapturada } from './fotos'
import { resumoEtapa } from './regras'
import { usarAutosave } from './usarAutosave'

type Etapa = DetalheAcionamento['demandas'][number]['etapas'][number]

const props = defineProps<{
  etapa: Etapa
  editavel: boolean
  aberta: boolean
  salvarComentario: (texto: string) => Promise<unknown>
}>()
const emit = defineEmits<{
  alternar: []
  expandir: []
  adicionarFoto: [foto: FotoCapturada]
  removerFoto: [fotoId: string]
}>()

const { texto, digitar } = usarAutosave({
  valor: () => props.etapa.comentario,
  salvar: (t) => props.salvarComentario(t),
})
const resumo = computed(() =>
  resumoEtapa(props.etapa.fotos.length, props.editavel ? texto.value : props.etapa.comentario),
)
const semNada = computed(() => !props.etapa.fotos.length && !props.etapa.comentario)

function alternar() {
  if (props.editavel) emit('alternar')
}
</script>

<template>
  <div class="etapa">
    <div class="linha">
      <button
        type="button"
        class="caixa"
        role="checkbox"
        :aria-checked="etapa.feita"
        :aria-label="etapa.texto"
        :aria-disabled="!editavel"
        @click="alternar"
      >
        <div v-if="etapa.feita" class="marcada"><RussoIcone nome="check" :tamanho="18" /></div>
        <div v-else class="desmarcada" />
      </button>
      <div class="texto-clicavel" @click="$emit('expandir')">
        <div class="texto-etapa" :class="{ feita: etapa.feita }">{{ etapa.texto }}</div>
        <div v-if="resumo" class="resumo">{{ resumo }}</div>
      </div>
      <button
        type="button"
        class="chevron"
        :aria-expanded="aberta"
        aria-label="Fotos e comentário da etapa"
        @click="$emit('expandir')"
      >
        <RussoIcone
          nome="chevron-right"
          :tamanho="18"
          :style="{ transform: aberta ? 'rotate(-90deg)' : 'rotate(90deg)' }"
        />
      </button>
    </div>
    <div v-if="aberta" class="expandido">
      <!-- A linha de fotos existe mesmo vazia: o gap de 10px do protótipo conta com ela. -->
      <div class="fotos">
        <MiniaturaFoto
          v-for="foto in etapa.fotos"
          :key="foto.id"
          :tamanho="68"
          :url="resolverUrl(baseApi, foto.url)"
          :cor="foto.cor"
          :horario="foto.horario"
          :removivel="editavel"
          @remover="$emit('removerFoto', foto.id)"
        />
        <BotoesFoto v-if="editavel" cor="azul" @foto="$emit('adicionarFoto', $event)" />
      </div>
      <textarea
        v-if="editavel"
        class="comentario"
        placeholder="Comentário"
        :value="texto"
        @input="digitar(($event.target as HTMLTextAreaElement).value)"
      />
      <div v-else-if="semNada" class="vazio">Sem fotos ou comentários.</div>
    </div>
  </div>
</template>

<style scoped>
.etapa {
  background: var(--kgb-superficie1);
  border-radius: 16px;
}
.linha {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 12px 12px 14px;
}
.caixa {
  width: 28px;
  height: 28px;
  border: 0;
  padding: 0;
  background: transparent;
  flex: none;
}
.marcada {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--kgb-primaria);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
}
.desmarcada {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  border: 1.5px solid var(--kgb-linha);
  background: #fff;
}
.texto-clicavel {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.texto-etapa {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.texto-etapa.feita {
  color: var(--kgb-titulo);
}
.resumo {
  font-size: 12px;
  color: var(--kgb-primaria-escura);
  font-weight: 500;
}
.chevron {
  width: 32px;
  height: 32px;
  border: 0;
  /* Sem padding no protótipo: vale o padrão do navegador para <button>. */
  padding: 1px 6px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--kgb-tinta);
}
.expandido {
  padding: 0 14px 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.fotos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.comentario {
  height: 64px;
  resize: none;
  border: 1px solid var(--kgb-divisor);
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 14px;
  outline: 0;
  background: #fff;
}
.comentario:focus {
  border-color: var(--kgb-tinta);
}
.vazio {
  font-size: 12px;
  color: var(--kgb-terciario);
}
</style>
