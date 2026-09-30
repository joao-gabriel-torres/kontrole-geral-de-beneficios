import { describe, expect, it } from 'vitest'
import { ErroDominio } from './acionamento'
import {
  CABECALHO_PLANILHA,
  dataDaPlanilha,
  decodificarTexto,
  detectarSeparador,
  formatarDocumento,
  formatarTelefone,
  LIMITE_LINHAS,
  LINHA_MODELO,
  linhasDeExportacao,
  mapearTabela,
  montarPrevia,
  nomeDaExportacao,
  normalizarTexto,
  type Celula,
  type LinhaLida,
  type PrestadorExistente,
} from './planilha'

function erroDe(f: () => unknown): ErroDominio {
  try {
    f()
  } catch (e) {
    if (e instanceof ErroDominio) return e
    throw e
  }
  throw new Error('não lançou')
}

const TIPOS = [
  { id: 't1', nome: 'Vazamento' },
  { id: 't5', nome: 'Pintura' },
  { id: 't7', nome: 'Limpeza de ar-condicionado' },
  { id: 't8', nome: 'Chaveiro' },
]

/** Na ordem de cadastro, como o serviço entrega. */
const EXISTENTES: PrestadorExistente[] = [
  { id: 'p1', nome: 'Carlos Mendes', documento: '31840211750', status: 'ativo' },
  { id: 'p2', nome: 'Ana Ribeiro', documento: '27415903000144', status: 'ativo' },
  { id: 'p5', nome: 'Roberto Alves', documento: '21977438012', status: 'inativo' },
  { id: 'p6', nome: 'Luciana Prado', documento: '41206557000190', status: 'ativo' },
]

const lida = (d: Partial<LinhaLida>): LinhaLida => ({
  nome: '',
  documento: '',
  telefone: '(11) 91234-5678',
  email: '',
  regiao: '',
  especialidades: '',
  status: '',
  credenciadoDesde: '',
  ...d,
})
const previa = (...linhas: Partial<LinhaLida>[]) =>
  montarPrevia(linhas.map(lida), EXISTENTES, TIPOS)
const selos = (...linhas: Partial<LinhaLida>[]) => previa(...linhas).linhas.map((l) => l.selo)

describe('normalizarTexto (o norm do protótipo)', () => {
  it('tira acentos, maiúsculas e tudo o que não é letra', () => {
    expect(normalizarTexto('Região ')).toBe('regiao')
    expect(normalizarTexto('CPF/CNPJ')).toBe('cpfcnpj')
    expect(normalizarTexto('Nome_1')).toBe('nome')
    expect(normalizarTexto('Limpeza de ar-condicionado')).toBe('limpezadearcondicionado')
  })
})

describe('decodificarTexto', () => {
  it('com BOM é UTF-8, sem o BOM no texto', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Região')])
    expect(decodificarTexto(bytes)).toBe('Região')
  })
  it('UTF-8 válido sem BOM continua UTF-8', () => {
    expect(decodificarTexto(new TextEncoder().encode('João'))).toBe('João')
  })
  it('o resto é Windows-1252 (CSV do Excel em pt-BR)', () => {
    expect(decodificarTexto(new Uint8Array([0x4a, 0x6f, 0xe3, 0x6f, 0x20, 0x80]))).toBe('João €')
  })
  it('UTF-16 com BOM ("Texto Unicode" do Excel), little e big endian, sem o BOM no texto', () => {
    const le = [0xff, 0xfe, 0x4a, 0x00, 0x6f, 0x00, 0xe3, 0x00, 0x6f, 0x00, 0x09, 0x00]
    const be = [0xfe, 0xff, 0x00, 0x4a, 0x00, 0x6f, 0x00, 0xe3, 0x00, 0x6f, 0x00, 0x09]
    expect(decodificarTexto(new Uint8Array(le))).toBe('João\t')
    expect(decodificarTexto(new Uint8Array(be))).toBe('João\t')
  })
})

