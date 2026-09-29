# KGB — Kontrole Geral de Benefícios

Sistema de acionamentos da Russo Assistência: gestor web (Vue + Vuetify), app do prestador (Vue + Vuetify + Capacitor) e API (Hono + Better Auth + Prisma/Postgres). Monorepo pnpm + Turborepo.

## Fonte da verdade

- Telas, regras de negócio e textos: `docs/design/README.md` e o protótipo `docs/design/Acionamentos.dc.html` (abrir com `npx serve docs/design`).
- Decisões de arquitetura: `docs/superpowers/specs/`.

## Comandos

- `pnpm dev`: API :3000, gestor :5173, prestador :5174
- `pnpm test`, `pnpm typecheck`, `pnpm lint` e `pnpm format:check` precisam passar antes de qualquer commit
- `pnpm db:migrate` (depois de mudar `packages/db/prisma/schema.prisma`) e `pnpm db:seed`
- `pnpm api:generate` depois de mudar qualquer rota ou schema da API (o CI falha se o cliente estiver desatualizado)
- `pnpm visual`: compara o app com o protótipo pixel a pixel (API e apps rodando, seed do dia)

## Regras

- **Pixel perfect com o protótipo.** Medidas, cores e textos saem do CSS inline de `Acionamentos.dc.html`, não do "parecido". Toda tela implementada ganha regiões em `tools/visual/casos.ts` e só está pronta com `pnpm visual` dentro dos limites (≤ 0,2 % da região e ≤ 2 % do conteúdo). Divergência se corrige no CSS, nunca no limite.
- Atenção aos padrões do navegador que o protótipo herda: `line-height: normal` (o Vuetify usa 1.5), margens de `h1`, e o padding padrão de `<button>` (`1px 6px`) nos botões sem padding explícito.
- Ícones de tela: `<RussoIcone>` (SVGs do protótipo). Não usar MDI nem Lucide em telas.
- Os fronts falam com a API só via `@kgb/api-client`; nunca importam `@kgb/db` nem `apps/api`.
- Nomes de domínio em português (acionamento, prestador, etapa, demanda…), iguais ao handoff.
- Regras de negócio (transições de status, validações) com TDD na API; o prestador só enxerga os próprios acionamentos.
- Datas de atendimento no fuso `America/Sao_Paulo` (use os formatos de `@kgb/ui`).
- Testes de banco usam só `DATABASE_URL_TEST` (precisa terminar em `_test`).
- Prisma 7: versões fixas em 7.10.0; depois de `migrate dev`, rode `prisma generate` (o script `db:migrate` já faz).
