<script setup lang="ts">
import {
  AvatarIniciais,
  dataCurtaPorExtenso,
  marcaRusso,
  MenuUsuario,
  primeiroNome,
  RussoIcone,
  saudacao,
  StatusChip,
  urlRota,
  type NomeIcone,
} from '@kgb/ui'
import { useQueryClient } from '@tanstack/vue-query'
import { computed } from 'vue'
import { useRouter, type RouteLocationRaw } from 'vue-router'
import { reiniciarAgenda } from '../agenda/usarAgenda'
import { mensagemDeErro } from '../consultas'
import { sair, sessao } from '../sessao'
import CartaoProximo from './CartaoProximo.vue'
import { cartoesMetricas } from './inicio'
import { usarInicio } from './usarInicio'

const agora = new Date()
const nome = computed(() => sessao.usuario?.nome ?? '')
const router = useRouter()
const { data, error, isSuccess, proximo } = usarInicio()

const metricas = computed(() => (data.value ? cartoesMetricas(data.value.metricas) : []))

interface Atalho {
  rotulo: string
  icone: NomeIcone
  badge?: number
  ir: () => void
}
const navegar = (destino: RouteLocationRaw) => () => void router.push(destino)
const atalhos = computed<Atalho[]>(() => [
  { rotulo: 'Rota do dia', icone: 'pin', ir: abrirRotaDoDia },
  { rotulo: 'Agenda', icone: 'date-time', ir: navegar({ name: 'agenda' }) },
  {
    rotulo: 'Corrigir',
    icone: 'priority',
    badge: data.value?.metricas.paraCorrigir,
    ir: navegar({ name: 'demandas', query: { filtro: 'corrigir' } }),
  },
  {
    rotulo: 'Em análise',
    icone: 'check-done',
    ir: navegar({ name: 'demandas', query: { filtro: 'analise' } }),
  },
])

function abrirRotaDoDia() {
  const enderecos = data.value?.rotaDoDia ?? []
  if (enderecos.length) window.open(urlRota(enderecos), '_blank')
}
function abrir(id: string) {
  void router.push({ name: 'detalhe', params: { id } })
}
const consultas = useQueryClient()
/** Sair da conta sem deixar dados nem a escolha da Agenda da sessão anterior para o próximo login. */
async function encerrarSessao() {
  await sair()
  consultas.clear()
  reiniciarAgenda()
  await router.replace({ name: 'login' })
}
</script>

<template>
  <div class="pagina">
    <div class="cabecalho">
      <img :src="marcaRusso" alt="Russo Assistência" class="marca" />
      <div class="textos">
        <div class="data">{{ dataCurtaPorExtenso(agora) }}</div>
        <h1 class="ola">{{ saudacao(agora) }}, {{ primeiroNome(nome) }}</h1>
      </div>
      <MenuUsuario @sair="encerrarSessao">
        <AvatarIniciais :nome="nome" :tamanho="44" cor="var(--kgb-primaria)" :tamanho-fonte="14" />
      </MenuUsuario>
    </div>

    <CartaoProximo v-if="proximo" :acionamento="proximo" @abrir="abrir(proximo.id)" />
    <div v-else-if="error" class="sem-proximo">{{ mensagemDeErro(error) }}</div>
    <div v-else-if="isSuccess" class="sem-proximo">Nenhum atendimento pendente na sua agenda.</div>

    <div class="atalhos">
      <button
        v-for="atalho in atalhos"
        :key="atalho.rotulo"
        type="button"
        class="atalho"
        @click="atalho.ir"
      >
        <div class="bloco"><RussoIcone :nome="atalho.icone" :tamanho="22" /></div>
        <span class="rotulo-atalho">{{ atalho.rotulo }}</span>
        <span v-if="atalho.badge" class="badge">{{ atalho.badge }}</span>
      </button>
    </div>

    <div class="metricas">
      <div v-for="m in metricas" :key="m.rotulo" class="metrica" :class="{ destaque: m.destaque }">
        <div class="rotulo-metrica">{{ m.rotulo }}</div>
        <div class="valor">{{ m.valor }}</div>
        <div class="sub">{{ m.sub }}</div>
      </div>
    </div>

    <div class="hoje">
      <div class="titulo-hoje">Sua agenda de hoje</div>
      <div v-if="data && !data.hoje.length" class="nada-hoje">Nada agendado para hoje.</div>
      <div
        v-for="a in data?.hoje ?? []"
        :key="a.id"
        class="item-hoje"
        role="button"
        tabindex="0"
        @click="abrir(a.id)"
        @keydown.enter="abrir(a.id)"
        @keydown.space.prevent="abrir(a.id)"
      >
        <div class="hora">{{ a.inicio }}</div>
        <div class="corpo-item">
          <div class="titulo-item">{{ a.titulo }}</div>
          <div class="cliente-item">{{ a.cliente }}</div>
          <StatusChip class="chip" :status="a.status" :inviavel="a.inviavel" tamanho="p" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pagina {
  padding: 8px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.cabecalho {
  display: flex;
  align-items: center;
  gap: 12px;
}
.marca {
  height: 36px;
  width: auto;
}
.textos {
  flex: 1;
}
.data {
  font-size: 12px;
  font-weight: 500;
  color: var(--kgb-terciario);
}
.ola {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.sem-proximo {
  background: var(--kgb-superficie1);
  border-radius: 24px;
  padding: 20px;
  font-size: 14px;
  color: var(--kgb-secundario);
}
.atalhos {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.atalho {
  border: 0;
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 0;
  position: relative;
}
.bloco {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: var(--kgb-primaria-hover-leve);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--kgb-tinta);
}
.rotulo-atalho {
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.badge {
  position: absolute;
  top: -4px;
  right: 8px;
  min-width: 20px;
  height: 20px;
  border-radius: 10px;
  background: var(--kgb-laranja);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.metricas {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.metrica {
  background: var(--kgb-superficie1);
  border-radius: 16px;
  padding: 14px 16px;
}
.metrica.destaque {
  background: var(--kgb-perigo-fundo);
}
.rotulo-metrica {
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.valor {
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--kgb-tinta);
}
.destaque .valor {
  color: var(--kgb-perigo-texto);
}
.sub {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.hoje {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.titulo-hoje {
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.nada-hoje {
  font-size: 14px;
  color: var(--kgb-terciario);
}
.item-hoje {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 16px;
  background: var(--kgb-superficie1);
  cursor: pointer;
}
.hora {
  width: 48px;
  flex: none;
  font-size: 14px;
  font-weight: 700;
  color: var(--kgb-tinta);
}
.corpo-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.titulo-item {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.cliente-item {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.chip {
  align-self: flex-start;
}
</style>
