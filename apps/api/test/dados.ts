import { SENHA_DEV } from '@kgb/db/seed'
import { hashPassword } from 'better-auth/crypto'
import { prisma } from '../src/db'
import { dataSP } from '../src/dominio/datas'

export const JPEG = new Uint8Array([
  0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
])

export const hojeSP = () => dataSP(new Date())

/** Corpo JSON da resposta, com o tipo que o teste espera. */
export async function corpo<T>(resposta: Response | Promise<Response>): Promise<T> {
  return (await (await resposta).json()) as T
}

/** Garante um login com senha para o prestador (o seed só dá senha ao Carlos) e devolve o e-mail. */
export async function loginDePrestador(prestadorId: string): Promise<string> {
  const email = `${prestadorId}@teste.dev`
  const id = `u-teste-${prestadorId}`
  const existente = await prisma.user.findFirst({ where: { OR: [{ email }, { prestadorId }] } })
  if (existente?.email === email) return email
  if (existente)
    await prisma.user.update({ where: { id: existente.id }, data: { prestadorId: null } })
  await prisma.user.create({
    data: {
      id,
      name: `Teste ${prestadorId}`,
      email,
      role: 'prestador',
      prestadorId,
      accounts: {
        create: {
          id: `conta-${id}`,
          accountId: id,
          providerId: 'credential',
          password: await hashPassword(SENHA_DEV),
        },
      },
    },
  })
  return email
}

export function formularioFoto(
  campos: Record<string, string>,
  arquivo: Uint8Array<ArrayBuffer> = JPEG,
): FormData {
  const formulario = new FormData()
  formulario.set('arquivo', new File([arquivo], 'foto.jpg', { type: 'image/jpeg' }))
  for (const [chave, valor] of Object.entries(campos)) formulario.set(chave, valor)
  return formulario
}

interface AppTestavel {
  request: (caminho: string, init?: RequestInit) => Response | Promise<Response>
}

export async function criarAcionamento(
  app: AppTestavel,
  headersGestor: Record<string, string>,
  extra: Record<string, unknown> = {},
): Promise<string> {
  const r = await app.request('/api/acionamentos', {
    method: 'POST',
    headers: { ...headersGestor, 'content-type': 'application/json' },
    body: JSON.stringify({
      titulo: 'Teste de fluxo',
      cliente: 'Cliente Teste',
      endereco: 'Rua Teste, 1 · Centro',
      data: hojeSP(),
      inicio: '09:00',
      fim: '10:00',
      tipoIds: ['t1'],
      prestadorId: 'p1',
      ...extra,
    }),
  })
  if (r.status !== 201) throw new Error(`criarAcionamento: HTTP ${r.status} ${await r.text()}`)
  return ((await r.json()) as { id: string }).id
}
