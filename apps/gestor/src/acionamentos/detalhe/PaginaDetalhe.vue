<script setup lang="ts">
import {
  AvatarIniciais,
  dataBR,
  intervalo,
  MiniaturaFoto,
  RussoIcone,
  StatusChip,
  urlMapa,
} from '@kgb/ui'
import { computed, ref } from 'vue'
import PaginaGestor from '../../componentes/PaginaGestor.vue'
import { ErroApi, mensagemDeErro } from '../../erros'
import { toastGestor } from '../../toast'
import { usarDetalhe, usarRevisao } from '../dados'
import CartaoDecisao from './CartaoDecisao.vue'
import { MENSAGENS_REVISAO, prepararRevisao, ultimaDecisao, type Decisao } from './decisao'
import { urlFoto } from './fotos'
import { montarLinhaDoTempo } from './linhaDoTempo'

const props = defineProps<{ id: string; origem: 'acionamentos' | 'aprovacoes' }>()

const { data: acionamento, isError, error } = usarDetalhe(() => props.id)
const { mutateAsync: revisar, isPending: enviando } = usarRevisao(() => props.id)
const observacao = ref('')

const voltar = computed(() =>
  props.origem === 'aprovacoes'
    ? { rota: 'aprovacoes', rotulo: 'Aprovações' }
    : { rota: 'acionamentos', rotulo: 'Acionamentos' },
)
const historico = computed(() => montarLinhaDoTempo(acionamento.value?.eventos ?? []))
const decisaoAnterior = computed(() =>
  acionamento.value ? ultimaDecisao(acionamento.value) : null,
)
const temConclusao = computed(
  () =>
    !!acionamento.value &&
    (acionamento.value.fotosConclusao.length > 0 || !!acionamento.value.comentarioConclusao),
)
const aviso = computed(() =>
  error.value instanceof ErroApi && error.value.status === 404
    ? 'Acionamento não encontrado.'
    : mensagemDeErro(error.value),
)
const progressoDemanda = (etapas: readonly { feita: boolean }[]) =>
  `${etapas.filter((e) => e.feita).length}/${etapas.length}`

async function decidir(decisao: Decisao, texto: string) {
  if (enviando.value) return
  const pedido = prepararRevisao(decisao, texto)
  if (!pedido.ok) return toastGestor.mostrar(pedido.mensagem)
  try {
    await revisar(pedido.corpo)
    observacao.value = ''
    toastGestor.mostrar(MENSAGENS_REVISAO[decisao])
  } catch (e) {
    toastGestor.mostrar(mensagemDeErro(e))
  }
}
</script>

<template>
  <PaginaGestor :largura="1180">
    <RouterLink :to="{ name: voltar.rota }" class="voltar">
      <RussoIcone nome="chevron-right" :tamanho="18" class="seta" />{{ voltar.rotulo }}
    </RouterLink>
    <div v-if="isError" class="cartao aviso">{{ aviso }}</div>
    <template v-else-if="acionamento">
      <div class="topo">
        <div class="identificacao">
          <div class="codigo">{{ acionamento.codigo }}</div>
          <h1 class="titulo">{{ acionamento.titulo }}</h1>
        </div>
        <StatusChip :status="acionamento.status" :inviavel="acionamento.inviavel" tamanho="g" />
      </div>
      <div class="colunas">
        <div class="principal">
          <div class="cartao info">
            <div>
              <div class="rotulo">Cliente</div>
              <div class="valor">{{ acionamento.cliente }}</div>
            </div>
            <div>
              <div class="rotulo">Endereço</div>
              <a
                class="endereco"
                :href="urlMapa(acionamento.endereco)"
                target="_blank"
                rel="noopener"
                >{{ acionamento.endereco }}</a
              >
            </div>
            <div>
              <div class="rotulo">Atendimento</div>
              <div class="valor">
                {{ dataBR(acionamento.data) }} ·
                {{ intervalo(acionamento.inicio, acionamento.fim) }}
              </div>
            </div>
            <div>
              <div class="rotulo">Prestador</div>
              <div class="valor prestador">
                <AvatarIniciais
                  :nome="acionamento.prestador.nome"
                  :tamanho="22"
                  :cor="acionamento.prestador.cor"
                  :tamanho-fonte="9"
                />{{ acionamento.prestador.nome }}
              </div>
            </div>
          </div>
          <section v-if="acionamento.inviabilidade" class="cartao inviabilidade">
            <h2 class="titulo-inv">Motivo da inviabilidade</h2>
            <div class="texto-inv">{{ acionamento.inviabilidade.comentario }}</div>
            <div class="fotos">
              <MiniaturaFoto
                v-for="f in acionamento.inviabilidade.fotos"
                :key="f.id"
                :tamanho="96"
                :url="urlFoto(f)"
                :cor="f.cor"
                :horario="f.horario"
              />
            </div>
          </section>
          <section v-for="d in acionamento.demandas" :key="d.id" class="cartao demanda">
            <div class="cab-demanda">
              <span class="bolinha" :style="{ background: d.cor }" />
              <h2 class="nome-demanda">{{ d.tipoNome }}</h2>
              <span class="prog">{{ progressoDemanda(d.etapas) }}</span>
            </div>
            <div v-for="e in d.etapas" :key="e.id" class="etapa">
              <span
                class="caixa"
                :class="{ feita: e.feita }"
                role="img"
                :aria-label="e.feita ? 'Feita' : 'Pendente'"
              >
                <RussoIcone v-if="e.feita" nome="check" :tamanho="16" />
              </span>
              <div class="corpo-etapa">
                <div class="texto" :class="{ pendente: !e.feita }">{{ e.texto }}</div>
                <div v-if="e.comentario" class="comentario">{{ e.comentario }}</div>
                <div v-if="e.fotos.length" class="fotos">
                  <MiniaturaFoto
                    v-for="f in e.fotos"
                    :key="f.id"
                    :tamanho="80"
                    :url="urlFoto(f)"
                    :cor="f.cor"
                    :horario="f.horario"
                  />
                </div>
              </div>
            </div>
          </section>
          <section v-if="temConclusao" class="cartao conclusao">
            <h2 class="titulo-cartao">Conclusão do serviço</h2>
            <div v-if="acionamento.comentarioConclusao" class="comentario-final">
              {{ acionamento.comentarioConclusao }}
            </div>
            <div class="fotos">
              <MiniaturaFoto
                v-for="f in acionamento.fotosConclusao"
                :key="f.id"
                :tamanho="120"
                :url="urlFoto(f)"
                :cor="f.cor"
                :horario="f.horario"
              />
            </div>
          </section>
        </div>
        <div class="lateral">
          <CartaoDecisao
            v-if="acionamento.status === 'aguardando'"
            v-model:observacao="observacao"
            :inviavel="acionamento.inviavel"
            :enviando="enviando"
            @decidir="decidir"
          />
          <div v-if="decisaoAnterior" class="cartao ultima">
            <div class="rotulo-ultima">{{ decisaoAnterior.rotulo }}</div>
            <div v-if="decisaoAnterior.motivo" class="motivo-ultima">
              {{ decisaoAnterior.motivo }}
            </div>
          </div>
          <section class="cartao historico">
            <h2 class="titulo-cartao">Histórico</h2>
            <div v-for="(item, i) in historico" :key="i" class="evento">
              <span class="ponto" :style="{ background: item.cor }" />
              <div class="evento-corpo">
                <div class="evento-titulo">{{ item.titulo }}</div>
                <div class="evento-quando">{{ item.quando }}</div>
                <div v-if="item.nota" class="evento-nota">{{ item.nota }}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </template>
  </PaginaGestor>
