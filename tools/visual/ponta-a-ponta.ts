/**
 * Roteiro ponta a ponta do fluxo principal, contra a API real e os dois apps rodando (`pnpm dev`).
 *
 * 1. A gestora cria um acionamento para o Carlos.
 * 2. O Carlos o vê no Início e em Demandas, inicia, marca as etapas, anexa fotos, comenta e envia.
 * 3. A gestora reprova com motivo; o Carlos vê a reprovação, corrige e reenvia; a gestora aprova.
 * 4. Um segundo acionamento é marcado como inviável; a gestora recusa, o Carlos marca de novo e a
 *    gestora confirma a inviabilidade.
 *
 * Cria dados novos no banco de desenvolvimento: rode `pnpm db:seed` antes do `pnpm visual`.
 */
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { PNG } from 'pngjs'
import { chromium, type Browser, type Locator, type Page } from 'playwright'
import { VIEWPORT_APP } from './tipos'

const SAIDA = fileURLToPath(new URL('./.saida/', import.meta.url))
const URL_GESTOR = process.env.URL_GESTOR ?? 'http://localhost:5173'
const URL_PRESTADOR = process.env.URL_PRESTADOR ?? 'http://localhost:5174'
const SENHA = 'russo2026'
const ESPERA = 15_000

const sufixo = Date.now().toString(36).slice(-5)
const TITULO = `Roteiro ponta a ponta ${sufixo}`
const TITULO_INVIAVEL = `Roteiro inviável ${sufixo}`
const MOTIVO_REPROVACAO = 'Faltou a foto do registro fechado'
const MOTIVO_RECUSA = 'Dá para acessar pela área de serviço'

/** Imagem de teste: um PNG liso de 32×32 px. */
function imagem(nome: string, cor: [number, number, number]) {
  const png = new PNG({ width: 32, height: 32 })
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = cor[0]
    png.data[i + 1] = cor[1]
    png.data[i + 2] = cor[2]
    png.data[i + 3] = 255
  }
  return { name: nome, mimeType: 'image/png', buffer: PNG.sync.write(png) }
}

let passoAtual = ''
const paginas: Record<string, Page> = {}

async function passo(descricao: string, acao: () => Promise<void>) {
  passoAtual = descricao
  await acao()
  console.log(`✓ ${descricao}`)
}

async function entrar(navegador: Browser, app: 'gestor' | 'prestador'): Promise<Page> {
  const viewport = app === 'gestor' ? VIEWPORT_APP.gw : VIEWPORT_APP.pa
  const pagina = await (await navegador.newContext({ viewport })).newPage()
  pagina.setDefaultTimeout(ESPERA)
  const base = app === 'gestor' ? URL_GESTOR : URL_PRESTADOR
  await pagina.goto(`${base}/login`)
  await pagina.getByLabel('E-mail').fill(app === 'gestor' ? 'renata@russo.dev' : 'carlos@russo.dev')
  await pagina.getByLabel('Senha').fill(SENHA)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL((u) => !u.pathname.startsWith('/login'))
  paginas[app] = pagina
  return pagina
}

async function esperarTexto(escopo: Page | Locator, texto: string | RegExp) {
  await escopo.getByText(texto).first().waitFor()
}

async function esperarContagem(alvo: Locator, n: number) {
  const limite = Date.now() + ESPERA
  while ((await alvo.count()) !== n) {
    if (Date.now() > limite)
      throw new Error(`Esperava ${n} elemento(s), achou ${await alvo.count()}`)
    await new Promise((r) => setTimeout(r, 100))
  }
}

// ---------- gestor ----------

