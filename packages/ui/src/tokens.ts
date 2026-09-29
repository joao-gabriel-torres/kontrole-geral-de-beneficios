/** Tokens da marca Russo (docs/design/README.md → "Design tokens"). */
export const cores = {
  primaria: '#0069BD',
  primariaHover: '#005AA3',
  primariaEscura: '#004E8F',
  primariaTint: '#E6F0FA',
  primariaTintForte: '#CCE1F2',
  primariaHoverLeve: '#EEF4FA',
  laranja: '#FC7608',
  laranjaClaro: '#FFEBDC',
  laranjaTexto: '#B85200',
  coral: '#F47B50',
  grafite: '#5D627D',
  creme: '#FCF5F0',
  tinta: '#262A3B',
  titulo: '#2C3143',
  texto: '#363853',
  secundario: '#50555C',
  terciario: '#8F8D8D',
  linha: '#ADB3BC',
  divisor: '#E5E5E5',
  superficie2: '#EFF1F3',
  superficie1: '#F9F9F9',
  branco: '#FFFFFF',
  sucesso: '#0B8C61',
  sucessoFundo: '#E7F8F1',
  perigo: '#FF6A5D',
  perigoFundo: '#FFD7D4',
  perigoTexto: '#B8342A',
  inviavel: '#A8336A',
  inviavelFundo: '#F4D8E8',
  abaInativa: '#61565C',
} as const

export const raios = { r8: 8, r10: 10, r12: 12, r14: 14, r16: 16, r24: 24, pill: 999 } as const

export const sombras = {
  elevado: '0 4px 16px rgba(0,0,0,.08)',
  aviso: '0 12px 32px rgba(28,18,67,.2)',
  botaoSwitch: '0 3px 1px rgba(0,0,0,.06), 0 3px 8px rgba(0,0,0,.15)',
} as const

export const FONTE = "'Plus Jakarta Sans Variable', 'Plus Jakarta Sans', system-ui, sans-serif"
