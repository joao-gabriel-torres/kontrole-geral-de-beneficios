<!-- Levantamento verificado do protótipo (extração + verificação adversarial), 29/09/2026. Referência de detalhe para a implementação; as decisões finais estão em ../2026-09-29-telas-restantes-design.md, que prevalece. -->

# Checklists (tipos de demanda): especificação extraída do protótipo

Arquivos lidos:
- `/Users/john/Documents/Projetos/Russo/KGB - Kontrole Geral de Beneficios/docs/design/Acionamentos.dc.html`: template nas linhas 264–309, lógica `vTypes` nas linhas 1003–1022. Nesta seção, "L" sem prefixo aponta para linhas deste arquivo.
- `/Users/john/Documents/Projetos/Russo/KGB - Kontrole Geral de Beneficios/docs/design/acionamentos-data.js`, citado como "data.js".
- `/Users/john/Documents/Projetos/Russo/KGB - Kontrole Geral de Beneficios/docs/design/support.js`, o runtime.
- `/Users/john/Documents/Projetos/Russo/KGB - Kontrole Geral de Beneficios/docs/design/README.md`, §7 e regra 1.

As medidas foram conferidas no Chrome. Na verificação, abri o protótipo por `file://` num contexto isolado do MCP chrome-devtools, com viewport 1440×900 no gw e 443×936 no gm e com o localStorage zerado. Não subi nenhum servidor e não criei arquivos no repositório (`git status` limpo). Todas as medidas web e mobile abaixo bateram.

**O runtime é React.** `onChange` vira o `onChange` do React, que dispara a cada tecla (support.js L317–319). Os inputs são controlados por `value`. O `sc-for` usa o índice como key (support.js L639).

## Como chegar no protótipo

- **Gestor · Web (`gw`):** a tela inicial é o Painel (`gv: 'dash'`). Clique no item **"Checklists"** da sidebar. É o 5º item, com o ícone `settings` (L928).
- **Gestor · Mobile (`gm`):** na barra do topo, clique em **"Gestor · Mobile"**. Depois toque na 5ª aba inferior, **"Checklists"**.
  - Trocar de modo não muda a tela (`setMode`, L921, só altera `mode` e `sheet`). Quem já está em Checklists no web continua em Checklists no mobile.
  - O modo fica salvo em `acionamentos_v3_mode` (L907, L921), então um reload reabre no último modo usado.
- **Prestador · App (`pa`):** a tela não existe nesse modo.
- **Seleção inicial:** o estado começa em `typeSel: 't1'` (L900). Com os dados do seed, isso é **Vazamento**.
  - Os dados (não a seleção) persistem no `localStorage` entre reloads (L905–906). Se t1 foi excluído numa sessão anterior, cai no 1º tipo da lista (L1005). Se t1 foi renomeado, aparece com o nome novo.
  - `typeSel` fica só na memória. Sobrevive a sair e voltar para a tela e à troca gw/gm, mas não a um reload.
  - **"Restaurar exemplo"** (L922) recria os dados e **leva para o Painel** (`gv: 'dash'`). Não mexe em `typeSel` nem nos rascunhos `newItem`/`newType`. Se `typeSel` apontava para um tipo criado, a volta à tela cai no 1º tipo.
- **Nomes acessíveis para o harness** (conferidos no snapshot de acessibilidade):
  - botões da lista: `"Vazamento 5 itens"`, `"Revisão elétrica 5 itens"`, `"Ponto de luz 4 itens"`, `"Troca de disjuntor 5 itens"`, `"Pintura 5 itens"`, `"Reparo em gesso 4 itens"`, `"Limpeza de ar-condicionado 5 itens"`, `"Chaveiro 4 itens"`;
  - outros botões: `"Adicionar"`, `"Excluir tipo"`, `"Subir"`, `"Remover"` (os dois últimos vêm do atributo `title`; são 5 de cada), `"Adicionar etapa"`;
  - textboxes: `"Novo tipo"` e `"Nova etapa do checklist"`, pelo placeholder;
  - o input do nome e os inputs das etapas **não têm nome acessível** (sem label e sem placeholder). Aparecem só como `textbox value="..."`;
  - o rótulo aparece em dois nós de texto: "CHECKLIST · " e "5 ITENS".

## Estrutura e layout

### Blocos, em ordem (L264–309)

1. **Container** (L265): coluna com gap 16, `max-width: 1080px`, `margin: 0 auto`.
2. **Cabeçalho** (L266–269), em `div`s (não em `h1`):
   - título "Tipos de demanda": 24px, line-height 36px, peso 700, `#2C3143`;
   - subtítulo com o aviso: 14px, peso 400, `line-height: normal` (18px), `#50555C`.
