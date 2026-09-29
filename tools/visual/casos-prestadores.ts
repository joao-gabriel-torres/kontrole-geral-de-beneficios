import { telaInteira, type Caso, type Modo, type Passo } from './tipos'

/** Os chips têm o nome acessível "rótulo + contagem" ("Inativos 1"): casa pelo início. */
const chip = (nome: string): Passo => ({ clicar: nome, inicio: true })
const BUSCA = 'Buscar por nome, documento, região ou e-mail'

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
 * Prestadores (cadastro). Só estados que não gravam no banco: salvar, o switch, excluir e
 * importar mudariam os dados dos casos seguintes.
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
  prestadores('', 'gm'),
  prestadores('inativos', 'gm', [chip('Inativos')]),
  prestadores('novo', 'gm', [{ clicar: 'Novo prestador' }]),
  prestadores('excluir-bloqueado', 'gm', [{ clicar: 'Excluir' }]),
]
