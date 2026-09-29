<script setup lang="ts">
import type { TipoDemanda } from '@kgb/api-client'
import { RussoIcone } from '@kgb/ui'
import { LIMITE_ETAPA, LIMITE_NOME, rotuloItens } from './regras'

defineProps<{ tipo: TipoDemanda }>()
const novaEtapa = defineModel<string>('novaEtapa', { required: true })
const emit = defineEmits<{
  renomear: [nome: string]
  soltarNome: []
  editar: [indice: number, texto: string]
  subir: [indice: number]
  remover: [indice: number]
  adicionar: []
  excluir: []
}>()

const valor = (evento: Event) => (evento.target as HTMLInputElement).value
</script>

<template>
  <div class="editor">
    <div class="titulo">
      <span class="bolinha" :style="{ background: tipo.cor }" />
      <input
        class="nome"
        :value="tipo.nome"
        aria-label="Nome do tipo"
        :maxlength="LIMITE_NOME"
        @input="emit('renomear', valor($event))"
        @blur="emit('soltarNome')"
      />
      <button type="button" class="excluir" @click="emit('excluir')">Excluir tipo</button>
    </div>
    <div class="rotulo">Checklist · {{ rotuloItens(tipo.checklist.length) }}</div>
    <div class="etapas">
      <!-- A chave é a posição, como no protótipo: depois de "Subir", o foco fica na mesma linha. -->
      <div v-for="(texto, i) in tipo.checklist" :key="i" class="etapa">
        <span class="numero">{{ i + 1 }}</span>
        <input
          class="texto"
          :value="texto"
          :aria-label="`Etapa ${i + 1}`"
          :maxlength="LIMITE_ETAPA"
          @input="emit('editar', i, valor($event))"
        />
        <!-- Na 1ª etapa, "Subir" fica apagado mas não desabilitado (protótipo): o clique não faz nada. -->
        <button
          type="button"
          class="acao"
          title="Subir"
          :style="{ opacity: i ? 1 : 0.3 }"
          @click="emit('subir', i)"
        >
          <RussoIcone nome="chevron-right" :tamanho="18" class="seta" />
        </button>
        <button type="button" class="acao remover" title="Remover" @click="emit('remover', i)">
          <RussoIcone nome="cancel" :tamanho="18" />
        </button>
      </div>
      <div v-if="tipo.checklist.length === 0" class="vazio">Nenhum item ainda.</div>
    </div>
    <div class="nova">
      <input
        v-model="novaEtapa"
        class="campo"
        placeholder="Nova etapa do checklist"
        :maxlength="LIMITE_ETAPA"
        @keydown.enter="emit('adicionar')"
      />
      <button type="button" class="adicionar" @click="emit('adicionar')">Adicionar etapa</button>
    </div>
  </div>
</template>

<style scoped>
/* Medidas e cores do protótipo (Acionamentos.dc.html, L284–305). */
.editor {
  flex: 2 1 340px;
  min-width: 0;
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.titulo {
  display: flex;
  align-items: center;
  gap: 12px;
}
.bolinha {
  width: 14px;
  height: 14px;
  border-radius: 7px;
  flex: none;
}
.nome {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
  padding: 4px 0;
  border-bottom: 1px solid transparent;
}
.nome:focus {
  border-bottom-color: var(--kgb-tinta);
}
/* Sem padding explícito no protótipo: vale o padrão do navegador (1px 6px). */
.excluir {
  border: 0;
  background: transparent;
  padding: 1px 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-perigo-texto);
}
.rotulo {
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-terciario);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}
.etapas {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.etapa {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 4px 4px 12px;
  border-radius: 12px;
  background: var(--kgb-superficie1);
}
.numero {
  width: 22px;
  font-size: 12px;
  font-weight: 700;
  color: var(--kgb-terciario);
}
/* Sem padding explícito no protótipo: vale o padrão do navegador para input (1px 2px). */
.texto {
  flex: 1;
  min-width: 0;
  height: 40px;
  border: 0;
  background: transparent;
  outline: 0;
  padding: 1px 2px;
  font-size: 14px;
  font-weight: 500;
}
.acao {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  padding: 1px 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.remover:hover {
  background: var(--kgb-perigo-fundo);
}
.seta {
  transform: rotate(-90deg);
}
.vazio {
  font-size: 14px;
  color: var(--kgb-terciario);
  padding: 8px 0;
}
.nova {
  display: flex;
  gap: 8px;
}
.campo {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 1px dashed var(--kgb-primaria);
  border-radius: 12px;
  padding: 0 14px;
  font-size: 14px;
  outline: 0;
}
.adicionar {
  height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 12px;
  background: var(--kgb-primaria);
  color: var(--kgb-branco);
  font-size: 14px;
  font-weight: 600;
}
</style>
