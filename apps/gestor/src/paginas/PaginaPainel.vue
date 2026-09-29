<script setup lang="ts">
import { AvatarIniciais, dataPorExtenso, EmConstrucao, MenuUsuario } from '@kgb/ui'
import { useDisplay } from 'vuetify'
import BotaoNovoAcionamento from '../acionamentos/novo/BotaoNovoAcionamento.vue'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
import { usarSaida } from '../saida'
import { sessao } from '../sessao'

const hoje = dataPorExtenso(new Date())
const { mdAndUp } = useDisplay()
const encerrarSessao = usarSaida()
</script>

<template>
  <PaginaGestor :largura="1280" :espaco="20">
    <div class="topo">
      <CabecalhoPagina :sobretitulo="hoje" titulo="Seu painel" alinhamento="base">
        <template #acoes><BotaoNovoAcionamento /></template>
      </CabecalhoPagina>
      <!-- No celular não há barra lateral: a conta (e o "Sair") fica no canto do Painel. -->
      <div v-if="!mdAndUp" class="conta">
        <MenuUsuario @sair="encerrarSessao">
          <AvatarIniciais
            :nome="sessao.usuario?.nome ?? ''"
            :tamanho="40"
            cor="var(--kgb-primaria)"
            :tamanho-fonte="14"
          />
        </MenuUsuario>
      </div>
    </div>
    <EmConstrucao />
  </PaginaGestor>
</template>

<style scoped>
.topo {
  position: relative;
}
.conta {
  position: absolute;
  top: 0;
  right: 0;
}
</style>
