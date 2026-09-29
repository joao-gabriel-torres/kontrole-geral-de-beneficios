import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { criarApp, INFO_OPENAPI } from '../src/app'

const destino = fileURLToPath(new URL('../../../packages/api-client/openapi.json', import.meta.url))
const documento = criarApp().getOpenAPI31Document(INFO_OPENAPI)
writeFileSync(destino, `${JSON.stringify(documento, null, 2)}\n`)
console.log(`OpenAPI gravado em ${destino}`)
process.exit(0)
