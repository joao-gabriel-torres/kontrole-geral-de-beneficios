# Handoff: Russo Assistência — Sistema de Acionamentos

## Visão geral
O sistema gerencia os serviços gerais de manutenção da Russo Assistência Residencial: vazamento, revisão elétrica, ponto de luz, troca de disjuntor, pintura, reparo em gesso, limpeza de ar-condicionado e chaveiro.

São duas interfaces:
1. **Gestor de demandas.** É uma aplicação web responsiva, que funciona no desktop e no celular. O gestor:
   - abre acionamentos e os atribui a prestadores;
   - configura o checklist de cada tipo de demanda;
   - confere e aprova ou reprova as conclusões;
   - gerencia os prestadores credenciados, inclusive importando e exportando planilhas;
   - acompanha os KPIs.
2. **Prestador de serviço.** É um app mobile. O prestador:
   - vê a agenda e as demandas;
   - executa o checklist, com fotos e comentários em cada etapa;
   - envia o serviço para aprovação ou o marca como inviável.

Fluxo principal: **gestor cria acionamento → prestador executa → gestor aprova ou reprova**.

## Sobre os arquivos de design
Os arquivos deste pacote são **referências de design feitas em HTML**. São protótipos que mostram a aparência e o comportamento esperados. **Não são código de produção para copiar.** A tarefa é **recriar estas telas numa stack real**. Se ainda não existe um codebase, escolha a stack mais adequada. Sugestão:

- **Gestor (web):** Next.js (App Router) + TypeScript + Tailwind, ou React + Vite.
- **Prestador (mobile):** React Native (Expo), para ter acesso à câmera, a notificações push e a armazenamento offline. Uma alternativa é uma PWA mobile-first usando a mesma base do gestor.
- **Backend:** API REST ou tRPC + PostgreSQL (Prisma). Fotos em storage de objetos (S3, R2 ou Supabase Storage) com URLs assinadas.
- **Autenticação:** dois papéis, `gestor` e `prestador`. O prestador só enxerga os acionamentos atribuídos a ele.

O protótipo guarda tudo no `localStorage` e usa dados de exemplo gerados em `acionamentos-data.js`. No sistema real, isso vira banco de dados e API.

Para abrir o protótipo, sirva a pasta com um servidor estático (por exemplo `npx serve .`) e abra `Acionamentos.dc.html`. A barra do topo alterna entre **Gestor · Web**, **Gestor · Mobile** e **Prestador · App**. Nessa barra, "Restaurar exemplo" recria os dados de exemplo.

## Fidelidade
**Alta fidelidade (hi-fi).** Cores, tipografia, espaçamentos, raios, textos e fluxos são os finais. Recrie a interface fielmente usando os componentes da stack escolhida. Os dados de exemplo (clientes, endereços, nomes) são fictícios.

---

## Modelo de dados

