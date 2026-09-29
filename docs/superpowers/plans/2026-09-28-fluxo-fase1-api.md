# Fluxo principal · Fase 1 (API, domínio e fotos) — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar a API completa do ciclo de acionamentos: regras de domínio, rotas REST com OpenAPI, fotos em disco local servidas por URL assinada e dados do Início do prestador.

**Architecture:**
- **Domínio:** as regras de negócio são funções puras em `apps/api/src/dominio`.
- **Serviços:** `apps/api/src/servicos/acionamentos.ts` aplica as regras com Prisma. Cada ação trava a linha do acionamento (`SELECT … FOR UPDATE`) dentro da transação e grava o `EventoAcionamento`.
- **Rotas:** ficam finas (validação zod → serviço → serialização).
- **Arquivos:** passam pela interface `Armazenamento`, com implementação em disco nesta fase. A leitura usa uma URL assinada com HMAC.

**Tech Stack:** Hono + @hono/zod-openapi, zod 4, Prisma 7.10, Better Auth (sessão já existente), node:crypto, node:fs.

**Spec:** [`docs/superpowers/specs/2026-09-28-fluxo-principal-design.md`](../specs/2026-09-28-fluxo-principal-design.md)

## Global Constraints

- Transições só a partir dos status da tabela do spec.
  - Status fora da tabela: **409 `transicao_invalida`**.
  - Pré-condição não atendida: **422**, com os códigos `fotos_insuficientes`, `etapas_pendentes`, `motivo_obrigatorio`, `prestador_inativo`, `tipo_invalido`, `horario_invalido` ou `campo_obrigatorio`.
- Visibilidade e permissões:
  - O prestador só vê os próprios acionamentos. Acionamento de outro prestador responde **404**, e o prestador sem vínculo não vê nada.
  - Papel errado responde **403**. Sem sessão responde **401**.
- Textos exatos do protótipo:
  - "Adicione N foto(s) da conclusão para enviar"
  - "Conclua todas as etapas para enviar"
  - "Escreva o motivo da reprovação"
- Fotos:
  - Aceita JPEG, PNG, WebP e HEIC, conferidos pelos primeiros bytes do arquivo. Até 10 MB (**413 `arquivo_grande`**); tipo inválido é **415 `tipo_arquivo_invalido`**.
  - URL assinada (HMAC-SHA256 derivado do `BETTER_AUTH_SECRET`), válida por pelo menos 1 hora.
- Datas `YYYY-MM-DD` e horários `HH:MM` no fuso `America/Sao_Paulo`.
- Nomes de domínio em português. Erros sempre no formato `{ erro: { codigo, mensagem } }`.
- Commits com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Duas ações simultâneas no mesmo acionamento** (duplo toque em "Iniciar" ou "Enviar"): só uma aplica, a outra recebe 409. Teste na Task 5.
2. **URL de foto adulterada, expirada ou de outra foto:** 403, sem vazar o arquivo. Testes nas Tasks 2 e 5.
3. **Foto de etapa apontando para etapa de outro acionamento:** 404, e nada é gravado. Teste na Task 5.
4. **Reprovar uma inviabilidade:** as fotos e o motivo somem e o arquivo é apagado do disco. Teste na Task 4.
5. **Checklist do tipo editado depois da criação:** o acionamento existente mantém a cópia antiga. Teste na Task 4.

---

## Mapa de arquivos

```
apps/api/src/
  dominio/acionamento.ts        regras de transição, validações, ErroDominio
  dominio/datas.ts              dataSP, horarioSP
  dominio/inicio-prestador.ts   calcularInicio (próximo, hoje, métricas, rota)
  arquivos/imagem.ts            detectarTipoImagem, TAMANHO_MAXIMO_FOTO, mimeDaChave
  arquivos/armazenamento.ts     interface Armazenamento + ArmazenamentoDisco
  arquivos/assinatura.ts        caminhoAssinadoFoto, assinaturaValida
  arquivos/index.ts             instância `armazenamento`
  servicos/serializacao.ts      includes Prisma + paraResumo/paraDetalhe/paraFoto
  servicos/acionamentos.ts      casos de uso (listar, detalhar, criar, transições, fotos, início)
  schemas.ts                    schemas zod/OpenAPI de entrada e saída
  rotas/catalogo.ts             GET /api/tipos, GET /api/prestadores
  rotas/acionamentos.ts         (existente) + lista, detalhe, criação, revisão
  rotas/execucao.ts             ações do prestador (iniciar, etapas, conclusão, fotos, enviar, inviável)
  rotas/arquivos.ts             GET /api/arquivos/fotos/:id (assinado)
  rotas/prestador.ts            GET /api/prestador/inicio
  erros.ts                      + ErroHttp, naoEncontrado
  env.ts                        + ARQUIVOS_DIR
  app.ts                        monta as rotas novas; onError trata ErroDominio/ErroHttp
apps/api/test/dados.ts          helpers: loginDePrestador, JPEG, formularioFoto, criarAcionamento, hojeSP
```

---

### Task 1: Domínio — transições, validações, datas e Início

**Files:**
- Create: `apps/api/src/dominio/{acionamento.ts,datas.ts,inicio-prestador.ts}`
- Test: `apps/api/src/dominio/{acionamento.test.ts,datas.test.ts,inicio-prestador.test.ts}`

**Interfaces:**
- Produces:
  - Tipos `StatusAcionamento`, `Decisao` e `Regras { photoMin, requireAllSteps }`.
  - `class ErroDominio { codigo, status: 409 | 422, message }`.
  - `ORIGENS` e `exigirStatus(acao, status)`, com `acao` em `'iniciar' | 'editar' | 'enviar' | 'marcarInviavel' | 'revisar'`.
  - `verificarEnvio({ status, fotosConclusao, etapas, regras })`.
  - `verificarInviabilidade({ status, comentario, fotos }): string`, que devolve o comentário aparado.
  - `verificarRevisao({ status, decisao, motivo }): string | null`.
  - `normalizarNovoAcionamento(dados): DadosNovoAcionamento`.
  - `dataSP(d): 'YYYY-MM-DD'` e `horarioSP(d): 'HH:MM'`.
  - `calcularInicio(itens: ItemAgenda[], hoje) → { proximoId, hojeIds, metricas, rotaDoDia }`.

- [ ] **Step 1: Testes (falham)**

`apps/api/src/dominio/acionamento.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import {
  exigirStatus,
  normalizarNovoAcionamento,
  verificarEnvio,
  verificarInviabilidade,
  verificarRevisao,
  type StatusAcionamento,
} from './acionamento'

function erroDe(fn: () => unknown): unknown {
  try {
    fn()
  } catch (erro) {
    return erro
  }
  throw new Error('a função não lançou erro')
}

const TODOS: StatusAcionamento[] = ['aberto', 'em_andamento', 'aguardando', 'reprovado', 'aprovado']
const regras = { photoMin: 1, requireAllSteps: false }

describe('exigirStatus', () => {
  it.each([
    ['iniciar', ['aberto']],
    ['editar', ['em_andamento', 'reprovado']],
    ['enviar', ['em_andamento', 'reprovado']],
    ['marcarInviavel', ['aberto', 'em_andamento', 'reprovado']],
    ['revisar', ['aguardando']],
  ] as const)('%s só é permitido em %j', (acao, permitidos) => {
    for (const status of TODOS) {
      if ((permitidos as readonly string[]).includes(status)) {
        expect(() => exigirStatus(acao, status)).not.toThrow()
      } else {
        expect(erroDe(() => exigirStatus(acao, status))).toMatchObject({
          codigo: 'transicao_invalida',
          status: 409,
        })
      }
    }
  })
})

describe('verificarEnvio', () => {
  const base = { status: 'em_andamento' as const, fotosConclusao: 1, etapas: [{ feita: false }], regras }

  it('libera com a foto mínima, mesmo com etapas pendentes (requireAllSteps desligado)', () => {
    expect(() => verificarEnvio(base)).not.toThrow()
  })
  it('pede a foto que falta com o texto do protótipo', () => {
    expect(erroDe(() => verificarEnvio({ ...base, fotosConclusao: 0 }))).toMatchObject({
      codigo: 'fotos_insuficientes',
      status: 422,
      message: 'Adicione 1 foto da conclusão para enviar',
    })
    expect(
      erroDe(() => verificarEnvio({ ...base, fotosConclusao: 1, regras: { ...regras, photoMin: 3 } })),
    ).toMatchObject({ message: 'Adicione 2 fotos da conclusão para enviar' })
  })
  it('exige todas as etapas quando requireAllSteps está ligado', () => {
    expect(
      erroDe(() => verificarEnvio({ ...base, regras: { photoMin: 1, requireAllSteps: true } })),
    ).toMatchObject({ codigo: 'etapas_pendentes', message: 'Conclua todas as etapas para enviar' })
  })
  it('confere o status antes das fotos', () => {
    expect(erroDe(() => verificarEnvio({ ...base, status: 'aberto', fotosConclusao: 0 }))).toMatchObject({
      codigo: 'transicao_invalida',
    })
  })
})

describe('verificarInviabilidade', () => {
  it('devolve o motivo aparado', () => {
    expect(verificarInviabilidade({ status: 'aberto', comentario: '  Laje protendida  ', fotos: 1 })).toBe(
      'Laje protendida',
    )
  })
  it('exige motivo e pelo menos uma foto', () => {
    expect(erroDe(() => verificarInviabilidade({ status: 'aberto', comentario: '  ', fotos: 1 }))).toMatchObject({
      codigo: 'motivo_obrigatorio',
    })
    expect(erroDe(() => verificarInviabilidade({ status: 'aberto', comentario: 'x', fotos: 0 }))).toMatchObject({
      codigo: 'fotos_insuficientes',
    })
  })
  it('não vale para quem já está aguardando', () => {
    expect(erroDe(() => verificarInviabilidade({ status: 'aguardando', comentario: 'x', fotos: 1 }))).toMatchObject({
      codigo: 'transicao_invalida',
    })
  })
})

describe('verificarRevisao', () => {
  it('aprovar dispensa motivo', () => {
    expect(verificarRevisao({ status: 'aguardando', decisao: 'aprovado', motivo: '' })).toBeNull()
  })
  it('reprovar exige motivo, com o texto do protótipo', () => {
    expect(erroDe(() => verificarRevisao({ status: 'aguardando', decisao: 'reprovado', motivo: ' ' }))).toMatchObject({
      codigo: 'motivo_obrigatorio',
      message: 'Escreva o motivo da reprovação',
    })
    expect(verificarRevisao({ status: 'aguardando', decisao: 'reprovado', motivo: ' Foto escura ' })).toBe('Foto escura')
  })
  it('só revisa o que está aguardando', () => {
    expect(erroDe(() => verificarRevisao({ status: 'aprovado', decisao: 'aprovado' }))).toMatchObject({
      codigo: 'transicao_invalida',
    })
  })
})

describe('normalizarNovoAcionamento', () => {
  const dados = {
    titulo: ' Vazamento ',
    cliente: ' Edifício Aurora ',
    endereco: ' Rua Harmonia, 410 · Vila Madalena ',
    data: '2026-09-28',
    inicio: '09:00',
    fim: '11:00',
    tipoIds: ['t1', 't1', 't6'],
    prestadorId: 'p1',
  }

  it('apara textos e remove tipos repetidos, mantendo a ordem', () => {
    expect(normalizarNovoAcionamento(dados)).toMatchObject({
      titulo: 'Vazamento',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      tipoIds: ['t1', 't6'],
    })
  })
  it.each([
    ['titulo', 'Informe o título'],
    ['cliente', 'Informe o cliente'],
    ['endereco', 'Informe o endereço'],
  ] as const)('exige %s', (campo, mensagem) => {
    expect(erroDe(() => normalizarNovoAcionamento({ ...dados, [campo]: '   ' }))).toMatchObject({
      codigo: 'campo_obrigatorio',
      message: mensagem,
    })
  })
  it('exige ao menos um tipo', () => {
    expect(erroDe(() => normalizarNovoAcionamento({ ...dados, tipoIds: [] }))).toMatchObject({ codigo: 'tipo_invalido' })
  })
  it('exige início antes do fim', () => {
    expect(erroDe(() => normalizarNovoAcionamento({ ...dados, inicio: '11:00', fim: '11:00' }))).toMatchObject({
      codigo: 'horario_invalido',
    })
  })
})
```

`apps/api/src/dominio/datas.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { dataSP, horarioSP } from './datas'

describe('datas em São Paulo', () => {
  it('usa o dia de São Paulo mesmo quando em UTC já é o dia seguinte', () => {
    expect(dataSP(new Date('2026-09-29T01:30:00Z'))).toBe('2026-09-28')
  })
  it('formata o horário local', () => {
    expect(horarioSP(new Date('2026-09-28T13:05:00Z'))).toBe('10:05')
    expect(horarioSP(new Date('2026-09-28T03:00:00Z'))).toBe('00:00')
  })
})
```

