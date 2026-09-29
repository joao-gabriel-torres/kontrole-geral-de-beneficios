<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref } from 'vue'
import { useDisplay } from 'vuetify'
import { ErroApi, mensagemDeErro } from '../erros'
import { usarModalAberto } from '../modais'
import { toastGestor } from '../toast'
import { usarAlterarStatus, usarCadastro, usarExcluirPrestador } from './dados'
import { textoExclusao, tituloExclusao } from './formulario'

const props = defineProps<{ prestador: { id: string; nome: string; emAberto: number } }>()
const emit = defineEmits<{ fechar: [] }>()

usarModalAberto()
const { mdAndUp } = useDisplay()
const { refetch: recarregar } = usarCadastro()
const { mutateAsync: alterarStatus } = usarAlterarStatus()
const { mutateAsync: excluir } = usarExcluirPrestador()

/** A carga do momento do clique; muda se a exclusão for recusada por uma corrida. */
const emAberto = ref(props.prestador.emAberto)
const texto = computed(() => textoExclusao(props.prestador.nome, emAberto.value))
/** Marcado antes do primeiro await: um segundo clique não grava de novo. */
const ocupado = ref(false)

async function executar(acao: () => Promise<void>) {
  if (ocupado.value) return
  ocupado.value = true
  try {
    await acao()
  } finally {
    ocupado.value = false
  }
}

const desativar = () =>
  executar(async () => {
    try {
      await alterarStatus({ id: props.prestador.id, status: 'inativo' })
      toastGestor.mostrar(`${props.prestador.nome} desativado`)
    } catch (e) {
      toastGestor.mostrar(mensagemDeErro(e))
    }
    emit('fechar')
  })

const confirmar = () =>
  executar(async () => {
    try {
      await excluir(props.prestador.id)
      toastGestor.mostrar(`${props.prestador.nome} excluído`)
      emit('fechar')
    } catch (e) {
      if (e instanceof ErroApi && e.codigo === 'prestador_com_acionamentos') {
        // Ganhou acionamento depois que a lista carregou: mostra o bloqueio com a carga atual.
        const { data } = await recarregar()
        const atual = data?.find((p) => p.id === props.prestador.id)
        if (atual && atual.emAberto > 0) {
          emAberto.value = atual.emAberto
          return
        }
      }
      toastGestor.mostrar(mensagemDeErro(e))
      emit('fechar')
    }
  })

const painel = ref<HTMLElement>()
const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('fechar')
}
onMounted(() => {
  painel.value?.focus()
  document.addEventListener('keydown', aoTeclar)
})
onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
onUnmounted(() => focoAnterior?.focus())
</script>

<template>
  <div class="sobreposicao" :class="{ compacto: !mdAndUp }">
    <div
      ref="painel"
      class="painel"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="excluir-titulo"
      aria-describedby="excluir-texto"
      tabindex="-1"
    >
      <h2 id="excluir-titulo" class="titulo">{{ tituloExclusao(prestador.nome) }}</h2>
      <p id="excluir-texto" class="texto">{{ texto }}</p>
      <div class="acoes">
        <button type="button" class="cancelar" @click="emit('fechar')">Cancelar</button>
        <button type="button" class="desativar" @click="desativar">Desativar</button>
        <button v-if="emAberto === 0" type="button" class="excluir" @click="confirmar">
          Excluir
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sobreposicao {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: var(--kgb-sobreposicao);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px 12px;
}
/* No telefone o fundo do protótipo cobre também a barra de status (44px acima da tela). */
.sobreposicao.compacto {
  top: -44px;
}
.painel {
  width: 100%;
  max-width: 440px;
  background: var(--kgb-branco);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.painel:focus {
  outline: none;
}
.titulo {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.texto {
  margin: 0;
  font-size: 14px;
  line-height: 20px;
  color: var(--kgb-texto);
}
.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  flex-wrap: wrap;
}
.cancelar,
.desativar,
.excluir {
  height: 44px;
  padding: 0 18px;
  border: 0;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}
.cancelar {
  background: var(--kgb-superficie2);
  color: var(--kgb-texto);
}
.desativar {
  border: 1px solid var(--kgb-primaria);
  background: var(--kgb-branco);
  color: var(--kgb-primaria);
}
.excluir {
  background: var(--kgb-perigo);
  color: #fff;
}
</style>