3. **Linha de duas colunas** (L270): `display:flex; flex-wrap:wrap; gap:16px; align-items:flex-start`.
   - **Coluna esquerda (lista)** (L271): `flex: 1 1 240px`, `min-width:0`, fundo `#fff`, raio 16, padding 12, coluna com gap 4.
     - **Botão de cada tipo** (L273–277):
       - flex, centralizado, gap 10, padding `10px 12px`, borda `1px solid` (`#0069BD` no selecionado, `transparent` nos demais), raio 12, fundo `#E6F0FA` no selecionado e `#fff` nos demais, `text-align:left`;
       - bolinha 10×10, raio 5, `flex:none`, na cor do tipo;
       - nome: `flex:1`, 14/600, `#2C3143`. Não tem `nowrap`: um nome longo quebra linha nos espaços;
       - "N itens": 12px, peso 400, `#8F8D8D`;
       - altura medida: 40px (37px com o nome vazio, ver Estados);
       - **sem hover**; o cursor é pointer (regra global de `button`, L15).
     - **Linha "Novo tipo"** (L279–282): flex, gap 8, padding `8px 4px 4px`, `border-top: 1px solid #E5E5E5`, `margin-top: 4px`.
       - input: `flex:1`, `min-width:0`, altura 40, `border: 1px dashed #0069BD`, raio 12, padding `0 12px`, 14px, peso 400, `outline:0`, texto `#262A3B` (regra global da L15);
       - placeholder sem estilo próprio: o cinza padrão do Chrome, `rgb(117,117,117)` (medido);
       - botão "Adicionar": altura 40, padding `0 14px`, sem borda, raio 12, fundo `#E6F0FA`, texto `#004E8F`, 13/600, sem hover.
   - **Coluna direita (editor)** (L284): `flex: 2 1 340px`, `min-width:0`, fundo `#fff`, raio 16, padding 24, coluna com gap 16.
     - **Linha do título** (L285–289): flex, centralizada, gap 12.
       - bolinha 14×14, raio 7, `flex:none`;
       - **input do nome**: `flex:1`, `min-width:0`, `border:0`, `outline:0`, 18/700 `#2C3143`, padding `4px 0`, `border-bottom: 1px solid transparent`. No foco (`:focus`), a borda inferior vira `1px solid #262A3B` (`style-focus`). O fundo é o padrão do input (branco). Altura medida: 32px;
       - "Excluir tipo": `border:0`, fundo transparente, 13/600, `#B8342A`. Não tem padding explícito, então herda o padrão do `<button>`, `1px 6px`. Medido: 80,97 × 18, centralizado verticalmente na linha. Sem hover.
     - **Rótulo** (L290): "Checklist · N itens", 12/600, `#8F8D8D`, `uppercase`, letter-spacing .06em. Aparece como "CHECKLIST · 5 ITENS". Altura 15.
     - **Lista de etapas** (L291–301): coluna com gap 8.
       - Cada linha (L293): flex, centralizada, gap 8, padding `4px 4px 4px 12px`, raio 12, fundo `#F9F9F9`, altura 48.
       - Número: span de largura 22, 12/700, `#8F8D8D`.
       - Input (L295): `flex:1`, `min-width:0`, altura 40, sem borda, fundo transparente, `outline:0`, 14/500, texto `#262A3B` (L15). **Não tem padding explícito**: herda o padrão do navegador `1px 2px` (medido), e o texto começa 2px para dentro.
       - Botão "Subir" (L296): 36×36, raio 10, sem borda, fundo transparente, opacidade 1 (ou .3 na 1ª etapa). Ícone `chevron-right` de 18px com `rotate(-90deg)`, apontando para cima. **Sem hover.**
       - Botão "Remover" (L297): 36×36, raio 10, hover com fundo `#FFD7D4`, ícone `cancel` de 18px.
       - Estado vazio (L300), dentro da mesma coluna da lista: "Nenhum item ainda.", 14px, `#8F8D8D`, padding `8px 0` (altura 34).
     - **Linha "Nova etapa"** (L302–305): flex, gap 8.
       - input: `flex:1`, `min-width:0`, altura 44, `border: 1px dashed #0069BD`, raio 12, padding `0 14px`, 14px, `outline:0`;
       - botão "Adicionar etapa": altura 44, padding `0 16px`, sem borda, raio 12, fundo `#0069BD`, texto branco 14/600. **Sem hover.** O `#005AA3` e o raio 16 do botão primário do README não se aplicam aqui.

### Web (área do app 1440×844, sem a barra do topo; coordenadas do app)

