# Fluxo principal de acionamentos — design

Data: 2026-09-28 · Branch: `feat/fluxo-principal` (a partir de `chore/fundacao`)

## Objetivo

Fazer o ciclo **gestor cria acionamento → prestador executa → gestor aprova ou reprova** funcionar de ponta a ponta, com telas **pixel perfect** em relação ao protótipo (`docs/design/Acionamentos.dc.html`).

**Critério de sucesso:** com `pnpm dev` e o seed do dia, as situações abaixo funcionam contra a API real, e o `pnpm visual` fica dentro dos limites em todas as regiões novas.
- A gestora cria um acionamento para o Carlos.
- O Carlos o vê no Início e em Demandas, inicia, marca etapas, anexa fotos e comenta.
- O Carlos envia para aprovação ou marca como inviável.
- A gestora vê o acionamento em Aprovações, abre o detalhe e aprova, ou reprova com motivo.
- O Carlos vê a reprovação, corrige e reenvia.

## Escopo

| App | Telas |
|---|---|
| Gestor | Acionamentos (lista), Novo acionamento (modal), Aprovações, Detalhe do acionamento |
| Prestador | Início (completo), Demandas, Detalhe e execução (com o painel "Marcar como inviável") |

**Fora do escopo:**
- Telas: o Painel com KPIs, Prestadores (cadastro e planilha), Checklists e a Agenda. Essas telas seguem "em construção". Os atalhos do Início que levam à Agenda continuam funcionando.
- Recursos: push, fila offline, geolocalização nas fotos e paginação da lista.
- Infraestrutura e cadastro: storage S3/R2 (só a interface pronta) e reatribuir o prestador de um acionamento.

**Referências de conteúdo e comportamento:** as seções "Telas — Gestor" 2, 3, 4 e 5 e "Telas — Prestador" 1, 3 e 4 de `docs/design/README.md`, e a lógica dos métodos `vGestor`, `vForm`, `vGDetail`, `vPro` e `vPDetail` do protótipo. Medidas e textos vêm do CSS e do template do protótipo.

## Regras de negócio

### Módulo de domínio

As regras ficam em `apps/api/src/dominio/acionamento.ts`: funções puras, testadas por TDD, sem Prisma. A camada de serviço aplica as funções numa transação e grava o evento.

| Ação | Quem | Status de origem | Pré-condições | Efeito | Evento |
|---|---|---|---|---|---|
| Criar | gestor | — | título, cliente e endereço não vazios; ≥ 1 tipo existente não excluído; data válida; `inicio < fim` (HH:MM); prestador **ativo** e não excluído | `aberto`; uma Demanda por tipo com **cópia** das etapas do checklist | `criado` |
| Iniciar | prestador dono | `aberto` | — | `em_andamento`, `iniciadoEm = agora` | `iniciado` |
| Marcar etapa / comentar etapa / comentário final | prestador dono | `em_andamento`, `reprovado` | — | atualiza a etapa ou o `comentarioConclusao` | — |
| Adicionar ou remover foto (etapa ou conclusão) | prestador dono | `em_andamento`, `reprovado` | foto válida (ver Fotos) | cria ou apaga a Foto e o arquivo | — |
| Enviar para aprovação | prestador dono | `em_andamento`, `reprovado` | fotos de conclusão ≥ `photoMin`; se `requireAllSteps`, todas as etapas feitas | `aguardando` | `enviado` |
| Marcar como inviável | prestador dono | `aberto`, `em_andamento`, `reprovado` | motivo não vazio; ≥ 1 foto | `aguardando`, `inviavel = true`, grava motivo e fotos; `iniciadoEm = agora` se estava vazio | `inviabilidade_enviada` |
| Aprovar (ou "Confirmar inviabilidade") | gestor | `aguardando` | — | `aprovado`; cria a Revisão | `aprovado` |
| Reprovar (ou "Recusar inviabilidade") | gestor | `aguardando` | motivo não vazio | `reprovado`; cria a Revisão com o motivo; se era inviável, `inviavel = false` e o motivo e as fotos da inviabilidade são apagados | `reprovado` (com `dados.motivo`) |

