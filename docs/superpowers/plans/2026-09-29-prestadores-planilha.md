# Prestadores — etapa 2 (planilha) · plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** API da planilha de credenciados (prévia sem gravar, importação em transação com auditoria, exportação e modelo `.xlsx`) e, no gestor, as ações de exportar e baixar o modelo e o modal "Conferir importação", pixel perfect com o protótipo.

**Architecture:** Regras puras em `apps/api/src/dominio/planilha.ts` (cabeçalhos e aliases, encoding e separador do CSV, mapeamento das linhas, prévia com selos e ausentes, linhas da exportação). A leitura e a escrita com SheetJS, o banco e a transação ficam em `servicos/planilha.ts`, e as quatro rotas em `rotas/planilha.ts` (já registradas antes do cadastro). A auditoria é uma tabela nova (`importacao_planilha`), sem chave estrangeira. No gestor, tudo em `apps/gestor/src/prestadores/planilha/`: textos puros (`textos.ts`), downloads (`acoes.ts`), estado da prévia e mutação da importação (`estado.ts`) e o modal (`ModalImportacao.vue`).

**Tech Stack:** Hono + @hono/zod-openapi, SheetJS 0.20.3 (`xlsx`, já em `apps/api`), Prisma 7.10 (Postgres), Vitest; Vue 3 + @tanstack/vue-query + openapi-fetch (`parseAs: 'blob'`, `bodySerializer`); Playwright/pixelmatch no `tools/visual`.

**Spec:** `docs/superpowers/specs/2026-09-29-telas-restantes-design.md` (seção "Prestadores e planilha (gestor)", "API da planilha"), com o levantamento `docs/superpowers/specs/2026-09-29-telas-restantes/prestadores.md` (regras 16–22, "Conferir importação", textos). Protótipo: `docs/design/Acionamentos.dc.html` H478–514 (modal) e H1195–1233 (lógica); `docs/design/acionamentos-data.js` D98–104 (SheetJS).

## Global Constraints

- Pixel perfect: medidas, cores e textos do CSS inline do protótipo; `pnpm visual` ≤ 0,2 % da região e ≤ 2 % do conteúdo; divergência se corrige no CSS, nunca no limite.
- `line-height: normal`; `<button>` sem padding explícito herda `1px 6px`.
- Ícones só com `<RussoIcone>`.
- O gestor fala com a API só via `@kgb/api-client` (`components['schemas'][…]`).
- Nomes de domínio em português; regras de negócio com TDD na API.
- Testes de banco só em `DATABASE_URL_TEST` (`kgb_prestadores_test`); testes que mudam prestadores re-semeiam no `afterAll`.
- Arquivos permitidos: `apps/api/src/{rotas/planilha.ts,servicos/planilha.ts,dominio/planilha.ts,dominio/erros-planilha.ts}` (e testes; os do cadastro também, se precisar), uma migração nova `packages/db/prisma/migrations/20260929130000_auditoria_planilha/` e só o modelo novo no `schema.prisma`, `apps/gestor/src/prestadores/**`, `tools/visual/casos-prestadores.ts`, `tools/visual/fixtures/**`, este plano e os gerados do api-client. Nada de dependências novas.
- Singular (spec, decisão 1): "1 novo", "1 atualizado", "1 com erro (será ignorado)"; os casos visuais usam contagens maiores que 1.
- Casos visuais não gravam: o passo `anexar` só abre a prévia; importar fica fora.
- Modais: `usarModalAberto()` + `<Teleport defer to="#modais-gestor">`; no mobile o sobreposto sobe 44px (`top: -44px`).
- Commits pequenos em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Decisões desta etapa (onde o spec deixa margem)

1. **Ordem dos selos de erro:** Sem nome → Documento inválido (tamanho) → Duplicado na planilha → Documento inválido (dígito verificador, só quando a linha seria **Novo**) → Telefone inválido (10 ou 11 dígitos, como no formulário; vazio também). Só linhas válidas entram no "já visto": a primeira linha **válida** de um documento vence.
2. **Leitura como texto:** CSV lido com `raw: true` (tudo texto): um CPF "01234567890" mantém o zero (o protótipo perdia). Em `.xlsx`, célula numérica vira `String(n)`; célula de data (formato de data) vira `AAAA-MM-DD` pelo serial (`SSF.parse_date_code`), sem fuso.
3. **Arquivo binário x texto:** assinatura ZIP (`PK\x03\x04`, `.xlsx`) ou OLE2 (`D0 CF 11 E0`, `.xls`) vai direto ao SheetJS; o resto é texto (CSV): BOM → UTF-8; UTF-8 válido → UTF-8; senão Windows-1252; separador `;` se houver mais `;` que `,` na primeira linha (fora de aspas), senão `,`.
4. **Cabeçalho:** a primeira linha não vazia. Aliases do protótipo mais `credenciadodesde` (o spec manda ler "Credenciado desde"). Colunas repetidas: vale o primeiro valor não vazio.
5. **Datas aceitas em "Credenciado desde":** célula de data do Excel, `DD/MM/AAAA` (ou `D/M/AAAA`) e `AAAA-MM-DD`, com dia de calendário válido entre 1900 e 2100.
6. **Especialidades repetidas** na mesma linha são gravadas uma vez (a chave da tabela de junção não aceita repetição); a prévia mostra os nomes crus, inclusive os desconhecidos.
7. **Importar sem nenhuma linha válida:** o front não chama a API (botão claro); a API responde 422 `planilha_sem_validas` se chamada assim.
8. **Corrida na importação:** importações ficam em fila (`pg_advisory_xact_lock`); um cadastro concorrente com o mesmo documento vira 409 `planilha_conflito` e nada é gravado.
9. **Auditoria sem chave estrangeira:** `importacao_planilha` guarda `autorId` e `autorNome` (cópia): o seed apaga os usuários, e uma FK travaria o `pnpm db:seed`.
10. **Nome do arquivo baixado:** calculado no front (data de hoje em `America/Sao_Paulo`), porque `Content-Disposition` não é exposto no CORS e o `app.ts` não é desta frente. A API também manda o `Content-Disposition` (para quem abrir a URL direto).
11. **Erros da prévia viram toast** com a mensagem da API: "Não encontramos linhas na planilha" (422 `planilha_vazia`), "Não foi possível ler o arquivo" (422 `planilha_ilegivel`), "A planilha passa de 5 MB" (413), "A planilha passa de 2000 linhas" (422).
12. **Arquivo escolhido de novo enquanto a prévia carrega:** vale o último (um contador descarta as respostas antigas); fechar também descarta.

