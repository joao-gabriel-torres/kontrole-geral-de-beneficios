<script setup lang="ts">
import { resolverUrl } from '@kgb/api-client'
import {
  BarraProgresso,
  dataBR,
  intervalo,
  MiniaturaFoto,
  progresso,
  RussoIcone,
  StatusChip,
  urlMapa,
} from '@kgb/ui'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { baseApi } from '../api'
import { mensagemDeErro } from '../consultas'
import BarraAcoes from './BarraAcoes.vue'
import CartaoEtapa from './CartaoEtapa.vue'
import { proverComentariosPendentes } from './comentariosPendentes'
import ConclusaoServico from './ConclusaoServico.vue'
import PainelInviavel from './PainelInviavel.vue'
import { avaliarEnvio, faixaDoStatus, mostrarConclusao, podeEditar } from './regras'
import { usarDetalhe } from './usarDetalhe'

const route = useRoute()
const router = useRouter()
// Fixo durante a vida da página: ao sair, a rota já mudou quando o autosave pendente dispara.
// O layout usa `:key` no RouterView, então outro acionamento monta outra instância.
const id = ref(String(route.params.id))
const acoes = usarDetalhe(id)
const d = acoes.detalhe

/** Uma etapa aberta por vez, como `openStep` no protótipo. */
const etapaAberta = ref<string | null>(null)
const painelInviavel = ref(false)

const editavel = computed(() => (d.value ? podeEditar(d.value.status) : false))
const faixa = computed(() => (d.value ? faixaDoStatus(d.value) : null))
const tipos = computed(() => d.value?.tipos.map((t) => t.nome).join(' + ') ?? '')
const andamento = computed(() => progresso(d.value?.etapas ?? { feitas: 0, total: 0 }))
/** O Google Maps no local do atendimento: a posição conferida no mapa, quando há, ou o endereço. */
const rota = computed(() => (d.value ? urlMapa(d.value.endereco, d.value) : ''))
const envio = computed(() =>
  d.value
    ? avaliarEnvio({
        regras: d.value.regras,
        fotosConclusao: d.value.fotosConclusao.length,
        etapas: d.value.etapas,
      })
    : { pode: false, falta: null },
)
const url = (caminho: string | null) => resolverUrl(baseApi, caminho)

function alternarEtapa(etapaId: string) {
  etapaAberta.value = etapaAberta.value === etapaId ? null : etapaId
}

const descarregarComentarios = proverComentariosPendentes()
/** Salvando os comentários pendentes antes de uma mudança de status (conta como ocupado). */
const salvandoComentarios = ref(false)
const ocupado = computed(() => salvandoComentarios.value || acoes.ocupado.value)

/**
 * Depois do envio a API não aceita mais editar comentários: o que ainda está no debounce (ou falhou)
 * é salvo antes. Se não salvar, a ação não segue (o aviso com o erro já foi mostrado).
 */
async function comComentariosSalvos(acao: () => Promise<unknown>): Promise<void> {
  if (ocupado.value) return
  salvandoComentarios.value = true
  try {
    await descarregarComentarios()
  } catch {
    return
  } finally {
    salvandoComentarios.value = false
  }
  await acao()
}

function enviar() {
  return comComentariosSalvos(acoes.enviar)
}

function enviarInviavel(comentario: string, arquivos: Blob[]) {
  return comComentariosSalvos(async () => {
    if (await acoes.marcarInviavel(comentario, arquivos)) painelInviavel.value = false
  })
}

function voltar() {
  if (router.options.history.state.back) router.back()
  else void router.push({ name: 'demandas' })
}
</script>

