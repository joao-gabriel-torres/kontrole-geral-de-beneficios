import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
import { chromium, type Browser, type Page } from 'playwright'
import { CASOS, VIEWPORT_APP, type Caso, type Modo, type Passo, type Regiao } from './casos'

type Ponto = { x: number; y: number }

const PASTA_PROTOTIPO = fileURLToPath(new URL('../../docs/design/', import.meta.url))
const SAIDA = fileURLToPath(new URL('./.saida/', import.meta.url))
const PASTA_FIXTURES = fileURLToPath(new URL('./fixtures/', import.meta.url))
/** Fração máxima de pixels diferentes na região inteira. */
const LIMITE = Number(process.env.LIMITE_DIFERENCA ?? '0.002')
/** Fração máxima de pixels diferentes em relação aos pixels de conteúdo (não-fundo) do protótipo. */
const LIMITE_CONTEUDO = Number(process.env.LIMITE_CONTEUDO ?? '0.02')
const URL_APP = {
  gestor: process.env.URL_GESTOR ?? 'http://localhost:5173',
  prestador: process.env.URL_PRESTADOR ?? 'http://localhost:5174',
}
const CREDENCIAIS = {
  gestor: { email: 'renata@russo.dev', senha: 'russo2026' },
  prestador: { email: 'carlos@russo.dev', senha: 'russo2026' },
}
const TIPOS: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
}
const argumentos = process.argv.slice(2)
const sanidade = argumentos.includes('--sanidade')
const filtro = argumentos.find((a) => a.startsWith('--caso='))?.slice('--caso='.length)
const filtroApp = argumentos.find((a) => a.startsWith('--app='))?.slice('--app='.length)

function servirPrototipo(): Promise<{ url: string; fechar: () => void }> {
  const servidor = createServer((req, res) => {
    const caminho = normalize(decodeURIComponent((req.url ?? '/').split('?')[0]!))
    const arquivo = join(PASTA_PROTOTIPO, caminho === sep ? 'Acionamentos.dc.html' : caminho)
    if (!arquivo.startsWith(PASTA_PROTOTIPO)) return void res.writeHead(403).end()
    try {
      statSync(arquivo)
      res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] ?? 'application/octet-stream' })
      res.end(readFileSync(arquivo))
    } catch {
      res.writeHead(404).end()
    }
  })
  return new Promise((pronto) =>
    servidor.listen(0, () => {
      const { port } = servidor.address() as { port: number }
      pronto({ url: `http://localhost:${port}/`, fechar: () => servidor.close() })
    }),
  )
}

const escapar = (texto: string) => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

async function aplicarPassos(pagina: Page, passos: readonly Passo[] = []) {
  // A fonte muda a largura dos textos: clicar antes de ela chegar mede e rola diferente.
  await pagina.evaluate(() => document.fonts.ready)
  for (const passo of passos) {
    if ('esperar' in passo) {
      await pagina.waitForTimeout(passo.esperar)
      continue
    }
    if ('preencher' in passo) {
      const porPlaceholder = pagina.getByPlaceholder(passo.preencher, { exact: true })
      const campo = (await porPlaceholder.count())
        ? porPlaceholder
        : pagina.getByLabel(passo.preencher, { exact: true })
      await campo.first().fill(passo.com)
    } else if ('anexar' in passo) {
      await pagina
        .locator('input[type="file"]')
        .first()
        .setInputFiles(join(PASTA_FIXTURES, passo.anexar))
    } else {
      const nome = passo.inicio ? new RegExp(`^${escapar(passo.clicar)}(\\s|$)`) : passo.clicar
      const alvo =
        passo.papel === 'text'
          ? pagina.getByText(nome, { exact: true })
          : pagina.getByRole(passo.papel ?? 'button', { name: nome, exact: true })
      await alvo.first().click()
    }
    await pagina.waitForTimeout(250)
  }
  await pagina.mouse.move(1, 1)
}

