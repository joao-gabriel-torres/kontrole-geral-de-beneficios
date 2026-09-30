<script setup lang="ts">
import { formatarCep } from './cep'

/**
 * O campo de CEP com a máscara "00000-000" (só dígitos, no máximo 8). `digitar` avisa depois de cada
 * tecla, já com o CEP formatado no modelo. Classe, id, aria-* e @blur vão direto para o <input>.
 */
const cep = defineModel<string>({ required: true })
const emit = defineEmits<{ digitar: [] }>()

function digitar(evento: Event) {
  const campo = evento.target as HTMLInputElement
  const formatado = formatarCep(campo.value)
  // Uma tecla que não muda o CEP (uma letra, por exemplo) não re-renderiza: o campo volta à mão.
  campo.value = formatado
  cep.value = formatado
  emit('digitar')
}
</script>

<template>
  <input :value="cep" inputmode="numeric" placeholder="00000-000" @input="digitar" />
</template>
