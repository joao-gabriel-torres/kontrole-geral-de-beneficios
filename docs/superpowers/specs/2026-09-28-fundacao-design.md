# Fundação do KGB — design

Data: 2026-09-28 · Branch: `chore/fundacao`

## Objetivo

Deixar o repositório pronto para desenvolver o sistema de acionamentos da Russo Assistência descrito em [`docs/design/README.md`](../../design/README.md): gestor web responsivo + app do prestador, fluxo **gestor cria acionamento → prestador executa → gestor aprova ou reprova**.

**Critério de sucesso:** clonar, seguir o README raiz (`pnpm install`, criar bancos, `pnpm db:reset`, `pnpm dev`) e ter API, gestor e prestador de pé, com login funcionando para os dois papéis, shells navegáveis e CI verde no PR.

**Fora desta rodada:** telas reais (cada uma vira sua própria entrega), storage de fotos (S3/R2), push, fila offline, cadastro de usuários pelo gestor, build Android (depende de Android Studio + JDK, ausentes na máquina), deploy.

## Decisões

| Tema | Decisão |
|---|---|
| Monorepo | pnpm workspaces + Turborepo, escopo `@kgb/*` |
| API | App próprio: Hono sobre Node, `@hono/zod-openapi` (validação zod → spec OpenAPI), Scalar em `/api/docs` |
| Estilo de API | REST + OpenAPI; clientes tipados gerados com `openapi-typescript` + `openapi-fetch` |
| Banco | PostgreSQL + Prisma. Dev: Postgres 15 do Homebrew (`kgb_dev`, `kgb_test`) |
| Auth | Better Auth (adapter Prisma), e-mail + senha, cadastro público desligado |
| Front gestor | Vue 3 + Vuetify + Vite + vue-router (SPA) |
| App prestador | Vue 3 + Vuetify + Vite + vue-router, empacotado com Capacitor (iOS/Android), `appId` `br.com.russoassistencia.prestador` |
| Visual | Tokens da marca Russo (README do handoff). A pasta `docs/design/_ds/` (Vitalize) é só base do protótipo e **não** é usada |
| Ícones | Lucide (`@lucide/vue`; o antigo `lucide-vue-next` foi descontinuado) registrado como icon set do Vuetify |
| Fonte | Plus Jakarta Sans empacotada via Fontsource (funciona offline no Capacitor) |
| Qualidade | ESLint flat (typescript-eslint + eslint-plugin-vue) + Prettier, `vue-tsc`, Vitest |
| CI | GitHub Actions com serviço Postgres 15 |
| Node | `.nvmrc` 24 (LTS), `engines >=24` (dev local em 26 funciona) |
| Fuso | Datas e horários de atendimento em `America/Sao_Paulo` |

**Versões fixadas (levantamento de 2026-09-28):**
- **Vuetify 4** (MD3), com tema `light` explícito, porque o padrão virou `system`. Os estilos da Russo entram na camada `vuetify-overrides`. O breakpoint `md` agora começa em 840px.
- **Prisma 7.10.0**, fixado exato. O `latest` do npm aponta para um RC da v8, incompatível com o Better Auth. A v7 exige `prisma.config.ts`, o generator `prisma-client` com `output` e o adapter `@prisma/adapter-pg`, e é só ESM.
- **TypeScript ~5.9**. O TS 7 (nativo) ainda quebra typescript-eslint, vue-tsc e openapi-typescript.
- **CLI do Better Auth:** o pacote `auth` (`npx auth generate`). O `@better-auth/cli` foi descontinuado.
- **pnpm 10.32.1**, fixado em `packageManager`.

Por que API separada e não Nuxt/Nitro: o gestor é ferramenta interna logada (sem ganho de SSR), o prestador precisa ser SPA estática para o Capacitor, e uma API independente com contrato OpenAPI serve os dois fronts do mesmo jeito.

## Estrutura

```
apps/
  api/          Hono · rotas REST sob /api · Better Auth em /api/auth/* · spec em /api/openapi.json · Scalar em /api/docs
  gestor/       SPA Vue + Vuetify (:5173)
  prestador/    SPA Vue + Vuetify + Capacitor (:5174), plataformas ios/ e android/
packages/
  db/           schema.prisma, migrations, seed, client exportado
  api-client/   schema.d.ts gerado do OpenAPI + createApiClient() (openapi-fetch) + auth client (better-auth/vue)
  ui/           plugin Vuetify da Russo (tema, defaults, ícones), tokens TS, mapa de status, <StatusChip>, fonte
  tsconfig/     bases de tsconfig
docs/
  design/       handoff (fonte da verdade de telas e regras)
  superpowers/  specs e planos
```

