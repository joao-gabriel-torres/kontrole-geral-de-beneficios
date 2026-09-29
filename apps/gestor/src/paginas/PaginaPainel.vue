<script setup lang="ts">
import { dataPorExtenso, EmConstrucao } from '@kgb/ui'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'

const hoje = dataPorExtenso(new Date())
</script>

<template>
  <PaginaGestor :largura="1280" :espaco="20">
    <CabecalhoPagina :sobretitulo="hoje" titulo="Seu painel" />
    <EmConstrucao />
  </PaginaGestor>
</template>
