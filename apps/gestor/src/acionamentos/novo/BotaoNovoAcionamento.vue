<script setup lang="ts">
import { novoAcionamento } from './estado'
</script>

<template>
  <button type="button" class="novo" @click="novoAcionamento.abrir()">Novo acionamento</button>
</template>

<style scoped>
.novo {
  height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 16px;
  background: var(--kgb-primaria);
  color: #fff;
  font-size: 14px;
  font-weight: 600;
}
.novo:hover {
  background: var(--kgb-primaria-hover);
}
</style>