- Sidebar 232. A área de conteúdo tem 1208 de largura, menos o padding de 32+32, o que dá 1144. Como passa de 1080, o container fica em **x=296, com largura 1080**.
- Título: y=28, altura 36. Subtítulo: y=64, altura 18.
- Linha das colunas: y=98.
- **Coluna esquerda:** x=296, 401,33 × 433.
  - botões de tipo: x=308, largura 377,33, y=110, 154, … 418 (passo de 44);
  - input "Novo tipo": x=312, y=475, 273,33 × 40;
  - botão "Adicionar": x=593,33, 88 × 40.
- **Coluna direita:** x=713,33, 662,67 × 459.
  - linha do título: y=122;
  - input do nome: x=763,33, 495,7 × 32;
  - "Excluir tipo": x=1271,03, y=129;
  - rótulo: y=170;
  - etapas: começam em y=201; os blocos de 5 × 48 mais os gaps somam 272. Os inputs das etapas ficam em x=779,33 e y=205, 261, 317, 373 e 429, com 480,67 × 40;
  - linha "Nova etapa": y=489. Input em x=737,33 com 467,88 de largura; botão em x=1213,2 com cerca de 138,8.
- O conteúdo não gera rolagem (scrollHeight = 844).

### Mobile (`gm`: área 375×768 abaixo da barra de status falsa, com as abas de 76px em y=692)

- A rolagem existe: o conteúdo tem 1036px para 692px visíveis.
  - **Há uma barra de rolagem clássica de 8px** (o protótipo estiliza `::-webkit-scrollbar`, L15), então a largura útil é 375 − 8 − 32 = **335**.
- As colunas **quebram em duas linhas**, porque 240 + 16 + 340 = 596 é maior que 335. A lista fica em cima e o editor embaixo, os dois com 335 de largura. A quebra não vem de media query, e sim do `flex-wrap` sempre que a largura útil fica abaixo de 596.
- Posições no conteúdo:
  - título: y=16, altura 36;
  - subtítulo: y=52, altura 36, **em 2 linhas**;
  - lista: y=104, altura 433. Os botões têm 311 de largura, e "Limpeza de ar-condicionado" cabe numa linha;
  - editor: y=553, altura 459;
  - input do nome: x=66, y=577, 168px;
  - inputs das etapas: 153px (os textos longos ficam cortados, sem reticências);
  - input "Nova etapa": x=40, y=944, 140,2px.
- Na primeira dobra (0–692) aparecem o cabeçalho, a lista inteira e o começo do editor: título em 577, rótulo em 625 e a 1ª etapa em 656–704, cortada.
- Rolagem máxima: 1036 − 692 = 344.

### Web e mobile: o que muda

Só o layout; a lógica é a mesma. No mobile:
- a moldura tem 395×832, borda de 10px `#262A3B`, raio 52 e padding externo 24 (L1244);
- há uma **barra de status falsa** no topo: 44px, fundo branco, relógio 14/600 à esquerda e uma pílula à direita, padding `0 28px` (L58–62). Ela não existe no gw e o relógio muda a cada minuto;
- o padding do conteúdo é `16px 16px 24px`, em vez de `28px 32px 40px`;
- as abas ficam embaixo, em vez da sidebar;
- as colunas ficam empilhadas.

Nenhum dos dois modos rola a tela sozinho: no mobile, selecionar ou criar um tipo não leva o editor para a vista.

O container rolável (L64) é **o mesmo elemento em todas as telas**. O `scrollTop` vem da tela anterior e é limitado à rolagem máxima de Checklists (344 no gm, 0 no gw). Chegar vindo de uma tela rolada abre Checklists já rolada no mobile.

## Textos exatos

- Navegação: **Checklists**.
- Título: **Tipos de demanda**.
- Aviso, logo abaixo do título (L268). É o único lugar do protótipo em que ele aparece: **O checklist de cada tipo é copiado para o acionamento quando ele é criado.**
- Lista do seed, na ordem (data.js L28–36):

  | Tipo | Contagem | Cor |
  |---|---|---|
  | Vazamento | 5 itens | `#0069BD` |
  | Revisão elétrica | 5 itens | `#FC7608` |
  | Ponto de luz | 4 itens | `#5D627D` |
  | Troca de disjuntor | 5 itens | `#F47B50` |
  | Pintura | 5 itens | `#004E8F` |
  | Reparo em gesso | 4 itens | `#E0A100` |
  | Limpeza de ar-condicionado | 5 itens | `#8FB8DE` |
  | Chaveiro | 4 itens | `#A6A6A6` |

