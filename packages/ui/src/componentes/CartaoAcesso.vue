<script setup lang="ts">
import marcaRusso from '../assets/russo-mark.png'

/**
 * Cartão das telas de acesso (login e "Crie sua senha"): marca, título, apoio e o formulário.
 * O conteúdo vem no slot; `.campo` (rótulo + campo), `.erro` e `.aviso` já têm o estilo daqui.
 */
defineProps<{ titulo: string; apoio: string }>()
defineEmits<{ enviar: [] }>()
</script>

<template>
  <div class="login">
    <form class="cartao" novalidate @submit.prevent="$emit('enviar')">
      <div class="marca">
        <img :src="marcaRusso" alt="" />
        <div class="nome-marca">RUSSO <span>ASSISTÊNCIA</span></div>
      </div>
      <div>
        <h1 class="titulo">{{ titulo }}</h1>
        <p class="apoio">{{ apoio }}</p>
      </div>
      <slot />
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
:slotted(.campo) {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
:slotted(.campo label) {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-texto);
}
:slotted(.erro) {
  margin: 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-laranja-texto);
}
/* Mesmo par de cores do chip "Aprovado" (sucesso). */
:slotted(.aviso) {
  margin: 0;
  padding: 10px 12px;
  border-radius: 12px;
  background: var(--kgb-sucesso-fundo);
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-sucesso);
}
</style>
