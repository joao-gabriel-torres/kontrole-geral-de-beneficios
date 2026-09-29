<script setup lang="ts">
import { RussoIcone } from '@kgb/ui'
import { computed, ref } from 'vue'
import { usarTipos } from '../acionamentos/dados'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
import { mensagemDeErro } from '../erros'
import { toastGestor } from '../toast'
import { usarAlterarStatus, usarCadastro } from './dados'
import { estadoPrestadores } from './estado'
import { formularioDe, formularioVazio, type FormularioPrestador } from './formulario'
import LinhaPrestador from './LinhaPrestador.vue'
import { contagens, filtrarPrestadores, FILTROS, subtitulo, type PrestadorCadastro } from './lista'
import ModalExcluir from './ModalExcluir.vue'
import ModalPrestador from './ModalPrestador.vue'
import { baixarModeloPlanilha, exportarPlanilha } from './planilha/acoes'
import { importacao } from './planilha/estado'
import ModalImportacao from './planilha/ModalImportacao.vue'

const { data: lista, isSuccess, isError, error } = usarCadastro()
const { data: tipos } = usarTipos()
const { mutateAsync: alterarStatus } = usarAlterarStatus()

const prestadores = computed(() => lista.value ?? [])
const numeros = computed(() => (lista.value ? contagens(lista.value) : null))
const visiveis = computed(() =>
  filtrarPrestadores(prestadores.value, estadoPrestadores.filtro, estadoPrestadores.busca),
)

const formulario = ref<FormularioPrestador | null>(null)
const exclusao = ref<{ id: string; nome: string; emAberto: number } | null>(null)

async function alternar(p: PrestadorCadastro) {
  const ativo = p.status === 'ativo'
  try {
    await alterarStatus({ id: p.id, status: ativo ? 'inativo' : 'ativo' })
    toastGestor.mostrar(`${p.nome} ${ativo ? 'desativado' : 'reativado'}`)
  } catch (e) {
    toastGestor.mostrar(mensagemDeErro(e))
  }
}

/** "Subir planilha": entrega o arquivo à importação e zera o campo (aceita o mesmo de novo). */
function aoEscolherArquivo(evento: Event) {
  const campo = evento.target as HTMLInputElement
  const arquivo = campo.files?.[0]
  campo.value = ''
  if (arquivo) importacao.abrir(arquivo)
}
</script>

<template>
  <PaginaGestor :largura="1280">
    <CabecalhoPagina
      titulo="Prestadores"
      :subtitulo="lista ? subtitulo(lista) : undefined"
      :espaco="10"
    >
      <template #acoes>
        <button type="button" class="acao" @click="exportarPlanilha()">
          <RussoIcone nome="download" :tamanho="18" class="icone" />Exportar planilha
        </button>
        <label class="acao">
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            class="arquivo"
            @change="aoEscolherArquivo"
          /><RussoIcone nome="upload" :tamanho="18" class="icone" />Subir planilha
        </label>
        <button type="button" class="novo" @click="formulario = formularioVazio()">
          <RussoIcone nome="plus" :tamanho="18" />Novo prestador
        </button>
      </template>
    </CabecalhoPagina>
    <div class="ferramentas">
      <label class="busca">
        <RussoIcone nome="search" :tamanho="18" class="lupa" />
        <input
          v-model="estadoPrestadores.busca"
          class="campo"
          placeholder="Buscar por nome, documento, região ou e-mail"
          aria-label="Buscar prestadores"
        />
      </label>
      <div class="filtros" role="group" aria-label="Filtrar por status">
        <button
          v-for="f in FILTROS"
          :key="f.id"
          type="button"
          class="filtro"
          :class="{ ativo: estadoPrestadores.filtro === f.id }"
          :aria-pressed="estadoPrestadores.filtro === f.id"
          @click="estadoPrestadores.filtro = f.id"
        >
          {{ f.rotulo }}<span class="n">{{ numeros?.[f.id] ?? '' }}</span>
        </button>
      </div>
      <button type="button" class="modelo" @click="baixarModeloPlanilha()">
        <RussoIcone nome="sheet" :tamanho="16" class="icone" />Baixar modelo da planilha
      </button>
    </div>
    <div class="lista">
      <div v-if="isError" class="aviso">{{ mensagemDeErro(error) }}</div>
      <div v-else-if="isSuccess && !visiveis.length" class="aviso">
        Nenhum prestador encontrado.
      </div>
      <LinhaPrestador
        v-for="p in visiveis"
        :key="p.id"
        :prestador="p"
        @editar="formulario = formularioDe(p)"
        @alternar="alternar(p)"
        @excluir="exclusao = { id: p.id, nome: p.nome, emAberto: p.emAberto }"
      />
    </div>
    <Teleport defer to="#modais-gestor">
      <ModalPrestador
        v-if="formulario"
        :inicial="formulario"
        :lista="prestadores"
        :tipos="tipos ?? []"
        :acesso="prestadores.find((p) => p.id === formulario?.id)?.acesso"
        @fechar="formulario = null"
      />
      <ModalExcluir v-if="exclusao" :prestador="exclusao" @fechar="exclusao = null" />
      <ModalImportacao
        v-if="importacao.arquivo.value && importacao.previa.value"
        :arquivo="importacao.arquivo.value"
        :previa="importacao.previa.value"
        @fechar="importacao.fechar()"
      />
    </Teleport>
  </PaginaGestor>
</template>

<style scoped>
.acao,
.novo {
  height: 44px;
  border: 0;
  border-radius: 16px;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}
.acao {
  padding: 0 16px;
  background: var(--kgb-branco);
  color: var(--kgb-tinta);
  cursor: pointer;
}
.acao:hover {
  background: var(--kgb-primaria-hover-leve);
}
.novo {
  padding: 0 18px;
  background: var(--kgb-primaria);
  color: #fff;
}
.novo:hover {
  background: var(--kgb-primaria-hover);
}
/* O campo de arquivo fica invisível (no protótipo, display:none), mas alcançável pelo teclado. */
.arquivo {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.acao:has(.arquivo:focus-visible) {
  outline: 2px solid var(--kgb-tinta);
}
.icone {
  color: var(--kgb-tinta);
}
.ferramentas {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.busca {
  flex: 1 1 260px;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 44px;
  padding: 0 16px;
  background: var(--kgb-branco);
  border-radius: 16px;
  cursor: text;
}
.lupa {
  opacity: 0.55;
  color: var(--kgb-tinta);
}
.campo {
  flex: 1;
  min-width: 0;
  border: 0;
  outline: 0;
  font-size: 14px;
  font-weight: 400;
  background: transparent;
}
.filtros {
  display: flex;
  gap: 8px;
}
.filtro {
  height: 36px;
  padding: 0 14px;
  border: 0;
  border-radius: 999px;
  background: var(--kgb-branco);
  color: var(--kgb-texto);
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.filtro.ativo {
  background: var(--kgb-tinta);
  color: #fff;
}
.n {
  opacity: 0.6;
}
/* Sem padding explícito no protótipo: fica o padrão do navegador para <button>. */
.modelo {
  padding: 1px 6px;
  border: 0;
  background: transparent;
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-primaria);
  display: flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
}
.lista {
  background: var(--kgb-branco);
  border-radius: 16px;
  overflow: hidden;
}
.aviso {
  padding: 32px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
</style>
