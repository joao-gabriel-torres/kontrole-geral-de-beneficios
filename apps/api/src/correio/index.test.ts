import { existsSync } from 'node:fs'
import { mkdtemp, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { correio, criarCorreio, trocarCorreio } from '.'
import { criarCorreioEmMemoria } from './memoria'

const mensagem = { para: 'ana@teste.dev', assunto: 'Assunto', texto: 'texto', html: '<p>oi</p>' }
const pastaNova = async () => join(await mkdtemp(join(tmpdir(), 'kgb-correio-')), 'emails')

describe('criarCorreio', () => {
  afterEach(() => vi.restoreAllMocks())

  it('sem SMTP_URL grava os e-mails na pasta indicada', async () => {
    vi.spyOn(console, 'info').mockImplementation(() => {})
    const pasta = await pastaNova()
    await criarCorreio({}, pasta).enviar(mensagem)
    expect(await readdir(pasta)).toHaveLength(1)
  })

  it('com SMTP_URL envia por SMTP e não grava arquivo', async () => {
    const pasta = await pastaNova()
    // Porta 1 recusa a conexão na hora: prova que tentou o SMTP.
    const smtp = criarCorreio({ SMTP_URL: 'smtp://127.0.0.1:1', EMAIL_REMETENTE: 'n@x.dev' }, pasta)
    await expect(smtp.enviar(mensagem)).rejects.toThrow()
    expect(existsSync(pasta)).toBe(false)
  })

  it('em produção sem SMTP_URL recusa: nada de arquivo nem de link no log', async () => {
    const log = vi.spyOn(console, 'info').mockImplementation(() => {})
    const pasta = await pastaNova()
    expect(() => criarCorreio({ NODE_ENV: 'production' }, pasta)).toThrow('SMTP_URL')
    expect(existsSync(pasta)).toBe(false)
    expect(log).not.toHaveBeenCalled()
  })

  it('SMTP_URL sem remetente é recusada', () => {
    expect(() => criarCorreio({ SMTP_URL: 'smtp://127.0.0.1:1' })).toThrow('EMAIL_REMETENTE')
  })
})

describe('correio da API', () => {
  afterEach(() => trocarCorreio(null))

  it('trocarCorreio substitui o correio usado pela API', async () => {
    const memoria = criarCorreioEmMemoria()
    trocarCorreio(memoria)
    await correio().enviar(mensagem)
    expect(memoria.enviados).toEqual([mensagem])
  })

  it('null volta ao correio do .env', () => {
    const memoria = criarCorreioEmMemoria()
    trocarCorreio(memoria)
    trocarCorreio(null)
    expect(correio()).not.toBe(memoria)
  })
})
