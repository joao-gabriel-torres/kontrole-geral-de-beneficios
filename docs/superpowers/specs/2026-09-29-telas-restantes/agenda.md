<!-- Levantamento verificado do protótipo (extração + verificação adversarial), 29/09/2026. Referência de detalhe para a implementação; as decisões finais estão em ../2026-09-29-telas-restantes-design.md, que prevalece. -->

# Agenda do prestador: especificação extraída do protótipo (revisada)

Fontes: `docs/design/Acionamentos.dc.html` e `docs/design/acionamentos-data.js`.
- `Acionamentos.dc.html`: template nas linhas 665–691, lógica em `vPro` nas linhas 1058–1102, estado na 900, relógio na 910, persistência nas 901–913 e `reset` na 922.
- `acionamentos-data.js`: `ST` na 14, `WD`/`WDL` nas 16–17, `iso` na 19, `addD` na 20, `br` na 21, `NAMED` nas 37–58 e `deco` nas 89–94.

Renderizei o protótipo num Chromium headless com o Playwright de `tools/visual`, servindo os arquivos por interceptação de requisição (`page.route`), sem subir servidor. A data de referência foi terça, 29/09/2026, com a Plus Jakarta Sans carregada, localStorage limpo e fuso America/Sao_Paulo. Todas as medidas abaixo vêm dessa renderização. Não alterei nenhum arquivo do repositório.

Estado atual do app:
- A rota `/agenda` já existe (`apps/prestador/src/router.ts:25`) e aponta para `apps/prestador/src/paginas/PaginaAgenda.vue`, que hoje mostra só o título (`h1`, `margin:0`) e o componente "Em construção".
- O atalho do Início já leva à rota (`apps/prestador/src/inicio/PaginaInicio.vue:38`).
- As abas são `RouterLink` (`apps/prestador/src/componentes/AbasPrestador.vue`), com papel de link.

---

## Como chegar no protótipo

1. Na barra do topo, escolha **"Prestador · App"** (`pa`). A tela inicial é o **Início** (`pv: 'home'`).
2. Há dois caminhos até a Agenda:
   - **Atalho "Agenda"**: é o 2º dos 4 atalhos do Início, depois de "Rota do dia" e antes de "Corrigir" e "Em análise". Executa `go: () => this.setState({ pv: 'agenda' })` (linha 1080).
   - **Aba "Agenda"**: é o item do meio da barra inferior (Início · Agenda · Demandas). Executa `go: () => this.setState({ pv: id, pId: null })` (linha 1064).
   - Os dois caminhos chegam no mesmo estado visível. `pId` só importa no Detalhe.
3. No harness, `navegarPrototipo: 'Agenda'` casa com `/^\s*Agenda/` e clica no **primeiro** botão.
   - Esse botão é o **atalho do Início**. Na área de conteúdo ele fica em x 107,75, y 313 e mede 75,75×77. Na página do harness (443×936) fica em y 447.
   - A aba vem depois no DOM.
4. Depois de recarregar a página, o dia selecionado é **hoje** (`aDay: 0`, estado inicial da linha 900).
5. **Não existe Agenda nos modos "Gestor · Web" e "Gestor · Mobile".**
   - Peculiaridade: "Abrir no app", no Detalhe do gestor (linha 1054), troca para `pa` e abre o Detalhe **sem gravar `pBack`**. O Voltar (linha 1131) usa o `pBack` anterior e pode cair na Agenda se ela foi a última origem.

## Estrutura e layout

A tela só existe no app do prestador (moldura de 375 × 812).
- A área rolável tem 375 × 688: 812 menos a barra de status de 44 e a barra de abas de 80.
- O viewport do app no harness tem 375 × 768 (área rolável + abas).
- Não há variante web.

O contêiner tem `padding: 8px 24px 24px`, flex em coluna e `gap: 16px`. Largura útil: 327px.