`apps/api/src/dominio/inicio-prestador.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { calcularInicio, type ItemAgenda } from './inicio-prestador'

const item = (p: Partial<ItemAgenda> & Pick<ItemAgenda, 'id'>): ItemAgenda => ({
  data: '2026-09-28',
  inicio: '09:00',
  status: 'aberto',
  inviavel: false,
  endereco: `Endereço ${p.id}`,
  revisoes: [],
  ...p,
})

describe('calcularInicio', () => {
  it('o próximo é o que está em execução, mesmo que outro seja mais cedo', () => {
    const r = calcularInicio(
      [item({ id: 'a', inicio: '08:00' }), item({ id: 'b', inicio: '10:00', status: 'em_andamento' })],
      '2026-09-28',
    )
    expect(r.proximoId).toBe('b')
  })

  it('sem execução, é o primeiro agendado de hoje em diante (ignora os atrasados)', () => {
    const r = calcularInicio(
      [
        item({ id: 'ontem', data: '2026-09-27' }),
        item({ id: 'amanha', data: '2026-09-29', inicio: '07:00' }),
        item({ id: 'hoje-tarde', inicio: '15:00' }),
        item({ id: 'hoje-cedo', inicio: '10:30' }),
      ],
      '2026-09-28',
    )
    expect(r.proximoId).toBe('hoje-cedo')
  })

  it('lista os de hoje em ordem de horário e monta a rota só com os pendentes', () => {
    const r = calcularInicio(
      [
        item({ id: 'b', inicio: '10:30' }),
        item({ id: 'a', inicio: '07:30', status: 'aguardando' }),
        item({ id: 'c', inicio: '15:00', status: 'em_andamento' }),
      ],
      '2026-09-28',
    )
    expect(r.hojeIds).toEqual(['a', 'b', 'c'])
    expect(r.rotaDoDia).toEqual(['Endereço b', 'Endereço c'])
    expect(r.metricas.hoje).toBe(3)
  })

  it('calcula as métricas como o protótipo', () => {
    const r = calcularInicio(
      [
        item({ id: '1', data: '2026-09-10', status: 'aprovado', revisoes: ['aprovado'] }),
        item({ id: '2', data: '2026-09-11', status: 'aprovado', revisoes: ['reprovado', 'aprovado'] }),
        item({ id: '3', data: '2026-09-12', status: 'aprovado', inviavel: true, revisoes: ['aprovado'] }),
        item({ id: '4', data: '2026-08-30', status: 'aprovado', revisoes: ['aprovado'] }),
        item({ id: '5', data: '2026-09-27', status: 'reprovado', revisoes: ['reprovado'] }),
      ],
      '2026-09-28',
    )
    expect(r.metricas.noMes).toBe(2)
    expect(r.metricas.aprovacao).toEqual({ taxa: 67, dePrimeira: 60 })
    expect(r.metricas.paraCorrigir).toBe(1)
  })

  it('sem revisões, a aprovação de primeira fica indefinida', () => {
    expect(calcularInicio([item({ id: 'x' })], '2026-09-28').metricas.aprovacao).toEqual({
      taxa: 0,
      dePrimeira: null,
    })
  })
})
```

Nas métricas: 4 aprovações em 6 revisões dá 67 %. Dos 5 acionamentos revisados, 3 foram aprovados de primeira, ou seja, 60 %.

Run: `pnpm --filter @kgb/api exec vitest run src/dominio`
Expected: FAIL com "Cannot find module".

- [ ] **Step 2: Implementação**

`apps/api/src/dominio/acionamento.ts`:
```ts
export type StatusAcionamento = 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'aprovado'
export type Decisao = 'aprovado' | 'reprovado'

export interface Regras {
  photoMin: number
  requireAllSteps: boolean
}

export type CodigoErroDominio =
  | 'transicao_invalida'
  | 'fotos_insuficientes'
  | 'etapas_pendentes'
  | 'motivo_obrigatorio'
  | 'prestador_inativo'
  | 'tipo_invalido'
  | 'horario_invalido'
  | 'campo_obrigatorio'

export class ErroDominio extends Error {
  constructor(
    readonly codigo: CodigoErroDominio,
    mensagem: string,
    readonly status: 409 | 422 = 422,
  ) {
    super(mensagem)
    this.name = 'ErroDominio'
  }
}

/** Status de origem permitidos para cada ação (docs/design/README.md → Regras de negócio). */
export const ORIGENS = {
  iniciar: ['aberto'],
  editar: ['em_andamento', 'reprovado'],
  enviar: ['em_andamento', 'reprovado'],
  marcarInviavel: ['aberto', 'em_andamento', 'reprovado'],
  revisar: ['aguardando'],
} as const satisfies Record<string, readonly StatusAcionamento[]>

export type Acao = keyof typeof ORIGENS

const MENSAGENS_TRANSICAO: Record<Acao, string> = {
  iniciar: 'Este atendimento já foi iniciado.',
  editar: 'Só é possível alterar etapas e fotos com o atendimento em execução ou reprovado.',
  enviar: 'Este acionamento não pode ser enviado para aprovação agora.',
  marcarInviavel: 'Este acionamento não pode ser marcado como inviável agora.',
  revisar: 'Este acionamento não está aguardando aprovação.',
}

export function exigirStatus(acao: Acao, status: StatusAcionamento): void {
  if (!(ORIGENS[acao] as readonly StatusAcionamento[]).includes(status)) {
    throw new ErroDominio('transicao_invalida', MENSAGENS_TRANSICAO[acao], 409)
  }
}

export function verificarEnvio(p: {
  status: StatusAcionamento
  fotosConclusao: number
  etapas: readonly { feita: boolean }[]
  regras: Regras
}): void {
  exigirStatus('enviar', p.status)
  const faltam = p.regras.photoMin - p.fotosConclusao
  if (faltam > 0) {
    throw new ErroDominio(
      'fotos_insuficientes',
      `Adicione ${faltam} ${faltam > 1 ? 'fotos' : 'foto'} da conclusão para enviar`,
    )
  }
  if (p.regras.requireAllSteps && p.etapas.some((e) => !e.feita)) {
    throw new ErroDominio('etapas_pendentes', 'Conclua todas as etapas para enviar')
  }
}

export function verificarInviabilidade(p: {
  status: StatusAcionamento
  comentario: string
  fotos: number
}): string {
  exigirStatus('marcarInviavel', p.status)
  const comentario = p.comentario.trim()
  if (!comentario) throw new ErroDominio('motivo_obrigatorio', 'Explique o motivo da inviabilidade')
  if (p.fotos < 1) throw new ErroDominio('fotos_insuficientes', 'Registre pelo menos 1 foto')
  return comentario
}

export function verificarRevisao(p: {
  status: StatusAcionamento
  decisao: Decisao
  motivo?: string | null
}): string | null {
  exigirStatus('revisar', p.status)
  const motivo = p.motivo?.trim() || null
  if (p.decisao === 'reprovado' && !motivo) {
    throw new ErroDominio('motivo_obrigatorio', 'Escreva o motivo da reprovação')
  }
  return motivo
}

export interface DadosNovoAcionamento {
  titulo: string
  cliente: string
  endereco: string
  data: string
  inicio: string
  fim: string
  tipoIds: string[]
  prestadorId: string
}

export function normalizarNovoAcionamento(d: DadosNovoAcionamento): DadosNovoAcionamento {
  const texto = (valor: string, nome: string) => {
    const aparado = valor.trim()
    if (!aparado) throw new ErroDominio('campo_obrigatorio', `Informe ${nome}`)
    return aparado
  }
  const titulo = texto(d.titulo, 'o título')
  const cliente = texto(d.cliente, 'o cliente')
  const endereco = texto(d.endereco, 'o endereço')
  if (d.tipoIds.length === 0) {
    throw new ErroDominio('tipo_invalido', 'Escolha pelo menos um tipo de demanda')
  }
  if (!(d.inicio < d.fim)) throw new ErroDominio('horario_invalido', 'O início precisa ser antes do fim')
  return { ...d, titulo, cliente, endereco, tipoIds: [...new Set(d.tipoIds)] }
}
```

`apps/api/src/dominio/datas.ts`:
```ts
export const FUSO = 'America/Sao_Paulo'

const formatoData = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "YYYY-MM-DD" no fuso de São Paulo. */
export function dataSP(d: Date): string {
  return formatoData.format(d)
}

/** "HH:MM" no fuso de São Paulo. */
export function horarioSP(d: Date): string {
  return formatoHora.format(d)
}
```

`apps/api/src/dominio/inicio-prestador.ts`:
```ts
import type { Decisao, StatusAcionamento } from './acionamento'

export interface ItemAgenda {
  id: string
  data: string
  inicio: string
  status: StatusAcionamento
  inviavel: boolean
  endereco: string
  /** Decisões das revisões, em ordem cronológica. */
  revisoes: Decisao[]
}

export interface MetricasInicio {
  hoje: number
  noMes: number
  aprovacao: { taxa: number; dePrimeira: number | null }
  paraCorrigir: number
}

/** Regras do Início do prestador, iguais às de `vPro` no protótipo. */
export function calcularInicio(itens: readonly ItemAgenda[], hoje: string) {
  const ordenados = [...itens].sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio))
  const proximo =
    ordenados.find((a) => a.status === 'em_andamento') ??
    ordenados.find((a) => a.status === 'aberto' && a.data >= hoje) ??
    null
  const deHoje = ordenados.filter((a) => a.data === hoje)
  const mes = hoje.slice(0, 7)
  const revisoes = ordenados.flatMap((a) => a.revisoes)
  const aprovadas = revisoes.filter((r) => r === 'aprovado').length
  const revisados = ordenados.filter((a) => a.revisoes.length > 0)
  const metricas: MetricasInicio = {
    hoje: deHoje.length,
    noMes: ordenados.filter((a) => a.data.startsWith(mes) && a.status === 'aprovado' && !a.inviavel).length,
    aprovacao: {
      taxa: revisoes.length ? Math.round((aprovadas / revisoes.length) * 100) : 0,
      dePrimeira: revisados.length
        ? Math.round((revisados.filter((a) => a.revisoes[0] === 'aprovado').length / revisados.length) * 100)
        : null,
    },
    paraCorrigir: ordenados.filter((a) => a.status === 'reprovado').length,
  }
  return {
    proximoId: proximo?.id ?? null,
    hojeIds: deHoje.map((a) => a.id),
    metricas,
    rotaDoDia: deHoje.filter((a) => a.status === 'aberto' || a.status === 'em_andamento').map((a) => a.endereco),
  }
}
```

- [ ] **Step 3: Rodar**

Run: `pnpm --filter @kgb/api exec vitest run src/dominio`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/dominio
git commit -m "feat(api): regras de domínio do acionamento (transições, validações, início)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Arquivos — tipo de imagem, armazenamento em disco e URL assinada

**Files:**
- Create: `apps/api/src/arquivos/{imagem.ts,armazenamento.ts,assinatura.ts,index.ts}`
- Modify: `apps/api/src/env.ts` (`ARQUIVOS_DIR`), `apps/api/vitest.config.ts` (`ARQUIVOS_DIR` temporário), `.gitignore` (`var/`), `.env.example`
- Test: `apps/api/src/arquivos/{imagem.test.ts,armazenamento.test.ts,assinatura.test.ts}`

**Interfaces:**
- Produces:
  - `TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024`.
  - `detectarTipoImagem(bytes): { mime, extensao } | null` e `mimeDaChave(chave): string`.
  - `interface Armazenamento { salvar(chave, dados, tipo), abrir(chave): Promise<Uint8Array | null>, remover(chave) }` e `class ArmazenamentoDisco(pasta)`.
  - `armazenamento`: a instância configurada com `env.ARQUIVOS_DIR`.
  - `caminhoAssinadoFoto(fotoId, agoraMs?): string`, no formato `/api/arquivos/fotos/<id>?exp=<s>&sig=<hex>`.
  - `assinaturaValida(fotoId, exp, sig, agoraMs?): boolean` e `assinar(fotoId, exp)`.

- [ ] **Step 1: Testes (falham)**

`apps/api/src/arquivos/imagem.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { detectarTipoImagem, mimeDaChave } from './imagem'

const bytes = (...valores: number[]) => new Uint8Array(valores)
const ascii = (texto: string) => [...texto].map((c) => c.charCodeAt(0))

describe('detectarTipoImagem', () => {
  it('reconhece JPEG, PNG, WebP e HEIC pelos primeiros bytes', () => {
    expect(detectarTipoImagem(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ mime: 'image/jpeg', extensao: 'jpg' })
    expect(detectarTipoImagem(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toEqual({
      mime: 'image/png',
      extensao: 'png',
    })
    expect(detectarTipoImagem(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))).toEqual({
      mime: 'image/webp',
      extensao: 'webp',
    })
    expect(detectarTipoImagem(bytes(0, 0, 0, 24, ...ascii('ftypheic')))).toEqual({
      mime: 'image/heic',
      extensao: 'heic',
    })
  })
  it('recusa qualquer outra coisa, mesmo com nome de imagem', () => {
    expect(detectarTipoImagem(bytes(...ascii('%PDF-1.7')))).toBeNull()
    expect(detectarTipoImagem(bytes(...ascii('olá')))).toBeNull()
    expect(detectarTipoImagem(bytes())).toBeNull()
  })
})

describe('mimeDaChave', () => {
  it('deduz o tipo pela extensão gravada', () => {
    expect(mimeDaChave('a/b.jpg')).toBe('image/jpeg')
    expect(mimeDaChave('a/b.webp')).toBe('image/webp')
    expect(mimeDaChave('a/b.bin')).toBe('application/octet-stream')
  })
})
```

`apps/api/src/arquivos/armazenamento.test.ts`:
```ts
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ArmazenamentoDisco } from './armazenamento'

describe('ArmazenamentoDisco', () => {
  let disco: ArmazenamentoDisco
  beforeEach(async () => {
    disco = new ArmazenamentoDisco(await mkdtemp(join(tmpdir(), 'kgb-disco-')))
  })

  it('salva, lê e remove um arquivo', async () => {
    await disco.salvar('ac1/foto.jpg', new Uint8Array([1, 2, 3]), 'image/jpeg')
    expect(await disco.abrir('ac1/foto.jpg')).toEqual(new Uint8Array([1, 2, 3]))
    await disco.remover('ac1/foto.jpg')
    expect(await disco.abrir('ac1/foto.jpg')).toBeNull()
  })
  it('remover o que não existe não é erro', async () => {
    await expect(disco.remover('nao/existe.jpg')).resolves.toBeUndefined()
  })
  it('não deixa a chave sair da pasta', async () => {
    await expect(disco.salvar('../fora.jpg', new Uint8Array([1]), 'image/jpeg')).rejects.toThrow(/inválida/)
    await expect(disco.abrir('../../etc/hosts')).rejects.toThrow(/inválida/)
  })
})
```

