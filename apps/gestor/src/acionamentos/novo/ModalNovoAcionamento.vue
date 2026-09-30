<script setup lang="ts">
import { dataISO, RussoIcone } from '@kgb/ui'
import {
  computed,
  defineAsyncComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUnmounted,
  reactive,
  ref,
  watch,
} from 'vue'
import { useRouter } from 'vue-router'
import BuscaTipos from '../../componentes/BuscaTipos.vue'
import { digitosCep, erroDoCep } from '../../componentes/cep'
import { usarConsultaCep } from '../../componentes/consultaCep'
import EntradaCep from '../../componentes/EntradaCep.vue'
import { mensagemDeErro } from '../../erros'
import { toastGestor } from '../../toast'
import { usarCriarAcionamento, usarTipos } from '../dados'
import { reiniciarLista } from '../estadoLista'
import CampoBusca from './CampoBusca.vue'
import { usarAssinantes, usarEnderecoDoPonto, usarPrestadoresProximos } from './dados'
import {
  camposDoPonto,
  cepDeReferencia,
  chaveDaLocalizacao,
  localizacaoDoAssinante,
  corpoDoFormulario,
  enderecoDoFormulario,
  enderecoDoMapa,
  filtrarPrestadores,
  formularioInicial,
  formularioValido,
  posicaoConhecida,
  prestadorMaisProximo,
  prestadorPadrao,
  type EnderecoDoPonto,
  type Localizacao,
  type OpcaoBusca,
  previaChecklist,
  rotuloContagem,
  rotuloPrestador,
} from './formulario'

const emit = defineEmits<{ fechar: [] }>()
const router = useRouter()
const { data: tipos, isError: erroTipos, error: falhaTipos, refetch: recarregarTipos } = usarTipos()
const { mutateAsync: criar, isPending: criando } = usarCriarAcionamento()

const form = reactive(formularioInicial(dataISO(new Date()), []))

// Cliente: a busca vai à API 250 ms depois da última tecla (apagar tudo busca na hora).
const buscaCliente = ref('')
const termoCliente = ref('')
let esperaCliente: ReturnType<typeof setTimeout> | undefined
watch(buscaCliente, (texto) => {
  clearTimeout(esperaCliente)
  if (!texto.trim()) termoCliente.value = ''
  else esperaCliente = setTimeout(() => (termoCliente.value = texto), 250)
})
onBeforeUnmount(() => clearTimeout(esperaCliente))
const {
  data: assinantes,
  isPending: semClientes,
  isPlaceholderData: clientesDeOutraBusca,
} = usarAssinantes(termoCliente)
/**
 * A lista ainda não é a do texto digitado: a espera de 250 ms não acabou, ou a busca saiu e a
 * lista mostrada é a da busca anterior. Nesse estado, o Enter não escolhe ("Martins" + Enter não
 * pode levar o primeiro da lista de antes).
 */
const buscandoClientes = computed(
  () =>
    buscaCliente.value.trim() !== termoCliente.value.trim() ||
    clientesDeOutraBusca.value ||
    semClientes.value,
)
const opcoesClientes = computed<OpcaoBusca[]>(() =>
  (assinantes.value ?? []).map((a) => ({ id: a.id, titulo: a.nome, detalhe: a.endereco })),
)
function escolherAssinante(id: string) {
  const escolhido = assinantes.value?.find((a) => a.id === id)
  if (escolhido) form.assinante = escolhido
}

// Pino movido = outro endereço (fora do protótipo, a pedido do usuário em 30/09): confirmar o mapa
// com o pino fora da posição do endereço marca "Atender em outro endereço" e o preenche pelo ponto
// (consulta reversa). A posição exata do pino vai só para o acionamento: como é outro endereço, o
// cadastro do assinante não muda.
const buscarEnderecoDoPonto = usarEnderecoDoPonto()
const SEM_ENDERECO: EnderecoDoPonto = {
  cep: null,
  logradouro: null,
  numero: null,
  bairro: null,
  cidade: null,
  uf: null,
}
/** O endereço que a consulta achou para o pino movido; sem nada quando ela falhou. */
const enderecoDoPino = ref<EnderecoDoPonto | null>(null)
const consultandoPino = ref(false)
/** A consulta do ponto falhou: os campos ficam vazios e editáveis, com um aviso. */
const pinoSemEndereco = ref(false)
/** Cada consulta do ponto ganha um número: a resposta de uma antiga (ou descartada) não preenche. */
let consultaDoPino = 0
/** O endereço do pino movido, enquanto a posição dele vale: completa o que o CEP não traz. */
const doPino = computed(() => (form.pinoMovido ? enderecoDoPino.value : null))