describe('detectarSeparador', () => {
  it('ponto e vírgula quando aparece mais que a vírgula na primeira linha', () => {
    expect(detectarSeparador('Nome;CPF;"Vazamento, Pintura"\n1,2,3,4')).toBe(';')
  })
  it('vírgula no empate e quando ela aparece mais', () => {
    expect(detectarSeparador('Nome,CPF;x')).toBe(',')
    expect(detectarSeparador('Nome')).toBe(',')
  })
  it('separadores dentro de aspas não contam', () => {
    expect(detectarSeparador('"a;b;c",d')).toBe(',')
  })
  it('tabulação (TSV) quando aparece mais que a vírgula e o ponto e vírgula', () => {
    expect(detectarSeparador('Nome\tCPF/CNPJ\tEspecialidades\n"Ana, Bia";x')).toBe('\t')
    expect(detectarSeparador('Nome\tCPF;Região;Status')).toBe(';')
  })
})

describe('proteções da importação', () => {
  it('coluna ausente do cabeçalho não apaga dados: "Atualizar" só sobrescreve o que veio', () => {
    const p = montarPrevia(
      [lida({ nome: 'Carlos Mendes', documento: '318.402.117-50' })],
      EXISTENTES,
      TIPOS,
      new Set(['nome', 'documento', 'telefone']),
    )
    expect(p.linhas[0]!.selo).toBe('Atualizar')
    const g = p.gravacoes[0]!
    expect(Object.keys(g.dados).sort()).toEqual(['documento', 'nome', 'telefone'])
  })

  it('coluna presente com célula vazia continua valendo (a planilha manda apagar)', () => {
    const p = previa({ nome: 'Carlos Mendes', documento: '318.402.117-50', email: '' })
    expect(p.gravacoes[0]!.dados).toMatchObject({ email: null, regiao: null })
  })

  it('linha rejeitada ainda protege o prestador do "desativar quem não está na planilha"', () => {
    const p = previa({ nome: 'Carlos Mendes', documento: '318.402.117-50', telefone: 'x' })
    expect(p.linhas[0]!.selo).toBe('Telefone inválido')
    const ausentes = p.ausentes.map((a) => a.id)
    expect(ausentes).not.toContain('p1')
    expect(ausentes).toContain('p2')
  })
})

describe('mapearTabela', () => {
  const tabela = (...linhas: (Celula[] | null | undefined)[]) => linhas

  it('usa a primeira linha como cabeçalho e reconhece os aliases', () => {
    const [linha] = mapearTabela(
      tabela(
        [
          'Nome',
          'CNPJ',
          'Celular',
          'E-mail',
          'Região',
          'Serviços',
          'Situação',
          'Credenciado desde',
        ],
        [
          ' Ana ',
          '27.415.903/0001-44',
          '(11) 97120-5588',
          'a@b.com',
          'Sul',
          'Pintura',
          'Inativo',
          '03/06/2024',
        ],
      ),
    )
    expect(linha).toEqual({
      nome: 'Ana',
      documento: '27.415.903/0001-44',
      telefone: '(11) 97120-5588',
      email: 'a@b.com',
      regiao: 'Sul',
      especialidades: 'Pintura',
      status: 'Inativo',
      credenciadoDesde: '03/06/2024',
    })
  })

  it('não reconhece "Nome completo" nem "Fone"', () => {
    const linhas = mapearTabela(tabela(['Nome completo', 'Fone', 'CPF'], ['Ana', '11', '1']))
    expect(linhas).toEqual([lida({ documento: '1', telefone: '' })])
  })

  it('pula linhas vazias e as que só têm colunas desconhecidas', () => {
    const linhas = mapearTabela(
      tabela(['Nome', 'Obs'], null, ['', 'nota'], ['Ana', ''], undefined, ['  ', '']),
    )
    expect(linhas.map((l) => l.nome)).toEqual(['Ana'])
  })

  it('colunas do mesmo campo: vale o primeiro valor não vazio', () => {
    const [linha] = mapearTabela(
      tabela(['Nome', 'CPF', 'CNPJ', 'Nome_1'], ['Ana', '', '27415903000144', 'Outra']),
    )
    expect(linha).toMatchObject({ nome: 'Ana', documento: '27415903000144' })
  })

  it('números e booleanos viram texto', () => {
    const [linha] = mapearTabela(tabela(['Nome', 'CPF', 'Status'], ['Ana', 31840211750, true]))
    expect(linha).toMatchObject({ documento: '31840211750', status: 'true' })
  })

  it('documento que o Excel guardou como número volta a ter os zeros à esquerda', () => {
    const linhas = mapearTabela(
      tabela(
        ['Nome', 'CPF/CNPJ', 'Telefone'],
        ['CPF', 1234567890, 1134567890],
        ['CNPJ', 1234567000189, 11912345678],
        ['Texto', '0123', ''],
      ),
    )
    expect(linhas.map((l) => [l.documento, l.telefone])).toEqual([
      ['01234567890', '1134567890'],
      ['01234567000189', '11912345678'],
      ['0123', ''],
    ])
  })

  it('linha de título acima: o cabeçalho é a primeira linha com dois cabeçalhos reconhecidos', () => {
    const linhas = mapearTabela(
      tabela(
        ['Credenciados Russo — setembro de 2026'],
        ['Status', 'atualizado em 29/09'],
        ['Nome', 'CPF/CNPJ', 'Obs'],
        ['Ana', '52998224725', 'x'],
      ),
    )
    expect(linhas).toEqual([lida({ nome: 'Ana', documento: '52998224725', telefone: '' })])
  })

  it('sem linha com dois cabeçalhos reconhecidos, vale a primeira linha preenchida', () => {
    const linhas = mapearTabela(
      tabela(['Obs', 'Nome'], ['x', 'Ana'], ['Nome', 'Obs'], ['y', 'Bia']),
    )
    expect(linhas.map((l) => l.nome)).toEqual(['Ana', 'Obs', 'Bia'])
  })

  it('linhas nulas antes do cabeçalho são ignoradas', () => {
    const linhas = mapearTabela(tabela(null, undefined, ['Nome'], ['Ana']))
    expect(linhas.map((l) => l.nome)).toEqual(['Ana'])
  })

  it('sem linha aproveitável: "Não encontramos linhas na planilha"', () => {
    for (const t of [tabela(), tabela(['Nome', 'CPF']), tabela(['Foo'], ['bar'])]) {
      expect(erroDe(() => mapearTabela(t))).toMatchObject({
        codigo: 'planilha_vazia',
        message: 'Não encontramos linhas na planilha',
        status: 422,
      })
    }
  })

  it(`aceita até ${LIMITE_LINHAS} linhas`, () => {
    const cheia = [['Nome'], ...Array.from({ length: LIMITE_LINHAS }, (_, i) => [`P${i}`])]
    expect(mapearTabela(cheia)).toHaveLength(LIMITE_LINHAS)
    expect(erroDe(() => mapearTabela([...cheia, ['Mais um']]))).toMatchObject({
      codigo: 'planilha_muitas_linhas',
      message: 'A planilha passa de 2000 linhas',
      status: 422,
    })
  })
})

