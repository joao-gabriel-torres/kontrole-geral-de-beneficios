<script setup lang="ts">
import { CartaoAcesso } from '@kgb/ui'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { sair, sessao } from '../sessao'
import { criarSenha, MENSAGENS_CONVITE, validarSenhas } from './convite'

const rota = useRoute()
const router = useRouter()

const token = typeof rota.query.token === 'string' ? rota.query.token : ''
const senha = ref('')
const confirmacao = ref('')
const enviando = ref(false)
/** Sem token no link, ou com um token que a API recusou: não há como criar a senha por aqui. */
const conviteInvalido = ref(token === '')
const erro = ref<string | null>(conviteInvalido.value ? MENSAGENS_CONVITE.expirado : null)
const preenchido = computed(() => senha.value !== '' && confirmacao.value !== '')

/** A mensagem de erro descreve os dois campos; `aria-invalid` só no campo de que ela fala. */
const ID_ERRO = 'convite-erro'
const descricao = computed(() => (erro.value ? ID_ERRO : undefined))
const senhaInvalida = computed(
  () => erro.value === MENSAGENS_CONVITE.curta || erro.value === MENSAGENS_CONVITE.longa,
)
const confirmacaoInvalida = computed(() => erro.value === MENSAGENS_CONVITE.diferentes)

async function enviar() {
  if (!preenchido.value || enviando.value || conviteInvalido.value) return
  erro.value = validarSenhas(senha.value, confirmacao.value)
  if (erro.value) return
  enviando.value = true
  const resultado = await criarSenha(token, senha.value)
  if (!resultado.ok) {
    enviando.value = false
    erro.value = resultado.mensagem
    conviteInvalido.value = resultado.conviteInvalido
    return
  }
  // O link pode ter sido aberto num aparelho com outra conta: o login precisa aparecer.
  if (sessao.usuario) await sair()
  await router.replace({ name: 'login', query: { motivo: 'senha-criada' } })
}
</script>

<template>
  <CartaoAcesso
    titulo="Crie sua senha"
    apoio="Para entrar no app da Russo Assistência"
    @enviar="enviar"
  >
    <div class="campo">
      <label for="convite-senha">Nova senha</label>
      <v-text-field
        id="convite-senha"
        v-model="senha"
        type="password"
        autocomplete="new-password"
        :disabled="conviteInvalido"
        :aria-describedby="descricao"
        :aria-invalid="senhaInvalida || undefined"
      />
    </div>
    <div class="campo">
      <label for="convite-confirmacao">Confirmar senha</label>
      <v-text-field
        id="convite-confirmacao"
        v-model="confirmacao"
        type="password"
        autocomplete="new-password"
        :disabled="conviteInvalido"
        :aria-describedby="descricao"
        :aria-invalid="confirmacaoInvalida || undefined"
      />
    </div>
    <p v-if="erro" :id="ID_ERRO" class="erro" role="alert">{{ erro }}</p>
    <v-btn
      type="submit"
      block
      color="primary"
      :loading="enviando"
      :disabled="!preenchido || conviteInvalido"
    >
      Criar senha
    </v-btn>
    <RouterLink v-if="conviteInvalido" class="ir-login" :to="{ name: 'login' }">
      Ir para o login
    </RouterLink>
  </CartaoAcesso>
</template>

<style scoped>
/* Link de texto do protótipo: #0069BD, 13/600. */
.ir-login {
  align-self: center;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-primaria);
  text-decoration: none;
}
</style>
