/**
 * Ações da planilha de credenciados chamadas pela tela de Prestadores. Nesta etapa são encaixes
 * sem efeito: os botões já têm o visual do protótipo, e a etapa 2 implementa o comportamento.
 */

/**
 * "Exportar planilha". Etapa 2: `GET /api/prestadores/planilha` (blob), baixa
 * `credenciados-russo-DD-MM-AAAA.xlsx` e mostra "Planilha exportada" (ou "Falha ao exportar").
 */
export async function exportarPlanilha(): Promise<void> {}

/**
 * "Baixar modelo da planilha". Etapa 2: `GET /api/prestadores/planilha/modelo` (blob), baixa
 * `modelo-credenciados-russo.xlsx` sem toast de sucesso ("Falha ao baixar modelo" no erro).
 */
export async function baixarModeloPlanilha(): Promise<void> {}
