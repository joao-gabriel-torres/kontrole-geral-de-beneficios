import { abasGestor, telaMobile, telaWeb } from './regioes'
import type { Caso, Passo, Regiao } from './tipos'

/**
 * Painel do gestor, tela inicial dos dois modos do protótipo (sem navegação). Casos só de leitura:
 * rodam antes dos que gravam no banco, com o seed do dia.
 *
 * Os passos com `papel: 'text'` em títulos sem ação servem para rolar até o bloco: o Playwright
 * rola o alvo para a vista antes de clicar.
 */

/**
 * O app mostra, no canto do Painel mobile, o avatar com "Sair" (x 319–359, y 16–56), que não
 * existe no protótipo: as regiões da tela no topo pulam esse canto.
 */
const topoMobile: Regiao[] = [
  { nome: 'cabecalho', x: 16, y: 16, largura: 300, altura: 52 },
  { nome: 'conteudo', x: 0, y: 68, largura: 367, altura: 624 },
  abasGestor,
]

const rolarAte = (titulo: string): Passo => ({ clicar: titulo, papel: 'text' })
const trintaDias: Passo = { clicar: '30 dias' }

const web = (nome: string, passos: Passo[] = []): Caso => ({
  nome: `gestor-web-painel${nome}`,
  modo: 'gw',
  app: 'gestor',
  rota: '/painel',
  passos,
  regioes: [telaWeb],
})

const mobile = (nome: string, passos: Passo[], regioes: Regiao[] = [telaMobile]): Caso => ({
  nome: `gestor-mobile-painel${nome}`,
  modo: 'gm',
  app: 'gestor',
  rota: '/painel',
  passos,
  regioes,
})

export const CASOS_PAINEL: Caso[] = [
  web(''),
  web('-30-dias', [trintaDias]),
  // A 5ª linha do ranking fica abaixo da dobra: rolar até ela mostra o rodapé da tela.
  web('-rodape', [rolarAte('Luciana Prado')]),
  web('-30-dias-rodape', [trintaDias, rolarAte('Luciana Prado')]),
  // O item está visível sem rolar: protótipo e app abrem o Detalhe no topo, com "Painel" ativo.
  web('-fila-detalhe', [rolarAte('Pintura da fachada lateral')]),
  // O rótulo do KPI vem antes dos chips da fila no DOM: o clique nele leva às Aprovações.
  web('-kpi-aprovacoes', [rolarAte('Aguardando aprovação')]),
  web('-novo-acionamento', [{ clicar: 'Novo acionamento' }]),
  mobile('', [], topoMobile),
  mobile('-graficos', [rolarAte('Reprovações por tipo')]),
  mobile('-fila', [rolarAte('Fila de aprovação')]),
  mobile('-ranking', [rolarAte('Ranking de prestadores')]),
  mobile('-30-dias', [trintaDias, rolarAte('Reprovações por tipo')]),
  // O protótipo herda a rolagem do Painel no Detalhe e o app volta ao topo: o 2º clique, já no
  // título do Detalhe, deixa os dois no topo.
  mobile('-fila-detalhe', [
    rolarAte('Pintura da fachada lateral'),
    rolarAte('Pintura da fachada lateral'),
  ]),
]
