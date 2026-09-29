<!-- Levantamento verificado do protótipo (extração + verificação adversarial), 29/09/2026. Referência de detalhe para a implementação; as decisões finais estão em ../2026-09-29-telas-restantes-design.md, que prevalece. -->

# Painel do gestor (dashboard): especificação extraída do protótipo

Fontes lidas:
- `docs/design/Acionamentos.dc.html`: template nas linhas 65–151; lógica em `vGestor`, linhas 923–974; moldura e modos em 1236–1250;
- `docs/design/acionamentos-data.js`: helpers e seed;
- `docs/design/README.md`, §"1. Painel".

Nas referências abaixo, `html:N` é a linha N de `Acionamentos.dc.html` e `data:N` é a linha N de `acionamentos-data.js`.

Para conferir o layout, o protótipo foi renderizado no Chromium headless do Playwright de `tools/visual`. O arquivo foi aberto por `file://`, sem servidor e sem alterar nada no repositório.

Os valores numéricos vêm do seed do próprio protótipo. Foram recalculados executando o `vGestor` original em Node, com `TZ=America/Sao_Paulo` e hoje = terça, 29/09/2026.

As medidas "renderizadas" valem para 1440×844 (gw) e 375×768 (gm), nas coordenadas da área útil do app.

**Ressalva de medição.** As medidas valem com a barra de rolagem oculta, que é o padrão do Chromium headless do Playwright e o que o `pnpm visual` usa. Num Chrome comum, a scrollbar customizada de 8px (html:15) ocupa largura. Nesse caso, o conteúdo web cai para 1136px (KPI 217,6px) e o mobile para 335px (KPI 161,5px).

---

## Como chegar no protótipo

1. Na barra do topo, clicar em **"Gestor · Web"** (modo `gw`) ou **"Gestor · Mobile"** (modo `gm`). O modo fica gravado em `localStorage['acionamentos_v3_mode']` (html:921) e é lido no boot (html:907).
2. O Painel é a **tela inicial** do gestor. O estado começa com `gv: 'dash'` e `period: 7` (html:900), então não há clique de navegação a fazer.
   - Vindo de outra tela: clicar **"Painel"** na sidebar (web) ou na primeira aba da barra inferior (mobile).
   - **"Restaurar exemplo"** recria os dados e volta para o Painel (`reset`, html:922). Ele **não** volta o período para 7, **não** muda o modo e **não** limpa o filtro nem a busca da lista.
3. Período de 30 dias: clicar no botão **"30 dias"**. Para voltar, clicar em **"7 dias"**.
4. O harness já faz isso sozinho: apaga `acionamentos_v3` (o seed é regenerado com as datas relativas a hoje) e grava o modo. Nenhum caso do Painel precisa de `navegarPrototipo`.

---

## Estrutura e layout

O markup do Painel é **um só** para web e mobile. Não existe `compact`/`wide` dentro do bloco `isDash` (html:65–151).

A diferença entre os modos vem da largura disponível e do padding do conteúdo (html:1244): `28px 32px 40px` no web e `16px 16px 24px` no mobile. Além disso, a moldura muda: sidebar no web; no mobile, barra de status falsa e barra de abas.

O conteúdo rola dentro de um único scroller (html:64). **Esse scroller é compartilhado com todas as telas do gestor.**

### Blocos, em ordem (raiz: `flex column; gap 20; max-width 1280; margin 0 auto`, html:66)

1. **Cabeçalho** (html:67–78): `flex; flex-wrap: wrap; align-items: flex-end; gap 12`.
   - Bloco de texto `flex:1; min-width:200px`:
     - data: 12px/500, `#8F8D8D`;
     - título "Seu painel": 24px, `line-height: 36px`, 700, `#2C3143`. No protótipo é uma `div`, sem margem de `h1`.
   - Segmentado: `flex; gap 4; padding 4; bg #EFF1F3; radius 12`. Cada botão tem `border 0`, `h 32`, `padding 0 12`, `radius 9`, 13/600.
     - Ativo: `bg #fff`, `color #262A3B`, `box-shadow 0 1px 3px rgba(0,0,0,.1)`.
     - Inativo: fundo transparente, `#50555C`, sem sombra (html:951).
     - Sem estilo de hover.
   - Botão "Novo acionamento": `h 44`, `padding 0 18`, `border 0`, `radius 16`, `#0069BD`, texto branco 14/600, hover `#005AA3`. Tem `display:flex; gap:8px`, mas **não tem ícone** (html:77).
2. **KPIs** (html:79–87): `grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap 12`.
   - Cartão: `bg #fff; radius 16; padding 18px 20px; flex column; gap 6; min-width 0`. No hover, `box-shadow 0 4px 16px rgba(0,0,0,.08)` em **todos** os 5 cartões. Nenhum tem `cursor: pointer`.
   - Textos: label 13/500 `#50555C`; valor 28px/`36px`/700 `#262A3B`, `letter-spacing -.02em`; sublinha 12/500 `#8F8D8D`. Label e sublinha podem quebrar linha (não têm nowrap).
