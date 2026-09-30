import { telaInteira, type Caso, type Modo, type Passo } from './tipos'

/** Os chips têm o nome acessível "rótulo + contagem" ("Inativos 1"): casa pelo início. */
const chip = (nome: string): Passo => ({ clicar: nome, inicio: true })
const BUSCA = 'Buscar por nome, documento, região ou e-mail'
/**
 * Especialidades não reconhecidas ficam laranja na conferência (achado de revisão, fora do
 * protótipo): só esses trechos saem da comparação.
 */
const IGNORADAS = ['.especialidades .ignorada']

/**
 * Anexa uma planilha de `fixtures/` e espera a conferência abrir: o clique no título não muda
 * nada, mas aguarda o modal nos dois lados (o protótipo busca o SheetJS na CDN antes de abrir).
 */
const comIgnoradas = (caso: Caso): Caso => ({ ...caso, ocultarNoApp: IGNORADAS })

const conferir = (arquivo: string): Passo[] => [
  { anexar: arquivo },
  { clicar: 'Conferir importação', papel: 'text' },
]

function prestadores(nome: string, modo: Modo, passos: Passo[] = []): Caso {
  return {
    nome: `gestor-${modo === 'gw' ? 'web' : 'mobile'}-prestadores${nome ? `-${nome}` : ''}`,
    modo,
    navegarPrototipo: 'Prestadores',
    app: 'gestor',
    rota: '/prestadores',
    passos,
    regioes: [telaInteira(modo)],
  }
}

/**
 * Modal Novo/Editar prestador. O corpo do formulário diverge do protótipo a pedido do usuário
 * (30/09): o endereço pelo CEP vem primeiro, o botão de convite fica no rótulo do e-mail e as
 * especialidades usam a busca de tipos do Novo acionamento. O corpo fica fora da comparação (no
 * computador ele tem a altura do protótipo e rola por dentro); o cabeçalho, a linha de erro e os
 * botões seguem comparados.
 */
const comModal = (caso: Caso): Caso => ({
  ...caso,
  ocultarNoApp: ['[aria-labelledby="prestador-titulo"] .corpo'],
})

/**
 * Prestadores (cadastro e conferência da planilha). Só estados que não gravam no banco: salvar, o
 * switch, excluir e importar mudariam os dados dos casos seguintes (anexar só pede a prévia).
 */
export const CASOS_PRESTADORES: Caso[] = [
  prestadores('', 'gw'),
  prestadores('ativos', 'gw', [chip('Ativos')]),
  prestadores('inativos', 'gw', [chip('Inativos')]),
  prestadores('busca', 'gw', [{ preencher: BUSCA, com: 'zona oeste' }]),
  prestadores('busca-vazia', 'gw', [{ preencher: BUSCA, com: 'xyz' }]),
  comModal(prestadores('novo', 'gw', [{ clicar: 'Novo prestador' }])),
  comModal(
    prestadores('novo-especialidades', 'gw', [
      { clicar: 'Novo prestador' },
      // No app, o rótulo abre a busca de tipos; no protótipo, o clique não faz nada.
      { clicar: 'Especialidades', papel: 'text' },
      // Os tipos são botões nos dois: os chips do protótipo e os itens da lista suspensa do app,
      // que fica aberta dentro do corpo do modal (mascarado).
      { clicar: 'Vazamento' },
      { clicar: 'Pintura' },
    ]),
  ),
  comModal(
    prestadores('novo-erro', 'gw', [
      { clicar: 'Novo prestador' },
      { preencher: 'Nome', com: 'Ana' },
    ]),
  ),
  comModal(prestadores('editar', 'gw', [{ clicar: 'Carlos Mendes', papel: 'text' }])),
  prestadores('excluir-bloqueado', 'gw', [{ clicar: 'Excluir' }]),
  prestadores('excluir-livre', 'gw', [chip('Inativos'), { clicar: 'Excluir' }]),
  comIgnoradas(prestadores('importar', 'gw', conferir('credenciados.csv'))),
  comIgnoradas(
    prestadores('importar-desativar', 'gw', [
      ...conferir('credenciados.csv'),
      { clicar: 'Desativar quem não está na planilha', inicio: true },
    ]),
  ),
  comIgnoradas(prestadores('importar-completa', 'gw', conferir('credenciados-completa.csv'))),
  comIgnoradas(prestadores('importar-com-erros', 'gw', conferir('credenciados-com-erros.csv'))),
  prestadores('', 'gm'),
  prestadores('inativos', 'gm', [chip('Inativos')]),
  comModal(prestadores('novo', 'gm', [{ clicar: 'Novo prestador' }])),
  prestadores('excluir-bloqueado', 'gm', [{ clicar: 'Excluir' }]),
  comIgnoradas(prestadores('importar', 'gm', conferir('credenciados.csv'))),
]
