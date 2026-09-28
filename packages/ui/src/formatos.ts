export const FUSO = 'America/Sao_Paulo'

const DIAS = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
] as const

const doisDigitos = (n: number) => String(n).padStart(2, '0')

function emSaoPaulo(d: Date) {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: FUSO,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(d)
      .map((p) => [p.type, p.value]),
  )
  const ano = Number(partes.year)
  const mes = Number(partes.month)
  const dia = Number(partes.day)
  const diaSemana = new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay()
  return { ano, mes, dia, hora: Number(partes.hour), nomeDia: DIAS[diaSemana]! }
}

/** "Segunda-feira, 28/09/2026" — cabeçalho do painel do gestor. */
export function dataPorExtenso(d: Date): string {
  const c = emSaoPaulo(d)
  return `${c.nomeDia}, ${doisDigitos(c.dia)}/${doisDigitos(c.mes)}/${c.ano}`
}

/** "Segunda-feira, 28/09" — cabeçalho do Início do prestador. */
export function dataCurtaPorExtenso(d: Date): string {
  const c = emSaoPaulo(d)
  return `${c.nomeDia}, ${doisDigitos(c.dia)}/${doisDigitos(c.mes)}`
}

export function saudacao(d: Date): 'Bom dia' | 'Boa tarde' | 'Boa noite' {
  const { hora } = emSaoPaulo(d)
  return hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? ''
}

/** Iniciais do primeiro e do último nome, como no protótipo ("Renata Silva" → "RS"). */
export function iniciais(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean)
  const escolhidas = palavras.length > 1 ? [palavras[0]!, palavras.at(-1)!] : palavras
  return escolhidas.map((p) => p[0]!.toUpperCase()).join('')
}