// Outro endereço: com os 8 dígitos, rua, bairro e cidade vêm da consulta do CEP.
const cepTocado = ref(false)
const cepConsultado = computed(() => (form.outroEndereco ? digitosCep(form.cep) : ''))
const consultaCep = usarConsultaCep(cepConsultado)
/** Rua, bairro e cidade do CEP; o que ele não traz (ou sem ele), do ponto do pino movido. */
function preencherPeloCep() {
  const e = consultaCep.endereco.value
  const ponto = doPino.value
  form.logradouro = e?.logradouro || ponto?.logradouro || ''
  form.bairro = e?.bairro || ponto?.bairro || ''
  form.cidade = e?.cidade || ponto?.cidade || ''
}
watch([cepConsultado, consultaCep.endereco], preencherPeloCep)
// O CEP que não existe (404) bloqueia o envio; o ViaCEP que não responde (502, tempo esgotado ou
// falha de rede) deixa a gestora digitar rua e bairro.
watch(consultaCep.inexistente, (inexistente) => (form.cepInexistente = inexistente), {
  immediate: true,
})
// O CEP que veio do ponto e o ViaCEP não conhece sai: o endereço fica com os campos do ponto, para
// a gestora completar o CEP sem perder a posição do pino.
watch(
  () => form.cepInexistente,
  (inexistente) => {
    const ponto = doPino.value
    if (!inexistente || !ponto?.cep || digitosCep(form.cep) !== ponto.cep) return
    enderecoDoPino.value = { ...ponto, cep: null }
    form.cep = ''
  },
)
/**
 * Rua e bairro seguem as regras da consulta do CEP (`usarConsultaCep`); no ponto do pino movido sem
 * CEP, também são digitados.
 */
const livres = computed(() => {
  if (doPino.value && cepConsultado.value.length !== 8) return { logradouro: true, bairro: true }
  return consultaCep.livres.value
})
const placeholderRua = computed(() =>
  consultandoPino.value ? 'Buscando o endereço do ponto…' : consultaCep.placeholderRua.value,
)
const erroCep = computed(() => {
  if (!form.outroEndereco) return ''
  return consultaCep.mensagem.value || (cepTocado.value ? erroDoCep(form.cep) : '')
})
const mapa = computed(() => enderecoDoMapa(form))

// Localização conferida no mapa (fora do protótipo, a pedido do usuário em 30/09): "Ver no mapa"
// abre o mapa com o pino no endereço em uso, e "Confirmar localização" grava a posição no
// formulário. Ela vale para o cliente, o CEP e o endereço em uso: trocar qualquer um a descarta,
// e no endereço do próprio assinante volta a última conferida para ele. A do pino movido não cai
// com o preenchimento automático do endereço: só ao trocar de cliente, voltar ao endereço de
// cadastro ou editar à mão o CEP ou o número que vieram do ponto.
const mapaAberto = ref(false)
const botaoMapa = ref<HTMLButtonElement>()
/** A posição conferida deixa de valer (e a consulta do ponto pendente não preenche mais nada). */
function descartarLocalizacao() {
  consultaDoPino += 1
  consultandoPino.value = false
  pinoSemEndereco.value = false
  enderecoDoPino.value = null
  form.pinoMovido = false
  form.localizacao = localizacaoDoAssinante(form)
}
watch(
  [() => form.assinante?.id, () => form.outroEndereco, () => chaveDaLocalizacao(form)],
  ([cliente, outro], [clienteAntes]) => {
    if (form.pinoMovido && outro && cliente === clienteAntes) return
    descartarLocalizacao()
  },
)
/**
 * A gestora editou o CEP ou o número. Se vieram do ponto do pino movido, o endereço não é mais o do
 * pino e a posição cai; se o ponto não os trouxe, ela só está completando o endereço. Durante a
 * consulta do ponto, a resposta deixa de sobrescrever o que ela digita.
 */
