/** As letras acentuadas do português e o que cada uma vira na busca (a mesma tabela do banco). */
const ACENTUADAS = 'ÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑáàâãäéèêëíìîïóòôõöúùûüçñ'
const SEM_ACENTO = 'AAAAAEEEEIIIIOOOOOUUUUCNaaaaaeeeeiiiiooooouuuucn'

/**
 * O texto como a busca o compara: sem os acentos do português e em minúsculas. É a regra da função
 * `nome_de_busca` do banco, que mantém `Assinante.nomeBusca` a cada INSERT e UPDATE
 * (`lower(translate(normalize(texto, NFC), …))`): a busca passa o termo por aqui e compara com a
 * coluna.
 */
export function nomeDeBusca(texto: string): string {
  let resultado = ''
  for (const c of texto.normalize('NFC')) {
    const i = ACENTUADAS.indexOf(c)
    resultado += i === -1 ? c : SEM_ACENTO[i]
  }
  return resultado.toLowerCase()
}