3. **Linha de gráficos** (html:88–120): `flex; flex-wrap: wrap; gap 16`.
   - **Volume por período** (html:89–106): `flex: 2 1 420px; min-width 0; bg #fff; radius 16; padding 24; flex column; gap 16`.
     - Topo (`flex; align-items:center; gap 12; flex-wrap`): título `flex:1` 16/700 `#2C3143`, depois as legendas.
       - Legenda: `flex; gap 6`, 12px/400 `#50555C`, com quadrado 10×10 `radius 3`.
       - Quadrado **`#0069BD`** em "Aprovados" e **`#CCE1F2`** em "Demais status" (html:92–93).
     - Área das barras: `flex; align-items:flex-end; gap 4; height 180px`.
     - Cada coluna: `flex:1; min-width:0; height:100%; flex column; justify-content:flex-end; align-items:center; gap 6`. Dentro dela, na ordem:
       - número: 11/600 `#50555C`, `height 14`;
       - barra: `width 100%; max-width 44; height {h}; background {bg}; radius 6; overflow hidden; flex column; justify-content:flex-end`, e dentro dela um div `height {hOk}` `#0069BD` ancorado embaixo;
       - rótulo: 11/500 `#8F8D8D`, `height 14`.
     - **Atenção, a barra é achatada.** A altura em % é calculada sobre os 180px da coluna. Só que os dois textos (14px) e os dois gaps (6px) ficam na mesma coluna.
       - Quando `h × 180 + 40 > 180` (h > 77,8%), o flex-shrink encolhe barra e textos **em proporção**.
       - A barra tem `overflow:hidden`, então o mínimo dela é 0. O mínimo de cada texto é a altura do conteúdo, 13px (line-height normal de 11px).
       - Medido (web):

         | Altura pedida | Barra | Textos |
         |---|---|---|
         | 25% | 45px | 14px |
         | 50% | 90px | 14px |
         | 75% | 135px | 14px |
         | 77% | 138,59px | 14px |
         | 78% | 140,06px | 13,97px |
         | 80% | 140,66px | 13,67px |
         | 82% | 141,22px | 13,39px |
         | a partir de cerca de 85% (152,9px), inclusive 100% | **142px** | 13px |

       - Para bater pixel a pixel, copie a estrutura CSS em vez de calcular px no JS.
   - **Reprovações por tipo** (html:107–119): `flex: 1 1 280px; min-width 0`, com o mesmo cartão (padding 24, gap 16).
     - Título 16/700 `#2C3143`.
     - Lista em `flex column; gap 14`. Cada item é `column; gap 6`.
     - Linha de texto (13px, `gap 8`):
       - nome: `flex:1`, 600, `#2C3143`, sem nowrap e sem ellipsis (quebra linha);
       - taxa: 400, `#8F8D8D`;
       - total: 700, `#262A3B`, `min-width 16`, alinhado à direita.
     - Barra: `8px; radius 4; overflow hidden`, trilho `#EFF1F3`, preenchimento `#FF6A5D` com `height 100%` e `radius 4`. A largura do preenchimento é `n ÷ maior n` (ver Regras).
4. **Linha fila + ranking** (html:121–149): `flex; flex-wrap: wrap; gap 16`.
   - **Fila de aprovação** (html:122–135): `flex: 1 1 320px; min-width 0`, cartão com padding 24 e `gap 12`.
     - Cabeçalho (`flex; align-items:center`, sem gap): título 16/700 `#2C3143` `flex:1` + badge (12/600, `#B85200` sobre `#FFEBDC`, `padding 2px 10px`, pill).
     - Estado vazio: 14px/400 `#8F8D8D`, `padding 12px 0`.
     - Item: `flex; align-items:center; gap 12; padding 12; radius 12; bg #F9F9F9; cursor pointer`, hover `#EEF4FA`.
       - Avatar 36px (`flex:none`) com a cor do prestador e as iniciais em 12/700 branco.
       - Coluna de texto `flex:1; min-width:0`:
         - título 14/600 `#2C3143`, `nowrap + ellipsis`;
         - linha 12px/400 `#8F8D8D`, **sem nowrap**.
       - Chip 12/600, `padding 3px 10px`, pill, `nowrap`.
   - **Ranking de prestadores** (html:136–148): `flex: 1.4 1 360px; min-width 0`, cartão com padding 24 e `gap 8`. Título 16/700 `#2C3143` com `padding-bottom 4`.
     - Grade `40px minmax(0,1fr) 72px 72px 64px`, `gap 8`, nas duas partes:
       - cabeçalho: 12/500 `#8F8D8D`, `padding 0 4px`, 1ª coluna vazia, colunas numéricas à direita;
       - linhas: `padding 10px 4px`, `border-top 1px #E5E5E5`, 14px, `align-items:center`.
     - Posição: 30×24, `radius 8`, 12/700, centralizada.
     - Avatar 30px (`flex:none`) com as iniciais em 11/700, `gap 10`, e o nome em 600 `#2C3143` com nowrap e ellipsis.
     - Concluídos em 700 (herda `#262A3B` do body); Aprovação e Tempo em 400 `#363853`.

**`line-height: normal`.** Todos os textos, menos o título (36px) e o valor do KPI (36px), usam o padrão do navegador.

Com Plus Jakarta Sans, as alturas renderizadas foram: **11px → 13**, 12px → 15, 13px → 16, 14px → 18, 16px → 21. Os 14px do número e do rótulo das barras vêm do `height:14px` explícito, não do line-height.

O Vuetify usa 1.5, então é preciso forçar `line-height: normal`.

### Web × Mobile (medidas renderizadas, scrollbar oculta)

