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
/** Trocando o período, os números na tela ainda são os do anterior: os blocos ficam marcados. */
const trocaDePeriodo = computed(() =>
  painel.isPlaceholderData.value ? { class: 'trocando', 'aria-busy': 'true' as const } : {},
)

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
    <div class="topo" :class="{ compacto: !mdAndUp }">
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
    <!-- Com os números na tela, uma atualização que falha não os tira: a próxima tenta de novo,
         e um aviso discreto conta que os números são os da última resposta boa. -->
    <template v-if="painel.data.value && fila.data.value">
      <div v-if="erro" class="desatualizado" role="status">
        {{ mensagemDeErro(erro) }} — mostrando a última atualização.
      </div>
      <KpisPainel :kpis="kpisDoPainel(painel.data.value)" v-bind="trocaDePeriodo" />
      <div class="linha">
        <VolumePeriodo :barras="barrasDoVolume(painel.data.value)" v-bind="trocaDePeriodo" />
        <ReprovacoesTipo :linhas="linhasDeReprovacao(painel.data.value)" v-bind="trocaDePeriodo" />
      </div>
      <div class="linha">
        <FilaAprovacao :total="fila.data.value.length" :itens="itensDaFila(fila.data.value)" />
        <RankingPrestadores :linhas="linhasDoRanking(painel.data.value)" v-bind="trocaDePeriodo" />
      </div>
    </template>
    <div v-else-if="erro" class="erro">{{ mensagemDeErro(erro) }}</div>
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
/* No celular, o avatar fica no canto do cabeçalho: os textos ocupam a 1ª linha inteira, com o
   espaço do avatar (40 + 12) reservado, e as ações descem para a 2ª em qualquer largura. */
.topo.compacto :deep(.textos) {
  flex-basis: 100%;
  padding-right: 52px;
  box-sizing: border-box;
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
/* Aviso discreto: os números continuam na tela, só envelhecem até a próxima resposta boa. */
.desatualizado {
  font-size: 13px;
  text-align: center;
  color: var(--kgb-terciario);
}
/* Blocos com os números do período anterior, enquanto o novo não chega. */
.trocando {
  opacity: 0.6;
}
</style>