| # | Bloco | CSS do protótipo | Medido (y relativo ao topo do conteúdo) |
|---|---|---|---|
| 1 | Título "Agenda" (`<div>`, linha 667) | `font-size:24px; line-height:32px; font-weight:700; color:#2C3143` | y 8, altura 32 |
| 2 | Faixa de 7 dias (linha 668) | `display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:6px` | y 56, altura 68. Colunas de ≈41,57px (x = 24; 71,56; 119,14; 166,7; 214,28; 261,84; 309,42) |
| 2a | Botão do dia (linha 670) | `border:0; height:68px; border-radius:14px; background:{bg}; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; padding:0` + `cursor:pointer` herdado da regra global `button` (linha 15) | Conteúdo com 43px de altura, centralizado. O dia da semana começa em y+12,5 |
| 2b | Dia da semana | `<span>` `11px/600`, cor `sub` | altura 13 |
| 2c | Número do dia | `<span>` `16px/700`, cor `fg` | altura 21 |
| 2d | Ponto | `<span>` `width:5px; height:5px; border-radius:3px; background:{dot}` | Ocupa espaço mesmo transparente, então o layout não salta |
| 3 | Rótulo do dia (linha 677) | `font-size:16px; font-weight:700; color:#2C3143` (line-height normal) | y 140, altura 21 |
| 4a | Estado vazio (linha 678) | `font-size:14px; color:#8F8D8D` | y 177, altura 18 |
| 4b | Linha da lista, uma por acionamento (linha 680) | `display:flex; gap:12px` | 1ª linha em y 177. Entre as linhas, o `gap:16px` do contêiner |
| 4b.1 | Coluna da hora (linha 681) | `width:44px; flex:none; padding-top:14px; font-size:13px; font-weight:700; color:#262A3B` | Estica até a altura do cartão. **Não é clicável** |
| 4b.2 | Cartão (linha 682) | `flex:1; min-width:0; padding:14px; border-radius:16px; background:#F9F9F9; display:flex; flex-direction:column; gap:6px; cursor:pointer; border-left:0` | x 80, largura 271, área interna de 243. O `border-left:0` não tem efeito visual (resto sem borda) |
| 4b.2.1 | Título | `font-size:14px; font-weight:600; color:#2C3143` | altura 18 por linha |
| 4b.2.2 | "horário · tipos" | `font-size:12px; color:#50555C` (peso 400) | 15px por linha. Quebra linha |
| 4b.2.3 | Endereço | `display:flex; align-items:center; gap:4px; font-size:12px; color:#8F8D8D` + `<img src="assets/icons/pin.svg" style="width:14px;opacity:.6">` | Pin de 14×14 **centralizado na vertical**: com 2 linhas, fica em y+8 de uma caixa de 30. O texto quebra em 225px (243 − 14 − 4) |
| 4b.2.4 | Chip | `align-self:flex-start; font-size:11px; font-weight:600; padding:2px 8px; border-radius:999px; background:{stBg}; color:{stFg}` | altura 17 |

Alturas do cartão:
- Com todas as linhas simples: 14+18+6+15+6+15+6+17+14 = **111px**.
- Cada linha quebrada soma 15px. No seed de hoje, os três cartões têm 126px (medido).

Cores da faixa (linha 1084):

| | Selecionado | Não selecionado |
|---|---|---|
| Fundo (`bg`) | `#0069BD` | `#F9F9F9` |
| Número (`fg`) | `#fff` | `#2C3143` |
| Dia da semana (`sub`) | `#fff` | `#8F8D8D` |
| Ponto, dia com atendimentos | `#fff` | `#0069BD` |
| Ponto, dia sem atendimentos | `transparent` | `transparent` |

Barra de abas (fora da área rolável, linhas 850–860): na Agenda, a aba **"Agenda"** fica ativa, com rótulo `#004E8F` e ponto `#0069BD`. As outras usam `#61565C`. Isso vale chegando pela aba ou pelo atalho, e já é comparado na região `abas`.

Detalhes que decidem o pixel perfect:
- **O pin é `#262A3B` a 60%.** O SVG tem `stroke="#262A3B"`, mas o `<RussoIcone>` usa `currentColor`. Dentro da linha, que tem `color:#8F8D8D`, ele herdaria o cinza. Fixe `color: var(--kgb-tinta)` e `opacity: .6` no ícone. O `RussoIcone` já tem `flex:none`.
- A faixa é uma **grade fixa de 7 colunas**:
  - não tem rolagem horizontal;
  - não vai para a semana anterior nem para a próxima;
  - não é sticky: rola junto com a página.
  - Os chips de Demandas, esses sim, têm `overflow-x:auto` (linha 695).