| Bloco | Gestor · Web (1440, conteúdo 1144px) | Gestor · Mobile (375, conteúdo 343px) |
|---|---|---|
| Moldura | Sidebar 232px (Painel ativo, badge "3" em Aprovações, cartão "Renata Silva / Gestora"). Sem barra de abas. Área rolável de 1208×844. | Sem sidebar e sem cartão de usuário. Barra de abas de 76px embaixo (y 692), com badge. Barra de status falsa de 44px (simulação, fica fora da comparação). Área rolável de 375×**692** (812 − 44 − 76); os 768 de `VIEWPORT_APP` incluem as abas. |
| Cabeçalho (y 28 web / 16 mob) | Uma linha de 51px: textos à esquerda; segmentado (141×40) e botão (164×44) à direita, alinhados pela base. | **Duas linhas** (107px). Linha 1: data + título na largura toda. Linha 2 (y +63): segmentado e botão **à esquerda**, com o segmentado 4px mais baixo (alinhamento pela base). |
| KPIs | 5 colunas de 219,2px, altura 115. | **2 colunas** de 165,5px e 3 linhas. O 5º cartão fica sozinho na coluna esquerda. "Acionamentos em aberto", "Aguardando aprovação" e "Tempo médio de conclusão" quebram em 2 linhas. As linhas 1 e 2 da grade ficam com 131px (o conteúdo do cartão vizinho fica no topo); a linha 3 fica com 115px. |
| Gráficos | Lado a lado: Volume 705,33 e Reprovações 422,67, com a mesma altura (stretch): 265 em 7d, 379 em 30d. Barra de 44px em 7d e 18,03px em 30d. | Empilhados na largura toda. "Volume por período" **quebra em 2 linhas** ("Volume por" / "período"; título com 96,6px) e as legendas ficam na mesma linha. Volume com 286px; Reprovações com 159px (7d) e 395px (30d). Barra de 38,7px em 7d e 5,95px em 30d. Em 30d, "Limpeza de ar-condicionado" quebra em "Limpeza de ar-" / "condicionado". |
| Fila / Ranking | Lado a lado: Fila 506,67 e Ranking 621,33, altura 391 (7d). Item da fila com 60px. | Empilhados (Fila 411, Ranking 391). **Fila:** o título do item fica com **54,5px** de largura e aparece como "Revisã…", "Pintur…", "Limpe…". A linha "AC-1059 · Enviado 28/09 · 10:30" quebra em 4 linhas ("AC-1059" / "· Enviado" / "28/09 ·" / "10:30"), então cada item tem 102px. **Ranking:** a coluna do nome fica com **7px**. O cabeçalho "Prestador" se sobrepõe a "Concluídos", os nomes somem (ellipsis de largura 0) e o avatar (30px) invade a coluna seguinte. |
| Rolagem total | 950px (7d) / 1064px (30d). A 1ª tela (844) corta a 5ª linha do ranking. | 1887px (7d) / 2123px (30d). |

Nada some no mobile dentro do Painel. O único elemento que muda é a navegação: a sidebar com o cartão do usuário vira a barra de abas.

---

## Textos exatos

- Data: `{DiaDaSemana}, DD/MM/AAAA`, por exemplo **"Terça-feira, 29/09/2026"**. Dias: "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado" (data:17; html:967).
- **"Seu painel"**
- Botões do segmentado: **"7 dias"**, **"30 dias"**
- **"Novo acionamento"**
- KPIs (label / valor / sublinha):
  - "Acionamentos em aberto" / `{n}` / `{n} para hoje`
  - "Aguardando aprovação" / `{n}` / "Na sua fila"
  - "Taxa de aprovação" / `{p}%` / `{aprovadas} de {total} análises` (sempre no plural: "1 de 1 análises")
  - "Tempo médio de conclusão" / `{h}h{mm}` (ex.: "1h46", "0h00") / "Do início ao envio"
  - "Demandas inviáveis" / `{n}` / `{p}% do período`
- **"Volume por período"**, legendas **"Aprovados"** e **"Demais status"**
- Rótulos das barras:
  - 7d: "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb" (data:16);
  - 30d: dia com 2 dígitos ("31", "05", "10", …, "29") ou vazio.
- Número acima da barra: `{n}`, ou vazio quando o dia não tem acionamentos.
- **"Reprovações por tipo"**, com linhas `{Nome do tipo}` · `{p}% das demandas` · `{n}`
- **"Fila de aprovação"** e o badge `{n}`
  - Estado vazio: **"Nada para conferir agora."**
  - Item: `{título}` / `{AC-1060} · Enviado {DD/MM} · {HH:MM}`, com o ponto do meio U+00B7 e espaços. Chip: **"Aguardando aprovação"**, ou **"Inviabilidade em análise"** quando `inviavel`.
- **"Ranking de prestadores"**
  - Cabeçalhos: (vazio) · **"Prestador"** · **"Concluídos"** · **"Aprovação"** · **"Tempo"**
  - Posição: `{n}º`, com o indicador ordinal U+00BA ("1º")
  - Sem dados: **"—"** (travessão U+2014) em Aprovação e Tempo
- Navegação (contexto):
  - "Gestão de demandas" (caixa alta via CSS), "Painel", "Acionamentos", "Aprovações", "Prestadores", "Checklists", "Renata Silva", "Gestora".
  - O `deco` tem um fallback para prestador sem cadastro (data:92): nome "Prestador removido", iniciais "—", cor `#A6A6A6`. **Esse fallback nunca é alcançado nos fluxos do protótipo.** A exclusão é lógica (`deleted = true`, html:1191) e o registro continua em `A.PROS` (html:1248), com nome e cor. Além disso, excluir fica bloqueado enquanto houver acionamento `aguardando` (html:1160).
- Toast depois de criar pelo modal aberto no Painel: **"Acionamento enviado para {nome}"** (html:999). Ele já aparece na tela Acionamentos. O Painel em si não tem placeholders nem mensagens de erro.

---

## Regras e cálculos

Base comum (html:924, 933–934; data:19–20):

```js
today = A.iso(A.addD(0))                      // 'YYYY-MM-DD' local (no app: America/Sao_Paulo)
const P = S.period, from = A.iso(A.addD(-(P - 1)));            // html:933
const inP = acs.filter(a => a.date >= from && a.date <= today); // html:934
```

- O **período** usa a **data do atendimento** (`a.date` = `Acionamento.data`), não `criadoEm` nem a data da revisão.
  - São os últimos P dias, contando hoje. Datas futuras ficam de fora.
  - Entram todos os status e todos os prestadores, inclusive inativos e excluídos.
- O período fica só no estado do componente:
  - o padrão é 7;
  - sobrevive à navegação, à troca de modo e ao "Restaurar exemplo";
  - volta a 7 ao recarregar a página.

### KPIs (html:935–946)

1. **Acionamentos em aberto**
   ```js
   const openN = acs.filter(a => ['aberto','em_andamento','reprovado'].includes(a.status)).length; // html:935
   sub: acs.filter(a => a.date === today && a.status !== 'aprovado').length + ' para hoje'          // html:941
   ```
   - O valor **ignora o período**: entram atrasados e futuros.
   - "para hoje" conta os acionamentos de hoje **com qualquer status menos `aprovado`**, então `aguardando` também entra.
   - No seed, os 4 são: AC-1062 `aguardando` + AC-1063 e AC-1064 `aberto` + AC-1065 `em_andamento` (data:50–53).
   - O README diz só "N para hoje".
   - Clique: `go('list')`.
