<script setup lang="ts">
import { RussoIcone } from '@kgb/ui'
import type { ItemNavegacao } from '../navegacao'

defineProps<{ itens: readonly ItemNavegacao[]; aprovacoes: number }>()
</script>

<template>
  <nav class="inferior" aria-label="Navegação principal">
    <RouterLink
      v-for="item in itens"
      :key="item.rota"
      :to="{ name: item.rota }"
      class="item"
      active-class="ativo"
    >
      <RussoIcone :nome="item.icone" :tamanho="22" class="icone" />
      <span class="rotulo">{{ item.rotulo }}</span>
      <span class="ponto" />
      <span v-if="item.rota === 'aprovacoes' && aprovacoes > 0" class="badge">{{
        aprovacoes
      }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.inferior {
  height: calc(62px + max(14px, env(safe-area-inset-bottom)));
  flex: none;
  display: flex;
  background: var(--kgb-branco);
  border-top: 1px solid var(--kgb-divisor);
  padding: 6px 8px max(14px, env(safe-area-inset-bottom));
}
.item {
  flex: 1;
  /* Os botões do protótipo não definem padding: herdam o padrão do navegador para <button>. */
  padding: 1px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  position: relative;
}
.icone {
  color: var(--kgb-tinta);
}
.rotulo {
  font-size: 11px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.ativo .rotulo {
  color: var(--kgb-primaria-escura);
}
.ponto {
  width: 4px;
  height: 4px;
  border-radius: 2px;
  background: transparent;
}
.ativo .ponto {
  background: var(--kgb-primaria);
}
.badge {
  position: absolute;
  top: 0;
  left: 52%;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--kgb-laranja);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
