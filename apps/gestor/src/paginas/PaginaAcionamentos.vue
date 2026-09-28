<script setup lang="ts">
import { EmConstrucao } from '@kgb/ui'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
</script>

<template>
  <PaginaGestor :largura="1280">
    <CabecalhoPagina titulo="Acionamentos" :altura-minima="44" />
    <EmConstrucao />
  </PaginaGestor>
</template>
