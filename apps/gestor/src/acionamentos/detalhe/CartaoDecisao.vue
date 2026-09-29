<script setup lang="ts">
import { computed } from 'vue'
import { rotulosDecisao, type Decisao } from './decisao'

/** `enviando`: a decisão em envio (o botão clicado mostra "Enviando…"), ou null. */
const props = defineProps<{ inviavel: boolean; enviando: Decisao | null }>()
const emit = defineEmits<{ decidir: [decisao: Decisao, observacao: string] }>()
const observacao = defineModel<string>('observacao', { default: '' })
const rotulos = computed(() => rotulosDecisao(props.inviavel))
</script>

<template>
  <section class="decisao" aria-labelledby="decisao-titulo">
    <h2 id="decisao-titulo" class="titulo">{{ rotulos.titulo }}</h2>
    <textarea
      v-model="observacao"
      class="observacao"
      placeholder="Observação para o prestador (obrigatória para reprovar)"
      aria-label="Observação para o prestador"
    />
    <button
      type="button"
      class="aprovar"
      :disabled="!!enviando"
      :aria-busy="enviando === 'aprovado' || undefined"
      @click="emit('decidir', 'aprovado', observacao)"
    >
      {{ enviando === 'aprovado' ? 'Enviando…' : rotulos.aprovar }}
    </button>
    <button
      type="button"
      class="reprovar"
      :disabled="!!enviando"
      :aria-busy="enviando === 'reprovado' || undefined"
      @click="emit('decidir', 'reprovado', observacao)"
    >
      {{ enviando === 'reprovado' ? 'Enviando…' : rotulos.reprovar }}
    </button>
  </section>
</template>

<style scoped>
.decisao {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: var(--kgb-sombra-elevado);
}
.titulo {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.observacao {
  height: 96px;
  resize: none;
  border: 1px solid var(--kgb-divisor);
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-weight: 400;
  outline: 0;
}
.observacao:focus {
  border-color: var(--kgb-tinta);
}
/* Sem padding explícito: como no protótipo, fica o padrão do navegador (1px 6px). */
.aprovar,
.reprovar {
  height: 48px;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}
.aprovar {
  border: 0;
  background: var(--kgb-primaria);
  color: #fff;
}
.aprovar:hover:not(:disabled) {
  background: var(--kgb-primaria-hover);
}
.reprovar {
  border: 1px solid var(--kgb-perigo);
  background: var(--kgb-branco);
  color: var(--kgb-perigo-texto);
}
.reprovar:hover:not(:disabled) {
  background: var(--kgb-perigo-fundo);
}
/* Só durante o envio: em repouso os botões nunca estão desabilitados. */
.aprovar:disabled,
.reprovar:disabled {
  opacity: 0.6;
  cursor: progress;
}
</style>