function editarAMao(campo: 'cep' | 'numero') {
  if (!form.pinoMovido) return
  if (consultandoPino.value) {
    consultaDoPino += 1
    consultandoPino.value = false
    enderecoDoPino.value = SEM_ENDERECO
  } else if (enderecoDoPino.value?.[campo]) {
    descartarLocalizacao()
  }
}
/**
 * O atendimento é no ponto do pino movido: marca o outro endereço na hora (o envio fica bloqueado
 * até o endereço se completar) e o preenche pela consulta reversa. Se ela falhar, os campos ficam
 * vazios e editáveis, com um aviso.
 */
async function preencherPeloPonto(posicao: Localizacao) {
  const consulta = ++consultaDoPino
  form.pinoMovido = true
  form.outroEndereco = true
  enderecoDoPino.value = null
  pinoSemEndereco.value = false
  consultandoPino.value = true
  Object.assign(form, camposDoPonto(null))
  let achado: EnderecoDoPonto | null = null
  try {
    achado = await buscarEnderecoDoPonto(posicao)
  } catch {
    achado = null
  }
  if (consulta !== consultaDoPino) return
  consultandoPino.value = false
  pinoSemEndereco.value = !achado
  enderecoDoPino.value = achado ?? SEM_ENDERECO
  Object.assign(form, camposDoPonto(achado))
}
/**
 * O mapa (com o Leaflet) só é baixado quando a gestora abre "Ver no mapa". Se o download falhar
 * (sem rede ou versão nova publicada), o mapa fecha com um aviso: o formulário não fica inerte.
 */
const DialogoMapa = defineAsyncComponent({
  loader: () => import('./DialogoMapa.vue'),
  errorComponent: { render: () => null },
  onError: (_erro, _tentar, falhar) => {
    falhar()
    void fecharMapa()
    toastGestor.mostrar('Não foi possível abrir o mapa, tente de novo')
  },
})
function abrirMapa() {
  mapaAberto.value = true
}
/** Fecha o mapa e devolve o foco ao botão que o abre ("Ver no mapa" ou "Trocar"). */
async function fecharMapa() {
  mapaAberto.value = false
  await nextTick()
  botaoMapa.value?.focus()
}
/** Sem mover o pino, confere o endereço em uso; com o pino movido, o atendimento é no ponto. */
function confirmarLocalizacao(posicao: Localizacao, movido: boolean) {
  form.localizacao = posicao
  void fecharMapa()
  if (movido) void preencherPeloPonto(posicao)
}

// Prestador: a lista vem do mais próximo ao mais distante do CEP em uso, e o mais próximo já vem
// escolhido (uma vez por CEP: a escolha da gestora vale até o CEP mudar). Sem nenhum prestador com
// CEP, a lista vem por nome: nada é trocado nem rotulado.
const cepPrestadores = computed(() => cepDeReferencia(form))
const {
  data: prestadores,
  isError: erroPrestadores,
  error: falhaPrestadores,
  refetch: recarregarPrestadores,
} = usarPrestadoresProximos(cepPrestadores)
let cepDaEscolha = ''
watch(
  prestadores,
  (resposta) => {
    if (!resposta) return
    const { cep, lista } = resposta
    const proximo = prestadorMaisProximo(cep, lista)
    if (proximo && cep !== cepDaEscolha) {
      form.prestadorId = proximo
      cepDaEscolha = cep
    } else if (!lista.some((p) => p.id === form.prestadorId)) {
      form.prestadorId = prestadorPadrao(lista)
    }
  },
  { immediate: true },
)
// Sem a lista, a falha vira mensagem com "Tentar de novo". Com a lista já carregada, uma nova busca
// que falhe não esconde o que a gestora está vendo.
const semTipos = computed(() => erroTipos.value && !tipos.value)
const semPrestadores = computed(() => erroPrestadores.value && !prestadores.value)
const buscaPrestador = ref('')
const listaPrestadores = computed(() => prestadores.value?.lista ?? [])
const opcoesPrestadores = computed<OpcaoBusca[]>(() => {
  // Só com a lista do CEP em uso (não a do CEP anterior, enquanto a nova não chega).
  const resposta = prestadores.value
  const proximo =
    resposta?.cep === cepPrestadores.value
      ? prestadorMaisProximo(resposta.cep, resposta.lista)
      : undefined
  return filtrarPrestadores(listaPrestadores.value, buscaPrestador.value).map((p) => ({
    id: p.id,
    titulo: p.nome,
    detalhe: [p.regiao, p.id === proximo ? 'mais próximo' : ''].filter(Boolean).join(' · '),
  }))
})
/** A escolha da gestora vale para o CEP em uso, mesmo que a lista dele ainda não tenha chegado. */
function escolherPrestador(id: string) {
  form.prestadorId = id
  cepDaEscolha = cepPrestadores.value
}
const rotuloDoPrestador = computed(() => {
  const escolhido = listaPrestadores.value.find((p) => p.id === form.prestadorId)
  return escolhido ? rotuloPrestador(escolhido) : ''
})

