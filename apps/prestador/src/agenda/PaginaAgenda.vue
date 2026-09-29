<script setup lang="ts">
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '../consultas'
import FaixaDias from './FaixaDias.vue'
import ItemAgenda from './ItemAgenda.vue'
import { usarAgenda } from './usarAgenda'

const router = useRouter()
const { dias, rotulo, itens, escolher, error, isSuccess } = usarAgenda()

function abrir(id: string) {
  void router.push({ name: 'detalhe', params: { id } })
}
</script>

<template>
  <div class="pagina">
    <h1 class="titulo">Agenda</h1>
    <FaixaDias :dias="dias" @escolher="escolher" />
    <h2 class="rotulo-dia">{{ rotulo }}</h2>
    <div v-if="error" class="aviso">{{ mensagemDeErro(error) }}</div>
    <div v-else-if="isSuccess && !itens.length" class="livre">Dia livre.</div>
    <ItemAgenda v-for="a in itens" :key="a.id" :acionamento="a" @abrir="abrir(a.id)" />
  </div>
</template>

<style scoped>
.pagina {
  padding: 8px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.titulo {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.rotulo-dia {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.livre {
  font-size: 14px;
  color: var(--kgb-terciario);
}
/* Estado que o protótipo não tem: a mensagem da API num cartão, como o erro do Início. */
.aviso {
  background: var(--kgb-superficie1);
  border-radius: 24px;
  padding: 20px;
  font-size: 14px;
  color: var(--kgb-secundario);
}
</style>
