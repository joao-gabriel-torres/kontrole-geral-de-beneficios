<script setup lang="ts">
import { AvatarIniciais, dataPorExtenso, MenuUsuario } from '@kgb/ui'
import { useQueryClient } from '@tanstack/vue-query'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { usarLista } from '../acionamentos/dados'
import BotaoNovoAcionamento from '../acionamentos/novo/BotaoNovoAcionamento.vue'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
import { CHAVES } from '../consultas'
import { mensagemDeErro } from '../erros'
import { usarSaida } from '../saida'
import { sessao } from '../sessao'
import {
  barrasDoVolume,
  itensDaFila,
  kpisDoPainel,
  linhasDeReprovacao,
  linhasDoRanking,
} from './apresentacao'
import { usarPainel } from './dados'
import { periodoPainel } from './estado'
import FilaAprovacao from './FilaAprovacao.vue'
import KpisPainel from './KpisPainel.vue'
import RankingPrestadores from './RankingPrestadores.vue'
import ReprovacoesTipo from './ReprovacoesTipo.vue'
import SeletorPeriodo from './SeletorPeriodo.vue'
import VolumePeriodo from './VolumePeriodo.vue'

/** O protótipo refaz o Painel a cada 30 s: a data e os números viram sozinhos. */
const ATUALIZACAO_MS = 30_000

const { mdAndUp } = useDisplay()
const encerrarSessao = usarSaida()
const consultas = useQueryClient()

const painel = usarPainel(periodoPainel)
const fila = usarLista('aguardando')
const erro = computed(() => painel.error.value ?? fila.error.value)

const agora = ref(new Date())
const hoje = computed(() => dataPorExtenso(agora.value))

let relogio: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  relogio = setInterval(() => {
    agora.value = new Date()
    if (document.visibilityState === 'hidden') return
    // Painel, fila e o badge da navegação: tudo que depende de acionamentos.
    void consultas.invalidateQueries({ queryKey: CHAVES.acionamentos })
  }, ATUALIZACAO_MS)
})
onUnmounted(() => clearInterval(relogio))
</script>

<template>
  <PaginaGestor :largura="1280" :espaco="20">
    <div class="topo">
      <CabecalhoPagina :sobretitulo="hoje" titulo="Seu painel" alinhamento="base">
        <template #acoes>
          <SeletorPeriodo v-model="periodoPainel" />
          <BotaoNovoAcionamento />
        </template>
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
    <div v-if="erro" class="erro">{{ mensagemDeErro(erro) }}</div>
    <template v-else-if="painel.data.value && fila.data.value">
      <KpisPainel :kpis="kpisDoPainel(painel.data.value)" />
      <div class="linha">
        <VolumePeriodo :barras="barrasDoVolume(painel.data.value)" />
        <ReprovacoesTipo :linhas="linhasDeReprovacao(painel.data.value)" />
      </div>
      <div class="linha">
        <FilaAprovacao :total="fila.data.value.length" :itens="itensDaFila(fila.data.value)" />
        <RankingPrestadores :linhas="linhasDoRanking(painel.data.value)" />
      </div>
    </template>
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
.linha {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.erro {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
</style>
