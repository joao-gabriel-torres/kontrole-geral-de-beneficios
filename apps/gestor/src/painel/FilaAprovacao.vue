<script setup lang="ts">
import { AvatarIniciais, StatusChip } from '@kgb/ui'
import type { ItemFila } from './apresentacao'

defineProps<{ total: number; itens: readonly ItemFila[] }>()
</script>

<template>
  <section class="fila" aria-label="Fila de aprovação">
    <div class="cabeca">
      <div class="titulo">Fila de aprovação</div>
      <span class="selo">{{ total }}</span>
    </div>
    <div v-if="itens.length === 0" class="vazia">Nada para conferir agora.</div>
    <RouterLink
      v-for="i in itens"
      :key="i.id"
      :to="{ name: 'painel-acionamento', params: { id: i.id } }"
      class="item"
    >
      <AvatarIniciais
        :nome="i.prestador.nome"
        :cor="i.prestador.cor"
        :tamanho="36"
        :tamanho-fonte="12"
      />
      <div class="textos">
        <div class="titulo-item">{{ i.titulo }}</div>
        <div class="linha">{{ i.linha }}</div>
      </div>
      <StatusChip :status="i.status" :inviavel="i.inviavel" />
    </RouterLink>
  </section>
</template>

<style scoped>
.fila {
  flex: 1 1 320px;
  min-width: 0;
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.cabeca {
  display: flex;
  align-items: center;
}
.titulo {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.selo {
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-laranja-texto);
  background: var(--kgb-laranja-claro);
  padding: 2px 10px;
  border-radius: 999px;
}
.vazia {
  font-size: 14px;
  color: var(--kgb-terciario);
  padding: 12px 0;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 12px;
  background: var(--kgb-superficie1);
  cursor: pointer;
}
.item:hover {
  background: var(--kgb-primaria-hover-leve);
}
.textos {
  flex: 1;
  min-width: 0;
}
.titulo-item {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.linha {
  font-size: 12px;
  color: var(--kgb-terciario);
}
</style>
