<script setup lang="ts">
import type { ResumoAcionamento } from '@kgb/api-client'
import { AvatarIniciais, BarraProgresso, dataBR, intervalo, progresso, StatusChip } from '@kgb/ui'
import { computed } from 'vue'
import { rotuloTipos } from './apresentacao'

const props = defineProps<{ acionamento: ResumoAcionamento }>()
const etapas = computed(() => progresso(props.acionamento.etapas))
</script>

<template>
  <RouterLink :to="{ name: 'acionamento', params: { id: acionamento.id } }" class="linha">
    <div class="principal">
      <div class="titulo">{{ acionamento.titulo }}</div>
      <div class="sub">{{ acionamento.codigo }} · {{ acionamento.cliente }}</div>
    </div>
    <div class="tipos">{{ rotuloTipos(acionamento.tipos) }}</div>
    <div class="prestador">
      <AvatarIniciais
        :nome="acionamento.prestador.nome"
        :tamanho="26"
        :cor="acionamento.prestador.cor"
        :tamanho-fonte="10"
      />
      <span class="nome">{{ acionamento.prestador.nome }}</span>
    </div>
    <div class="quando">
      <div class="data">{{ dataBR(acionamento.data) }}</div>
      <div class="horario">{{ intervalo(acionamento.inicio, acionamento.fim) }}</div>
    </div>
    <div class="progresso">
      <div class="etapas">{{ etapas.texto }} etapas</div>
      <BarraProgresso :percentual="etapas.percentual" />
    </div>
    <div class="status">
      <StatusChip :status="acionamento.status" :inviavel="acionamento.inviavel" class="chip" />
    </div>
  </RouterLink>
</template>

<style scoped>
.linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--kgb-divisor);
  color: var(--kgb-tinta);
  cursor: pointer;
}
.linha:hover {
  background: var(--kgb-superficie1);
  color: var(--kgb-tinta);
}
.principal {
  flex: 3 1 240px;
  min-width: 0;
}
.titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.sub {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.tipos {
  flex: 2 1 160px;
  min-width: 0;
  font-size: 13px;
  color: var(--kgb-texto);
}
.prestador {
  flex: 1.4 1 130px;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.nome {
  font-size: 13px;
  color: var(--kgb-texto);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.quando {
  flex: 1 1 100px;
  font-size: 13px;
  color: var(--kgb-texto);
}
.data {
  font-weight: 600;
}
.horario {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.progresso {
  flex: 1 1 90px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.etapas {
  font-size: 12px;
  color: var(--kgb-secundario);
}
.status {
  flex: 1.3 1 150px;
  display: flex;
  justify-content: flex-end;
}
/* O chip da lista tem 4px de padding vertical (o tamanho "m" do StatusChip tem 3px). */
.status .chip {
  padding: 4px 10px;
}
</style>
