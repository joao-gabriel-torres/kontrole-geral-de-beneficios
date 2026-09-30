<!-- Mapa do código e proposta de esqueleto para o trabalho em paralelo, 29/09/2026. O esqueleto de fato está nos commits c633418..334548f. -->

# Mapa do monorepo para as telas restantes (Painel, Prestadores, Checklists, Agenda)

Levantamento feito só com leitura, em `feat/telas-restantes` (e4385c1, igual à `main`). Nenhum arquivo foi alterado e nenhum servidor foi iniciado.

## Resumo

- **API:** cada tela ganha o próprio arquivo de rotas, com schemas zod, `createRoute` e o handler (`apps/api/src/rotas/*.ts`). O registro é feito uma vez em `app.ts`. As regras ficam como funções puras em `dominio/`, e o acesso ao banco em `servicos/`.
- **O que falta na API:**
  - A **Agenda não precisa de API nova**: o `GET /api/acionamentos` já devolve só os acionamentos do prestador.
  - O **Painel precisa de um endpoint de KPIs**. A fila pode reusar `GET /api/acionamentos?status=aguardando`.
  - **Prestadores e Checklists precisam de CRUD inteiro**, e Prestadores também da planilha.
- **Nenhuma lib de xlsx está instalada** (nada em `package.json`, `pnpm-lock.yaml` nem `node_modules/.pnpm`). O protótipo carrega o SheetJS 0.20.3 do CDN.
- **Principais conflitos entre agentes em paralelo:**
  - Arquivos gerados: `openapi.json` e `schema.d.ts`.
  - Arquivos de registro e de catálogo: `app.ts`, `schemas.ts`, `catalogo.ts`, `CHAVES`, `api-falsa.ts`, `router.ts`, `casos-gestor.ts`, `@kgb/ui/index.ts`.
  - `pnpm-lock.yaml`.
  - **O banco de teste compartilhado:** o `globalSetup` faz `DROP SCHEMA` no `kgb_test`, então duas suítes em paralelo quebram uma à outra.
- A seção 8 propõe um esqueleto comum, com contrato primeiro e um arquivo por tela, para eliminar esses conflitos.

---

## 1. API (`apps/api`)

### 1.1 Estrutura

```
src/app.ts             criarApp(): CORS, Better Auth, sessão, registro das rotas, onError/notFound
src/contexto.ts        Ambiente = { Variables: { usuario: UsuarioSessao | null } }
src/erros.ts           ErroSchema/corpoErro/respostaErro, ErroHttp, naoEncontrado()
src/middlewares/       acesso.ts (exigeLogin, exigePapel, usuarioLogado), sessao.ts
src/schemas.ts         schemas zod compartilhados (.openapi('Nome') vira um componente)
src/rotas/*.ts         um OpenAPIHono por grupo (catalogo, acionamentos, execucao, prestador, me, saude, arquivos)
src/servicos/          acionamentos.ts (tudo hoje) e serializacao.ts
src/dominio/           regras puras com TDD: acionamento.ts (ErroDominio, transições), datas.ts, inicio-prestador.ts
test/                  dados.ts, sessao.ts, preparar-banco.ts (globalSetup)
scripts/gerar-openapi.ts  grava packages/api-client/openapi.json
```

### 1.2 Como criar e registrar uma rota

O padrão vem de `rotas/catalogo.ts` e `rotas/acionamentos.ts`:

```ts
const rotaCriar = createRoute({
  method: 'post',
  path: '/api/tipos',                 // caminho absoluto; o app registra com app.route('/', …)
  tags: ['Catálogo'],
  summary: '…',
  security: [{ Bearer: [] }],
  middleware: [exigePapel('gestor')] as const,
  request: { body: { content: { 'application/json': { schema: NovoTipoSchema } }, required: true } },
  responses: {
    201: { description: 'Criado', content: { 'application/json': { schema: TipoDemandaSchema } } },
    401: respostaErro('Sem sessão'), 403: respostaErro('Só para a gestão'), 422: respostaErro('Dados inválidos'),
  },
})
export const rotasTipos = new OpenAPIHono<Ambiente>()
  .openapi(rotaCriar, async (c) => c.json(await criarTipo(usuarioLogado(c), c.req.valid('json')), 201))
// app.ts: app.route('/', rotasTipos)
```

- **Onde ficam os schemas.** Hoje a maioria está em `schemas.ts`. Há precedente de schema dentro do arquivo da rota: `UsuarioSchema` em `rotas/me.ts` e `ContagemSchema` em `rotas/acionamentos.ts`. O nome dado em `.openapi('X')` vira `components['schemas']['X']` no cliente.
- **Parâmetros de caminho:** `IdParam` está em `schemas.ts`. Para estender, use `IdParam.extend({ etapaId: z.string().openapi({ param: { name, in: 'path' } }) })`, como em `execucao.ts`.
- **Validação do zod:** o `defaultHook` em `app.ts` devolve 422 `{ erro: { codigo: 'validacao', mensagem: 'Dados inválidos', campos: [{ campo, mensagem }] } }`.
- **Resposta binária**, útil para exportar a planilha. Com content-type diferente de JSON e de `text/plain`, o tipo do handler aceita um `Response` puro (conferido em `@hono/zod-openapi` 1.6.3). Então `return c.body(buffer, 200, { 'Content-Type': …, 'Content-Disposition': … })` funciona. `rotas/arquivos.ts` usa um `Hono` puro, fora do OpenAPI.
- **Ordem das rotas:** registre caminhos estáticos (`/api/prestadores/cadastro`) antes dos que têm parâmetro (`/api/prestadores/{id}`). O Hono resolve na ordem de registro.

### 1.3 Acesso e erros

- **`exigeLogin`:** devolve 401 `nao_autenticado` "Faça login para continuar".
- **`exigePapel('gestor' | 'prestador')`:** 401 sem sessão; 403 `sem_permissao` "Seu papel não tem acesso a este recurso".
- **`usuarioLogado(c)`:** devolve `UsuarioSessao { id, nome, email, papel, prestadorId }`, ou lança `HTTPException(401)`.
- **Formato único de erro:** `{ erro: { codigo, mensagem, campos? } }`. O `app.onError` trata assim:
  - `ErroDominio` e `ErroHttp` viram `corpoErro(erro.codigo, erro.message)` com `erro.status`.
  - `HTTPException` vira 401/403 `nao_autenticado`/`sem_permissao`; os outros status recebem `erro`.
  - O resto vira 500 `interno`.
  - O 404 de rota vem com `nao_encontrado`.
- **`ErroDominio(codigo, mensagem, status: 409 | 422 = 422)`** fica em `dominio/acionamento.ts`. `codigo` é o union fechado `CodigoErroDominio` (`transicao_invalida | fotos_insuficientes | etapas_pendentes | motivo_obrigatorio | prestador_inativo | tipo_invalido | horario_invalido | campo_obrigatorio`). **Código novo exige editar esse union**, que vira ponto de conflito.
- **`ErroHttp(status: 401 | 403 | 404 | 409 | 413 | 415 | 422, codigo, mensagem)`** e `naoEncontrado('Prestador')` ficam em `erros.ts`.
- **Sessão de prestador inativo ou excluído:** `prestador-bloqueado.ts` é usado pelo middleware `sessao` e pelo hook `session.create` do Better Auth. **Desativar ou excluir um prestador já derruba a sessão dele** (há teste em `auth.test.ts`).