- **Barra de rolagem:** com 4 ou mais cartões de 111px (177 + 4×111 + 3×16 + 24 = 693 > 688), a área de conteúdo (`overflow:auto`, linha 605) ganha a barra de 8px.
  - A largura útil cai para 319px e as quebras de linha mudam.
  - O `base.css` de `@kgb/ui` já replica essa barra.
- **Não existe "linha do tempo" desenhada** (traço vertical, bolinhas ou borda à esquerda). É só a coluna de hora.
- **HTML e CSS puros:** botões com `border:0; padding:0` explícitos e `line-height: normal`. Não use `v-btn` nem `v-card`, por causa de ripple, `letter-spacing`, `min-width` e da line-height 1.5 do Vuetify.
- **Chip:** `<StatusChip tamanho="p">` de `@kgb/ui` já tem 11px/600 e padding `2px 8px`. Ele acrescenta `white-space:nowrap`, que o protótipo não tem, mas os rótulos são curtos.

## Textos exatos

- **Título:** **`Agenda`**.
- **Faixa, dia da semana** (`WD`, data.js:16): `Dom`, `Seg`, `Ter`, `Qua`, `Qui`, `Sex`, `Sáb` (com acento, sem ponto).
- **Faixa, número:** `String(d.getDate())`, **sem zero à esquerda** (`1`, `2`…, `29`, `30`). Não mostra o mês.
- **Rótulo do dia** (linha 1087):
  - índice 0: `Hoje, DD/MM` (ex.: `Hoje, 29/09`);
  - índice 1: `Amanhã, DD/MM` (ex.: `Amanhã, 30/09`);
  - índices 2–6: nome completo do dia (`WDL`, data.js:17) + `, DD/MM`, com zero à esquerda no dia e no mês. Os nomes são `Domingo`, `Segunda-feira`, `Terça-feira`, `Quarta-feira`, `Quinta-feira`, `Sexta-feira`, `Sábado`. Ex.: `Quinta-feira, 01/10`, `Sexta-feira, 02/10`, `Segunda-feira, 05/10`.
- **Cartão:**
  - Coluna da hora: `HH:MM` (só o início).
  - Título: o título do acionamento.
  - Segunda linha: `HH:MM–HH:MM · Tipo A + Tipo B`.
    - Entre as horas vai travessão meia-risca (U+2013), sem espaços.
    - O separador é ` · ` (U+00B7 com espaços).
    - Entre os tipos vai ` + `, na ordem das demandas.
  - Endereço: exatamente como está gravado. Já contém ` · `, ex.: `Rua Bela Cintra, 1200 · Consolação`.
- **Chip** (`ST` na data.js:14 + `deco` nas data.js:89–94):

| Condição | Rótulo | Fundo | Texto |
|---|---|---|---|
| aberto | `Agendado` | `#EFF1F3` | `#363853` |
| em_andamento | `Em execução` | `#E6F0FA` | `#004E8F` |
| aguardando | `Aguardando aprovação` | `#FFEBDC` | `#B85200` |
| aguardando + inviável | `Inviabilidade em análise` | `#FFEBDC` | `#B85200` |
| reprovado | `Reprovado` | `#FFD7D4` | `#B8342A` |
| aprovado | `Aprovado` | `#E7F8F1` | `#0B8C61` |
| aprovado + inviável | `Inviável` | `#F4D8E8` | `#A8336A` |

  Reprovado + inviável não acontece: recusar a inviabilidade zera `inviavel` (linha 1037).
- **Estado vazio:** **`Dia livre.`** (com ponto final).
- **Abas:** `Início`, `Agenda`, `Demandas`.
- A Agenda não tem placeholder nem mensagem de erro, e não dispara toast. Mesmo assim, um toast do Detalhe ("Atendimento iniciado", "Enviado para aprovação", "Inviabilidade enviada ao gestor") pode continuar visível sobre a Agenda por até 2,6s depois de voltar, porque o toast é global na moldura (linhas 861–863 e 915).

Seed do Carlos (p1) na janela, gerado por `NAMED` nas data.js:50–56:
- Os deslocamentos são relativos ao **dia em que o seed foi gerado**. Os dados ficam no localStorage `acionamentos_v3` com datas absolutas (linhas 901, 905–906, 913; data.js:64). Só um seed novo, com storage limpo ou "Restaurar exemplo", coincide com hoje. O harness limpa o storage (comparar.ts:74–77).
- As linhas aleatórias do seed vão de D−29 a D−7 e nunca entram na faixa.

