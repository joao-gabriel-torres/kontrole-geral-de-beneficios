<script setup lang="ts">
import { EmConstrucao } from '@kgb/ui'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
</script>

<template>
  <PaginaGestor :largura="1080">
    <CabecalhoPagina
      titulo="Tipos de demanda"
      subtitulo="O checklist de cada tipo é copiado para o acionamento quando ele é criado."
    />
    <EmConstrucao />
  </PaginaGestor>
</template>