`apps/api/src/arquivos/assinatura.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { assinar, assinaturaValida, caminhoAssinadoFoto } from './assinatura'

const partes = (caminho: string) => {
  const url = new URL(caminho, 'http://x')
  return { id: url.pathname.split('/').at(-1)!, exp: url.searchParams.get('exp')!, sig: url.searchParams.get('sig')! }
}

describe('URL assinada de foto', () => {
  const agora = Date.parse('2026-09-28T13:10:00Z')

  it('gera um caminho que vale para aquela foto', () => {
    const caminho = caminhoAssinadoFoto('foto-1', agora)
    expect(caminho).toMatch(/^\/api\/arquivos\/fotos\/foto-1\?exp=\d+&sig=[0-9a-f]{64}$/)
    const { id, exp, sig } = partes(caminho)
    expect(assinaturaValida(id, exp, sig, agora)).toBe(true)
  })
  it('vale por pelo menos 1 hora e é estável dentro da mesma hora (bom para cache)', () => {
    const { exp } = partes(caminhoAssinadoFoto('foto-1', agora))
    expect(Number(exp) * 1000 - agora).toBeGreaterThanOrEqual(3600_000)
    expect(caminhoAssinadoFoto('foto-1', agora + 60_000)).toBe(caminhoAssinadoFoto('foto-1', agora))
  })
  it('recusa assinatura adulterada, de outra foto ou vencida', () => {
    const { exp, sig } = partes(caminhoAssinadoFoto('foto-1', agora))
    expect(assinaturaValida('foto-1', exp, sig.replace(/.$/, (c) => (c === '0' ? '1' : '0')), agora)).toBe(false)
    expect(assinaturaValida('foto-2', exp, sig, agora)).toBe(false)
    expect(assinaturaValida('foto-1', exp, sig, Number(exp) * 1000 + 1)).toBe(false)
    expect(assinaturaValida('foto-1', 'abc', sig, agora)).toBe(false)
    expect(assinaturaValida('foto-1', exp, 'xyz', agora)).toBe(false)
  })
  it('assinar é determinístico', () => {
    expect(assinar('f', 100)).toBe(assinar('f', 100))
    expect(assinar('f', 100)).not.toBe(assinar('f', 101))
  })
})
```

Run: `pnpm --filter @kgb/api exec vitest run src/arquivos`
Expected: FAIL com "Cannot find module".

- [ ] **Step 2: Configuração**

Em `apps/api/src/env.ts`, importar `join` de `node:path`, declarar `const RAIZ = fileURLToPath(new URL('../../../', import.meta.url))` e acrescentar ao esquema:
```ts
  ARQUIVOS_DIR: z.string().default(join(RAIZ, 'var/uploads')),
```

Em `apps/api/vitest.config.ts`, importar `tmpdir` de `node:os` e `join` de `node:path`, e acrescentar em `test.env`:
```ts
      ARQUIVOS_DIR: join(tmpdir(), 'kgb-arquivos-teste'),
```

`.gitignore`: acrescentar `var/`.

`.env.example`: acrescentar
```bash
# Pasta das fotos enviadas pelo app (dev). Em produção, trocar por S3/R2.
ARQUIVOS_DIR="var/uploads"
```
O caminho relativo é resolvido a partir da raiz do repositório. Por isso o `env.ts` aplica `resolve(RAIZ, valor)` com um `.transform`:
```ts
  ARQUIVOS_DIR: z
    .string()
    .default('var/uploads')
    .transform((pasta) => resolve(RAIZ, pasta)),
```
(com `resolve` de `node:path`; substitui a linha anterior).

- [ ] **Step 3: Implementação**

`apps/api/src/arquivos/imagem.ts`:
```ts
export const TAMANHO_MAXIMO_FOTO = 10 * 1024 * 1024

export type TipoImagem =
  | { mime: 'image/jpeg'; extensao: 'jpg' }
  | { mime: 'image/png'; extensao: 'png' }
  | { mime: 'image/webp'; extensao: 'webp' }
  | { mime: 'image/heic'; extensao: 'heic' }

const MARCAS_HEIC = new Set(['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'mif1', 'msf1'])
const ascii = (b: Uint8Array, inicio: number, fim: number) => String.fromCharCode(...b.subarray(inicio, fim))

/** Identifica a imagem pelos primeiros bytes (nunca pelo nome ou pelo Content-Type). */
export function detectarTipoImagem(b: Uint8Array): TipoImagem | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', extensao: 'jpg' }
  if ([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v)) {
    return { mime: 'image/png', extensao: 'png' }
  }
  if (ascii(b, 0, 4) === 'RIFF' && ascii(b, 8, 12) === 'WEBP') return { mime: 'image/webp', extensao: 'webp' }
  if (ascii(b, 4, 8) === 'ftyp' && MARCAS_HEIC.has(ascii(b, 8, 12))) return { mime: 'image/heic', extensao: 'heic' }
  return null
}

const MIME_POR_EXTENSAO: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
}

export function mimeDaChave(chave: string): string {
  return MIME_POR_EXTENSAO[chave.split('.').at(-1) ?? ''] ?? 'application/octet-stream'
}
```

`apps/api/src/arquivos/armazenamento.ts`:
```ts
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve, sep } from 'node:path'

/** Onde as fotos ficam guardadas. Hoje: disco local. Depois: S3/R2 com a mesma interface. */
export interface Armazenamento {
  salvar(chave: string, dados: Uint8Array, tipo: string): Promise<void>
  abrir(chave: string): Promise<Uint8Array | null>
  remover(chave: string): Promise<void>
}

export class ArmazenamentoDisco implements Armazenamento {
  private readonly pasta: string

  constructor(pasta: string) {
    this.pasta = resolve(pasta)
  }

  private caminho(chave: string): string {
    const alvo = resolve(this.pasta, chave)
    if (!alvo.startsWith(this.pasta + sep)) throw new Error(`Chave de arquivo inválida: ${chave}`)
    return alvo
  }

  async salvar(chave: string, dados: Uint8Array): Promise<void> {
    const alvo = this.caminho(chave)
    await mkdir(dirname(alvo), { recursive: true })
    await writeFile(alvo, dados)
  }

  async abrir(chave: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await readFile(this.caminho(chave)))
    } catch (erro) {
      if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return null
      throw erro
    }
  }

  async remover(chave: string): Promise<void> {
    await rm(this.caminho(chave), { force: true })
  }
}
```

`apps/api/src/arquivos/assinatura.ts`:
```ts
import { createHmac, timingSafeEqual } from 'node:crypto'
import { env } from '../env'

const UMA_HORA = 3600

const chaveDeAssinatura = createHmac('sha256', env.BETTER_AUTH_SECRET).update('kgb:arquivos:fotos').digest()

export function assinar(fotoId: string, expira: number): string {
  return createHmac('sha256', chaveDeAssinatura).update(`${fotoId}.${expira}`).digest('hex')
}

/**
 * Caminho assinado para a foto. A validade termina numa hora "cheia", com pelo menos 1 hora de
 * folga, para a mesma URL servir de cache durante a hora.
 */
export function caminhoAssinadoFoto(fotoId: string, agoraMs = Date.now()): string {
  const expira = (Math.floor(agoraMs / 1000 / UMA_HORA) + 2) * UMA_HORA
  return `/api/arquivos/fotos/${encodeURIComponent(fotoId)}?exp=${expira}&sig=${assinar(fotoId, expira)}`
}

export function assinaturaValida(fotoId: string, exp: string, sig: string, agoraMs = Date.now()): boolean {
  const expira = Number(exp)
  if (!Number.isInteger(expira) || expira * 1000 < agoraMs || !/^[0-9a-f]{64}$/.test(sig)) return false
  return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(assinar(fotoId, expira), 'hex'))
}
```

`apps/api/src/arquivos/index.ts`:
```ts
import { env } from '../env'
import { ArmazenamentoDisco, type Armazenamento } from './armazenamento'

export const armazenamento: Armazenamento = new ArmazenamentoDisco(env.ARQUIVOS_DIR)
```

- [ ] **Step 4: Rodar, typecheck, commit**

Run: `pnpm --filter @kgb/api exec vitest run src/arquivos && pnpm --filter @kgb/api typecheck && pnpm lint`
Expected: PASS e nenhum erro.

```bash
git add -A
git commit -m "feat(api): fotos em disco local com URL assinada e checagem do tipo de imagem

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Serialização, schemas, catálogo, lista e detalhe

**Files:**
- Create: `apps/api/src/schemas.ts`, `apps/api/src/servicos/{serializacao.ts,acionamentos.ts}`, `apps/api/src/rotas/catalogo.ts`, `apps/api/test/dados.ts`
- Modify: `apps/api/src/erros.ts` (`ErroHttp`, `naoEncontrado`), `apps/api/src/app.ts` (`onError` e rotas), `apps/api/src/rotas/acionamentos.ts` (lista e detalhe; `beforeAll` com `semear`)
- Test: `apps/api/src/rotas/catalogo.test.ts`, `apps/api/src/rotas/acionamentos.test.ts`

**Interfaces:**
- Consumes: domínio (Task 1), `caminhoAssinadoFoto` (Task 2), `semear` (`@kgb/db/seed`).
- Produces:
  - Schemas OpenAPI `Foto`, `ResumoAcionamento`, `DetalheAcionamento`, `TipoDemanda`, `PrestadorOpcao`.
  - `listarAcionamentos(usuario, { status?, busca? })` e `detalharAcionamento(usuario, id)`.
  - `class ErroHttp(status, codigo, mensagem)` e `naoEncontrado(oque?)`.
  - Helpers de teste: `loginDePrestador(prestadorId): Promise<string>` (devolve o e-mail), `JPEG`, `formularioFoto(campos, arquivo?)`, `criarAcionamento(app, headersGestor, extra?)` (devolve o `id`) e `hojeSP()`.

- [ ] **Step 1: Testes (falham)**

`apps/api/test/dados.ts`:
```ts
import { SENHA_DEV } from '@kgb/db/seed'
import { hashPassword } from 'better-auth/crypto'
import { prisma } from '../src/db'
import { dataSP } from '../src/dominio/datas'

export const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01])

export const hojeSP = () => dataSP(new Date())

/** Garante um login com senha para o prestador (o seed só dá senha ao Carlos) e devolve o e-mail. */
export async function loginDePrestador(prestadorId: string): Promise<string> {
  const email = `${prestadorId}@teste.dev`
  const id = `u-teste-${prestadorId}`
  const existente = await prisma.user.findFirst({ where: { OR: [{ email }, { prestadorId }] } })
  if (existente?.email === email) return email
  if (existente) await prisma.user.update({ where: { id: existente.id }, data: { prestadorId: null } })
  await prisma.user.create({
    data: {
      id,
      name: `Teste ${prestadorId}`,
      email,
      role: 'prestador',
      prestadorId,
      accounts: {
        create: { id: `conta-${id}`, accountId: id, providerId: 'credential', password: await hashPassword(SENHA_DEV) },
      },
    },
  })
  return email
}

export function formularioFoto(campos: Record<string, string>, arquivo: Uint8Array = JPEG): FormData {
  const formulario = new FormData()
  formulario.set('arquivo', new File([arquivo], 'foto.jpg', { type: 'image/jpeg' }))
  for (const [chave, valor] of Object.entries(campos)) formulario.set(chave, valor)
  return formulario
}

interface AppTestavel {
  request: (caminho: string, init?: RequestInit) => Response | Promise<Response>
}

export async function criarAcionamento(
  app: AppTestavel,
  headersGestor: Record<string, string>,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const r = await app.request('/api/acionamentos', {
    method: 'POST',
    headers: { ...headersGestor, 'content-type': 'application/json' },
    body: JSON.stringify({
      titulo: 'Teste de fluxo',
      cliente: 'Cliente Teste',
      endereco: 'Rua Teste, 1 · Centro',
      data: hojeSP(),
      inicio: '09:00',
      fim: '10:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
      ...extra,
    }),
  })
  if (r.status !== 201) throw new Error(`criarAcionamento: HTTP ${r.status} ${await r.text()}`)
  return ((await r.json()) as { id: string }).id
}
```

`apps/api/src/rotas/catalogo.test.ts`:
```ts
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'

const app = criarApp()