| Dia | Hora | Título | "horário · tipos" | Endereço | Chip |
|---|---|---|---|---|---|
| D0 | 07:30 | Limpeza de ar-condicionado | 07:30–09:00 · Limpeza de ar-condicionado *(quebra: "…Limpeza de ar-" / "condicionado")* | Rua Pamplona, 145 · Jardim Paulista | Aguardando aprovação |
| D0 | 10:30 | Vazamento no teto do banheiro | 10:30–12:30 · Vazamento + Reparo em gesso *(quebra antes de "gesso")* | Rua Bela Cintra, 1200 · Consolação | Agendado |
| D0 | 15:00 | Ponto de luz na recepção | 15:00–16:30 · Ponto de luz | Rua Haddock Lobo, 595 · Cerqueira César *(quebra antes de "César")* | Agendado |
| D+1 | 09:00 | Troca de cilindro e cópias | 09:00–10:00 · Chaveiro | Rua Joaquim Antunes, 88 · Pinheiros | Agendado |
| D+1 | 13:00 | Pintura e reparo em gesso | 13:00–17:00 · Pintura + Reparo em gesso *(cabe em 1 linha)* | Rua Oscar Freire, 1120 · Jardins | Agendado |
| D+2 | 08:30 | Troca de disjuntores do quadro | 08:30–10:00 · Troca de disjuntor | Rua Mourato Coelho, 300 · Pinheiros | Agendado |
| D+3…D+6 | — | `Dia livre.` | | | |

- Os pontos aparecem em D0, D+1 e D+2.
- Em 29/09 a faixa fica `Ter 29 · Qua 30 · Qui 1 · Sex 2 · Sáb 3 · Dom 4 · Seg 5`.
- Alturas medidas: D0 com 3 cartões de 126px (conteúdo de 611px), D+1 com 2 de 111px, D+2 com 1 de 111px.

## Regras e cálculos

1. **"Hoje" é a data local do aparelho.** `today = A.iso(A.addD(0))` (linha 1059), com `addD = n => { const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate()+n); return d; }` (data.js:20). No app real, o CLAUDE.md manda usar `America/Sao_Paulo`.
2. **Quais acionamentos entram:** só os do prestador, com **todos os status**.
   - `mine = S.data.acs.filter(a => a.pid === A.ME).map(A.deco)` (linha 1060), com `ME = 'p1'` (data.js:13).
   - A lista do dia é `agenda = mine.filter(a => a.date === aKey).map(card)` (linha 1086).
   - Não há filtro de status: entram aberto, em_andamento, aguardando, reprovado, aprovado e aprovado + inviável.
3. **Ordem:** `mine` já vem ordenado por `(a.date + a.start).localeCompare(b.date + b.start)` (linha 1060), ou seja, por início crescente.
   - O sort é estável. Em empate de horário, vale a ordem de `acs`, que é a de criação.
   - O código também cresce: é 1001+i no seed e `1001 + d.acs.length` ao criar, linha 993.
4. **Faixa (linha 1084):**
   ```js
   for (let i = 0; i < 7; i++) { const d = A.addD(i), k = A.iso(d), n = mine.filter(a => a.date === k).length, on = S.aDay === i;
     days.push({ wd: A.WD[d.getDay()], n: String(d.getDate()), dot: n ? (on ? '#fff' : '#0069BD') : 'transparent',
       bg: on ? '#0069BD' : '#F9F9F9', fg: on ? '#fff' : '#2C3143', sub: on ? '#fff' : '#8F8D8D', go: () => this.setState({ aDay: i }) }); }
   ```
   - São 7 dias a partir de hoje (índices 0 a 6).
   - O **ponto indica presença**, sem mostrar quantidade, e conta **qualquer status**.
