<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import CartaoAcesso from './CartaoAcesso.vue'

const props = defineProps<{
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

// Muitos leitores de tela não anunciam região viva que entra no DOM já preenchida. A região
// role="status" fica sempre montada e o texto do aviso só entra depois de montar.
const montado = ref(false)
onMounted(() => {
  montado.value = true
})
const avisoAnunciado = computed(() => (montado.value && props.aviso ? props.aviso : null))

function enviar() {
  if (preenchido.value) emit('enviar', email.value.trim(), senha.value)
}
</script>

<template>
  <CartaoAcesso titulo="Entrar" :apoio="subtitulo" @enviar="enviar">
    <p class="aviso" :class="{ vazio: !avisoAnunciado }" role="status">{{ avisoAnunciado }}</p>
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

<style scoped>
/*
  Vazia, a região sai do fluxo (o cartão usa gap: 20px, e a faixa verde não pode aparecer sem
  texto), mas continua visível para a árvore de acessibilidade: display: none faria o leitor de
  tela ignorar o texto que entra depois.
*/
.aviso.vazio {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: 0;
  padding: 0;
  overflow: hidden;
  clip-path: inset(50%);
  background: none;
  white-space: nowrap;
}
</style>