const valido = computed(() => formularioValido(form))
const bloqueado = computed(() => !valido.value || criando.value)
const previa = computed(() => previaChecklist(tipos.value ?? [], form.tipoIds))

async function enviar() {
  if (bloqueado.value) return
  try {
    const criado = await criar(corpoDoFormulario(form))
    reiniciarLista()
    emit('fechar')
    toastGestor.mostrar(`Acionamento enviado para ${criado.prestador.nome}`)
    await router.push({ name: 'acionamentos' })
  } catch (e) {
    toastGestor.mostrar(mensagemDeErro(e))
  }
}

/**
 * X, Cancelar e Esc. Durante o envio não fecham: num erro o formulário se perderia, e reabrir e
 * enviar de novo duplicaria o acionamento.
 */
function fechar() {
  if (criando.value) return
  emit('fechar')
}

const painel = ref<HTMLElement>()
// Quem abriu o modal (o botão "Novo acionamento") recebe o foco de volta ao fechar.
const focoAnterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
function aoTeclar(e: KeyboardEvent) {
  // Com o mapa aberto, o Esc é dele: fecha só o mapa.
  if (e.key === 'Escape' && !mapaAberto.value) fechar()
}
onMounted(() => {
  painel.value?.focus()
  document.addEventListener('keydown', aoTeclar)
})
onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
onUnmounted(() => focoAnterior?.focus())
</script>

