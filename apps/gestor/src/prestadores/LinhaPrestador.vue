<script setup lang="ts">
import { AvatarIniciais, formatarTelefone, RussoIcone } from '@kgb/ui'
import { computed } from 'vue'
import Interruptor from './Interruptor.vue'
import { chipsDaLinha, linhaDocumento, rotuloCarga, type PrestadorCadastro } from './lista'

const props = defineProps<{ prestador: PrestadorCadastro }>()
const emit = defineEmits<{ editar: []; alternar: []; excluir: [] }>()

const ativo = computed(() => props.prestador.status === 'ativo')
const chips = computed(() => chipsDaLinha(props.prestador))
</script>

<template>
  <!-- A linha inteira abre o Editar (o nome é um botão para quem usa o teclado). -->
  <div class="linha" :class="{ inativo: !ativo }" @click="emit('editar')">
    <div class="identidade">
      <AvatarIniciais
        :nome="prestador.nome"
        :tamanho="40"
        :cor="ativo ? prestador.cor : '#A6A6A6'"
      />
      <div class="textos">
        <button type="button" class="nome">{{ prestador.nome }}</button>
        <div class="documento">{{ linhaDocumento(prestador) }}</div>
      </div>
    </div>
    <div class="contato">
      <div class="telefone">{{ formatarTelefone(prestador.telefone) }}</div>
      <div class="email">{{ prestador.email ?? '' }}</div>
    </div>
    <div class="especialidades">
      <span v-for="(nome, i) in chips.visiveis" :key="i" class="chip">{{ nome }}</span>
      <span v-if="chips.mais" class="mais">{{ chips.mais }}</span>
    </div>
    <div class="carga">{{ rotuloCarga(prestador) }}</div>
    <div class="controles">
      <button
        type="button"
        class="switch"
        role="switch"
        :aria-checked="ativo"
        title="Ativar ou desativar"
        @click.stop="emit('alternar')"
      >
        <Interruptor :ligado="ativo" />
        <span class="status">{{ ativo ? 'Ativo' : 'Inativo' }}</span>
      </button>
      <button type="button" class="lixeira" title="Excluir" @click.stop="emit('excluir')">
        <RussoIcone nome="trash" :tamanho="18" class="icone" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.linha {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  padding: 14px 20px;
  border-bottom: 1px solid var(--kgb-divisor);
  cursor: pointer;
}
.linha:hover {
  background: var(--kgb-superficie1);
}
.identidade {
  flex: 2.4 1 220px;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 12px;
}
.textos {
  min-width: 0;
}
.nome {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  text-align: left;
  font-size: 14px;
  font-weight: 600;
  color: var(--kgb-titulo);
  cursor: inherit;
}
.documento {
  font-size: 12px;
  color: var(--kgb-terciario);
}
.contato {
  flex: 1.6 1 170px;
  min-width: 0;
}
.telefone {
  font-size: 13px;
  color: var(--kgb-texto);
}
.email {
  font-size: 12px;
  color: var(--kgb-terciario);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.especialidades {
  flex: 2 1 200px;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.chip,
.mais {
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  background: var(--kgb-superficie2);
}
.chip {
  padding: 3px 10px;
  color: var(--kgb-texto);
  white-space: nowrap;
}
.mais {
  padding: 3px 8px;
  color: var(--kgb-terciario);
}
.inativo .identidade,
.inativo .contato,
.inativo .especialidades {
  opacity: 0.6;
}
.carga {
  flex: 1.2 1 140px;
  font-size: 12px;
  color: var(--kgb-secundario);
}
.controles {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
}
.switch {
  border: 0;
  background: transparent;
  padding: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.status {
  width: 44px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--kgb-primaria-escura);
}
.inativo .status {
  color: var(--kgb-terciario);
}
/* Sem padding explícito no protótipo: fica o padrão do navegador para <button>. */
.lixeira {
  width: 36px;
  height: 36px;
  padding: 1px 6px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
}
.lixeira:hover {
  background: var(--kgb-perigo-fundo);
}
.icone {
  color: var(--kgb-tinta);
}
</style>
