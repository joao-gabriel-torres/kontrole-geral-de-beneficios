import { Hono } from 'hono'
import { armazenamento } from '../arquivos'
import { assinaturaValida } from '../arquivos/assinatura'
import { mimeDaChave } from '../arquivos/imagem'
import type { Ambiente } from '../contexto'
import { prisma } from '../db'
import { corpoErro } from '../erros'
import { PREFIXO_PLACEHOLDER } from '../servicos/serializacao'

/** Leitura das fotos por URL assinada: funciona em <img> sem cookie nem Bearer. */
export const rotasArquivos = new Hono<Ambiente>().get('/api/arquivos/fotos/:id', async (c) => {
  const id = c.req.param('id')
  const { exp = '', sig = '' } = c.req.query()
  if (!assinaturaValida(id, exp, sig)) {
    return c.json(corpoErro('assinatura_invalida', 'Link da foto inválido ou expirado'), 403)
  }
  const foto = await prisma.foto.findUnique({ where: { id }, select: { storageKey: true } })
  const dados =
    foto && !foto.storageKey.startsWith(PREFIXO_PLACEHOLDER)
      ? await armazenamento.abrir(foto.storageKey)
      : null
  if (!foto || !dados) return c.json(corpoErro('nao_encontrado', 'Foto não encontrada'), 404)
  return c.body(dados, 200, {
    'Content-Type': mimeDaChave(foto.storageKey),
    'Cache-Control': 'private, max-age=3600',
  })
})