describe('GET /api/tipos', () => {
  it('lista os tipos com o checklist, na ordem do cadastro', async () => {
    const r = await app.request('/api/tipos', { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(200)
    const tipos = (await r.json()) as { nome: string; cor: string; checklist: string[] }[]
    expect(tipos).toHaveLength(8)
    expect(tipos[0]).toMatchObject({ id: 't1', nome: 'Vazamento', cor: '#0069BD' })
    expect(tipos[0]!.checklist).toHaveLength(5)
  })
})

describe('GET /api/prestadores', () => {
  it('lista só os ativos, com região, para o seletor do Novo acionamento', async () => {
    const r = await app.request('/api/prestadores?status=ativo', { headers: await entrar(app, GESTORA_DEV.email) })
    expect(r.status).toBe(200)
    const prestadores = (await r.json()) as { id: string; nome: string; regiao: string | null }[]
    expect(prestadores.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4', 'p6'])
    expect(prestadores[0]).toEqual({ id: 'p1', nome: 'Carlos Mendes', regiao: 'Zona Oeste', cor: '#0069BD' })
  })
  it('é só para a gestão', async () => {
    const r = await app.request('/api/prestadores?status=ativo', { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(403)
  })
})
```

Acrescentar em `apps/api/src/rotas/acionamentos.test.ts`. Primeiro, no topo, depois de `const app = criarApp()`, um `beforeAll` que recria o seed, porque outros arquivos de teste criam acionamentos:
```ts
import { semear } from '@kgb/db/seed'
// ...
beforeAll(async () => {
  await semear(prisma)
})
```
O `beforeAll` do usuário sem vínculo, que já existe, continua depois dele. Os blocos novos:
```ts
interface Resumo {
  id: string
  codigo: string
  titulo: string
  cliente: string
  data: string
  inicio: string
  status: string
  inviavel: boolean
  prestador: { id: string; nome: string }
  tipos: { nome: string; cor: string }[]
  etapas: { feitas: number; total: number }
  ultimoEnvioEm: string | null
}

async function listar(headers: Record<string, string>, consulta = '') {
  const r = await app.request(`/api/acionamentos${consulta}`, { headers })
  expect(r.status).toBe(200)
  return (await r.json()) as Resumo[]
}

describe('GET /api/acionamentos', () => {
  it('lista tudo para a gestora, do mais recente para o mais antigo', async () => {
    const lista = await listar(await entrar(app, GESTORA_DEV.email))
    expect(lista).toHaveLength(await prisma.acionamento.count())
    const chaves = lista.map((a) => a.data + a.inicio)
    expect(chaves).toEqual([...chaves].sort().reverse())
    const gesso = lista.find((a) => a.titulo === 'Reparo em gesso no quarto')!
    expect(gesso).toMatchObject({
      codigo: expect.stringMatching(/^AC-\d+$/),
      status: 'reprovado',
      prestador: { id: 'p1', nome: 'Carlos Mendes' },
      tipos: [{ nome: 'Reparo em gesso', cor: '#E0A100' }],
      etapas: { feitas: 4, total: 4 },
    })
    expect(gesso.ultimoEnvioEm).not.toBeNull()
  })

  it('filtra por status, com "finalizados" = aprovados', async () => {
    const headers = await entrar(app, GESTORA_DEV.email)
    expect(await listar(headers, '?status=aguardando')).toHaveLength(3)
    const finalizados = await listar(headers, '?status=finalizados')
    expect(finalizados.length).toBeGreaterThanOrEqual(8)
    expect(finalizados.every((a) => a.status === 'aprovado')).toBe(true)
  })

  it('busca por título, cliente, código e prestador, sem ligar para acentos e maiúsculas', async () => {
    const headers = await entrar(app, GESTORA_DEV.email)
    expect((await listar(headers, '?busca=residencia%20martins')).map((a) => a.titulo)).toEqual([
      'Reparo em gesso no quarto',
    ])
    const [umQualquer] = await listar(headers)
    expect((await listar(headers, `?busca=${umQualquer!.codigo.toLowerCase()}`)).map((a) => a.id)).toContain(
      umQualquer!.id,
    )
    expect((await listar(headers, '?busca=ANA%20RIBEIRO')).every((a) => a.prestador.nome === 'Ana Ribeiro')).toBe(true)
  })

  it('o prestador só vê os seus', async () => {
    const lista = await listar(await entrar(app, EMAIL_PRESTADOR_DEV))
    expect(lista.length).toBeGreaterThan(0)
    expect(lista.every((a) => a.prestador.id === 'p1')).toBe(true)
  })

  it('prestador sem vínculo recebe lista vazia', async () => {
    expect(await listar(await entrar(app, EMAIL_SEM_VINCULO))).toEqual([])
  })
})

describe('GET /api/acionamentos/:id', () => {
  async function idPorTitulo(titulo: string) {
    return (await prisma.acionamento.findFirstOrThrow({ where: { titulo } })).id
  }

  it('traz etapas, fotos de exemplo, inviabilidade e a linha do tempo', async () => {
    const id = await idPorTitulo('Ponto de luz na garagem')
    const r = await app.request(`/api/acionamentos/${id}`, { headers: await entrar(app, GESTORA_DEV.email) })
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d).toMatchObject({
      status: 'aprovado',
      inviavel: true,
      regras: { photoMin: 1, requireAllSteps: false },
      inviabilidade: { comentario: expect.stringMatching(/laje protendida/) },
    })
    expect(d.inviabilidade.fotos[0]).toMatchObject({ url: null, cor: expect.stringMatching(/^#/), horario: expect.stringMatching(/^\d\d:\d\d$/) })
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['criado', 'iniciado', 'inviabilidade_enviada', 'aprovado'])
    expect(d.demandas[0].etapas[0]).toMatchObject({ texto: 'Desligar circuito', feita: true })
  })

  it('traz as revisões com motivo', async () => {
    const id = await idPorTitulo('Reparo no forro da sala')
    const d = await (await app.request(`/api/acionamentos/${id}`, { headers: await entrar(app, GESTORA_DEV.email) })).json()
    expect(d.revisoes.map((r: { decisao: string }) => r.decisao)).toEqual(['reprovado', 'aprovado'])
    expect(d.eventos.find((e: { tipo: string }) => e.tipo === 'reprovado').motivo).toMatch(/retoque/)
  })

  it('acionamento de outro prestador é 404 para o prestador', async () => {
    const id = await idPorTitulo('Reparo no forro da sala')
    const r = await app.request(`/api/acionamentos/${id}`, { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(404)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'nao_encontrado' } })
  })

  it('id inexistente é 404', async () => {
    const r = await app.request('/api/acionamentos/nao-existe', { headers: await entrar(app, GESTORA_DEV.email) })
    expect(r.status).toBe(404)
  })
})
```

"Ponto de luz na garagem" é do tipo t3, e a primeira etapa do checklist t3 é "Desligar circuito". No acionamento inviável, só a primeira etapa fica feita: é o `j < 1` do protótipo.

Run: `pnpm --filter @kgb/api test`
Expected: FAIL. `/api/tipos` e a lista respondem 404, e o import de `semear` precisa do `prisma` importado no teste.

- [ ] **Step 2: Erros e schemas**

Acrescentar em `apps/api/src/erros.ts`:
```ts
export class ErroHttp extends Error {
  constructor(
    readonly status: 401 | 403 | 404 | 409 | 413 | 415 | 422,
    readonly codigo: string,
    mensagem: string,
  ) {
    super(mensagem)
    this.name = 'ErroHttp'
  }
}

export function naoEncontrado(oque = 'Acionamento'): ErroHttp {
  return new ErroHttp(404, 'nao_encontrado', `${oque} não encontrado`)
}
```

No `onError` de `apps/api/src/app.ts`, antes do tratamento de `HTTPException`:
```ts
    if (erro instanceof ErroDominio || erro instanceof ErroHttp) {
      return c.json(corpoErro(erro.codigo, erro.message), erro.status)
    }
```
Importar `ErroDominio` de `./dominio/acionamento` e `ErroHttp` de `./erros`.

`apps/api/src/schemas.ts`:
```ts
import { z } from '@hono/zod-openapi'

export const STATUS = ['aberto', 'em_andamento', 'aguardando', 'reprovado', 'aprovado'] as const
const HORARIO = /^([01]\d|2[0-3]):[0-5]\d$/

export const IdParam = z.object({ id: z.string().openapi({ param: { name: 'id', in: 'path' } }) })

export const FotoSchema = z
  .object({
    id: z.string(),
    url: z.string().nullable().openapi({ description: 'Caminho assinado; null nas fotos de exemplo' }),
    cor: z.string().nullable().openapi({ description: 'Cor do bloco das fotos de exemplo' }),
    horario: z.string(),
    tiradaEm: z.string(),
  })
  .openapi('Foto')

export const ResumoAcionamentoSchema = z
  .object({
    id: z.string(),
    codigo: z.string(),
    titulo: z.string(),
    cliente: z.string(),
    endereco: z.string(),
    data: z.string(),
    inicio: z.string(),
    fim: z.string(),
    status: z.enum(STATUS),
    inviavel: z.boolean(),
    prestador: z.object({ id: z.string(), nome: z.string(), cor: z.string() }),
    tipos: z.array(z.object({ nome: z.string(), cor: z.string() })),
    etapas: z.object({ feitas: z.number().int(), total: z.number().int() }),
    ultimoEnvioEm: z.string().nullable(),
  })
  .openapi('ResumoAcionamento')

export const DetalheAcionamentoSchema = ResumoAcionamentoSchema.extend({
  criadoEm: z.string(),
  iniciadoEm: z.string().nullable(),
  comentarioConclusao: z.string().nullable(),
  regras: z.object({ photoMin: z.number().int(), requireAllSteps: z.boolean() }),
  demandas: z.array(
    z.object({
      id: z.string(),
      tipoNome: z.string(),
      cor: z.string(),
      etapas: z.array(
        z.object({
          id: z.string(),
          texto: z.string(),
          feita: z.boolean(),
          comentario: z.string().nullable(),
          fotos: z.array(FotoSchema),
        }),
      ),
    }),
  ),
  fotosConclusao: z.array(FotoSchema),
  inviabilidade: z.object({ comentario: z.string(), fotos: z.array(FotoSchema) }).nullable(),
  revisoes: z.array(
    z.object({ decisao: z.enum(['aprovado', 'reprovado']), motivo: z.string().nullable(), em: z.string() }),
  ),
  eventos: z.array(
    z.object({
      tipo: z.enum(['criado', 'iniciado', 'enviado', 'inviabilidade_enviada', 'aprovado', 'reprovado']),
      em: z.string(),
      motivo: z.string().nullable(),
    }),
  ),
}).openapi('DetalheAcionamento')

export const TipoDemandaSchema = z
  .object({ id: z.string(), nome: z.string(), cor: z.string(), checklist: z.array(z.string()) })
  .openapi('TipoDemanda')

export const PrestadorOpcaoSchema = z
  .object({ id: z.string(), nome: z.string(), regiao: z.string().nullable(), cor: z.string() })
  .openapi('PrestadorOpcao')

export const FiltroListaSchema = z.object({
  status: z.enum(['aberto', 'em_andamento', 'aguardando', 'reprovado', 'finalizados']).optional(),
  busca: z.string().max(200).optional(),
})

export const NovoAcionamentoSchema = z
  .object({
    titulo: z.string().max(200),
    cliente: z.string().max(200),
    endereco: z.string().max(300),
    data: z.iso.date(),
    inicio: z.string().regex(HORARIO),
    fim: z.string().regex(HORARIO),
    tipoIds: z.array(z.string()).max(20),
    prestadorId: z.string(),
  })
  .openapi('NovoAcionamento')

export const RevisaoSchema = z
  .object({ decisao: z.enum(['aprovado', 'reprovado']), motivo: z.string().max(2000).optional() })
  .openapi('NovaRevisao')

export const EtapaPatchSchema = z
  .object({ feita: z.boolean().optional(), comentario: z.string().max(2000).optional() })
  .openapi('AtualizacaoEtapa')

export const ConclusaoPatchSchema = z.object({ comentario: z.string().max(2000) }).openapi('AtualizacaoConclusao')

export const FotoFormSchema = z.object({
  arquivo: z.any().openapi({ type: 'string', format: 'binary' }),
  contexto: z.enum(['etapa', 'conclusao']),
  etapaId: z.string().optional(),
  tiradaEm: z.iso.datetime({ offset: true }).optional(),
})

export const InviavelFormSchema = z.object({
  comentario: z.string().max(2000),
  arquivos: z.any().openapi({ type: 'array', items: { type: 'string', format: 'binary' } }),
})

export const InicioPrestadorSchema = z
  .object({
    proximo: ResumoAcionamentoSchema.nullable(),
    hoje: z.array(ResumoAcionamentoSchema),
    metricas: z.object({
      hoje: z.number().int(),
      noMes: z.number().int(),
      aprovacao: z.object({ taxa: z.number().int(), dePrimeira: z.number().int().nullable() }),
      paraCorrigir: z.number().int(),
    }),
    rotaDoDia: z.array(z.string()),
  })
  .openapi('InicioPrestador')

export type ResumoAcionamento = z.infer<typeof ResumoAcionamentoSchema>
export type DetalheAcionamento = z.infer<typeof DetalheAcionamentoSchema>
export type Foto = z.infer<typeof FotoSchema>
```

- [ ] **Step 3: Serialização e serviço (leitura)**

`apps/api/src/servicos/serializacao.ts`:
```ts
import { codigoAcionamento, type Prisma } from '@kgb/db'
import { caminhoAssinadoFoto } from '../arquivos/assinatura'
import type { Regras } from '../dominio/acionamento'
import { horarioSP } from '../dominio/datas'
import type { DetalheAcionamento, Foto, ResumoAcionamento } from '../schemas'

export const PREFIXO_PLACEHOLDER = 'placeholder:'

export const incluirResumo = {
  prestador: { select: { id: true, nome: true, cor: true } },
  demandas: {
    orderBy: { ordem: 'asc' },
    select: { tipoNome: true, cor: true, etapas: { select: { feita: true } } },
  },
  eventos: {
    where: { tipo: { in: ['enviado', 'inviabilidade_enviada'] } },
    orderBy: { em: 'desc' },
    take: 1,
    select: { em: true },
  },
} satisfies Prisma.AcionamentoInclude

export const incluirDetalhe = {
  prestador: { select: { id: true, nome: true, cor: true } },
  demandas: {
    orderBy: { ordem: 'asc' },
    include: { etapas: { orderBy: { ordem: 'asc' }, include: { fotos: { orderBy: { tiradaEm: 'asc' } } } } },
  },
  fotos: { where: { contexto: { in: ['conclusao', 'inviabilidade'] } }, orderBy: { tiradaEm: 'asc' } },
  revisoes: { orderBy: { em: 'asc' } },
  eventos: { orderBy: { em: 'asc' } },
} satisfies Prisma.AcionamentoInclude

export type AcionamentoResumo = Prisma.AcionamentoGetPayload<{ include: typeof incluirResumo }>
export type AcionamentoDetalhe = Prisma.AcionamentoGetPayload<{ include: typeof incluirDetalhe }>

const dataIso = (d: Date) => d.toISOString().slice(0, 10)

export function paraFoto(f: { id: string; storageKey: string; tiradaEm: Date }, agora = Date.now()): Foto {
  const placeholder = f.storageKey.startsWith(PREFIXO_PLACEHOLDER)
  return {
    id: f.id,
    url: placeholder ? null : caminhoAssinadoFoto(f.id, agora),
    cor: placeholder ? f.storageKey.slice(PREFIXO_PLACEHOLDER.length) : null,
    horario: horarioSP(f.tiradaEm),
    tiradaEm: f.tiradaEm.toISOString(),
  }
}

function camposBase(
  a: Omit<AcionamentoResumo, 'demandas' | 'eventos'>,
  demandas: readonly { tipoNome: string; cor: string; etapas: readonly { feita: boolean }[] }[],
  ultimoEnvio: Date | undefined,
): ResumoAcionamento {
  const etapas = demandas.flatMap((d) => d.etapas)
  return {
    id: a.id,
    codigo: codigoAcionamento(a.numero),
    titulo: a.titulo,
    cliente: a.cliente,
    endereco: a.endereco,
    data: dataIso(a.data),
    inicio: a.inicio,
    fim: a.fim,
    status: a.status,
    inviavel: a.inviavel,
    prestador: a.prestador,
    tipos: demandas.map((d) => ({ nome: d.tipoNome, cor: d.cor })),
    etapas: { feitas: etapas.filter((e) => e.feita).length, total: etapas.length },
    ultimoEnvioEm: ultimoEnvio?.toISOString() ?? null,
  }
}

export function paraResumo(a: AcionamentoResumo): ResumoAcionamento {
  return camposBase(a, a.demandas, a.eventos[0]?.em)
}

function motivoDe(dados: Prisma.JsonValue | null): string | null {
  if (dados && typeof dados === 'object' && !Array.isArray(dados) && typeof dados.motivo === 'string') {
    return dados.motivo
  }
  return null
}

export function paraDetalhe(a: AcionamentoDetalhe, regras: Regras, agora = Date.now()): DetalheAcionamento {
  const envios = a.eventos.filter((e) => e.tipo === 'enviado' || e.tipo === 'inviabilidade_enviada')
  const foto = (f: Parameters<typeof paraFoto>[0]) => paraFoto(f, agora)
  return {
    ...camposBase(a, a.demandas, envios.at(-1)?.em),
    criadoEm: a.criadoEm.toISOString(),
    iniciadoEm: a.iniciadoEm?.toISOString() ?? null,
    comentarioConclusao: a.comentarioConclusao,
    regras,
    demandas: a.demandas.map((d) => ({
      id: d.id,
      tipoNome: d.tipoNome,
      cor: d.cor,
      etapas: d.etapas.map((e) => ({
        id: e.id,
        texto: e.texto,
        feita: e.feita,
        comentario: e.comentario,
        fotos: e.fotos.map(foto),
      })),
    })),
    fotosConclusao: a.fotos.filter((f) => f.contexto === 'conclusao').map(foto),
    inviabilidade: a.inviavel
      ? {
          comentario: a.inviabilidadeComentario ?? '',
          fotos: a.fotos.filter((f) => f.contexto === 'inviabilidade').map(foto),
        }
      : null,
    revisoes: a.revisoes.map((r) => ({ decisao: r.decisao, motivo: r.motivo, em: r.em.toISOString() })),
    eventos: a.eventos.map((e) => ({ tipo: e.tipo, em: e.em.toISOString(), motivo: motivoDe(e.dados) })),
  }
}
```

`apps/api/src/servicos/acionamentos.ts` (parte de leitura; as Tasks 4 e 5 acrescentam o resto):
```ts
import type { Prisma } from '@kgb/db'
import type { UsuarioSessao } from '../contexto'
import { prisma } from '../db'
import type { Regras } from '../dominio/acionamento'
import { naoEncontrado } from '../erros'
import { incluirDetalhe, incluirResumo, paraDetalhe, paraResumo } from './serializacao'

export type Db = Prisma.TransactionClient | typeof prisma
export type FiltroStatus = 'aberto' | 'em_andamento' | 'aguardando' | 'reprovado' | 'finalizados'

/** O que o usuário pode ver: tudo (gestor), os seus (prestador) ou nada (prestador sem vínculo). */
export function filtroVisivel(u: UsuarioSessao): Prisma.AcionamentoWhereInput | null {
  if (u.papel === 'gestor') return {}
  return u.prestadorId ? { prestadorId: u.prestadorId } : null
}

export async function regrasAtuais(db: Db = prisma): Promise<Regras> {
  const c = await db.configuracao.findUnique({ where: { id: 1 } })
  return { photoMin: c?.photoMin ?? 1, requireAllSteps: c?.requireAllSteps ?? false }
}

const normalizar = (texto: string) =>
  texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim()

export async function listarAcionamentos(u: UsuarioSessao, filtros: { status?: FiltroStatus; busca?: string }) {
  const visivel = filtroVisivel(u)
  if (!visivel) return []
  const status = filtros.status === 'finalizados' ? 'aprovado' : filtros.status
  const lista = await prisma.acionamento.findMany({
    where: { ...visivel, ...(status ? { status } : {}) },
    include: incluirResumo,
    orderBy: [{ data: 'desc' }, { inicio: 'desc' }],
  })
  const resumos = lista.map(paraResumo)
  const termo = normalizar(filtros.busca ?? '')
  if (!termo) return resumos
  return resumos.filter((r) => normalizar(`${r.titulo} ${r.cliente} ${r.codigo} ${r.prestador.nome}`).includes(termo))
}

export async function detalharAcionamento(u: UsuarioSessao, id: string) {
  const visivel = filtroVisivel(u)
  if (!visivel) throw naoEncontrado()
  const a = await prisma.acionamento.findFirst({ where: { id, ...visivel }, include: incluirDetalhe })
  if (!a) throw naoEncontrado()
  return paraDetalhe(a, await regrasAtuais())
}

export async function listarTipos() {
  return prisma.tipoDemanda.findMany({
    where: { excluidoEm: null },
    orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true, cor: true, checklist: true },
  })
}

export async function listarPrestadoresAtivos() {
  return prisma.prestador.findMany({
    where: { status: 'ativo', excluidoEm: null },
    orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
    select: { id: true, nome: true, regiao: true, cor: true },
  })
}
```

- [ ] **Step 4: Rotas**

`apps/api/src/rotas/catalogo.ts`:
```ts
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigeLogin, exigePapel } from '../middlewares/acesso'
import { PrestadorOpcaoSchema, TipoDemandaSchema } from '../schemas'
import { listarPrestadoresAtivos, listarTipos } from '../servicos/acionamentos'

const rotaTipos = createRoute({
  method: 'get',
  path: '/api/tipos',
  tags: ['Catálogo'],
  summary: 'Tipos de demanda com o checklist',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  responses: {
    200: { description: 'Tipos', content: { 'application/json': { schema: z.array(TipoDemandaSchema) } } },
    401: respostaErro('Sem sessão'),
  },
})

const rotaPrestadores = createRoute({
  method: 'get',
  path: '/api/prestadores',
  tags: ['Catálogo'],
  summary: 'Prestadores ativos (seletor do Novo acionamento)',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { query: z.object({ status: z.literal('ativo').optional() }) },
  responses: {
    200: {
      description: 'Prestadores ativos',
      content: { 'application/json': { schema: z.array(PrestadorOpcaoSchema) } },
    },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
  },
})

export const rotasCatalogo = new OpenAPIHono<Ambiente>()
  .openapi(rotaTipos, async (c) => c.json(await listarTipos(), 200))
  .openapi(rotaPrestadores, async (c) => c.json(await listarPrestadoresAtivos(), 200))
```

Em `apps/api/src/rotas/acionamentos.ts`, acrescentar as rotas de lista e de detalhe e encadear `.openapi(...)` depois da contagem:
```ts
import { DetalheAcionamentoSchema, FiltroListaSchema, IdParam, ResumoAcionamentoSchema } from '../schemas'
import { detalharAcionamento, listarAcionamentos } from '../servicos/acionamentos'

const rotaLista = createRoute({
  method: 'get',
  path: '/api/acionamentos',
  tags: ['Acionamentos'],
  summary: 'Lista (o prestador vê só os seus), do mais recente para o mais antigo',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  request: { query: FiltroListaSchema },
  responses: {
    200: {
      description: 'Acionamentos',
      content: { 'application/json': { schema: z.array(ResumoAcionamentoSchema) } },
    },
    401: respostaErro('Sem sessão'),
  },
})

const rotaDetalhe = createRoute({
  method: 'get',
  path: '/api/acionamentos/{id}',
  tags: ['Acionamentos'],
  summary: 'Detalhe com etapas, fotos, revisões e linha do tempo',
  security: [{ Bearer: [] }],
  middleware: [exigeLogin] as const,
  request: { params: IdParam },
  responses: {
    200: { description: 'Detalhe', content: { 'application/json': { schema: DetalheAcionamentoSchema } } },
    401: respostaErro('Sem sessão'),
    404: respostaErro('Não encontrado'),
  },
})

// ...encadeado em rotasAcionamentos:
  .openapi(rotaLista, async (c) => c.json(await listarAcionamentos(usuarioLogado(c), c.req.valid('query')), 200))
  .openapi(rotaDetalhe, async (c) =>
    c.json(await detalharAcionamento(usuarioLogado(c), c.req.valid('param').id), 200),
  )
```
A contagem (`/api/acionamentos/contagem`) precisa ser registrada **antes** do detalhe (`/api/acionamentos/{id}`), senão "contagem" é tratada como id.

Em `apps/api/src/app.ts`: `app.route('/', rotasCatalogo)`, junto das outras rotas.

- [ ] **Step 5: Rodar, typecheck, commit**

Run: `pnpm --filter @kgb/api test && pnpm --filter @kgb/api typecheck && pnpm lint`
Expected: PASS (todos os testes anteriores e os novos).

```bash
git add -A
git commit -m "feat(api): lista, detalhe, tipos e prestadores ativos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Criação e revisão (gestor)

**Files:**
- Modify: `apps/api/src/servicos/acionamentos.ts` (`criarAcionamento`, `revisarAcionamento`, `travar`), `apps/api/src/rotas/acionamentos.ts` (POST criar e POST revisão)
- Test: `apps/api/src/rotas/gestao.test.ts`

**Interfaces:**
- Consumes: `normalizarNovoAcionamento` e `verificarRevisao` (Task 1), `armazenamento` (Task 2), `paraResumo`, `detalharAcionamento` e `ErroHttp` (Task 3).
- Produces:
  - `criarAcionamento(usuario, dados): ResumoAcionamento`.
  - `revisarAcionamento(usuario, id, { decisao, motivo? }): DetalheAcionamento`.
  - `travar(tx, id)`, que devolve a linha travada `{ id, status, prestadorId, inviavel, iniciadoEm } | null`.
  - `POST /api/acionamentos` (201) e `POST /api/acionamentos/{id}/revisao` (200 com o detalhe).

- [ ] **Step 1: Testes (falham)**

`apps/api/src/rotas/gestao.test.ts`:
```ts
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { beforeAll, describe, expect, it } from 'vitest'
import { criarAcionamento, formularioFoto } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { armazenamento } from '../arquivos'
import { prisma } from '../db'

const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
})

const post = (caminho: string, headers: Record<string, string>, corpo?: unknown) =>
  app.request(caminho, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: corpo === undefined ? undefined : JSON.stringify(corpo),
  })

async function detalhe(id: string) {
  return (await app.request(`/api/acionamentos/${id}`, { headers: gestora })).json()
}

async function levarAteAguardando(id: string) {
  expect((await post(`/api/acionamentos/${id}/iniciar`, carlos)).status).toBe(200)
  const foto = await app.request(`/api/acionamentos/${id}/fotos`, {
    method: 'POST',
    headers: carlos,
    body: formularioFoto({ contexto: 'conclusao' }),
  })
  expect(foto.status).toBe(201)
  expect((await post(`/api/acionamentos/${id}/enviar`, carlos)).status).toBe(200)
}

describe('POST /api/acionamentos', () => {
  it('cria com uma demanda por tipo e cópia das etapas', async () => {
    const maior = (await prisma.acionamento.aggregate({ _max: { numero: true } }))._max.numero ?? 0
    const r = await post('/api/acionamentos', gestora, {
      titulo: 'Vazamento e gesso',
      cliente: 'Edifício Aurora',
      endereco: 'Rua Harmonia, 410 · Vila Madalena',
      data: '2026-10-01',
      inicio: '09:00',
      fim: '11:00',
      tipoIds: ['t1', 't6'],
      prestadorId: 'p1',
    })
    expect(r.status).toBe(201)
    const criado = await r.json()
    expect(criado).toMatchObject({
      codigo: `AC-${maior + 1}`,
      status: 'aberto',
      tipos: [{ nome: 'Vazamento' }, { nome: 'Reparo em gesso' }],
      etapas: { feitas: 0, total: 9 },
    })
    const d = await detalhe(criado.id)
    expect(d.demandas[1].etapas.map((e: { texto: string }) => e.texto)).toEqual([
      'Remover parte danificada',
      'Aplicar placa ou massa nova',
      'Lixar e nivelar',
      'Retocar pintura',
    ])
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['criado'])
  })

  it('editar o checklist do tipo depois não muda o acionamento já criado', async () => {
    const id = await criarAcionamento(app, gestora, { tipoIds: ['t8'] })
    const original = await prisma.tipoDemanda.findUniqueOrThrow({ where: { id: 't8' } })
    await prisma.tipoDemanda.update({ where: { id: 't8' }, data: { checklist: ['Outra coisa'] } })
    try {
      const d = await detalhe(id)
      expect(d.demandas[0].etapas.map((e: { texto: string }) => e.texto)).toEqual(original.checklist)
    } finally {
      await prisma.tipoDemanda.update({ where: { id: 't8' }, data: { checklist: original.checklist } })
    }
  })

  it.each([
    [{ inicio: '11:00', fim: '10:00' }, 'horario_invalido'],
    [{ tipoIds: [] }, 'tipo_invalido'],
    [{ tipoIds: ['nao-existe'] }, 'tipo_invalido'],
    [{ prestadorId: 'p5' }, 'prestador_inativo'],
    [{ titulo: '   ' }, 'campo_obrigatorio'],
    [{ data: '2026-02-31' }, 'validacao'],
    [{ inicio: '9h' }, 'validacao'],
  ])('recusa %j com %s', async (extra, codigo) => {
    const r = await post('/api/acionamentos', gestora, {
      titulo: 'X',
      cliente: 'Y',
      endereco: 'Z',
      data: '2026-10-01',
      inicio: '09:00',
      fim: '10:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
      ...extra,
    })
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject({ erro: { codigo } })
  })

  it('prestador não cria acionamento', async () => {
    const r = await post('/api/acionamentos', carlos, {})
    expect(r.status).toBe(403)
  })
})

describe('POST /api/acionamentos/:id/revisao', () => {
  it('aprova e registra a decisão', async () => {
    const id = await criarAcionamento(app, gestora)
    await levarAteAguardando(id)
    const r = await post(`/api/acionamentos/${id}/revisao`, gestora, { decisao: 'aprovado' })
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.status).toBe('aprovado')
    expect(d.revisoes).toEqual([{ decisao: 'aprovado', motivo: null, em: expect.any(String) }])
    expect(d.eventos.at(-1)).toMatchObject({ tipo: 'aprovado' })
    expect((await post(`/api/acionamentos/${id}/revisao`, gestora, { decisao: 'aprovado' })).status).toBe(409)
  })

  it('reprovar exige motivo e devolve ao prestador', async () => {
    const id = await criarAcionamento(app, gestora)
    await levarAteAguardando(id)
    const semMotivo = await post(`/api/acionamentos/${id}/revisao`, gestora, { decisao: 'reprovado', motivo: ' ' })
    expect(semMotivo.status).toBe(422)
    expect(await semMotivo.json()).toMatchObject({
      erro: { codigo: 'motivo_obrigatorio', mensagem: 'Escreva o motivo da reprovação' },
    })
    const r = await post(`/api/acionamentos/${id}/revisao`, gestora, { decisao: 'reprovado', motivo: 'Foto escura' })
    const d = await r.json()
    expect(d.status).toBe('reprovado')
    expect(d.eventos.at(-1)).toMatchObject({ tipo: 'reprovado', motivo: 'Foto escura' })
  })

  it('recusar a inviabilidade apaga motivo, fotos e arquivos', async () => {
    const id = await criarAcionamento(app, gestora)
    const formulario = new FormData()
    formulario.set('comentario', 'Sem acesso ao local')
    formulario.append('arquivos', formularioFoto({}).get('arquivo') as File)
    expect(
      (await app.request(`/api/acionamentos/${id}/inviavel`, { method: 'POST', headers: carlos, body: formulario })).status,
    ).toBe(200)
    const chave = (await prisma.foto.findFirstOrThrow({ where: { acionamentoId: id, contexto: 'inviabilidade' } })).storageKey
    expect(await armazenamento.abrir(chave)).not.toBeNull()

    const r = await post(`/api/acionamentos/${id}/revisao`, gestora, { decisao: 'reprovado', motivo: 'Dá para fazer' })
    const d = await r.json()
    expect(d).toMatchObject({ status: 'reprovado', inviavel: false, inviabilidade: null })
    expect(await prisma.foto.count({ where: { acionamentoId: id, contexto: 'inviabilidade' } })).toBe(0)
    expect(await armazenamento.abrir(chave)).toBeNull()
  })

  it('só a gestão revisa', async () => {
    const id = await criarAcionamento(app, gestora)
    expect((await post(`/api/acionamentos/${id}/revisao`, carlos, { decisao: 'aprovado' })).status).toBe(403)
  })
})
```

Esses testes usam as rotas do prestador (iniciar, fotos, enviar e inviável), que a Task 5 implementa. A ordem de execução fica assim:
1. Escreva este arquivo agora.
2. Confirme que ele falha.
3. Implemente a Task 4 e, em seguida, a Task 5, antes de rodá-lo até o verde.

Os testes do bloco de criação já passam ao fim da Task 4.

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/gestao.test.ts`
Expected: FAIL (as rotas respondem 404).

- [ ] **Step 2: Serviço**

Acrescentar em `apps/api/src/servicos/acionamentos.ts`:
```ts
import { armazenamento } from '../arquivos'
import {
  ErroDominio,
  normalizarNovoAcionamento,
  verificarRevisao,
  type DadosNovoAcionamento,
  type Decisao,
  type StatusAcionamento,
} from '../dominio/acionamento'
import { PREFIXO_PLACEHOLDER } from './serializacao'

export interface LinhaTravada {
  id: string
  status: StatusAcionamento
  prestadorId: string
  inviavel: boolean
  iniciadoEm: Date | null
}

/** Trava a linha do acionamento até o fim da transação: ações simultâneas ficam em fila. */
export async function travar(tx: Prisma.TransactionClient, id: string): Promise<LinhaTravada | null> {
  const [linha] = await tx.$queryRaw<LinhaTravada[]>`
    SELECT id, status, "prestadorId", inviavel, "iniciadoEm" FROM acionamento WHERE id = ${id} FOR UPDATE`
  return linha ?? null
}

export async function removerArquivos(chaves: readonly string[]): Promise<void> {
  await Promise.all(chaves.filter((c) => !c.startsWith(PREFIXO_PLACEHOLDER)).map((c) => armazenamento.remover(c)))
}

export async function criarAcionamento(u: UsuarioSessao, dados: DadosNovoAcionamento) {
  const d = normalizarNovoAcionamento(dados)
  const id = await prisma.$transaction(async (tx) => {
    const prestador = await tx.prestador.findFirst({
      where: { id: d.prestadorId, status: 'ativo', excluidoEm: null },
      select: { id: true },
    })
    if (!prestador) throw new ErroDominio('prestador_inativo', 'Escolha um prestador ativo')
    const tipos = await tx.tipoDemanda.findMany({ where: { id: { in: d.tipoIds }, excluidoEm: null } })
    if (tipos.length !== d.tipoIds.length) throw new ErroDominio('tipo_invalido', 'Tipo de demanda inválido')
    const porId = new Map(tipos.map((t) => [t.id, t]))
    const criado = await tx.acionamento.create({
      data: {
        titulo: d.titulo,
        cliente: d.cliente,
        endereco: d.endereco,
        data: new Date(`${d.data}T00:00:00Z`),
        inicio: d.inicio,
        fim: d.fim,
        prestadorId: d.prestadorId,
        criadoPorId: u.id,
        demandas: {
          create: d.tipoIds.map((tipoId, ordem) => {
            const tipo = porId.get(tipoId)!
            return {
              tipoId,
              tipoNome: tipo.nome,
              cor: tipo.cor,
              ordem,
              etapas: { create: tipo.checklist.map((texto, i) => ({ ordem: i, texto })) },
            }
          }),
        },
        eventos: { create: { tipo: 'criado', autorId: u.id } },
      },
      select: { id: true },
    })
    return criado.id
  })
  return paraResumo(await prisma.acionamento.findUniqueOrThrow({ where: { id }, include: incluirResumo }))
}

export async function revisarAcionamento(u: UsuarioSessao, id: string, entrada: { decisao: Decisao; motivo?: string }) {
  const chavesApagadas = await prisma.$transaction(async (tx) => {
    const a = await travar(tx, id)
    if (!a) throw naoEncontrado()
    const motivo = verificarRevisao({ status: a.status, decisao: entrada.decisao, motivo: entrada.motivo })
    const agora = new Date()
    await tx.revisao.create({ data: { acionamentoId: id, decisao: entrada.decisao, motivo, em: agora, gestorId: u.id } })
    const recusaInviabilidade = entrada.decisao === 'reprovado' && a.inviavel
    let chaves: string[] = []
    if (recusaInviabilidade) {
      const fotos = await tx.foto.findMany({
        where: { acionamentoId: id, contexto: 'inviabilidade' },
        select: { storageKey: true },
      })
      chaves = fotos.map((f) => f.storageKey)
      await tx.foto.deleteMany({ where: { acionamentoId: id, contexto: 'inviabilidade' } })
    }
    await tx.acionamento.update({
      where: { id },
      data: {
        status: entrada.decisao,
        ...(recusaInviabilidade ? { inviavel: false, inviabilidadeComentario: null } : {}),
        eventos: {
          create: { tipo: entrada.decisao, autorId: u.id, em: agora, ...(motivo ? { dados: { motivo } } : {}) },
        },
      },
    })
    return chaves
  })
  await removerArquivos(chavesApagadas)
  return detalharAcionamento(u, id)
}
```

- [ ] **Step 3: Rotas**

Em `apps/api/src/rotas/acionamentos.ts`:
```ts
const rotaCriar = createRoute({
  method: 'post',
  path: '/api/acionamentos',
  tags: ['Acionamentos'],
  summary: 'Cria o acionamento, copiando o checklist de cada tipo',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { body: { content: { 'application/json': { schema: NovoAcionamentoSchema } }, required: true } },
  responses: {
    201: { description: 'Criado', content: { 'application/json': { schema: ResumoAcionamentoSchema } } },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    422: respostaErro('Dados inválidos'),
  },
})

const rotaRevisao = createRoute({
  method: 'post',
  path: '/api/acionamentos/{id}/revisao',
  tags: ['Acionamentos'],
  summary: 'Aprova ou reprova (reprovar exige motivo)',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { params: IdParam, body: { content: { 'application/json': { schema: RevisaoSchema } }, required: true } },
  responses: {
    200: { description: 'Revisado', content: { 'application/json': { schema: DetalheAcionamentoSchema } } },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só para a gestão'),
    404: respostaErro('Não encontrado'),
    409: respostaErro('Não está aguardando aprovação'),
    422: respostaErro('Motivo obrigatório'),
  },
})

// encadear:
  .openapi(rotaCriar, async (c) => c.json(await criarAcionamento(usuarioLogado(c), c.req.valid('json')), 201))
  .openapi(rotaRevisao, async (c) =>
    c.json(await revisarAcionamento(usuarioLogado(c), c.req.valid('param').id, c.req.valid('json')), 200),
  )
```
Importar os schemas `NovoAcionamentoSchema` e `RevisaoSchema`, `exigePapel`, e os serviços `criarAcionamento` e `revisarAcionamento`.

- [ ] **Step 4: Rodar a parte de criação e commit**

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/gestao.test.ts -t "POST /api/acionamentos$|cria|editar|recusa|prestador não cria"`
Expected: os testes de criação passam. Os de revisão continuam falhando até a Task 5.

```bash
git add -A
git commit -m "feat(api): criação de acionamento e revisão da gestão

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Execução pelo prestador, fotos e leitura assinada

**Files:**
- Create: `apps/api/src/rotas/execucao.ts`, `apps/api/src/rotas/arquivos.ts`
- Modify: `apps/api/src/servicos/acionamentos.ts` (ações do prestador), `apps/api/src/app.ts` (montar as rotas)
- Test: `apps/api/src/rotas/execucao.test.ts`, (e `gestao.test.ts` fica verde)

**Interfaces:**
- Consumes: `exigirStatus`, `verificarEnvio` e `verificarInviabilidade` (Task 1); `detectarTipoImagem`, `TAMANHO_MAXIMO_FOTO`, `mimeDaChave`, `assinaturaValida` e `armazenamento` (Task 2); `travar` e `removerArquivos` (Task 4).
- Produces:
  - Serviços `iniciarAtendimento`, `atualizarEtapa`, `atualizarConclusao`, `adicionarFoto`, `removerFoto`, `enviarParaAprovacao` e `marcarInviavel`. Todos devolvem o `DetalheAcionamento`, exceto `adicionarFoto` (devolve a `Foto`) e `removerFoto` (não devolve nada).
  - Rotas:
    - `POST /api/acionamentos/{id}/iniciar`
    - `PATCH /api/acionamentos/{id}/etapas/{etapaId}`
    - `PATCH /api/acionamentos/{id}/conclusao`
    - `POST /api/acionamentos/{id}/fotos` (201) e `DELETE /api/acionamentos/{id}/fotos/{fotoId}` (200 `{ ok: true }`)
    - `POST /api/acionamentos/{id}/enviar` e `POST /api/acionamentos/{id}/inviavel`
    - `GET /api/arquivos/fotos/:id`

- [ ] **Step 1: Testes (falham)**

`apps/api/src/rotas/execucao.test.ts`:
```ts
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { beforeAll, describe, expect, it } from 'vitest'
import { criarAcionamento, formularioFoto, JPEG, loginDePrestador } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { assinar } from '../arquivos/assinatura'
import { prisma } from '../db'

const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>
let ana: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
  ana = await entrar(app, await loginDePrestador('p2'))
})

const req = (metodo: string, caminho: string, headers: Record<string, string>, corpo?: unknown) =>
  app.request(caminho, {
    method: metodo,
    headers: corpo instanceof FormData || corpo === undefined ? headers : { ...headers, 'content-type': 'application/json' },
    body: corpo instanceof FormData ? corpo : corpo === undefined ? undefined : JSON.stringify(corpo),
  })

async function novoIniciado() {
  const id = await criarAcionamento(app, gestora)
  expect((await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)).status).toBe(200)
  return id
}

