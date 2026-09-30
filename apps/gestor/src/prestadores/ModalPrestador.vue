<script setup lang="ts">
import type { TipoDemanda } from '@kgb/api-client'
import { RussoIcone } from '@kgb/ui'
import { computed, onBeforeUnmount, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { digitosCep } from '../componentes/cep'
import { usarConsultaCep } from '../componentes/consultaCep'
import EntradaCep from '../componentes/EntradaCep.vue'
import { ErroApi, mensagemDeErro } from '../erros'
import { usarModalAberto } from '../modais'
import { toastGestor } from '../toast'
import { usarEnviarConvite, usarSalvarPrestador } from './dados'
import {
  alternarEspecialidade,
  avisoAoCredenciar,
  camposDoCep,
  cidadeComUf,
  consultarCepAoAbrir,
  corpoDoFormulario,
  erroDoFormulario,
  ERROS_DO_FORMULARIO,
  mostrarErro,
  rotuloDoConvite,
  type AcessoPrestador,
  type ConviteAoCredenciar,
  type FormularioPrestador,
} from './formulario'
import type { PrestadorCadastro } from './lista'

const props = defineProps<{
  inicial: FormularioPrestador
  lista: readonly PrestadorCadastro[]
  tipos: readonly TipoDemanda[]
  /** Situação do acesso ao app de quem está sendo editado. */
  acesso?: AcessoPrestador
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

// Endereço (fora do protótipo, pedido do usuário em 30/09): o CEP é o primeiro campo e, com os 8
// dígitos, rua, bairro, cidade e UF vêm da consulta (só para leitura); número e complemento são
// digitados. O Editar abre com o endereço salvo e só consulta o CEP quando ele muda.
const consultar = ref(consultarCepAoAbrir(props.inicial))
/** Os dígitos consultados; null enquanto vale o endereço salvo. */
const cepConsultado = computed(() => (consultar.value ? digitosCep(form.cep) : null))
const {
  endereco: enderecoDoCep,
  inexistente,
  semResposta,
  livres: livresNaConsulta,
  placeholderRua,
  mensagem: falhaDoCep,
} = usarConsultaCep(() => cepConsultado.value ?? '')
function digitarCep() {
  if (digitosCep(form.cep) !== digitosCep(props.inicial.cep)) consultar.value = true
}
watch([cepConsultado, enderecoDoCep], () => {
  if (cepConsultado.value !== null) Object.assign(form, camposDoCep(enderecoDoCep.value))
})
watch(inexistente, (valor) => (form.cepInexistente = valor), { immediate: true })
/** O endereço salvo fica só para leitura, como veio do CEP. */
const livres = computed(() =>
  cepConsultado.value === null ? { logradouro: false, bairro: false } : livresNaConsulta.value,
)

/** Erro devolvido pela API ao salvar (ex.: dígito verificador); some quando algo é editado. */
const erroServidor = ref('')
watch(form, () => (erroServidor.value = ''), { deep: true })

const erroLocal = computed(() => erroDoFormulario(form, props.lista))
const erro = computed(() => erroServidor.value || erroLocal.value)
const erroVisivel = computed(() => !!erroServidor.value || mostrarErro(form, erroLocal.value))
/**
 * A linha de erro. Com o ViaCEP fora, sem outro erro à mostra, ela explica por que a rua não veio:
 * é só um aviso (rua e bairro ficam para digitar) e o Salvar segue.
 */
const linhaDeErro = computed(() => {
  if (erroVisivel.value) return erro.value
  return semResposta.value ? falhaDoCep.value : ''
})
const titulo = computed(() => (form.id ? 'Editar prestador' : 'Novo prestador'))

async function enviar() {
  if (erro.value || salvando.value) return
  salvando.value = true
  try {
    // O POST (Novo) responde com o resultado do convite; o PATCH (Editar), só com o cadastro.
    const salvo = (await salvar({ id: form.id, corpo: corpoDoFormulario(form) })) as {
      convite?: ConviteAoCredenciar
    }
    emit('fechar')
    toastGestor.mostrar(form.id ? 'Cadastro atualizado' : avisoAoCredenciar(salvo.convite))
  } catch (e) {
    if (e instanceof ErroApi && ERROS_DO_FORMULARIO.has(e.codigo)) erroServidor.value = e.message
    else toastGestor.mostrar(mensagemDeErro(e))
  } finally {
    salvando.value = false
  }
}

const { mutateAsync: enviarConvite, isPending: convidando } = usarEnviarConvite()
/** O convite vai para o e-mail salvo: com o campo alterado e não salvo, o botão some. */
const rotuloConvite = computed(() =>
  form.id && form.email.trim() === props.inicial.email.trim()
    ? rotuloDoConvite(props.acesso)
    : null,
)
async function convidar() {
  if (!form.id || convidando.value) return
  try {
    const { email } = await enviarConvite(form.id)
    toastGestor.mostrar(`Convite enviado para ${email}`)
  } catch (e) {
    toastGestor.mostrar(mensagemDeErro(e))
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
      <!--
        Fora do protótipo (pedido do usuário, 30/09): o endereço vem primeiro, com o CEP, e o botão
        de convite fica na linha do rótulo do e-mail. No computador o corpo tem a altura do
        protótipo e rola por dentro: o cabeçalho e os botões ficam no lugar.
      -->
      <div class="corpo">
        <div class="linha">
          <label class="campo cep"
            >CEP
            <EntradaCep
              id="prestador-cep"
              v-model="form.cep"
              class="entrada"
              :aria-invalid="form.cepInexistente || undefined"
              @digitar="digitarCep"
            />
          </label>
          <label class="campo rua"
            >Rua
            <input
              v-model="form.logradouro"
              class="entrada"
              :readonly="!livres.logradouro"
              :placeholder="placeholderRua"
            />
          </label>
        </div>
        <div class="linha">
          <label class="campo casa"
            >Número
            <input v-model="form.numero" class="entrada" placeholder="Ex.: 410" />
          </label>
          <label class="campo complemento"
            >Complemento
            <input v-model="form.complemento" class="entrada" placeholder="Opcional" />
          </label>
        </div>
        <div class="linha">
          <label class="campo bairro"
            >Bairro
            <input v-model="form.bairro" class="entrada" :readonly="!livres.bairro" />
          </label>
          <label class="campo cidade"
            >Cidade
            <input class="entrada" readonly :value="cidadeComUf(form.cidade, form.uf)" />
          </label>
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
          <div class="campo email">
            <div class="rotulo-linha">
              <label for="prestador-email">E-mail</label>
              <button
                v-if="rotuloConvite"
                type="button"
                class="convite"
                :aria-disabled="convidando"
                @click="convidar"
              >
                {{ rotuloConvite }}
              </button>
            </div>
            <input
              id="prestador-email"
              v-model="form.email"
              class="entrada"
              placeholder="email@exemplo.com"
            />
          </div>
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
      </div>
      <div v-if="linhaDeErro" class="erro" role="alert">{{ linhaDeErro }}</div>
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
.entrada[readonly] {
  background: var(--kgb-superficie1);
  color: var(--kgb-secundario);
}
.entrada[readonly]:focus {
  border-color: var(--kgb-divisor);
}
.corpo {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
/*
 * No computador, o corpo tem a altura do corpo do protótipo (do nome às especialidades, 406px a
 * 1440px) e rola por dentro: o modal não muda de altura e os botões ficam no lugar.
 */
.sobreposicao:not(.compacto) .corpo {
  height: 406px;
  overflow-y: auto;
}
.linha {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.linha .campo {
  min-width: 0;
}
.linha .entrada {
  width: 100%;
  min-width: 0;
}
.cep {
  flex: 1 1 120px;
}
.rua {
  flex: 3 1 200px;
}
.casa {
  flex: 1 1 100px;
}
.complemento {
  flex: 2 1 160px;
}
.bairro,
.cidade {
  flex: 1 1 160px;
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
.rotulo-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.convite {
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-primaria);
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
