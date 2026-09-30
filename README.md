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

## Novo acionamento inteligente

No modal Novo acionamento, o gestor:

- busca a demanda por nome ou categoria (Hidráulica, Elétrica, Acabamento, Climatização, Segurança; a categoria de cada tipo se edita na tela de Checklists);
- busca o cliente na base de **assinantes** (o seed cria um por cliente do protótipo): selecionar preenche endereço e CEP;
- pode atender em outro endereço digitando um CEP — a rua, o bairro e a cidade vêm do ViaCEP (precisa de internet em dev) e o modal pede número e complemento — e conferir o local pelo "Ver no mapa";
- escolhe o prestador numa busca já ordenada pela proximidade entre o CEP do prestador (editável no cadastro) e o do atendimento.

### Mapa e geocodificação

"Ver no mapa" no Novo acionamento usa o Leaflet com os tiles do OpenStreetMap, e a posição inicial vem de `GET /api/geocodificacao`, que consulta o Nominatim (OpenStreetMap) com cache e no máximo 1 requisição por segundo, como pede a [política de uso](https://operations.osmfoundation.org/policies/nominatim/). Antes de produção, troque o contato do `User-Agent` em `apps/api/src/servicos/geocodificacao.ts` por um e-mail da Russo; se o volume crescer, use um provedor de tiles e geocodificação com chave. A posição confirmada fica no acionamento e, no endereço do próprio assinante, também nele: o próximo acionamento dele já nasce com a localização conferida.

## Convite por e-mail

O prestador entra no app por convite. O gestor chama `POST /api/prestadores/{id}/convite` e a API cria o usuário com o e-mail do cadastro, que vira o login. O prestador recebe um link de uso único, válido por 7 dias, e cria a senha na tela "Crie sua senha" do app (`/convite?token=…`). Reenviar invalida o link anterior e, para quem já tem senha, funciona como redefinição. O e-mail do cadastro precisa ser um endereço só e válido (o mesmo critério do login); senão o convite responde 409 `email_invalido`.

| Variável            | Para quê                                                                                      |
| ------------------- | --------------------------------------------------------------------------------------------- |
| `SMTP_URL`          | Servidor de e-mail (ex.: `smtps://usuario:senha@host:465`). Vazia no dev: grava em arquivo    |
| `EMAIL_REMETENTE`   | Remetente dos e-mails (ex.: `Russo Assistência <nao-responda@…>`); obrigatório com `SMTP_URL` |
| `URL_APP_PRESTADOR` | Endereço do app do prestador usado no link. Vazia no dev: `http://localhost:5174`             |

Em desenvolvimento, sem `SMTP_URL`, cada e-mail vira um HTML em `var/emails/` (fora do git), e o link do convite aparece no log da API. Em produção (`NODE_ENV=production`), a API não sobe sem as três variáveis, e o SMTP desiste em até 6 s para o gestor ver o erro antes que o app desista da chamada.

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
| `pnpm e2e`                                        | Roteiro ponta a ponta do fluxo nos dois apps (cria dados no `kgb_dev`)    |

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

## Roteiro ponta a ponta

Com `pnpm dev` rodando, o `pnpm e2e` percorre o fluxo inteiro contra a API real, nos dois apps:

1. A gestora cria um acionamento para o Carlos.
2. O Carlos o vê no Início e em Demandas, inicia, marca as etapas, anexa fotos, comenta e envia.
3. A gestora reprova com motivo; o Carlos corrige e reenvia; a gestora aprova.
4. Um segundo acionamento é marcado como inviável; a gestora recusa, o Carlos marca de novo e a gestora confirma.

O roteiro cria acionamentos novos no `kgb_dev`. Rode `pnpm db:seed` antes de um `pnpm visual`. Em caso de falha, as telas do momento ficam em `tools/visual/.saida/ponta-a-ponta-*.png`.

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

## Deploy (Cloudflare Pages)

O gestor e o prestador web são sites estáticos no Cloudflare Pages, um projeto para cada, ligados a este repositório (Workers & Pages › Create › Pages › Connect to Git). A API (Node + PostgreSQL + pasta de fotos) vai num host Node à parte, a escolher: o Pages só serve os arquivos do build. Os exemplos usam `seu-dominio.com.br`.

| Configuração do projeto | Gestor                                                              | Prestador                                                              |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Nome sugerido           | `kgb-gestor`                                                        | `kgb-prestador`                                                        |
| Framework preset        | None                                                                | None                                                                   |
| Diretório raiz          | vazio (a raiz do repositório, por causa do workspace pnpm)          | vazio                                                                  |
| Comando de build        | `pnpm install --frozen-lockfile && pnpm --filter @kgb/gestor build` | `pnpm install --frozen-lockfile && pnpm --filter @kgb/prestador build` |
| Pasta de saída          | `apps/gestor/dist`                                                  | `apps/prestador/dist`                                                  |
| Domínio personalizado   | `gestor.seu-dominio.com.br`                                         | `prestador.seu-dominio.com.br`                                         |

Variáveis de ambiente dos dois projetos (em Production e em Preview):

| Variável                  | Valor                            | Para quê                                                                                      |
| ------------------------- | -------------------------------- | --------------------------------------------------------------------------------------------- |
| `VITE_API_URL`            | `https://api.seu-dominio.com.br` | Endereço da API, gravado no build. É o único ajuste dos apps; mudou, faça um deploy novo      |
| `NODE_VERSION`            | `24`                             | O repositório exige Node 24+ (a imagem do Pages vem com o 22)                                 |
| `PNPM_VERSION`            | `10.32.1`                        | A mesma do `packageManager` do `package.json`                                                 |
| `SKIP_DEPENDENCY_INSTALL` | `1`                              | O comando de build já instala com `--frozen-lockfile`; sem ela, o Pages instalaria duas vezes |

O build não usa `.env` nem banco (o `postinstall` roda o `prisma generate`, que não conecta). O `public/` de cada app vai para o `dist` com dois arquivos do Pages:

- `_headers`: cache de um ano, imutável, em `/assets/*` (nomes com hash); `no-cache` no resto (o `index.html` e as rotas do SPA), para o deploy novo chegar na hora; `nosniff`, `X-Frame-Options`, `Referrer-Policy` e `Permissions-Policy` (câmera só no prestador).
- `_redirects`: sem regras. Sem um `404.html` na raiz, o Pages já serve o `index.html` em qualquer caminho (rotas do SPA e o link do convite). Não crie um `404.html` em `public/`, e não use `/* /index.html 200`: o Pages a ignora como laço infinito.

### Ajustes na API

A API roda com `NODE_ENV=production` e estas variáveis, além do banco, do `BETTER_AUTH_SECRET` e do e-mail (ver [Convite por e-mail](#convite-por-e-mail); o provedor ainda está a definir):

| Variável            | Valor                                                                                                            |
| ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_URL`   | `https://api.seu-dominio.com.br`, o mesmo do `VITE_API_URL`                                                      |
| `CORS_ORIGINS`      | `https://gestor.seu-dominio.com.br,https://prestador.seu-dominio.com.br,capacitor://localhost,https://localhost` |
| `URL_APP_PRESTADOR` | `https://prestador.seu-dominio.com.br`: o link do convite abre `/convite?token=…` no app do Pages                |

`CORS_ORIGINS` leva as origens exatas, sem barra nem caminho no fim: o navegador manda a origem assim, e o CORS e o Better Auth comparam o texto. A API não sobe com uma origem escrita de outro jeito e diz como corrigir. As prévias do Pages (`<branch>.kgb-prestador.pages.dev`) só falam com a API se a origem delas estiver na lista.

**Cookie do gestor entre subdomínios.** O gestor entra com cookie de sessão (o prestador usa token Bearer e não depende disto). O Better Auth grava o cookie no host da API (`api.seu-dominio.com.br`), com `HttpOnly`, `Secure` e `SameSite=Lax`, e o navegador o manda nas chamadas do gestor porque `gestor.` e `api.` são o mesmo site (o mesmo domínio registrável). Por isso não é preciso `advanced.crossSubDomainCookies`: ele espalharia o cookie por `.seu-dominio.com.br`, e o navegador passaria a mandá-lo também para o Pages. Em outro site o cookie não vai: com o gestor em `kgb-gestor.pages.dev` e a API em `api.seu-dominio.com.br`, o login responde 200, mas a sessão não fica. O gestor precisa do domínio personalizado no mesmo domínio da API.

### Checagem depois do deploy

1. `curl -sI https://gestor.seu-dominio.com.br/acionamentos` responde 200 com `cache-control: no-cache`, e um arquivo de `/assets/` (veja o nome no `index.html`) responde com `cache-control: public, max-age=31536000, immutable`.
2. `curl -sI -H 'Origin: https://gestor.seu-dominio.com.br' https://api.seu-dominio.com.br/api/health` traz `access-control-allow-origin: https://gestor.seu-dominio.com.br` e `access-control-allow-credentials: true`. Repita com a origem do prestador.
3. No gestor: entre, abra um acionamento e recarregue a página. Continuar logado confirma o cookie (em DevTools › Network, as chamadas à API levam o `__Secure-better-auth.session_token`).
4. No prestador: `https://prestador.seu-dominio.com.br/convite?token=teste` abre a tela do convite (não um 404). Entre com um prestador e anexe uma foto numa etapa.
5. Reenvie um convite de teste: o link do e-mail aponta para `https://prestador.seu-dominio.com.br/convite?token=…`.

O app nativo (Capacitor) não passa pelo Pages: continua com `VITE_API_URL` no build (`nativo:sync`), agora com `https://api.seu-dominio.com.br`. As fotos ficam no disco do host da API (`ARQUIVOS_DIR`, que precisa ser persistente); o próximo passo natural é o Cloudflare R2, como outra implementação da interface `Armazenamento`, sem mudar os apps.

## Documentação

- [Especificação funcional e protótipo](docs/design/README.md)
- [Design da fundação](docs/superpowers/specs/2026-09-28-fundacao-design.md)
- [Plano de implementação da fundação](docs/superpowers/plans/2026-09-28-fundacao.md)
- [`CLAUDE.md`](CLAUDE.md): regras do projeto para quem desenvolve com o Claude Code
