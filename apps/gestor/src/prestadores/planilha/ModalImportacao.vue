<script setup lang="ts">
import { RussoIcone } from '@kgb/ui'
import { computed, onBeforeUnmount, onMounted, onUnmounted, ref, type DeepReadonly } from 'vue'
import { useDisplay } from 'vuetify'
import { mensagemDeErro } from '../../erros'
import { usarModalAberto } from '../../modais'
import { toastGestor } from '../../toast'
import Interruptor from '../Interruptor.vue'
import { importacao, usarImportarPlanilha, type PreviaPlanilha } from './estado'
import {
  AVISO_CONVITE,
  avisoDeImportacao,
  especialidadesDaLinha,
  resumoDaPrevia,
  textoDosAusentes,
} from './textos'

const props = defineProps<{ arquivo: File; previa: DeepReadonly<PreviaPlanilha> }>()
const emit = defineEmits<{ fechar: [] }>()

usarModalAberto()
const { mdAndUp } = useDisplay()
const { mutateAsync: importar } = usarImportarPlanilha()

const desativar = importacao.desativarAusentes
const podeImportar = computed(() => props.previa.resumo.novos + props.previa.resumo.atualizados > 0)
/** Marcado antes do primeiro await: um segundo clique não importa de novo. */
const importando = ref(false)

async function confirmar() {
  if (!podeImportar.value || importando.value) return
  importando.value = true
  try {
    const resultado = await importar({
      arquivo: props.arquivo,
      desativarAusentes: desativar.value,
    })
    emit('fechar')
    toastGestor.mostrar(avisoDeImportacao(resultado))
  } catch (e) {
    toastGestor.mostrar(mensagemDeErro(e))
  } finally {
    importando.value = false
  }
}

const painel = ref<HTMLElement>()
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
      aria-labelledby="importacao-titulo"
      tabindex="-1"
    >
      <div class="cabecalho">
        <RussoIcone nome="sheet" :tamanho="24" class="icone" />
        <div class="identificacao">
          <h2 id="importacao-titulo" class="titulo">Conferir importação</h2>
          <div class="arquivo">{{ arquivo.name }}</div>
        </div>
        <button type="button" class="fechar" aria-label="Fechar" @click="emit('fechar')">
          <RussoIcone nome="cancel" :tamanho="18" class="icone" />
        </button>
      </div>
      <div class="resumo">{{ resumoDaPrevia(previa.resumo) }}</div>
      <div class="lista">
        <div v-for="(linha, i) in previa.linhas" :key="i" class="item">
          <div class="quem">
            <div class="nome">{{ linha.nome || '(sem nome)' }}</div>
            <div class="documento">{{ linha.documento || '—' }}</div>
          </div>
          <div class="especialidades">
            <span v-for="(e, j) in especialidadesDaLinha(linha)" :key="j"
              >{{ j ? ', ' : '' }}<span :class="{ ignorada: e.ignorada }">{{ e.texto }}</span></span
            >{{ linha.especialidades.length ? '' : '—' }}
          </div>
          <span class="selo" :class="linha.acao">{{ linha.selo }}</span>
        </div>
      </div>
      <div v-if="previa.novosComEmail" class="aviso-convite">{{ AVISO_CONVITE }}</div>
      <button
        v-if="previa.ausentes.length"
        type="button"
        class="ausentes"
        :aria-pressed="desativar"
        @click="importacao.alternarDesativar()"
      >
        <Interruptor :ligado="desativar" :animar-trilho="false" />
        <span class="textos">
          <span class="rotulo">Desativar quem não está na planilha</span>
          <span class="descricao">{{ textoDosAusentes(previa.ausentes.map((a) => a.nome)) }}</span>
        </span>
      </button>
      <div class="acoes">
        <button type="button" class="cancelar" @click="emit('fechar')">Cancelar</button>
        <button
          type="button"
          class="importar"
          :class="{ inativo: !podeImportar }"
          :aria-disabled="!podeImportar || importando"
          @click="confirmar"
        >
          Importar
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
  max-width: 760px;
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
.icone {
  color: var(--kgb-tinta);
}
.identificacao {
  flex: 1;
  min-width: 0;
}
.titulo {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.arquivo {
  font-size: 13px;
  color: var(--kgb-terciario);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
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
.resumo {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-tinta);
}
.lista {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--kgb-divisor);
  border-radius: 16px;
}
.item {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 14px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--kgb-divisor);
}
.quem {
  flex: 2 1 180px;
  min-width: 0;
}
.nome {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.documento {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.especialidades {
  flex: 2 1 160px;
  min-width: 0;
  font-size: 12px;
  color: var(--kgb-secundario);
}
/* Fora do protótipo: a cor das mensagens de validação dele (#B85200). */
.ignorada {
  color: var(--kgb-laranja-texto);
}
.selo {
  font-size: 12px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 999px;
  white-space: nowrap;
}
.selo.novo {
  background: var(--kgb-primaria-tint);
  color: var(--kgb-primaria-escura);
}
.selo.atualizar {
  background: var(--kgb-superficie2);
  color: var(--kgb-texto);
}
.selo.erro {
  background: var(--kgb-perigo-fundo);
  color: var(--kgb-perigo-texto);
}
/* Fora do protótipo: bloco no formato do dos ausentes, nas cores do selo de pendência dele. */
.aviso-convite {
  background: var(--kgb-laranja-claro);
  color: var(--kgb-laranja-texto);
  border-radius: 16px;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 500;
}
.ausentes {
  border: 0;
  background: var(--kgb-superficie1);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
}
.textos {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rotulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.descricao {
  font-size: 12px;
  color: var(--kgb-secundario);
}
.acoes {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.cancelar,
.importar {
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
.importar {
  padding: 0 24px;
  background: var(--kgb-primaria);
  color: #fff;
}
.importar.inativo {
  background: var(--kgb-primaria-tint-forte);
  color: var(--kgb-primaria-escura);
}
</style>