```ts
type Role = 'gestor' | 'prestador';

interface TipoDemanda {
  id: string;
  nome: string;             // "Vazamento"
  cor: string;              // hex, usado em chips e bolinhas
  checklist: string[];      // etapas, em ordem
}

interface Prestador {
  id: string;
  nome: string;             // nome completo ou razão social
  documento: string;        // CPF (11 dígitos) ou CNPJ (14 dígitos), único
  telefone: string;         // com DDD
  email?: string;
  regiao?: string;          // "Zona Oeste"
  especialidades: string[]; // ids de TipoDemanda
  status: 'ativo' | 'inativo';
  credenciadoDesde: string; // ISO date
  excluidoEm?: string;      // soft delete: o histórico é mantido
  cor: string;              // cor do avatar (iniciais)
}

type StatusAcionamento =
  | 'aberto'        // "Agendado": criado e atribuído, ainda não iniciado
  | 'em_andamento'  // "Em execução"
  | 'aguardando'    // "Aguardando aprovação" ou "Inviabilidade em análise"
  | 'reprovado'     // devolvido ao prestador para correção
  | 'aprovado';     // final ("Aprovado", ou "Inviável" se inviavel = true)

interface Acionamento {
  id: string;
  codigo: string;           // "AC-1052", sequencial
  titulo: string;
  cliente: string;
  endereco: string;         // "Rua Harmonia, 410 · Vila Madalena"
  data: string;             // YYYY-MM-DD
  inicio: string;           // HH:MM
  fim: string;              // HH:MM (maior que inicio)
  prestadorId: string;
  status: StatusAcionamento;
  inviavel: boolean;
  criadoEm: string;
  iniciadoEm?: string;
  envios: string[];         // timestamps de cada envio para aprovação
  revisoes: Revisao[];
  demandas: Demanda[];      // 1..n (um acionamento pode ter vários tipos)
  fotosConclusao: Foto[];
  comentarioConclusao?: string;
  inviabilidade?: { comentario: string; fotos: Foto[] };
}

interface Demanda {
  id: string;
  tipoId: string;
  tipoNome: string;         // SNAPSHOT do nome no momento da criação
  cor: string;              // snapshot
  etapas: Etapa[];          // SNAPSHOT do checklist do tipo na criação
}

interface Etapa {
  id: string;
  texto: string;
  feita: boolean;
  fotos: Foto[];
  comentario?: string;
}

interface Foto { id: string; url: string; tiradaEm: string; }  // o carimbo HH:MM aparece na miniatura
interface Revisao { decisao: 'aprovado' | 'reprovado'; motivo?: string; em: string; gestorId: string; }
```

### Regras de negócio
1. **O checklist é copiado quando o acionamento é criado.** Ao criar um acionamento com N tipos de demanda, cada tipo gera uma `Demanda` com uma cópia das etapas do checklist daquele tipo. Editar o checklist de um tipo depois **não altera** acionamentos que já existem. A tela de Checklists mostra este aviso: "O checklist de cada tipo é copiado para o acionamento quando ele é criado."
2. **Transições de status:**
   - `aberto → em_andamento`: o prestador toca "Iniciar atendimento". Grava `iniciadoEm`.
   - `em_andamento | reprovado → aguardando`: o prestador toca "Enviar para aprovação". **Exige pelo menos 1 foto em `fotosConclusao`.** O mínimo é configurável (`photoMin`, padrão 1). Existe também a regra opcional `requireAllSteps`, que exige todas as etapas marcadas (padrão desligada). Cada envio adiciona um item em `envios`.
   - `aberto | em_andamento | reprovado → aguardando` com `inviavel = true`: o prestador toca "Marcar como inviável". **Exige motivo (texto) e pelo menos 1 foto.** Se o atendimento não tinha começado, grava `iniciadoEm` também.
   - `aguardando → aprovado`: o gestor aprova (ou "Confirmar inviabilidade", quando é inviável).
   - `aguardando → reprovado`: o gestor reprova. **O motivo é obrigatório.** Se era inviável ("Recusar inviabilidade"), `inviavel` volta a `false` e `inviabilidade` é limpa, e o prestador precisa executar o serviço.
3. As etapas, fotos e comentários só podem ser editados em `em_andamento` e `reprovado`. Nos demais status, o prestador só visualiza.
4. **Prestadores:**
   - Só prestadores `ativo` aparecem na escolha de prestador do "Novo acionamento".
   - **Excluir fica bloqueado** se o prestador tiver acionamentos em `aberto`, `em_andamento`, `reprovado` ou `aguardando`. Nesse caso, o sistema oferece "Desativar".
   - A exclusão é um soft delete (`excluidoEm`). Os acionamentos passados continuam nos relatórios.
   - O documento (CPF/CNPJ) é único. A validação atual é de tamanho (11 ou 14 dígitos). No sistema real, adicione a validação dos dígitos verificadores.
   - O telefone precisa ter pelo menos 10 dígitos (com DDD).
