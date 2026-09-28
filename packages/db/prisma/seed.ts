import '../src/carregar-env'
import { criarPrisma } from '../src/index'
import { semear, verificarAmbienteSeed } from '../src/seed/index'

verificarAmbienteSeed()
const prisma = criarPrisma()
try {
  const r = await semear(prisma)
  console.log(
    `Seed concluído: ${r.tipos} tipos, ${r.prestadores} prestadores, ${r.usuarios} usuários, ${r.acionamentos} acionamentos.`,
  )
} finally {
  await prisma.$disconnect()
}