2. **Aguardando aprovação**
   - Valor: `wait.length`, com `wait = acs.filter(a => a.status === 'aguardando')` (html:926). **Ignora o período.**
   - Sublinha fixa: "Na sua fila".
   - Clique: `go('approvals')` (html:942).
3. **Taxa de aprovação**
   ```js
   const revs = inP.flatMap(a => a.reviews), apr = revs.filter(r => r.d === 'a').length; // html:936
   value: (revs.length ? Math.round(apr / revs.length * 100) : 0) + '%'                   // html:943
   sub: apr + ' de ' + revs.length + ' análises'
   ```
   - Entram **todas as revisões dos acionamentos do período**, qualquer que seja a data da revisão. O README diz "revisões… no período" e não explica que o período vem da data do atendimento.
   - Sem revisões: "0%" e "0 de 0 análises".
   - Sem clique.
4. **Tempo médio de conclusão**
   ```js
   const subm = inP.filter(a => a.subs.length && a.startedAt);                                            // html:937
   const avg = subm.length ? subm.reduce((s,a) => s + (new Date(a.subs[0]) - new Date(a.startedAt))/60000, 0) / subm.length : 0; // html:938
   value: A.dur(avg)  // dur = m => Math.floor(m/60)+'h'+pad(Math.round(m%60))                             // data:27
   ```
   - É a média, em minutos com fração, de **primeiro envio − início**. Entram também:
     - os envios de inviabilidade;
     - os acionamentos ainda `aguardando`, reprovados ou reenviados, sempre com `subs[0]`.
   - Sem dados: "0h00" (o ranking mostra "—").
   - **Bug de arredondamento:** `m%60` pode arredondar para 60. Por exemplo, 119,6 min vira **"1h60"**.
   - O `.5` sobe (`Math.round`). O seed tem casos exatos: 82,5 min vira "1h23" e 122,5 min vira "2h03" (ver Ranking).
   - Sem clique.
5. **Demandas inviáveis**
   ```js
   const invN = inP.filter(a => a.inviavel).length;                               // html:939
   sub: (inP.length ? Math.round(invN / inP.length * 100) : 0) + '% do período'   // html:945
   ```
   - Conta **acionamentos**, não demandas. Entram os que têm `inviavel = true`: os `aguardando` em análise e os `aprovado` já confirmados.
   - Uma inviabilidade recusada volta a `inviavel = false` e sai da conta (html:1037).
   - O denominador é **todos os acionamentos do período**, com qualquer status.
   - Sem clique.

Valores com o seed do dia. Eles não dependem da data, porque o seed é relativo a hoje e o RNG é fixo (`rng(7)`):

| KPI | 7 dias | 30 dias |
|---|---|---|
| Em aberto | 10 / "4 para hoje" | 10 / "4 para hoje" |
| Aguardando | 3 / "Na sua fila" | 3 |
| Taxa | 73% / "8 de 11 análises" | 81% / "57 de 70 análises" |
| Tempo médio | 1h46 (106,15 min, 13 acionamentos) | 1h55 (115,31 min, 62 acionamentos) |
| Inviáveis | 1 / "6% do período" (1 de 16: AC-1055) | 3 / "5% do período" (3 de 65: AC-1005, AC-1029, AC-1055) |

### Volume por período (html:947–950)

```js
const days = []; for (let i = P - 1; i >= 0; i--) days.push(A.addD(-i));   // do mais antigo (esq.) até hoje (dir.)
const counts = days.map(d => { const k = A.iso(d); const l = acs.filter(a => a.date === k);
  return { n: l.length, ok: l.filter(a => a.status === 'aprovado' && !a.inviavel).length, d }; });
const mx = Math.max(1, ...counts.map(c => c.n));
bars: n: c.n ? String(c.n) : '',  h: Math.max(4, c.n / mx * 100) + '%',  hOk: (c.n ? c.ok / c.n * 100 : 0) + '%',
      label: P === 7 ? A.WD[c.d.getDay()] : (i % 5 === 0 || i === P - 1 ? A.pad(c.d.getDate()) : ''),
      bg: c.n ? '#CCE1F2' : '#EFF1F3'
```

- **Total** = todos os acionamentos com aquela data, com qualquer status.
- **Aprovado** = `aprovado && !inviavel`. Um inviável confirmado conta como "Demais status".
- **Altura:** relativa ao dia de maior volume do período, com mínimo de 4%.
  - O mínimo vale também para dias com volume pequeno: 1 de 30 dá 3,3%, que sobe para 4%.
  - Um dia vazio vira um "toco" de 4% em `#EFF1F3`, sem número.
- **Preenchimento azul:** é a fração aprovada **da altura da própria barra**. Lembre do achatamento: o máximo efetivo é 142px, e entre 78% e 85% a barra fica entre 140 e 142px.
- **Rótulos em 30d:** vêm do **índice**, não do dia do mês. Saem os índices 0, 5, 10, 15, 20, 25 **e sempre o último** (hoje). Com hoje = 29/09, saem "31", "05", "10", "15", "20", "25", "29".
- **Seed, 7d** (Qua→Ter): 2 (100% aprov.), 2 (50%), 1 (100%), 2 (50%), 2 (100%), 3 (0%), 4 (0%); mx = 4.

### Reprovações por tipo (html:952–956)

```js
const rt = {}; inP.forEach(a => a.reviews.forEach(r => { if (r.d === 'r') a.demandas.forEach(dm => {
  rt[dm.typeName] = rt[dm.typeName] || { n: 0, color: dm.color }; rt[dm.typeName].n++; }); }));
const tot = {}; inP.forEach(a => a.demandas.forEach(dm => { tot[dm.typeName] = (tot[dm.typeName] || 0) + 1; }));
const rl = Object.keys(rt).map(k => ({ name: k, n: rt[k].n, rate: Math.round(rt[k].n / tot[k] * 100) + '% das demandas' }))
  .sort((a, b) => b.n - a.n);
w: r.n / Math.max(1, ...rl.map(r => r.n)) * 100 + '%'
```