5. **Novo acionamento:** título, pelo menos 1 tipo, cliente, endereço, data, e início menor que o fim são obrigatórios. Enquanto o formulário estiver inválido, o botão "Enviar ao prestador" fica visualmente desabilitado. Ao criar, o prestador deve receber uma **notificação push** (não existe no protótipo, mas é recomendado).

### Planilha de credenciados (importar e exportar)
- **Formato:** .xlsx (também aceita .xls e .csv na importação). Primeira aba, primeira linha com o cabeçalho:
  `Nome | CPF/CNPJ | Telefone | E-mail | Região | Especialidades | Status | Credenciado desde`
  - Especialidades: nomes dos tipos separados por `;` (também aceita `,` ou `/`). A comparação ignora acentos e maiúsculas.
  - Status: `Ativo` ou `Inativo` (qualquer valor que comece com "inativ" conta como inativo; o padrão é ativo).
  - Cabeçalhos alternativos aceitos: `cpf`, `cnpj`, `documento`, `celular`, `servicos`, `situacao`.
- **Importação em duas etapas:**
  1. Fazer o upload e mostrar uma **prévia**. Cada linha recebe um selo: **Novo** (documento não existe), **Atualizar** (documento já existe; os dados são sobrescritos), ou um erro: *Sem nome*, *Documento inválido*, *Duplicado na planilha*. Linhas com erro são ignoradas.
  2. Opção **"Desativar quem não está na planilha"** (padrão desligada). Ela lista os credenciados ativos cujo documento não aparece no arquivo.
  3. O botão "Importar" aplica tudo em uma transação. Mostrar o aviso "Planilha importada: X novos, Y atualizados".
- **Exportação:** baixa `credenciados-russo-DD-MM-AAAA.xlsx` com as mesmas colunas (prestadores não excluídos).
- **Modelo:** "Baixar modelo da planilha" gera `modelo-credenciados-russo.xlsx` com o cabeçalho e uma linha de exemplo.
- O protótipo usa SheetJS no navegador. No sistema real, faça a importação no backend (validação + upsert por documento + log de auditoria).

---

## Telas — Gestor

**Layout web:** sidebar fixa de 232px (fundo branco, borda direita `1px #E5E5E5`, padding `24px 16px`) + área de conteúdo (fundo `#F9F9F9`, padding `28px 32px 40px`, conteúdo com `max-width` de 1080 a 1280px, centralizado).
- **Sidebar:** título "GESTÃO DE DEMANDAS" (12px/600, uppercase, letter-spacing .06em, `#8F8D8D`), itens com 44px de altura e raio 12, ícone de 20px + label 14px/600.
  - Item ativo: fundo `#E6F0FA`, texto `#004E8F`. Hover: `#EEF4FA`.
  - "Aprovações" tem um badge laranja (`#FC7608`, 22px, texto branco 12px/700) com o tamanho da fila.
  - No rodapé, um cartão com o usuário (avatar com iniciais + "Renata Silva / Gestora").
- **Itens do menu:** Painel · Acionamentos · Aprovações · Prestadores · Checklists.
- **Layout mobile (375px):** sem sidebar. Barra de abas inferior com 76px e os mesmos 5 itens: ícone de 22px, label 11px/600 e um ponto de 4px abaixo do item ativo (`#0069BD`). Padding do conteúdo `16px 16px 24px`. Todos os blocos usam flex-wrap e grid `auto-fit`, então se reorganizam sozinhos.

