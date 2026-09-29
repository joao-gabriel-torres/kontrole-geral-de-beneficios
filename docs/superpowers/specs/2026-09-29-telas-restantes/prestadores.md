<!-- Levantamento verificado do protótipo (extração + verificação adversarial), 29/09/2026. Referência de detalhe para a implementação; as decisões finais estão em ../2026-09-29-telas-restantes-design.md, que prevalece. -->

# Prestadores (cadastro e planilha): especificação extraída do protótipo

Fontes: `docs/design/Acionamentos.dc.html` (abreviado **H**, com número de linha), `docs/design/acionamentos-data.js` (**D**) e `docs/design/README.md` (seções "6. Prestadores", "Planilha de credenciados" e regra de negócio 4).

Além de ler o código, abri o protótipo num Chromium headless, com o Playwright de `tools/visual` e interceptação de requisições, sem servidor. Medi a tela e testei:

- formulário (estados de erro), exclusão e busca;
- importação com CSVs de teste (com e sem BOM, separados por `;`, cabeçalhos não reconhecidos, duplicados, CPF numérico);
- exportação e modelo, abrindo os `.xlsx` baixados.

As contagens do seed foram conferidas rodando `seed()` no Node. Nenhum arquivo do repositório foi alterado; os rascunhos ficaram só no scratchpad.

---

## Como chegar no protótipo

- **Lista, web:** na barra do topo, "Gestor · Web", depois o item "Prestadores" da sidebar. O harness já faz isso com `navegarPrototipo: 'Prestadores'`. A rota do app é `/prestadores`: hoje é `PaginaPrestadores.vue`, com `EmConstrucao`.
- **Lista, mobile:** "Gestor · Mobile", depois a aba "Prestadores" da barra inferior.
- **Filtros:** botões com nome acessível "Todos 6", "Ativos 5" e "Inativos 1" (seed do dia). O Chromium insere o espaço porque o `<span>` da contagem é item flex.
- **Novo prestador:** botão "Novo prestador". Abre o modal vazio.
- **Editar:** clicar no nome da linha, com `papel: 'text'` e texto exato, por exemplo "Carlos Mendes". Clicar em qualquer ponto da linha, fora do switch e da lixeira, também abre o modal.
- **Confirmação de exclusão:** o botão da lixeira tem `title="Excluir"`, então o nome acessível é "Excluir" (há 6).
  - O primeiro da lista é Ana Ribeiro, que tem 2 em aberto: caso **bloqueado**.
  - Com "Inativos 1" e depois "Excluir", a lixeira é a de Roberto Alves, com 0 em aberto: caso **livre**.
- **Switch Ativo/Inativo:** é um botão com nome acessível "Ativo" ou "Inativo" (5 e 1). O `title` é "Ativar ou desativar".
- **Conferir importação:** "Subir planilha" é um `<label>` com um `<input type="file" accept=".xlsx,.xls,.csv">` escondido por `display:none` (H217). Para abrir o modal é preciso usar `setInputFiles`; o harness atual só clica.
- **Baixar modelo e Exportar:** só geram download (Exportar também mostra toast); não mudam a tela.

## Estrutura e layout

Contêiner da tela (H210): `flex column; gap 16px; max-width 1280px; margin 0 auto`. Fica dentro da área de conteúdo, que tem padding `28px 32px 40px` na web e `16px 16px 24px` no mobile.

Todo texto herda `line-height: normal`, exceto onde está indicado. CSS global do protótipo (H15):
- `input, textarea, select, button { font-family: inherit; color: #262A3B }`;
- `button { cursor: pointer }`;
- `* { box-sizing: border-box }`.

### 1. Cabeçalho (H211–219)
`flex; flex-wrap: wrap; align-items: center; gap: 10px`. O `CabecalhoPagina.vue` atual usa gap 12, então precisa de ajuste. Ele também usa `<h1>` com `margin: 0`, o que está ok.

- **Bloco de título** (`flex: 1; min-width: 200px`):
  - "Prestadores" é uma `div` 24/36, 700, `#2C3143`. Não é `h1`.
  - Subtítulo: 14px `#50555C`, altura de linha normal (18px medidos).
- **Exportar planilha** (`<button>`): altura 44, padding `0 16px`, raio 16, fundo `#fff`, texto `#262A3B` 14/600, `gap 8`, ícone `download.svg` de 18px, `nowrap`, hover `#EEF4FA`.
- **Subir planilha** (`<label>`, não `<button>`): mesmo estilo, `cursor: pointer` e ícone `upload.svg`.
- **Novo prestador**: altura 44, padding `0 18px`, raio 16, `#0069BD`, texto branco 14/600, hover `#005AA3`, ícone `plus.svg` de 18px em branco (`filter: brightness(0) invert(1)`).
- **Medidas na web** (origem na área útil): cabeçalho em x=264 y=28, 1144×54. Bloco de título com 627,2 de largura. Botões em y=33, com 171, 147,8 e 168px de largura (x = 901,2, 1082,2 e 1240).

### 2. Busca, filtros e link do modelo (H220–231)
`flex; flex-wrap: wrap; gap: 10px; align-items: center`.

- **Caixa de busca**:
  - `flex: 1 1 260px`, altura **44** (a busca de Acionamentos tem 48), padding `0 16px`, fundo branco, raio 16, `gap 10`.
  - Ícone `search.svg` 18×18 com opacidade .55.
  - `input` 14px sem borda nem outline, fundo transparente. O texto digitado é `#262A3B` (regra global). O placeholder usa a cor padrão do navegador, `#757575` no Chromium, a mesma da busca de Acionamentos.
- **Chips de filtro**:
  - O wrapper é `display: flex; gap: 8px`, **sem wrap**.
  - Cada chip: altura **36** (em Acionamentos é 34), padding `0 14px`, raio 999, 13/600, `gap 6`, `nowrap`.
  - A contagem fica num `<span>` com opacidade .6.
  - Chip ativo: fundo `#262A3B`, texto `#fff`. Inativo: fundo `#fff`, texto `#363853`. Não têm hover.
- **"Baixar modelo da planilha"**:
  - `<button>` sem borda e sem fundo, 13/600 `#0069BD`, `gap 6`, ícone `sheet.svg` de 16px, `nowrap`.
  - **Não tem padding explícito**, então vale o padrão do navegador `1px 6px` (medido). A caixa medida é 193×18.
  - Não tem hover.
- **Medidas na web**: linha em y=98 com 44 de altura. Busca com 665,4px. Chips com 80,2, 81,2 e 88,2px, em y=102 (x = 939,4, 1027,5 e 1116,7). O link fica encostado à direita, em x=1215 y=111.