5. **Dia selecionado:** `aKey = A.iso(A.addD(S.aDay))` (linha 1085). `aDay` é um **índice relativo a hoje**, não uma data.
6. **Rótulo (linha 1087):** `(S.aDay === 0 ? 'Hoje' : S.aDay === 1 ? 'Amanhã' : A.WDL[A.addD(S.aDay).getDay()]) + ', ' + A.br(aKey).slice(0, 5)`, com `br` = `DD/MM/AAAA` (data.js:21).
7. **Campos do cartão** (`deco`, data.js:89–94):
   - `k = a.status === 'aprovado' && a.inviavel ? 'inviavel' : a.status` (90);
   - `time: a.start+'–'+a.end` (93);
   - `typesLabel: a.demandas.map(d=>d.typeName).join(' + ')` (93);
   - `stLabel`: `'Inviabilidade em análise'` se aguardando + inviável, senão `ST[k].l` (93);
   - `stBg`/`stFg` = `ST[k].bg`/`ST[k].fg`.
8. **Estado vazio:** `noAgenda: agenda.length === 0` (linha 1098).
9. **Abrir o Detalhe:**
   - `card = a => Object.assign(a, { open: openP(a.id), whenL: … })` (linha 1062). O `whenL` não é usado na Agenda.
   - `openP = id => () => this.setState({ pv: 'detail', pId: id, pBack: S.pv === 'detail' ? S.pBack : S.pv, openStep: null, sheet: false })` (linha 1061) grava `pBack = 'agenda'`.
10. **Voltar do Detalhe:** `back: () => this.setState({ pv: S.pBack || 'home', pId: null })` (linha 1131) devolve para a Agenda, com o chip já atualizado se algo mudou no Detalhe.
11. **Relógio:** `setInterval(() => this.forceUpdate(), 30000)` (linha 910).
    - A faixa é recalculada a cada 30s ou a qualquer `setState`.
    - Depois da meia-noite ela "anda" um dia e o índice `aDay` continua o mesmo.
    - Os dados não andam, porque as datas são absolutas.
12. **Origem dos dados:**
    - O gestor pode criar acionamentos para o Carlos. O formulário novo vem com `date: today, start:'09:00', end:'11:00', pid: A.ME` (linha 970), então por padrão cai na Agenda de hoje, entre 07:30 e 10:30.
    - Aprovar ou reprovar (linha 1037) muda o chip.
    - Tudo persiste no localStorage.

## Interações

| Gatilho | Efeito no protótipo |
|---|---|
| Clique num botão da faixa | `setState({ aDay: i })`. Mudam as cores da faixa, o rótulo e a lista. **A rolagem não volta ao topo.** Clicar no dia já selecionado não muda nada visível. |
| Teclado na faixa | Os dias são `<button>` nativos: Tab dá foco (anel de foco padrão do Chromium, nenhuma regra remove o outline) e Enter/Espaço selecionam. Não há navegação por setas. |
| Clique no **cartão** (área cinza) | Abre o **Detalhe** do acionamento (`pv: 'detail'`) e a barra de abas some (`pTabsOn`, linha 1094). A coluna da hora e o gap de 12px **não** são clicáveis. Não há hover, só `cursor:pointer`. O cartão é `div` e não recebe foco pelo teclado. |
| Voltar no Detalhe | Volta para a Agenda **com o mesmo dia selecionado**. |
| Aba "Início" ou "Demandas" e depois de volta | `aDay` **continua o mesmo**: é estado do componente e não é zerado ao trocar de aba. |
| Atalho "Agenda" do Início | `setState({ pv: 'agenda' })`. Também mantém `aDay`. Verificado: com "Qua 30" selecionado, ir ao Início e tocar no atalho volta em "Amanhã, 30/09". |
| Troca de modo na barra do topo | `setMode` (linha 921) muda só `mode` e `sheet`. Ao voltar para `pa`, a Agenda reaparece com o mesmo `aDay`. |
| "Restaurar exemplo" | `reset()` (linha 922) regrava o seed e faz `pv: 'home'`, o que **leva para o Início**. `aDay` **não** é zerado: reabrir a Agenda mostra o mesmo índice. |
| Recarregar a página | `aDay` volta a 0 e `pv` volta a `home`. O modo persiste em `acionamentos_v3_mode` e os dados em `acionamentos_v3`. |
| Rolagem entre telas | O contêiner rolável é o mesmo para todas as telas do prestador (linha 605). Trocar de aba ou ir e voltar do Detalhe preserva o `scrollTop`, limitado à nova altura. O Início tem 951px e rola; a Agenda do seed tem 611px e não rola. O app, ao contrário, zera a rolagem a cada troca de `route.path` (`LayoutPrestador.vue:15–20`). |
| Arrastar para os lados, puxar para atualizar | Não existem. |

