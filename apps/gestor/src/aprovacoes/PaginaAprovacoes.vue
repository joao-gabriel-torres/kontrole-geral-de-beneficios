<script setup lang="ts">
import { EmConstrucao } from '@kgb/ui'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
</script>

<template>
  <PaginaGestor :largura="1080">
    <CabecalhoPagina
      titulo="Aprovações"
      subtitulo="Confira as fotos e comentários de cada etapa antes de aprovar."
    />
    <EmConstrucao />
  </PaginaGestor>
</template>
