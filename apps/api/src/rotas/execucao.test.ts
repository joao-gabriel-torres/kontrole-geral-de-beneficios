import { EMAIL_PRESTADOR_DEV, GESTORA_DEV } from '@kgb/db/seed'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { criarAcionamento, formularioFoto, JPEG, loginDePrestador } from '../../test/dados'
import { entrar } from '../../test/sessao'
import { criarApp } from '../app'
import { armazenamento } from '../arquivos'
import { assinar } from '../arquivos/assinatura'
import { prisma } from '../db'

const app = criarApp()
let gestora: Record<string, string>
let carlos: Record<string, string>
let ana: Record<string, string>

beforeAll(async () => {
  gestora = await entrar(app, GESTORA_DEV.email)
  carlos = await entrar(app, EMAIL_PRESTADOR_DEV)
  ana = await entrar(app, await loginDePrestador('p2'))
})

afterEach(() => vi.restoreAllMocks())

const req = (metodo: string, caminho: string, headers: Record<string, string>, corpo?: unknown) =>
  app.request(caminho, {
    method: metodo,
    headers:
      corpo instanceof FormData || corpo === undefined
        ? headers
        : { ...headers, 'content-type': 'application/json' },
    body:
      corpo instanceof FormData ? corpo : corpo === undefined ? undefined : JSON.stringify(corpo),
  })

async function novoIniciado() {
  const id = await criarAcionamento(app, gestora)
  expect((await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)).status).toBe(200)
  return id
}

async function primeiraEtapa(id: string) {
  return (
    await prisma.etapa.findFirstOrThrow({
      where: { demanda: { acionamentoId: id } },
      orderBy: { ordem: 'asc' },
    })
  ).id
}

describe('iniciar', () => {
  it('passa para "em execução", grava o início e o evento', async () => {
    const id = await criarAcionamento(app, gestora)
    const r = await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.status).toBe('em_andamento')
    expect(d.iniciadoEm).not.toBeNull()
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual(['criado', 'iniciado'])
    expect((await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)).status).toBe(409)
  })

  it('dois toques ao mesmo tempo: só um inicia', async () => {
    const id = await criarAcionamento(app, gestora)
    const respostas = await Promise.all([
      req('POST', `/api/acionamentos/${id}/iniciar`, carlos),
      req('POST', `/api/acionamentos/${id}/iniciar`, carlos),
    ])
    expect(respostas.map((r) => r.status).sort()).toEqual([200, 409])
    expect(
      await prisma.eventoAcionamento.count({ where: { acionamentoId: id, tipo: 'iniciado' } }),
    ).toBe(1)
  })

  it('outro prestador recebe 404 e a gestão recebe 403', async () => {
    const id = await criarAcionamento(app, gestora)
    expect((await req('POST', `/api/acionamentos/${id}/iniciar`, ana)).status).toBe(404)
    expect((await req('POST', `/api/acionamentos/${id}/iniciar`, gestora)).status).toBe(403)
  })
})

describe('etapas e comentário final', () => {
  it('só edita com o atendimento em execução', async () => {
    const id = await criarAcionamento(app, gestora)
    const etapa = await primeiraEtapa(id)
    expect(
      (await req('PATCH', `/api/acionamentos/${id}/etapas/${etapa}`, carlos, { feita: true }))
        .status,
    ).toBe(409)
    await req('POST', `/api/acionamentos/${id}/iniciar`, carlos)
    const r = await req('PATCH', `/api/acionamentos/${id}/etapas/${etapa}`, carlos, {
      feita: true,
      comentario: 'Feito ',
    })
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d.demandas[0].etapas[0]).toMatchObject({ feita: true, comentario: 'Feito ' })
    expect(d.etapas.feitas).toBe(1)
  })

  it('comentário só com espaços vira vazio', async () => {
    const id = await novoIniciado()
    const etapa = await primeiraEtapa(id)
    const d = await (
      await req('PATCH', `/api/acionamentos/${id}/etapas/${etapa}`, carlos, { comentario: '  ' })
    ).json()
    expect(d.demandas[0].etapas[0].comentario).toBeNull()
  })

  it('etapa de outro acionamento é 404', async () => {
    const id = await novoIniciado()
    const outra = await primeiraEtapa(await novoIniciado())
    expect(
      (await req('PATCH', `/api/acionamentos/${id}/etapas/${outra}`, carlos, { feita: true }))
        .status,
    ).toBe(404)
  })

  it('grava o comentário final', async () => {
    const id = await novoIniciado()
    const d = await (
      await req('PATCH', `/api/acionamentos/${id}/conclusao`, carlos, { comentario: 'Tudo certo' })
    ).json()
    expect(d.comentarioConclusao).toBe('Tudo certo')
  })
})