### 3. Cartão da lista (H232–261)
Fundo `#fff`, raio 16, `overflow: hidden`.

**Linha** (H235): `flex; flex-wrap: wrap; align-items: center; gap: 10px 16px; padding: 14px 20px; border-bottom: 1px solid #E5E5E5` (inclusive na última), `cursor: pointer`, hover `#F9F9F9`. Na web cada linha tem 69px, então as 6 linhas somam 414px (y de 158 a 572).

| Col. | Flex | Conteúdo | Opacidade .6 se inativo |
|---|---|---|---|
| 1 (H236–242) | `2.4 1 220px`, `min-width 0`, `gap 12` | Avatar 40px redondo (`flex: none`), fundo `cor` (ou `#A6A6A6` se inativo), iniciais brancas 13/700. Nome 14/600 `#2C3143`. Linha de baixo 12px `#8F8D8D` com `"{documento} · {região}"` (região vazia vira "—"). Sem ellipsis: textos longos quebram. | sim |
| 2 (H243–246) | `1.6 1 170px`, `min-width 0` | Telefone 13px `#363853`. E-mail 12px `#8F8D8D`, `nowrap` com ellipsis. E-mail vazio vira uma `div` vazia de altura 0. | sim |
| 3 (H247–250) | `2 1 200px`, `min-width 0`, wrap, `gap 6` | Até 2 chips (12/600, padding `3px 10px`, raio 999, `#EFF1F3`/`#363853`, `nowrap`). Depois, um "+n" com 12/600, padding `3px 8px`, raio 999, fundo `#EFF1F3`, cor `#8F8D8D`, **sem** `nowrap`. Sem especialidades, a coluna fica vazia. | sim |
| 4 (H251) | `1.2 1 140px` | 12px `#50555C`: "X em aberto · Y no total" | **não** |
| 5 (H252–258) | `none`, `gap 6` | Switch e lixeira | **não** |

- **Medidas na web**: as colunas começam em x = 284, 574,7, 797,1, 1058,7 e 1242, com larguras 274,7, 206,4, 245,6, 167,3 e 146. As alturas são 40, 31, 21, 15 e 36.
- **Switch**:
  - `<button>` sem borda, fundo transparente, padding 4, `gap 8`, `stopPropagation`.
  - Trilho 44×26, raio 13, `#0069BD` quando ativo e `#E5E5E5` quando inativo, `transition: background .2s`.
  - Botão do switch 22×22, `top 2; left 2`, raio 11, branco, sombra `0 3px 1px rgba(0,0,0,.06), 0 3px 8px rgba(0,0,0,.15)`, `translateX(18px)` quando ativo, `transition: transform .2s`.
  - Rótulo 12/600, largura 44, alinhado à esquerda: "Ativo" em `#004E8F` ou "Inativo" em `#8F8D8D`.
- **Lixeira**: 36×36, raio 10, fundo transparente, hover `#FFD7D4`, `trash.svg` de 18px, `stopPropagation`. No hover, a linha também fica `#F9F9F9`.
- **Estado vazio** (H233): dentro do cartão, padding 32, centralizado, 14px `#8F8D8D`.

### Mobile (375 de largura, 343 de conteúdo)
Não há regra específica para o mobile: o template não usa `compact`, e tudo vem do `flex-wrap`. Medidas na área útil do telefone, abaixo da barra de status falsa de 44px:

- **Cabeçalho** (y de 16 a 178):
  - O bloco de título ocupa a linha inteira (343px).
  - A segunda linha tem "Exportar planilha" e "Subir planilha" (x=16 e x=197, y=80).
  - A terceira tem "Novo prestador" sozinho (y=134).
- **Busca** em largura total (y=194). Chips na linha seguinte (y=248, x = 16, 104,2 e 193,4). "Baixar modelo da planilha" sozinho em y=294.
- **Cartão** a partir de y=328. Cada linha vira um bloco de 187px (14 + 40 + 10 + 31 + 10 + 21 + 10 + 36 + 14 + 1 de borda):
  - identidade (40);
  - telefone e e-mail (31);
  - chips (21);
  - "X em aberto · Y no total" (141px de largura) na mesma linha do switch e da lixeira (146px, x=193).
- Com o seed, o conteúdo tem 1474px para 692 visíveis, então rola. A 2ª linha (515–702) fica cortada pela barra de abas em y=692.

### Modais e toast (todos dentro da coluna de conteúdo)
Os sobrepostos são `position: absolute; inset: 0` na coluna `flex:1; position: relative` (H57). O fundo é `rgba(28,18,67,.8)` com `z-index 20`.

- **Na web**, o sobreposto **não cobre a sidebar**: ela continua clara e clicável. O sobreposto vai de x=232 a 1440 e tem 844 de altura.
- **No mobile**, ele cobre o telefone inteiro, de 375×812: a barra de status falsa, o conteúdo e as abas.
  - **Consequência para o `pnpm visual`:** a origem do harness no modo gm fica 44px abaixo do topo do telefone. Então o sobreposto do protótipo começa em y=-44 e vai até 768.
  - No app (viewport 375×768, sem barra de status), `inset: 0` deixa o sobreposto em 0..768. O painel do Novo cairia 44px abaixo, e o do Excluir, que é centralizado, 22px abaixo.
  - Para bater, o sobreposto do modo compacto precisa se estender 44px para cima, por exemplo com `top: -44px`, recortado pelo `overflow: hidden` do layout.
- O `ModalNovoAcionamento` existente já segue esse padrão: fica em `.coluna` do `LayoutGestor.vue` e foca o painel (`tabindex=-1`, sem outline), não um input. Ainda não existe caso visual mobile de modal.
- **Não use autofocus no primeiro campo.** O protótipo não foca nada no modal: o foco fica no botão que abriu o modal, atrás do sobreposto. A borda de foco `#262A3B` quebraria o `pnpm visual`.

**Novo/Editar** (H436–477):
- Sobreposto: `align-items: flex-start; overflow: auto; padding: 24px 12px`.
- Painel: `width 100%; max-width 620`, raio 24, padding 24, `flex column; gap 16`.
- Cabeçalho (`gap 12`):
  - título 18/700 `#2C3143` com `flex 1`;
  - botão fechar 36×36, raio 12, `#EFF1F3`, `cancel.svg` de 18px, sem padding explícito.
- Label: 13/600 `#363853`, `flex column; gap 6`, com o input dentro.
- Input:
  - altura 48, borda `1px #E5E5E5`, raio 16, padding `0 16px`, 14/500, texto `#262A3B` (global), outline 0, borda de foco `#262A3B`;
  - todos são texto puro, sem `type`, `maxlength`, `inputmode` ou máscara.