### 1.4 Serviços, Prisma e transações

- **Cliente:** `import { prisma } from '../db'` (`criarPrisma(env.DATABASE_URL)`). Os tipos vêm de `import type { Prisma } from '@kgb/db'`.
- **Transação interativa:** `prisma.$transaction(async (tx) => { … })`, com o tipo `Db = Prisma.TransactionClient | typeof prisma` para funções que aceitam os dois.
- **`travar(tx, id)`** faz `SELECT … FROM acionamento WHERE id = … FOR UPDATE` via `$queryRaw` e põe ações simultâneas em fila. `travarDoPrestador` também confere o dono. Para excluir ou desativar um prestador vale um `travarPrestador` análogo, porque `criarAcionamento` confere "prestador ativo" dentro da própria transação, sem trava.
- **Regras puras em `dominio/`, chamadas pelo serviço:**
  - `normalizarNovoAcionamento`, `verificarRevisao` e `exigirStatus`.
  - `calcularInicio(itens, hoje)` recebe `hoje` como parâmetro, o que deixa testar sem relógio. Siga esse padrão para o Painel.
- **Soft delete:**
  - `TipoDemanda.excluidoEm` e `Prestador.excluidoEm`.
  - `listarTipos()` e `listarPrestadoresAtivos()` (em `servicos/acionamentos.ts`) filtram `excluidoEm: null` e ordenam por `[criadoEm asc, id asc]`.
- **Leitura da configuração:** `regrasAtuais(db)` lê `Configuracao` (id 1).

### 1.5 Serialização (`servicos/serializacao.ts`)

- **Includes tipados:** `incluirResumo` e `incluirDetalhe`, declarados com `satisfies Prisma.AcionamentoInclude`. Os tipos saem de `Prisma.AcionamentoGetPayload<{ include: typeof … }>`.
- **Conversores:** `paraResumo`, `paraDetalhe(a, regras)` e `paraFoto`. O `codigo` vem de `codigoAcionamento(numero)`, que devolve `AC-1234` (em `@kgb/db`).
- **Datas:**
  - A coluna `data` (tipo `@db.Date`, à meia-noite UTC) sai como `toISOString().slice(0, 10)`.
  - Instantes saem em ISO.
  - `dataSP(d)` e `horarioSP(d)` ficam em `dominio/datas.ts`.
- **Atenção a `.nullable()` sobre schema nomeado.** O openapi-typescript gera uma interseção estranha, e `usarInicio.ts` precisa de cast por causa disso. Prefira objetos inline ou evite `SchemaNomeado.nullable()`.

### 1.6 Upload multipart (base para a planilha)

Referência: `rotas/execucao.ts` e `schemas.ts`.

```ts
const limiteFoto = bodyLimit({
  maxSize: TAMANHO_MAXIMO_FOTO + 512 * 1024,
  onError: (c) => c.json(corpoErro('arquivo_grande', 'A foto passa de 10 MB'), 413),
})
// createRoute: middleware: [limiteFoto, apenasPrestador]
// request.body: { content: { 'multipart/form-data': { schema: FotoFormSchema } }, required: true }
// schema: arquivo: z.any().optional().openapi({ type: 'string', format: 'binary' })
// handler: const form = c.req.valid('form'); if (!(form.arquivo instanceof File)) throw new ErroHttp(422, 'arquivo_obrigatorio', …)
```

- **Conferência do arquivo:** tamanho e tipo são conferidos pelos bytes iniciais (`arquivos/imagem.ts`: `detectarTipoImagem`), com 413 para arquivo grande e 415 para tipo inválido. Para a planilha:
  - xlsx começa com `PK\x03\x04` (zip);
  - xls com `D0 CF 11 E0`;
  - csv é texto.
- **Várias partes com o mesmo nome:** `comoLista(form.arquivos)`.
- **Cliente:** envia com `body: {} as never, bodySerializer: () => FormData` (ver `apps/prestador/src/execucao/usarDetalhe.ts`). Os helpers `formularioFoto` e `formularioInviabilidade` ficam em `packages/api-client/src/arquivos.ts`.

### 1.7 Testes de integração

- **Configuração** (`vitest.config.ts`):
  - `env.DATABASE_URL = DATABASE_URL_TEST`, `TZ=America/Sao_Paulo`, `ARQUIVOS_DIR` no tmp.
  - `globalSetup: test/preparar-banco.ts` chama `prepararBancoDeTeste({ semearDados: true })`: faz **DROP SCHEMA public** no banco `*_test`, roda `prisma migrate deploy` e depois `semear`.
  - `fileParallelism: false`.
- **Padrão de teste:**
  ```ts
  const app = criarApp()
  const gestora = await entrar(app, GESTORA_DEV.email)      // test/sessao.ts → { Authorization: 'Bearer …' }
  const r = await app.request('/api/prestadores?status=ativo', { headers: gestora })
  expect(r.status).toBe(200)
  ```
- **Helpers em `test/dados.ts`:**
  - `corpo<T>(res)`, `hojeSP()` e `JPEG` (bytes mínimos).
  - `formularioFoto(campos, arquivo)`.
  - `loginDePrestador(prestadorId)`: cria um login com senha para qualquer prestador.
  - `criarAcionamento(app, headersGestor, extra)`: faz POST e devolve o id.
- **Constantes de `@kgb/db/seed`:** `GESTORA_DEV`, `EMAIL_PRESTADOR_DEV` e `SENHA_DEV` (`russo2026`).
- **Estado compartilhado entre arquivos.** O banco é semeado uma vez por execução, e os arquivos rodam em sequência sobre o mesmo banco:
  - quem precisa de contagens exatas chama `await semear(prisma)` no `beforeAll` (como `acionamentos.test.ts` e `prestador.test.ts`);
  - quem muta dados restaura no `finally` (`acionamentos.test.ts` com o checklist de `t8`).
  - **Risco:** `catalogo.test.ts` espera 8 tipos e ativos `['p1','p2','p3','p4','p6']` **sem re-semear**. Testes novos que criam tipos ou prestadores precisam fazer `semear` no `afterAll`. Outra saída é o esqueleto pôr `beforeAll(semear)` em `catalogo.test.ts`.
- **Regras puras:** têm teste unitário sem banco (`dominio/*.test.ts`).

### 1.8 O que já existe e o que falta, por tela

| Rota atual | Papel | Resposta |
|---|---|---|
| `GET /api/tipos` | login | `TipoDemanda[] {id,nome,cor,checklist[]}`, sem os excluídos |
| `GET /api/prestadores?status=ativo` | gestor | `PrestadorOpcao[] {id,nome,regiao,cor}`. **O parâmetro é ignorado: sempre devolve só os ativos** |
| `GET /api/acionamentos?status=&busca=` | login | `ResumoAcionamento[]`. O prestador vê só os seus; `finalizados` equivale a `aprovado` |
| `GET /api/acionamentos/contagem` | login | `{aberto,em_andamento,aguardando,reprovado,aprovado}` |
| `GET /api/acionamentos/{id}` | login | `DetalheAcionamento` |
| `GET /api/prestador/inicio` | prestador | `InicioPrestador` |

