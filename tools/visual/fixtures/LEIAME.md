# Fixtures do comparador visual

Arquivos usados pelo passo `{ anexar: '<arquivo>' }` dos casos (por exemplo, uma planilha de credenciados para a tela de conferência da importação).

## Planilhas de credenciados (Prestadores › Subir planilha)

Todas em UTF-8 com BOM, para o SheetJS do protótipo ler os acentos como o app. Anexar só abre a conferência (a prévia não grava nada). Os documentos novos têm dígito verificador válido e todos os telefones têm DDD, para o app (que confere as duas coisas) dar os mesmos selos do protótipo.

- `credenciados.csv` (separada por `,`): 3 atualizados (Carlos, Ana e Roberto), 2 novos (Pedro Lima e Fernanda Souza) e 3 erros (sem nome, documento curto e Carlos repetido). Ausentes: João, Marina e Luciana.
- `credenciados-completa.csv` (separada por `;`): os 6 do seed e os mesmos 2 novos. Sem erros e sem ausentes.
- `credenciados-com-erros.csv` (separada por `,`): só 2 linhas com erro. O Importar fica claro e os 5 ativos aparecem como ausentes.