- Linhas (`wrap; gap 12`): CPF ou CNPJ `1 1 200px` + Telefone `1 1 200px`; depois E-mail `1.4 1 220px` + Região `1 1 160px`.
- Bloco Especialidades (`gap 8`):
  - Chips `wrap; gap 8`. Cada chip: `<button>` com altura 36, padding `0 12px`, borda 1px, raio 999, 13/600, `gap 6`, bolinha 8×8 (raio 4) na cor do tipo.
  - Selecionado: borda `#0069BD`, fundo `#E6F0FA`, texto `#004E8F`. Normal: borda `#E5E5E5`, fundo `#fff`, texto `#363853`.
  - Ordem: a do catálogo de tipos.
- Erro: 13/500 `#B85200`.
- Ações (`flex-end; gap 12`):
  - Cancelar: 48, padding `0 20px`, raio 16, `#EFF1F3`/`#363853`, 14/600.
  - Salvar: 48, padding `0 24px`; `#0069BD`/`#fff` quando válido, `#CCE1F2`/`#004E8F` quando inválido. Não usa o atributo `disabled`.
- Não há campo de status nem de "credenciado desde".
- Medidas:
  - Web: painel de 620×570 sem erro, ou **620×602** com a linha de erro. Fica 24px abaixo do topo da coluna, centralizado nela (x=526).
  - Mobile: painel de 351px, um campo por linha, 822px de altura, a 24px do topo do telefone (y=-20 no quadro do harness). O sobreposto rola (870 de conteúdo para 812), e os botões ficam parcialmente abaixo da dobra.

**Conferir importação** (H478–514):
- Mesmo sobreposto do formulário. Painel com `max-width 760`, raio 24, padding 24 e `gap 16`.
- Cabeçalho (`gap 12`):
  - `sheet.svg` de 24px;
  - bloco `flex 1; min-width 0` com o título 18/700 `#2C3143` e o nome do arquivo 13px `#8F8D8D`, com `nowrap` e ellipsis;
  - botão fechar.
- Resumo: 14/600 `#262A3B`.
- Lista: `max-height 320; overflow auto`, borda `1px #E5E5E5`, raio 16.
- Linha: `wrap; align center; gap 6px 14px; padding 10px 16px`, borda inferior (inclusive na última).
  - Coluna do nome, `2 1 180px`, `min-width 0`: nome 14/600 `#2C3143` e documento 12px `#8F8D8D`.
  - Coluna das especialidades, `2 1 160px`, `min-width 0`: 12px `#50555C`.
  - Selo: 12/600, padding `3px 10px`, raio 999, `nowrap`.
- Bloco "Desativar quem não está na planilha":
  - `<button>` sem borda, com fundo `#F9F9F9`, raio 16, padding `14px 16px`, `gap 14`, texto à esquerda.
  - O trilho do switch aqui tem `flex: none` e **não** tem transição de fundo; o botão do switch tem `transition: transform .2s`.
  - Textos em coluna com `gap 2`: 14/600 `#2C3143` e 12px `#50555C`.
- Ações: Cancelar (48, `0 20px`) e Importar (48, `0 24px`, sem o atributo `disabled`).
- Medidas na web: 760×600 com 6 linhas; 760×351 com 1 linha e o bloco de ausentes.

**Excluir** (H515–526):
- Sobreposto com `align-items: center` e `padding 24px 12px`, sem `overflow`.
- Painel: `max-width 440`, raio 24, padding 24, `gap 14`.
- Título 18/700 `#2C3143`. Texto 14px, `line-height 20px`, `#363853`.
- Botões (`flex-end; gap 10; wrap`), todos 14/600 e raio 16:
  - Cancelar: 44, `0 18px`, `#EFF1F3`/`#363853`.
  - Desativar: 44, `0 18px`, borda `1px #0069BD`, fundo `#fff`, texto `#0069BD`.
  - Excluir: 44, `0 18px`, `#FF6A5D`, texto branco.
- Medidas:
  - Web: 440×203 no caso bloqueado (3 linhas de texto, y=320,5) e 440×183 no livre (y=330,5). Centralizado na coluna, em y fracionário.
  - Mobile: 351×203 (bloqueado), a y=304,5 do topo do telefone, ou 260,5 no quadro do harness.

**Toast** (H433–435):
- `absolute; left: 50%; translateX(-50%); bottom: 96px`.
- Fundo `#262A3B`, texto branco 14/500, padding `12px 18px`, raio 12, sombra `0 12px 32px rgba(28,18,67,.2)`, `z-index 30` (acima dos modais), `nowrap`.
- Some após 2,6s. Só existe um toast por vez: um novo substitui o anterior e reinicia o tempo (H915).
- `AvisoToast` com a variante gestor já existe. No mobile, as bases coincidem: 96px acima do fim da coluna.

## Textos exatos

**Tela**
- "Prestadores"
- "{A} ativos de {M} credenciados" (seed: "5 ativos de 6 credenciados"). Não há singular: com 1 fica "1 ativos de 1 credenciados".
- "Exportar planilha" · "Subir planilha" · "Novo prestador"
- Placeholder da busca: "Buscar por nome, documento, região ou e-mail"
- Chips: "Todos" · "Ativos" · "Inativos", cada um seguido da contagem num span separado.
- "Baixar modelo da planilha"
- Linha:
  - "{documento} · {região ou —}"
  - "{X} em aberto · {Y} no total"
  - "Ativo" / "Inativo"
  - Tooltips nativos: "Ativar ou desativar" (switch) e "Excluir" (lixeira).
- Vazio: "Nenhum prestador encontrado."

**Modal de cadastro**
- Títulos: "Novo prestador" / "Editar prestador"
- Rótulos e placeholders:
  - "Nome completo ou razão social": "Nome"
  - "CPF ou CNPJ": "000.000.000-00"
  - "Telefone": "(11) 90000-0000"
  - "E-mail": "email@exemplo.com"
  - "Região de atendimento": "Zona Oeste"
  - "Especialidades"
- Erros:
  - "Informe o nome"
  - "CPF ou CNPJ inválido"
  - "Documento já cadastrado para {nome}"
  - "Informe o telefone com DDD"
- Botões: "Cancelar" · "Salvar"

**Excluir**
- Título: "Excluir {nome} ?", com espaço antes do "?", igual ao README.
- Bloqueado: "{nome} tem {n} acionamento em aberto. Desative o cadastro para parar de receber novos, ou conclua os atuais antes de excluir." Com n > 1: "acionamentos".
- Livre: "O histórico de acionamentos é mantido nos relatórios. Essa ação não pode ser desfeita."
- Botões: "Cancelar" · "Desativar" · "Excluir" (este só no caso livre).

