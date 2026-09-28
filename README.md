# KGB — Kontrole Geral de Benefícios

Sistema de acionamentos da **Russo Assistência Residencial**. O gestor abre acionamentos de manutenção (vazamento, revisão elétrica, pintura…) e os atribui a prestadores credenciados. O prestador executa o checklist pelo app, com fotos, e envia para aprovação. O gestor aprova ou reprova.

A especificação funcional e o protótipo navegável estão em [`docs/design/`](docs/design/README.md). Eles são a fonte da verdade de telas, regras e textos.

| App                     | Stack                                                  | Endereço em dev                                     |
| ----------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| API                     | Hono + Better Auth + Prisma/PostgreSQL, REST + OpenAPI | http://localhost:3000 (documentação em `/api/docs`) |
| Gestor (web responsivo) | Vue 3 + Vuetify 4                                      | http://localhost:5173                               |
| Prestador (app)         | Vue 3 + Vuetify 4 + Capacitor 8 (iOS/Android)          | http://localhost:5174                               |

## Pré-requisitos

- **Node 24+** e **pnpm 10** (`corepack enable` ativa a versão fixada no `package.json`)
- **PostgreSQL 15**: `brew install postgresql@15 && brew services start postgresql@15`
- **iOS** (opcional): Xcode
- **Android** (opcional): Android Studio + JDK 21

## Primeira vez

```bash
pnpm install
cp .env.example .env
# no .env: troque SEU_USUARIO pelo resultado de `whoami`
# e gere o segredo do Better Auth com: openssl rand -base64 32
createdb kgb_dev && createdb kgb_test
pnpm db:migrate
pnpm db:seed
pnpm dev
```

As fotos enviadas pelo app ficam em `var/uploads` (`ARQUIVOS_DIR` no `.env`, fora do git). Em produção, S3 ou Cloudflare R2 entram como outra implementação da interface `Armazenamento` da API, sem mudar os apps.

### Usuários de desenvolvimento

O seed recria os dados de exemplo do protótipo, com datas relativas ao dia em que roda.

| Papel                     | E-mail             | Senha       |
| ------------------------- | ------------------ | ----------- |
| Gestora (Renata Silva)    | `renata@russo.dev` | `russo2026` |
| Prestador (Carlos Mendes) | `carlos@russo.dev` | `russo2026` |

## Scripts

| Comando                                           | O que faz                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------- |
| `pnpm dev`                                        | Sobe API, gestor e prestador em modo desenvolvimento                      |
| `pnpm build`                                      | Gera o build de produção dos fronts                                       |
| `pnpm lint` / `pnpm format` / `pnpm format:check` | ESLint e Prettier no monorepo                                             |
| `pnpm typecheck`                                  | Checagem de tipos de todos os pacotes (`tsc` / `vue-tsc`)                 |
| `pnpm test`                                       | Testes (Vitest) de todos os pacotes, um pacote por vez                    |
| `pnpm db:migrate`                                 | Cria/aplica migrations depois de mudar `packages/db/prisma/schema.prisma` |
| `pnpm db:seed`                                    | Apaga os dados do `kgb_dev` e recria os dados de exemplo                  |
| `pnpm db:reset`                                   | Recria o banco do zero (migrations + seed)                                |
| `pnpm db:studio`                                  | Abre o Prisma Studio                                                      |
| `pnpm api:generate`                               | Regenera o OpenAPI e os tipos do cliente depois de mudar a API            |
| `pnpm visual`                                     | Compara o app com o protótipo pixel a pixel                               |

## Estrutura

```
apps/
  api/          API REST (Hono) · Better Auth · OpenAPI
  gestor/       SPA do gestor
  prestador/    SPA do prestador + projetos nativos (ios/, android/)
packages/
  db/           schema Prisma, migrations, seed
  api-client/   tipos gerados do OpenAPI + cliente tipado + cliente de auth
  ui/           tema Vuetify, tokens da marca, ícones do protótipo, componentes base
  tsconfig/     bases de TypeScript
tools/
  visual/       comparação visual com o protótipo (Playwright + pixelmatch)
docs/
  design/       handoff: especificação e protótipo navegável
  superpowers/  specs e planos de implementação
```

Os fronts falam com a API **só** via `@kgb/api-client`. O gestor usa sessão por cookie. O prestador usa token Bearer guardado no aparelho.

## Fidelidade visual (pixel perfect)

As telas precisam ser idênticas ao protótipo em `docs/design/Acionamentos.dc.html`. O `pnpm visual` sobe o protótipo e abre o protótipo e o app no mesmo tamanho de tela. Depois recorta as mesmas regiões dos dois e compara pixel a pixel.

- **Pré-requisitos:** a API e os dois apps rodando (`pnpm dev`) e o seed do dia (`pnpm db:seed`), porque o protótipo gera os dados a partir da data de hoje.
- **Limites por região:** no máximo 0,2 % dos pixels da região e 2 % dos pixels de conteúdo.
- **Resultado:** as imagens do protótipo, do app e do diff ficam em `tools/visual/.saida/`.
- `pnpm visual -- --caso=<nome>` compara um caso só.
- `pnpm visual -- --sanidade` compara o protótipo com ele mesmo e confirma que um deslocamento de 1px é detectado.
- Ao implementar uma tela, acrescente as regiões dela em `tools/visual/casos.ts`.

## App nativo (prestador)

O app do prestador roda no navegador em dev. Para rodar no aparelho ou no simulador:

```bash
# a API precisa estar acessível pelo aparelho
VITE_API_URL=http://<ip-da-sua-maquina>:3000 pnpm --filter @kgb/prestador nativo:sync
pnpm --filter @kgb/prestador nativo:ios       # abre no Xcode
pnpm --filter @kgb/prestador nativo:android   # abre no Android Studio (requer SDK + JDK)
```

- No iOS, o projeto usa Swift Package Manager (não precisa de CocoaPods). Antes do primeiro build, instale a plataforma iOS e um simulador no Xcode, em **Settings › Components**.
- No Android, o WebView roda em `https://localhost`, então chamar uma API `http://` exige HTTPS na API ou liberar mixed content.
- As origens dos apps nativos já estão em `CORS_ORIGINS`.

## Documentação

- [Especificação funcional e protótipo](docs/design/README.md)
- [Design da fundação](docs/superpowers/specs/2026-09-28-fundacao-design.md)
- [Plano de implementação da fundação](docs/superpowers/plans/2026-09-28-fundacao.md)
- [`CLAUDE.md`](CLAUDE.md): regras do projeto para quem desenvolve com o Claude Code