## Review Focus

- **CSV do Excel pt-BR** (Windows-1252, separado por `;`, com "Região" e "Situação" acentuados): cabeçalhos reconhecidos e nomes com acento certos. Teste na Task 3.
- **CPF com zero à esquerda** num CSV ("012.345.678-90" ou "01234567890"): continua com 11 dígitos. Teste na Task 3.
- **CNPJ como número** numa célula `.xlsx` (27415903000144): lido com os 14 dígitos. Teste na Task 3.
- **Documento de um prestador excluído** na planilha: é **Novo** e cria outro registro (índice parcial). Teste na Task 4.
- **Clique duplo em Importar:** um POST só. Teste na Task 7.

---

## Estrutura de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `packages/db/prisma/schema.prisma` | modelo `ImportacaoPlanilha` |
| `packages/db/prisma/migrations/20260929130000_auditoria_planilha/migration.sql` | tabela `importacao_planilha` |
| `apps/api/src/dominio/erros-planilha.ts` | códigos de erro da frente |
| `apps/api/src/dominio/planilha.ts` (+ `.test.ts`) | cabeçalhos, encoding/separador, mapear linhas, prévia, exportação, formatos |
| `apps/api/src/servicos/planilha.ts` (+ `.test.ts` da leitura) | SheetJS (ler e escrever), prévia, importação em transação, exportação, modelo |
| `apps/api/src/rotas/planilha.ts` (+ `.test.ts`) | schemas e rotas |
| `packages/api-client/{openapi.json,src/schema.d.ts}` | gerados |
| `apps/gestor/src/prestadores/planilha/textos.ts` (+ teste) | resumo, ausentes, aviso, nomes dos arquivos |
| `apps/gestor/src/prestadores/planilha/acoes.ts` (+ teste) | exportar e baixar o modelo |
| `apps/gestor/src/prestadores/planilha/estado.ts` (+ teste) | prévia (módulo) e `usarImportarPlanilha` |
| `apps/gestor/src/prestadores/planilha/ModalImportacao.vue` | "Conferir importação" |
| `apps/gestor/src/prestadores/PaginaPrestadores.vue` (+ teste) | abre o modal |
| `tools/visual/fixtures/*.csv`, `LEIAME.md` | planilhas de exemplo |
| `tools/visual/casos-prestadores.ts` | casos da conferência |

---

### Task 1: Tabela de auditoria (db)

**Files:**
- Modify: `packages/db/prisma/schema.prisma` (só o modelo novo, no fim do domínio)
- Create: `packages/db/prisma/migrations/20260929130000_auditoria_planilha/migration.sql`

**Interfaces:**
- Produces: `prisma.importacaoPlanilha.create({ data: { autorId, autorNome, arquivo, novos, atualizados, desativados, ignorados } })`.

- [ ] **Step 1: modelo**

```prisma
/// Auditoria da importação da planilha de credenciados: quem, quando, qual arquivo e as contagens.
/// Sem chave estrangeira para o usuário: o registro é histórico e sobrevive ao seed.
model ImportacaoPlanilha {
  id          String   @id @default(cuid())
  autorId     String
  autorNome   String
  arquivo     String
  em          DateTime @default(now())
  novos       Int
  atualizados Int
  desativados Int
  /// Linhas com erro, ignoradas.
  ignorados   Int

  @@index([em])
  @@map("importacao_planilha")
}
```

- [ ] **Step 2: SQL da migração** (o `migrate dev` é interativo):

```bash
mkdir -p packages/db/prisma/migrations/20260929130000_auditoria_planilha
pnpm --filter @kgb/db exec prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script > packages/db/prisma/migrations/20260929130000_auditoria_planilha/migration.sql
```
Esperado: só `CREATE TABLE "importacao_planilha"` e o `CREATE INDEX`.