**Conferir importação**
- "Conferir importação" e, abaixo, o nome do arquivo.
- Resumo: "{N} novos · {U} atualizados", com " · {E} com erro (serão ignorados)" quando E > 0. Não há singular ("1 novos · 0 atualizados").
- Linha:
  - nome da planilha, ou "(sem nome)";
  - documento cru (depois de `String().trim()`), ou "—";
  - especialidades cruas separadas por ", ", inclusive as não reconhecidas, ou "—".
- Selos: "Novo" · "Atualizar" · "Sem nome" · "Documento inválido" · "Duplicado na planilha"
- "Desativar quem não está na planilha", com a descrição (lista todos os nomes, sem truncar):
  - n = 1: "1 credenciado ativo não está na planilha: {nome}"
  - n > 1: "{n} credenciados ativos não estão na planilha: {nome1}, {nome2}, …"
- "Cancelar" · "Importar"

**Toasts**
- "{nome} desativado" / "{nome} reativado": vêm do switch; "{nome} desativado" também sai do "Desativar" do modal.
- "Prestador credenciado" / "Cadastro atualizado"
- "{nome} excluído"
- "Planilha importada: {N} novos, {U} atualizados"
- "Não encontramos linhas na planilha" · "Não foi possível ler o arquivo"
- "Planilha exportada" · "Falha ao exportar" · "Falha ao baixar modelo" (o modelo não tem toast de sucesso)

**Planilha**
- Aba "Credenciados".
- Cabeçalho: `Nome | CPF/CNPJ | Telefone | E-mail | Região | Especialidades | Status | Credenciado desde`
- Arquivos: `credenciados-russo-DD-MM-AAAA.xlsx` (testado: `credenciados-russo-29-09-2026.xlsx`) e `modelo-credenciados-russo.xlsx`

## Regras e cálculos

1. **Base da lista**: só prestadores não excluídos. `const pros = D.pros.filter(p => !p.deleted)` (H1159).
2. **Cabeçalho**: ativos = não excluídos com `status === 'ativo'`; total = todos os não excluídos (H1230).
3. **Contagem dos chips**: sobre todos os não excluídos, **sem** aplicar a busca (H1163). O filtro padrão é `'all'`.
4. **Busca** (H1162 e H1166):
   - `q = prSearch.trim().toLowerCase()`, e a linha entra se `(p.name + p.doc + p.region + p.email).toLowerCase().includes(q)`.
   - Ignora maiúsculas e minúsculas, mas **não ignora acentos**: "Joao" só encontra João Pires por causa do e-mail `joao.pires@`, e "joao p" não encontra nada.
   - Procura no documento **como está gravado, formatado**: "318.402" encontra Carlos, "318402" não encontra ninguém.
   - Os campos são concatenados sem separador: "mendes318" encontra Carlos.
   - Vale enquanto se digita (`onChange` do React; o runtime `support.js` é React) e se combina com o filtro.
5. **Ordenação**: `sort((a, b) => a.name.localeCompare(b.name))` (H1166), com o locale padrão do navegador. No seed fica: Ana Ribeiro, Carlos Mendes, João Pires, Luciana Prado, Marina Costa, Roberto Alves.
6. **"Em aberto"**: acionamentos do prestador em `aberto`, `em_andamento`, `reprovado` **ou `aguardando`** (H1160). É diferente do KPI "Acionamentos em aberto" do Painel (H935), que não conta `aguardando`.
7. **"No total"**: todos os acionamentos do prestador, de qualquer status e sem recorte de período (H1167).
8. **Especialidades da linha**: `p.types.map(tName).filter(Boolean)` (H1167 e H1169).
   - Seguem **a ordem gravada no prestador**, não a do catálogo.
   - Tipos inexistentes (por exemplo, excluídos em Checklists) somem.
   - Ids repetidos aparecem repetidos.
   - Mostra `slice(0,2)` mais "+{n−2}".
9. **Inativo**: avatar `#A6A6A6` e opacidade .6 só nas colunas 1–3 (H1168 e H1170). A cor própria continua gravada e volta quando o prestador é reativado.
10. **Iniciais**: primeira letra da primeira e da última palavra, em maiúsculas (D10). Um nome de uma palavra só dá uma letra. É igual ao `iniciais()` de `@kgb/ui`. São recalculadas quando o nome muda, no Salvar e na importação.
11. **Validação do formulário** (H1179–1180), avaliada nesta ordem; só o primeiro erro aparece:
    1. `!name.trim()` → "Informe o nome".
    2. `digits(doc).length` diferente de 11 e de 14 → "CPF ou CNPJ inválido". Só confere o tamanho.
    3. Outro prestador **não excluído** com os mesmos dígitos → "Documento já cadastrado para {nome dele}". Na edição, o próprio registro é ignorado.
    4. `digits(phone).length < 10` → "Informe o telefone com DDD". Não há máximo.
    - E-mail, região e especialidades não são validados. Zero especialidades é aceito.
12. **Quando o erro aparece**: `pfHasErr = !!err && !!(F.name || F.doc || F.phone)` (H1183).
    - Com o formulário vazio, ou só com e-mail ou região preenchidos, não aparece nada (testado), mas o Salvar já fica claro.
    - No Editar, um cadastro inválido (por exemplo, importado sem telefone) mostra o erro logo ao abrir (testado).
13. **Salvar** (H1185): não existe máscara nem normalização. Grava `name`, `doc`, `phone`, `email` e `region` com `trim()`, como digitados. Por exemplo, "11999998888" aparece assim na lista.
    - **Novo prestador**:
      - `cor = PCOL[d.pros.length % 8]`, contando também os excluídos. A paleta (D2) é `#0069BD #FC7608 #5D627D #F47B50 #004E8F #E0A100 #8FB8DE #A6A6A6`. O primeiro novo sobre o seed, o 7º registro, recebe `#8FB8DE`. O 8º registro recebe `#A6A6A6`, o mesmo cinza dos inativos.
      - `status: 'ativo'`: não há como criar um inativo pelo formulário.
      - `since = iso(new Date())`, a data local de hoje. Essa data não aparece na tela, só na exportação.
    - **Edição**: sobrescreve nome, iniciais, documento, telefone, e-mail, região e especialidades. Mantém status, cor e data de credenciamento. Ids de tipos já excluídos continuam em `F.types` sem aparecer e são gravados de volta.