describe('dataDaPlanilha', () => {
  it('aceita DD/MM/AAAA, D/M/AAAA e AAAA-MM-DD', () => {
    expect(dataDaPlanilha('12/03/2024')).toBe('2024-03-12')
    expect(dataDaPlanilha('3/1/2024')).toBe('2024-01-03')
    expect(dataDaPlanilha('2024-03-12')).toBe('2024-03-12')
  })
  it('recusa dia inexistente, texto e vazio', () => {
    for (const texto of ['31/02/2024', '2024-13-01', '12/03/24', 'abc', '', '00/01/2024']) {
      expect(dataDaPlanilha(texto)).toBeNull()
    }
  })
  it('só entre 1900 e 2100', () => {
    expect(dataDaPlanilha('01/01/1899')).toBeNull()
    expect(dataDaPlanilha('01/01/2101')).toBeNull()
  })
})

describe('montarPrevia', () => {
  it('Novo, Atualizar e os erros na ordem do protótipo', () => {
    expect(
      selos(
        { nome: '', documento: '529.982.247-25' },
        { nome: 'Curto', documento: '123' },
        { nome: 'Carlos', documento: '318.402.117-50' },
        { nome: 'Carlos de novo', documento: '31840211750' },
        { nome: 'Pedro', documento: '529.982.247-25' },
      ),
    ).toEqual(['Sem nome', 'Documento inválido', 'Atualizar', 'Duplicado na planilha', 'Novo'])
  })

  it('dígito verificador só nas linhas novas (os documentos do seed não passam)', () => {
    expect(
      selos(
        { nome: 'Pedro', documento: '529.982.247-26' },
        { nome: 'Repetidos', documento: '000.000.000-00' },
        { nome: 'Ana', documento: '27.415.903/0001-44' },
      ),
    ).toEqual(['Documento inválido', 'Documento inválido', 'Atualizar'])
  })

  it('telefone com DDD (10 ou 11 dígitos), depois das regras do documento', () => {
    expect(
      selos(
        { nome: 'Pedro', documento: '52998224725', telefone: '9123-4567' },
        { nome: 'Sem telefone', documento: '11144477735', telefone: '' },
        { nome: 'Fixo', documento: '11222333000181', telefone: '(11) 3456-7890' },
        { nome: 'Curto e sem telefone', documento: '1', telefone: '' },
      ),
    ).toEqual(['Telefone inválido', 'Telefone inválido', 'Novo', 'Documento inválido'])
  })

  it('e-mail preenchido que não é um endereço, depois do telefone', () => {
    expect(
      selos(
        { nome: 'Pedro', documento: '52998224725', email: 'pedro@x.com; ana@y.com' },
        { nome: 'Ana', documento: '11144477735', email: '' },
        { nome: 'Sem telefone', documento: '11222333000181', telefone: '', email: 'x' },
      ),
    ).toEqual(['E-mail inválido', 'Novo', 'Telefone inválido'])
  })

  it('só linha válida conta como vista: a primeira válida vence', () => {
    expect(
      selos(
        { nome: 'Pedro', documento: '52998224725', telefone: '' },
        { nome: 'Pedro', documento: '529.982.247-25' },
        { nome: 'Pedro', documento: '529.982.247-25' },
      ),
    ).toEqual(['Telefone inválido', 'Novo', 'Duplicado na planilha'])
  })

  it('inativo também casa como Atualizar', () => {
    expect(selos({ nome: 'Roberto', documento: '219.774.380-12' })).toEqual(['Atualizar'])
  })

  it('mostra nome, documento e especialidades crus, com a ação', () => {
    const { linhas } = previa({
      nome: 'Pedro',
      documento: '529.982.247-25',
      especialidades: 'limpeza de ar condicionado; Jardinagem/Pintura, pintura',
    })
    expect(linhas).toEqual([
      {
        nome: 'Pedro',
        documento: '529.982.247-25',
        especialidades: ['limpeza de ar condicionado', 'Jardinagem', 'Pintura', 'pintura'],
        especialidadesIgnoradas: ['Jardinagem'],
        acao: 'novo',
        selo: 'Novo',
      },
    ])
  })

  it('especialidades que não casam com um tipo ativo ficam marcadas como ignoradas', () => {
    const { linhas } = previa(
      { nome: 'Pedro', documento: '52998224725', especialidades: 'Vazamneto; vazamento; Elétrica' },
      { nome: '', documento: '1', especialidades: 'Jardinagem' },
      { nome: 'Carlos', documento: '31840211750', especialidades: '' },
    )
    expect(linhas.map((l) => l.especialidadesIgnoradas)).toEqual([
      ['Vazamneto', 'Elétrica'],
      ['Jardinagem'],
      [],
    ])
  })

  it('conta os novos com e-mail (entram sem convite)', () => {
    const p = previa(
      { nome: 'Pedro', documento: '52998224725', email: 'pedro@x.com' },
      { nome: 'Ana', documento: '11144477735', email: ' ' },
      { nome: 'Carlos', documento: '31840211750', email: 'carlos@x.com' },
      { nome: '', documento: '11222333000181', email: 'sem.nome@x.com' },
      { nome: 'Bia', documento: '11222333000181', email: 'bia@x.com' },
    )
    expect(p.linhas.map((l) => l.selo)).toEqual(['Novo', 'Novo', 'Atualizar', 'Sem nome', 'Novo'])
    expect(p.novosComEmail).toBe(2)
    expect(previa({ nome: 'Ana', documento: '11144477735' }).novosComEmail).toBe(0)
  })

  it('resumo e ausentes (ativos cujo documento não aparece em NENHUMA linha, na ordem de cadastro)', () => {
    const p = previa(
      { nome: 'Ana', documento: '27415903000144' },
      // Linhas rejeitadas ainda protegem o prestador: o documento apareceu na planilha.
      { nome: 'Carlos sem telefone', documento: '31840211750', telefone: '' },
      { nome: 'Pedro', documento: '52998224725' },
      { nome: '', documento: '41206557000190' },
    )
    expect(p.resumo).toEqual({ novos: 1, atualizados: 1, erros: 2 })
    expect(p.ausentes).toEqual([])
    const soAna = previa({ nome: 'Ana', documento: '27415903000144' })
    expect(soAna.ausentes).toEqual([
      { id: 'p1', nome: 'Carlos Mendes' },
      { id: 'p6', nome: 'Luciana Prado' },
    ])
  })

  it('gravações normalizadas: dígitos, vazios como null, tipos reconhecidos sem repetição', () => {
    const p = previa(
      {
        nome: 'Pedro',
        documento: '529.982.247-25',
        telefone: '(11) 91234-5678',
        email: '',
        regiao: 'Centro',
        especialidades: 'limpeza de ar condicionado; Jardinagem/Pintura, pintura',
        status: 'Inativa',
        credenciadoDesde: '12/03/2024',
      },
      { nome: 'Carlos', documento: '318.402.117-50', status: 'Desativado', credenciadoDesde: 'x' },
      { nome: 'Sem nome', documento: '' },
    )
    expect(p.gravacoes).toEqual([
      {
        acao: 'novo',
        dados: {
          nome: 'Pedro',
          documento: '52998224725',
          telefone: '11912345678',
          email: null,
          regiao: 'Centro',
          especialidades: ['t7', 't5'],
          status: 'inativo',
          credenciadoDesde: '2024-03-12',
        },
      },
      {
        acao: 'atualizar',
        id: 'p1',
        dados: {
          nome: 'Carlos',
          documento: '31840211750',
          telefone: '11912345678',
          email: null,
          regiao: null,
          especialidades: [],
          status: 'ativo',
          credenciadoDesde: null,
        },
      },
    ])
  })

  it('status: o que começa com "inativ" é inativo; vazio e o resto são ativo', () => {
    const status = (s: string) =>
      previa({ nome: 'P', documento: '52998224725', status: s }).gravacoes[0]!.dados.status
    expect(['Inativo', 'INATIVA', ' inativado'].map(status)).toEqual([
      'inativo',
      'inativo',
      'inativo',
    ])
    expect(['', 'Ativo', 'Desativado', 'Não'].map(status)).toEqual([
      'ativo',
      'ativo',
      'ativo',
      'ativo',
    ])
  })
})

