<script setup lang="ts">
import { AvatarIniciais, RussoIcone } from '@kgb/ui'
import type { ItemNavegacao } from '../navegacao'

defineProps<{ itens: readonly ItemNavegacao[]; aprovacoes: number; usuario: string }>()
</script>

<template>
  <nav class="lateral" aria-label="Navegação principal">
    <div class="titulo">Gestão de demandas</div>
    <RouterLink
      v-for="item in itens"
      :key="item.rota"
      :to="{ name: item.rota }"
      class="item"
      active-class="ativo"
    >
      <RussoIcone :nome="item.icone" :tamanho="20" class="icone" />
      <span class="rotulo">{{ item.rotulo }}</span>
      <span v-if="item.rota === 'aprovacoes' && aprovacoes > 0" class="badge">{{
        aprovacoes
      }}</span>
    </RouterLink>
    <div class="espaco" />
    <div class="usuario">
      <AvatarIniciais :nome="usuario" :tamanho="36" cor="var(--kgb-tinta)" :tamanho-fonte="13" />
      <div class="dados">
        <div class="nome">{{ usuario }}</div>
        <div class="papel">Gestora</div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.lateral {
  width: 232px;
  flex: none;
  background: var(--kgb-branco);
  border-right: 1px solid var(--kgb-divisor);
  padding: 24px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.titulo {
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-terciario);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0 12px 12px;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 12px;
  border-radius: 12px;
  background: transparent;
  color: var(--kgb-texto);
  font-size: 14px;
  font-weight: 600;
  text-align: left;
}
.item:hover {
  background: var(--kgb-primaria-hover-leve);
  color: var(--kgb-texto);
}
.item.ativo {
  background: var(--kgb-primaria-tint);
  color: var(--kgb-primaria-escura);
}
.icone {
  color: var(--kgb-tinta);
}
.rotulo {
  flex: 1;
}
.badge {
  min-width: 22px;
  height: 22px;
  padding: 0 6px;
  border-radius: 11px;
  background: var(--kgb-laranja);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.espaco {
  flex: 1;
}
.usuario {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  border-radius: 12px;
  background: var(--kgb-superficie1);
}
.dados {
  min-width: 0;
}
.nome {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.papel {
  font-size: 12px;
  color: var(--kgb-terciario);
}
</style>