**Condições gerais:**
- Toda transição é **atômica e condicionada ao status atual**: um `update … where status in (…)` dentro da transação. Duas ações simultâneas nunca aplicam duas transições.
- Um status fora da tabela gera **409 `transicao_invalida`**. Uma pré-condição não atendida gera **422**, com um código específico: `fotos_insuficientes`, `etapas_pendentes`, `motivo_obrigatorio`, `prestador_inativo` ou `tipo_invalido`.
- `photoMin` e `requireAllSteps` vêm da tabela `Configuracao` (linha única).

### Visibilidade e permissões

- O prestador só enxerga os acionamentos com `prestadorId` igual ao seu. Qualquer outro responde **404**, sem revelar que existe. Um prestador sem vínculo não vê nada.
- As ações do prestador exigem o papel prestador e ser o dono. As ações do gestor exigem o papel gestor. Papel errado responde **403**.

### Derivados (iguais ao protótipo)

- **Código:** `AC-{numero}`.
- **Progresso:** `{etapas feitas}/{total} etapas`.
- **Status:** o rótulo e as cores vêm do mapa de `@kgb/ui`. `aguardando` + inviável vira "Inviabilidade em análise", e `aprovado` + inviável vira "Inviável".
- **Tipos:** os nomes das demandas unidos por " + ".
- **Quando:**
  - Gestor: `DD/MM/AAAA` e o horário `HH:MM–HH:MM`.
  - Prestador: "Hoje · 10:30–12:30", ou `DD/MM · 10:30–12:30` nos outros dias.
- **Linha do tempo** (vem dos `EventoAcionamento`):
  - criado → "Acionamento criado"
  - iniciado → "Atendimento iniciado"
  - enviado → "Enviado para aprovação" no primeiro envio, "Reenviado para aprovação" nos seguintes
  - inviabilidade_enviada → "Inviabilidade enviada"
  - aprovado → "Aprovado", com ponto `#0069BD`
  - reprovado → "Reprovado", com o motivo e ponto `#FF6A5D`
  - Os demais pontos são `#ADB3BC`. A data aparece como `DD/MM · HH:MM`.
- Todas as datas e horários no fuso `America/Sao_Paulo`.

## API

Todas as rotas ficam em `/api`, com schemas zod e OpenAPI. Os tipos do cliente são regenerados com `pnpm api:generate`.

| Método e rota | Papel | Descrição |
|---|---|---|
| `GET /api/tipos` | ambos | Tipos não excluídos: `{ id, nome, cor, checklist[] }` |
| `GET /api/prestadores?status=ativo` | gestor | `{ id, nome, regiao, cor }`, para o seletor do Novo acionamento |
| `GET /api/acionamentos?status=&busca=` | ambos | Lista de `ResumoAcionamento`, ordenada por data e início decrescentes. `status` aceita `aberto`, `em_andamento`, `aguardando`, `reprovado` ou `finalizados` (= `aprovado`). `busca` procura em título, cliente, código e nome do prestador, sem diferenciar maiúsculas e acentos |
| `GET /api/acionamentos/contagem` | ambos | Já existe |
| `GET /api/acionamentos/:id` | ambos | `DetalheAcionamento` |
| `POST /api/acionamentos` | gestor | Cria. 201 com `ResumoAcionamento` |
| `POST /api/acionamentos/:id/iniciar` | prestador | Transição |
| `PATCH /api/acionamentos/:id/etapas/:etapaId` | prestador | `{ feita?, comentario? }` |
| `PATCH /api/acionamentos/:id/conclusao` | prestador | `{ comentario }` |
| `POST /api/acionamentos/:id/fotos` | prestador | `multipart/form-data`: `arquivo`, `contexto` (`etapa` ou `conclusao`), `etapaId?`, `tiradaEm?`. 201 com `Foto` |
| `DELETE /api/acionamentos/:id/fotos/:fotoId` | prestador | Só fotos de etapa ou de conclusão |
| `POST /api/acionamentos/:id/enviar` | prestador | Transição |
| `POST /api/acionamentos/:id/inviavel` | prestador | `multipart/form-data`: `comentario` e `arquivos` (≥ 1) |
| `POST /api/acionamentos/:id/revisao` | gestor | `{ decisao: 'aprovado' \| 'reprovado', motivo? }` |
| `GET /api/prestador/inicio` | prestador | Dados do Início (ver abaixo) |
| `GET /api/arquivos/fotos/:fotoId?exp=&sig=` | URL assinada | Devolve o arquivo da foto, sem sessão |