async function primeiraEtapa(id: string) {
  return (await prisma.etapa.findFirstOrThrow({ where: { demanda: { acionamentoId: id } }, orderBy: { ordem: 'asc' } })).id
}

describe('iniciar', () => {
  it('passa para "em execução", grava o início e o evento', async () => {
    const id = await criarAcionamento(app, gestora)
    const r = await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.status).toBe('em_andamento')
    expect(d.iniciadoEm).not.toBeNull()
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['criado', 'iniciado'])
    expect((await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)).status).toBe(409)
  })

  it('dois toques ao mesmo tempo: só um inicia', async () => {
    const id = await criarAcionamento(app, gestora)
    const respostas = await Promise.all([
      req('POST', `/api/acionamentos/${id}/iniciar`, carlos),
      req('POST', `/api/acionamentos/${id}/iniciar`, carlos),
    ])
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409])
    expect(await prisma.eventoAcionamento.count({ where: { acionamentoId: id, tipo: 'iniciado' } })).toBe(1)
  })

  it('outro prestador recebe 404 e a gestão recebe 403', async () => {
    const id = await criarAcionamento(app, gestora)
    expect((await req('POST', `/api/acionamentos/${id}/iniciar`, ana)).status).toBe(404)
    expect((await req('POST', `/api/acionamentos/${id}/iniciar`, gestora)).status).toBe(403)
  })
})