### 1. Painel (dashboard)
- **Cabeçalho:** data por extenso ("Segunda-feira, 28/09/2026", 12px `#8F8D8D`), título **"Seu painel"** (24/36, 700, `#2C3143`), seletor de período (segmentado "7 dias" / "30 dias") e o botão primário **"Novo acionamento"**.
- **KPIs:** grid `repeat(auto-fit, minmax(160px, 1fr))`, gap 12. Cada cartão é branco, raio 16, padding `18px 20px`, com label 13/500 `#50555C`, valor 28/36 700 `#262A3B` e sublinha 12 `#8F8D8D`.
  1. **Acionamentos em aberto** = aberto + em_andamento + reprovado. Sublinha: "N para hoje". Clique leva para Acionamentos.
  2. **Aguardando aprovação** = quantidade em `aguardando`. Sublinha: "Na sua fila". Clique leva para Aprovações.
  3. **Taxa de aprovação** = revisões aprovadas ÷ total de revisões no período. Sublinha: "X de Y análises".
  4. **Tempo médio de conclusão** = média de (primeiro envio − iniciadoEm), formato `1h25`. Sublinha: "Do início ao envio".
  5. **Demandas inviáveis** = acionamentos inviáveis no período. Sublinha: "% do período".
- **Volume por período** (cartão flex 2): barras por dia, com 180px de altura e barra de até 44px de largura, raio 6.
  - Cada barra mostra o total em `#CCE1F2` e a parte aprovada em `#0069BD` a partir da base. O número fica acima da barra.
  - Rótulo abaixo da barra: dia da semana (7d) ou dia do mês a cada 5 dias (30d).
  - Legenda: Aprovados / Demais status.
- **Reprovações por tipo** (cartão flex 1): barras horizontais de 8px (`#FF6A5D` sobre `#EFF1F3`) com o nome do tipo, "% das demandas" e o total.
- **Fila de aprovação:** até 4 itens (avatar, título, "AC-xxxx · Enviado DD/MM · HH:MM", chip de status). Estado vazio: "Nada para conferir agora."
- **Ranking de prestadores:** tabela com as colunas posição · Prestador · Concluídos · Aprovação · Tempo. Ordenada por concluídos, e depois por taxa. O 1º lugar recebe um selo laranja-claro (`#FFEBDC` / `#B85200`).

### 2. Acionamentos (lista)
- Título + botão "Novo acionamento".
- Busca: 48px, raio 16, placeholder "Buscar por título, cliente, código ou prestador".
- Filtros em chips (34px, pill): Todos · Agendados · Em execução · Aguardando · Reprovados · Finalizados, cada um com a contagem. Chip ativo: fundo `#262A3B`, texto branco.
- **Linhas** (flex-wrap, padding `14px 20px`, divisor `#E5E5E5`, hover `#F9F9F9`): título + "código · cliente", tipos, prestador (avatar de 26px), data + horário, barra de progresso das etapas "3/5 etapas" e chip de status. Ordem: data e hora, do mais recente para o mais antigo.
- Clique na linha abre o **Detalhe**.

### 3. Novo acionamento (modal)
- Fundo `rgba(28,18,67,.8)`. Painel branco com `max-width` 920, raio 24, padding 24.
- **Coluna esquerda:** Título do acionamento · Tipos de demanda (chips de seleção múltipla com bolinha de cor; selecionado: borda `#0069BD`, fundo `#E6F0FA`) · Cliente · Endereço · Data / Início / Fim · Prestador (select só com ativos, "Nome · Região").
- **Coluna direita** (fundo `#F9F9F9`): **"Checklist gerado"**, com a prévia das etapas de cada tipo escolhido e a contagem de itens.
- Inputs com 48px, raio 16, borda `#E5E5E5` (foco `#262A3B`), labels 13/600 `#363853`.
- Ações: "Cancelar" (fundo `#EFF1F3`) e **"Enviar ao prestador"**. Mensagem após criar: "Acionamento enviado para {nome}".

### 4. Aprovações
- Grid de cartões (`minmax(280px, 1fr)`) com código, chip, título, "cliente · tipos", prestador, "Enviado …" e o link "Analisar". Estado vazio: "Sua fila está vazia."

