import { prepararBancoDeTeste } from '@kgb/db/testes'

export default async function () {
  await prepararBancoDeTeste({ semearDados: true })
}