async function criarAcionamento(g: Page, titulo: string) {
  await g.goto(`${URL_GESTOR}/acionamentos`)
  await g.getByRole('button', { name: 'Novo acionamento' }).click()
  const modal = g.getByRole('dialog', { name: 'Novo acionamento' })
  await modal.getByLabel('Título do acionamento').fill(titulo)
  await modal.getByRole('button', { name: 'Vazamento', exact: true }).click()
  await esperarTexto(modal, /itens? no checklist/)
  await modal.getByLabel('Cliente').fill('Cliente do roteiro')
  await modal.getByLabel('Endereço').fill('Rua do Roteiro, 100 · Centro')
  const prestador = await modal.getByLabel('Prestador').locator('option:checked').innerText()
  if (!prestador.includes('Carlos')) throw new Error(`Prestador padrão inesperado: ${prestador}`)
  await modal.getByRole('button', { name: 'Enviar ao prestador' }).click()
  await esperarTexto(g, 'Acionamento enviado para Carlos Mendes')
  await modal.waitFor({ state: 'detached' })
  await esperarTexto(g, titulo)
}

async function abrirNaFila(g: Page, titulo: string) {
  await g.goto(`${URL_GESTOR}/aprovacoes`)
  await g.getByRole('link', { name: new RegExp(titulo) }).click()
  await g.getByRole('heading', { name: titulo }).waitFor()
}

async function decidir(g: Page, botao: string, observacao: string | null, confirmacao: string) {
  const decisao = g.getByRole('region', { name: /Confira e decida|marcou como inviável/ })
  if (observacao) await decisao.getByLabel('Observação para o prestador').fill(observacao)
  await decisao.getByRole('button', { name: botao }).click()
  await esperarTexto(g, confirmacao)
}

// ---------- prestador ----------

type FiltroDemandas = 'ativas' | 'corrigir' | 'analise' | 'finalizadas'

async function abrirDemanda(p: Page, titulo: string, filtro: FiltroDemandas) {
  await p.goto(`${URL_PRESTADOR}/demandas?filtro=${filtro}`)
  await p.getByRole('button', { name: new RegExp(titulo) }).click()
  await esperarTexto(p.locator('.titulo-detalhe'), titulo)
}

async function anexar(p: Page, escopo: Locator, nome: string) {
  const miniaturas = escopo.getByRole('button', { name: 'Remover foto' })
  const antes = await miniaturas.count()
  await escopo
    .locator('input[data-origem="galeria"]')
    .setInputFiles(imagem(nome, [40 + antes * 30, 120, 160]))
  await esperarContagem(miniaturas, antes + 1)
  await esperarContagem(escopo.getByRole('status').filter({ hasText: 'Carregando' }), 0)
}

async function comentar(p: Page, campo: Locator, texto: string) {
  await campo.fill(texto)
  // O comentário é salvo com debounce: espera a gravação terminar.
  await p.waitForResponse((r) => r.request().method() === 'PATCH' && r.ok())
}

async function executar(p: Page) {
  await p.getByRole('button', { name: 'Iniciar atendimento' }).click()
  await p.getByRole('button', { name: 'Enviar para aprovação' }).waitFor()

  const etapas = p.getByRole('checkbox')
  const total = await etapas.count()
  if (total === 0) throw new Error('O checklist veio vazio')
  for (let i = 0; i < total; i++) {
    const etapa = etapas.nth(i)
    await etapa.click()
    await p.waitForFunction(
      (el) => el?.getAttribute('aria-checked') === 'true',
      await etapa.elementHandle(),
    )
  }

  await p.getByRole('button', { name: 'Fotos e comentário da etapa' }).first().click()
  const expandida = p.locator('.etapa .expandido').first()
  await anexar(p, expandida, 'etapa.png')
  await comentar(p, expandida.getByPlaceholder('Comentário'), 'Registro trocado')

  const conclusao = p.locator('.conclusao')
  const aviso = p.locator('.aviso-falta')
  for (let n = 0; (await aviso.count()) > 0 && n < 6; n++) {
    await anexar(p, conclusao, `conclusao-${n}.png`)
  }
  if (await aviso.count()) throw new Error(`Envio ainda bloqueado: ${await aviso.innerText()}`)
  await comentar(
    p,
    conclusao.getByPlaceholder('Comentário final para o gestor'),
    'Serviço concluído',
  )
}

async function enviar(p: Page) {
  await p.getByRole('button', { name: 'Enviar para aprovação' }).click()
  await esperarTexto(p, 'aguarde a conferência do gestor')
}

