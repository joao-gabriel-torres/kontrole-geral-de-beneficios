import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { erroApi, simularApi, type RespostaFalsa } from '../../../test/api-falsa'
import { api } from '../../api'
import { toastGestor } from '../../toast'
import { baixarModeloPlanilha, exportarPlanilha } from './acoes'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))

describe('ações da planilha', () => {
  const planilha = new Blob(['xlsx'])
  let simulada: ReturnType<typeof simularApi>
  let exportacao: () => RespostaFalsa
  let modelo: () => RespostaFalsa
  let baixados: { href: string; download: string }[]

  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-09-29T15:00:00Z') })
    toastGestor.mensagem.value = null
    exportacao = () => ({ data: planilha })
    modelo = () => ({ data: planilha })
    simulada = simularApi(api, {
      'GET /api/prestadores/planilha': () => exportacao(),
      'GET /api/prestadores/planilha/modelo': () => modelo(),
    })
    baixados = []
    URL.createObjectURL = vi.fn(() => 'blob:planilha')
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      baixados.push({ href: this.href, download: this.download })
    })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('Exportar baixa a planilha do dia e avisa', async () => {
    await exportarPlanilha()
    expect(simulada.chamadas('GET', '/api/prestadores/planilha')).toEqual([{ parseAs: 'blob' }])
    expect(URL.createObjectURL).toHaveBeenCalledWith(planilha)
    expect(baixados).toEqual([
      { href: 'blob:planilha', download: 'credenciados-russo-29-09-2026.xlsx' },
    ])
    expect(document.querySelector('a[download]')).toBeNull()
    expect(toastGestor.mensagem.value).toBe('Planilha exportada')
  })

  it('falha ao exportar vira toast e não baixa nada', async () => {
    exportacao = () => erroApi(500, 'interno', 'Erro interno')
    await exportarPlanilha()
    expect(baixados).toEqual([])
    expect(toastGestor.mensagem.value).toBe('Falha ao exportar')
  })

  it('Baixar modelo baixa sem toast', async () => {
    await baixarModeloPlanilha()
    expect(simulada.chamadas('GET', '/api/prestadores/planilha/modelo')).toEqual([
      { parseAs: 'blob' },
    ])
    expect(baixados).toEqual([
      { href: 'blob:planilha', download: 'modelo-credenciados-russo.xlsx' },
    ])
    expect(toastGestor.mensagem.value).toBeNull()
  })

  it('falha ao baixar o modelo vira toast', async () => {
    modelo = () => erroApi(500, 'interno', 'Erro interno')
    await baixarModeloPlanilha()
    expect(baixados).toEqual([])
    expect(toastGestor.mensagem.value).toBe('Falha ao baixar modelo')
  })
})
