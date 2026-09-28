<script setup lang="ts">
import { dataISO, RussoIcone } from '@kgb/ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { mensagemDeErro } from '../../erros'
import { toastGestor } from '../../toast'
import { usarCriarAcionamento, usarPrestadoresAtivos, usarTipos } from '../dados'
import { reiniciarLista } from '../estadoLista'
import {
  alternarTipo,
  corpoDoFormulario,
  formularioInicial,
  formularioValido,
  prestadorPadrao,
  previaChecklist,
  rotuloContagem,
  rotuloPrestador,
} from './formulario'

const emit = defineEmits<{ fechar: [] }>()
const router = useRouter()
const { data: tipos } = usarTipos()
const { data: prestadores } = usarPrestadoresAtivos()
const { mutateAsync: criar, isPending: criando } = usarCriarAcionamento()

const form = reactive(formularioInicial(dataISO(new Date()), prestadores.value ?? []))
// Os prestadores podem chegar depois de o modal abrir.
watch(prestadores, (lista) => {
  if (lista && !form.prestadorId) form.prestadorId = prestadorPadrao(lista)
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

const painel = ref<HTMLElement>()
function aoTeclar(e: KeyboardEvent) {
  if (e.key === 'Escape') emit('fechar')
}
onMounted(() => {
  painel.value?.focus()
  document.addEventListener('keydown', aoTeclar)
})
onBeforeUnmount(() => document.removeEventListener('keydown', aoTeclar))
</script>

<template>
  <div class="sobreposicao">
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
        <button type="button" class="fechar" aria-label="Fechar" @click="emit('fechar')">
          <RussoIcone nome="cancel" :tamanho="18" />
        </button>
      </div>
      <div class="colunas">
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
            <div id="novo-tipos" class="rotulo">Tipos de demanda</div>
            <div class="tipos" role="group" aria-labelledby="novo-tipos">
              <button
                v-for="t in tipos ?? []"
                :key="t.id"
                type="button"
                class="tipo"
                :class="{ escolhido: form.tipoIds.includes(t.id) }"
                :aria-pressed="form.tipoIds.includes(t.id)"
                @click="form.tipoIds = alternarTipo(form.tipoIds, t.id)"
              >
                <span class="bolinha" :style="{ background: t.cor }" />{{ t.nome }}
              </button>
            </div>
          </div>
          <label class="campo"
            >Cliente
            <input v-model="form.cliente" class="entrada" placeholder="Nome do cliente" />
          </label>
          <label class="campo"
            >Endereço
            <input v-model="form.endereco" class="entrada" placeholder="Rua, número · bairro" />
          </label>
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
          <label class="campo"
            >Prestador
            <select v-model="form.prestadorId" class="entrada compacta selecao">
              <option v-for="p in prestadores ?? []" :key="p.id" :value="p.id">
                {{ rotuloPrestador(p) }}
              </option>
            </select>
          </label>
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
        <button type="button" class="cancelar" @click="emit('fechar')">Cancelar</button>
        <button
          type="button"
          class="enviar"
          :class="{ inativo: !valido }"
          :aria-disabled="bloqueado"
          @click="enviar"
        >
          Enviar ao prestador
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
.selecao {
  background: var(--kgb-branco);
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
.tipos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.tipo {
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
.tipo.escolhido {
  border-color: var(--kgb-primaria);
  background: var(--kgb-primaria-tint);
  color: var(--kgb-primaria-escura);
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
</style>