### 5. Detalhe do acionamento (gestor)
- Link de voltar (← Acionamentos / Aprovações / Painel), código, título (24/32) e chip de status.
- **Coluna principal:**
  - Cartão de informações: Cliente, Endereço (link para o Google Maps), Atendimento, Prestador.
  - Se inviável: cartão "Motivo da inviabilidade" com borda `#F4D8E8`.
  - Um cartão por demanda com as etapas (checkbox só de leitura, comentário em uma caixa `#F9F9F9`, miniaturas de foto de 80px).
  - Cartão "Conclusão do serviço" com as fotos de conclusão (120px) e o comentário final.
- **Coluna lateral:**
  - Se `aguardando`: cartão de decisão (com sombra `0 4px 16px rgba(0,0,0,.08)`) contendo:
    - um textarea com o placeholder "Observação para o prestador (obrigatória para reprovar)";
    - o botão primário "Aprovar conclusão" (ou "Confirmar inviabilidade");
    - o botão com contorno coral "Reprovar" (ou "Recusar inviabilidade").
    - Se o gestor tentar reprovar sem motivo, mostrar o aviso "Escreva o motivo da reprovação".
  - Última decisão (quando não está aguardando).
  - **Histórico** (linha do tempo): criado, iniciado, enviado/reenviado, aprovado/reprovado com o motivo. Pontos verdes nas aprovações e coral nas reprovações.

### 6. Prestadores
- Cabeçalho: "Prestadores", "N ativos de M credenciados", e os botões **Exportar planilha** · **Subir planilha** (input de arquivo) · **Novo prestador** (primário).
- Busca (nome, documento, região, e-mail) + filtros Todos / Ativos / Inativos + o link "Baixar modelo da planilha".
- **Linhas:** avatar de 40px + nome + "documento · região", telefone e e-mail, até 2 chips de especialidade + "+n", "X em aberto · Y no total", **switch Ativo/Inativo** (44×26, trilho `#0069BD` ou `#E5E5E5`, botão com sombra `0 3px 1px rgba(0,0,0,.06), 0 3px 8px rgba(0,0,0,.15)`) e o botão de lixeira. Linhas inativas ficam com opacidade .6 e avatar cinza.
- Clique na linha abre o modal **Editar prestador**. "Novo prestador" abre o mesmo modal vazio. Campos: Nome completo ou razão social · CPF ou CNPJ · Telefone · E-mail · Região de atendimento · Especialidades (chips). Os erros aparecem em `#B85200` ("Informe o nome", "CPF ou CNPJ inválido", "Documento já cadastrado para X", "Informe o telefone com DDD").
- **Excluir (confirmação):** "Excluir {nome} ?".
  - Se houver acionamentos em aberto, o texto explica o bloqueio e só oferece "Desativar".
  - Se não houver, oferece "Desativar" ou "Excluir" (botão coral `#FF6A5D`).
- **Conferir importação (modal):** nome do arquivo, resumo "X novos · Y atualizados · Z com erro (serão ignorados)", lista com rolagem (máx. 320px) com um selo por linha, o switch "Desativar quem não está na planilha" e o botão "Importar".

### 7. Checklists (tipos de demanda)
- **Esquerda:** lista de tipos (bolinha de cor, nome, "N itens"; selecionado com borda `#0069BD`) + campo tracejado "Novo tipo" + "Adicionar".
- **Direita:** o nome do tipo, editável direto no título (18/700), e "Excluir tipo".
  - Lista numerada de etapas, cada uma com um input editável, o botão "Subir" (chevron) e o botão "Remover" (X).
  - Campo tracejado "Nova etapa do checklist" + "Adicionar etapa". Enter também adiciona.

---

## Telas — Prestador (app mobile, 375 × 812)
Estrutura: barra de status de 44px, conteúdo com rolagem e padding lateral de 24px, e barra de abas de 80px (**Início · Agenda · Demandas**; ícone de 24px, label 11/600, ponto azul de 4px no item ativo). No Detalhe, a barra de abas some.