14. **Switch** (H1171): alterna `status` na hora, **sem confirmação e sem checar acionamentos em aberto**, e mostra um toast.
15. **Excluir** (H1172 e H1189–1192):
    - A quantidade em aberto vem da renderização da linha (closure), que na prática é o valor no momento do clique.
    - Com `open > 0`, o botão Excluir não aparece. Isso vale também para quem já está inativo.
    - "Excluir" faz `deleted = true` e `status = 'inativo'`, que é o soft delete. A linha some e os acionamentos continuam, com o nome do prestador (D92: "Prestador removido" só aparece se o registro deixar de existir).
    - "Desativar" faz `status = 'inativo'` e aparece **sempre**, mesmo se o prestador já estiver inativo.
16. **Leitura da planilha** (`parseSheet`, D104):
    - SheetJS 0.20.3 via CDN, primeira aba, `sheet_to_json({defval: ''})`, com a primeira linha como cabeçalho. Linhas totalmente vazias são puladas pelo SheetJS.
    - Cada cabeçalho passa por `norm` (D98): remove acentos (NFD), passa para minúsculas e **remove tudo o que não for a–z**, inclusive dígitos e "_".
    - Mapeamento: `nome`→nome; `cpfcnpj`/`cpf`/`cnpj`/`documento`→documento; `telefone`/`celular`→telefone; `email`→e-mail; `regiao`→região; `especialidades`/`servicos`→especialidades; `status`/`situacao`→status.
    - **"Credenciado desde" não é lido**, porque vira `credenciadodesde`, que não está no mapa.
    - Também **não** são reconhecidos: "Nome completo", "Região de atendimento", "Especialidade" no singular, "CNPJ/CPF" e "Fone".
    - Se houver colunas que mapeiam para o mesmo campo (por exemplo CPF e CNPJ separadas, ou um cabeçalho repetido, que o SheetJS renomeia para "Nome_1" e o `norm` reduz a "nome"), vale o primeiro valor não vazio: `if (f && !o[f])`. Testado: CPF vazio e CNPJ preenchido usa o CNPJ.
    - Os valores passam por `String(v).trim()`. Um CPF gravado como número perde o zero à esquerda e vira "Documento inválido". Testado: "01234567890" em CSV virou "1234567890".
    - CSV separado por `;` é detectado sozinho (testado). CSV em UTF-8 sem BOM é lido como Latin-1 (ver Dúvidas, item 7).
17. **Normalização das linhas** (H1213–1220):
    - Linhas sem nenhum campo mapeado preenchido são descartadas sem erro. Se **nenhuma** linha sobra (arquivo só com cabeçalho, ou nenhum cabeçalho reconhecido), aparece o toast "Não encontramos linhas na planilha" e o modal não abre (H1223, testado).
    - Especialidades: `split(/[;,/]/)` com trim.
      - A comparação com os nomes do catálogo usa `norm`, então ignora acentos, caixa, espaços e hífens: "limpeza de ar condicionado" casa com "Limpeza de ar-condicionado".
      - Nomes desconhecidos, como "Jardinagem", são **descartados sem aviso**, mas continuam no texto da prévia.
      - Repetidos **não** são deduplicados: "Pintura; pintura" grava `[t5, t5]` (testado).
    - Status: `norm(status).startsWith('inativ')` vira inativo; qualquer outro valor, inclusive vazio, "Desativado" ou "Não", vira ativo.
    - O documento é mantido **cru**, como veio no arquivo.
    - Erros, nesta ordem:
      1. nome vazio → "Sem nome";
      2. dígitos diferentes de 11 e 14 → "Documento inválido";
      3. mesmos dígitos de uma linha **válida anterior** → "Duplicado na planilha" (a primeira ocorrência vence).
    - Linhas válidas: se existe um prestador não excluído com os mesmos dígitos (comparando só dígitos, então formatos diferentes casam), o selo é "Atualizar"; senão, "Novo". Um documento de prestador excluído conta como "Novo" e gera outro registro.
    - Telefone e e-mail **não** são validados na importação.
    - A prévia **não mostra** status, telefone, e-mail nem região. Numa "Atualizar", o nome exibido é o da planilha.
18. **Selos** (H1200): Novo `#E6F0FA`/`#004E8F`; Atualizar `#EFF1F3`/`#363853`; erros `#FFD7D4`/`#B8342A`. A ordem é a do arquivo.
19. **Ausentes** (H1197–1198):
    - São os prestadores não excluídos e `ativo` cujos dígitos não estão entre os documentos das linhas **válidas**. Quem aparece só numa linha com erro conta como ausente.
    - Aparecem na ordem de cadastro, não em ordem alfabética. No seed: Carlos, Ana, João, Marina, Luciana.
    - O bloco só aparece se houver pelo menos um. O switch começa desligado.
20. **Importar** (H1206–1207):
    - Fica desabilitado (cores claras, clique sem efeito, sem atributo `disabled`) se `novos + atualizados = 0`, mesmo com o "desativar" ligado.
    - **Atualizar sobrescreve tudo** com o que veio: nome, iniciais, documento cru, telefone, e-mail, região, especialidades (só as reconhecidas) e status.
      - Campos vazios na planilha **apagam** os dados, e status vazio **reativa** o prestador (testado: Carlos ficou sem telefone, e o Editar abre com "Informe o telefone com DDD").
      - Cor e data de credenciamento ficam.
    - **Novo**: `cor = PCOL[d.pros.length % 8]`, que avança a cada novo; `since` = hoje; o status vem da planilha, então pode nascer inativo.
    - Depois dos upserts, desativa os ausentes se o switch estiver ligado, sem checar acionamentos em aberto.
    - Toast com N e U.
21. **Exportação** (D101–102 e H1232), conferida no `.xlsx`:
    - Entram todos os não excluídos, ativos e inativos, **na ordem de cadastro**. Filtro e busca não se aplicam.
    - Colunas:
      - Nome.
      - CPF/CNPJ e Telefone como estão gravados.
      - E-mail e Região.
      - Especialidades: nomes separados por "; ", na ordem do prestador, sem os tipos inexistentes.
      - Status "Ativo" ou "Inativo".
      - Credenciado desde: texto "DD/MM/AAAA".
    - Todas as células são do tipo texto (`t: 's'`), e as vazias saem como string vazia.
    - Larguras (`wch`): 26, 20, 16, 30, 14, 44, 10, 16.
    - Nome do arquivo: `credenciados-russo-` + a data local de hoje em DD-MM-AAAA (H1227).
