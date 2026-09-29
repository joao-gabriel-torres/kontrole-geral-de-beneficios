<script setup lang="ts">
defineProps<{ mensagem: string | null; variante: 'gestor' | 'prestador' }>()
</script>

<template>
  <div v-if="mensagem" class="toast" :class="variante" role="status" aria-live="polite">
    {{ mensagem }}
  </div>
</template>

<style scoped>
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