- Contagem: `N + ' itens'`, **sem singular**. O protótipo mostra "1 itens" e "0 itens" (L1007, L1016).
- Placeholder **Novo tipo** e botão **Adicionar**.
- Botão **Excluir tipo**.
- Rótulo: no DOM, **Checklist · N itens**. Com o CSS uppercase, aparece "CHECKLIST · 5 ITENS". O separador é " · " (ponto médio U+00B7).
- Números das etapas: "1", "2", …
- Tooltips nativos: **Subir** e **Remover**.
- Checklist vazio: **Nenhum item ainda.**
- Placeholder **Nova etapa do checklist** e botão **Adicionar etapa**.
- Etapas do seed, que aparecem nos inputs:
  - Vazamento: Localizar ponto do vazamento · Fechar registro e isolar a área · Substituir conexão ou vedação · Testar com registro aberto · Limpar área de trabalho
  - Chaveiro: Avaliar fechadura · Abrir ou trocar cilindro · Testar chaves · Entregar cópias ao cliente
  - Os demais tipos estão em data.js L28–36.
- A tela **não tem** toasts, mensagens de erro, confirmações, placeholder no input do nome nem texto de carregamento.

## Regras e cálculos

1. **Qual tipo fica selecionado.** Vale o `typeSel`. Se ele não existir, cai no primeiro tipo da lista.
   L1005: `const sel = D.types.find(t => t.id === S.typeSel) || D.types[0];`
2. **Ordem da lista.** É a ordem do array `D.types`: os tipos do seed na ordem de data.js, e os novos entram no fim (`push`, L1014). Não há ordenação alfabética.
3. **Contagem.** L1007: `n: t.checklist.length + ' itens'`. No rótulo, L1016: `count: sel.checklist.length + ' itens'`.
4. **Destaque do selecionado.** L1007: `bg: t.id === sel.id ? '#E6F0FA' : '#fff', bd: t.id === sel.id ? '#0069BD' : 'transparent'`.
5. **Novo tipo** (L1014):
   ```js
   const addType = () => { const v = S.newType.trim(); if (!v) return; const id = 't' + window.ACD.uid();
     const cols = ['#0069BD', '#FC7608', '#B37BE7', '#F47B50', '#FF6A5D', '#FFB523', '#363853', '#47C272'];
     this.upd(d => { d.types.push({ id, name: v, color: cols[d.types.length % cols.length], checklist: [] }); });
     this.setState({ newType: '', typeSel: id }); };
   ```
   - O nome é o texto com `trim`. Se ficar vazio, **nada acontece e nada é mostrado**, e o campo **não é limpo** (continua com os espaços digitados; conferido).
   - **Nomes duplicados são aceitos**; não há nenhuma checagem. Conferido: um segundo "Pintura" é criado sem aviso.
   - A cor é `paleta[quantidade de tipos existentes antes do push % 8]`, usando uma **paleta fixa própria**, diferente das cores do seed e da lista do README.
     - Com os 8 tipos do seed, o 9º tipo recebe `cols[0]` (`#0069BD`, a mesma de Vazamento), o 10º `#FC7608`, o 11º `#B37BE7`, o 12º `#F47B50`, e assim por diante (conferido).
     - Excluir um tipo reduz a quantidade, então as cores podem se repetir.
   - O tipo novo começa com `checklist: []`, **fica selecionado** e o campo "Novo tipo" é limpo. O campo "Nova etapa" **não** é limpo (conferido).
   - O foco não muda: com Enter fica em "Novo tipo"; com clique fica em "Adicionar". Não há autofocus no título nem em "Nova etapa".
   - A cor não pode ser editada na tela.
6. **Renomear** (L1017): `renameType: e => { const v = e.target.value; this.upd(d => { d.types[ti].name = v; }); }`
   - Salva **a cada tecla**: `upd` grava o JSON inteiro no `localStorage` (L913–914).
   - Não faz `trim` e não valida: **o nome pode ficar vazio**, com espaços nas pontas (conferido: grava `"  Vazamento  "`) ou igual ao de outro tipo.
   - A lista à esquerda acompanha em tempo real.
   - Enter e blur não fazem nada de especial: o input não tem `onKeyDown` nem `onBlur`.
7. **Editar uma etapa** (L1009): `onChange: e => { const v = e.target.value; this.upd(d => { d.types[ti].checklist[i] = v; }); }`
   - Salva a cada tecla, sem `trim`.
   - **A etapa pode ficar vazia**: ela continua na lista e conta nos "N itens".
8. **Subir** (L1011–1012):
   ```js
   up: () => { if (i) this.upd(d => { const c = d.types[ti].checklist; [c[i - 1], c[i]] = [c[i], c[i - 1]]; }); },
   upOp: i ? '1' : '.3'
   ```
   - Troca a etapa com a anterior.
   - Na 1ª etapa o botão fica com opacidade .3, mas **não tem `disabled`**: continua clicável, com cursor pointer, e o clique não faz nada.
   - Não existe "Descer".