22. **Modelo** (D103): aba "Credenciados", o cabeçalho e uma linha de exemplo: `Nome Sobrenome | 000.000.000-00 | (11) 90000-0000 | email@exemplo.com | Zona Oeste | Vazamento; Pintura | Ativo | (vazio)`. Todas as células são texto e não há larguras de coluna. Subir o modelo sem editar cria "Nome Sobrenome" como Novo, porque "000.000.000-00" tem 11 dígitos.
23. **Efeitos em outras telas**:
    - O seletor do Novo acionamento (H986) lista só ativos não excluídos, como "nome · região".
    - O Novo acionamento começa sempre com `pid = ME` (p1, Carlos) (H970), e a validação não confere o prestador. Se Carlos estiver inativo ou excluído, o acionamento é criado para ele mesmo com o select mostrando outro nome.
    - O ranking do Painel (H957) exclui os excluídos e só mostra inativos que tiveram acionamentos no período.
    - O "Prestador · App" do protótipo não bloqueia um ME inativo ou excluído. A API real bloqueia, com `prestadorBloqueado`.
    - Excluir um tipo em Checklists (H1020) não limpa os ids nos prestadores.

## Interações

| Ação | Efeito |
|---|---|
| Digitar na busca | Filtra a cada tecla. Estado em memória: sobrevive a trocar de tela ou de modo (web/mobile) e ao "Restaurar exemplo", mas não a recarregar a página. |
| Chip Todos, Ativos ou Inativos | Troca o filtro. O padrão é "Todos". |
| Clique na linha | Abre "Editar prestador" com uma cópia (JSON) dos dados. |
| Switch | Ativa ou desativa na hora e mostra o toast. Não abre a edição (`stopPropagation`). |
| Lixeira | Abre a confirmação. Não abre a edição. |
| Novo prestador | Abre o modal vazio. Os dados são descartados ao fechar. |
| Chip de especialidade no modal | Liga ou desliga. A ordem de gravação é a ordem dos cliques. |
| Salvar inválido | Não faz nada. |
| Salvar válido | Grava, fecha e mostra o toast. |
| Cancelar ou X | Fecha sem gravar. |
| Clique no sobreposto | **Não faz nada** em nenhum dos 3 modais. |
| Teclado | Não há handlers. Enter e Esc dentro dos inputs não fazem nada (não há `<form>`). O foco fica no botão que abriu o modal, atrás do sobreposto, então Enter ou Espaço logo após abrir acionam esse botão de novo, de forma nativa. O Tab não fica preso no modal. |
| Subir planilha | Abre o seletor. No change, zera `input.value` na hora, antes de ler, para aceitar o mesmo arquivo de novo. Arquivo sem linhas aproveitáveis ou com falha de leitura mostra um toast e não abre o modal. |
| Switch "Desativar quem não está na planilha" | Alterna. |
| Importar | Aplica, fecha e mostra o toast. Filtro e busca continuam. |
| Exportar planilha | Baixa o `.xlsx` e mostra "Planilha exportada". |
| Baixar modelo da planilha | Baixa o arquivo sem toast. |
| Hover | Linha `#F9F9F9`; Exportar e Subir `#EEF4FA`; Novo `#005AA3`; lixeira `#FFD7D4`. Chips, link do modelo e botões dos modais não têm hover. |

Na web, um modal aberto não bloqueia a sidebar. Se o usuário navegar, o modal continua aberto por cima da outra tela, porque nem `go()` nem `reset()` (H922) limpam `prForm`, `prConfirm` ou `prImport`. Ao trocar para "Prestador · App" o modal some, porque fica dentro de `isG`, e volta ao retornar.

Não há diferença de lógica entre web e mobile: só o layout muda, e os modais do mobile cobrem também a barra de status e as abas.

## Estados

- **Seed do dia** (vale para o protótipo e para o `pnpm db:seed`, que grava documento e telefone só com dígitos). Ordem de cadastro: Carlos, Ana, João, Marina, Roberto, Luciana.

| Nome | Iniciais / cor | Documento · região | Telefone / e-mail | Chips | Carga | Status | Credenciado desde |
|---|---|---|---|---|---|---|---|
| Ana Ribeiro | AR `#FC7608` | 27.415.903/0001-44 · Zona Sul | (11) 97120-5588 / ana@ribeiroreparos.com.br | Pintura, Reparo em gesso, +1 | 2 em aberto · 17 no total | Ativo | 03/06/2024 |
| Carlos Mendes | CM `#0069BD` | 318.402.117-50 · Zona Oeste | (11) 98734-2210 / carlos.mendes@email.com | Vazamento, Revisão elétrica, +2 | 8 em aberto · 20 no total | Ativo | 12/03/2024 |
| João Pires | JP `#5D627D` | 402.118.965-31 · Centro | (11) 99402-1876 / joao.pires@email.com | Vazamento, Revisão elétrica, +2 | 2 em aberto · 18 no total | Ativo | 20/09/2024 |
| Luciana Prado | LP `#E0A100` | 41.206.557/0001-90 · Zona Leste | (11) 95512-7780 / luciana.prado@email.com | Reparo em gesso, Pintura | 0 em aberto · 0 no total | Ativo | 27/08/2026 (fixa) |
| Marina Costa | MC `#F47B50` | 35.882.610/0001-07 · Zona Oeste | (11) 98851-3302 / contato@marinacosta.com.br | Revisão elétrica, Ponto de luz, +1 | 1 em aberto · 15 no total | Ativo | 15/01/2025 |
| Roberto Alves | RA, exibido `#A6A6A6` (cor própria `#004E8F`) | 219.774.380-12 · Zona Norte | (11) 96677-0914 / roberto.alves@email.com | Chaveiro, Pintura | 0 em aberto · 0 no total | Inativo | 08/05/2024 |

- **Vazio**, seja por não haver cadastro, por filtro ou por busca: "Nenhum prestador encontrado." dentro do cartão. Com zero prestadores, o cabeçalho mostra "0 ativos de 0 credenciados" e os chips mostram 0.
- **Casos-limite da linha**:
  - Sem e-mail: só o telefone, centralizado na vertical.
  - Sem região: "—".
  - Sem especialidades: coluna vazia.
  - Especialidade repetida (vinda da importação): chip duplicado.
  - Nome longo: quebra de linha.
  - E-mail longo: ellipsis.
- **Formulário**:
  - Vazio: sem erro, Salvar claro.
  - Parcial com erro: mensagem laranja (o painel passa a 602) e Salvar claro.
  - Válido: Salvar azul.
- **Excluir**:
  - Bloqueado no singular ("1 acionamento", Marina) ou no plural (Carlos, Ana, João).
  - Livre (Luciana, Roberto).