**Formatos:**
- **`ResumoAcionamento`:** `{ id, codigo, titulo, cliente, endereco, data, inicio, fim, status, inviavel, prestador: { id, nome, cor }, tipos: [{ nome, cor }], etapas: { feitas, total }, ultimoEnvioEm | null }`
- **`DetalheAcionamento`:**
  - Os campos do resumo, mais `criadoEm`, `iniciadoEm`, `comentarioConclusao` e `regras: { photoMin, requireAllSteps }`.
  - `demandas: [{ id, tipoNome, cor, etapas: [{ id, texto, feita, comentario, fotos: Foto[] }] }]` e `fotosConclusao: Foto[]`.
  - `inviabilidade: { comentario, fotos: Foto[] } | null` e `revisoes: [{ decisao, motivo, em }]`.
  - `eventos: [{ tipo, em, motivo? }]`.
- **`Foto`:** `{ id, url | null, cor | null, horario: 'HH:MM', tiradaEm }`. Para as fotos de exemplo do seed (`storageKey = placeholder:#RRGGBB`), `url` é `null` e `cor` é a cor do bloco, como no protótipo.
- **`GET /api/prestador/inicio`**, com as regras de `vPro`:
  - **`proximo`:** o primeiro `em_andamento`; senão, o primeiro `aberto` com data ≥ hoje, pela ordem de data e início.
  - **`hoje`:** os acionamentos de hoje, ordenados por início.
  - **`metricas.hoje`:** a quantidade de hoje.
  - **`metricas.noMes`:** os aprovados e não inviáveis do mês corrente.
  - **`metricas.aprovacao`:** `{ taxa, dePrimeira }`. `taxa` = aprovações ÷ revisões. `dePrimeira` = acionamentos cuja primeira revisão foi aprovação ÷ acionamentos revisados; quando não há revisão, "—".
  - **`metricas.paraCorrigir`:** a quantidade de reprovados.
  - **`rotaDoDia`:** os endereços de hoje em `aberto` ou `em_andamento`.

## Fotos

**No app:**
- Câmera e Galeria.
- No nativo, usa `@capacitor/camera`, com as permissões de câmera e fotos no `Info.plist` e no `AndroidManifest`.
- No navegador, usa `<input type="file" accept="image/*">`, com `capture="environment"` na Câmera.
- Antes de enviar, redimensiona no `canvas` para no máximo **1600px** no lado maior e converte para JPEG com qualidade 0,8.
- Grava `tiradaEm` no momento da captura.

**Na API:**
- Aceita `image/jpeg`, `image/png`, `image/webp` e `image/heic`, até **10 MB** (`413` acima disso). O tipo é conferido pelos primeiros bytes do arquivo, não só pelo cabeçalho.
- Grava pela interface `Armazenamento { salvar(chave, dados, tipo), abrir(chave), remover(chave) }`.
- A implementação desta rodada é `ArmazenamentoDisco`, com a pasta em `ARQUIVOS_DIR` (padrão `var/uploads`, fora do git). S3 e R2 entram depois como outra implementação.

**Leitura:**
- A `url` de cada foto é assinada com HMAC-SHA256 (derivado do `BETTER_AUTH_SECRET`) sobre `fotoId` e `exp`, e vale **1 hora**.
- O endpoint de arquivo confere a assinatura e a validade (403 se falhar) e manda `Cache-Control: private, max-age=3600`.
- Assim a tag `<img>` funciona no app com Bearer, sem cookie.

**Apagar:** remover uma foto ou recusar uma inviabilidade apaga o registro e o arquivo.

## Fronts

**Dados:**
- `@tanstack/vue-query` nos dois apps. Cada tela usa composables de consulta e de mutação sobre o `api-client`.
- Depois de cada mutação, as consultas afetadas são invalidadas: lista, detalhe, contagem e Início.

**Organização:** uma pasta por funcionalidade:
- gestor: `src/acionamentos/`, `src/aprovacoes/`
- prestador: `src/inicio/`, `src/demandas/`, `src/execucao/`