- **n** = número de **reprovações** (revisões com `d === 'r'`) dos acionamentos do período. Cada reprovação conta uma vez para **cada** demanda do acionamento: um acionamento com 2 tipos reprovado 2 vezes soma 2 em cada tipo.
  - No seed 30d, AC-1031 (Limpeza de ar-condicionado + Revisão elétrica) é o caso com 2 tipos.
- **%** = n ÷ nº de demandas daquele tipo no período (qualquer status). **Pode passar de 100%.** O `.5` sobe: no seed 30d, 1/8 = 12,5% vira "13%".
- **Largura da barra** = n ÷ maior n da lista. O 1º item sempre ocupa 100% da largura, e a largura não tem relação com o "% das demandas".
- O agrupamento é pelo **nome snapshot** (`tipoNome`), não pelo id. A cor é coletada mas **não é usada**: a barra é sempre `#FF6A5D`.
- **Ordem:** n decrescente.
  - O sort é estável, então no empate vale a ordem de primeira aparição em `rt`: acionamentos na ordem do array (código crescente), revisões em ordem, demandas em ordem.
- Aparecem **todos** os tipos com pelo menos 1 reprovação, sem limite. Tipos sem reprovação não aparecem.
- **Seed:**
  - 7d: Reparo em gesso "67% das demandas" 2; Revisão elétrica "33%" 1.
  - 30d: Chaveiro 44% 4; Reparo em gesso 25% 3; Ponto de luz 22% 2; Revisão elétrica 29% 2; Limpeza de ar-condicionado 13% 1; Pintura 9% 1; Vazamento 13% 1.

### Fila de aprovação (html:958, 968)

```js
const queue = wait.map(A.deco).sort((a, b) => a.subs[a.subs.length-1] < b.subs[b.subs.length-1] ? -1 : 1)
  .map(a => Object.assign(a, { sentAt: 'Enviado ' + A.fmtTs(a.subs[a.subs.length - 1]), open: openG(a.id) }));
queueTop: queue.slice(0, 4), noQueue: queue.length === 0
```

- Entram todos os `aguardando`, de **qualquer data** (fora do período).
  - Ficam ordenados pelo **último envio**, do mais antigo para o mais novo, e aparecem **até 4**.
  - O comparador nunca retorna 0, então a ordem de dois envios no mesmo instante é indefinida. `ordenarFila` do app retorna 0 e mantém a ordem da API.
- O badge do cabeçalho é `kpis.1.value` (html:123): o **total** da fila, não os 4 exibidos. Com a fila vazia ele mostra "0".
- `fmtTs` gera "DD/MM · HH:MM" no horário local (data:26).
- O chip vem de `deco` (data:93): "Inviabilidade em análise" se `inviavel`, senão "Aguardando aprovação", sempre em `#FFEBDC`/`#B85200`.
- O avatar usa a cor atual do prestador, sem ficar cinza quando ele está inativo.
- **Seed** (7d e 30d):
  1. CM · "Revisão elétrica e troca de disjuntor" · "AC-1059 · Enviado 28/09 · 10:30"
  2. AR · "Pintura da fachada lateral" · "AC-1060 · Enviado 28/09 · 16:30"
  3. CM · "Limpeza de ar-condicionado" · "AC-1062 · Enviado 29/09 · 08:45"

### Ranking de prestadores (html:957)

```js
A.PROS.filter(p => !p.deleted && (p.status === 'ativo' || inP.some(a => a.pid === p.id))).map(p => {
  const m = inP.filter(a => a.pid === p.id);
  const fin = m.filter(a => a.status === 'aprovado' && !a.inviavel).length;
  const rv = m.flatMap(a => a.reviews); const ap = rv.filter(r => r.d === 'a').length;
  const sb = m.filter(a => a.subs.length && a.startedAt); const av = /* média (subs[0]-startedAt) em min */;
  return { fin, rate: rv.length ? Math.round(ap / rv.length * 100) + '%' : '—', rateN: rv.length ? ap / rv.length : 0,
           avg: sb.length ? A.dur(av) : '—' }; })
.sort((a, b) => b.fin - a.fin || b.rateN - a.rateN)
.map((r, i) => ({ pos: (i+1)+'º', posBg: i === 0 ? '#FFEBDC' : '#EFF1F3', posFg: i === 0 ? '#B85200' : '#363853' }))
```

- `A.PROS` é `data.pros` (html:1248). Inclui os cadastrados ou editados na tela Prestadores.
- **Quem entra:**
  - excluídos (`deleted`/`excluidoEm`): **nunca**;
  - ativos: **sempre**, mesmo zerados (0 / — / —);
  - inativos: **só se tiverem algum acionamento no período**, com qualquer status.
- **Concluídos** = aprovados não inviáveis no período.
- **Aprovação** = revisões aprovadas ÷ revisões dos acionamentos do prestador no período. Arredondada na exibição; o desempate usa a razão exata.
- **Tempo** = média de (1º envio − início), no mesmo formato `dur`. Sem dados: "—".
- **Ordem:** Concluídos decrescente, depois a taxa exata decrescente.
  - Não há 3º critério: o sort estável mantém a ordem do array `data.pros`, que é a ordem de inserção (p1…p6, e os novos no fim).
  - Essa ordem **não** é a de "Credenciado desde": Roberto (2024-05) vem depois de Marina (2025-01).
- Posições sempre sequenciais, sem empate compartilhado. **Sem limite** de linhas.
- Selo laranja-claro só no 1º. O avatar usa a cor do prestador (não fica cinza quando inativo). As linhas **não são clicáveis**.
- **Seed:**
  - 7d: 1º Carlos Mendes 3 · 80% · 1h09; 2º Ana Ribeiro 2 · 100% · 3h20; 3º João Pires 1 · 50% · 1h23 (**82,5 min**, o `.5` sobe); 4º Marina Costa 1 · 50% · 2h10; 5º Luciana Prado 0 · — · —.
  - 30d: 1º João Pires 15 · 84% · 1h53; 2º Ana Ribeiro 14 · 83% · 2h11; 3º Marina Costa 14 · 78% · 2h03 (**122,5 min**); 4º Carlos Mendes 11 · 80% · 1h35; 5º Luciana Prado 0 · — · —.
  - Roberto Alves (inativo, sem acionamentos) não aparece.