- [ ] **Step 3:** `pnpm --filter @kgb/db exec prisma migrate deploy && pnpm --filter @kgb/db exec prisma generate`; `pnpm --filter @kgb/db typecheck`.
- [ ] **Step 4:** commit `feat(db): tabela de auditoria da importação da planilha`.

### Task 2: Domínio da planilha (API, puro)

**Files:**
- Modify: `apps/api/src/dominio/erros-planilha.ts`
- Create: `apps/api/src/dominio/planilha.ts`, `apps/api/src/dominio/planilha.test.ts`

**Interfaces:**
- Consumes: `soDigitos`, `tipoDeDocumento`, `digitosVerificadoresValidos`, `telefoneValido` de `./documentos`; `ErroDominio` de `./acionamento`.
- Produces:
  - `type CodigoErroPlanilha = 'arquivo_obrigatorio' | 'planilha_ilegivel' | 'planilha_vazia' | 'planilha_muitas_linhas' | 'planilha_sem_validas' | 'planilha_conflito'`
  - `CABECALHO_PLANILHA` (8 colunas), `LARGURAS_EXPORTACAO = [26,20,16,30,14,44,10,16]`, `LINHA_MODELO`, `NOME_MODELO = 'modelo-credenciados-russo.xlsx'`, `LIMITE_LINHAS = 2000`, `TAMANHO_MAXIMO_PLANILHA = 5 * 1024 * 1024`
  - `normalizarTexto(s: string): string` (o `norm` do protótipo)
  - `decodificarTexto(bytes: Uint8Array): string`, `detectarSeparador(texto: string): ',' | ';'`
  - `type Celula = string | number | boolean | null | undefined`
  - `interface LinhaLida { nome; documento; telefone; email; regiao; especialidades; status; credenciadoDesde: string }` (textos aparados, `''` se vazio)
  - `mapearTabela(tabela: readonly (readonly Celula[] | null | undefined)[]): LinhaLida[]` (lança `planilha_vazia` / `planilha_muitas_linhas`)
  - `dataDaPlanilha(texto: string): string | null` (`AAAA-MM-DD`)
  - `interface PrestadorExistente { id; nome; documento; status: 'ativo' | 'inativo' }`, `interface TipoAtivo { id; nome }`
  - `type Selo = 'Novo' | 'Atualizar' | 'Sem nome' | 'Documento inválido' | 'Duplicado na planilha' | 'Telefone inválido'`
  - `interface LinhaPrevia { nome; documento; especialidades: string[]; acao: 'novo' | 'atualizar' | 'erro'; selo: Selo }`
  - `interface DadosImportados { nome; documento; telefone; email: string | null; regiao: string | null; especialidades: string[]; status: 'ativo' | 'inativo'; credenciadoDesde: string | null }`
  - `type Gravacao = { acao: 'novo'; dados: DadosImportados } | { acao: 'atualizar'; id: string; dados: DadosImportados }`
  - `interface Previa { linhas: LinhaPrevia[]; resumo: { novos; atualizados; erros }; ausentes: { id; nome }[]; gravacoes: Gravacao[] }`
  - `montarPrevia(lidas, existentes, tipos): Previa` (existentes na ordem de cadastro)
  - `interface PrestadorExportado { nome; documento; telefone; email: string | null; regiao: string | null; especialidades: string[]; status; credenciadoDesde: string }`
  - `linhasDeExportacao(lista): string[][]`, `nomeDaExportacao(hojeIso: string): string`, `formatarDocumento`, `formatarTelefone`

- [ ] **Step 1: testes que falham** (`planilha.test.ts`), com os tipos e prestadores do seed:

