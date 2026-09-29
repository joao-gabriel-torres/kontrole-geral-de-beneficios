<script setup lang="ts">
defineProps<{ mensagem: string | null; variante: 'gestor' | 'prestador' }>()
</script>

<template>
  <!--
    A região viva fica sempre montada: um role="status" que entra no DOM já com o texto (v-if) nem
    sempre é anunciado pelo VoiceOver e pelo NVDA. O anúncio vem do texto entrando nesta região.
  -->
  <div class="regiao-aviso" aria-live="polite" aria-atomic="true">
    <div v-if="mensagem" class="toast" :class="variante" role="status">
      {{ mensagem }}
    </div>
  </div>
</template>

<style scoped>
/*
  Mesma largura e mesma base do contêiner, sem altura e sem z-index (não cria contexto de
  empilhamento): as posições do .toast continuam relativas ao mesmo retângulo de antes.
*/
.regiao-aviso {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 0;
}
.toast {
  position: absolute;
  background: var(--kgb-tinta);
  color: #fff;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 12px 32px rgba(28, 18, 67, 0.2);
}
.gestor {
  left: 50%;
  bottom: 96px;
  transform: translateX(-50%);
  padding: 12px 18px;
  border-radius: 12px;
  z-index: 30;
  /* Uma linha como no protótipo; mensagem longa quebra em vez de sair da tela estreita. */
  width: max-content;
  max-width: calc(100% - 32px);
  text-align: center;
}
.prestador {
  left: 24px;
  right: 24px;
  bottom: 110px;
  padding: 12px 16px;
  border-radius: 14px;
  text-align: center;
  z-index: 40;
}
</style>