describe('etapas e comentário final', () => {
  it('só edita com o atendimento em execução', async () => {
    const id = await criarAcionamento(app, gestora)
    const etapa = await primeiraEtapa(id)
    expect((await req('PATCH', `/api/acionamentos/${id}/etapas/${etapa}`, carlos, { feita: true })).status).toBe(409)
    await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)
    const r = await req('PATCH', `/api/acionamentos/${id}/etapas/${etapa}`, carlos, { feita: true, comentario: 'Feito ' })
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.demandas[0].etapas[0]).toMatchObject({ feita: true, comentario: 'Feito ' })
    expect(d.etapas.feitas).toBe(1)
  })

  it('comentário só com espaços vira vazio', async () => {
    const id = await novoIniciado()
    const etapa = await primeiraEtapa(id)
    const d = await (await req('PATCH', `/api/acionamentos/${id}/etapas/${etapa}`, carlos, { comentario: '  ' })).json()
    expect(d.demandas[0].etapas[0].comentario).toBeNull()
  })

  it('etapa de outro acionamento é 404', async () => {
    const id = await novoIniciado()
    const outra = await primeiraEtapa(await novoIniciado())
    expect((await req('PATCH', `/api/acionamentos/${id}/etapas/${outra}`, carlos, { feita: true })).status).toBe(404)
  })

  it('grava o comentário final', async () => {
    const id = await novoIniciado()
    const d = await (await req('PATCH', `/api/acionamentos/${id}/conclusao`, carlos, { comentario: 'Tudo certo' })).json()
    expect(d.comentarioConclusao).toBe('Tudo certo')
  })
})

