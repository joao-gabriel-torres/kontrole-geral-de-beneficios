import { describe, expect, it, vi } from 'vitest'
import { montar } from '../../../test/montar'
import { PREVIA_EXEMPLO } from '../teste/dados'
import type { PreviaPlanilha } from './estado'
import ModalImportacao from './ModalImportacao.vue'

vi.mock('../../api', () => ({
  api: { GET: vi.fn(), POST: vi.fn() },
  auth: {},
  BASE_API: 'http://api.test',
}))
vi.mock('../../sessao', () => ({ sessao: { usuario: { id: 'u-renata' } }, sair: vi.fn() }))

const arquivo = new File(['x'], 'credenciados.csv')
const conferir = async (previa: PreviaPlanilha) =>
  (await montar(ModalImportacao, { props: { arquivo, previa } })).tela

/** A prévia de exemplo como a API manda agora: Fernanda com "Jardinagem" ignorada. */
const COM_IGNORADAS: PreviaPlanilha = {
  ...PREVIA_EXEMPLO,
  linhas: PREVIA_EXEMPLO.linhas.map((l) => ({
    ...l,
    especialidadesIgnoradas: l.especialidades.filter((e) => e === 'Jardinagem'),
  })),
  novosComEmail: 2,
}

describe('ModalImportacao', () => {
  it('especialidade não reconhecida aparece marcada como ignorada', async () => {
    const itens = (await conferir(COM_IGNORADAS)).findAll('.item')
    const fernanda = itens[3]!
    expect(fernanda.find('.especialidades').text()).toBe(
      'limpeza de ar condicionado, Jardinagem (ignorada)',
    )
    expect(fernanda.findAll('.ignorada').map((e) => e.text())).toEqual(['Jardinagem (ignorada)'])
    expect(itens[0]!.find('.especialidades').text()).toBe(
      'Vazamento, Revisão elétrica, Ponto de luz',
    )
    expect(itens[0]!.findAll('.ignorada')).toHaveLength(0)
  })

  it('sem especialidades, mostra "—"', async () => {
    const [primeira] = PREVIA_EXEMPLO.linhas
    const tela = await conferir({
      ...PREVIA_EXEMPLO,
      linhas: [{ ...primeira!, especialidades: [], especialidadesIgnoradas: [] }],
    })
    expect(tela.find('.especialidades').text()).toBe('—')
  })

  it('com novos que têm e-mail, avisa que o convite não é automático', async () => {
    const tela = await conferir(COM_IGNORADAS)
    expect(tela.find('.aviso-convite').text()).toBe(
      'Os novos credenciados não recebem convite automático; envie pelo Editar de cada um.',
    )
  })

  it('sem novos com e-mail, não avisa', async () => {
    for (const previa of [PREVIA_EXEMPLO, { ...COM_IGNORADAS, novosComEmail: 0 }]) {
      const tela = await conferir(previa)
      expect(tela.find('.aviso-convite').exists()).toBe(false)
      tela.unmount()
    }
  })
})