9. **Remover** (L1010): `rm: () => this.upd(d => { d.types[ti].checklist.splice(i, 1); })`. Remove na hora, sem confirmação e sem desfazer. Funciona em qualquer tipo, inclusive nos do seed, até zerar o checklist.
10. **Adicionar etapa** (L1013):
    ```js
    const addItem = () => { const v = S.newItem.trim(); if (!v) return; this.upd(d => { d.types[ti].checklist.push(v); }); this.setState({ newItem: '' }); };
    ```
    - Faz `trim`. Se ficar vazio, não faz nada, e o campo continua com os espaços.
    - Duplicadas são aceitas. A etapa entra no fim e o campo é limpo.
    - Enter também adiciona (L1018): `onItemKey: e => { if (e.key === 'Enter') addItem(); }`. O mesmo vale para "Novo tipo" (L1019).
11. **Excluir tipo** (L1020):
    ```js
    rmType: () => { if (D.types.length < 2) return; this.upd(d => { d.types.splice(ti, 1); }); this.setState({ typeSel: D.types[ti === 0 ? 1 : 0].id }); }
    ```
    - **Sem confirmação** e **sem bloqueio por uso**.
    - O único bloqueio é quando resta um único tipo. Nesse caso o botão continua com a mesma aparência e o clique não faz nada.
    - Nova seleção (conferido):
      - se o excluído era o 1º, vai para o antigo 2º, que vira o 1º;
      - senão, vai **sempre para o 1º da lista**, e não para o vizinho.
    - O campo "Nova etapa" não é limpo.
    - O tipo é removido do array: no protótipo é uma exclusão definitiva, que só volta com "Restaurar exemplo".
12. **Efeito sobre acionamentos (regra de negócio 1).**
    - Na criação, as demandas copiam `typeName`, `color` e `steps` do tipo. L995: `{ id: A.uid(), typeId: id, typeName: t.name, color: t.color, steps: t.checklist.map(text => ({ ... })) }`.
    - Por isso, renomear, editar, reordenar ou excluir um tipo **não altera acionamentos existentes**. Conferido: depois de excluir Chaveiro, 10 acionamentos continuam com `typeName: 'Chaveiro'`. Isso inclui:
      - as listas (`typesLabel`, data.js L93);
      - o detalhe (L1045, L1112);
      - "Reprovações por tipo", que agrupa pelo nome copiado (L952–953).
    - O `typeId` fica apontando para um tipo que não existe mais. Ele **nunca é lido** depois da criação: só aparece na L995.
    - O "Novo acionamento" passa a mostrar os tipos atuais na hora: os chips vêm de `D.types` (L980) e a prévia do checklist também (L981).
13. **Efeito sobre as especialidades dos prestadores.**
    - `p.types` guarda os ids e não é limpo quando o tipo é excluído (conferido: p3 continua com `t8`).
    - Na lista de prestadores, os nomes são buscados pelo id e os que não existem são descartados em silêncio (L1161, L1167: `p.types.map(tName).filter(Boolean)`). O mesmo acontece na exportação (data.js L101).
    - O modal "Editar prestador" lista só os tipos atuais (L1182). O id órfão continua em `F.types` e é gravado de novo ao salvar (L1185).
    - A importação troca `types` por `r.typeIds` (L1207), então os órfãos somem dos prestadores atualizados por planilha.
    - Um tipo renomeado aparece com o nome novo nos chips de prestador.
    - A importação de planilha compara com os nomes atuais normalizados, sem acento, sem maiúsculas e só com letras (L1215, data.js L98).
    - O seletor de prestador do "Novo acionamento" não filtra por especialidade (L986), então excluir um tipo não muda quem pode ser escolhido.
14. **Nomes duplicados: efeitos colaterais.**
    - "Reprovações por tipo" agrupa por `typeName` (L952–954). Demandas de tipos diferentes com o mesmo nome viram uma barra só, com a cor do primeiro encontrado.
    - Na importação, o `find` da L1215 pega sempre o **primeiro** tipo com aquele nome normalizado. "pintura" e "Pintúra" contam como "Pintura".
15. **Rascunhos.**
    - Clicar num tipo, **inclusive no que já está selecionado**, limpa o campo "Nova etapa" (L1007: `this.setState({ typeSel: t.id, newItem: '' })`), mas não limpa o campo "Novo tipo".
    - Criar e excluir tipo não limpam "Nova etapa". "Restaurar exemplo" não limpa nenhum dos dois.
    - Os dois rascunhos ficam só na memória do componente e sobrevivem à troca de tela e de modo.
16. **`vTypes` roda sempre.** `vGestor` chama `this.vTypes()` em todo render (L973), qualquer que seja a tela, e `renderVals` chama `vGestor` em todos os modos (L1249).

## Interações