describe('fotos', () => {
  it('envia foto da etapa e lê de volta pela URL assinada, sem login', async () => {
    const id = await novoIniciado()
    const etapaId = await primeiraEtapa(id)
    const r = await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'etapa', etapaId, tiradaEm: '2026-09-28T13:05:00-03:00' }))
    expect(r.status).toBe(201)
    const foto = await r.json()
    expect(foto).toMatchObject({ cor: null, horario: '13:05', url: expect.stringMatching(/^\/api\/arquivos\/fotos\//) })
    const arquivo = await app.request(foto.url)
    expect(arquivo.status).toBe(200)
    expect(arquivo.headers.get('content-type')).toBe('image/jpeg')
    expect(new Uint8Array(await arquivo.arrayBuffer())).toEqual(JPEG)
  })

  it('URL adulterada ou vencida não entrega a foto', async () => {
    const id = await novoIniciado()
    const foto = await (await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'conclusao' }))).json()
    expect((await app.request(foto.url.replace(/sig=./, 'sig=0'))).status).toBe(403)
    const vencida = Math.floor(Date.now() / 1000) - 10
    expect((await app.request(`/api/arquivos/fotos/${foto.id}?exp=${vencida}&sig=${assinar(foto.id, vencida)}`)).status).toBe(403)
  })

  it('recusa arquivo que não é imagem e foto grande demais', async () => {
    const id = await novoIniciado()
    const texto = await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'conclusao' }, new TextEncoder().encode('não sou foto')))
    expect(texto.status).toBe(415)
    expect(await texto.json()).toMatchObject({ erro: { codigo: 'tipo_arquivo_invalido' } })
    const grande = new Uint8Array(10 * 1024 * 1024 + 1)
    grande.set(JPEG)
    const r = await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'conclusao' }, grande))
    expect(r.status).toBe(413)
  })

  it('foto de etapa exige a etapa, e ela precisa ser deste acionamento', async () => {
    const id = await novoIniciado()
    expect((await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'etapa' }))).status).toBe(422)
    const outra = await primeiraEtapa(await novoIniciado())
    const r = await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'etapa', etapaId: outra }))
    expect(r.status).toBe(404)
    expect(await prisma.foto.count({ where: { acionamentoId: id } })).toBe(0)
  })

  it('remove a foto e o arquivo', async () => {
    const id = await novoIniciado()
    const foto = await (await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'conclusao' }))).json()
    const r = await req('DELETE', `/api/acionamentos/${id}/fotos/${foto.id}`, carlos)
    expect(r.status).toBe(200)
    expect(await prisma.foto.count({ where: { id: foto.id } })).toBe(0)
    expect((await app.request(foto.url)).status).toBe(404)
  })
})

describe('enviar para aprovação', () => {
  it('exige a foto da conclusão, com o texto do protótipo', async () => {
    const id = await novoIniciado()
    const r = await req('POST', `/api/acionamentos/${id}/enviar`, carlos)
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'fotos_insuficientes', mensagem: 'Adicione 1 foto da conclusão para enviar' } })
  })

  it('envia e trava a edição', async () => {
    const id = await novoIniciado()
    await req('POST', `/api/acionamentos/${id}/fotos`, carlos, formularioFoto({ contexto: 'conclusao' }))
    const d = await (await req('POST', `/api/acionamentos/${id}/enviar`, carlos)).json()
    expect(d.status).toBe('aguardando')
    expect(d.ultimoEnvioEm).not.toBeNull()
    expect(d.eventos.at(-1).tipo).toBe('enviado')
    expect((await req('PATCH', `/api/acionamentos/${id}/conclusao`, carlos, { comentario: 'x' })).status).toBe(409)
  })
})

describe('marcar como inviável', () => {
  const formulario = (comentario: string, fotos: number) => {
    const f = new FormData()
    f.set('comentario', comentario)
    for (let i = 0; i < fotos; i++) f.append('arquivos', new File([JPEG], `f${i}.jpg`, { type: 'image/jpeg' }))
    return f
  }

  it('direto do "agendado": grava motivo, fotos, início e envia ao gestor', async () => {
    const id = await criarAcionamento(app, gestora)
    const r = await req('POST', `/api/acionamentos/${id}/inviavel`, carlos, formulario('  Portão trancado  ', 2))
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d).toMatchObject({ status: 'aguardando', inviavel: true, inviabilidade: { comentario: 'Portão trancado' } })
    expect(d.inviabilidade.fotos).toHaveLength(2)
    expect(d.iniciadoEm).not.toBeNull()
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['criado', 'iniciado', 'inviabilidade_enviada'])
  })

  it('exige motivo e foto', async () => {
    const id = await criarAcionamento(app, gestora)
    expect(await (await req('POST', `/api/acionamentos/${id}/inviavel`, carlos, formulario(' ', 1))).json()).toMatchObject({ erro: { codigo: 'motivo_obrigatorio' } })
    expect(await (await req('POST', `/api/acionamentos/${id}/inviavel`, carlos, formulario('x', 0))).json()).toMatchObject({ erro: { codigo: 'fotos_insuficientes' } })
  })
})
```

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/execucao.test.ts`
Expected: FAIL (as rotas respondem 404).

- [ ] **Step 2: Serviço**

Acrescentar em `apps/api/src/servicos/acionamentos.ts`:
```ts
import { randomUUID } from 'node:crypto'
import { detectarTipoImagem, TAMANHO_MAXIMO_FOTO, type TipoImagem } from '../arquivos/imagem'
import { exigirStatus, verificarEnvio, verificarInviabilidade } from '../dominio/acionamento'
import { ErroHttp } from '../erros'
import { paraFoto } from './serializacao'

export const MAX_FOTOS_INVIABILIDADE = 5

async function travarDoPrestador(tx: Prisma.TransactionClient, u: UsuarioSessao, id: string) {
  const a = await travar(tx, id)
  if (!a || !u.prestadorId || a.prestadorId !== u.prestadorId) throw naoEncontrado()
  return a
}

async function lerImagem(arquivo: unknown): Promise<{ dados: Uint8Array; tipo: TipoImagem }> {
  if (!(arquivo instanceof File)) throw new ErroHttp(422, 'arquivo_obrigatorio', 'Envie a foto')
  if (arquivo.size > TAMANHO_MAXIMO_FOTO) throw new ErroHttp(413, 'arquivo_grande', 'A foto passa de 10 MB')
  const dados = new Uint8Array(await arquivo.arrayBuffer())
  const tipo = detectarTipoImagem(dados)
  if (!tipo) throw new ErroHttp(415, 'tipo_arquivo_invalido', 'Envie uma foto em JPEG, PNG, WebP ou HEIC')
  return { dados, tipo }
}

export async function iniciarAtendimento(u: UsuarioSessao, id: string) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('iniciar', a.status)
    await tx.acionamento.update({
      where: { id },
      data: { status: 'em_andamento', iniciadoEm: new Date(), eventos: { create: { tipo: 'iniciado', autorId: u.id } } },
    })
  })
  return detalharAcionamento(u, id)
}

export async function atualizarEtapa(u: UsuarioSessao, id: string, etapaId: string, dados: { feita?: boolean; comentario?: string }) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('editar', a.status)
    const r = await tx.etapa.updateMany({
      where: { id: etapaId, demanda: { acionamentoId: id } },
      data: {
        ...(dados.feita !== undefined ? { feita: dados.feita } : {}),
        ...(dados.comentario !== undefined ? { comentario: dados.comentario.trim() ? dados.comentario : null } : {}),
      },
    })
    if (r.count === 0) throw naoEncontrado('Etapa')
  })
  return detalharAcionamento(u, id)
}

export async function atualizarConclusao(u: UsuarioSessao, id: string, comentario: string) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('editar', a.status)
    await tx.acionamento.update({ where: { id }, data: { comentarioConclusao: comentario.trim() ? comentario : null } })
  })
  return detalharAcionamento(u, id)
}

export async function adicionarFoto(
  u: UsuarioSessao,
  id: string,
  entrada: { arquivo: unknown; contexto: 'etapa' | 'conclusao'; etapaId?: string; tiradaEm?: string },
) {
  const { dados, tipo } = await lerImagem(entrada.arquivo)
  if (entrada.contexto === 'etapa' && !entrada.etapaId) {
    throw new ErroHttp(422, 'etapa_obrigatoria', 'Informe a etapa da foto')
  }
  const fotoId = randomUUID()
  const chave = `${id}/${fotoId}.${tipo.extensao}`
  try {
    const foto = await prisma.$transaction(async (tx) => {
      const a = await travarDoPrestador(tx, u, id)
      exigirStatus('editar', a.status)
      if (entrada.contexto === 'etapa') {
        const etapa = await tx.etapa.findFirst({
          where: { id: entrada.etapaId, demanda: { acionamentoId: id } },
          select: { id: true },
        })
        if (!etapa) throw naoEncontrado('Etapa')
      }
      await armazenamento.salvar(chave, dados, tipo.mime)
      return tx.foto.create({
        data: {
          id: fotoId,
          acionamentoId: id,
          contexto: entrada.contexto,
          etapaId: entrada.contexto === 'etapa' ? entrada.etapaId! : null,
          storageKey: chave,
          tiradaEm: entrada.tiradaEm ? new Date(entrada.tiradaEm) : new Date(),
        },
      })
    })
    return paraFoto(foto)
  } catch (erro) {
    await armazenamento.remover(chave)
    throw erro
  }
}

export async function removerFoto(u: UsuarioSessao, id: string, fotoId: string) {
  const chave = await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    exigirStatus('editar', a.status)
    const foto = await tx.foto.findFirst({
      where: { id: fotoId, acionamentoId: id, contexto: { in: ['etapa', 'conclusao'] } },
      select: { storageKey: true },
    })
    if (!foto) throw naoEncontrado('Foto')
    await tx.foto.delete({ where: { id: fotoId } })
    return foto.storageKey
  })
  await removerArquivos([chave])
}

export async function enviarParaAprovacao(u: UsuarioSessao, id: string) {
  await prisma.$transaction(async (tx) => {
    const a = await travarDoPrestador(tx, u, id)
    const fotosConclusao = await tx.foto.count({ where: { acionamentoId: id, contexto: 'conclusao' } })
    const etapas = await tx.etapa.findMany({ where: { demanda: { acionamentoId: id } }, select: { feita: true } })
    verificarEnvio({ status: a.status, fotosConclusao, etapas, regras: await regrasAtuais(tx) })
    await tx.acionamento.update({
      where: { id },
      data: { status: 'aguardando', eventos: { create: { tipo: 'enviado', autorId: u.id } } },
    })
  })
  return detalharAcionamento(u, id)
}

export async function marcarInviavel(u: UsuarioSessao, id: string, entrada: { comentario: string; arquivos: unknown[] }) {
  if (entrada.arquivos.length > MAX_FOTOS_INVIABILIDADE) {
    throw new ErroHttp(422, 'fotos_demais', `Envie no máximo ${MAX_FOTOS_INVIABILIDADE} fotos`)
  }
  const imagens = await Promise.all(entrada.arquivos.map(lerImagem))
  const chaves: string[] = []
  try {
    await prisma.$transaction(async (tx) => {
      const a = await travarDoPrestador(tx, u, id)
      const comentario = verificarInviabilidade({ status: a.status, comentario: entrada.comentario, fotos: imagens.length })
      const agora = new Date()
      for (const imagem of imagens) {
        const fotoId = randomUUID()
        const chave = `${id}/${fotoId}.${imagem.tipo.extensao}`
        await armazenamento.salvar(chave, imagem.dados, imagem.tipo.mime)
        chaves.push(chave)
        await tx.foto.create({
          data: { id: fotoId, acionamentoId: id, contexto: 'inviabilidade', storageKey: chave, tiradaEm: agora },
        })
      }
      await tx.acionamento.update({
        where: { id },
        data: {
          status: 'aguardando',
          inviavel: true,
          inviabilidadeComentario: comentario,
          iniciadoEm: a.iniciadoEm ?? agora,
          eventos: {
            create: [
              ...(a.iniciadoEm ? [] : [{ tipo: 'iniciado' as const, autorId: u.id, em: agora }]),
              { tipo: 'inviabilidade_enviada' as const, autorId: u.id, em: new Date(agora.getTime() + 1) },
            ],
          },
        },
      })
    })
  } catch (erro) {
    await removerArquivos(chaves)
    throw erro
  }
  return detalharAcionamento(u, id)
}
```
O `+1 ms` no evento da inviabilidade garante a ordem "iniciado" → "inviabilidade enviada" na linha do tempo, que é ordenada por `em`.

- [ ] **Step 3: Rotas**