Dependências entre pacotes: `api → db`; `gestor, prestador → api-client, ui`. Os fronts **nunca** importam `db` nem `api`: o único contrato é o OpenAPI.

## API

- Rotas desta rodada:
  - `GET /api/health` → `{ ok: true }`
  - `GET /api/me` → usuário da sessão `{ id, nome, email, role, prestador?: { id, nome } }`; 401 sem sessão
  - `GET /api/openapi.json`, `GET /api/docs`
  - `/api/auth/*` → handler do Better Auth
- Middlewares: `sessao` (resolve a sessão via `auth.api.getSession` e põe o usuário no contexto), `exigeLogin` (401), `exigePapel('gestor' | 'prestador')` (403). Regra de acesso a registrar no código: prestador só enxerga acionamentos com `prestadorId` igual ao seu (aplicada nas rotas de acionamento quando existirem).
- CORS: allowlist vinda de `CORS_ORIGINS` (dev: `http://localhost:5173,http://localhost:5174,capacitor://localhost,https://localhost`), `credentials: true`. Os mesmos valores entram em `trustedOrigins` do Better Auth.
- Script `pnpm api:generate`: importa o app, extrai o documento OpenAPI, grava `packages/api-client/openapi.json` e gera `schema.d.ts`. Os artefatos gerados são versionados; o CI falha se estiverem desatualizados.
- Erros: corpo padrão `{ erro: { codigo, mensagem } }`; erros de validação do zod viram 422 com a lista de campos.

## Autenticação

- Better Auth com `emailAndPassword` (`disableSignUp: true`). Usuários vêm do seed; cadastro pelo gestor é entrega futura.
- `user.additionalFields`: `role` (string, `input: false`, padrão `prestador`) e `prestadorId` (string opcional, `input: false`, único, FK para `Prestador`).
- Gestor: sessão por cookie. Em dev, o proxy do Vite encaminha `/api` para `:3000`, deixando front e API na mesma origem.
- Prestador: plugin `bearer`. O token recebido no login é guardado com `@capacitor/preferences` e enviado em `Authorization: Bearer` pelo `api-client` e pelo auth client. Base da API por `VITE_API_URL` (vazio em dev web → usa o proxy; build nativo → URL absoluta).
- Guards de rota nos dois fronts: sem sessão → `/login`; papel errado → logout e, na tela de login, a mensagem "Esta conta é de prestador. Use o app do prestador." (no gestor) ou "Esta conta é de gestor. Use o painel web." (no prestador).

## Banco (Prisma)

Nomes de domínio em português, iguais ao handoff.

- **Tabelas do Better Auth:** `User` (+ `role`, `prestadorId`), `Session`, `Account`, `Verification`.
- **TipoDemanda:** `id`, `nome` (único), `cor`, `checklist String[]`, `excluidoEm?` (soft delete, para não quebrar demandas antigas), timestamps.
- **Prestador:** `id`, `nome`, `documento` (só dígitos, único), `telefone` (só dígitos), `email?`, `regiao?`, `status` (enum `ativo | inativo`), `credenciadoDesde` (date), `excluidoEm?`, `cor`, `especialidades` (N:N com TipoDemanda), `user?`.
- **Acionamento:** `id`, `numero` (int, sequence; o código `AC-{numero}` é derivado), `titulo`, `cliente`, `endereco`, `data` (date), `inicio`/`fim` (`HH:MM`), `prestadorId`, `status` (enum `aberto | em_andamento | aguardando | reprovado | aprovado`), `inviavel` (bool), `criadoEm`, `iniciadoEm?`, `comentarioConclusao?`, `inviabilidadeComentario?`, `criadoPorId` (User).
- **Demanda:** `id`, `acionamentoId`, `tipoId`, `tipoNome` e `cor` (snapshot), `ordem`.
- **Etapa:** `id`, `demandaId`, `ordem`, `texto` (snapshot), `feita`, `comentario?`.
- **Foto:** `id`, `acionamentoId`, `contexto` (enum `etapa | conclusao | inviabilidade`), `etapaId?`, `storageKey`, `tiradaEm`, `criadaEm`. A URL é assinada na leitura (quando o storage existir).
- **Revisao:** `id`, `acionamentoId`, `decisao` (enum `aprovado | reprovado`), `motivo?`, `em`, `gestorId` (User). Base dos KPIs de aprovação.
- **EventoAcionamento:** `id`, `acionamentoId`, `tipo` (enum `criado | iniciado | enviado | inviabilidade_enviada | aprovado | reprovado`), `em`, `autorId` (User), `dados Json?`. Log de auditoria que alimenta a linha do tempo; os `envios` do handoff são derivados daqui.
- **Configuracao:** linha única (`id = 1`) com `photoMin` (padrão 1) e `requireAllSteps` (padrão false).

