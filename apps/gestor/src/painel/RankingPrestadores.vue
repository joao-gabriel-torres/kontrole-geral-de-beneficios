<script setup lang="ts">
import { AvatarIniciais } from '@kgb/ui'
import type { LinhaRanking } from './apresentacao'

defineProps<{ linhas: readonly LinhaRanking[] }>()
</script>

<template>
  <section class="ranking" aria-label="Ranking de prestadores">
    <div class="titulo">Ranking de prestadores</div>
    <div class="grade cabecalho">
      <span />
      <span>Prestador</span>
      <span class="numero">Concluídos</span>
      <span class="numero">Aprovação</span>
      <span class="numero">Tempo</span>
    </div>
    <div v-for="l in linhas" :key="l.id" class="grade posto">
      <span class="posicao" :class="{ destaque: l.destaque }">{{ l.posicao }}</span>
      <div class="quem">
        <AvatarIniciais :nome="l.nome" :cor="l.cor" :tamanho="30" :tamanho-fonte="11" />
        <span class="nome">{{ l.nome }}</span>
      </div>
      <span class="numero concluidos">{{ l.concluidos }}</span>
      <span class="numero suave">{{ l.aprovacao }}</span>
      <span class="numero suave">{{ l.tempo }}</span>
    </div>
  </section>
</template>

<style scoped>
.ranking {
  flex: 1.4 1 360px;
  min-width: 0;
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.titulo {
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
  padding-bottom: 4px;
}
.grade {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) 72px 72px 64px;
  gap: 8px;
}
.cabecalho {
  font-size: 12px;
  font-weight: 500;
  color: var(--kgb-terciario);
  padding: 0 4px;
}
.posto {
  align-items: center;
  padding: 10px 4px;
  border-top: 1px solid var(--kgb-divisor);
  font-size: 14px;
}
.numero {
  text-align: right;
}
.posicao {
  width: 30px;
  height: 24px;
  border-radius: 8px;
  background: var(--kgb-superficie2);
  color: var(--kgb-texto);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.posicao.destaque {
  background: var(--kgb-laranja-claro);
  color: var(--kgb-laranja-texto);
}
.quem {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.nome {
  font-weight: 600;
  color: var(--kgb-titulo);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.concluidos {
  font-weight: 700;
}
.suave {
  color: var(--kgb-texto);
}
</style>