### 1. Início
- Cabeçalho: marca Russo (36px de altura), a data ("Segunda-feira, 28/09") e **"{Bom dia|Boa tarde|Boa noite}, Carlos"** (24/32 700), com um avatar de 44px.
- **Cartão do próximo atendimento:** fundo `#0069BD`, raio 24, padding 20, texto branco.
  - Mostra o selo "Próximo atendimento" (ou "Em execução agora", com ponto laranja), o código, "Hoje · 10:30–12:30" (24/32 700), o título (16/600) e "cliente · endereço" (13, opacidade .75).
  - Botões: "Rota" (fundo branco 12%, abre o Google Maps) e **"Abrir checklist"** (fundo branco, texto azul).
  - Prioridade: o que está `em_andamento`; senão, o próximo `aberto` a partir de hoje.
- **Atalhos** (4 colunas; bloco de ícone 56×56, raio 16, fundo `#EEF4FA`; label 12/600):
  - **Rota do dia:** abre o Google Maps Directions com os endereços pendentes de hoje em ordem.
  - **Agenda**.
  - **Corrigir:** badge laranja com o número de reprovados.
  - **Em análise**.
- **Métricas** (grid 2×2, fundo `#F9F9F9`, raio 16):
  - Hoje (atendimentos).
  - No mês (aprovados).
  - Aprovação (% das revisões + "de primeira: X%").
  - Para corrigir (fundo `#FFD7D4` e texto `#B8342A` quando > 0).
- **"Sua agenda de hoje":** lista (hora 14/700, título, cliente, chip).

### 2. Agenda
- Faixa com 7 dias a partir de hoje (botões de 68px de altura, raio 14; selecionado com fundo `#0069BD` e texto branco; ponto indicando que o dia tem atendimentos).
- "Hoje, 28/09", "Amanhã, 29/09" ou o dia da semana. Lista em linha do tempo: hora à esquerda e cartão com título, "horário · tipos", endereço com ícone de pin e chip. Estado vazio: "Dia livre."

### 3. Demandas
- Título "Suas demandas". Chips com rolagem horizontal: **Ativas** (aberto + em execução) · **Corrigir** · **Em análise** · **Finalizadas**, cada um com a contagem.
- Cartões com "código · quando", título (15/700), "cliente · tipos", barra de progresso e chip.

### 4. Detalhe / execução
- Cabeçalho fixo (sticky): botão voltar de 40px (raio 12, fundo `#F9F9F9`) e o código centralizado.
- Chip de status, título (22/30 700) e cliente.
- **Bloco de informações** (fundo `#F9F9F9`, raio 16): data e horário · endereço + link "Rota" · tipos.
- **Faixas de aviso:**
  - Reprovado: fundo `#FFD7D4`, "Reprovado pelo gestor" + o motivo.
  - Aguardando: fundo `#FFEBDC`, "Enviado para aprovação" + a data.
  - Aprovado: fundo `#E6F0FA`.
  - Inviável: cartão com o motivo e as fotos.
- **Checklist:** "Checklist 3/9" + barra de progresso. Os itens são agrupados por demanda (bolinha de cor + nome + "x/y").
  - Cada etapa é um cartão `#F9F9F9` com raio 16: checkbox de 26px (raio 8; marcado com fundo `#0069BD` e check branco), o texto e uma linha de resumo azul ("2 fotos · comentário").
  - O chevron expande a etapa e mostra as miniaturas de 68px (raio 12, com carimbo HH:MM e botão X para remover), os blocos **Câmera** e **Galeria** (68px, borda tracejada `#0069BD`) e o textarea "Comentário".
- **Conclusão do serviço** (borda `#CCE1F2`): texto "1 foto obrigatória", fotos + Câmera/Galeria e o campo "Comentário final para o gestor".
- **Barra de ações fixa na base:**
  - `aberto`: **"Iniciar atendimento"** + o link "Marcar como inviável" (`#A8336A`).
  - `em_andamento` / `reprovado`: o aviso laranja "Adicione 1 foto da conclusão para enviar" (enquanto faltar), **"Enviar para aprovação"** (desabilitado com fundo `#CCE1F2` e texto `#004E8F`) e o link "Marcar como inviável".
