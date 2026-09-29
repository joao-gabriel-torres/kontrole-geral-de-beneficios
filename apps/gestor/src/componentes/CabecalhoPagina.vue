<script setup lang="ts">
defineProps<{
  titulo: string
  subtitulo?: string
  sobretitulo?: string
  alturaMinima?: number
  /** "base" alinha título e ações pela base (cabeçalho do Painel no protótipo). */
  alinhamento?: 'centro' | 'base'
}>()
</script>

<template>
  <div
    class="cabecalho"
    :class="{ base: alinhamento === 'base' }"
    :style="alturaMinima ? { minHeight: `${alturaMinima}px` } : undefined"
  >
    <div class="textos">
      <div v-if="sobretitulo" class="sobretitulo">{{ sobretitulo }}</div>
      <h1 class="titulo">{{ titulo }}</h1>
      <div v-if="subtitulo" class="subtitulo">{{ subtitulo }}</div>
    </div>
    <slot name="acoes" />
  </div>
</template>

<style scoped>
.cabecalho {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
}
.cabecalho.base {
  align-items: flex-end;
}
.textos {
  flex: 1;
  min-width: 200px;
}
.sobretitulo {
  font-size: 12px;
  font-weight: 500;
  color: var(--kgb-terciario);
}
.titulo {
  margin: 0;
  font-size: 24px;
  line-height: 36px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.subtitulo {
  font-size: 14px;
  color: var(--kgb-secundario);
}
</style>