</template>

<style scoped>
.voltar {
  align-self: flex-start;
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.voltar:hover {
  color: var(--kgb-secundario);
}
.seta {
  transform: rotate(180deg);
  color: var(--kgb-tinta);
}
.topo {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 12px;
}
.identificacao {
  flex: 1;
  min-width: 220px;
}
.codigo {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-terciario);
}
.titulo {
  margin: 0;
  font-size: 24px;
  line-height: 32px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.colunas {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}
.principal {
  flex: 2 1 400px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.lateral {
  flex: 1 1 280px;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.cartao {
  background: var(--kgb-branco);
  border-radius: 16px;
}
.principal .cartao {
  padding: 20px 24px;
}
.lateral .cartao {
  padding: 20px;
}
.aviso {
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
.info {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
  gap: 16px;
}
.rotulo {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.valor {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.endereco {
  font-size: 14px;
  font-weight: 600;
}
.prestador {
  display: flex;
  align-items: center;
  gap: 8px;
}
.inviabilidade {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border: 1px solid var(--kgb-inviavel-fundo);
}
.titulo-inv {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-inviavel);
}
.texto-inv {
  font-size: 14px;
  line-height: 20px;
  color: var(--kgb-texto);
}
.fotos {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.demanda {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.cab-demanda {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 8px;
}
.bolinha {
  width: 10px;
  height: 10px;
  border-radius: 5px;
}
.nome-demanda {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.prog {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.etapa {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  border-top: 1px solid var(--kgb-divisor);
}
.caixa {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  border: 1.5px solid var(--kgb-linha);
  flex: none;
}
.caixa.feita {
  border: 0;
  background: var(--kgb-primaria);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.corpo-etapa {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.texto {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.texto.pendente {
  color: var(--kgb-terciario);
}
.comentario {
  font-size: 13px;
  color: var(--kgb-texto);
  background: var(--kgb-superficie1);
  border-radius: 10px;
  padding: 8px 12px;
}
.conclusao {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.titulo-cartao {
  margin: 0;
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.comentario-final {
  font-size: 14px;
  color: var(--kgb-texto);
}
.ultima {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.rotulo-ultima {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-secundario);
}
.motivo-ultima {
  font-size: 14px;
  color: var(--kgb-texto);
}
.historico {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.evento {
  display: flex;
  gap: 12px;
}
.ponto {
  width: 10px;
  height: 10px;
  border-radius: 5px;
  margin-top: 5px;
  flex: none;
}
.evento-corpo {
  min-width: 0;
}
.evento-titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
}
.evento-quando {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.evento-nota {
  font-size: 13px;
  color: var(--kgb-texto);
  margin-top: 4px;
}
</style>
