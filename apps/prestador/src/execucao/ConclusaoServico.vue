<script setup lang="ts">
import { resolverUrl, type Foto } from '@kgb/api-client'
import { MiniaturaFoto } from '@kgb/ui'
import { baseApi } from '../api'
import BotoesFoto from './BotoesFoto.vue'
import type { FotoCapturada } from './fotos'
import { textoFotosObrigatorias } from './regras'
import { usarAutosave } from './usarAutosave'

const props = defineProps<{
  fotos: Foto[]
  comentario: string | null
  editavel: boolean
  fotosMinimas: number
  salvarComentario: (texto: string) => Promise<unknown>
}>()
defineEmits<{ adicionarFoto: [foto: FotoCapturada]; removerFoto: [fotoId: string] }>()

const { texto, digitar } = usarAutosave({
  valor: () => props.comentario,
  salvar: (t) => props.salvarComentario(t),
})
</script>

<template>
  <div class="conclusao">
    <div>
      <div class="titulo-conclusao">Conclusão do serviço</div>
      <div class="obrigatorias">{{ textoFotosObrigatorias(fotosMinimas) }}</div>
    </div>
    <div class="fotos">
      <MiniaturaFoto
        v-for="foto in fotos"
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
      placeholder="Comentário final para o gestor"
      :value="texto"
      @input="digitar(($event.target as HTMLTextAreaElement).value)"
    />
  </div>
</template>

<style scoped>
.conclusao {
  border: 1px solid var(--kgb-primaria-tint-forte);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.titulo-conclusao {
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.obrigatorias {
  font-size: 12px;
  color: var(--kgb-terciario);
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
</style>
