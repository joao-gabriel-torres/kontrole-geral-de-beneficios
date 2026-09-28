<script setup lang="ts">
import {
  AvatarIniciais,
  dataCurtaPorExtenso,
  EmConstrucao,
  marcaRusso,
  MenuUsuario,
  primeiroNome,
  saudacao,
} from '@kgb/ui'
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { sair, sessao } from '../sessao'

const agora = new Date()
const nome = computed(() => sessao.usuario?.nome ?? '')
const router = useRouter()

async function encerrarSessao() {
  await sair()
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
    <EmConstrucao fundo="var(--kgb-superficie1)" />
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
</style>
