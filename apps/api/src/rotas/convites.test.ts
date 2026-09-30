import { createHash } from 'node:crypto'
import { mkdtemp, readdir, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { EMAIL_PRESTADOR_DEV, GESTORA_DEV, SENHA_DEV, semear } from '@kgb/db/seed'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import {
  criarCorreioDeArquivo,
  criarCorreioEmMemoria,
  trocarCorreio,
  type CorreioEmMemoria,
} from '../correio'
import { prisma } from '../db'

const app = criarApp()
const DIA = 24 * 60 * 60 * 1000
let gestora: Record<string, string>
let caixa: CorreioEmMemoria

beforeAll(async () => {
  await semear(prisma)
  gestora = await entrar(app, GESTORA_DEV.email)
})
afterAll(async () => {
  trocarCorreio(null)
  await semear(prisma)
})
beforeEach(() => {
  caixa = criarCorreioEmMemoria()
  trocarCorreio(caixa)
})

const convidar = (id: string, headers: Record<string, string> = gestora) =>
  app.request(`/api/prestadores/${id}/convite`, { method: 'POST', headers })

const json = { 'content-type': 'application/json', origin: 'http://localhost:5174' }

/** O que a tela "Crie sua senha" chama (cliente do Better Auth). */
const criarSenha = (token: string, senha: string) =>
  app.request('/api/auth/reset-password', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ newPassword: senha, token }),
  })

const tentarEntrar = (email: string, senha: string) =>
  app.request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email, password: senha }),
  })

/** Token do link "Criar minha senha" (texto ou HTML do e-mail). */
function tokenDoLink(conteudo: string): string {
  const token = /\/convite\?token=([A-Za-z0-9_%-]+)/.exec(conteudo)?.[1]
  if (!token) throw new Error('e-mail sem o link do convite')
  return decodeURIComponent(token)
}

/** O que fica no banco para um token: só o SHA-256 do identificador do Better Auth. */
const gravado = (token: string) =>
  `reset-password-sha256:${createHash('sha256').update(`reset-password:${token}`).digest('base64url')}`

let documentos = 0
async function prestadorDeTeste(id: string, email: string | null, excluidoEm: Date | null = null) {
  documentos += 1
  await prisma.prestador.create({
    data: {
      id,
      nome: `Prestador ${id}`,
      documento: String(80000000000 + documentos),
      telefone: '11900000000',
      email,
      credenciadoDesde: new Date('2024-01-01'),
      cor: '#0069BD',
      excluidoEm,
    },
  })
}

