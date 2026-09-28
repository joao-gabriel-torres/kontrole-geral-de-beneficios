<script setup lang="ts">
import { FormularioLogin } from '@kgb/ui'
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { destinoSeguro } from '../router'
import { entrar, mensagemDoMotivo } from '../sessao'

const rota = useRoute()
const router = useRouter()
const enviando = ref(false)
const erro = ref<string | null>(mensagemDoMotivo(rota.query.motivo))

async function enviar(email: string, senha: string) {
  enviando.value = true
  erro.value = null
  const resultado = await entrar(email, senha)
  enviando.value = false
  if (resultado.ok) await router.replace(destinoSeguro(rota.query.voltar))
  else erro.value = resultado.mensagem
}
</script>

<template>
  <FormularioLogin
    subtitulo="Gestão de demandas"
    :erro="erro"
    :enviando="enviando"
    @enviar="enviar"
  />
</template>