### Cabeçalho

- `todayLabel: A.WDL[new Date().getDay()] + ', ' + A.br(today)` (html:967).
- O componente re-renderiza a cada 30s (`forceUpdate`, html:910), então a data (e todo o cálculo baseado em `today`) vira sozinha à meia-noite.

---

## Interações

| Alvo | Efeito (código) |
|---|---|
| "7 dias" / "30 dias" | `setState({ period: p })` (html:951). Recalcula Taxa, Tempo médio, Inviáveis, Volume, Reprovações e Ranking. **Não** mudam: Em aberto (nem o "para hoje"), Aguardando e a Fila. |
| "Novo acionamento" | Abre o modal "Novo acionamento" com o formulário vazio: `date: today`, `start '09:00'`, `end '11:00'`, `pid: A.ME` (html:970). O modal é `position:absolute; inset:0` dentro da coluna de conteúdo (html:57, 528–529): **no web a sidebar fica descoberta e clicável**; no mobile ele cobre a barra de status, o conteúdo e as abas. Ao "Enviar ao prestador", vai para **Acionamentos** com o filtro "Todos" e a busca limpa, e mostra o toast "Acionamento enviado para {nome}" (html:998–999). Fechar ou cancelar volta ao Painel sem mudar nada. |
| KPI "Acionamentos em aberto" (o cartão inteiro) | `go('list')`: abre Acionamentos **sem aplicar filtro**. Mantém o filtro e a busca que já estavam no estado (html:927, 941). |
| KPI "Aguardando aprovação" | `go('approvals')`: abre Aprovações (html:942). |
| Outros 3 KPIs | Nada (`go: null`). Só a sombra de hover. |
| Item da fila | `openG(id)`: Detalhe com `gFrom: 'dash'` e `reviewTxt` limpo (html:931). O link de voltar vira **"Painel"** (html:1044) e volta ao Painel (html:1043). **"Painel" continua ativo** na sidebar e nas abas enquanto o Detalhe está aberto (html:930). **A rolagem não é zerada** (ver nota abaixo). |
| Linhas do ranking, barras, linhas de reprovação | Nada. Sem tooltip e sem hover. |
| Hover | Cartão de KPI: sombra `0 4px 16px rgba(0,0,0,.08)`. Item da fila: `#EEF4FA`. "Novo acionamento": `#005AA3`. |
| Teclado | Nada específico. Os botões (segmentado e "Novo acionamento") respondem a Tab/Enter/Espaço, porque são nativos. Os cartões de KPI e os itens da fila são `div` e não recebem foco no protótipo. |

**Nota sobre a rolagem.** O scroller de html:64 é o mesmo para todas as telas do gestor, e o protótipo não mexe em `scrollTop`.

- O Detalhe aberto pela fila herda a rolagem do Painel.
- Ao "voltar", o Painel reaparece na posição rolada (limitada à altura da tela).
- Os cliques nos KPIs levam à lista ou a Aprovações também sem zerar a rolagem. No web isso não aparece, porque os KPIs estão no topo.

O app zera a rolagem a cada troca de rota (`LayoutGestor.vue`).

---

## Estados

- **Normal com o seed:** valores acima (7d é o padrão).
- **30 dias:** o gráfico ganha 30 barras finas e 7 rótulos. As Reprovações ganham 7 linhas e, no web, o cartão de Volume estica até a mesma altura (379), deixando espaço vazio embaixo das barras.
- **Sem dados:**
  - KPIs: "0" / "0 para hoje"; "0" / "Na sua fila"; "0%" / "0 de 0 análises"; "0h00" / "Do início ao envio"; "0" / "0% do período".
  - Volume: todas as barras viram tocos de 4% cinza (`#EFF1F3`), sem números; os rótulos continuam.
  - Reprovações: **só o título**, sem nenhuma mensagem (o `sc-if` de html:109 esconde a lista).
  - Fila: badge "0" e "Nada para conferir agora." (14px `#8F8D8D`, `padding 12px 0`).
  - Ranking: só os ativos zerados com "—". Sem nenhum prestador, fica só o cabeçalho, sem mensagem.
- **Casos-limite:**
  - Fila com mais de 4 itens: mostra 4 e o badge mostra o total.
  - Fila com inviabilidade: chip "Inviabilidade em análise".
  - Títulos longos na fila e nomes longos no ranking: ellipsis. Nomes longos nas Reprovações quebram linha.
  - % de reprovação acima de 100%.
  - "1h60" pelo arredondamento de `dur`. Empates em `.5` sobem (82,5 min vira "1h23"; 12,5% vira "13%").
  - O maior dia do gráfico fica com 142px, não 180. Barras entre 78% e 85% ficam entre 140 e 142px.
  - Sublinha sem singular: "1 de 1 análises". "1 para hoje" não tem esse problema.
  - "Prestador removido" / "—" / `#A6A6A6` só apareceria com um `pid` inexistente, o que não acontece nos fluxos do protótipo (exclusão lógica).
- **Carregando / erro:** não existem no protótipo. Com `ready` falso só a barra do topo aparece; os dados são locais.

---

## Dados que a API precisa fornecer

**Já existe e serve:**
- `GET /api/acionamentos/contagem` (gestor vê tudo), que devolve `{aberto, em_andamento, aguardando, reprovado, aprovado}`:
  - KPI 1 = `aberto + em_andamento + reprovado`;
  - KPI 2 = `aguardando`;
  - também é o badge da navegação (`usarContagem`).