| Ação | Efeito |
|---|---|
| Clique num tipo da lista | O tipo fica selecionado (fundo `#E6F0FA`, borda `#0069BD`). O editor mostra o tipo e o campo "Nova etapa" é limpo, mesmo quando o tipo já estava selecionado. Não há rolagem. |
| Digitar em "Novo tipo" | Só atualiza o rascunho. |
| "Adicionar" ou Enter em "Novo tipo" | **Com texto:** cria o tipo no fim da lista, com a cor da paleta e 0 itens, seleciona e limpa o campo. O editor mostra "CHECKLIST · 0 ITENS" e "Nenhum item ainda.". O foco não muda e "Nova etapa" mantém o rascunho. **Vazio ou só espaços:** nada acontece e o campo continua como está. |
| Digitar no nome (título) | Salva a cada tecla e a lista se atualiza junto. Aceita vazio e não faz trim. |
| Foco no nome | Aparece a borda inferior `#262A3B` (`:focus`). |
| "Excluir tipo" | **Com 2 ou mais tipos:** remove na hora e seleciona conforme a regra 11. **Com 1 tipo:** nada acontece. |
| Digitar numa etapa | Salva a cada tecla. Aceita vazio. |
| "Subir" | Troca com a etapa anterior e os números se refazem. Na 1ª etapa, nada acontece. O foco fica no mesmo índice, porque a key é o índice. |
| "Remover" (hover `#FFD7D4`) | Remove a etapa na hora. O foco fica no botão do mesmo índice, que agora é da etapa seguinte; se era a última, o foco se perde. Com zero etapas, aparece "Nenhum item ainda.". |
| "Adicionar etapa" ou Enter em "Nova etapa" | **Com texto:** acrescenta no fim e limpa o campo. Com Enter o foco fica no input; com clique fica no botão. **Vazio ou só espaços:** nada acontece e o campo continua como está. |
| Enter no nome ou numa etapa | Nada. |
| "Restaurar exemplo" (barra do topo) | Recria os dados e vai para o Painel. Não mexe na seleção nem nos rascunhos. |

## Estados

- **Padrão:** Vazamento (t1) selecionado, com 5 etapas.
- **Tipo sem etapas:** a lista mostra "0 itens", o rótulo "CHECKLIST · 0 ITENS" e aparece "Nenhum item ainda.".
  - Chega-se a ele criando um tipo **ou removendo todas as etapas de qualquer tipo**, inclusive dos do seed (conferido com Chaveiro).
  - Web: a mensagem fica em y=201, com 34 de altura, e o editor tem 221 de altura.
- **Uma etapa:** "1 itens".
- **Nome vazio:**
  - o botão da lista mostra só a bolinha e "N itens" e **cai de 40 para 37px** de altura, porque o span vazio tem altura 0. Os botões seguintes sobem 3px (medido);
  - o input do título fica vazio, sem placeholder.
- **Nome longo:**
  - na lista, quebra linha nos espaços. Uma palavra longa sem espaços **estoura o botão na horizontal** e "N itens" quebra em duas linhas, com o botão em 52px (medido);
  - no título, o input rola na horizontal (no mobile, cabem só 168px).
- **Etapa longa:** fica cortada dentro do input (153px no mobile).
- **Só um tipo:** "Excluir tipo" fica visível e com aparência normal, mas não faz nada.
- **Sem nenhum tipo:** não é possível chegar a esse estado pela interface. Se a lista ficasse vazia, `sel` seria `undefined` e `sel.id` quebraria na L1006. Como `vTypes` roda em todo render do gestor e em todos os modos (L973, L1249), **o protótipo inteiro** deixaria de renderizar. Ou seja, o protótipo não define esse estado.
- **Carregando e erro:** não existem no protótipo, que é síncrono e usa `localStorage`.

## Dados que a API precisa fornecer

- **Já existe:** `GET /api/tipos`, que exige apenas login e aceita qualquer papel.
  - Rota em `/Users/john/Documents/Projetos/Russo/KGB - Kontrole Geral de Beneficios/apps/api/src/rotas/catalogo.ts` (L8, L43); serviço `listarTipos` em `/Users/john/Documents/Projetos/Russo/KGB - Kontrole Geral de Beneficios/apps/api/src/servicos/acionamentos.ts` (L83).
  - Devolve `{ id, nome, cor, checklist: string[] }` dos tipos com `excluidoEm: null`, em `orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }]`.
  - Com o seed (`createMany`, mesmo `criadoEm`, ids t1…t8), a ordem sai t1…t8, igual à do protótipo. Tipos novos (cuid, criados depois) vão para o fim, como no protótipo.
  - "N itens" é `checklist.length`, calculado no cliente. Nenhuma outra agregação é necessária.
  - O gestor já consome essa rota em `apps/gestor/src/acionamentos/dados.ts` (L48–49), com a chave `CHAVES.tipos`.
