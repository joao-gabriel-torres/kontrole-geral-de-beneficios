<script setup lang="ts">
withDefaults(
  defineProps<{
    ligado: boolean
    /** O da lista anima a cor do trilho; o da importação (etapa 2) não. */
    animarTrilho?: boolean
  }>(),
  { animarTrilho: true },
)
</script>

<template>
  <!-- Só o desenho do switch (44×26): quem usa é o <button> em volta, com o rótulo. -->
  <span class="trilho" :class="{ ligado, animado: animarTrilho }" aria-hidden="true">
    <span class="botao" />
  </span>
</template>

<style scoped>
.trilho {
  position: relative;
  display: block;
  flex: none;
  width: 44px;
  height: 26px;
  border-radius: 13px;
  background: var(--kgb-divisor);
}
.trilho.animado {
  transition: background 0.2s;
}
.trilho.ligado {
  background: var(--kgb-primaria);
}
.botao {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 22px;
  height: 22px;
  border-radius: 11px;
  background: #fff;
  box-shadow:
    0 3px 1px rgba(0, 0, 0, 0.06),
    0 3px 8px rgba(0, 0, 0, 0.15);
  transform: translateX(0);
  transition: transform 0.2s;
}
.ligado .botao {
  transform: translateX(18px);
}
</style>