**Painel.** A `contagem` já dá o KPI 1 (aberto + em_andamento + reprovado) e o KPI 2 (aguardando). A fila é `GET /api/acionamentos?status=aguardando`, ordenada com `ordenarFila` (`gestor/src/aprovacoes/fila.ts`), pegando os 4 primeiros.

Falta um endpoint para o resto, por exemplo `GET /api/painel?periodo=7|30` (gestor), calculado por uma função pura `dominio/painel.ts` como em `vGestor`:
- **"N para hoje":** acionamentos de hoje com `status !== 'aprovado'`.
- **Recorte do período:** `data` entre hoje−(P−1) e hoje. Sobre esse recorte:
  - aprovações ÷ análises;
  - tempo médio = primeiro `enviado`/`inviabilidade_enviada` − `iniciadoEm`, formatado `floor(m/60)+'h'+pad(round(m%60))`;
  - inviáveis e o percentual do período.
- **Volume por dia:** `{data,total,aprovados}`, em que aprovados = aprovado e não inviável.
- **Reprovações por tipo:** para cada revisão de reprovação, soma 1 em cada demanda do acionamento. O percentual é sobre as demandas daquele tipo no período.
- **Ranking:**
  - entram prestadores não excluídos que estejam ativos ou tenham acionamentos no período;
  - colunas: concluídos, taxa (ou "—") e tempo;
  - ordenado por concluídos e depois por taxa.

`ResumoAcionamento` não traz `iniciadoEm`, o primeiro envio nem as revisões. Por isso o cálculo precisa ser feito no servidor.

**Prestadores.** Falta tudo:
- lista completa (ativos e inativos) com documento, telefone, e-mail, região, especialidades, status, `credenciadoDesde` e a carga "X em aberto · Y no total";
- POST e PATCH (dados e status);
- DELETE: soft delete, com 409 se houver acionamentos em aberto, em execução, reprovados ou aguardando;
- importação da planilha (prévia e aplicação);
- exportação e modelo.

Detalhes que valem para essas rotas:
- **Formato do documento e do telefone:**
  - O seed grava **só os dígitos** em `documento` e `telefone`, e o protótipo exibe com máscara (`318.402.117-50`, `27.415.903/0001-44`, `(11) 98734-2210`). É preciso um formatador na exibição e na exportação.
  - A validação é 11 ou 14 dígitos, e telefone com pelo menos 10.
- **Cor de prestador novo:** `PCOL[total % 8]` com `['#0069BD','#FC7608','#5D627D','#F47B50','#004E8F','#E0A100','#8FB8DE','#A6A6A6']`.
- **Ordenação da lista:** `localeCompare` do nome, feito em JS.
- **Formato da resposta do DELETE:** use 200 `{ ok: true }`, como `removerFoto`. **O `exigir` do gestor lança erro se `data` vier `null`/`undefined`**, então um 204 quebra.
- **Não mude o formato de `GET /api/prestadores`.** O modal Novo acionamento e `catalogo.test.ts` (`toEqual({id,nome,regiao,cor})`) dependem dele. Use uma rota nova, como `GET /api/prestadores/cadastro`.
- **`documento` é `@unique` mesmo nos excluídos.** Reimportar o documento de um prestador excluído dá P2002. O serviço precisa "reviver" o registro, ou o caso precisa ser tratado de outro jeito.

**Checklists.** Faltam:
- `POST /api/tipos {nome}`: a cor é `['#0069BD','#FC7608','#B37BE7','#F47B50','#FF6A5D','#FFB523','#363853','#47C272'][n % 8]` e o checklist começa vazio.
- `PATCH /api/tipos/{id} {nome?, checklist?}`.
- `DELETE /api/tipos/{id}`: soft delete. O protótipo não deixa excluir o último tipo.

Cuidados:
- **`TipoDemanda.nome` é `@unique` também entre os excluídos**, então criar um tipo com o nome de um excluído dá P2002. Trate como `ErroDominio` 409 ou revivendo o registro.
- **Edição no protótipo:** é feita direto no campo, gravando a cada tecla. No app, use debounce com `usarAutosave`, que está em `apps/prestador/src/execucao/usarAutosave.ts`, com espera de 600 ms.
- **Acionamentos já criados não mudam:** as demandas guardam uma cópia do checklist, e o teste "editar o checklist do tipo depois não muda o acionamento já criado" confirma isso.

**Agenda.** **Nenhuma rota nova.** Basta `GET /api/acionamentos`, filtrado por data no cliente.

### 1.9 Lib de xlsx

**Nenhuma instalada.** O protótipo usa `import('https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs')` (`acionamentos-data.js`: `exportPros`, `template`, `parseSheet`, `HEAD`, larguras `!cols`, aba `Credenciados`).

O README do design pede a importação no backend, aceitando `.xlsx`, `.xls` e `.csv`. Duas opções:
- **SheetJS 0.20.3 pelo tarball do CDN** (`"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`) em `apps/api`. Lê xls, xlsx e csv e reproduz a saída do protótipo. **Evite o `xlsx` do registro npm (0.18.5)**, que tem avisos de segurança conhecidos.
- **exceljs:** não lê `.xls`.

Adicionar a dependência muda o `pnpm-lock.yaml`, então isso deve ficar no esqueleto.

---

## 2. Banco (`packages/db`)

- **Schema** (`prisma/schema.prisma`, generator `prisma-client` com saída em `src/generated/prisma`, que está no gitignore):
  - **`TipoDemanda`:** `id cuid`, `nome @unique`, `cor`, `checklist String[]`, `excluidoEm?`, `criadoEm`, `atualizadoEm`, `prestadores` (m:n `"Especialidades"`, tabela `_Especialidades`), `demandas`.
  - **`Prestador`:** `id cuid`, `nome`, `documento @unique` (só dígitos), `telefone` (só dígitos), `email?`, `regiao?`, `status StatusPrestador(ativo|inativo)=ativo`, `credenciadoDesde @db.Date`, `excluidoEm?`, `cor`, `especialidades TipoDemanda[]`, `acionamentos`, `usuario User?`.
  - **`Configuracao`:** `id Int @default(1)`, `photoMin=1`, `requireAllSteps=false`.
  - **`User`** (Better Auth): `role String='prestador'` (`'gestor'` para a gestão), `prestadorId? @unique` (onDelete SetNull), `sessions`, `accounts`. `Session` e `Account` guardam a senha em `providerId 'credential'`.
  - O domínio segue com `Acionamento` (`numero` autoincrement, `data @db.Date`, `inicio` e `fim` "HH:MM"), `Demanda` e `Etapa` (cópias do checklist), `Foto`, `Revisao` e `EventoAcionamento`.