<template>
  <div class="detalhe">
    <!-- Com o painel "Marcar como inviável" aberto, a tela por trás fica inerte: o Tab não sai dele. -->
    <div class="cabecalho" :inert="painelInviavel || undefined">
      <button type="button" class="voltar" aria-label="Voltar" @click="voltar">
        <RussoIcone nome="chevron-right" :tamanho="20" class="seta" />
      </button>
      <div class="codigo-cabecalho">{{ d?.codigo }}</div>
      <div class="espaco" />
    </div>

    <div v-if="d" class="corpo" :inert="painelInviavel || undefined">
      <div class="identificacao">
        <StatusChip class="chip-status" :status="d.status" :inviavel="d.inviavel" />
        <div class="titulo-detalhe">{{ d.titulo }}</div>
        <div class="cliente-detalhe">{{ d.cliente }}</div>
      </div>

      <div class="info">
        <div class="linha-info">
          <RussoIcone nome="date-time" :tamanho="20" />
          <div class="texto-info">{{ dataBR(d.data) }} · {{ intervalo(d.inicio, d.fim) }}</div>
        </div>
        <div class="linha-info">
          <RussoIcone nome="pin" :tamanho="20" />
          <div class="texto-info endereco">{{ d.endereco }}</div>
          <a class="link-rota" :href="rota" target="_blank" rel="noopener">Rota</a>
        </div>
        <div class="linha-info">
          <RussoIcone nome="description" :tamanho="20" />
          <div class="texto-info">{{ tipos }}</div>
        </div>
      </div>

      <div v-if="faixa?.tipo === 'reprovado'" class="faixa reprovado">
        <div class="titulo-faixa">Reprovado pelo gestor</div>
        <div class="texto-faixa">{{ faixa.motivo }}</div>
      </div>
      <div v-else-if="faixa?.tipo === 'aguardando'" class="faixa aguardando">
        <div class="titulo-faixa">{{ faixa.titulo }}</div>
        <div class="texto-faixa">{{ faixa.quando }} · aguarde a conferência do gestor</div>
      </div>
      <div v-else-if="faixa?.tipo === 'aprovado'" class="faixa aprovado">{{ faixa.titulo }}</div>

      <div v-if="d.inviabilidade" class="cartao-inviavel">
        <div class="titulo-inviavel">Motivo da inviabilidade</div>
        <div class="texto-inviavel">{{ d.inviabilidade.comentario }}</div>
        <div class="fotos-inviavel">
          <MiniaturaFoto
            v-for="foto in d.inviabilidade.fotos"
            :key="foto.id"
            :tamanho="64"
            :url="url(foto.url)"
            :cor="foto.cor"
            :horario="foto.horario"
          />
        </div>
      </div>

      <!-- display: contents mantém cabeçalho, barra e grupos como filhos diretos do corpo (gap 16). -->
      <div class="checklist">
        <div class="cabecalho-checklist">
          <div class="titulo-checklist">Checklist</div>
          <span class="progresso-checklist">{{ andamento.texto }}</span>
        </div>
        <BarraProgresso class="barra-checklist" :percentual="andamento.percentual" />
        <div v-for="demanda in d.demandas" :key="demanda.id" class="grupo">
          <div class="grupo-cabecalho">
            <span class="bolinha" :style="{ background: demanda.cor }" />
            <span class="nome-grupo">{{ demanda.tipoNome }}</span>
            <span>
              {{ demanda.etapas.filter((e) => e.feita).length }}/{{ demanda.etapas.length }}
            </span>
          </div>
          <CartaoEtapa
            v-for="etapa in demanda.etapas"
            :key="etapa.id"
            :etapa="etapa"
            :editavel="editavel"
            :aberta="etapaAberta === etapa.id"
            :fotos-enviando="acoes.fotosEnviando.value[etapa.id] ?? 0"
            :salvar-comentario="(texto: string) => acoes.comentarEtapa(etapa.id, texto)"
            @alternar="acoes.marcarEtapa(etapa.id, !etapa.feita)"
            @expandir="alternarEtapa(etapa.id)"
            @adicionar-foto="(foto) => acoes.adicionarFoto('etapa', foto, etapa.id)"
            @remover-foto="acoes.removerFoto"
          />
        </div>
      </div>

      <ConclusaoServico
        v-if="mostrarConclusao(d)"
        :fotos="d.fotosConclusao"
        :comentario="d.comentarioConclusao"
        :editavel="editavel"
        :fotos-minimas="d.regras.photoMin"
        :fotos-enviando="acoes.fotosEnviando.value.conclusao ?? 0"
        :salvar-comentario="acoes.comentarConclusao"
        @adicionar-foto="(foto) => acoes.adicionarFoto('conclusao', foto)"
        @remover-foto="acoes.removerFoto"
      />
    </div>
    <div v-else-if="acoes.erro.value" class="corpo" :inert="painelInviavel || undefined">
      <div class="erro">{{ mensagemDeErro(acoes.erro.value) }}</div>
    </div>

    <BarraAcoes
      v-if="d"
      :status="d.status"
      :envio="envio"
      :ocupado="ocupado"
      :inert="painelInviavel || undefined"
      @iniciar="acoes.iniciar"
      @enviar="enviar"
      @inviavel="painelInviavel = true"
    />
    <PainelInviavel
      :aberto="painelInviavel"
      :enviando="ocupado"
      @fechar="painelInviavel = false"
      @enviar="enviarInviavel"
    />
  </div>