async function abrirPrototipo(navegador: Browser, url: string, caso: Caso): Promise<[Page, Ponto]> {
  const viewport = caso.modo === 'gw' ? { width: 1440, height: 900 } : { width: 443, height: 936 }
  const pagina = await (await navegador.newContext({ viewport, deviceScaleFactor: 1 })).newPage()
  await pagina.addInitScript((modo: Modo) => {
    localStorage.removeItem('acionamentos_v3')
    localStorage.setItem('acionamentos_v3_mode', modo)
  }, caso.modo)
  // O protótipo busca fontes e scripts em CDN: esperar o "load" deixa a rodada à mercê da rede.
  // A fonte é aguardada antes dos passos (document.fonts.ready).
  await pagina.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await pagina.getByText('Restaurar exemplo').waitFor({ timeout: 60_000 })
  if (caso.navegarPrototipo) {
    await pagina
      .getByRole('button', { name: new RegExp(`^\\s*${caso.navegarPrototipo}`) })
      .first()
      .click()
  }
  await aplicarPassos(pagina, caso.passos)
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.waitForTimeout(300)
  return [pagina, await origemPrototipo(pagina, caso.modo)]
}

async function origemPrototipo(pagina: Page, modo: Modo): Promise<Ponto> {
  if (modo === 'gw') return { x: 0, y: 56 }
  const moldura = await pagina.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find(
      (d) => getComputedStyle(d).borderTopLeftRadius === '52px',
    )
    if (!el) return null
    const r = el.getBoundingClientRect()
    return { x: r.x, y: r.y }
  })
  if (!moldura) throw new Error('Moldura do telefone não encontrada no protótipo')
  const origem = { x: moldura.x + 10, y: moldura.y + 10 + 44 }
  if (!Number.isInteger(origem.x) || !Number.isInteger(origem.y)) {
    throw new Error(`Moldura em posição fracionária (${origem.x}, ${origem.y}): ajuste o viewport`)
  }
  return origem
}

async function abrirApp(navegador: Browser, caso: Caso): Promise<[Page, Ponto]> {
  const viewport = VIEWPORT_APP[caso.modo]
  const pagina = await (await navegador.newContext({ viewport, deviceScaleFactor: 1 })).newPage()
  const base = URL_APP[caso.app]
  const { email, senha } = CREDENCIAIS[caso.app]
  await pagina.goto(`${base}/login`)
  await pagina.getByLabel('E-mail').fill(email)
  await pagina.getByLabel('Senha').fill(senha)
  await pagina.getByRole('button', { name: 'Entrar' }).click()
  await pagina.waitForURL((u) => !u.pathname.startsWith('/login'))
  await pagina.goto(`${base}${caso.rota}`)
  await pagina.waitForLoadState('networkidle')
  await aplicarPassos(pagina, caso.passos)
  await pagina.waitForLoadState('networkidle')
  await pagina.evaluate(() => document.fonts.ready)
  await pagina.waitForTimeout(300)
  return [pagina, { x: 0, y: 0 }]
}

/** Raio interno da moldura do telefone no protótipo (52px de raio − 10px de borda). */
const RAIO_MOLDURA = 42

/**
 * A moldura do telefone do protótipo arredonda os cantos inferiores da tela: isso é simulação do
 * aparelho, não interface. Os pixels fora desse arredondamento são zerados nas duas imagens.
 */
function mascararCantosDaMoldura(imgs: PNG[], caso: Caso, r: Regiao): void {
  if (caso.modo === 'gw') return
  const { width: largura, height: altura } = VIEWPORT_APP[caso.modo]
  const centroY = altura - RAIO_MOLDURA
  for (let j = 0; j < r.altura; j++) {
    const py = r.y + j + 0.5
    if (py <= centroY) continue
    for (let i = 0; i < r.largura; i++) {
      const px = r.x + i + 0.5
      const centroX =
        px < RAIO_MOLDURA
          ? RAIO_MOLDURA
          : px > largura - RAIO_MOLDURA
            ? largura - RAIO_MOLDURA
            : null
      if (centroX === null || Math.hypot(px - centroX, py - centroY) <= RAIO_MOLDURA - 1) continue
      for (const img of imgs) img.data.writeUInt32BE(0, (j * r.largura + i) * 4)
    }
  }
}