- **Seed** (`src/seed/*`, `pnpm db:seed`). Apaga tudo e recria a partir de `docs/design/acionamentos-data.js`, com datas relativas a hoje. É recusado com `NODE_ENV=production`.
  - **8 tipos (`t1`–`t8`):**

    | Id | Nome | Cor | Etapas |
    |---|---|---|---|
    | t1 | Vazamento | #0069BD | 5 |
    | t2 | Revisão elétrica | #FC7608 | 5 |
    | t3 | Ponto de luz | #5D627D | 4 |
    | t4 | Troca de disjuntor | #F47B50 | 5 |
    | t5 | Pintura | #004E8F | 5 |
    | t6 | Reparo em gesso | #E0A100 | 4 |
    | t7 | Limpeza de ar-condicionado | #8FB8DE | 5 |
    | t8 | Chaveiro | #A6A6A6 | 4 |

  - **6 prestadores (`p1`–`p6`):** Carlos, Ana, João, Marina, **Roberto (`p5`, inativo)** e Luciana. Nenhum está excluído. As cores seguem a `PCOL` pela ordem.
  - **Usuários:**
    - `u-renata` (gestora, `renata@russo.dev`);
    - `u-p1` a `u-p6` (prestadores). **Só `carlos@russo.dev` (p1) e a Renata têm senha** (`russo2026`).
  - **70 acionamentos:** 49 gerados (todos aprovados) e 21 nomeados.
    - No geral: aberto 7, em_andamento 1, aguardando 3, reprovado 2, aprovado 57.
    - Carlos: aberto 5, aguardando 2, reprovado 1, aprovado 12.
  - **Configuração:** a linha `id 1`.
- **Migrations:**
  - Hoje existe uma só: `prisma/migrations/20260928162200_inicial`.
  - Para criar outra: altere `schema.prisma` e rode `pnpm db:migrate` (`prisma migrate dev && prisma generate`, que pergunta o nome). Sem interação: `pnpm --filter @kgb/db exec prisma migrate dev --name <nome>` e depois `pnpm --filter @kgb/db generate`.
  - Os testes aplicam as migrations com `migrate deploy`.
  - **As quatro telas não precisam de migration** se os `@unique` com soft delete forem tratados no serviço. Um índice parcial `WHERE "excluidoEm" IS NULL` exigiria SQL manual.
- **Exports do pacote:**
  - `@kgb/db`: `criarPrisma`, `codigoAcionamento` e o client gerado;
  - `@kgb/db/seed`: `semear`, `GESTORA_DEV`, `EMAIL_PRESTADOR_DEV`, `SENHA_DEV`, `mapearDadosPrototipo`;
  - `@kgb/db/testes`: `prepararBancoDeTeste` e `verificarUrlDeTeste` (exige `*_test`).
- **Testes do pacote:** `src/index.test.ts` (schema e URL de teste), `src/seed/semear.test.ts` e `src/seed/mapear.test.ts` (com `vi.setSystemTime`).

---

## 3. Cliente (`packages/api-client`)

- **Geração:** `pnpm api:generate` roda `@kgb/api gerar:openapi`, que executa `criarApp().getOpenAPI31Document` e grava `openapi.json`. Em seguida roda `openapi-typescript openapi.json -o src/schema.d.ts`.
  - O comando **importa o `env` da API**, então precisa de um `.env` válido no worktree.
  - O CI roda o comando e depois `git diff --exit-code -- packages/api-client`.
  - Os dois arquivos gerados ficam fora do prettier e do eslint.
- **`src/index.ts`:**
  - Aliases de tipo: `Usuario`, `ContagemAcionamentos`, `CorpoErro`, `ResumoAcionamento`, `DetalheAcionamento`, `Foto`, `TipoDemanda`, `PrestadorOpcao`, `InicioPrestador`, sempre como `components['schemas']['X']`. Há também `paths` e `components`.
  - `criarClienteApi({ baseUrl, obterToken?, fetch? })`: openapi-fetch, com `credentials: include` (gestor) ou Bearer (prestador).
  - `ClienteApi`, `middlewareBearer`, `comTempoLimite(executar, ms)`, `TEMPO_LIMITE_PADRAO = 8000` e `ErroTempoEsgotado`.
- **`src/arquivos.ts`:** `resolverUrl(base, caminho)`, `formularioFoto(...)` e `formularioInviabilidade(...)`. Um `formularioPlanilha` caberia aqui.
- **`@kgb/api-client/auth`:** `criarClienteAuth({ baseURL, obterToken?, salvarToken?, fetch? })`.
- **Download binário:** `api.GET('/api/…', { parseAs: 'blob' })` devolve um `Blob` em `data`.

---

## 4. Gestor (`apps/gestor`)

- **Pastas por funcionalidade:**
  - `src/acionamentos/`: `dados.ts` com as consultas e mutações, `filtros.ts`, `estadoLista.ts`, `detalhe/` e `novo/`.
  - `src/aprovacoes/` (`fila.ts`).
  - Componentes compartilhados em `src/componentes/`.
  - **As três telas por fazer ainda estão em `src/paginas/`** (`PaginaPainel.vue` com teste, `PaginaPrestadores.vue`, `PaginaChecklists.vue`), usando `<EmConstrucao />`. O esperado é movê-las para `src/painel/`, `src/prestadores/` e `src/checklists/`.
- **Rotas** (`src/router.ts`):
  - `painel`, `acionamentos` (+ `acionamento`, `:id`), `aprovacoes` (+ `aprovacao`), `prestadores` e `checklists`.
  - O detalhe usa `props: { id, origem }`, e `PaginaDetalhe` aceita `origem: 'acionamentos' | 'aprovacoes'`.
  - O Painel precisa de `painel/:id` e de `origem: 'painel'` ("← Painel"). Aninhe igual a `acionamentos` (filho `''` com nome e filho `':id'`) para o `RouterLink` da barra lateral continuar ativo no detalhe.
  - `test/montar.ts` → `criarRouterDeTeste()` lista as rotas nomeadas e precisa do nome novo.
  - O menu vem de `navegacao.ts` (`ITENS_NAVEGACAO`) e não muda.
- **vue-query** (`src/consultas.ts`):
  - `criarClienteConsultas(aoPerderSessao)` trata 401 e usa `staleTime` de 5 s.
  - Chaves atuais em `CHAVES`: `acionamentos`, `lista(f,b)`, `contagem`, `detalhe(id)`, `tipos`, `prestadoresAtivos` (`['prestadores','ativos']`).
  - **Convenção:** tudo que depende de acionamentos começa com `'acionamentos'`, e as mutações invalidam esse prefixo.
  - **Sugestões:**
    - `painel: (p) => ['acionamentos','painel',p]`, para ser invalidado de graça por criar e revisar;
    - `cadastroPrestadores: ['prestadores','cadastro']`, com as mutações invalidando `['prestadores']` (também atualiza o seletor do modal);
    - Checklists invalida `CHAVES.tipos`.
  - Os hooks existentes podem ser reusados: `usarTipos` e `usarLista('aguardando')`.
- **Erros** (`src/erros.ts`):
  - `exigir(pedido)` devolve `data` ou lança `ErroApi(mensagem, codigo, status)`. **Rejeita `data` nulo.**
  - `mensagemDeErro(e)` devolve a mensagem da API ou `MENSAGEM_FALHA`.
  - O `exigir` do prestador tem outra assinatura e outra ordem de parâmetros no `ErroApi`.
