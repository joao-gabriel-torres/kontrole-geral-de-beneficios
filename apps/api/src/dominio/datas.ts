export const FUSO = 'America/Sao_Paulo'

const formatoData = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
const formatoHora = new Intl.DateTimeFormat('en-GB', {
  timeZone: FUSO,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** "YYYY-MM-DD" no fuso de São Paulo. */
export function dataSP(d: Date): string {
  return formatoData.format(d)
}

/** "HH:MM" no fuso de São Paulo. */
export function horarioSP(d: Date): string {
  return formatoHora.format(d)
}
