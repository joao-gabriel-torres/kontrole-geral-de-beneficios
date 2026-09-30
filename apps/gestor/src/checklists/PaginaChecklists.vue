<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
import { mensagemDeErro } from '../erros'
import { toastGestor } from '../toast'
import EditorTipo from './EditorTipo.vue'
import ListaTipos from './ListaTipos.vue'
import { usarCriarTipo, usarExcluirTipo, usarSalvarTipo, usarTiposDemanda } from './dados'
import { usarEdicaoTipos } from './edicao'
import {
  acrescentarEtapa,
  categoriasExistentes,
  editarEtapa,
  escolherSelecionado,
  removerEtapa,
  moverEtapa,
} from './regras'
import { tipoSelecionado } from './selecao'

const avisar = (erro: unknown) => toastGestor.mostrar(mensagemDeErro(erro))

const { data: tipos, isError, error } = usarTiposDemanda()
const edicao = usarEdicaoTipos({ salvar: usarSalvarTipo(), aoFalhar: avisar })
const criar = usarCriarTipo()
const excluir = usarExcluirTipo()

const exibidos = computed(() => (tipos.value ?? []).map(edicao.exibir))
const categorias = computed(() => categoriasExistentes(tipos.value ?? []))
const selecionado = computed(() => escolherSelecionado(exibidos.value, tipoSelecionado.value))
const novoTipo = ref('')
const novaEtapa = ref('')

// Trocar de tipo limpa "Nova etapa"; o tipo que sai volta a mostrar o que está salvo.
watch(
  () => selecionado.value?.id,
  (_, anterior) => {
    novaEtapa.value = ''
    if (anterior) edicao.soltar(anterior)
  },
)

function selecionar(id: string) {
  novaEtapa.value = ''
  tipoSelecionado.value = id
}

async function criarTipo() {
  const nome = novoTipo.value.trim()
  if (!nome || criar.isPending.value) return
  try {
    const tipo = await criar.mutateAsync(nome)
    novoTipo.value = ''
    tipoSelecionado.value = tipo.id
  } catch (erro) {
    avisar(erro)
  }
}

async function excluirTipo() {
  const tipo = selecionado.value
  if (!tipo || excluir.isPending.value) return
  try {
    await excluir.mutateAsync(tipo.id)
    edicao.descartar(tipo.id)
    // Como no protótipo: depois de excluir, o primeiro da lista.
    tipoSelecionado.value = null
  } catch (erro) {
    avisar(erro)
  }
}

function alterarChecklist(mudar: (lista: readonly string[]) => string[] | null) {
  const tipo = selecionado.value
  const nova = tipo && mudar(tipo.checklist)
  if (tipo && nova) edicao.alterarChecklist(tipo.id, nova)
}

function adicionarEtapa() {
  const tipo = selecionado.value
  const nova = tipo && acrescentarEtapa(tipo.checklist, novaEtapa.value)
  if (!tipo || !nova) return
  edicao.alterarChecklist(tipo.id, nova)
  novaEtapa.value = ''
}
</script>

<template>
  <PaginaGestor :largura="1080">
    <CabecalhoPagina
      titulo="Tipos de demanda"
      subtitulo="O checklist de cada tipo é copiado para o acionamento quando ele é criado."
    />
    <div v-if="tipos" class="colunas">
      <ListaTipos
        v-model:novo-tipo="novoTipo"
        :tipos="exibidos"
        :selecionado-id="selecionado?.id ?? null"
        @selecionar="selecionar"
        @criar="criarTipo"
      />
      <EditorTipo
        v-if="selecionado"
        v-model:nova-etapa="novaEtapa"
        :tipo="selecionado"
        :categorias="categorias"
        @renomear="(nome) => edicao.renomear(selecionado!.id, nome)"
        @soltar-nome="edicao.soltarNome(selecionado!.id)"
        @categorizar="(categoria) => edicao.categorizar(selecionado!.id, categoria)"
        @soltar-categoria="edicao.soltarCategoria(selecionado!.id)"
        @editar="(i, texto) => alterarChecklist((lista) => editarEtapa(lista, i, texto))"
        @mover="(de, para) => alterarChecklist((lista) => moverEtapa(lista, de, para))"
        @remover="(i) => alterarChecklist((lista) => removerEtapa(lista, i))"
        @adicionar="adicionarEtapa"
        @excluir="excluirTipo"
      />
    </div>
    <div v-else-if="isError" class="estado">{{ mensagemDeErro(error) }}</div>
  </PaginaGestor>
</template>

<style scoped>
/* Protótipo L270: a lista e o editor quebram em duas linhas quando não cabem lado a lado. */
.colunas {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}
.estado {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
</style>