## Estados

- **Dia com atendimentos:** a lista descrita acima.
- **Dia sem atendimentos:** "Dia livre." no lugar da lista. O rótulo do dia continua aparecendo.
- **Prestador sem nenhum acionamento na janela:** todos os dias ficam sem ponto e qualquer dia mostra "Dia livre.". Não há estado vazio global.
- **Carregando e erro:** **não existem no protótipo**, porque os dados são locais. Antes do boot (`ready` falso, linha 1242) nada é renderizado. Veja a seção de dúvidas.
- **Toast residual:** um toast disparado no Detalhe pode aparecer sobre a Agenda por até 2,6s.
- **Casos-limite:**
  - Virada de mês na faixa: os números recomeçam em `1` e o rótulo mostra o novo mês (`Quinta-feira, 01/10`).
  - Textos longos quebram linha, sem reticências: o título, a linha "horário · tipos" (quebra no hífen de "ar-condicionado") e o endereço (o pin fica centralizado nas linhas).
  - Com 4 ou mais cartões simples, a página rola, a faixa sai de vista e aparece a barra de 8px, que estreita o conteúdo para 319px.
  - Acionamento aprovado, reprovado, aguardando ou inviável no dia: aparece com o chip correspondente.
  - Acionamento criado pelo gestor para o Carlos dentro da janela: aparece na hora, com ponto no dia.
  - Meia-noite com a tela aberta: em até 30s a faixa avança um dia e o mesmo índice passa a apontar para outra data.
  - Protótipo reaberto em outro dia sem limpar o storage: o seed fica "velho" em relação à faixa.

## Dados que a API precisa fornecer

Por acionamento do prestador logado, dentro da janela [hoje, hoje+6] no fuso de SP:
- `id` (para abrir o Detalhe), `titulo`, `data` (`YYYY-MM-DD`), `inicio`, `fim`, `endereco`, `status`, `inviavel` e `tipos[].nome` na ordem das demandas.
- `codigo` e `cliente` não aparecem na Agenda.

Agregações:
- "Tem atendimento?" por dia, para os 7 pontos. Dá para derivar da mesma lista.
- Qual é o "hoje" em SP.

O que já existe:
- **`GET /api/acionamentos`** (`apps/api/src/rotas/acionamentos.ts`, serviço `listarAcionamentos`): o prestador vê só os seus (`filtroVisivel`) e já recebe `ResumoAcionamento` com **todos** os campos necessários. Porém:
  - não filtra por data (devolve todo o histórico; aceita só `status` e `busca`);
  - ordena por `data desc, inicio desc`.
  - O front de Demandas já usa essa rota com a chave `CHAVES.lista` (`usarDemandas`), que `usarDetalhe.invalidarListas` invalida depois de cada mutação (`apps/prestador/src/execucao/usarDetalhe.ts:29–32`).
- **`GET /api/prestador/inicio`** devolve só os de **hoje** (`hoje: ResumoAcionamento[]`, ordem crescente via `calcularInicio`). Não serve para 7 dias.
  - `apps/api/src/dominio/inicio-prestador.ts` já tem o mesmo sort `(data+inicio).localeCompare` e o tipo `ItemAgenda`.
  - `dataSP` está em `apps/api/src/dominio/datas.ts`.
- **`@kgb/ui/formatos.ts`** tem `emSaoPaulo` (privada), `dataCurtaPorExtenso` e `dataPorExtenso`. **Não tem** helper de data ISO em SP, de somar dias nem de dia da semana abreviado.
- **`@kgb/ui`** tem `StatusChip` (`tamanho="p"` = 11px/600, `2px 8px`) e `estiloStatus`, que já tratam "Inviabilidade em análise" e "Inviável". Tem também `RussoIcone` com `pin`.

Duas opções para o app:
- **(a) Sem mudar a API:**
  - Reusar `usarDemandas()`, filtrar `a.data === diaISO` no cliente e ordenar por `inicio` crescente (empate por `codigo`).
  - Herda a invalidação de `CHAVES.lista`.
  - Os 7 dias vêm de novos helpers em `@kgb/ui`, algo como `dataIsoSP(d)`, `somarDias(iso, n)`, `diaSemanaCurto(iso)` e `rotuloDiaAgenda(i, iso)`, usando `Date.UTC`.