- `GET /api/acionamentos?status=aguardando` devolve `ResumoAcionamento[]` com `codigo`, `titulo`, `status`, `inviavel`, `prestador{id,nome,cor}` e `ultimoEnvioEm`.
  - `ultimoEnvioEm` é o último evento `enviado`/`inviabilidade_enviada`, igual a `subs.at(-1)`.
  - Serve para montar a Fila: `ordenarFila` + `enviadoEm` (`apps/gestor/src/aprovacoes/fila.ts`) e depois `.slice(0, 4)`.
  - `StatusChip` e `AvatarIniciais` vêm de `@kgb/ui`.
- Formatos em `@kgb/ui`: `dataPorExtenso` ("Terça-feira, 29/09/2026") e `momento` ("28/09 · 10:30"), ambos no fuso de SP.
- Banco: tudo que é preciso já está no schema, sem migração.
  - `Acionamento`: `data`, `status`, `inviavel`, `iniciadoEm`.
  - `EventoAcionamento` (`enviado`/`inviabilidade_enviada`): o 1º envio é `min(em)`.
  - `Revisao.decisao`.
  - `Demanda`: `tipoNome` e `cor` (snapshots).
  - `Prestador`: `status`, `excluidoEm`, `cor`, `criadoEm` (para o desempate do ranking).

**Falta:** "para hoje" e tudo que depende do período.

Proposta: `GET /api/painel?periodo=7|30`, só para o gestor (`exigePapel('gestor')`). Rodar `pnpm api:generate` depois de criar a rota.

As regras ficam num domínio puro, `apps/api/src/dominio/painel.ts`, no molde de `inicio-prestador.ts`, com TDD usando os números do seed da tabela acima.

```ts
{
  hoje: 'YYYY-MM-DD',                       // dataSP(new Date())
  periodo: 7 | 30,
  paraHoje: number,                          // data === hoje && status !== 'aprovado'
  aprovacao: { aprovadas: number; total: number },   // front: Math.round(aprovadas/total*100) || 0
  tempoMedioMin: number | null,              // média (1º envio − iniciadoEm) em minutos (fração); front formata
  inviaveis: { quantidade: number; totalPeriodo: number },
  volume: { data: string; total: number; aprovados: number }[],        // P itens, do mais antigo até hoje
  reprovacoesPorTipo: { tipoNome: string; reprovacoes: number; demandas: number }[], // já ordenado
  ranking: { prestador: { id; nome; cor }; concluidos: number;
             revisoes: { aprovadas: number; total: number }; tempoMedioMin: number | null }[], // já ordenado
}
```

- "Em aberto" e "Aguardando" podem vir da `contagem` ou ser repetidos no `/painel`, para ficar tudo numa chamada.
- A chave da consulta no front deve começar com `'acionamentos'`, por exemplo `['acionamentos', 'painel', periodo]`. Assim as mutações (criar, revisar) invalidam o Painel junto com o resto (`consultas.ts`).
- O formato "1h46" precisa de um formatador novo em `@kgb/ui` que replique `dur` (data:27). Hoje não existe nenhum.
- O ranking precisa dos prestadores **inativos** com atividade no período, e `/api/prestadores` hoje devolve só os ativos. Por isso é melhor o endpoint devolver o ranking pronto.
  - Ordem de desempate: `criadoEm asc, id asc`, como em `listarPrestadoresAtivos`.
  - O seed do banco cria p1…p6 em sequência. Mesmo que `criadoEm` empate, `id asc` reproduz a ordem do protótipo.
- O desempate de `reprovacoesPorTipo` deve seguir a primeira aparição: `numero` do acionamento crescente, depois a `ordem` da demanda.
- Faça os arredondamentos em TS, não em SQL. `Math.round` arredonda .5 para cima, e o seed tem empates exatos:
  - 82,5 min tem que dar "1h23";
  - 122,5 min tem que dar "2h03";
  - 12,5% tem que dar "13%".

  O `round()` do Postgres em double precision arredonda o empate para o par, e esses valores sairiam 1h22, 2h02 e 12%.

---

## Casos para o pnpm visual

Como o seed é relativo a hoje, os números são os mesmos todo dia; só os rótulos de dia da semana e de dia do mês mudam. O seed precisa ser **do dia**.

A navegação por texto (`papel: 'text'`) em títulos sem ação serve para **rolar** até o bloco, porque o Playwright rola o alvo para a vista antes de clicar, como `abrirPeloTitulo` já faz.

- Não use clique em nome do ranking no mobile: lá o nome tem largura 0 e o clique não acontece.
- Os títulos da fila no mobile têm 54,5px e continuam clicáveis.

| Nome sugerido | Modo | Rota app | Passos | Regiões |
|---|---|---|---|---|
| `gestor-web-painel` (substitui o atual) | gw | `/painel` | — | `telaWeb` |
| `gestor-web-painel-30-dias` | gw | `/painel` | `{clicar:'30 dias'}` | `telaWeb` |
| `gestor-web-painel-rodape` | gw | `/painel` | `{clicar:'Luciana Prado', papel:'text'}` (rola até a 5ª linha do ranking) | `telaWeb` |
| `gestor-web-painel-30-dias-rodape` | gw | `/painel` | `{clicar:'30 dias'}`, `{clicar:'Luciana Prado', papel:'text'}` | `telaWeb` |
| `gestor-web-painel-fila-detalhe` | gw | `/painel` | `{clicar:'Pintura da fachada lateral', papel:'text'}` (Detalhe aguardando, voltar "Painel", Painel ativo). O item está visível sem rolar (y 648–708), então protótipo e app abrem o Detalhe no topo. | `telaWeb` |
| `gestor-web-painel-kpi-aprovacoes` | gw | `/painel` | `{clicar:'Aguardando aprovação', papel:'text'}`. O `.first()` pega o label do KPI, que vem antes dos chips no DOM; o clique no label precisa navegar. | `telaWeb` |
| `gestor-web-painel-novo-acionamento` (opcional) | gw | `/painel` | `{clicar:'Novo acionamento'}`. O overlay não cobre a sidebar (html:57, 529). | `telaWeb` |
| `gestor-mobile-painel` (amplia o atual) | gm | `/painel` | — | `abasGestor`, `cabecalho {x:16,y:16,w:300,h:52}` (existente) e `{nome:'conteudo', x:0, y:68, largura:367, altura:624}` (até y 692, onde começam as abas). A região pula o avatar com "Sair" do app (x 319–359, y 16–56), que não existe no protótipo. |
| `gestor-mobile-painel-graficos` | gm | `/painel` | `{clicar:'Reprovações por tipo', papel:'text'}` | `telaMobile` |
| `gestor-mobile-painel-fila` | gm | `/painel` | `{clicar:'Fila de aprovação', papel:'text'}` | `telaMobile` |
| `gestor-mobile-painel-ranking` | gm | `/painel` | `{clicar:'Ranking de prestadores', papel:'text'}` | `telaMobile` |
| `gestor-mobile-painel-30-dias` | gm | `/painel` | `{clicar:'30 dias'}`, `{clicar:'Reprovações por tipo', papel:'text'}` | `telaMobile` |
| `gestor-mobile-painel-fila-detalhe` (opcional) | gm | `/painel` | `{clicar:'Pintura da fachada lateral', papel:'text'}` duas vezes. O protótipo herda a rolagem do Painel no Detalhe e o app volta ao topo; o 2º clique, no título do Detalhe, deixa os dois no topo, como em `abrirPeloTitulo`. | `telaMobile` |

