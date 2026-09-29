<script setup lang="ts">
import { computed, ref } from 'vue'
import marcaRusso from '../assets/russo-mark.png'

defineProps<{ subtitulo: string; erro: string | null; enviando: boolean }>()
const emit = defineEmits<{ enviar: [email: string, senha: string] }>()

const email = ref('')
const senha = ref('')
const preenchido = computed(() => email.value.trim() !== '' && senha.value !== '')

function enviar() {
  if (preenchido.value) emit('enviar', email.value.trim(), senha.value)
}
</script>

<template>
  <div class="login">
    <form class="cartao" novalidate @submit.prevent="enviar">
      <div class="marca">
        <img :src="marcaRusso" alt="" />
        <div class="nome-marca">RUSSO <span>ASSISTÊNCIA</span></div>
      </div>
      <div>
        <h1 class="titulo">Entrar</h1>
        <p class="apoio">{{ subtitulo }}</p>
      </div>
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
    </form>
  </div>
</template>

<style scoped>
.login {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
  background: var(--kgb-superficie1);
}
.cartao {
  width: 100%;
  max-width: 400px;
  background: var(--kgb-branco);
  border-radius: 24px;
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.marca {
  display: flex;
  align-items: center;
  gap: 10px;
}
.marca img {
  height: 30px;
  width: auto;
  display: block;
}
.nome-marca {
  font-weight: 800;
  font-size: 16px;
  color: var(--kgb-primaria);
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.nome-marca span {
  font-weight: 600;
}
.titulo {
  margin: 0;
  font-size: 24px;
  line-height: 36px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.apoio {
  margin: 0;
  font-size: 14px;
  color: var(--kgb-secundario);
}
.campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.campo label {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.erro {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-laranja-texto);
}
</style>