```ts
const TIPOS = [{ id: 't1', nome: 'Vazamento' }, { id: 't5', nome: 'Pintura' }, { id: 't7', nome: 'Limpeza de ar-condicionado' }, { id: 't8', nome: 'Chaveiro' }]
const EXISTENTES = [ // ordem de cadastro
  { id: 'p1', nome: 'Carlos Mendes', documento: '31840211750', status: 'ativo' },
  { id: 'p2', nome: 'Ana Ribeiro', documento: '27415903000144', status: 'ativo' },
  { id: 'p5', nome: 'Roberto Alves', documento: '21977438012', status: 'inativo' },
  { id: 'p6', nome: 'Luciana Prado', documento: '41206557000190', status: 'ativo' },
]
const lida = (d: Partial<LinhaLida>): LinhaLida => ({ nome: '', documento: '', telefone: '(11) 91234-5678', email: '', regiao: '', especialidades: '', status: '', credenciadoDesde: '', ...d })
```
Casos:
  - `normalizarTexto('Região ')` → `'regiao'`; `'CPF/CNPJ'` → `'cpfcnpj'`; `'Nome_1'` → `'nome'`.
  - `decodificarTexto`: BOM + UTF-8 → sem o BOM; UTF-8 sem BOM → "João"; bytes Windows-1252 (`4A 6F E3 6F`) → "João".
  - `detectarSeparador('Nome;CPF;"a,b"\n1,2')` → `';'`; `'Nome,CPF;x'` → `','`; vírgulas dentro de aspas não contam.
  - `mapearTabela`: cabeçalho com aliases (`Nome`, `CNPJ`, `Celular`, `Serviços`, `Situação`, `Credenciado desde`) mapeia; `Nome completo` e `Fone` não; linha vazia e linha só com coluna desconhecida são puladas; colunas `CPF` vazia + `CNPJ` preenchida usa o CNPJ; números viram texto (`31840211750`); tabela sem linha aproveitável → `ErroDominio` `planilha_vazia` "Não encontramos linhas na planilha"; 2001 linhas → `planilha_muitas_linhas` "A planilha passa de 2000 linhas"; linhas nulas (esparsas) antes do cabeçalho são ignoradas.
  - `dataDaPlanilha`: `'12/03/2024'` e `'2024-03-12'` → `'2024-03-12'`; `'3/1/2024'` → `'2024-01-03'`; `'31/02/2024'`, `'abc'`, `''` → `null`.
  - `montarPrevia`, selos na ordem da decisão 1:
    - nome vazio → `Sem nome`; `'123'` → `Documento inválido`; segunda linha válida com os mesmos dígitos (formato diferente) → `Duplicado na planilha`; documento novo com DV errado (`'529.982.247-26'`) → `Documento inválido`; documento existente com DV inválido (seed) → `Atualizar`; telefone `'9123'` ou vazio → `Telefone inválido`;
    - uma linha com telefone inválido não conta como "vista": a próxima com o mesmo documento é válida;
    - `Roberto` (inativo) casa como `Atualizar`;
    - `resumo` `{ novos, atualizados, erros }`;
    - `ausentes`: ativos cujo documento não está nas linhas **válidas**, na ordem de cadastro (um documento só em linha com erro conta como ausente);
    - especialidades: `'limpeza de ar condicionado; Jardinagem/Pintura, pintura'` → prévia `['limpeza de ar condicionado', 'Jardinagem', 'Pintura', 'pintura']`, gravação `['t7', 't5']`;
    - status `'Inativo'`/`'inativa'` → inativo; `'Desativado'`, `''` → ativo;
    - gravação normalizada: documento e telefone em dígitos, e-mail/região vazios → `null`, `credenciadoDesde` válido ou `null`.
  - `linhasDeExportacao`: documento e telefone formatados, especialidades `'Vazamento; Pintura'`, status `'Ativo'`/`'Inativo'`, data `'12/03/2024'`, vazios `''`.
  - `nomeDaExportacao('2026-09-29')` → `'credenciados-russo-29-09-2026.xlsx'`.

- [ ] **Step 2:** `pnpm --filter @kgb/api exec vitest run src/dominio/planilha.test.ts` → FAIL (módulo não existe).
- [ ] **Step 3: implementação** (trechos principais):

```ts
export const normalizarTexto = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z]/g, '')

const CAMPOS: Record<string, keyof LinhaLida> = {
  nome: 'nome', cpfcnpj: 'documento', cpf: 'documento', cnpj: 'documento', documento: 'documento',
  telefone: 'telefone', celular: 'telefone', email: 'email', regiao: 'regiao',
  especialidades: 'especialidades', servicos: 'especialidades', status: 'status', situacao: 'status',
  credenciadodesde: 'credenciadoDesde',
}

export function decodificarTexto(bytes: Uint8Array): string {
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return new TextDecoder('utf-8').decode(bytes.subarray(3))
  try { return new TextDecoder('utf-8', { fatal: true }).decode(bytes) } catch { return new TextDecoder('windows-1252').decode(bytes) }
}

export function detectarSeparador(texto: string): ',' | ';' {
  let aspas = false, virgulas = 0, pontoVirgulas = 0
  for (const c of texto) {
    if (c === '"') aspas = !aspas
    else if (!aspas && (c === '\n' || c === '\r')) break
    else if (!aspas && c === ',') virgulas++
    else if (!aspas && c === ';') pontoVirgulas++
  }
  return pontoVirgulas > virgulas ? ';' : ','
}

export function montarPrevia(lidas, existentes, tipos): Previa {
  const porDocumento = new Map(existentes.map((p) => [p.documento, p]))
  const tipoPorNome = new Map(tipos.map((t) => [normalizarTexto(t.nome), t.id]))
  const vistos = new Set<string>()
  // para cada linha: nomes = split(/[;,/]/).trim().filter(Boolean); selo pela ordem da decisão 1;
  // válida → vistos.add(dígitos) e gravação { acao, id?, dados }
  // ausentes = existentes.filter(ativo && !vistos.has(documento)).map(({ id, nome }) => ({ id, nome }))
}
```
  E `erros-planilha.ts` com o union acima.
- [ ] **Step 4:** rodar de novo → PASS.
- [ ] **Step 5:** commit `feat(api): regras da planilha de credenciados (leitura, prévia e exportação)`.

### Task 3: Leitura e escrita com SheetJS (API)

**Files:**
- Create: `apps/api/src/servicos/planilha.ts` (parte da leitura/escrita), `apps/api/src/servicos/planilha.test.ts`

