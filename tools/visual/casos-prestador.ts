import { telaInteira, type Caso, type Passo, type Regiao } from './tipos'

const abasPrestador: Regiao = { nome: 'abas', x: 0, y: 688, largura: 375, altura: 80 }
const cabecalhoPrestador = (altura: number): Regiao => ({
  nome: 'cabecalho',
  x: 0,
  y: 0,
  largura: 360,
  altura,
})
const tela = telaInteira('pa')

/**
 * Os chips de Demandas têm o nome acessível "rótulo + contagem" (por exemplo "Corrigir 1"). As
 * contagens vêm do seed do dia, que é o mesmo gerador do protótipo.
 */
const chip = (nome: string): Passo => ({ clicar: nome })
const titulo = (texto: string): Passo => ({ clicar: texto, papel: 'text' })

/**
 * Toasts ficam fora da comparação (spec), mas o harness fotografa o protótipo só depois de o app
 * carregar: o toast do protótipo já sumiu e o do app não. Como os passos só clicam (250 ms cada),
 * dez cliques no código do cabeçalho (que não faz nada) deixam o toast de 2,6 s sumir nos dois.
 */
const esperarToast = (codigo: string): Passo[] =>
  Array.from({ length: 10 }, () => ({ clicar: codigo, papel: 'text' as const }))

const demandas = (nome: string, passos: Passo[] = []): Caso => ({
  nome,
  modo: 'pa',
  navegarPrototipo: 'Demandas',
  app: 'prestador',
  rota: '/demandas',
  passos,
  regioes: [tela],
})

export const CASOS_PRESTADOR: Caso[] = [
  {
    nome: 'prestador-inicio',
    modo: 'pa',
    app: 'prestador',
    rota: '/inicio',
    regioes: [tela],
  },
  {
    nome: 'prestador-agenda',
    modo: 'pa',
    navegarPrototipo: 'Agenda',
    app: 'prestador',
    rota: '/agenda',
    regioes: [abasPrestador, cabecalhoPrestador(48)],
  },
  demandas('prestador-demandas-ativas'),
  demandas('prestador-demandas-corrigir', [chip('Corrigir 1')]),
  demandas('prestador-demandas-analise', [chip('Em análise 2')]),
  demandas('prestador-demandas-finalizadas', [chip('Finalizadas 12')]),
  demandas('prestador-detalhe-aberto', [titulo('Vazamento no teto do banheiro')]),
  demandas('prestador-detalhe-reprovado', [
    chip('Corrigir 1'),
    titulo('Reparo em gesso no quarto'),
  ]),
  demandas('prestador-detalhe-reprovado-etapa', [
    chip('Corrigir 1'),
    titulo('Reparo em gesso no quarto'),
    titulo('Remover parte danificada'),
  ]),
  demandas('prestador-detalhe-aguardando', [
    chip('Em análise 2'),
    titulo('Limpeza de ar-condicionado'),
  ]),
  demandas('prestador-detalhe-aprovado', [
    chip('Finalizadas 12'),
    titulo('Troca de fechadura da porta dos fundos'),
  ]),
  demandas('prestador-inviavel', [
    titulo('Vazamento no teto do banheiro'),
    { clicar: 'Marcar como inviável' },
  ]),
  // Por último: "Iniciar atendimento" grava no banco (rode `pnpm db:seed` antes de cada rodada).
  demandas('prestador-detalhe-em-andamento', [
    titulo('Vazamento no teto do banheiro'),
    { clicar: 'Iniciar atendimento' },
    titulo('Localizar ponto do vazamento'),
    ...esperarToast('AC-1063'),
  ]),
]