- **Toast:** `toastGestor.mostrar(texto)` (`src/toast.ts`, que usa `usarToast()` de `@kgb/ui`). O `LayoutGestor` desenha o toast na coluna de conteúdo.
- **Componentes:**
  - **`PaginaGestor`:** props `largura: 1080 | 1180 | 1280` (padrão 1280) e `espaco: 16 | 20`.
    - Painel e Prestadores usam 1280.
    - Checklists usa 1080.
  - **`CabecalhoPagina`:**
    - props: `titulo`, `subtitulo?`, `sobretitulo?`, `alturaMinima?`, `alinhamento?: 'centro' | 'base'` e o slot `#acoes`.
    - O gap é fixo em 12px, mas **o cabeçalho de Prestadores no protótipo usa gap 10px**, o que exige um prop novo.
  - **`BotaoNovoAcionamento`:** um `button.novo` que abre `novoAcionamento` (estado global em `acionamentos/novo/estado.ts`).
  - **`NavLateral`:** props `itens`, `aprovacoes`, `usuario`; emite `sair`. **`NavInferior`:** props `itens`, `aprovacoes`.
  - **`LayoutGestor`:**
    - Desenha o `ModalNovoAcionamento` no nível da coluna.
    - Deixa `<main>` e a `NavInferior` inertes (`inert`) só quando `novoAcionamento.aberto`.
    - **Os modais de Prestadores** (formulário, confirmação e importação) precisam do mesmo tratamento, o que obriga a mexer no layout.
  - **`saida.ts`:** zera o estado global ao sair (`reiniciarLista`, `novoAcionamento.fechar`). Estado global novo teria de entrar aqui, então prefira estado local ou na query.
- **Testes:**
  - **Montagem:** `montar(componente, { props?, rota?, anexar? })` devolve `{ tela, router, consultas }`. Use `aguardar()` para esperar as promessas.
  - **Mock da API:**
    ```ts
    vi.mock('../api', () => ({ api: { GET: vi.fn(), POST: vi.fn() }, auth: {}, BASE_API: 'http://api.test' }))
    const simulada = simularApi(api, { 'GET /api/tipos': TIPOS, 'POST /api/acionamentos': () => ({ data: … }) })
    simulada.chamadas('GET', '/api/acionamentos')   // opções recebidas
    erroApi(409, 'codigo', 'mensagem')              // { status, error }
    ```
  - **`simularApi` só conhece GET e POST.** O CRUD precisa de PATCH e DELETE.
  - **Fixtures** (`test/fixtures.ts`): `resumo()`, `foto()`, `detalhe()`, `contagem()` (7/1/3/2/57), `TIPOS` e `PRESTADORES`.
  - **Páginas que usam a sessão:** `vi.mock('../sessao', () => ({ sessao: { usuario: { nome: 'Renata Silva' } }, sair: vi.fn() }))`, como em `PaginaPainel.test.ts`.
  - **Download:** o jsdom não tem `URL.createObjectURL`; use um stub.

---

## 5. Prestador (`apps/prestador`)

- **Estrutura:**
  - `src/inicio/` (`usarInicio`, `inicio.ts`, `CartaoProximo`);
  - `src/demandas/` (`usarDemandas`, `filtros.ts`, `CartaoDemanda`, `PaginaDemandas`);
  - `src/execucao/` (detalhe, `usarDetalhe`, `usarAutosave`, fotos);
  - `src/componentes/AbasPrestador.vue`;
  - `abas.ts`, com as abas `inicio`, `agenda` e `demandas` e os ícones `dashboard`, `date-time` e `check-done`.
- **Rotas:**
  - `agenda` aponta para `./paginas/PaginaAgenda.vue`, que hoje só tem o título "Agenda" (24/32) e `<EmConstrucao fundo="var(--kgb-superficie1)"/>`, com padding `8px 24px 24px` e gap 16.
  - O detalhe é `demandas/:id` (nome `detalhe`, `meta.semAbas`). O botão "voltar" faz `router.back()`.
- **Consultas** (`consultas.ts`):
  - `CHAVES = { inicio: ['inicio'], lista: ['acionamentos'], detalhe: id => ['acionamento', id] }`.
  - Uso: `exigir(await api.GET(...))`, que confere `response.ok`, e `mensagemDeErro`.
- **Dados da Agenda:** `usarDemandas()` faz `GET /api/acionamentos` com a chave `CHAVES.lista` e já traz tudo o que a Agenda precisa. Basta filtrar por `data` nos 7 dias a partir de `dataISO(new Date())` e ordenar por `inicio` (`ordenarPorData` de `demandas/filtros.ts`).
- **Dia escolhido:** o protótipo guarda `aDay` entre as abas; use `?dia=` como `?filtro=` em Demandas. O `LayoutPrestador` usa `:key="route.path"`, então mudar só a query não recria a página.
- **Cartão:** `CartaoDemanda` (props `acionamento: ResumoAcionamento`, emite `abrir`) **não serve para a Agenda**. O cartão da Agenda é outro: hora de 44px à esquerda, cartão `#F9F9F9` com padding 14, título 14/600, "horário · tipos" 12 `#50555C`, pin 14 com o endereço e `StatusChip tamanho="p"` com `align-self:flex-start`.
- **Botão de dia:** 68px de altura, raio 14, `padding:0`, e `grid repeat(7, minmax(0,1fr))` com gap 6. O rótulo do dia é "Hoje, 28/09", "Amanhã, 29/09" ou "Quarta-feira, 30/09". Sem atendimentos, mostra "Dia livre.".
- **Testes:**
  - `test/montar.ts`: `montar(c, { props?, rotas?, rotaInicial? })` devolve `{ wrapper, router, cliente }`. As rotas vêm de `ROTAS_VAZIAS`, que já inclui `agenda`.
  - O mock é `const { api } = vi.hoisted(() => ({ api: { GET: vi.fn() } })); vi.mock('../api', () => ({ api, baseApi: 'http://api' }))`, com respostas `{ data, response: new Response(null, { status: 200 }) }`.

---

## 6. `@kgb/ui` (`packages/ui/src`)

**Componentes exportados:**
- `RussoIcone({ nome: NomeIcone, tamanho?: number | string = 24 })`: `stroke="currentColor"`; a cor do protótipo é `var(--kgb-tinta)`.
- `StatusChip({ status, inviavel? = false, tamanho?: 'p' | 'm' | 'g' = 'm' })`. Tamanhos:
  - p: 11px, padding 2/8;
  - m: 12px, padding 3/10;
  - g: 13px, padding 6/12.
- `AvatarIniciais({ nome, tamanho? = 36, cor? = var(--kgb-tinta), tamanhoFonte? = 13 })`.
- `BarraProgresso({ percentual, trilho? })`.
- `MiniaturaFoto({ tamanho: 64 | 68 | 80 | 96 | 120, url?, cor?, horario, removivel? })`, que emite `remover`.
- `AvisoToast({ mensagem, variante: 'gestor' | 'prestador' })`.
- `MenuUsuario({ posicao?: 'acima' | 'abaixo' })`, que emite `sair`.
- `FormularioLogin({ subtitulo, erro, enviando })`, que emite `enviar(email, senha)`.
- `EmConstrucao({ fundo? })`.
- A imagem `marcaRusso` (png).

**Helpers:**