- **(b) Nova rota:**
  - `GET /api/prestador/agenda` devolvendo `{ hoje, dias: [{ data, acionamentos: ResumoAcionamento[] }] }`, com "hoje" calculado por `dataSP` no servidor, como no Início.
  - A regra de janela e ordem fica em `dominio/`, com TDD.
  - Exige `pnpm api:generate`.
  - A nova chave de consulta (ex.: `CHAVES.agenda`) **precisa entrar em `invalidarListas`**. Sem isso, a Agenda mostra chip desatualizado depois de "Iniciar atendimento" e voltar.

## Casos para o pnpm visual

Todos no modo `pa`, com `app: 'prestador'`, `rota: '/agenda'`, `navegarPrototipo: 'Agenda'` e região `telaInteira('pa')` (367 × 768, sem a faixa da barra de rolagem).

- O caso existente `prestador-agenda` compara hoje só `abas` e `cabecalho(48)`. Quando a tela ficar pronta, ele deve passar a usar `[tela]`.
- Os casos novos precisam ficar **antes** de `prestador-detalhe-em-andamento`, que grava "Iniciar atendimento" em "Vazamento no teto do banheiro" e mudaria o chip de hoje. Os casos do gestor rodam antes e não gravam nada.
- O `ponta-a-ponta.ts` **cria** dois acionamentos para o Carlos no banco de desenvolvimento (data padrão do formulário). Rode `pnpm db:seed` antes do `pnpm visual`.

**Nome acessível do botão do dia.** Os botões têm nome acessível `"<Dia> <n>"`, confirmado na árvore de acessibilidade: `button "Ter 29"`, `"Qua 30"`, `"Qui 1"`…
- O espaço vem de duas fontes: o template do protótipo tem quebras de linha entre os spans, e o Chromium separa filhos que viram bloco dentro do flex.
- No Vue, `whitespace: 'condense'` remove esses espaços. O nome só continua `"Qua 30"` se o botão tiver `display:flex`. Testei: com spans colados num botão sem flex, o nome vira `"Qua30"`.
- O botão também **não pode ter `aria-label`**.

Como o seed é relativo ao dia, o nome precisa ser calculado na hora em que o harness roda:

```ts
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
/** Botão do dia `i` da faixa ("Qua 30"), no mesmo relógio do protótipo (addD). */
const dia = (i: number): Passo => {
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + i)
  return { clicar: `${DIAS_CURTOS[d.getDay()]} ${d.getDate()}` }
}
```

| Caso sugerido | Passos | O que cobre |
|---|---|---|
| `prestador-agenda` (existente, trocar a região para `tela`) | nenhum | "Hoje, DD/MM", 3 cartões de 126px (aguardando + 2 agendados), três linhas quebradas, pontos em D0–D2 |
| `prestador-agenda-amanha` | `[dia(1)]` | "Amanhã, DD/MM", 2 cartões de 111px, ponto branco no dia selecionado |
| `prestador-agenda-dia-semana` | `[dia(2)]` | rótulo com nome completo do dia (ex.: "Quinta-feira, 01/10"), 1 cartão |
| `prestador-agenda-dia-livre` | `[dia(3)]` | "Dia livre.", dia selecionado sem ponto |
| `prestador-agenda-ultimo-dia` | `[dia(6)]` | seleção na última coluna da grade (x 309,42, posição fracionária) e "Dia livre." |
| `prestador-agenda-volta-do-inicio` (opcional, depende da decisão sobre manter o dia) | `[dia(1), { clicar: 'Início', papel: 'text' }, { clicar: 'Agenda' }]` | O atalho do Início preserva o dia. No app as abas são links, por isso "Início" vai por texto. `{ clicar: 'Agenda' }` pega o primeiro botão "Agenda", que é o atalho nos dois lados (no app, as abas não são botões). |
| `prestador-agenda-abre-detalhe` (opcional) | `[dia(1), { clicar: 'Pintura e reparo em gesso', papel: 'text' }]` | o toque no cartão abre o Detalhe |