Requisitos para o app bater nesses casos:
- O segmentado precisa ser `<button>` com nome acessível exato "7 dias" / "30 dias".
- Os títulos precisam ter o texto exato.
- As linhas do ranking não podem ser links.
- O Detalhe aberto pelo Painel precisa de:
  - uma rota filha de `/painel` (por exemplo `painel/:id`), para o `RouterLink` "Painel" continuar ativo;
  - `origem: 'painel'`, com o rótulo "Painel". Hoje `PaginaDetalhe` só aceita `'acionamentos' | 'aprovacoes'`.

---

## Dúvidas e ambiguidades

1. **README × código.** Em todos os itens abaixo, o código é quem manda na implementação pixel perfect.
   - "Em aberto": o README dá só a fórmula e "N para hoje". O código não limita ao período, e "para hoje" inclui `aguardando`/`reprovado`/`em_andamento` de hoje.
   - "Taxa de aprovação" ("revisões… no período"): o período vem da **data do atendimento**, não da data da revisão.
   - "Demandas inviáveis": conta acionamentos, e o % tem como denominador todos os acionamentos do período.
   - Volume:
     - "aprovado" exclui os inviáveis confirmados;
     - os rótulos de 30d vêm do índice (0, 5, 10…), não do dia do mês, e o dia de hoje sempre ganha rótulo;
     - dias vazios viram toco de 4%.
   - Reprovações:
     - o "total" é o nº de **reprovações** (não de demandas), e o % pode passar de 100%;
     - não há limite de tipos nem estado vazio;
     - a cor do tipo não é usada;
     - a largura da barra é relativa ao maior n.
   - Ranking:
     - o README não diz quem entra nem quantos aparecem. O código mostra ativos sempre, inativos só com atividade no período, excluídos nunca, sem limite;
     - o README diz que os acionamentos de excluídos "continuam nos relatórios": nos KPIs e gráficos continuam, no ranking não.
2. **Barra achatada** (máximo efetivo de 142px, não 180; entre 78% e 85% a barra fica entre 140 e 142px). Replicar o CSS literal (recomendado pela regra pixel perfect) ou corrigir e aceitar divergência nas regiões do gráfico?
3. **Ranking quebrado no mobile** (coluna do nome com 7px, cabeçalho sobreposto, nomes invisíveis) e **fila no mobile** (título com 54,5px, cerca de 6 letras + "…", subtítulo em 4 linhas). A mesma grade CSS reproduz isso naturalmente. Corrigir exige decisão de produto e exclusão da região no `pnpm visual`.
4. **`dur` com "1h60"** e "0h00" sem dados (o ranking usa "—"). Replicar ou corrigir (arredondar os minutos totais antes)? Com o seed, as duas formas dão os mesmos valores, inclusive nos empates .5 (82,5 min dá "1h23" nas duas).
5. **Hover com sombra nos 3 KPIs sem ação** e nenhum cartão com cursor de mão. Adicionar `cursor: pointer` nos 2 clicáveis não altera screenshots.
6. **KPI "Em aberto" leva à lista sem filtro.** Não existe filtro único para aberto + em execução + reprovado. Manter assim?
7. **Persistência do período:** no protótipo fica só na memória (volta a 7 no reload). No app: ref de módulo, como `estadoLista`, ou query string?
8. **Carregando e erro** não existem no protótipo. Sugestão: seguir o padrão de Aprovações (`mensagemDeErro` num cartão branco) e não mostrar zeros falsos enquanto carrega.
9. **Avatar/"Sair" no Painel mobile** existe no app (decisão já tomada) e não no protótipo. Por isso as regiões do caso mobile pulam o canto.
10. **Breakpoint web/mobile:** o protótipo só define 1440 (com sidebar) e 375. Nas larguras intermediárias valem as regras de flex/grid; o app usa `mdAndUp` do Vuetify (960px, thresholds padrão).
11. **Atualização automática:** o protótipo re-renderiza a cada 30s. No app, falta definir quando buscar de novo (foco da janela, troca de rota, intervalo).
12. **"Hoje":** o protótipo usa o fuso do navegador. No app deve ser `America/Sao_Paulo` (`dataSP`) nos dois lados.
13. **Agrupamento por `tipoNome`:** um tipo renomeado aparece em duas linhas (nome antigo e nome novo). Aceitável?
14. **Rolagem ao abrir o Detalhe pela fila e ao voltar:** o protótipo mantém o `scrollTop` do scroller compartilhado; o app volta ao topo em toda troca de rota. É uma divergência de comportamento já assumida pelo app. Nos casos visuais, ela é contornada repetindo o clique no título.