import { prisma } from './db'

/** Prestador inativo ou excluído não entra nem mantém sessão. Conta sem vínculo passa. */
export async function prestadorBloqueado(prestadorId: string | null | undefined): Promise<boolean> {
  if (!prestadorId) return false
  const p = await prisma.prestador.findUnique({
    where: { id: prestadorId },
    select: { status: true, excluidoEm: true },
  })
  return !p || p.status !== 'ativo' || p.excluidoEm !== null
}