describe('exportação', () => {
  it('uma linha por prestador, formatada e só com texto', () => {
    expect(
      linhasDeExportacao([
        {
          nome: 'Carlos Mendes',
          documento: '31840211750',
          telefone: '11987342210',
          email: 'carlos@x.com',
          regiao: 'Zona Oeste',
          especialidades: ['Vazamento', 'Pintura'],
          status: 'ativo',
          credenciadoDesde: '2024-03-12',
        },
        {
          nome: 'Luciana Prado',
          documento: '41206557000190',
          telefone: '1134567890',
          email: null,
          regiao: null,
          especialidades: [],
          status: 'inativo',
          credenciadoDesde: '2026-08-27',
        },
      ]),
    ).toEqual([
      [
        'Carlos Mendes',
        '318.402.117-50',
        '(11) 98734-2210',
        'carlos@x.com',
        'Zona Oeste',
        'Vazamento; Pintura',
        'Ativo',
        '12/03/2024',
      ],
      [
        'Luciana Prado',
        '41.206.557/0001-90',
        '(11) 3456-7890',
        '',
        '',
        '',
        'Inativo',
        '27/08/2026',
      ],
    ])
  })

  it('cabeçalho e linha do modelo do protótipo', () => {
    expect(CABECALHO_PLANILHA).toEqual([
      'Nome',
      'CPF/CNPJ',
      'Telefone',
      'E-mail',
      'Região',
      'Especialidades',
      'Status',
      'Credenciado desde',
    ])
    expect(LINHA_MODELO).toEqual([
      'Nome Sobrenome',
      '000.000.000-00',
      '(11) 90000-0000',
      'email@exemplo.com',
      'Zona Oeste',
      'Vazamento; Pintura',
      'Ativo',
      '',
    ])
  })

  it('nome do arquivo com a data de hoje', () => {
    expect(nomeDaExportacao('2026-09-29')).toBe('credenciados-russo-29-09-2026.xlsx')
  })

  it('formatos de documento e telefone (o que não tem o tamanho certo fica como está)', () => {
    expect(formatarDocumento('52998224725')).toBe('529.982.247-25')
    expect(formatarDocumento('11222333000181')).toBe('11.222.333/0001-81')
    expect(formatarDocumento('123')).toBe('123')
    expect(formatarTelefone('11912345678')).toBe('(11) 91234-5678')
    expect(formatarTelefone('1134567890')).toBe('(11) 3456-7890')
    expect(formatarTelefone('')).toBe('')
  })
})
