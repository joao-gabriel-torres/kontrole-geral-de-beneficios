import { env } from '../env'
import { ArmazenamentoDisco, type Armazenamento } from './armazenamento'

export const armazenamento: Armazenamento = new ArmazenamentoDisco(env.ARQUIVOS_DIR)