`apps/api/src/rotas/execucao.ts`:
```ts
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { bodyLimit } from 'hono/body-limit'
import { TAMANHO_MAXIMO_FOTO } from '../arquivos/imagem'
import type { Ambiente } from '../contexto'
import { corpoErro, respostaErro } from '../erros'
import { exigePapel, usuarioLogado } from '../middlewares/acesso'
import {
  ConclusaoPatchSchema,
  DetalheAcionamentoSchema,
  EtapaPatchSchema,
  FotoFormSchema,
  FotoSchema,
  IdParam,
  InviavelFormSchema,
} from '../schemas'
import {
  adicionarFoto,
  atualizarConclusao,
  atualizarEtapa,
  enviarParaAprovacao,
  iniciarAtendimento,
  marcarInviavel,
  MAX_FOTOS_INVIABILIDADE,
  removerFoto,
} from '../servicos/acionamentos'

const apenasPrestador = [exigePapel('prestador')] as const
const detalhe = { description: 'Acionamento atualizado', content: { 'application/json': { schema: DetalheAcionamentoSchema } } }
const errosComuns = {
  401: respostaErro('Sem sessão'),
  403: respostaErro('Só o prestador'),
  404: respostaErro('Não encontrado'),
  409: respostaErro('Status não permite esta ação'),
  422: respostaErro('Dados inválidos'),
}
const EtapaParams = IdParam.extend({ etapaId: z.string().openapi({ param: { name: 'etapaId', in: 'path' } }) })
const FotoParams = IdParam.extend({ fotoId: z.string().openapi({ param: { name: 'fotoId', in: 'path' } }) })

const acao = (caminho: string, resumo: string) =>
  createRoute({
    method: 'post',
    path: `/api/acionamentos/{id}/${caminho}`,
    tags: ['Execução'],
    summary: resumo,
    security: [{ Bearer: [] }],
    middleware: apenasPrestador,
    request: { params: IdParam },
    responses: { 200: detalhe, ...errosComuns },
  })

const rotaIniciar = acao('iniciar', 'Inicia o atendimento')
const rotaEnviar = acao('enviar', 'Envia para aprovação')

const rotaEtapa = createRoute({
  method: 'patch',
  path: '/api/acionamentos/{id}/etapas/{etapaId}',
  tags: ['Execução'],
  summary: 'Marca a etapa e/ou grava o comentário',
  security: [{ Bearer: [] }],
  middleware: apenasPrestador,
  request: { params: EtapaParams, body: { content: { 'application/json': { schema: EtapaPatchSchema } }, required: true } },
  responses: { 200: detalhe, ...errosComuns },
})

const rotaConclusao = createRoute({
  method: 'patch',
  path: '/api/acionamentos/{id}/conclusao',
  tags: ['Execução'],
  summary: 'Grava o comentário final para o gestor',
  security: [{ Bearer: [] }],
  middleware: apenasPrestador,
  request: { params: IdParam, body: { content: { 'application/json': { schema: ConclusaoPatchSchema } }, required: true } },
  responses: { 200: detalhe, ...errosComuns },
})

const limiteFoto = bodyLimit({
  maxSize: TAMANHO_MAXIMO_FOTO + 512 * 1024,
  onError: (c) => c.json(corpoErro('arquivo_grande', 'A foto passa de 10 MB'), 413),
})
const limiteInviavel = bodyLimit({
  maxSize: MAX_FOTOS_INVIABILIDADE * TAMANHO_MAXIMO_FOTO + 512 * 1024,
  onError: (c) => c.json(corpoErro('arquivo_grande', 'As fotos passam do limite'), 413),
})

const rotaFoto = createRoute({
  method: 'post',
  path: '/api/acionamentos/{id}/fotos',
  tags: ['Execução'],
  summary: 'Envia uma foto da etapa ou da conclusão (JPEG, PNG, WebP ou HEIC, até 10 MB)',
  security: [{ Bearer: [] }],
  middleware: [limiteFoto, ...apenasPrestador] as const,
  request: { params: IdParam, body: { content: { 'multipart/form-data': { schema: FotoFormSchema } }, required: true } },
  responses: {
    201: { description: 'Foto gravada', content: { 'application/json': { schema: FotoSchema } } },
    ...errosComuns,
    413: respostaErro('Foto grande demais'),
    415: respostaErro('Arquivo não é imagem'),
  },
})

const rotaRemoverFoto = createRoute({
  method: 'delete',
  path: '/api/acionamentos/{id}/fotos/{fotoId}',
  tags: ['Execução'],
  summary: 'Remove uma foto da etapa ou da conclusão',
  security: [{ Bearer: [] }],
  middleware: apenasPrestador,
  request: { params: FotoParams },
  responses: {
    200: { description: 'Removida', content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } } },
    ...errosComuns,
  },
})

const rotaInviavel = createRoute({
  method: 'post',
  path: '/api/acionamentos/{id}/inviavel',
  tags: ['Execução'],
  summary: 'Marca como inviável (motivo + pelo menos 1 foto)',
  security: [{ Bearer: [] }],
  middleware: [limiteInviavel, ...apenasPrestador] as const,
  request: { params: IdParam, body: { content: { 'multipart/form-data': { schema: InviavelFormSchema } }, required: true } },
  responses: {
    200: detalhe,
    ...errosComuns,
    413: respostaErro('Fotos grandes demais'),
    415: respostaErro('Arquivo não é imagem'),
  },
})

const comoLista = (valor: unknown): unknown[] => (valor === undefined ? [] : Array.isArray(valor) ? valor : [valor])

export const rotasExecucao = new OpenAPIHono<Ambiente>()
  .openapi(rotaIniciar, async (c) => c.json(await iniciarAtendimento(usuarioLogado(c), c.req.valid('param').id), 200))
  .openapi(rotaEnviar, async (c) => c.json(await enviarParaAprovacao(usuarioLogado(c), c.req.valid('param').id), 200))
  .openapi(rotaEtapa, async (c) => {
    const { id, etapaId } = c.req.valid('param')
    return c.json(await atualizarEtapa(usuarioLogado(c), id, etapaId, c.req.valid('json')), 200)
  })
  .openapi(rotaConclusao, async (c) =>
    c.json(await atualizarConclusao(usuarioLogado(c), c.req.valid('param').id, c.req.valid('json').comentario), 200),
  )
  .openapi(rotaFoto, async (c) => {
    const form = c.req.valid('form')
    const foto = await adicionarFoto(usuarioLogado(c), c.req.valid('param').id, {
      arquivo: form.arquivo,
      contexto: form.contexto,
      etapaId: form.etapaId,
      tiradaEm: form.tiradaEm,
    })
    return c.json(foto, 201)
  })
  .openapi(rotaRemoverFoto, async (c) => {
    const { id, fotoId } = c.req.valid('param')
    await removerFoto(usuarioLogado(c), id, fotoId)
    return c.json({ ok: true as const }, 200)
  })
  .openapi(rotaInviavel, async (c) => {
    const form = c.req.valid('form')
    const detalheAtualizado = await marcarInviavel(usuarioLogado(c), c.req.valid('param').id, {
      comentario: form.comentario,
      arquivos: comoLista(form.arquivos),
    })
    return c.json(detalheAtualizado, 200)
  })
```

`apps/api/src/rotas/arquivos.ts`:
```ts
import { Hono } from 'hono'
import { armazenamento } from '../arquivos'
import { assinaturaValida } from '../arquivos/assinatura'
import { mimeDaChave } from '../arquivos/imagem'
import type { Ambiente } from '../contexto'
import { prisma } from '../db'
import { corpoErro } from '../erros'
import { PREFIXO_PLACEHOLDER } from '../servicos/serializacao'

/** Leitura das fotos por URL assinada: funciona em <img> sem cookie nem Bearer. */
export const rotasArquivos = new Hono<Ambiente>().get('/api/arquivos/fotos/:id', async (c) => {
  const id = c.req.param('id')
  const { exp = '', sig = '' } = c.req.query()
  if (!assinaturaValida(id, exp, sig)) {
    return c.json(corpoErro('assinatura_invalida', 'Link da foto inválido ou expirado'), 403)
  }
  const foto = await prisma.foto.findUnique({ where: { id }, select: { storageKey: true } })
  const dados =
    foto && !foto.storageKey.startsWith(PREFIXO_PLACEHOLDER) ? await armazenamento.abrir(foto.storageKey) : null
  if (!foto || !dados) return c.json(corpoErro('nao_encontrado', 'Foto não encontrada'), 404)
  return c.body(dados, 200, {
    'Content-Type': mimeDaChave(foto.storageKey),
    'Cache-Control': 'private, max-age=3600',
  })
})
```

Em `apps/api/src/app.ts`: `app.route('/', rotasExecucao)` e `app.route('/', rotasArquivos)`, junto das outras rotas.

- [ ] **Step 4: Rodar tudo, typecheck, commit**

Run: `pnpm --filter @kgb/api test && pnpm --filter @kgb/api typecheck && pnpm lint`
Expected: PASS, incluindo `gestao.test.ts` inteiro.

```bash
git add -A
git commit -m "feat(api): execução pelo prestador, fotos e leitura por URL assinada

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Início do prestador, cliente gerado e documentação

**Files:**
- Create: `apps/api/src/rotas/prestador.ts`
- Modify: `apps/api/src/servicos/acionamentos.ts` (`inicioDoPrestador`), `apps/api/src/app.ts`, `packages/api-client/{openapi.json,src/schema.d.ts,src/index.ts}`, `README.md`
- Test: `apps/api/src/rotas/prestador.test.ts`

**Interfaces:**
- Consumes: `calcularInicio` (Task 1), `paraResumo` e `incluirResumo` (Task 3).
- Produces:
  - `GET /api/prestador/inicio` → `InicioPrestador`.
  - Tipos exportados por `@kgb/api-client`: `ResumoAcionamento`, `DetalheAcionamento`, `Foto`, `TipoDemanda`, `PrestadorOpcao` e `InicioPrestador`.

- [ ] **Step 1: Teste (falha)**

`apps/api/src/rotas/prestador.test.ts`:
```ts
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, semear } from '@kgb/db/seed'
import { beforeAll, describe, expect, it } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { prisma } from '../db'

const app = criarApp()

describe('GET /api/prestador/inicio', () => {
  beforeAll(async () => {
    await semear(prisma)
  })

  it('traz o próximo atendimento, a agenda de hoje, as métricas e a rota — como no protótipo', async () => {
    const r = await app.request('/api/prestador/inicio', { headers: await entrar(app, EMAIL_PRESTADOR_DEV) })
    expect(r.status).toBe(200)
    const inicio = await r.json()
    expect(inicio.proximo).toMatchObject({ titulo: 'Vazamento no teto do banheiro', inicio: '10:30', fim: '12:30' })
    expect(inicio.hoje.map((a: { titulo: string }) => a.titulo)).toEqual([
      'Limpeza de ar-condicionado',
      'Vazamento no teto do banheiro',
      'Ponto de luz na recepção',
    ])
    expect(inicio.metricas).toMatchObject({ hoje: 3, paraCorrigir: 1 })
    expect(inicio.metricas.aprovacao.taxa).toBeGreaterThan(0)
    expect(inicio.rotaDoDia).toEqual([
      'Rua Bela Cintra, 1200 · Consolação',
      'Rua Haddock Lobo, 595 · Cerqueira César',
    ])
  })

  it('é só para o prestador', async () => {
    const r = await app.request('/api/prestador/inicio', { headers: await entrar(app, GESTORA_DEV.email) })
    expect(r.status).toBe(403)
  })
})
```

Run: `pnpm --filter @kgb/api exec vitest run src/rotas/prestador.test.ts`
Expected: FAIL (a rota responde 404).

- [ ] **Step 2: Implementação**

Acrescentar em `apps/api/src/servicos/acionamentos.ts`:
```ts
import { dataSP } from '../dominio/datas'
import { calcularInicio } from '../dominio/inicio-prestador'

export async function inicioDoPrestador(u: UsuarioSessao) {
  const vazio = {
    proximo: null,
    hoje: [],
    metricas: { hoje: 0, noMes: 0, aprovacao: { taxa: 0, dePrimeira: null }, paraCorrigir: 0 },
    rotaDoDia: [],
  }
  if (!u.prestadorId) return vazio
  const lista = await prisma.acionamento.findMany({
    where: { prestadorId: u.prestadorId },
    include: { ...incluirResumo, revisoes: { orderBy: { em: 'asc' }, select: { decisao: true } } },
  })
  const resumos = new Map(lista.map((a) => [a.id, paraResumo(a)]))
  const calculo = calcularInicio(
    lista.map((a) => ({
      id: a.id,
      data: a.data.toISOString().slice(0, 10),
      inicio: a.inicio,
      status: a.status,
      inviavel: a.inviavel,
      endereco: a.endereco,
      revisoes: a.revisoes.map((r) => r.decisao),
    })),
    dataSP(new Date()),
  )
  return {
    proximo: calculo.proximoId ? resumos.get(calculo.proximoId)! : null,
    hoje: calculo.hojeIds.map((id) => resumos.get(id)!),
    metricas: calculo.metricas,
    rotaDoDia: calculo.rotaDoDia,
  }
}
```

`apps/api/src/rotas/prestador.ts`:
```ts
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import type { Ambiente } from '../contexto'
import { respostaErro } from '../erros'
import { exigePapel, usuarioLogado } from '../middlewares/acesso'
import { InicioPrestadorSchema } from '../schemas'
import { inicioDoPrestador } from '../servicos/acionamentos'

const rotaInicio = createRoute({
  method: 'get',
  path: '/api/prestador/inicio',
  tags: ['Prestador'],
  summary: 'Próximo atendimento, agenda de hoje, métricas e rota do dia',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('prestador')] as const,
  responses: {
    200: { description: 'Início', content: { 'application/json': { schema: InicioPrestadorSchema } } },
    401: respostaErro('Sem sessão'),
    403: respostaErro('Só o prestador'),
  },
})

export const rotasPrestador = new OpenAPIHono<Ambiente>().openapi(rotaInicio, async (c) =>
  c.json(await inicioDoPrestador(usuarioLogado(c)), 200),
)
```

Em `apps/api/src/app.ts`: `app.route('/', rotasPrestador)`.

- [ ] **Step 3: Cliente gerado e tipos**

Run: `pnpm api:generate`

Acrescentar em `packages/api-client/src/index.ts`:
```ts
export type ResumoAcionamento = components['schemas']['ResumoAcionamento']
export type DetalheAcionamento = components['schemas']['DetalheAcionamento']
export type Foto = components['schemas']['Foto']
export type TipoDemanda = components['schemas']['TipoDemanda']
export type PrestadorOpcao = components['schemas']['PrestadorOpcao']
export type InicioPrestador = components['schemas']['InicioPrestador']
```

No `README.md`, na lista de variáveis do "Primeira vez", explicar `ARQUIVOS_DIR`: é a pasta das fotos no dev (padrão `var/uploads`), e o S3 ou R2 entra pela interface `Armazenamento` quando houver deploy.

- [ ] **Step 4: Verificação completa e commit**

Run: `pnpm lint && pnpm format:check && pnpm typecheck && pnpm test && pnpm api:generate && git diff --exit-code -- packages/api-client/openapi.json`
Expected: tudo verde e nenhuma diferença no OpenAPI, porque ele já foi regenerado.

```bash
git add -A
git commit -m "feat(api): dados do Início do prestador e cliente regenerado

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
