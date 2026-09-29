import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { criarCorreioDeArquivo } from './arquivo'

const mensagem = {
  para: 'Ana.Ribeiro@Teste.dev',
  assunto: 'Seu acesso ao app da Russo Assistência',
  texto: 'Crie sua senha: http://localhost:5174/convite?token=abc123\nO link vale por 7 dias.',
  html: '<p>Olá, Ana!</p>',
}

const pastaNova = async () => join(await mkdtemp(join(tmpdir(), 'kgb-correio-')), 'emails')

describe('correio de arquivo (desenvolvimento)', () => {
  it('grava o HTML numa pasta nova, com o destinatário no nome do arquivo', async () => {
    const pasta = await pastaNova()
    await criarCorreioDeArquivo(pasta, () => {}).enviar(mensagem)
    const arquivos = await readdir(pasta)
    expect(arquivos).toHaveLength(1)
    expect(arquivos[0]).toMatch(/ana\.ribeiro@teste\.dev\.html$/)
    expect(await readFile(join(pasta, arquivos[0]), 'utf8')).toBe('<p>Olá, Ana!</p>')
  })

  it('mostra no log o arquivo gravado e o link do texto', async () => {
    const pasta = await pastaNova()
    const linhas: string[] = []
    await criarCorreioDeArquivo(pasta, (linha) => linhas.push(linha)).enviar(mensagem)
    const [arquivo] = await readdir(pasta)
    expect(linhas).toHaveLength(1)
    expect(linhas[0]).toContain(join(pasta, arquivo))
    expect(linhas[0]).toContain('Ana.Ribeiro@Teste.dev')
    expect(linhas[0]).toContain('http://localhost:5174/convite?token=abc123')
  })

  it('dois e-mails seguidos para a mesma pessoa não se sobrescrevem', async () => {
    const pasta = await pastaNova()
    const correio = criarCorreioDeArquivo(pasta, () => {})
    await correio.enviar(mensagem)
    await correio.enviar({ ...mensagem, html: '<p>segundo</p>' })
    expect(await readdir(pasta)).toHaveLength(2)
  })
})
