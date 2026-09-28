import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { ArmazenamentoDisco, type Armazenamento } from './armazenamento'

describe('ArmazenamentoDisco', () => {
  let disco: Armazenamento
  beforeEach(async () => {
    disco = new ArmazenamentoDisco(await mkdtemp(join(tmpdir(), 'kgb-disco-')))
  })

  it('salva, lê e remove um arquivo', async () => {
    await disco.salvar('ac1/foto.jpg', new Uint8Array([1, 2, 3]), 'image/jpeg')
    expect(await disco.abrir('ac1/foto.jpg')).toEqual(new Uint8Array([1, 2, 3]))
    await disco.remover('ac1/foto.jpg')
    expect(await disco.abrir('ac1/foto.jpg')).toBeNull()
  })
  it('remover o que não existe não é erro', async () => {
    await expect(disco.remover('nao/existe.jpg')).resolves.toBeUndefined()
  })
  it('não deixa a chave sair da pasta', async () => {
    await expect(disco.salvar('../fora.jpg', new Uint8Array([1]), 'image/jpeg')).rejects.toThrow(
      /inválida/,
    )
    await expect(disco.abrir('../../etc/hosts')).rejects.toThrow(/inválida/)
  })
})
