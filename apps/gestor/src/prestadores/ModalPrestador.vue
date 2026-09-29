<script setup lang="ts">
import type { TipoDemanda } from '@kgb/api-client'
import { RussoIcone } from '@kgb/ui'
import { computed, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { ErroApi, mensagemDeErro } from '../erros'
import { usarModalAberto } from '../modais'
import { toastGestor } from '../toast'
import { usarSalvarPrestador } from './dados'
import {
  alternarEspecialidade,
  corpoDoFormulario,
  erroDoFormulario,
  ERROS_DO_FORMULARIO,
  mostrarErro,
  type FormularioPrestador,
} from './formulario'
import type { PrestadorCadastro } from './lista'

const props = defineProps<{
  inicial: FormularioPrestador
  lista: readonly PrestadorCadastro[]
  tipos: readonly TipoDemanda[]
}>()
const emit = defineEmits<{ fechar: [] }>()

usarModalAberto()
const { mdAndUp } = useDisplay()
const { mutateAsync: salvar } = usarSalvarPrestador()
/** Marcado antes do primeiro await: um segundo clique não grava de novo. */
const salvando = ref(false)

const form = reactive<FormularioPrestador>({
  ...props.inicial,
  especialidades: [...props.inicial.especialidades],
})
/** Erro devolvido pela API ao salvar (ex.: dígito verificador); some quando algo é editado. */
const erroServidor = ref('')
watch(form, () => (erroServidor.value = ''), { deep: true })

const erroLocal = computed(() => erroDoFormulario(form, props.lista))
const erro = computed(() => erroServidor.value || erroLocal.value)
const erroVisivel = computed(() => !!erroServidor.value || mostrarErro(form, erroLocal.value))
const titulo = computed(() => (form.id ? 'Editar prestador' : 'Novo prestador'))

async function enviar() {
  if (erro.value || salvando.value) return
  salvando.value = true
  try {
    await salvar({ id: form.id, corpo: corpoDoFormulario(form) })
    emit('fechar')
    toastGestor.mostrar(form.id ? 'Cadastro atualizado' : 'Prestador credenciado')
  } catch (e) {
    if (e instanceof ErroApi && ERROS_DO_FORMULARIO.has(e.codigo)) erroServidor.value = e.message
    else toastGestor.mostrar(mensagemDeErro(e))
  } finally {
    salvando.value = false
  }
}

const painel = ref<HTMLElement>()
// Quem abriu o modal recebe o foco de volta ao fechar.
const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('fechar')
}
onMounted(() => {
  // Sem rolar: no telefone o painel começa acima da tela, como no protótipo.
  painel.value?.focus({ preventScroll: true })
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
      role="dialog"
      aria-modal="true"
      aria-labelledby="prestador-titulo"
      tabindex="-1"
    >
      <div class="cabecalho">
        <h2 id="prestador-titulo" class="titulo">{{ titulo }}</h2>
        <button type="button" class="fechar" aria-label="Fechar" @click="emit('fechar')">
          <RussoIcone nome="cancel" :tamanho="18" class="icone" />
        </button>
      </div>
      <label class="campo"
        >Nome completo ou razão social
        <input v-model="form.nome" class="entrada" placeholder="Nome" />
      </label>
      <div class="linha">
        <label class="campo documento"
          >CPF ou CNPJ
          <input v-model="form.documento" class="entrada" placeholder="000.000.000-00" />
        </label>
        <label class="campo telefone"
          >Telefone
          <input v-model="form.telefone" class="entrada" placeholder="(11) 90000-0000" />
        </label>
      </div>
      <div class="linha">
        <label class="campo email"
          >E-mail
          <input v-model="form.email" class="entrada" placeholder="email@exemplo.com" />
        </label>
        <label class="campo regiao"
          >Região de atendimento
          <input v-model="form.regiao" class="entrada" placeholder="Zona Oeste" />
        </label>
      </div>
      <div class="grupo">
        <div id="prestador-especialidades" class="rotulo">Especialidades</div>
        <div class="especialidades" role="group" aria-labelledby="prestador-especialidades">
          <button
            v-for="t in tipos"
            :key="t.id"
            type="button"
            class="especialidade"
            :class="{ escolhida: form.especialidades.includes(t.id) }"
            :aria-pressed="form.especialidades.includes(t.id)"
            @click="form.especialidades = alternarEspecialidade(form.especialidades, t.id)"
          >
            <span class="bolinha" :style="{ background: t.cor }" />{{ t.nome }}
          </button>
        </div>
      </div>
      <div v-if="erroVisivel" class="erro" role="alert">{{ erro }}</div>
      <div class="acoes">
        <button type="button" class="cancelar" @click="emit('fechar')">Cancelar</button>
        <button
          type="button"
          class="salvar"
          :class="{ inativo: !!erro }"
          :aria-disabled="!!erro || salvando"
          @click="enviar"
        >
          Salvar
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
  align-items: flex-start;
  overflow: auto;
  padding: 24px 12px;
}
/* No telefone o fundo do protótipo cobre também a barra de status (44px acima da tela). */
.sobreposicao.compacto {
  top: -44px;
}
.painel {
  width: 100%;
  max-width: 620px;
  background: var(--kgb-branco);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.painel:focus {
  outline: none;
}
.cabecalho {
  display: flex;
  align-items: center;
  gap: 12px;
}
.titulo {
  flex: 1;
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
/* Sem padding explícito no protótipo: fica o padrão do navegador para <button>. */
.fechar {
  width: 36px;
  height: 36px;
  padding: 1px 6px;
  border: 0;
  border-radius: 12px;
  background: var(--kgb-superficie2);
  display: flex;
  align-items: center;
  justify-content: center;
}
.icone {
  color: var(--kgb-tinta);
}
.campo {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.entrada {
  height: 48px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  outline: 0;
}
.entrada:focus {
  border-color: var(--kgb-tinta);
}
.linha {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.documento,
.telefone {
  flex: 1 1 200px;
}
.email {
  flex: 1.4 1 220px;
}
.regiao {
  flex: 1 1 160px;
}
.grupo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rotulo {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.especialidades {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.especialidade {
  height: 36px;
  padding: 0 12px;
  border: 1px solid var(--kgb-divisor);
  border-radius: 999px;
  background: var(--kgb-branco);
  color: var(--kgb-texto);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
}
.especialidade.escolhida {
  border-color: var(--kgb-primaria);
  background: var(--kgb-primaria-tint);
  color: var(--kgb-primaria-escura);
}
.bolinha {
  width: 8px;
  height: 8px;
  border-radius: 4px;
}
.erro {
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-laranja-texto);
}
.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.cancelar,
.salvar {
  height: 48px;
  border: 0;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
}
.cancelar {
  padding: 0 20px;
  background: var(--kgb-superficie2);
  color: var(--kgb-texto);
}
.salvar {
  padding: 0 24px;
  background: var(--kgb-primaria);
  color: #fff;
}
.salvar.inativo {
  background: var(--kgb-primaria-tint-forte);
  color: var(--kgb-primaria-escura);
}
</style>