- **Já existe e está testada:** a cópia do checklist na criação (`apps/api/src/rotas/gestao.test.ts` L71, "editar o checklist do tipo depois não muda o acionamento já criado").
  - O teste cobre só o checklist; a cópia de `tipoNome` e `cor` ao renomear não está testada.
  - A criação também recusa tipo excluído (`tipo_invalido`, filtro `excluidoEm: null` em `servicos/acionamentos.ts` L131–135).
- **Schema** (`packages/db/prisma/schema.prisma` L114–126):
  - `nome String @unique`: índice `tipo_demanda_nome_key`, que diferencia maiúsculas e acentos e também cobre os excluídos;
  - `cor`, `checklist String[]`, `excluidoEm DateTime?` (soft delete);
  - relação M:N implícita `Especialidades` com `Prestador` (tabela `_Especialidades`, FK com `ON DELETE CASCADE`, migration L304);
  - `Demanda.tipoId` obrigatório (FK `demanda_tipoId_fkey` com `ON DELETE RESTRICT`, migration L277).
- **Falta criar** (só gestor, `exigePapel('gestor')`, e depois `pnpm api:generate`):
  - `POST /api/tipos { nome }`: o servidor faz o `trim`, atribui `cor = PALETA[qtdTiposAtivos % 8]` com a paleta da L1014 e `checklist: []`, e devolve o `TipoDemanda`.
  - `PATCH /api/tipos/:id { nome?, checklist? }`: com `checklist` sendo o array inteiro, cobre editar, subir, remover e adicionar. Etapas granulares também servem, mas o array é o mais simples.
  - `DELETE /api/tipos/:id`: soft delete (`excluidoEm`). Precisa recusar a exclusão do último tipo ativo, como na L1020. O delete físico falharia pelo RESTRICT de `Demanda.tipo` sempre que o tipo tiver sido usado.
  - O README lista só `GET/POST/PATCH /tipos` (L350), sem DELETE.
- **Especialidades de tipos excluídos:** com soft delete, as linhas de `_Especialidades` continuam no banco. Para reproduzir o `filter(Boolean)` do protótipo, a rota da tela Prestadores precisa omitir das especialidades os tipos com `excluidoEm`.
  - Essa rota ainda não existe. O `GET /api/prestadores` atual (catalogo.ts L24–40) serve só ao seletor de ativos e devolve `{id, nome, regiao, cor}`, sem especialidades.
  - O mesmo filtro vale para a exportação, e a importação deve comparar só com os tipos ativos.

## Casos para o pnpm visual

O caso `gestor-web-checklists` já existe (`tools/visual/casos-gestor.ts` L107–114, com as regiões `sidebar` e `cabecalhoWeb(56)` em x=264, largura 480). Nesta tela o container começa em **x=296**. O harness apaga `acionamentos_v3` antes de cada execução, então o protótipo sempre começa no seed, com t1 selecionado. Coordenadas das regiões sugeridas:

| Modo | Região | x | y | largura | altura |
|---|---|---|---|---|---|
| gw | cabeçalho | 296 | 28 | 1080 | 54 |
| gw | lista | 296 | 98 | 401 | 433 |
| gw | editor | 713 | 98 | 663 | 459 |
| gm | cabeçalho | 16 | 16 | 335 | 72 |
| gm | lista | 16 | 104 | 335 | 433 |

Nos dois modos também entram `telaInteira`, a `sidebar` no web e as `abas` no mobile.

**Só são comparáveis casos que não alteram dados.** Criar, renomear e excluir persistiriam no banco real, enquanto o protótipo zera o `localStorage` a cada execução. Os casos sugeridos:

1. **`gestor-web-checklists`** (`gw`): navegar por "Checklists", sem passos. Vazamento selecionado. Ampliar as regiões para lista, editor e tela inteira.
2. **`gestor-web-checklists-chaveiro`** (`gw`): passo `{ clicar: 'Chaveiro 4 itens' }`. Mostra o último da lista, com 4 etapas e cor `#A6A6A6`.
3. **`gestor-web-checklists-limpeza`** (`gw`): passo `{ clicar: 'Limpeza de ar-condicionado 5 itens' }`. É o nome mais longo, no título e na lista.
4. **`gestor-mobile-checklists`** (`gm`): navegar por "Checklists". Mostra o cabeçalho em 2 linhas, a lista e o começo do editor, além das abas. Como o harness navega a partir do Painel, que está no topo, a rolagem começa em 0.
5. **`gestor-mobile-checklists-editor`** (`gm`): passo `{ clicar: 'Adicionar etapa' }`.
   - Com o campo vazio, o clique não faz nada (L1013), mas o Playwright rola até o botão. Como o botão está no fim, a rolagem trava no máximo (1036 − 692 = 344; conferido com `scrollIntoView` centralizado). Isso é determinístico se o app tiver a mesma altura de conteúdo.
   - Isso exige que, no app, "Adicionar etapa" **não** fique `disabled` com o campo vazio e **não** mostre erro.
