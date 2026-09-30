import { telaMobile, telaWeb } from './regioes'
import { telaInteira, type Caso, type Passo } from './tipos'

/**
 * Abre um acionamento pelo título a partir de um filtro da lista. O protótipo reaproveita a
 * rolagem da lista no Detalhe; o segundo clique no título (já no Detalhe) faz o navegador rolar até
 * ele, e o protótipo e o app ficam os dois no topo.
 */
function abrirPeloTitulo(filtro: string, titulo: string): Passo[] {
  return [
    { clicar: filtro, inicio: true },
    { clicar: titulo, papel: 'text' },
    { clicar: titulo, papel: 'text' },
  ]
}

/**
 * A coluna de campos do Novo acionamento diverge do protótipo a pedido do usuário (30/09): buscas
 * de tipos, cliente e prestador, CEP e "Ver no mapa". Cabeçalho, prévia e botões seguem comparados.
 */
const CAMPOS_NOVO_ACIONAMENTO = ['[aria-labelledby="novo-titulo"] .campos']

const DETALHES = [
  { caso: 'aguardando', filtro: 'Aguardando', titulo: 'Revisão elétrica e troca de disjuntor' },
  { caso: 'reprovado', filtro: 'Reprovados', titulo: 'Revisão elétrica anual' },
  { caso: 'aprovado', filtro: 'Finalizados', titulo: 'Reparo no forro da sala' },
  { caso: 'inviavel', filtro: 'Finalizados', titulo: 'Ponto de luz na garagem' },
]

const casosDetalhe: Caso[] = (['gw', 'gm'] as const).flatMap((modo) =>
  DETALHES.map((d) => ({
    nome: `gestor-${modo === 'gw' ? 'web' : 'mobile'}-detalhe-${d.caso}`,
    modo,
    navegarPrototipo: 'Acionamentos',
    app: 'gestor' as const,
    rota: '/acionamentos',
    passos: abrirPeloTitulo(d.filtro, d.titulo),
    regioes: [telaInteira(modo)],
  })),
)

export const CASOS_GESTOR: Caso[] = [
  {
    nome: 'gestor-web-acionamentos',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    regioes: [telaWeb],
  },
  {
    nome: 'gestor-web-acionamentos-aguardando',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Aguardando', inicio: true }],
    regioes: [telaWeb],
  },
  {
    nome: 'gestor-web-novo-acionamento',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Novo acionamento' }],
    regioes: [telaWeb],
    ocultarNoApp: CAMPOS_NOVO_ACIONAMENTO,
  },
  {
    nome: 'gestor-web-novo-acionamento-tipos',
    modo: 'gw',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [
      { clicar: 'Novo acionamento' },
      // No app, o rótulo abre a busca de tipos; no protótipo, o clique não faz nada.
      { clicar: 'Tipos de demanda', papel: 'text' },
      // Os tipos são botões nos dois: os chips do protótipo e os itens da lista suspensa do app.
      { clicar: 'Vazamento' },
      { clicar: 'Reparo em gesso' },
      // Clicar fora fecha a lista suspensa do app; no protótipo, não faz nada.
      { clicar: 'Checklist gerado', papel: 'text' },
    ],
    regioes: [telaWeb],
    ocultarNoApp: CAMPOS_NOVO_ACIONAMENTO,
  },
  {
    nome: 'gestor-web-aprovacoes',
    modo: 'gw',
    navegarPrototipo: 'Aprovações',
    app: 'gestor',
    rota: '/aprovacoes',
    regioes: [telaWeb],
  },
  {
    nome: 'gestor-mobile-aprovacoes',
    modo: 'gm',
    navegarPrototipo: 'Aprovações',
    app: 'gestor',
    rota: '/aprovacoes',
    regioes: [telaMobile],
  },
  {
    nome: 'gestor-mobile-acionamentos',
    modo: 'gm',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    regioes: [telaMobile],
  },
  {
    nome: 'gestor-mobile-acionamentos-aguardando',
    modo: 'gm',
    navegarPrototipo: 'Acionamentos',
    app: 'gestor',
    rota: '/acionamentos',
    passos: [{ clicar: 'Aguardando', inicio: true }],
    regioes: [telaMobile],
  },
  ...casosDetalhe,
]