**Interfaces:**
- Consumes: Task 2.
- Produces:
  - `lerPlanilha(bytes: Uint8Array): LinhaLida[]` (lança `planilha_ilegivel`, `planilha_vazia`, `planilha_muitas_linhas`)
  - `gerarXlsx(linhas: readonly (readonly string[])[], larguras?: readonly number[]): Uint8Array` (aba "Credenciados", células texto)

- [ ] **Step 1: testes que falham** (buffers montados no teste, com o próprio SheetJS e `TextEncoder`):
  - CSV UTF-8 com BOM separado por `,`, com aspas e vírgula dentro ("Vazamento, Pintura") → linha certa.
  - CSV Windows-1252 com `;` e cabeçalhos `Região`/`Situação`/`Serviços` → reconhecidos, "João Pires" certo.
  - CSV com "01234567890" → documento `'01234567890'`.
  - `.xlsx` (via `gerarXlsx` e via `aoa_to_sheet` com número 27415903000144 e uma data serial `45363` com formato `dd/mm/yyyy`) → documento `'27415903000144'` e `credenciadoDesde` `'2024-03-12'`.
  - `.xls` (`bookType: 'biff8'`) lido.
  - ZIP quebrado (`50 4B 03 04 01 02`) → `ErroDominio` `planilha_ilegivel` "Não foi possível ler o arquivo".
  - CSV só com cabeçalho → `planilha_vazia`.
  - `gerarXlsx([CABECALHO_PLANILHA, LINHA_MODELO])` relido: aba `Credenciados`, todas as células `t: 's'`, a vazia com `''`, e `'!cols'` com `wch` quando `larguras` é passado.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3: implementação**

```ts
import * as XLSX from 'xlsx'
const ehBinario = (b: Uint8Array) =>
  (b[0] === 0x50 && b[1] === 0x4b && b[2] === 0x03 && b[3] === 0x04) ||
  (b[0] === 0xd0 && b[1] === 0xcf && b[2] === 0x11 && b[3] === 0xe0)

function celula(c: XLSX.CellObject | undefined): Celula {
  if (!c || c.t === 'e' || c.t === 'z') return ''
  if (c.t === 'n' && c.z && XLSX.SSF.is_date(c.z)) {
    const d = XLSX.SSF.parse_date_code(c.v as number)
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  }
  return c.v as Celula
}

export function lerPlanilha(bytes: Uint8Array): LinhaLida[] {
  let livro: XLSX.WorkBook
  try {
    if (ehBinario(bytes)) livro = XLSX.read(bytes, { type: 'buffer', dense: true, cellNF: true })
    else {
      const texto = decodificarTexto(bytes)
      livro = XLSX.read(texto, { type: 'string', raw: true, dense: true, FS: detectarSeparador(texto) })
    }
  } catch { throw new ErroDominio('planilha_ilegivel', 'Não foi possível ler o arquivo') }
  const aba = livro.Sheets[livro.SheetNames[0] ?? '']
  const dados = aba?.['!data'] ?? []
  return mapearTabela(dados.map((linha) => linha?.map(celula)))
}
```
  (`dados.map` preserva os buracos; `mapearTabela` pula `undefined`.)
- [ ] **Step 4:** rodar → PASS.
- [ ] **Step 5:** commit `feat(api): leitura e escrita da planilha com SheetJS`.

### Task 4: Serviço e rotas da planilha (API)