- **Sheet "Marcar como inviável"** (sobreposição `rgba(28,18,67,.8)`, painel inferior com raio 24 no topo):
  - Texto explicativo "Explique o motivo e registre pelo menos 1 foto. O gestor vai conferir.", textarea "Motivo", fotos e Câmera/Galeria (borda tracejada `#F47B50`).
  - Botões "Cancelar" e **"Enviar ao gestor"** (habilitado com fundo `#262A3B`; desabilitado com `#EFF1F3`).
- **Fotos no app real:** use a câmera nativa. Comprima para aproximadamente 1600px no lado maior (o protótipo usa 480px e JPEG 0.7). Grave data/hora e, se possível, a geolocalização no carimbo. Guarde offline e faça upload quando houver conexão.
- **Avisos (toasts):** "Atendimento iniciado", "Enviado para aprovação", "Inviabilidade enviada ao gestor". Fundo `#262A3B`, raio 14, somem após cerca de 2,6s.

---

## Status: rótulos e cores dos chips
| Status | Rótulo | Fundo | Texto |
|---|---|---|---|
| aberto | Agendado | `#EFF1F3` | `#363853` |
| em_andamento | Em execução | `#E6F0FA` | `#004E8F` |
| aguardando | Aguardando aprovação / Inviabilidade em análise | `#FFEBDC` | `#B85200` |
| reprovado | Reprovado | `#FFD7D4` | `#B8342A` |
| aprovado | Aprovado | `#E7F8F1` | `#0B8C61` |
| aprovado + inviável | Inviável | `#F4D8E8` | `#A8336A` |

Chips: 12px/600, padding `3–4px 10px`, raio 999.

## Design tokens
**Marca Russo Assistência** (extraída do pitch deck oficial):
- Azul primário `#0069BD` · hover `#005AA3` · pressionado/escuro `#004E8F` · tint `#E6F0FA` · tint forte `#CCE1F2` · hover leve `#EEF4FA`
- Laranja `#FC7608` (badges, atenção) · laranja claro `#FFEBDC` · laranja texto `#B85200`
- Coral `#F47B50` (acento secundário)
- Grafite da marca `#5D627D` · creme `#FCF5F0`

**Neutros:** tinta `#262A3B` (texto forte e fundos escuros) · títulos `#2C3143` · texto `#363853` · secundário `#50555C` · placeholder/terciário `#8F8D8D` · linha `#ADB3BC` · divisor `#E5E5E5` · superfície 2 `#EFF1F3` · superfície 1 `#F9F9F9` · branco `#FFFFFF`

**Semânticos:** sucesso `#0B8C61` / `#E7F8F1` · perigo `#FF6A5D` / `#FFD7D4` / texto `#B8342A` · sobreposição `rgba(28,18,67,.8)`

**Cores dos tipos de demanda:** Vazamento `#0069BD` · Revisão elétrica `#FC7608` · Ponto de luz `#5D627D` · Troca de disjuntor `#F47B50` · Pintura `#004E8F` · Reparo em gesso `#E0A100` · Limpeza de ar-condicionado `#8FB8DE` · Chaveiro `#A6A6A6`

**Tipografia:** *Plus Jakarta Sans* (Google Fonts, pesos 400–800). É uma substituta, porque o manual não especifica fonte; confirme com a marca. Escala:
- Título 1: 24/36 700
- Título do app: 22/30 700
- Headline: 18/28 700 e 16/24 700
- Corpo: 14/20 500–600
- Legenda: 12/20 500
- Mínimo: 11 (labels de abas e chips pequenos)
- KPI: 28/36 700, letter-spacing −.02em

**Raios:** 8 · 10 · 12 · 14 · 16 (cartões, inputs, botões) · 24 (painéis, modais, cartão de destaque) · 52 (moldura do telefone, só no protótipo) · 999 (chips)