- **Importação**:
  - Com e sem erros no resumo.
  - Com e sem o bloco de ausentes.
  - Switch ligado ou desligado.
  - Importar desabilitado.
  - A lista rola acima de 320px: 6 linhas de 2 níveis somam cerca de 324px.
  - Toasts de "nenhuma linha" e de falha de leitura.
- **Carregando e erro de rede**: não existem no protótipo, que é síncrono. Sugiro manter os dados anteriores enquanto recarrega, como já faz a lista de Acionamentos com `keepPreviousData`. Erros de API vão para as mesmas mensagens: 409 de duplicado vira "Documento já cadastrado para X", e exclusão bloqueada por corrida vira a mensagem de bloqueio.

## Dados que a API precisa fornecer

**O que já existe**:
- `GET /api/prestadores` (gestor):
  - devolve `PrestadorOpcao {id, nome, regiao, cor}` só dos ativos não excluídos, ordenados por `criadoEm, id`;
  - o parâmetro `?status=ativo` é opcional e **ignorado**: `listarPrestadoresAtivos` sempre filtra;
  - alimenta o seletor do Novo acionamento e não serve para esta tela.
- `GET /api/tipos`: devolve `{id, nome, cor, checklist}` e serve para os chips do modal.
- Modelo `Prestador`:
  - `documento @unique` e `telefone`, **só com dígitos** (é assim que o seed grava);
  - `email?`, `regiao?`, `status`, `credenciadoDesde @db.Date`, `excluidoEm?`, `cor`, `criadoEm`;
  - especialidades num N:N **implícito, sem ordem** (`@relation("Especialidades")`).
- O seed cria um `User` `u-{id}` para cada prestador, e só Carlos (`carlos@russo.dev`) tem senha.
- `prestadorBloqueado` derruba a sessão de prestador inativo ou excluído.

**O que falta**. O README ("Estado e dados") sugere `GET/POST/PATCH/DELETE /prestadores`, `POST /prestadores/importar` (prévia + confirmação), `GET /prestadores/exportar.xlsx` e `GET /prestadores/modelo.xlsx`. O `GET` entra em choque com a rota atual.

- **`GET` da lista de gestão**: um novo caminho, ou outro schema, para não quebrar o `PrestadorOpcao`. Cada item traz:
  - `id, nome, documento, telefone, email, regiao, status, cor, credenciadoDesde`;
  - `especialidades` como uma lista **ordenada** de `{id, nome}`;
  - `emAberto` (contagem em `aberto`, `em_andamento`, `reprovado` e `aguardando`) e `total` (todos os acionamentos).
  - Excluídos não entram.
  - Cabeçalho e chips podem ser calculados no front.
  - A ordenação por nome deve seguir o `localeCompare` do protótipo: `Intl.Collator('pt-BR')` no front, ou collation ICU no banco.
- **`POST` criar e `PATCH` editar**, com `{nome, documento, telefone, email?, regiao?, especialidades: id[]}`:
  - Mesmas validações e mesma ordem, com um código de erro por regra (422). Duplicado responde 409 com o nome do dono do documento.
  - Ao criar, o servidor define:
    - `cor = PCOL[total de prestadores, contando excluídos, % 8]`;
    - `status = ativo`;
    - `credenciadoDesde` = hoje em `America/Sao_Paulo`;
    - talvez um `User` para o login (ver Dúvidas, item 13).
  - A edição não mexe em status, cor nem data.
  - Normalizar documento e telefone para dígitos.
  - O front formata para exibir, inclusive nos inputs do Editar: `000.000.000-00` / `00.000.000/0000-00` e `(11) 98734-2210` / `(11) 3456-7890`.
  - Deduplicar especialidades.
- **`PATCH` de status**, usado pelo switch e pelo "Desativar".
- **`DELETE`**: responde 409 se `emAberto > 0`; senão grava `excluidoEm = agora` e `status = inativo`.
- **Importação em duas etapas**:
  - A prévia recebe o arquivo (multipart) e devolve:
    - as linhas `{nome, documento cru, especialidadesTexto, acao: novo | atualizar | erro, rotulo}`;
    - o resumo;
    - os `ausentes` `[{nome}]`, na ordem de cadastro;
    - um sinal de "nenhuma linha" para o toast.
  - A confirmação recebe o arquivo, ou um token da prévia, com `desativarAusentes`, e recalcula tudo numa transação. Devolve `{novos, atualizados}` e grava o log de auditoria.
  - Encoding do CSV: BOM, UTF-8; UTF-8 válido, UTF-8; senão, Windows-1252. Detectar o separador (`,` ou `;`). Ver Dúvidas, item 7.
- **`GET` exportar e modelo** (`.xlsx`): exatamente como nas regras 21 e 22, com documento e telefone formatados.

## Casos para o pnpm visual

Hoje o `gestor-web-prestadores` compara só a sidebar. Quando a tela ficar pronta, ele deve passar a comparar `telaInteira('gw')`. Todos os casos abaixo usam `app: 'gestor'`, `rota: '/prestadores'` e `navegarPrototipo: 'Prestadores'`.

| Nome | Modo | Passos | Região |
|---|---|---|---|
| gestor-web-prestadores | gw | — | tela inteira |
| gestor-web-prestadores-ativos | gw | `Ativos 5` | tela inteira |
| gestor-web-prestadores-inativos | gw | `Inativos 1` | tela inteira (1 linha, com opacidade e avatar cinza) |
| gestor-web-prestadores-novo | gw | `Novo prestador` | tela inteira |
| gestor-web-prestadores-novo-especialidades | gw | `Novo prestador`, `Vazamento`, `Pintura` | tela inteira |
| gestor-web-prestadores-editar | gw | `Carlos Mendes` (papel `text`) | tela inteira: inputs formatados e 4 chips marcados (Vazamento, Revisão elétrica, Ponto de luz, Troca de disjuntor) |
| gestor-web-prestadores-excluir-bloqueado | gw | `Excluir` (1º = Ana: "Ana Ribeiro tem 2 acionamentos em aberto…") | tela inteira |
| gestor-web-prestadores-excluir-livre | gw | `Inativos 1`, `Excluir` (Roberto) | tela inteira |
| gestor-mobile-prestadores | gm | — | tela inteira (cabeçalho em 3 linhas; 1 cartão com a 1ª linha inteira e a 2ª cortada pelas abas em y=692) |
| gestor-mobile-prestadores-inativos | gm | `Inativos 1` | tela inteira |
| gestor-mobile-prestadores-novo | gm | `Novo prestador` | tela inteira (inclui as abas cobertas; painel em y=-20) |
| gestor-mobile-prestadores-excluir-bloqueado | gm | `Excluir` | tela inteira (painel em y=260,5) |

