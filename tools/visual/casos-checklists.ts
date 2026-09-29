import { abasGestor, sidebar, telaMobile, telaWeb } from './regioes'
import type { Caso, Regiao } from './tipos'

// Regiões da tela (levantamento checklists.md). No web o container de 1080 começa em x=296.
const cabecalhoWeb: Regiao = { nome: 'cabecalho', x: 296, y: 28, largura: 1080, altura: 54 }
const listaWeb: Regiao = { nome: 'lista', x: 296, y: 98, largura: 401, altura: 433 }
const editorWeb: Regiao = { nome: 'editor', x: 713, y: 98, largura: 663, altura: 459 }
// No mobile as colunas quebram em duas linhas (335 de largura útil, com a barra de rolagem de 8px).
const cabecalhoMobile: Regiao = { nome: 'cabecalho', x: 16, y: 16, largura: 335, altura: 72 }
const listaMobile: Regiao = { nome: 'lista', x: 16, y: 104, largura: 335, altura: 433 }
// Com a rolagem no máximo (1036 − 692 = 344), o editor (y=553 no conteúdo) fica em y=209.
const editorMobileRolado: Regiao = { nome: 'editor', x: 16, y: 209, largura: 335, altura: 459 }

const web = (nome: string, passos: Caso['passos'], regioes: Regiao[]): Caso => ({
  nome,
  modo: 'gw',
  navegarPrototipo: 'Checklists',
  app: 'gestor',
  rota: '/checklists',
  passos,
  regioes,
})
const mobile = (nome: string, passos: Caso['passos'], regioes: Regiao[]): Caso => ({
  ...web(nome, passos, regioes),
  modo: 'gm',
})

/**
 * Checklists (tipos de demanda). Só estados que não gravam no banco: criar, renomear, editar,
 * subir, remover e excluir mudariam os dados dos casos seguintes. "Adicionar etapa" com o campo
 * vazio não faz nada, mas rola a tela até o botão.
 */
export const CASOS_CHECKLISTS: Caso[] = [
  web('gestor-web-checklists', [], [sidebar, cabecalhoWeb, listaWeb, editorWeb, telaWeb]),
  web(
    'gestor-web-checklists-chaveiro',
    [{ clicar: 'Chaveiro 4 itens' }],
    [listaWeb, editorWeb, telaWeb],
  ),
  web(
    'gestor-web-checklists-limpeza',
    [{ clicar: 'Limpeza de ar-condicionado 5 itens' }],
    [listaWeb, editorWeb, telaWeb],
  ),
  web(
    'gestor-web-checklists-rascunhos',
    [
      { preencher: 'Novo tipo', com: 'Jardinagem' },
      { preencher: 'Nova etapa do checklist', com: 'Conferir a vedação do registro' },
    ],
    [listaWeb, editorWeb],
  ),
  mobile('gestor-mobile-checklists', [], [abasGestor, cabecalhoMobile, listaMobile, telaMobile]),
  mobile(
    'gestor-mobile-checklists-editor',
    [{ clicar: 'Adicionar etapa' }],
    [abasGestor, editorMobileRolado, telaMobile],
  ),
  mobile(
    'gestor-mobile-checklists-pintura',
    [{ clicar: 'Pintura 5 itens' }, { clicar: 'Adicionar etapa' }],
    [abasGestor, editorMobileRolado, telaMobile],
  ),
]