async function marcarInviavel(p: Page, motivo: string) {
  await p.getByRole('button', { name: 'Marcar como inviável' }).click()
  const painel = p.getByRole('dialog', { name: 'Marcar como inviável' })
  await painel.getByPlaceholder('Motivo').fill(motivo)
  await anexar(p, painel, 'inviavel.png')
  await painel.getByRole('button', { name: 'Enviar ao gestor' }).click()
  await painel.waitFor({ state: 'detached' })
  await esperarTexto(p, 'Inviabilidade enviada para análise')
}

// ---------- roteiro ----------

async function main() {
  mkdirSync(SAIDA, { recursive: true })
  const navegador = await chromium.launch()
  try {
    const g = await entrar(navegador, 'gestor')
    const p = await entrar(navegador, 'prestador')

    await passo('Gestora cria um acionamento para o Carlos', () => criarAcionamento(g, TITULO))

    await passo('Carlos vê o acionamento no Início e em Demandas', async () => {
      await p.goto(`${URL_PRESTADOR}/inicio`)
      await esperarTexto(p, TITULO)
      await abrirDemanda(p, TITULO, 'ativas')
    })

    await passo('Carlos inicia, marca as etapas, anexa fotos e comenta', () => executar(p))
    await passo('Carlos envia para aprovação', () => enviar(p))

    await passo('Gestora vê em Aprovações e reprova com motivo', async () => {
      await abrirNaFila(g, TITULO)
      await decidir(g, 'Reprovar', MOTIVO_REPROVACAO, 'Devolvido ao prestador para correção')
    })

    await passo('Carlos vê a reprovação, corrige e reenvia', async () => {
      await abrirDemanda(p, TITULO, 'corrigir')
      await esperarTexto(p, 'Reprovado pelo gestor')
      await esperarTexto(p, MOTIVO_REPROVACAO)
      await anexar(p, p.locator('.conclusao'), 'correcao.png')
      await enviar(p)
    })

    await passo('Gestora aprova a conclusão', async () => {
      await abrirNaFila(g, TITULO)
      await decidir(g, 'Aprovar conclusão', null, 'Conclusão aprovada')
      await abrirDemanda(p, TITULO, 'finalizadas')
      await esperarTexto(p, 'Serviço aprovado pelo gestor')
    })

    await passo('Carlos marca outro acionamento como inviável', async () => {
      await criarAcionamento(g, TITULO_INVIAVEL)
      await abrirDemanda(p, TITULO_INVIAVEL, 'ativas')
      await marcarInviavel(p, 'Cliente não liberou o acesso ao forro')
    })

    await passo('Gestora recusa a inviabilidade e o Carlos marca de novo', async () => {
      await abrirNaFila(g, TITULO_INVIAVEL)
      await decidir(
        g,
        'Recusar inviabilidade',
        MOTIVO_RECUSA,
        'Devolvido ao prestador para correção',
      )
      await abrirDemanda(p, TITULO_INVIAVEL, 'corrigir')
      await esperarTexto(p, MOTIVO_RECUSA)
      await marcarInviavel(p, 'Área de serviço também sem acesso')
    })

    await passo('Gestora confirma a inviabilidade', async () => {
      await abrirNaFila(g, TITULO_INVIAVEL)
      await decidir(g, 'Confirmar inviabilidade', null, 'Conclusão aprovada')
      await abrirDemanda(p, TITULO_INVIAVEL, 'finalizadas')
      await esperarTexto(p, 'Inviabilidade confirmada pelo gestor')
    })

    console.log('\nRoteiro completo.')
  } catch (erro) {
    console.error(`\n✗ ${passoAtual}\n`, erro)
    for (const [app, pagina] of Object.entries(paginas)) {
      await pagina.screenshot({ path: `${SAIDA}ponta-a-ponta-${app}.png`, fullPage: true })
    }
    console.error(`Telas no momento da falha em ${SAIDA}ponta-a-ponta-*.png`)
    process.exitCode = 1
  } finally {
    await navegador.close()
  }
}

await main()
