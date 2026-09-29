<script setup lang="ts">
import { RussoIcone } from '@kgb/ui'
import type { Aba } from '../abas'

defineProps<{ itens: readonly Aba[] }>()
</script>

<template>
  <nav class="abas" aria-label="Navegação">
    <RouterLink
      v-for="item in itens"
      :key="item.rota"
      :to="{ name: item.rota }"
      class="aba"
      active-class="ativa"
    >
      <RussoIcone :nome="item.icone" :tamanho="24" class="icone" />
      <span class="rotulo">{{ item.rotulo }}</span>
      <span class="ponto" />
    </RouterLink>
  </nav>
</template>

<style scoped>
.abas {
  height: calc(62px + max(18px, env(safe-area-inset-bottom)));
  flex: none;
  display: flex;
  background: var(--kgb-branco);
  border-top: 1px solid var(--kgb-divisor);
  padding: 6px 16px max(18px, env(safe-area-inset-bottom));
}
.aba {
  flex: 1;
  /* Os botões do protótipo não definem padding: herdam o padrão do navegador para <button>. */
  padding: 1px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
}
.icone {
  color: var(--kgb-tinta);
}
.rotulo {
  font-size: 11px;
  font-weight: 600;
  color: var(--kgb-aba-inativa);
}
.ativa .rotulo {
  color: var(--kgb-primaria-escura);
}
.ponto {
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background: transparent;
}
.ativa .ponto {
  background: var(--kgb-primaria);
}
</style>