**Files:**
- Modify: `apps/api/src/servicos/planilha.ts`, `apps/api/src/rotas/planilha.ts`
- Create: `apps/api/src/rotas/planilha.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3; `prisma`, `dataSP`, `corDoPrestador`, `ErroHttp`, `exigePapel`, `usuarioLogado`.
- Produces (OpenAPI, usados pelo gestor via `components['schemas']`):
  - `PreviaPlanilha { linhas: { nome, documento, especialidades: string[], acao: 'novo'|'atualizar'|'erro', selo: Selo }[], resumo: { novos, atualizados, erros }, ausentes: { id, nome }[] }`
  - `ResultadoImportacao { novos, atualizados, desativados }`
  - `POST /api/prestadores/planilha/previa` (multipart `arquivo`) → 200 · 401 · 403 · 413 · 422
  - `POST /api/prestadores/planilha/importacao` (multipart `arquivo`, `desativarAusentes: 'true' | 'false'`) → 200 · 401 · 403 · 409 · 413 · 422
  - `GET /api/prestadores/planilha` → 200 `.xlsx` (`Content-Disposition: attachment; filename="credenciados-russo-DD-MM-AAAA.xlsx"`)
  - `GET /api/prestadores/planilha/modelo` → 200 `.xlsx` (`modelo-credenciados-russo.xlsx`)

- [ ] **Step 1: testes de integração que falham** (`beforeAll(semear)`, `afterAll(semear)`; CSVs montados no teste):
  - prévia: CSV do exemplo (Carlos, Ana, Pedro novo, Fernanda novo com CNPJ válido, Roberto, sem nome, doc curto, Carlos repetido) → linhas, selos, resumo `{2,3,3}`, ausentes `João Pires, Marina Costa, Luciana Prado` (ordem de cadastro); **nada gravado** (contagem de prestadores igual).
  - prévia: sem arquivo → 422 `arquivo_obrigatorio`; só cabeçalho → 422 `planilha_vazia`; ZIP quebrado → 422 `planilha_ilegivel`; 5 MB + 1 byte → 413 `planilha_grande`; 401 sem sessão; 403 prestador.
  - importação: aplica numa transação → `{ novos: 2, atualizados: 3, desativados: 0 }`; Pedro criado com dígitos, cor `corDoPrestador(6)` e Fernanda `corDoPrestador(7)`, status da planilha, `credenciadoDesde` hoje (vazio) ou a data da planilha; Carlos sobrescrito (nome, telefone, e-mail, região, especialidades na ordem, status) **mantendo cor**; data mantida quando a célula é vazia e trocada quando é válida; Roberto reativado se a planilha diz "Ativo"; um registro em `importacao_planilha` com autor, arquivo e contagens (`ignorados: 3`).
  - importação com `desativarAusentes=true` → os ausentes ficam inativos e `desativados: 3`.
  - importação só com erros → 422 `planilha_sem_validas`, nada gravado e nenhuma auditoria.
  - documento de prestador **excluído** → selo `Novo` e cria outro registro.
  - especialidade de tipo excluído não casa.
  - exportação: `content-type` do xlsx, `content-disposition` com a data de hoje em SP; relida: cabeçalho, prestadores não excluídos na ordem de cadastro, Carlos `'318.402.117-50'`, `'(11) 98734-2210'`, `'Vazamento; Revisão elétrica; Ponto de luz; Troca de disjuntor'`, `'Ativo'`, `'12/03/2024'`; larguras.
  - modelo: cabeçalho + `LINHA_MODELO`.
  - as quatro rotas: 401 sem sessão e 403 para prestador.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3: serviço**

```ts
async function bytesDe(arquivo: unknown): Promise<{ nome: string; bytes: Uint8Array }> {
  if (!(arquivo instanceof File)) throw new ErroDominio('arquivo_obrigatorio', 'Envie o arquivo da planilha')
  if (arquivo.size > TAMANHO_MAXIMO_PLANILHA) throw new ErroHttp(413, 'planilha_grande', 'A planilha passa de 5 MB')
  return { nome: arquivo.name, bytes: new Uint8Array(await arquivo.arrayBuffer()) }
}
const existentes = (db: Db) => db.prestador.findMany({ where: { excluidoEm: null }, orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }], select: { id: true, nome: true, documento: true, status: true } })
const tiposAtivos = (db: Db) => db.tipoDemanda.findMany({ where: { excluidoEm: null }, select: { id: true, nome: true } })

export async function previaDaPlanilha(arquivo: unknown): Promise<PreviaPublica> { /* lê, monta, devolve sem gravacoes */ }

export async function importarPlanilha(arquivo: unknown, { desativarAusentes, autor }): Promise<ResultadoImportacao> {
  const { nome, bytes } = await bytesDe(arquivo)
  const lidas = lerPlanilha(bytes)
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('importacao_planilha'))`
      const previa = montarPrevia(lidas, await existentes(tx), await tiposAtivos(tx))
      if (previa.resumo.novos + previa.resumo.atualizados === 0) throw new ErroDominio('planilha_sem_validas', 'Nenhuma linha da planilha pode ser importada')
      const hoje = dataPura(dataSP(new Date()))
      let posicao = await tx.prestador.count()
      const especialidades: { prestadorId: string; tipoId: string; ordem: number }[] = []
      const atualizados: string[] = []
      for (const g of previa.gravacoes) {
        const { especialidades: tipos, credenciadoDesde, ...campos } = g.dados
        let id: string
        if (g.acao === 'novo') {
          id = (await tx.prestador.create({ data: { ...campos, cor: corDoPrestador(posicao++), credenciadoDesde: credenciadoDesde ? dataPura(credenciadoDesde) : hoje }, select: { id: true } })).id
        } else {
          id = g.id
          atualizados.push(id)
          await tx.prestador.update({ where: { id }, data: { ...campos, ...(credenciadoDesde ? { credenciadoDesde: dataPura(credenciadoDesde) } : {}) } })
        }
        tipos.forEach((tipoId, ordem) => especialidades.push({ prestadorId: id, tipoId, ordem }))
      }
      await tx.prestadorEspecialidade.deleteMany({ where: { prestadorId: { in: atualizados } } })
      await tx.prestadorEspecialidade.createMany({ data: especialidades })
      const desativados = desativarAusentes && previa.ausentes.length
        ? (await tx.prestador.updateMany({ where: { id: { in: previa.ausentes.map((a) => a.id) } }, data: { status: 'inativo' } })).count
        : 0
      const resultado = { novos: previa.resumo.novos, atualizados: previa.resumo.atualizados, desativados }
      await tx.importacaoPlanilha.create({ data: { autorId: autor.id, autorNome: autor.nome, arquivo: nome, ...resultado, ignorados: previa.resumo.erros } })
      return resultado
    }, { timeout: 60_000 })
  } catch (e) {
    if ((e as { code?: unknown })?.code === 'P2002') throw new ErroDominio('planilha_conflito', 'Os cadastros mudaram durante a importação. Confira a planilha de novo.', 409)
    throw e
  }
}

export async function planilhaDeCredenciados() { /* findMany não excluídos, ordem de cadastro, com especialidades (tipos não excluídos, por ordem) → linhasDeExportacao → gerarXlsx([CABECALHO, ...], LARGURAS) ; nome = nomeDaExportacao(dataSP(new Date())) */ }
export const modeloDaPlanilha = () => ({ nome: NOME_MODELO, conteudo: gerarXlsx([[...CABECALHO_PLANILHA], LINHA_MODELO]) })
```

