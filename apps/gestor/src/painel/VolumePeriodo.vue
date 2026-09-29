<script setup lang="ts">
import type { Barra } from './apresentacao'

defineProps<{ barras: readonly Barra[] }>()
</script>

<template>
  <section class="volume" aria-label="Volume por período">
    <div class="topo">
      <div class="titulo">Volume por período</div>
      <div class="legenda"><span class="quadrado" />Aprovados</div>
      <div class="legenda"><span class="quadrado demais" />Demais status</div>
    </div>
    <!-- Mesma estrutura do protótipo: a altura em % é da coluna inteira (números e rótulos
         incluídos), então o maior dia fica com 142px, não 180. -->
    <div class="barras">
      <div v-for="b in barras" :key="b.chave" class="coluna">
        <div class="numero">{{ b.numero }}</div>
        <div class="barra" :style="{ height: b.altura, background: b.fundo }">
          <div class="aprovados" :style="{ height: b.alturaAprovados }" />
        </div>
        <div class="rotulo">{{ b.rotulo }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.volume {
  flex: 2 1 420px;
  min-width: 0;
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.topo {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.titulo {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.legenda {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--kgb-secundario);
}
.quadrado {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  background: var(--kgb-primaria);
}
.quadrado.demais {
  background: var(--kgb-primaria-tint-forte);
}
.barras {
  display: flex;
  align-items: flex-end;
  gap: 4px;
  height: 180px;
}
.coluna {
  flex: 1;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}
.numero {
  font-size: 11px;
  font-weight: 600;
  color: var(--kgb-secundario);
  height: 14px;
}
.barra {
  width: 100%;
  max-width: 44px;
  border-radius: 6px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}
.aprovados {
  background: var(--kgb-primaria);
}
.rotulo {
  font-size: 11px;
  font-weight: 500;
  color: var(--kgb-terciario);
  height: 14px;
}
</style>