**Seed (`pnpm db:seed`, só dev):** apaga os dados de domínio e recria a partir de `docs/design/acionamentos-data.js` (8 tipos com checklists, 6 prestadores, acionamentos com datas relativas ao dia do seed, revisões e eventos coerentes com cada status) e cria os usuários:
- `renata@russo.dev` — Renata Silva, `gestor`
- `carlos@russo.dev` — Carlos Mendes, `prestador` ligado ao prestador `p1`

Senha de dev única documentada no README raiz. O seed se recusa a rodar com `NODE_ENV=production`.

## Pacote `ui`

- `russoVuetify()` → opções do `createVuetify`: tema claro `russo` com as cores do handoff (primary `#0069BD`, warning `#FC7608`, error `#FF6A5D`, success `#0B8C61`, background `#F9F9F9`, surface `#FFFFFF`, textos `#262A3B`/`#363853`), `defaults` globais (botões e inputs 48px com raio 16 e sem sombra, cards raio 16 sem elevação, chips pill 12/600), icon set Lucide com aliases do Vuetify.
- `tokens.ts` com cores, raios, sombras e espaçamentos do handoff.
- `status.ts`: rótulo e cores por status (inclui `inviavel`), exatamente a tabela do handoff.
- `<StatusChip :status :inviavel>`.
- CSS com a fonte Plus Jakarta Sans (400–800) e a família aplicada ao Vuetify.

## Shells

**Gestor**
- `/login`: logo Russo, e-mail, senha, "Entrar"; erro "E-mail ou senha incorretos".
- Layout autenticado: no desktop (`mdAndUp`, ≥ 840px), sidebar permanente de 232px ("GESTÃO DE DEMANDAS", 5 itens de 44px com raio 12, item ativo `#E6F0FA`/`#004E8F`, badge laranja em Aprovações escondido quando 0, cartão do usuário no rodapé com iniciais + nome + "Gestora"); no mobile, barra inferior de 76px com os mesmos 5 itens e ponto de 4px no ativo. Área de conteúdo `#F9F9F9` com os paddings do handoff.
- Rotas: `/painel` (padrão), `/acionamentos`, `/aprovacoes`, `/prestadores`, `/checklists`, cada uma com título e estado vazio "Em construção".

**Prestador**
- `/login` igual em estrutura, adaptado a 375px.
- Layout com barra inferior de 80px: Início · Agenda · Demandas (ícone 24, label 11/600, ponto azul no ativo).
- `/inicio`: marca Russo, data ("Segunda-feira, 28/09"), saudação "{Bom dia|Boa tarde|Boa noite}, {primeiro nome}" e avatar; demais blocos "Em construção".
- `/agenda`, `/demandas`: título + "Em construção".
- Capacitor: `capacitor.config.ts` com o `appId`, `webDir: dist`; plataformas `ios/` e `android/` geradas e versionadas.

## Testes

- `api`: `health`; `openapi.json` expõe `/api/me`; `/api/me` 401 sem sessão e 200 com sessão do seed (login via Better Auth); `exigePapel` retorna 403 para o papel errado. Rodam contra `kgb_test` (migrations aplicadas antes da suíte).
- `ui`: mapa de status bate com a tabela do handoff.
- `gestor`: layout renderiza os 5 itens; guard redireciona para `/login` sem sessão.
- `prestador`: saudação por horário (limites 12h e 18h); layout renderiza as 3 abas.

## Ferramentas de desenvolvimento

- Scripts raiz: `dev`, `build`, `lint`, `format`, `typecheck`, `test`, `db:migrate`, `db:seed`, `db:reset`, `db:studio`, `api:generate`.
- `.env.example` por app (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CORS_ORIGINS`, `VITE_API_URL`).
- `.editorconfig`, `.nvmrc`, `.vscode/extensions.json` (Vue - Official, ESLint, Prettier, Prisma, Vitest) e `settings.json` (formatar ao salvar).
- `README.md` raiz: pré-requisitos, setup passo a passo, scripts, estrutura, usuários de dev, como rodar no simulador iOS.
- `CLAUDE.md`: comandos, arquitetura, convenções (nomes de domínio em português, regras de negócio em `docs/design/README.md`, contrato OpenAPI como fronteira entre fronts e API, TDD nas regras de negócio).

## Git

- `main` já contém o handoff em `docs/design/`.
- A fundação vai na branch `chore/fundacao` em commits pequenos por etapa, e termina num PR para `main` com o CI rodando.