describe('POST /api/prestadores/{id}/convite', () => {
  it('401 sem sessão', async () => {
    const r = await convidar('p2', {})
    expect(r.status).toBe(401)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'nao_autenticado' } })
  })

  it('403 para o prestador', async () => {
    const r = await convidar('p2', await entrar(app, EMAIL_PRESTADOR_DEV))
    expect(r.status).toBe(403)
    expect(await r.json()).toMatchObject({ erro: { codigo: 'sem_permissao' } })
  })

  it('404 para prestador inexistente ou excluído', async () => {
    await prestadorDeTeste('p-rota-excluido', 'excluido@teste.dev', new Date())
    for (const id of ['nao-existe', 'p-rota-excluido']) {
      const r = await convidar(id)
      expect(r.status).toBe(404)
      expect(await r.json()).toEqual({
        erro: { codigo: 'nao_encontrado', mensagem: 'Prestador não encontrado' },
      })
    }
  })

  it('409 sem e-mail, com e-mail de outra conta e com e-mail que não é um endereço só', async () => {
    await prestadorDeTeste('p-rota-sem-email', null)
    await prestadorDeTeste('p-rota-gestora', 'renata@russo.dev')

    const semEmail = await convidar('p-rota-sem-email')
    expect(semEmail.status).toBe(409)
    expect(await semEmail.json()).toEqual({
      erro: {
        codigo: 'prestador_sem_email',
        mensagem: 'Cadastre um e-mail para enviar o convite',
      },
    })

    const emUso = await convidar('p-rota-gestora')
    expect(emUso.status).toBe(409)
    expect(await emUso.json()).toEqual({
      erro: { codigo: 'email_em_uso', mensagem: 'Este e-mail já é usado por outra conta' },
    })

    await prestadorDeTeste(
      'p-rota-dois-emails',
      'contato@marinacosta.com.br; socio@marinacosta.com.br',
    )
    const invalido = await convidar('p-rota-dois-emails')
    expect(invalido.status).toBe(409)
    expect(await invalido.json()).toEqual({
      erro: { codigo: 'email_invalido', mensagem: 'O e-mail do cadastro não é válido' },
    })
    expect(caixa.enviados).toEqual([])
  })

  it('12 convites simultâneos do mesmo prestador: todos 200 e só um link vale no fim', async () => {
    const respostas = await Promise.all(Array.from({ length: 12 }, () => convidar('p3')))

    expect(respostas.map((r) => r.status)).toEqual(Array<number>(12).fill(200))
    const convites = await prisma.verification.findMany({
      where: { value: 'u-p3', identifier: { startsWith: 'reset-password' } },
    })
    expect(convites).toHaveLength(1)
    const enviados = caixa.enviados.map((e) => gravado(tokenDoLink(e.texto)))
    expect(enviados).toHaveLength(12)
    expect(enviados).toContain(convites[0].identifier)
  })

  it('200 com o e-mail que vira o login e a validade de 7 dias', async () => {
    const antes = Date.now()
    const r = await convidar('p6')
    expect(r.status).toBe(200)
    const corpo = (await r.json()) as { email: string; expiraEm: string }
    expect(corpo.email).toBe('luciana.prado@email.com')
    const validade = new Date(corpo.expiraEm).getTime() - antes
    expect(validade).toBeGreaterThanOrEqual(7 * DIA)
    expect(validade).toBeLessThan(7 * DIA + 60_000)
    expect(caixa.enviados.map((e) => e.para)).toEqual(['luciana.prado@email.com'])
  })
})

