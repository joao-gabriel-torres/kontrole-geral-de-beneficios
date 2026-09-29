import { prisma } from './db'

/**
 * Prestador excluído não entra nem mantém sessão. O inativo continua entrando: desativar só tira
 * o prestador da escolha do Novo acionamento, e ele conclui os atendimentos que já tem. Conta sem
 * vínculo passa.
 */
export async function prestadorBloqueado(prestadorId: string | null | undefined): Promise<boolean> {
  if (!prestadorId) return false
  const p = await prisma.prestador.findUnique({
    where: { id: prestadorId },
    select: { excluidoEm: true },
  })
  return !p || p.excluidoEm !== null
}
