<script setup lang="ts">
import { computed, ref } from 'vue'
import CartaoAcesso from './CartaoAcesso.vue'

defineProps<{
  subtitulo: string
  erro: string | null
  enviando: boolean
  /** Mensagem de sucesso acima dos campos (ex.: senha criada pelo convite). */
  aviso?: string | null
}>()
const emit = defineEmits<{ enviar: [email: string, senha: string] }>()

const email = ref('')
const senha = ref('')
const preenchido = computed(() => email.value.trim() !== '' && senha.value !== '')

function enviar() {
  if (preenchido.value) emit('enviar', email.value.trim(), senha.value)
}
</script>

<template>
  <CartaoAcesso titulo="Entrar" :apoio="subtitulo" @enviar="enviar">
    <p v-if="aviso" class="aviso" role="status">{{ aviso }}</p>
    <div class="campo">
      <label for="login-email">E-mail</label>
      <v-text-field id="login-email" v-model="email" type="email" autocomplete="username" />
    </div>
    <div class="campo">
      <label for="login-senha">Senha</label>
      <v-text-field
        id="login-senha"
        v-model="senha"
        type="password"
        autocomplete="current-password"
      />
    </div>
    <p v-if="erro" class="erro" role="alert">{{ erro }}</p>
    <v-btn type="submit" block color="primary" :loading="enviando" :disabled="!preenchido">
      Entrar
    </v-btn>
  </CartaoAcesso>
</template>