**Espaçamento:** grade de 8pt (4, 8, 12, 16, 20, 24, 32, 40). Gutter mobile 24px.

**Sombras:** cartão elevado ou hover `0 4px 16px rgba(0,0,0,.08)` · aviso `0 12px 32px rgba(28,18,67,.2)` · botão do switch `0 3px 1px rgba(0,0,0,.06), 0 3px 8px rgba(0,0,0,.15)`. Botões primários não têm sombra.

**Botões:**
- Primário: 44–48px, raio 16, fundo `#0069BD`, texto branco 14/600, hover `#005AA3`.
- Secundário: fundo `#EFF1F3`, texto `#363853`.
- Com contorno: borda de 1px na cor da ação.
- Adicionar: borda tracejada de 1px `#0069BD`.

**Ícones:** traço (outline) 24×24, stroke 1.5, pontas arredondadas, cor `#262A3B` (branco sobre fundos coloridos). Estilo Lucide; no código real, use `lucide-react` / `lucide-react-native`. Correspondência:

| Arquivo | Lucide |
|---|---|
| dashboard | layout-grid |
| description | clipboard-list |
| check-done | circle-check |
| member | users |
| settings | list-checks |
| date-time | calendar |
| pin | map-pin |
| priority | rotate-ccw |
| camera | camera |
| image | image |
| search | search |
| cancel | x |
| chevron-right | chevron-right |
| check | check |
| download | download |
| upload | upload |
| plus | plus |
| trash | trash-2 |
| sheet | sheet |

## Estado e dados (o que vira API)
- `GET/POST /acionamentos` (filtros: status, busca, período, prestador) · `GET /acionamentos/:id`
- `POST /acionamentos/:id/iniciar` · `PATCH /acionamentos/:id/etapas/:etapaId` (feita, comentario) · `POST …/fotos` (upload) · `DELETE …/fotos/:id`
- `POST /acionamentos/:id/enviar` · `POST /acionamentos/:id/inviavel` (comentario, fotos)
- `POST /acionamentos/:id/revisao` (decisao, motivo)
- `GET/POST/PATCH /tipos` · checklist por tipo
- `GET/POST/PATCH/DELETE /prestadores` · `POST /prestadores/importar` (prévia + confirmação) · `GET /prestadores/exportar.xlsx` · `GET /prestadores/modelo.xlsx`
- `GET /kpis?periodo=7|30` (gestor) · `GET /me/resumo` (prestador: hoje, mês, aprovação, para corrigir, próximo)
- Registrar um log de auditoria de todas as transições de status e revisões (a linha do tempo do Detalhe depende disso).
- **Recomendado, fora do protótipo:** notificações push (novo acionamento, reprovação), modo offline no app, reatribuir acionamento a outro prestador, e filtros de KPI por prestador ou tipo.

## Assets
- `assets/russo-mark.png`: símbolo da marca (casa + chave inglesa), recortado do pitch deck. **Peça o arquivo vetorial (SVG) para a Russo** antes de ir para produção.
- `assets/russo-logo.png`: logo completo, também recortado do deck.
- `assets/icons/*.svg`: conjunto de ícones descrito acima.
- As fotos do protótipo são placeholders (blocos coloridos com carimbo de hora). "Galeria" aceita imagens reais.

## Arquivos
- `Acionamentos.dc.html`: protótipo completo (template + lógica). A lógica dos métodos `vGestor`, `vForm`, `vTypes`, `vGDetail`, `vPros`, `vPro` e `vPDetail` descreve cada tela e cada regra.
- `acionamentos-data.js`: dados de exemplo, tipos com seus checklists, tabela de status e cores, e funções auxiliares (decoração de status, leitura e redimensionamento de foto, importação/exportação de planilha com SheetJS).
- `support.js`: runtime do protótipo (só para abrir o HTML; não faz parte do sistema real).
- `_ds/…/colors_and_type.css` e `_ds_bundle.js`: base de tokens usada pelo protótipo.
