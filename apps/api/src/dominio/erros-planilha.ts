/** Códigos de ErroDominio da frente de planilha (acrescente aqui os novos). */
export type CodigoErroPlanilha =
  | 'arquivo_obrigatorio'
  | 'planilha_ilegivel'
  | 'planilha_vazia'
  | 'planilha_muitas_linhas'
  | 'planilha_sem_validas'
  | 'planilha_conflito'