- [ ] **Step 4: rotas** (`bodyLimit` de 5 MB + 64 KB com `onError` 413 `planilha_grande`; `exigePapel('gestor')`; tag `Prestadores`; conteúdo `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` com `z.string().openapi({ format: 'binary' })`; handlers de arquivo devolvem `c.body(conteudo, 200, { 'Content-Type', 'Content-Disposition' })`).
- [ ] **Step 5:** rodar → PASS; `pnpm --filter @kgb/api typecheck`.
- [ ] **Step 6:** `pnpm api:generate`; commit `feat(api): prévia, importação com auditoria, exportação e modelo da planilha` com os gerados.

### Task 5: Textos e downloads (gestor)

**Files:**
- Create: `apps/gestor/src/prestadores/planilha/textos.ts`, `textos.test.ts`, `acoes.test.ts`
- Modify: `apps/gestor/src/prestadores/planilha/acoes.ts`

**Interfaces:**
- Produces:
  - `resumoDaPrevia({ novos, atualizados, erros }): string` ("2 novos · 3 atualizados · 3 com erro (serão ignorados)"; "1 novo · 1 atualizado · 1 com erro (será ignorado)"; sem erros, sem o terceiro trecho)
  - `textoDosAusentes(nomes: readonly string[]): string` ("1 credenciado ativo não está na planilha: X"; "3 credenciados ativos não estão na planilha: A, B, C")
  - `avisoDeImportacao({ novos, atualizados }): string` ("Planilha importada: 2 novos, 3 atualizados"; singular)
  - `nomeDaExportacao(agora: Date): string` (data de SP: `credenciados-russo-29-09-2026.xlsx`)
  - `NOME_MODELO = 'modelo-credenciados-russo.xlsx'`
  - `exportarPlanilha()`: `api.GET('/api/prestadores/planilha', { parseAs: 'blob' })` → salva com `nomeDaExportacao(new Date())` e toast "Planilha exportada"; erro → "Falha ao exportar".
  - `baixarModeloPlanilha()`: idem com `/modelo`, `NOME_MODELO`, sem toast de sucesso; erro → "Falha ao baixar modelo".

- [ ] Step 1: testes (textos; `nomeDaExportacao(new Date('2026-09-30T01:30:00Z'))` → `'credenciados-russo-29-09-2026.xlsx'` (ainda 29 em SP); ações com `api` simulado e `URL.createObjectURL`/`HTMLAnchorElement.click` espionados: nome do download, toasts de sucesso e de falha, `parseAs: 'blob'`) → FAIL.
- [ ] Step 2: implementação:

```ts
function salvar(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nome
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
```
  → PASS.
- [ ] Step 3: commit `feat(gestor): exportar planilha e baixar o modelo`.

### Task 6: Estado da importação (gestor)

**Files:**
- Modify: `apps/gestor/src/prestadores/planilha/estado.ts`
- Create: `apps/gestor/src/prestadores/planilha/estado.test.ts`

**Interfaces:**
- Consumes: `api`, `exigir`, `mensagemDeErro`, `toastGestor`, `sessao`, `CHAVES_PRESTADORES`.
- Produces:
  - `type PreviaPlanilha = components['schemas']['PreviaPlanilha']`
  - `importacao = { arquivo: Readonly<Ref<File | null>>; previa: Readonly<Ref<PreviaPlanilha | null>>; desativarAusentes: Readonly<Ref<boolean>>; abrir(arquivo: File): Promise<void>; alternarDesativar(): void; fechar(): void }`
  - `usarImportarPlanilha()` → `mutateAsync({ arquivo: File; desativarAusentes: boolean }): Promise<ResultadoImportacao>`; invalida `['prestadores']` no sucesso.
  - `formularioPlanilha(arquivo: File, campos?: Record<string, string>): FormData`

- [ ] Step 1: testes: `abrir` envia multipart com `arquivo` (nome original) e, com sucesso, preenche `arquivo`, `previa` e zera `desativarAusentes`; erro da API vira toast com a mensagem e não abre; dois `abrir` seguidos → vale o último, mesmo se o primeiro responder depois; `fechar` durante a prévia descarta a resposta; troca de usuário da sessão fecha; `usarImportarPlanilha` manda `desativarAusentes` `'true'`/`'false'` e invalida o cadastro → FAIL.
- [ ] Step 2: implementação (`bodySerializer: () => formularioPlanilha(arquivo)` e `body: {} as never`, como no prestador) → PASS.
- [ ] Step 3: commit `feat(gestor): prévia e importação da planilha (estado)`.

