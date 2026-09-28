<script setup lang="ts">
withDefaults(defineProps<{ largura?: 1080 | 1180 | 1280; espaco?: 16 | 20 }>(), {
  largura: 1280,
  espaco: 16,
})
</script>

<template>
  <div class="pagina" :style="{ maxWidth: `${largura}px`, gap: `${espaco}px` }">
    <slot />
  </div>
</template>

<style scoped>
.pagina {
  display: flex;
  flex-direction: column;
  margin: 0 auto;
}
</style>
