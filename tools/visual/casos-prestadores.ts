import { telaInteira, type Caso, type Modo, type Passo } from './tipos'

/** Os chips têm o nome acessível "rótulo + contagem" ("Inativos 1"): casa pelo início. */
const chip = (nome: string): Passo => ({ clicar: nome, inicio: true })
const BUSCA = 'Buscar por nome, documento, região ou e-mail'
/**
 * Anexa uma planilha de `fixtures/` e espera a conferência abrir: o clique no título não muda
 * nada, mas aguarda o modal nos dois lados (o protótipo busca o SheetJS na CDN antes de abrir).
 */
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
 * Prestadores (cadastro e conferência da planilha). Só estados que não gravam no banco: salvar, o
 * switch, excluir e importar mudariam os dados dos casos seguintes (anexar só pede a prévia).
 */
export const CASOS_PRESTADORES: Caso[] = [
  prestadores('', 'gw'),
  prestadores('ativos', 'gw', [chip('Ativos')]),
  prestadores('inativos', 'gw', [chip('Inativos')]),
  prestadores('busca', 'gw', [{ preencher: BUSCA, com: 'zona oeste' }]),
  prestadores('busca-vazia', 'gw', [{ preencher: BUSCA, com: 'xyz' }]),
  prestadores('novo', 'gw', [{ clicar: 'Novo prestador' }]),
  prestadores('novo-especialidades', 'gw', [
    { clicar: 'Novo prestador' },
    { clicar: 'Vazamento' },
    { clicar: 'Pintura' },
  ]),
  prestadores('novo-erro', 'gw', [{ clicar: 'Novo prestador' }, { preencher: 'Nome', com: 'Ana' }]),
  prestadores('editar', 'gw', [{ clicar: 'Carlos Mendes', papel: 'text' }]),
  prestadores('excluir-bloqueado', 'gw', [{ clicar: 'Excluir' }]),
  prestadores('excluir-livre', 'gw', [chip('Inativos'), { clicar: 'Excluir' }]),
  prestadores('importar', 'gw', conferir('credenciados.csv')),
  prestadores('importar-desativar', 'gw', [
    ...conferir('credenciados.csv'),
    { clicar: 'Desativar quem não está na planilha', inicio: true },
  ]),
  prestadores('importar-completa', 'gw', conferir('credenciados-completa.csv')),
  prestadores('importar-com-erros', 'gw', conferir('credenciados-com-erros.csv')),
  prestadores('', 'gm'),
  prestadores('inativos', 'gm', [chip('Inativos')]),
  prestadores('novo', 'gm', [{ clicar: 'Novo prestador' }]),
  prestadores('excluir-bloqueado', 'gm', [{ clicar: 'Excluir' }]),
  prestadores('importar', 'gm', conferir('credenciados.csv')),
]