| Arquivo | Funções e constantes |
|---|---|
| `formatos.ts` | `FUSO`, `dataPorExtenso(d)` ("Segunda-feira, 28/09/2026"), `dataCurtaPorExtenso(d)`, `saudacao(d)`, `primeiroNome(n)`, `iniciais(n)` (primeira e última) |
| `fluxo.ts` | `dataISO(d)` (dia em SP), `dataBR(iso)`, `diaMes(iso)`, `intervalo(i, f)` ("08:00–11:00"), `quandoCurto(data, i, f, hoje)`, `momento(instanteIso)` ("28/09 · 10:05"), `progresso({feitas,total})`, `urlMapa(end)`, `urlRota(ends)` |
| `status.ts` | `ESTILOS_STATUS`, `estiloStatus(status, inviavel)` |
| `toast.ts` | `usarToast(duracao = 2600)` → `{ mensagem, mostrar }` |
| `tokens.ts` | `cores`, `raios`, `sombras` (inclui `botaoSwitch`), `FONTE` |
| `vuetify.ts` | `opcoesVuetify({ fundo })` |

Helpers que ainda não existem e que as telas pedem:
- dias da semana curtos ("Dom", "Seg"…) e longos (`DIAS` existe mas não é exportado);
- somar dias a uma data ISO em SP;
- duração "1h25";
- máscaras de CPF/CNPJ e de telefone;
- um switch de 44×26 (usado na linha de Prestadores e no modal de importação).

**CSS** (`estilos/`): `index.css` importa a fonte Plus Jakarta Sans Variable, `tokens.css`, `base.css` (`line-height: normal`, `box-sizing`, cursor dos botões) e `vuetify.css` (overrides de `.v-btn` e `.v-field`).

Tokens em `tokens.css`:

| Token | Valor |
|---|---|
| `--kgb-primaria` | #0069bd |
| `--kgb-primaria-hover` | #005aa3 |
| `--kgb-primaria-escura` | #004e8f |
| `--kgb-primaria-tint` | #e6f0fa |
| `--kgb-primaria-tint-forte` | #cce1f2 |
| `--kgb-primaria-hover-leve` | #eef4fa |
| `--kgb-laranja` | #fc7608 |
| `--kgb-laranja-claro` | #ffebdc |
| `--kgb-laranja-texto` | #b85200 |
| `--kgb-coral` | #f47b50 |
| `--kgb-grafite` | #5d627d |
| `--kgb-creme` | #fcf5f0 |
| `--kgb-tinta` | #262a3b |
| `--kgb-titulo` | #2c3143 |
| `--kgb-texto` | #363853 |
| `--kgb-secundario` | #50555c |
| `--kgb-terciario` | #8f8d8d |
| `--kgb-linha` | #adb3bc |
| `--kgb-divisor` | #e5e5e5 |
| `--kgb-superficie2` | #eff1f3 |
| `--kgb-superficie1` | #f9f9f9 |
| `--kgb-branco` | #fff |
| `--kgb-sucesso` / `--kgb-sucesso-fundo` | #0b8c61 / #e7f8f1 |
| `--kgb-perigo` / `--kgb-perigo-fundo` / `--kgb-perigo-texto` | #ff6a5d / #ffd7d4 / #b8342a |
| `--kgb-inviavel` / `--kgb-inviavel-fundo` | #a8336a / #f4d8e8 |
| `--kgb-aba-inativa` | #61565c |
| `--kgb-sobreposicao` | rgba(28,18,67,.8) |
| `--kgb-sombra-elevado` | 0 4px 16px rgba(0,0,0,.08) |

**Ícones (`NomeIcone`, 20 nomes):** `camera`, `cancel-circle`, `cancel`, `check-done`, `check`, `chevron-right`, `dashboard`, `date-time`, `description`, `download`, `image`, `member`, `pin`, `plus`, `priority`, `search`, `settings`, `sheet`, `trash`, `upload`.
- Todos os ícones das quatro telas já existem:
  - Prestadores: download, upload, plus, search, sheet, trash, cancel;
  - Checklists: `chevron-right` com `rotate(-90deg)` para "Subir", e cancel;
  - Agenda: pin.
- `edit.svg` e `message.svg` existem nos assets, mas não são usados no protótipo.

---

## 7. Harness visual (`tools/visual`)

- **Tipos** (`tipos.ts`):
  ```ts
  type Modo = 'gw' | 'gm' | 'pa'
  interface Regiao { nome; x; y; largura; altura }
  interface Passo { clicar: string; papel?: 'button' | 'link' | 'text' }  // o padrão é button pelo nome acessível exato
  interface Caso { nome; modo; navegarPrototipo?: string; app: 'gestor' | 'prestador'; rota; passos?: Passo[]; regioes: Regiao[] }
  VIEWPORT_APP = { gw: 1440×844, gm: 375×768, pa: 375×768 }
  telaInteira(modo) = { nome: 'tela', x: 0, y: 0, largura: width - 8, altura: height }
  ```
- **Organização:**
  - `casos-gestor.ts` define regiões locais (`sidebar` 232×844, `abasGestor`, `cabecalhoWeb(altura)` em x 264/y 28/480 de largura, `telaWeb`, `telaMobile`), o helper `abrirPeloTitulo` e `casosDetalhe` gerados.
  - `casos-prestador.ts` define `abasPrestador`, `cabecalhoPrestador(h)`, `chip()`, `titulo()`, `esperar()`, `esperarToast()`, `esperarFonte()` e o factory `demandas()`.
  - `casos.ts` junta tudo: `CASOS = [...CASOS_GESTOR, ...CASOS_PRESTADOR]`.
- **Casos provisórios que hoje comparam só uma parte da tela:**
  - `gestor-web-painel`: sidebar e cabeçalho de 56px;
  - `gestor-mobile-painel`: abas e cabeçalho de 300×52;
  - `gestor-web-prestadores`: só a sidebar, com o comentário "cabeçalho entra quando a tela for implementada";
  - `gestor-web-checklists`: sidebar e cabeçalho;
  - `prestador-agenda`: abas e cabeçalho de 48px.

  Cada tela, ao ficar pronta, passa a usar `telaInteira` e casos com passos (modais, filtros, dias).
- **Como roda** (`comparar.ts`):
  - Serve o protótipo e zera o `localStorage` a cada abertura; **o app não é zerado, porque o banco persiste**.
  - Faz login com `renata@` ou `carlos@`.
  - Limites: 0,2 % da região e 2 % do conteúdo.
  - Filtros de linha de comando: `--caso=` e `--app=`.
  - Variáveis `URL_GESTOR` e `URL_PRESTADOR`.
  - Saída em `tools/visual/.saida/`.
- **Limitações conhecidas:**
  1. **Fonte antes dos passos.** `document.fonts.ready` só é esperado **depois** dos passos. Clicar antes de a fonte do protótipo chegar muda larguras e posições. Contorno: `esperarFonte()`, que dá 6 cliques num texto inerte a 250 ms cada.
  2. **Toasts.** O protótipo é fotografado só depois de o app carregar, então o toast do protótipo já sumiu e o do app não. Contorno: `esperarToast()`, com 10 cliques. Vale para "Cadastro atualizado", "X desativado" e "Planilha importada".
  3. **Contagens nos nomes dos chips.** Os passos usam nomes como "Aguardando 3", "Finalizados 57", "Corrigir 1" e "Finalizadas 12", que vêm do seed do dia. Prestadores terá "Todos 6", "Ativos 5" e "Inativos 1".
     - **Casos que gravam no banco quebram os seguintes:** "Iniciar atendimento" fica por último, e toggles, novos tipos e importações também gravam.
     - Rode `pnpm db:seed` antes de cada rodada, e `ponta-a-ponta.ts` também cria dados.
     - O Painel depende de "hoje" e de todo o seed, então precisa rodar antes de qualquer mutação.
     - Na Agenda, os rótulos dos dias ("Qua"/"30") mudam com a data. Calcule-os em tempo de execução no `.ts` do caso.
  4. **Moldura do telefone:** os cantos do modo mobile são mascarados, com raio 42.