describe('fotos', () => {
  it('envia foto da etapa e lê de volta pela URL assinada, sem login', async () => {
    const id = await novoIniciado()
    const etapaId = await primeiraEtapa(id)
    const r = await req(
      'POST',
      `/api/acionamentos/${id}/fotos`,
      carlos,
      formularioFoto({ contexto: 'etapa', etapaId, tiradaEm: '2026-09-28T13:05:00-03:00' }),
    )
    expect(r.status).toBe(201)
    const foto = await r.json()
    expect(foto).toMatchObject({
      cor: null,
      horario: '13:05',
      url: expect.stringMatching(/^\/api\/arquivos\/fotos\//),
    })
    const arquivo = await app.request(foto.url)
    expect(arquivo.status).toBe(200)
    expect(arquivo.headers.get('content-type')).toBe('image/jpeg')
    expect(new Uint8Array(await arquivo.arrayBuffer())).toEqual(JPEG)
  })

  it('URL adulterada ou vencida não entrega a foto', async () => {
    const id = await novoIniciado()
    const foto = await (
      await req(
        'POST',
        `/api/acionamentos/${id}/fotos`,
        carlos,
        formularioFoto({ contexto: 'conclusao' }),
      )
    ).json()
    // Troca o 1º caractere da assinatura de verdade (se já fosse "0", trocar por "0" não mudaria nada).
    const adulterada = foto.url.replace(
      /sig=(.)/,
      (_: string, c: string) => `sig=${c === '0' ? '1' : '0'}`,
    )
    expect(adulterada).not.toBe(foto.url)
    expect((await app.request(adulterada)).status).toBe(403)
    const vencida = Math.floor(Date.now() / 1000) - 10
    expect(
      (
        await app.request(
          `/api/arquivos/fotos/${foto.id}?exp=${vencida}&sig=${assinar(foto.id, vencida)}`,
        )
      ).status,
    ).toBe(403)
  })

  it('recusa arquivo que não é imagem e foto grande demais', async () => {
    const id = await novoIniciado()
    const texto = await req(
      'POST',
      `/api/acionamentos/${id}/fotos`,
      carlos,
      formularioFoto({ contexto: 'conclusao' }, new TextEncoder().encode('não sou foto')),
    )
    expect(texto.status).toBe(415)
    expect(await texto.json()).toMatchObject({ erro: { codigo: 'tipo_arquivo_invalido' } })
    const grande = new Uint8Array(10 * 1024 * 1024 + 1)
    grande.set(JPEG)
    const r = await req(
      'POST',
      `/api/acionamentos/${id}/fotos`,
      carlos,
      formularioFoto({ contexto: 'conclusao' }, grande),
    )
    expect(r.status).toBe(413)
  })

  it('foto de etapa exige a etapa, e ela precisa ser deste acionamento', async () => {
    const id = await novoIniciado()
    expect(
      (
        await req(
          'POST',
          `/api/acionamentos/${id}/fotos`,
          carlos,
          formularioFoto({ contexto: 'etapa' }),
        )
      ).status,
    ).toBe(422)
    const outra = await primeiraEtapa(await novoIniciado())
    const r = await req(
      'POST',
      `/api/acionamentos/${id}/fotos`,
      carlos,
      formularioFoto({ contexto: 'etapa', etapaId: outra }),
    )
    expect(r.status).toBe(404)
    expect(await prisma.foto.count({ where: { acionamentoId: id } })).toBe(0)
  })

  it('remove a foto e o arquivo', async () => {
    const id = await novoIniciado()
    const foto = await (
      await req(
        'POST',
        `/api/acionamentos/${id}/fotos`,
        carlos,
        formularioFoto({ contexto: 'conclusao' }),
      )
    ).json()
    const r = await req('DELETE', `/api/acionamentos/${id}/fotos/${foto.id}`, carlos)
    expect(r.status).toBe(200)
    expect(await prisma.foto.count({ where: { id: foto.id } })).toBe(0)
    expect((await app.request(foto.url)).status).toBe(404)
  })

  it('remover a foto responde 200 mesmo se o arquivo não puder ser apagado', async () => {
    const id = await novoIniciado()
    const foto = await (
      await req(
        'POST',
        `/api/acionamentos/${id}/fotos`,
        carlos,
        formularioFoto({ contexto: 'conclusao' }),
      )
    ).json()
    vi.spyOn(armazenamento, 'remover').mockRejectedValueOnce(new Error('armazenamento fora do ar'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const r = await req('DELETE', `/api/acionamentos/${id}/fotos/${foto.id}`, carlos)
    expect(r.status).toBe(200)
    expect(await prisma.foto.count({ where: { id: foto.id } })).toBe(0)
    expect(log).toHaveBeenCalledWith(
      'Não foi possível remover o arquivo',
      expect.stringContaining(foto.id),
      expect.any(Error),
    )
  })
})

describe('enviar para aprovação', () => {
  it('exige a foto da conclusão, com o texto do protótipo', async () => {
    const id = await novoIniciado()
    const r = await req('POST', `/api/acionamentos/${id}/enviar`, carlos)
    expect(r.status).toBe(422)
    expect(await r.json()).toMatchObject({
      erro: { codigo: 'fotos_insuficientes', mensagem: 'Adicione 1 foto da conclusão para enviar' },
    })
  })

  it('envia e trava a edição', async () => {
    const id = await novoIniciado()
    await req(
      'POST',
      `/api/acionamentos/${id}/fotos`,
      carlos,
      formularioFoto({ contexto: 'conclusao' }),
    )
    const d = await (await req('POST', `/api/acionamentos/${id}/enviar`, carlos)).json()
    expect(d.status).toBe('aguardando')
    expect(d.ultimoEnvioEm).not.toBeNull()
    expect(d.eventos.at(-1).tipo).toBe('enviado')
    expect(
      (await req('PATCH', `/api/acionamentos/${id}/conclusao`, carlos, { comentario: 'x' })).status,
    ).toBe(409)
  })
})

describe('marcar como inviável', () => {
  const formulario = (comentario: string, fotos: number) => {
    const f = new FormData()
    f.set('comentario', comentario)
    for (let i = 0; i < fotos; i++)
      f.append('arquivos', new File([JPEG], `f${i}.jpg`, { type: 'image/jpeg' }))
    return f
  }

  it('direto do "agendado": grava motivo, fotos, início e envia ao gestor', async () => {
    const id = await criarAcionamento(app, gestora)
    const r = await req(
      'POST',
      `/api/acionamentos/${id}/inviavel`,
      carlos,
      formulario('  Portão trancado  ', 2),
    )
    expect(r.status).toBe(200)
    const d = await r.json()
    expect(d).toMatchObject({
      status: 'aguardando',
      inviavel: true,
      inviabilidade: { comentario: 'Portão trancado' },
    })
    expect(d.inviabilidade.fotos).toHaveLength(2)
    expect(d.iniciadoEm).not.toBeNull()
    expect(d.eventos.map((e: { tipo: string }) => e.tipo)).toEqual([
      'criado',
      'iniciado',
      'inviabilidade_enviada',
    ])
  })

  it('exige motivo e foto', async () => {
    const id = await criarAcionamento(app, gestora)
    expect(
      await (
        await req('POST', `/api/acionamentos/${id}/inviavel`, carlos, formulario(' ', 1))
      ).json(),
    ).toMatchObject({ erro: { codigo: 'motivo_obrigatorio' } })
    expect(
      await (
        await req('POST', `/api/acionamentos/${id}/inviavel`, carlos, formulario('x', 0))
      ).json(),
    ).toMatchObject({ erro: { codigo: 'fotos_insuficientes' } })
  })
})
