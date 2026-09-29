<script setup lang="ts">
import type { TipoDemanda } from '@kgb/api-client'
import { LIMITE_NOME, rotuloItens } from './regras'

defineProps<{ tipos: readonly TipoDemanda[]; selecionadoId: string | null }>()
const novoTipo = defineModel<string>('novoTipo', { required: true })
const emit = defineEmits<{ selecionar: [id: string]; criar: [] }>()
</script>

<template>
  <div class="lista">
    <!-- O espaço entre o nome e a contagem compõe o nome acessível: "Vazamento 5 itens". -->
    <button
      v-for="t in tipos"
      :key="t.id"
      type="button"
      class="tipo"
      :class="{ selecionado: t.id === selecionadoId }"
      @click="emit('selecionar', t.id)"
    >
      <span class="bolinha" :style="{ background: t.cor }" /><span class="nome">{{ t.nome }}</span
      >{{ ' ' }}<span class="itens">{{ rotuloItens(t.checklist.length) }}</span>
    </button>
    <div class="novo">
      <input
        v-model="novoTipo"
        class="campo"
        placeholder="Novo tipo"
        :maxlength="LIMITE_NOME"
        @keydown.enter="emit('criar')"
      />
      <button type="button" class="adicionar" @click="emit('criar')">Adicionar</button>
    </div>
  </div>
</template>

<style scoped>
/* Medidas e cores do protótipo (Acionamentos.dc.html, L271–282). */
.lista {
  flex: 1 1 240px;
  min-width: 0;
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.tipo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 12px;
  background: var(--kgb-branco);
  text-align: left;
}
.tipo.selecionado {
  border-color: var(--kgb-primaria);
  background: var(--kgb-primaria-tint);
}
.bolinha {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  flex: none;
}
.nome {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.itens {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.novo {
  display: flex;
  gap: 8px;
  padding: 8px 4px 4px;
  border-top: 1px solid var(--kgb-divisor);
  margin-top: 4px;
}
.campo {
  flex: 1;
  min-width: 0;
  height: 40px;
  border: 1px dashed var(--kgb-primaria);
  border-radius: 12px;
  padding: 0 12px;
  font-size: 14px;
  outline: 0;
}
.adicionar {
  height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: 12px;
  background: var(--kgb-primaria-tint);
  color: var(--kgb-primaria-escura);
  font-size: 13px;
  font-weight: 600;
}
</style>