**Componentes compartilhados em `@kgb/ui`**, com medidas do protótipo:
- `MiniaturaFoto`: imagem ou bloco colorido, carimbo `HH:MM`, botão remover opcional, tamanhos 68, 80 e 120.
- `BarraProgresso`, `ChipTipo` (bolinha + nome), `Cartao`, `CampoRotulado` (rótulo + input no padrão do protótipo), `BotaoPrimario` e `BotaoSecundario`.
- `Toast`: fundo `#262A3B`, raio 14, some após 2,6 s.
- O `StatusChip` já existe.

**Vuetify:**
- Continua na base: `VDialog` para o Novo acionamento, `VBottomSheet` para "Marcar como inviável", `VTextField`, `VTextarea` e `VSelect` com CSS ajustado, e `VSnackbar` para os toasts.
- Quando o componente do Vuetify não chega ao pixel perfect, usa-se o elemento nativo estilizado. O comparador decide.

**Comentários:** as etapas e o comentário final salvam sozinhos, 600 ms depois da última digitação, sem botão.

**Links de mapa, como no protótipo:**
- endereço: `https://www.google.com/maps/search/?api=1&query=<endereço, São Paulo>`
- Rota do dia: `https://www.google.com/maps/dir/<end1>/<end2>…`

**Mensagens (toasts):**
- Gestor: "Acionamento enviado para {nome}", "Conclusão aprovada", "Devolvido ao prestador para correção", "Escreva o motivo da reprovação".
- Prestador: "Atendimento iniciado", "Enviado para aprovação", "Inviabilidade enviada ao gestor".
- Erros da API: a mensagem de `erro.mensagem`.

## Pixel perfect

O seed é o mesmo gerador do protótipo, então no mesmo dia **os dados são iguais**. Os casos novos do `tools/visual` passam a comparar **a área de conteúdo inteira** visível no viewport.
- O harness ganha **passos** por caso: clicar num texto, para abrir um acionamento pelo título ou um filtro. Os passos são aplicados do mesmo jeito no protótipo e no app.
- Casos novos:
  - Gestor web e mobile: lista de Acionamentos (Todos e um filtro), Aprovações, e o Detalhe em `aguardando`, `reprovado`, `aprovado` e `aguardando + inviável`.
  - Gestor web: modal Novo acionamento vazio e com tipos escolhidos.
  - Prestador: Início, Demandas (quatro filtros), e o Detalhe em `aberto`, `em_andamento` (etapa expandida), `aguardando` e `reprovado`, e o painel "Marcar como inviável".
- Toasts, o relógio da barra de status e as fotos reais (que não existem no protótipo) ficam fora da comparação.

## Testes

- **Domínio:** tabela de transições completa (cada ação × cada status), pré-condições e mensagens de erro.
- **API** (integração contra `kgb_test` com seed):
  - cada rota com a matriz de permissões (gestor, prestador dono, outro prestador → 404, sem login → 401);
  - os códigos 409 e 422;
  - duas transições concorrentes, e só uma aplica;
  - upload: tipo inválido, tamanho e assinatura expirada ou adulterada;
  - `prestador/inicio` com as mesmas contas do protótipo.
- **Fronts:** os componentes de `@kgb/ui` e as regras de tela que não estão na API: habilitar o botão de enviar e a mensagem "Adicione 1 foto…", validação do Novo acionamento, e o motivo obrigatório para reprovar.
- **Visual:** os casos acima com `pnpm visual`.
- **Ponta a ponta:** um roteiro Playwright no `tools/visual` que percorre o critério de sucesso inteiro nos dois apps.

## Entrega

A entrega vai em três fases, cada uma com o próprio plano de implementação e commits. Cada fase só termina com a suíte, o typecheck e o lint verdes e, nas fases 2 e 3, o `pnpm visual` dentro dos limites.
1. **API, domínio e fotos.**
2. **Telas do gestor:** Acionamentos, Novo acionamento, Aprovações e Detalhe.
3. **Telas do prestador:** Início, Demandas, Detalhe e execução, e o painel de inviável. O roteiro ponta a ponta fecha a fase.

A entrega é um PR da `feat/fluxo-principal`. Enquanto o PR #1 não for aceito, a base é `chore/fundacao`; depois, `main`.