describe('convite ponta a ponta', () => {
  it('convidar → e-mail gravado → criar senha → entrar → token reutilizado falha', async () => {
    const pasta = await mkdtemp(join(tmpdir(), 'kgb-convite-'))
    trocarCorreio(criarCorreioDeArquivo(pasta, () => {}))

    const r = await convidar('p2')
    expect(r.status).toBe(200)
    const { email } = (await r.json()) as { email: string }
    expect(email).toBe('ana@ribeiroreparos.com.br')

    const arquivos = await readdir(pasta)
    expect(arquivos).toHaveLength(1)
    const token = tokenDoLink(await readFile(join(pasta, arquivos[0]), 'utf8'))
    // O banco guarda só o hash do token.
    expect(await prisma.verification.count({ where: { identifier: { contains: token } } })).toBe(0)
    expect(await prisma.verification.count({ where: { identifier: gravado(token) } })).toBe(1)

    expect((await tentarEntrar(email, 'senha-da-ana-1')).status).toBe(401)
    const criada = await criarSenha(token, 'senha-da-ana-1')
    expect(criada.status).toBe(200)

    const ana = await entrar(app, email, 'senha-da-ana-1')
    expect(await (await app.request('/api/me', { headers: ana })).json()).toMatchObject({
      email,
      papel: 'prestador',
      prestador: { id: 'p2' },
    })

    const reuso = await criarSenha(token, 'outra-senha-2')
    expect(reuso.status).toBe(400)
    expect(await reuso.json()).toMatchObject({ code: 'INVALID_TOKEN' })
    expect((await tentarEntrar(email, 'outra-senha-2')).status).toBe(401)
  })

  it('senha curta é recusada sem gastar o convite', async () => {
    await convidar('p4')
    const token = tokenDoLink(caixa.enviados[0].texto)

    const curta = await criarSenha(token, '1234567')
    expect(curta.status).toBe(400)
    expect(await curta.json()).toMatchObject({ code: 'PASSWORD_TOO_SHORT' })
    expect((await criarSenha(token, '12345678')).status).toBe(200)
  })

  it('reenvio com o e-mail fora do ar: 502 envio_email_falhou e o link anterior continua valendo', async () => {
    await convidar('p4')
    const anterior = tokenDoLink(caixa.enviados[0].texto)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    trocarCorreio({ enviar: () => Promise.reject(new Error('421 servidor indisponível')) })

    const r = await convidar('p4')
    vi.restoreAllMocks()

    expect(r.status).toBe(502)
    expect(await r.json()).toEqual({
      erro: {
        codigo: 'envio_email_falhou',
        mensagem: 'Não foi possível enviar o e-mail do convite. Tente de novo.',
      },
    })
    expect((await criarSenha(anterior, 'senha-da-marina')).status).toBe(200)
    expect((await tentarEntrar('contato@marinacosta.com.br', 'senha-da-marina')).status).toBe(200)
  })

  it('o que fica no banco não abre o convite: só o token do e-mail cria a senha', async () => {
    await convidar('p6')
    const token = tokenDoLink(caixa.enviados[0].texto)
    const { identifier } = await prisma.verification.findFirstOrThrow({
      where: { value: 'u-p6', identifier: { startsWith: 'reset-password' } },
    })
    const hash = identifier.slice(identifier.indexOf(':') + 1)

    for (const lido of [identifier, hash, `sha256:${hash}`]) {
      const r = await criarSenha(lido, 'senha-de-quem-leu-o-banco')
      expect(r.status).toBe(400)
      expect(await r.json()).toMatchObject({ code: 'INVALID_TOKEN' })
    }
    expect((await criarSenha(token, 'senha-da-luciana')).status).toBe(200)
    expect((await tentarEntrar('luciana.prado@email.com', 'senha-da-luciana')).status).toBe(200)
  })

  it('convite antigo, gravado em texto puro antes do hash, ainda cria a senha', async () => {
    await prisma.verification.create({
      data: {
        id: 'v-convite-legado',
        identifier: 'reset-password:token-legado-do-roberto',
        value: 'u-p5',
        expiresAt: new Date(Date.now() + DIA),
      },
    })

    expect((await criarSenha('token-legado-do-roberto', 'senha-do-roberto')).status).toBe(200)
    expect((await tentarEntrar('roberto.alves@email.com', 'senha-do-roberto')).status).toBe(200)
  })

  it('o link anterior deixa de valer depois do reenvio', async () => {
    await convidar('p3')
    await convidar('p3')
    const [antigo, novo] = caixa.enviados.map((e) => tokenDoLink(e.texto))

    expect((await criarSenha(antigo, 'senha-do-joao-1')).status).toBe(400)
    expect((await criarSenha(novo, 'senha-do-joao-1')).status).toBe(200)
  })

  it('token vencido é recusado', async () => {
    await convidar('p5')
    const token = tokenDoLink(caixa.enviados[0].texto)
    await prisma.verification.update({
      where: {
        id: (
          await prisma.verification.findFirstOrThrow({
            where: { value: 'u-p5', identifier: { startsWith: 'reset-password' } },
          })
        ).id,
      },
      data: { expiresAt: new Date(Date.now() - 1000) },
    })

    const r = await criarSenha(token, 'senha-do-roberto')
    expect(r.status).toBe(400)
    expect(await r.json()).toMatchObject({ code: 'INVALID_TOKEN' })
  })

  it('quem já tem senha recebe o convite como redefinição: a senha antiga deixa de valer', async () => {
    // Uma sessão aberta com a senha antiga (outro aparelho) tem de cair junto com ela.
    const sessaoAntiga = await entrar(app, EMAIL_PRESTADOR_DEV)
    const r = await convidar('p1')
    const { email } = (await r.json()) as { email: string }
    // O login passa a ser o e-mail do cadastro.
    expect(email).toBe('carlos.mendes@email.com')

    expect(
      (await criarSenha(tokenDoLink(caixa.enviados[0].texto), 'nova-senha-do-carlos')).status,
    ).toBe(200)

    expect((await tentarEntrar(email, SENHA_DEV)).status).toBe(401)
    expect((await tentarEntrar(email, 'nova-senha-do-carlos')).status).toBe(200)
    expect((await app.request('/api/me', { headers: sessaoAntiga })).status).toBe(401)
  })
})