---

## 8. Riscos de conflito em paralelo e proposta de esqueleto

### 8.1 Pontos de conflito

| Arquivo | Quem mexeria | Gravidade |
|---|---|---|
| `packages/api-client/openapi.json`, `src/schema.d.ts` (gerados) | Painel, Prestadores, Planilha, Checklists | **Alta.** Não se resolve à mão: depois de cada merge, `pnpm api:generate` |
| `packages/api-client/src/index.ts` (aliases) | todas as frentes de API | Alta |
| `apps/api/src/app.ts` (`app.route`) | 3 ou 4 | Média |
| `apps/api/src/schemas.ts` | 3 ou 4 | Alta |
| `apps/api/src/rotas/catalogo.ts` (GET tipos e prestadores) | Checklists, Prestadores | Média |
| `apps/api/src/dominio/acionamento.ts` (union `CodigoErroDominio`) | Prestadores, Planilha, Checklists | Média |
| `apps/api/src/servicos/acionamentos.ts` (`listarTipos`, `listarPrestadoresAtivos`) | Checklists, Prestadores | Média |
| `apps/api/src/rotas/catalogo.test.ts` (conta 8 tipos e 5 ativos, sem re-semear) | quem cria dados | Média, testes intermitentes |
| `apps/api/test/dados.ts` | todas | Baixa ou média |
| `apps/api/package.json` e `pnpm-lock.yaml` (xlsx) | Planilha | **Alta** no lockfile |
| `packages/db/prisma/schema.prisma` e migrations | qualquer frente que precise | **Alta**: ordem das migrations e `schema.prisma` |
| `packages/ui/src/index.ts`, `formatos.ts`, `fluxo.ts` (datas, máscaras, duração, switch) | Painel, Prestadores, Agenda | Alta |
| `apps/gestor/src/router.ts` (mover páginas, `painel/:id`) | Painel, Prestadores, Checklists | Média |
| `apps/gestor/src/consultas.ts` (`CHAVES`) | Painel, Prestadores, Checklists | Média |
| `apps/gestor/test/api-falsa.ts` (PATCH e DELETE) | Prestadores, Checklists | Média |
| `apps/gestor/test/fixtures.ts`, `test/montar.ts` | 3 frentes | Média |
| `apps/gestor/src/layouts/LayoutGestor.vue` (modais e `inert`) | Prestadores, Planilha | Média |
| `apps/gestor/src/componentes/CabecalhoPagina.vue` (gap 10) | Prestadores | Baixa |
| `apps/gestor/src/acionamentos/detalhe/PaginaDetalhe.vue` (`origem: 'painel'`) | Painel | Baixa |
| `apps/gestor/src/saida.ts` | quem cria estado global | Baixa |
| `apps/gestor/src/prestadores/PaginaPrestadores.vue` | Prestadores **e** Planilha, se forem agentes separados | Alta |
| `tools/visual/casos-gestor.ts` | Painel, Prestadores, Checklists | **Alta** |
| `tools/visual/casos.ts`, `casos-prestador.ts` | Agenda e a agregação | Média |
| `README.md`, `CLAUDE.md`, `docs/` | qualquer uma | Média (proibir) |

**Ambiente, que é o risco mais grave:**
- O `.env` fica fora do git e precisa ser copiado para cada worktree.
- `pnpm test` da API e do db faz `DROP SCHEMA` no `DATABASE_URL_TEST`. **Dois worktrees apontando para o mesmo `kgb_test` quebram as suítes um do outro.**
- `vite.config.ts` fixa as portas 5173/5174 com `strictPort`, mas a CLI (`vite --port`) sobrescreve.
- `pnpm api:generate` também lê o `.env`.
- Precedente dos worktrees que já existem em `.claude/worktrees/`: bancos `kgb_gestor_dev`/`kgb_gestor_test` e `kgb_prestador_dev`/`kgb_prestador_test`, APIs nas portas 3002 e 3001, fronts em 5175 e 5184, com `API_PROXY_ALVO`, `BETTER_AUTH_URL` e `CORS_ORIGINS` ajustados.

### 8.2 Esqueleto comum: commit feito antes de criar os worktrees

A ideia é fixar o contrato primeiro, com um arquivo por tela e o registro feito uma única vez.

**API**
1. **Arquivos de rota novos, cada um com os próprios schemas, `createRoute` e handlers-stub.** Cada stub é `() => { throw new HTTPException(501, { message: 'Em construção' }) }`. `ErroHttp` não aceita 501, por isso o `HTTPException`.

   | Arquivo | Rotas | Schemas |
   |---|---|---|
   | `src/rotas/painel.ts` | `GET /api/painel?periodo=7\|30` | `PainelGestor { periodo{inicio,fim,dias}, kpis{emAberto,paraHoje,aguardando,aprovacao{aprovadas,analises},tempoMedioMinutos,inviaveis,noPeriodo}, volume[{data,total,aprovados}], reprovacoesPorTipo[{nome,cor,reprovacoes,demandas}], ranking[{prestador{id,nome,cor},concluidos,aprovadas,analises,tempoMedioMinutos\|null}] }` |
   | `src/rotas/prestadores.ts` | `GET /api/prestadores/cadastro`, `POST /api/prestadores`, `PATCH /api/prestadores/{id}`, `DELETE /api/prestadores/{id}` (200 `{ok:true}`), `POST /api/prestadores/importacao/previa` (multipart `arquivo`), `POST /api/prestadores/importacao` (multipart `arquivo` + `desativarAusentes`), `GET /api/prestadores/planilha`, `GET /api/prestadores/planilha/modelo` | `PrestadorCadastro`, `NovoPrestador`, `AtualizacaoPrestador`, `PreviaImportacao`, `ResultadoImportacao` |
   | `src/rotas/tipos.ts` | `POST /api/tipos`, `PATCH /api/tipos/{id}`, `DELETE /api/tipos/{id}` | `NovoTipo`, `AtualizacaoTipo` |

   Os GETs de `catalogo.ts` ficam como estão.
2. **`app.ts`:** registrar `rotasPainel`, `rotasPrestadores` e `rotasTipos` (uma vez).
3. **Arquivos vazios de serviço e domínio,** para cada agente preencher: `servicos/painel.ts`, `servicos/prestadores.ts`, `servicos/planilha.ts`, `servicos/tipos.ts`, `dominio/painel.ts`, `dominio/prestador.ts` (documento, telefone, cor, e a prévia da importação) e `dominio/tipos.ts`.
4. **`dominio/acionamento.ts`:** ampliar `CodigoErroDominio` de uma vez com `documento_invalido | documento_duplicado | telefone_invalido | prestador_com_acionamentos | nome_duplicado | ultimo_tipo | planilha_invalida | arquivo_obrigatorio`. Outra saída é trocar para `string`.
5. **`catalogo.test.ts`:** acrescentar `beforeAll(() => semear(prisma))`. A regra para os testes novos é `afterAll(() => semear(prisma))` quando mutarem prestadores ou tipos.
6. **Dependência:** `apps/api/package.json` recebe `"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"`, depois `pnpm install` e commit do lockfile.
7. **`pnpm api:generate`** e commit de `openapi.json` e `schema.d.ts`.

