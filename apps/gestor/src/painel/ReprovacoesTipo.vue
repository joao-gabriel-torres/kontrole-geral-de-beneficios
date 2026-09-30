<script setup lang="ts">
import type { LinhaReprovacao } from './apresentacao'

defineProps<{ linhas: readonly LinhaReprovacao[] }>()
</script>

<template>
  <section class="reprovacoes" aria-label="Reprovações por tipo">
    <div class="titulo">Reprovações por tipo</div>
    <div v-if="linhas.length" class="lista">
      <div v-for="l in linhas" :key="l.nome" class="reprovacao">
        <div class="texto">
          <span class="nome">{{ l.nome }}</span>
          <span class="taxa">{{ l.taxa }}</span>
          <span class="total">{{ l.total }}</span>
        </div>
        <div class="trilho"><div class="preenchido" :style="{ width: l.largura }" /></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.reprovacoes {
  flex: 1 1 280px;
  min-width: 0;
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.titulo {
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.lista {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.reprovacao {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.texto {
  display: flex;
  gap: 8px;
  font-size: 13px;
}
.nome {
  flex: 1;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.taxa {
  color: var(--kgb-terciario);
}
.total {
  font-weight: 700;
  color: var(--kgb-tinta);
  min-width: 16px;
  text-align: right;
}
.trilho {
  height: 8px;
  border-radius: 4px;
  background: var(--kgb-superficie2);
  overflow: hidden;
}
.preenchido {
  height: 100%;
  background: var(--kgb-perigo);
  border-radius: 4px;
}
</style>