<template>
  <div class="sobreposicao" :inert="mapaAberto || undefined">
    <div
      ref="painel"
      class="painel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="novo-titulo"
      tabindex="-1"
    >
      <div class="cabecalho">
        <h2 id="novo-titulo" class="titulo">Novo acionamento</h2>
        <button
          type="button"
          class="fechar"
          aria-label="Fechar"
          :aria-disabled="criando || undefined"
          @click="fechar"
        >
          <RussoIcone nome="cancel" :tamanho="18" />
        </button>
      </div>
      <div class="colunas">
        <!-- Os campos divergem do protótipo a pedido do usuário (30/09): buscas, CEP e mapa. -->
        <div class="campos">
          <label class="campo"
            >Título do acionamento
            <input
              v-model="form.titulo"
              class="entrada"
              placeholder="Ex.: Vazamento no banheiro social"
            />
          </label>
          <div class="grupo-tipos">
            <label id="novo-tipos" for="novo-busca-tipos" class="rotulo">Tipos de demanda</label>
            <div v-if="semTipos" class="falha" role="alert">
              {{ mensagemDeErro(falhaTipos) }}
              <button type="button" class="tentar" @click="recarregarTipos()">
                Tentar de novo
              </button>
            </div>
            <BuscaTipos v-else id="novo-busca-tipos" v-model="form.tipoIds" :tipos="tipos ?? []" />
          </div>
          <div class="campo">
            <label for="novo-cliente">Cliente</label>
            <CampoBusca
              id="novo-cliente"
              :opcoes="opcoesClientes"
              :valor="form.assinante?.nome ?? ''"
              :selecionado-id="form.assinante?.id ?? null"
              placeholder="Buscar assinante pelo nome"
              vazio="Nenhum assinante encontrado"
              :carregando="buscandoClientes"
              @buscar="buscaCliente = $event"
              @escolher="escolherAssinante"
            />
          </div>
          <div class="campo endereco">
            <div class="rotulo-linha">
              <label :for="form.outroEndereco ? 'novo-cep' : 'novo-endereco'">Endereço</label>
              <!-- O pino movido fica conferido mesmo antes de o endereço do ponto se completar. -->
              <div v-if="mapa || form.localizacao" class="localizacao">
                <span v-if="form.localizacao" class="conferida">
                  <RussoIcone nome="check" :tamanho="16" />Localização conferida
                </span>
                <button
                  ref="botaoMapa"
                  type="button"
                  class="mapa"
                  :aria-label="form.localizacao ? 'Trocar a localização no mapa' : undefined"
                  @click="abrirMapa"
                >
                  <template v-if="form.localizacao">Trocar</template>
                  <template v-else><RussoIcone nome="pin" :tamanho="16" />Ver no mapa</template>
                </button>
              </div>
            </div>
            <input
              v-if="!form.outroEndereco"
              id="novo-endereco"
              class="entrada"
              readonly
              :value="enderecoDoFormulario(form)"
              placeholder="Escolha o cliente para preencher o endereço"
            />
            <label class="outro-endereco">
              <input v-model="form.outroEndereco" type="checkbox" class="caixa" />
              Atender em outro endereço
            </label>
            <div v-if="form.outroEndereco" class="outro">
              <div v-if="pinoSemEndereco" class="aviso" role="status">
                Não achamos o endereço deste ponto: complete os campos
              </div>
              <div class="linha">
                <label class="campo cep"
                  >CEP
                  <EntradaCep
                    id="novo-cep"
                    v-model="form.cep"
                    class="entrada"
                    :aria-invalid="!!erroCep || undefined"
                    aria-describedby="novo-cep-erro"
                    @digitar="editarAMao('cep')"
                    @blur="cepTocado = true"
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
                  <input
                    v-model="form.numero"
                    class="entrada"
                    placeholder="Ex.: 410"
                    @input="editarAMao('numero')"
                  />
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
                  <input class="entrada" readonly :value="form.cidade" />
                </label>
              </div>
              <div v-if="erroCep" id="novo-cep-erro" class="falha" role="alert">
                {{ erroCep }}
              </div>
            </div>
          </div>
          <div class="horarios">
            <label class="campo data"
              >Data
              <input v-model="form.data" type="date" class="entrada compacta" />
            </label>
            <label class="campo hora"
              >Início
              <input v-model="form.inicio" type="time" class="entrada compacta" />
            </label>
            <label class="campo hora"
              >Fim
              <input v-model="form.fim" type="time" class="entrada compacta" />
            </label>
          </div>
          <div class="campo prestador">
            <label for="novo-prestador">Prestador</label>
            <div v-if="semPrestadores" class="falha" role="alert">
              {{ mensagemDeErro(falhaPrestadores) }}
              <button type="button" class="tentar" @click="recarregarPrestadores()">
                Tentar de novo
              </button>
            </div>
            <CampoBusca
              v-else
              id="novo-prestador"
              :opcoes="opcoesPrestadores"
              :valor="rotuloDoPrestador"
              :selecionado-id="form.prestadorId || null"
              placeholder="Buscar por nome ou região"
              vazio="Nenhum prestador encontrado"
              para-cima
              @buscar="buscaPrestador = $event"
              @escolher="escolherPrestador"
            />
          </div>
        </div>
        <div class="previa">
          <div>
            <h3 class="previa-titulo">Checklist gerado</h3>
            <div class="previa-contagem">{{ rotuloContagem(previa) }}</div>
          </div>
          <div v-if="!previa.length" class="previa-vazia">
            Escolha um ou mais tipos de demanda para montar o checklist.
          </div>
          <div v-for="t in previa" :key="t.id" class="previa-tipo">
            <div class="previa-nome">
              <span class="bolinha" :style="{ background: t.cor }" />{{ t.nome }}
            </div>
            <div v-for="(etapa, i) in t.etapas" :key="i" class="previa-etapa">
              <span class="numero">{{ i + 1 }}</span
              >{{ etapa }}
            </div>
          </div>
        </div>
      </div>
      <div class="acoes">
        <button
          type="button"
          class="cancelar"
          :aria-disabled="criando || undefined"
          @click="fechar"
        >
          Cancelar
        </button>
        <button
          type="button"
          class="enviar"
          :class="{ inativo: !valido || criando }"
          :aria-disabled="bloqueado"
          :aria-busy="criando || undefined"
          @click="enviar"
        >
          {{ criando ? 'Enviando…' : 'Enviar ao prestador' }}
        </button>
      </div>
    </div>
    <!-- Fora da área inerte: no app, #modais-gestor fica no layout, depois deste modal. -->
    <Teleport v-if="mapaAberto" defer to="#modais-gestor">
      <DialogoMapa
        :endereco="mapa"
        :inicial="posicaoConhecida(form)"
        @confirmar="confirmarLocalizacao"
        @cancelar="fecharMapa"
      />
    </Teleport>
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
.painel {
  width: 100%;
  max-width: 920px;
  background: var(--kgb-branco);
  border-radius: 24px;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
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
/* Sem padding explícito: fica o padrão do navegador para <button>, como no protótipo. */
.fechar {
  width: 36px;
  height: 36px;
  border: 0;
  border-radius: 12px;
  background: var(--kgb-superficie2);
  color: var(--kgb-tinta);
  display: flex;
  align-items: center;
  justify-content: center;
}
.colunas {
  display: flex;
  flex-wrap: wrap;
  gap: 24px;
  align-items: flex-start;
}
.campos {
  flex: 3 1 300px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
/*
 * Lado a lado com a prévia, a coluna tem no mínimo a altura da coluna do protótipo (medida a 1440
 * px, com os chips de tipos em três linhas): o modal não muda de altura e os botões ficam no lugar.
 */
@media (min-width: 656px) {
  .campos {
    min-height: 568px;
  }
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
.entrada.compacta {
  padding: 0 14px;
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
.rotulo-linha {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.localizacao {
  display: flex;
  align-items: center;
  gap: 12px;
}
.conferida {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-sucesso);
}
.mapa {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-primaria);
  cursor: pointer;
}
.mapa:hover {
  color: var(--kgb-primaria-hover);
}
.outro-endereco {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-texto);
  cursor: pointer;
}
.caixa {
  width: 16px;
  height: 16px;
  margin: 0;
  accent-color: var(--kgb-primaria);
}
.outro {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.linha {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
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
.linha .campo {
  min-width: 0;
}
.linha .entrada {
  width: 100%;
  min-width: 0;
}
.horarios {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.data {
  flex: 2 1 150px;
}
.hora {
  flex: 1 1 100px;
}
.grupo-tipos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rotulo {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-texto);
}
.bolinha {
  width: 8px;
  height: 8px;
  border-radius: 4px;
}
.previa {
  flex: 2 1 260px;
  min-width: 0;
  background: var(--kgb-superficie1);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.previa-titulo {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.previa-contagem {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.previa-vazia {
  font-size: 14px;
  color: var(--kgb-terciario);
  padding: 16px 0;
}
.previa-tipo {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.previa-nome {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.previa-etapa {
  display: flex;
  gap: 10px;
  font-size: 13px;
  color: var(--kgb-texto);
  padding: 6px 10px;
  background: var(--kgb-branco);
  border-radius: 10px;
}
.numero {
  width: 14px;
  color: var(--kgb-terciario);
  font-weight: 600;
}
.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  flex-wrap: wrap;
}
.cancelar,
.enviar {
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
.enviar {
  padding: 0 24px;
  background: var(--kgb-primaria);
  color: #fff;
}
.enviar.inativo {
  background: var(--kgb-primaria-tint-forte);
  color: var(--kgb-primaria-escura);
}
/* Aviso do pino movido sem endereço (como o do mapa): não existe em repouso. */
.aviso {
  background: var(--kgb-laranja-claro);
  color: var(--kgb-laranja-texto);
  border-radius: 16px;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 500;
}
/* Falhas (tipos, prestadores, CEP): não existem em repouso. */
.falha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--kgb-perigo-texto);
}
.tentar {
  padding: 0;
  border: 0;
  background: none;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-primaria);
  text-decoration: underline;
}
/* Estados do envio: os atributos não existem em repouso, então o visual parado não muda. */
.enviar[aria-busy='true'] {
  cursor: progress;
}
.fechar[aria-disabled='true'],
.cancelar[aria-disabled='true'] {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