**Cliente** (`packages/api-client/src/index.ts`): todos os aliases novos (`PainelGestor`, `PrestadorCadastro`, `NovoPrestador`, `AtualizacaoPrestador`, `PreviaImportacao`, `ResultadoImportacao`, `NovoTipo`, `AtualizacaoTipo`). Em `arquivos.ts`, `formularioPlanilha(arquivo, extras?)`.

**`@kgb/ui`:**
- Em `fluxo.ts`:
  - `somarDias(iso, n)`, `diaDaSemana(iso)` e `diaDaSemanaCurto(iso)`;
  - `duracao(minutos)`, que devolve '1h25';
  - `formatarDocumento(d)`, `formatarTelefone(d)` e `soDigitos(t)`.
- O componente `Interruptor.vue` (44×26, trilho `#0069BD`/`#E5E5E5`, sombra `botaoSwitch`), exportado em `index.ts`.
- Opcional: mover `usarAutosave` para `@kgb/ui`, para os Checklists reusarem.

**Gestor:**
- Mover as páginas para `src/painel/PaginaPainel.vue` (com o teste), `src/prestadores/PaginaPrestadores.vue` e `src/checklists/PaginaChecklists.vue`, com `dados.ts` vazio em cada pasta.
- `router.ts`:
  - `painel` aninhado com `''` (nome `painel`) e `':id'` (nome `painel-acionamento`, `origem: 'painel'`);
  - imports novos.
- `PaginaDetalhe.vue`: `origem` passa a aceitar `'painel'`, com o rótulo "Painel".
- `consultas.ts`: `CHAVES.painel(p)` e `CHAVES.cadastroPrestadores`.
- `test/montar.ts`: a rota `painel-acionamento`.
- `test/api-falsa.ts`: `simularApi` aceita GET, POST, PATCH, PUT e DELETE (`api: { GET, POST, PATCH, DELETE }`).
- Fixtures por tela em arquivos separados: `test/fixtures-painel.ts`, `test/fixtures-prestadores.ts` e `test/fixtures-checklists.ts`. Não use uma pasta `test/fixtures/`, que colide com `fixtures.ts`.
- **Modais genéricos:**
  - `src/modais.ts`: um contador `modaisAbertos` e o hook `usarModalAberto()`, que registra ao montar e desmontar.
  - `LayoutGestor.vue`: `inert` quando `novoAcionamento.aberto || modaisAbertos > 0`, e um alvo `<div id="modais-gestor">` na `.coluna` para `<Teleport>`.

  Assim os três modais de Prestadores não tocam o layout.
- `CabecalhoPagina.vue`: prop `espaco?: 10 | 12`, com 12 de padrão.
- `PaginaPrestadores.vue` já com os pontos de encaixe, se Planilha for um agente separado: `<BotoesPlanilha />` (`prestadores/planilha/BotoesPlanilha.vue`) e `<ModalImportacao />`, cada um num arquivo da frente Planilha.

**Prestador:** mover `paginas/PaginaAgenda.vue` para `agenda/PaginaAgenda.vue` e atualizar o `router.ts`.

**Visual:**
- Novo `tools/visual/regioes.ts` com as regiões comuns (`sidebar`, `abasGestor`, `cabecalhoWeb`, `abasPrestador`, `cabecalhoPrestador`) e os helpers `esperar`, `esperarToast` e `esperarFonte`.
- Um arquivo por tela: `casos-painel.ts`, `casos-prestadores.ts`, `casos-checklists.ts` e `casos-agenda.ts`, com os casos provisórios atuais movidos para eles.
- `casos.ts` agrega em ordem segura, com os casos só de leitura primeiro: `[...CASOS_PAINEL, ...CASOS_GESTOR, ...CASOS_AGENDA, ...CASOS_PRESTADOR, ...CASOS_CHECKLISTS, ...CASOS_PRESTADORES]`.

**Ambiente de cada worktree:**
- Copiar o `.env` e trocar `DATABASE_URL` e `DATABASE_URL_TEST` para `kgb_<frente>` e `kgb_<frente>_test` (criar os bancos com `createdb`).
- Ajustar `PORT` (3001–3005), `BETTER_AUTH_URL`, `API_PROXY_ALVO` e `CORS_ORIGINS` com as portas dos fronts.
- Subir os fronts com `pnpm --filter @kgb/gestor exec vite --port 51xx`.
- Rodar o visual com `URL_GESTOR` e `URL_PRESTADOR`.
- `pnpm install` roda o `prisma generate`; depois, `pnpm db:migrate` e `pnpm db:seed` no banco do worktree.

### 8.3 Divisão sugerida (5 agentes) e regras de merge

| Agente | Arquivos que são dele |
|---|---|
| **Painel** | `rotas/painel.ts`, `servicos/painel.ts`, `dominio/painel.ts` (+ testes), `gestor/src/painel/**`, `test/fixtures-painel.ts`, `casos-painel.ts` |
| **Prestadores (CRUD)** | `rotas/prestadores.ts` (menos as rotas de planilha), `servicos/prestadores.ts`, `dominio/prestador.ts`, `gestor/src/prestadores/**` (menos `planilha/`), `fixtures-prestadores.ts`, `casos-prestadores.ts` |
| **Planilha** | handlers de importação e exportação (em `rotas/prestadores.ts`, em bloco próprio no fim do arquivo, ou em `rotas/planilha.ts`), `servicos/planilha.ts`, `gestor/src/prestadores/planilha/**` |
| **Checklists** | `rotas/tipos.ts`, `servicos/tipos.ts`, `dominio/tipos.ts`, `gestor/src/checklists/**`, `fixtures-checklists.ts`, `casos-checklists.ts` |
| **Agenda** | `prestador/src/agenda/**`, `casos-agenda.ts` (só usa os helpers de `@kgb/ui` do esqueleto) |

Para eliminar de vez o último ponto de contato de Prestadores e Planilha, as rotas de planilha podem ir para `rotas/planilha.ts`, registradas no esqueleto.

**Regras:**
1. Ninguém edita `app.ts`, `index.ts` do cliente, `schema.prisma`, `pnpm-lock.yaml`, `casos.ts`, `README.md`/`CLAUDE.md`/`docs/` nem o `index.ts` de `@kgb/ui`. Uma necessidade nova vai para o orquestrador.
2. Mudou um schema da própria tela: rode `pnpm api:generate` no worktree. **No merge, conflitos em `openapi.json` e `schema.d.ts` nunca são resolvidos à mão.** Aceite qualquer um dos lados, rode `pnpm api:generate` e commite.
3. Cada frente usa um banco `_test` próprio. Antes de integrar: `pnpm test`, `typecheck`, `lint`, `format:check` e, com o seed do dia, `pnpm visual -- --caso=…` dos próprios casos.