6. **`gestor-mobile-checklists-pintura`** (`gm`): passos `[{ clicar: 'Pintura 5 itens' }, { clicar: 'Adicionar etapa' }]`.

Três estados ficam de fora com o harness atual, porque exigiriam mudar dados ou ter passos em inputs:
- "Nenhum item ainda." (tipo vazio);
- foco no título;
- texto digitado.

O input do nome e os das etapas também não podem ser alvo de `clicar`, porque não têm nome acessível.

## Dúvidas e ambiguidades

1. **Título da tela.** O menu diz "Checklists", mas o título da página é "Tipos de demanda" (L267). O README (§7) chama a tela de "Checklists (tipos de demanda)" e não menciona o título. O código usa "Tipos de demanda", e o placeholder atual `PaginaChecklists.vue` já segue isso (título, subtítulo e largura 1080).
2. **Quando salvar.** O protótipo salva a cada tecla (nome e etapas). Com a API, é preciso decidir entre debounce e salvar no blur. Para a tela ficar fiel, a lista precisa se atualizar enquanto se digita.
3. **Nome vazio ou duplicado.** O protótipo aceita os dois, sem mensagem, e não faz trim no nome editado.
   - O schema tem `nome @unique`, e o índice também cobre os excluídos: recriar "Pintura" depois de excluí-la violaria a restrição.
   - O índice diferencia maiúsculas e acentos, enquanto a importação de planilha normaliza os nomes.
   - Falta definir as regras (recusar? índice parcial `WHERE excluidoEm IS NULL`? comparar normalizado?) e **o texto de erro**, que não existe no protótipo; qualquer mensagem será um texto novo. O README não fala do assunto.
   - Duplicados também confundem "Reprovações por tipo" (regra 14).
4. **Excluir tipo.** O protótipo não pede confirmação e não bloqueia por uso, ao contrário de "Excluir prestador", que tem as duas coisas (README regra 4).
   - O README não diz nada sobre excluir tipo e não lista `DELETE /tipos`.
   - O protótipo apaga de verdade; o schema prevê soft delete.
   - Também não está definido o que fazer com as especialidades dos prestadores: o protótipo mantém o id órfão, esconde e até o regrava ao salvar o prestador.
5. **Cor de um tipo novo.** Vem de uma paleta fixa por índice (L1014), diferente das "Cores dos tipos de demanda" do README. Ela colide com cores existentes (o 9º tipo fica igual a Vazamento) e não pode ser editada. Falta confirmar se é para replicar exatamente essa regra.
6. **"1 itens" e "0 itens".** É o texto literal do protótipo, e o README fala em "N itens". Manter pelo pixel perfect ou corrigir o plural?
7. **Seleção.**
   - Depois de excluir, vai para o 1º da lista, não para o vizinho.
   - A seleção inicial é fixa em t1 no protótipo; no app real, seria o 1º da lista.
   - A seleção não sobrevive a um reload. Falta decidir se o app guarda a seleção (por exemplo, na query).
8. **Etapas vazias.** A edição inline aceita texto vazio (e só espaços), e a etapa vazia seria copiada para os novos acionamentos. A API deve recusar ou remover?
9. **"Subir" na 1ª etapa.** No protótipo não é `disabled`: fica com opacidade .3 e o clique não faz nada. Um `disabled` do Vuetify mudaria o cursor e os eventos de ponteiro. **Não existe "Descer"**; o README também só cita "Subir".
10. **Hover e botão primário.** Só "Remover" tem hover. A lista, "Adicionar", "Adicionar etapa" e "Excluir tipo" não têm. Já o README define para o botão primário hover `#005AA3`, raio 16 e altura de 44 a 48px, e "Adicionar etapa" tem raio 12 e 44px (L304). Vale o protótipo.
11. **Carregamento, erro e "sem tipos"** não existem no protótipo; é preciso definir o que mostrar, por exemplo num banco novo sem tipos. No protótipo, esse estado derrubaria tudo.
12. **Rascunhos.** O campo "Nova etapa" não é limpo ao criar ou excluir um tipo, e o campo "Novo tipo" não é limpo ao trocar de tipo. Com só espaços, nenhum dos dois campos é limpo. Parece acidental; falta decidir se é para replicar.
13. **Limites.** Não há limite de tamanho no nome nem nas etapas, nem proteção contra edição simultânea (a última gravação vence). Um nome longo sem espaços estoura o botão da lista.
