<script setup lang="ts">
import { AvatarIniciais, StatusChip } from '@kgb/ui'
import { computed } from 'vue'
import { rotuloTipos } from '../acionamentos/apresentacao'
import { usarLista } from '../acionamentos/dados'
import CabecalhoPagina from '../componentes/CabecalhoPagina.vue'
import PaginaGestor from '../componentes/PaginaGestor.vue'
import { mensagemDeErro } from '../erros'
import { enviadoEm, ordenarFila } from './fila'

const { data, isSuccess, isError, error } = usarLista('aguardando')
const fila = computed(() => ordenarFila(data.value ?? []))
</script>

<template>
  <PaginaGestor :largura="1080">
    <CabecalhoPagina
      titulo="Aprovações"
      subtitulo="Confira as fotos e comentários de cada etapa antes de aprovar."
    />
    <div v-if="isError" class="vazio">{{ mensagemDeErro(error) }}</div>
    <div v-else-if="isSuccess && fila.length === 0" class="vazio">Sua fila está vazia.</div>
    <div class="grade">
      <RouterLink
        v-for="a in fila"
        :key="a.id"
        :to="{ name: 'aprovacao', params: { id: a.id } }"
        class="cartao"
      >
        <div class="topo">
          <span class="codigo">{{ a.codigo }}</span>
          <StatusChip :status="a.status" :inviavel="a.inviavel" />
        </div>
        <div>
          <div class="titulo">{{ a.titulo }}</div>
          <div class="sub">{{ a.cliente }} · {{ rotuloTipos(a.tipos) }}</div>
        </div>
        <div class="rodape">
          <AvatarIniciais
            :nome="a.prestador.nome"
            :tamanho="30"
            :cor="a.prestador.cor"
            :tamanho-fonte="11"
          />
          <div class="quem">
            <div class="nome">{{ a.prestador.nome }}</div>
            <div class="enviado">{{ enviadoEm(a) }}</div>
          </div>
          <span class="analisar">Analisar</span>
        </div>
      </RouterLink>
    </div>
  </PaginaGestor>
</template>

<style scoped>
.vazio {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 40px;
  text-align: center;
  font-size: 14px;
  color: var(--kgb-terciario);
}
.grade {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 12px;
}
.cartao {
  background: var(--kgb-branco);
  border-radius: 16px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  color: var(--kgb-tinta);
  cursor: pointer;
}
.cartao:hover {
  box-shadow: var(--kgb-sombra-elevado);
  color: var(--kgb-tinta);
}
.topo {
  display: flex;
  align-items: center;
  gap: 8px;
}
.codigo {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-terciario);
}
.titulo {
  font-size: 16px;
  font-weight: 700;
  color: var(--kgb-titulo);
}
.sub {
  font-size: 13px;
  color: var(--kgb-secundario);
}
.rodape {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--kgb-divisor);
}
.quem {
  flex: 1;
  min-width: 0;
}
.nome {
  font-size: 13px;
  font-weight: 600;
}
.enviado {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.analisar {
  font-size: 13px;
  font-weight: 600;
  color: var(--kgb-primaria-escura);
}
</style>