async function recortar(pagina: Page, origem: Ponto, r: Regiao): Promise<PNG> {
  const buffer = await pagina.screenshot({
    clip: { x: origem.x + r.x, y: origem.y + r.y, width: r.largura, height: r.altura },
    animations: 'disabled',
    caret: 'hide',
  })
  return PNG.sync.read(buffer)
}

/** Pixels que não têm a cor predominante (fundo) da imagem. */
function pixelsDeConteudo(img: PNG): number {
  const contagem = new Map<number, number>()
  for (let i = 0; i < img.data.length; i += 4) {
    const cor = img.data.readUInt32BE(i)
    contagem.set(cor, (contagem.get(cor) ?? 0) + 1)
  }
  const fundo = Math.max(...contagem.values())
  return img.width * img.height - fundo
}

interface Diferenca {
  regiao: number
  conteudo: number
}

function diferenca(a: PNG, b: PNG, arquivoDiff?: string): Diferenca {
  const diff = new PNG({ width: a.width, height: a.height })
  const pixels = pixelmatch(a.data, b.data, diff.data, a.width, a.height, { threshold: 0.1 })
  if (arquivoDiff) writeFileSync(arquivoDiff, PNG.sync.write(diff))
  return {
    regiao: pixels / (a.width * a.height),
    conteudo: pixels / Math.max(pixelsDeConteudo(a), 1),
  }
}

const dentroDoLimite = (d: Diferenca) => d.regiao <= LIMITE && d.conteudo <= LIMITE_CONTEUDO
const porcento = (x: number) => `${(x * 100).toFixed(3)}%`

const { url, fechar } = await servirPrototipo()
const navegador = await chromium.launch()
mkdirSync(SAIDA, { recursive: true })
let falhas = 0
try {
  for (const caso of CASOS.filter(
    (c) => (!filtro || c.nome === filtro) && (!filtroApp || c.app === filtroApp),
  )) {
    const [prototipo, origemP] = await abrirPrototipo(navegador, url, caso)
    const [app, origemA] = sanidade
      ? await abrirPrototipo(navegador, url, caso)
      : await abrirApp(navegador, caso)
    for (const regiao of caso.regioes) {
      const imgP = await recortar(prototipo, origemP, regiao)
      const imgA = await recortar(app, origemA, regiao)
      mascararCantosDaMoldura([imgP, imgA], caso, regiao)
      const base = join(SAIDA, `${caso.nome}--${regiao.nome}`)
      writeFileSync(`${base}--prototipo.png`, PNG.sync.write(imgP))
      writeFileSync(`${base}--app.png`, PNG.sync.write(imgA))
      const d = diferenca(imgP, imgA, `${base}--diff.png`)
      const ok = dentroDoLimite(d)
      if (!ok) falhas++
      console.log(
        `${ok ? '✓' : '✗'} ${caso.nome} › ${regiao.nome}: ${porcento(d.regiao)} da região, ${porcento(d.conteudo)} do conteúdo`,
      )
      if (sanidade) {
        const deslocada = await recortar(prototipo, { x: origemP.x + 1, y: origemP.y }, regiao)
        mascararCantosDaMoldura([deslocada], caso, regiao)
        const dd = diferenca(imgP, deslocada)
        const detectou = !dentroDoLimite(dd)
        if (!detectou) falhas++
        console.log(
          `  ${detectou ? '✓' : '✗'} deslocamento de 1px detectado: ${porcento(dd.regiao)} da região, ${porcento(dd.conteudo)} do conteúdo`,
        )
      }
    }
    await prototipo.context().close()
    await app.context().close()
  }
} finally {
  await navegador.close()
  fechar()
}
if (falhas > 0) {
  console.error(
    `\n${falhas} verificação(ões) falharam (limites: ${porcento(LIMITE)} da região e ${porcento(LIMITE_CONTEUDO)} do conteúdo). Imagens em ${SAIDA}`,
  )
  process.exit(1)
}
console.log('\nTodas as regiões batem com o protótipo.')