Quatro cuidados para esses casos:

- **Evitar estados que mudam dados.** Salvar, switch, excluir e importar alteram o banco, e o harness não refaz o seed entre os casos (o protótipo, sim, limpa o `localStorage`). Os toasts também são transitórios. Desativar Carlos, por exemplo, ainda derrubaria o login `carlos@russo.dev`.
- **O app precisa expor os mesmos nomes acessíveis**: "Excluir" na lixeira, "Todos 6" e similares nos chips, e o nome como texto isolado na linha.
- **Três estados precisam de extensão no harness.** O erro do formulário e a busca sem resultado precisam de um passo `preencher`. A tela de importação precisa de um passo `anexar` com `setInputFiles` e de uma fixture `.xlsx` ou CSV com BOM (ver Dúvidas, item 7).
- **Modais no mobile:** o sobreposto do protótipo começa 44px acima da origem do harness, porque cobre a barra de status falsa. No modo compacto, o sobreposto do app precisa subir 44px (por exemplo, `top: -44px`), senão o Novo fica 44px abaixo e o Excluir 22px abaixo.

## Dúvidas e ambiguidades

1. **Dígitos verificadores contra o seed (crítico).** O README pede validação de DV no sistema real, mas **todos os 6 documentos do seed têm DV inválido** (conferido por cálculo). Com essa validação:
   - O Editar de qualquer prestador do seed mostraria "CPF ou CNPJ inválido" logo ao abrir, com o Salvar desabilitado, o que quebra o caso visual e impede a edição.
   - A exportação reimportada marcaria todas as linhas como "Documento inválido".
   - O "000.000.000-00" do modelo passa na conta pura dos DVs (os dois dão 0) e só é recusado se o validador rejeitar dígitos repetidos. No protótipo, subir o modelo sem editar cria "Nome Sobrenome".
   - Decidir entre: DV só em documento novo ou alterado, trocar os documentos do seed, ou manter só o tamanho.
2. **Ordem das especialidades.** O protótipo mostra na ordem gravada (Luciana: "Reparo em gesso, Pintura"; Roberto: "Chaveiro, Pintura"), mas o N:N implícito do Prisma não guarda ordem. Pela ordem do catálogo, essas duas linhas e a exportação ficariam diferentes. Seria preciso uma tabela de junção com `ordem`, que é uma mudança de schema. Repetidos (possíveis na importação do protótipo) não cabem num N:N, então deduplicar.
3. **Soft delete e documento `@unique`.** O protótipo deixa recadastrar, ou importar como "Novo", o documento de um prestador excluído, criando outro registro. No banco, isso viola o `@unique`. Opções: reativar o registro excluído, usar um índice único parcial (`WHERE excluidoEm IS NULL`) ou bloquear.
4. **Inativo não consegue concluir os atendimentos.** O texto do bloqueio diz "Desative o cadastro para parar de receber novos, ou conclua os atuais", mas a API atual (`prestadorBloqueado`) derruba a sessão de quem está inativo, e ele não consegue concluir os acionamentos em aberto. Além disso, o switch e o "Desativar quem não está na planilha" desativam sem aviso quem tem acionamentos em aberto.
5. **"Credenciado desde" na importação.** O README lista a coluna no formato, mas a importação a ignora: o novo prestador recebe hoje e o atualizado mantém a data. Decidir se ela deve ser lida.
6. **Importação menos rígida que o formulário.**
   - A importação não valida telefone nem e-mail, e um prestador importado sem telefone abre no Editar já com erro.
   - Na atualização, campos vazios apagam dados e status vazio reativa o prestador, e a prévia não mostra nada disso.
   - O README só diz "os dados são sobrescritos".
7. **Encoding do CSV.**
   - O SheetJS do protótipo lê CSV sem BOM como Latin-1 (testado).
   - Em UTF-8 sem BOM, "Serviços" e "Situação" deixam de ser reconhecidos e nomes com acento viram texto corrompido ("JoÃ£o"). "Região" só funciona por sorte.
   - Em contrapartida, isso acerta os CSVs que o Excel em pt-BR salva em Windows-1252, em geral separados por `;`, que o SheetJS também detecta.
   - No backend: BOM, UTF-8; UTF-8 válido, UTF-8; senão, Windows-1252.
8. **Formato gravado e formatação.**
   - O protótipo grava e exibe o texto digitado, sem máscara. O banco guarda só dígitos, então é preciso formatar na exibição, nos inputs do Editar e na exportação.
   - Falta definir o que fazer com telefone de mais de 11 dígitos, já que o formulário não tem máximo.
   - Na busca por documento, o protótipo só encontra o formato com pontuação. Decidir se dígitos puros também devem encontrar.
9. **Acentos na busca.** A busca desta tela diferencia acentos, e a de Acionamentos do protótipo também (H963). A spec do fluxo principal decidiu ignorar acentos na API de Acionamentos, então o precedente é ignorar aqui também.
10. **Singular e plural.** "1 ativos de 1 credenciados" e "1 novos · 1 atualizados" são assim no protótipo. Para manter a paridade, deixei literal.
11. **Botão "Desativar" para quem já está inativo.** O modal de exclusão sempre oferece "Desativar", mesmo para um prestador inativo, e o toast diz "desativado".
12. **Cor do 8º registro.** Recebe `#A6A6A6`, o mesmo cinza dos inativos.
13. **Acesso do prestador novo.** Nem o formulário nem a importação criam login (um `User` com `prestadorId`), e o protótipo não define como o prestador vai entrar. O seed do banco cria um `User` para cada prestador (só Carlos com senha), então prestadores novos ficariam diferentes dos do seed.
14. **Exportação e modelo: backend ou front.** O README pede endpoints no backend. Gerar no front a partir da API também é possível. Em qualquer caso, o conteúdo das células precisa ser igual ao das regras 21 e 22.
15. **Diferenças de medida em relação a Acionamentos.** Esta tela usa gap 10 no cabeçalho, e o `CabecalhoPagina.vue` usa 12. A busca tem 44px (Acionamentos tem 48), e os chips têm 36px com `nowrap` e wrapper sem wrap (Acionamentos tem 34, com wrap).
16. **Novo acionamento com prestador inativo.** No protótipo, o formulário começa com `pid = p1` e não valida o prestador. Se Carlos estiver inativo ou excluído, o acionamento vai para ele. No app, o seletor precisa começar num ativo, e a API precisa recusar prestador inativo ou excluído.
17. **Tipo excluído em Checklists.** O protótipo deixa ids órfãos nos prestadores. No banco, o N:N remove o vínculo; confirmar que a exclusão de tipo seja tratada assim.