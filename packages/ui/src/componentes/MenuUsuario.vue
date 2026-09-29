<script setup lang="ts">
import { ref } from 'vue'

withDefaults(defineProps<{ posicao?: 'acima' | 'abaixo' }>(), { posicao: 'abaixo' })
const emit = defineEmits<{ sair: [] }>()
const aberto = ref(false)

function sair() {
  aberto.value = false
  emit('sair')
}
</script>

<template>
  <div class="menu-usuario">
    <!-- O gatilho não altera o visual do conteúdo: o protótipo não tem affordance de sair. -->
    <button
      type="button"
      class="gatilho"
      aria-haspopup="menu"
      :aria-expanded="aberto"
      @click="aberto = !aberto"
    >
      <slot />
    </button>
    <div v-if="aberto" class="menu" :class="posicao" role="menu">
      <button type="button" role="menuitem" class="opcao" @click="sair">Sair</button>
    </div>
  </div>
</template>

<style scoped>
.menu-usuario {
  position: relative;
  flex: none;
}
.gatilho {
  all: unset;
  display: block;
  box-sizing: border-box;
  cursor: pointer;
  border-radius: 12px;
}
.gatilho:focus-visible {
  outline: 2px solid var(--kgb-primaria);
  outline-offset: 2px;
}
.menu {
  position: absolute;
  right: 0;
  z-index: 10;
  min-width: 160px;
  padding: 4px;
  border-radius: 12px;
  background: var(--kgb-branco);
  box-shadow: var(--kgb-sombra-elevado);
}
.menu.abaixo {
  top: calc(100% + 8px);
}
.menu.acima {
  bottom: calc(100% + 8px);
  left: 0;
}
.opcao {
  width: 100%;
  height: 44px;
  padding: 0 12px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-perigo-texto);
}
.opcao:hover {
  background: var(--kgb-superficie1);
}
</style>
