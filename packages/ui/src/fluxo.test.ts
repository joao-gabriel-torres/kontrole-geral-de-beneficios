import { describe, expect, it } from 'vitest'
import {
  dataBR,
  dataISO,
  diaMes,
  intervalo,
  momento,
  progresso,
  quandoCurto,
  urlMapa,
  urlRota,
} from './fluxo'

describe('datas e horários do fluxo', () => {
  it('formata datas como o protótipo', () => {
    expect(dataBR('2026-09-28')).toBe('28/09/2026')
    expect(diaMes('2026-09-28')).toBe('28/09')
    expect(intervalo('10:30', '12:30')).toBe('10:30–12:30')
  })
  it('usa "Hoje" no dia de hoje e a data curta nos outros', () => {
    expect(quandoCurto('2026-09-28', '10:30', '12:30', '2026-09-28')).toBe('Hoje · 10:30–12:30')
    expect(quandoCurto('2026-09-29', '09:00', '10:00', '2026-09-28')).toBe('29/09 · 09:00–10:00')
  })
  it('mostra instantes no fuso de São Paulo', () => {
    expect(momento('2026-09-28T13:05:00Z')).toBe('28/09 · 10:05')
    expect(dataISO(new Date('2026-09-29T01:30:00Z'))).toBe('2026-09-28')
  })
  it('calcula o progresso das etapas', () => {
    expect(progresso({ feitas: 3, total: 5 })).toEqual({ texto: '3/5', percentual: 60 })
    expect(progresso({ feitas: 0, total: 0 })).toEqual({ texto: '0/0', percentual: 0 })
  })
})

describe('links de mapa', () => {
  const alvo = (e: string) => encodeURIComponent(`${e}, São Paulo`)
  it('abre a busca do endereço, trocando " · " por ", "', () => {
    expect(urlMapa('Rua Harmonia, 410 · Vila Madalena')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${alvo('Rua Harmonia, 410, Vila Madalena')}`,
    )
  })
  it('monta a rota do dia na ordem', () => {
    expect(urlRota(['Rua A, 1 · Centro', 'Rua B, 2 · Sé'])).toBe(
      `https://www.google.com/maps/dir/${alvo('Rua A, 1, Centro')}/${alvo('Rua B, 2, Sé')}`,
    )
  })
  it('endereço de outra cidade (termina com " - UF") não ganha ", São Paulo"', () => {
    const osasco = encodeURIComponent('Rua X, 12, Centro, Osasco - SP')
    expect(urlMapa('Rua X, 12 · Centro · Osasco - SP')).toBe(
      `https://www.google.com/maps/search/?api=1&query=${osasco}`,
    )
    expect(urlRota(['Rua A, 1 · Centro', 'Rua X, 12 · Centro · Osasco - SP'])).toBe(
      `https://www.google.com/maps/dir/${alvo('Rua A, 1, Centro')}/${osasco}`,
    )
  })
  it('com a posição conferida no mapa, o destino é "lat,lng"', () => {
    const posicao = { latitude: -23.556789, longitude: -46.690123 }
    expect(urlMapa('Rua Harmonia, 410 · Vila Madalena', posicao)).toBe(
      'https://www.google.com/maps/search/?api=1&query=-23.556789,-46.690123',
    )
    expect(
      urlRota([
        { endereco: 'Rua A, 1 · Centro', ...posicao },
        { endereco: 'Rua B, 2 · Sé', latitude: null, longitude: null },
        'Rua C, 3 · Sé',
      ]),
    ).toBe(
      `https://www.google.com/maps/dir/-23.556789,-46.690123/${alvo('Rua B, 2, Sé')}/${alvo('Rua C, 3, Sé')}`,
    )
  })
  it('sem as duas coordenadas (ou com valor inválido), vale o endereço', () => {
    const doEndereco = urlMapa('Rua Harmonia, 410 · Vila Madalena')
    for (const posicao of [
      null,
      undefined,
      { latitude: null, longitude: null },
      { latitude: -23.5, longitude: null },
      { latitude: undefined, longitude: -46.6 },
      { latitude: Number.NaN, longitude: -46.6 },
    ]) {
      expect(urlMapa('Rua Harmonia, 410 · Vila Madalena', posicao)).toBe(doEndereco)
    }
  })
})