</template>

<style scoped>
.detalhe {
  min-height: 100%;
  display: flex;
  flex-direction: column;
}
.cabecalho {
  position: sticky;
  top: 0;
  z-index: 2;
  background: #fff;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 16px 8px;
}
.voltar {
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 12px;
  /* Sem padding no protótipo: vale o padrão do navegador para <button>. */
  padding: 1px 6px;
  background: var(--kgb-superficie1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--kgb-tinta);
}
.seta {
  transform: rotate(180deg);
}
.codigo-cabecalho {
  flex: 1;
  text-align: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.espaco {
  width: 40px;
}
.corpo {
  padding: 8px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
}
.identificacao {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.chip-status {
  align-self: flex-start;
}
.titulo-detalhe {
  font-size: 22px;
  line-height: 30px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.cliente-detalhe {
  font-size: 14px;
  font-weight: 500;
  color: var(--kgb-secundario);
}
.info {
  background: var(--kgb-superficie1);
  border-radius: 16px;
  padding: 4px 16px;
}
.linha-info {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid var(--kgb-divisor);
  color: var(--kgb-tinta);
}
.linha-info:last-child {
  border-bottom: 0;
}
.texto-info {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}
.endereco {
  min-width: 0;
}
.link-rota {
  font-size: 13px;
  font-weight: 600;
}
.faixa {
  border-radius: 16px;
  padding: 14px 16px;
}
.titulo-faixa {
  font-size: 13px;
  font-weight: 700;
}
.faixa.reprovado {
  background: var(--kgb-perigo-fundo);
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.reprovado .titulo-faixa {
  color: var(--kgb-perigo-texto);
}
.reprovado .texto-faixa {
  font-size: 14px;
  color: var(--kgb-titulo);
}
.faixa.aguardando {
  background: var(--kgb-laranja-claro);
}
.aguardando .titulo-faixa {
  color: var(--kgb-laranja-texto);
}
.aguardando .texto-faixa {
  font-size: 13px;
  color: var(--kgb-titulo);
}
.faixa.aprovado {
  background: var(--kgb-primaria-tint);
  font-size: 13px;
  font-weight: 700;
  color: var(--kgb-primaria-escura);
}
.cartao-inviavel {
  border: 1px solid var(--kgb-inviavel-fundo);
  border-radius: 16px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.titulo-inviavel {
  font-size: 13px;
  font-weight: 700;
  color: var(--kgb-inviavel);
}
.texto-inviavel {
  font-size: 14px;
  color: var(--kgb-texto);
}
.fotos-inviavel {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.checklist {
  display: contents;
}
.cabecalho-checklist {
  display: flex;
  align-items: center;
  gap: 10px;
}
.titulo-checklist {
  flex: 1;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.progresso-checklist {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.barra-checklist {
  margin-top: -8px;
}
.grupo {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.grupo-cabecalho {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--kgb-secundario);
}
.bolinha {
  width: 8px;
  height: 8px;
  border-radius: 4px;
}
.nome-grupo {
  flex: 1;
}
.erro {
  font-size: 14px;
  color: var(--kgb-terciario);
  padding: 20px 0;
  text-align: center;
}
</style>