### Task 7: Modal "Conferir importação" (gestor)

**Files:**
- Create: `apps/gestor/src/prestadores/planilha/ModalImportacao.vue`
- Modify: `apps/gestor/src/prestadores/PaginaPrestadores.vue`, `PaginaPrestadores.test.ts`

**CSS do protótipo (H478–514):**
- sobreposto igual ao do formulário (`align-items: flex-start; overflow: auto; padding: 24px 12px`; compacto `top: -44px`);
- painel `max-width: 760px`, raio 24, padding 24, `flex column; gap 16`;
- cabeçalho `flex; align-items: center; gap 12`: `sheet` 24px; bloco `flex: 1; min-width: 0` com título 18/700 `#2C3143` e arquivo 13px `#8F8D8D` `nowrap` + ellipsis; fechar 36×36 raio 12 `#EFF1F3` com `cancel` 18 (padding `1px 6px` herdado);
- resumo 14/600 `#262A3B`;
- lista `max-height: 320px; overflow: auto; border: 1px solid #E5E5E5; border-radius: 16px`;
- linha `flex; wrap; align-items: center; gap: 6px 14px; padding: 10px 16px; border-bottom: 1px solid #E5E5E5`; nome (`flex: 2 1 180px; min-width: 0`) 14/600 `#2C3143` + documento 12px `#8F8D8D`; especialidades (`flex: 2 1 160px; min-width: 0`) 12px `#50555C`; selo 12/600, `3px 10px`, raio 999, `nowrap` — Novo `#E6F0FA`/`#004E8F`, Atualizar `#EFF1F3`/`#363853`, erro `#FFD7D4`/`#B8342A`;
- bloco dos ausentes: `<button>` `border: 0; background: #F9F9F9; border-radius: 16px; padding: 14px 16px; flex; align-items: center; gap: 14px; text-align: left`, `<Interruptor :animar-trilho="false">`, textos em coluna `gap 2`: 14/600 `#2C3143` e 12px `#50555C`;
- ações `flex-end; gap 12`: Cancelar 48 `0 20px` `#EFF1F3`/`#363853`; Importar 48 `0 24px`, `#0069BD`/`#fff` ou `#CCE1F2`/`#004E8F` sem nada a importar (sem `disabled`).

- [ ] Step 1: testes da página: anexar um arquivo mostra o modal com o nome, o resumo, as linhas ("(sem nome)", "—" sem documento ou especialidades, especialidades com ", ") e os selos com a classe da ação; bloco dos ausentes com o texto e o switch `aria-pressed`; sem ausentes, sem bloco; Importar → POST com `desativarAusentes`, fecha, toast "Planilha importada: 2 novos, 3 atualizados" e recarrega o cadastro; Importar claro não chama a API; clique duplo → um POST; erro da API → toast e modal continua; Cancelar/X/Esc fecham sem gravar; prévia com erro → toast e sem modal → FAIL.
- [ ] Step 2: implementação → PASS.
- [ ] Step 3: commit `feat(gestor): modal Conferir importação`.

### Task 8: Casos visuais e ajuste fino

**Files:** Create `tools/visual/fixtures/credenciados.csv`, `credenciados-completa.csv`, `credenciados-com-erros.csv`; Modify `tools/visual/fixtures/LEIAME.md`, `tools/visual/casos-prestadores.ts`.

Fixtures (UTF-8 com BOM; documentos novos com DV válido e telefones com DDD, para o app e o protótipo darem os mesmos selos):
- `credenciados.csv` (`,`): Carlos, Ana, Pedro Lima (novo), Fernanda Souza (novo, CNPJ), Roberto (Inativo), sem nome, "Bruno Castro" com documento curto, "Carlos M." repetindo Carlos → "2 novos · 3 atualizados · 3 com erro (serão ignorados)", ausentes João, Marina e Luciana.
- `credenciados-completa.csv` (`;`): os 6 do seed + Pedro e Fernanda → "2 novos · 6 atualizados", sem ausentes.
- `credenciados-com-erros.csv` (`,`): duas linhas com erro → "0 novos · 0 atualizados · 2 com erro (serão ignorados)", 5 ausentes, Importar claro.

Casos (o clique no título espera o modal abrir nos dois lados, inclusive o SheetJS do protótipo vindo da CDN, e não muda nada):
`gestor-web-prestadores-importar`, `-importar-desativar` (+ `Desativar quem não está na planilha`, `inicio`), `-importar-completa`, `-importar-com-erros`, `gestor-mobile-prestadores-importar`.

- [ ] Step 1: subir API (3012) e gestor (5212); `pnpm db:seed && URL_GESTOR=http://localhost:5212 pnpm visual -- --app=gestor`.
- [ ] Step 2: corrigir no CSS cada região fora do limite (`tools/visual/.saida/*--diff.png`).
- [ ] Step 3: commit `test(visual): casos da conferência da importação`.

### Task 9: Verificação final

- [ ] `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm api:generate` + `git status --porcelain packages/api-client` vazio, e a comparação visual com o seed do dia.
- [ ] Derrubar só os processos das portas 3012 e 5212.