- Não dá para comparar "voltar do Detalhe para a Agenda". O botão de voltar do protótipo (linha 717) só contém um `<img>` sem `alt`, então não tem nome acessível para um `Passo`.
- **Cuidado com o fuso.** O protótipo usa o fuso do navegador. O `dia(i)` roda no Node do `tools/visual`, e o seed (`packages/db/src/seed/prototipo.ts`, que executa o data.js) roda no Node do `db:seed`.
  - Fixar só o `timezoneId` do Playwright **não basta**.
  - Rode `pnpm db:seed` e `pnpm visual` com `TZ=America/Sao_Paulo` (ou numa máquina nesse fuso). Se fixar `timezoneId` no contexto do protótipo, use o mesmo fuso.

## Dúvidas e ambiguidades

1. **Rótulo de dia da semana.** O README diz só "o dia da semana". O código mostra o nome completo **seguido de `, DD/MM`** (ex.: `Quinta-feira, 01/10`). Vale o código.
2. **"Lista em linha do tempo"** (README). O código não desenha linha nem conectores; há só a coluna de hora de 44px. O `border-left:0` do cartão é resto sem efeito visual. Vale o código.
3. **Status que entram na lista e no ponto.** O README não define. O código inclui **todos**, inclusive aguardando, reprovado, aprovado e inviável. Hoje, por exemplo, aparece "Aguardando aprovação".
4. **Clique no cartão.** O README não menciona. O código abre o Detalhe, e voltar retorna à Agenda.
5. **Persistência do dia selecionado.** No protótipo, `aDay` vive em memória. Sobrevive a trocar de aba, abrir o Detalhe e voltar, usar o atalho do Início, trocar de modo e até ao "Restaurar exemplo" (que, porém, leva ao Início). Só zera ao recarregar.
   - No app, o `PaginaDetalhe` volta com `router.back()` e o `RouterView` remonta por `route.path`, então um `ref` local se perderia.
   - Opções:
     - estado em módulo (fiel ao protótipo);
     - query `?dia=N` (sobrevive a recarregar e ao `router.back()`, mas a aba e o atalho com `{ name: 'agenda' }` a descartariam);
     - voltar sempre para hoje (diverge do protótipo).
   - Precisa de decisão.
6. **Índice ou data.** O protótipo guarda o índice (0–6), não a data. Depois da meia-noite, o mesmo índice aponta para outro dia. Vale definir se o app guarda o índice ou a data ISO.
7. **Fuso.** O protótipo usa a data local do aparelho, e o CLAUDE.md exige `America/Sao_Paulo`. O "hoje" deve vir de SP, no cliente ou no servidor.
8. **Carregando e erro:** indefinidos.
   - Sugestão coerente com o Início: enquanto carrega, mostrar título, faixa sem pontos e rótulo, sem lista e sem "Dia livre.".
   - No erro, mostrar `mensagemDeErro(error)` no lugar da lista.
   - Falta definir o estilo. O Início usa a caixa cinza `.sem-proximo` para erros; aqui o equivalente natural seria o texto 14px `#8F8D8D` do "Dia livre.".
9. **Acessibilidade.** O cartão é uma `div` com `onClick`, sem teclado.
   - No app, `role="button"` + `tabindex="0"` + Enter, como em "Sua agenda de hoje" do Início, não muda o visual.
   - O botão do dia deve continuar `<button>` nativo (o foco por teclado já existe no protótipo), com `display:flex` e sem `aria-label` (ver casos do visual).
10. **Dias passados e outras semanas:** não são navegáveis. A faixa sempre começa hoje e não tem setas nem rolagem. O README concorda.
11. **Coluna da hora:** mostra só o início. O intervalo completo aparece dentro do cartão.
12. **Cor do pin:** o ícone original é `#262A3B` a 60%, não o cinza do texto. Isso exige `color` explícito no `<RussoIcone>` (ver Estrutura e layout).
13. **Tamanho do chip.** A seção de status do README diz "Chips: 12px/600, padding 3–4px 10px", mas o chip da Agenda é `11px/600; padding:2px 8px` (linha 686). Vale o código, que é o `StatusChip tamanho="p"`.
14. **Rolagem ao trocar de tela.** O protótipo preserva o `scrollTop` entre Início, Agenda e Detalhe porque o contêiner é o mesmo. O app zera a rolagem por rota. Com o seed a Agenda não rola, então não afeta o pixel perfect, mas é uma divergência de comportamento a registrar.