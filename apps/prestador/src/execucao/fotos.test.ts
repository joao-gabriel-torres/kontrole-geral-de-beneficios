import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  dimensoesAlvo,
  isoComFuso,
  LADO_MAXIMO,
  prepararArquivo,
  QUALIDADE_JPEG,
  redimensionar,
} from './fotos'

describe('dimensoesAlvo', () => {
  it('reduz a paisagem para 1600px no lado maior', () => {
    expect(dimensoesAlvo(4000, 3000)).toEqual({ largura: 1600, altura: 1200, fator: 0.4 })
  })

  it('reduz o retrato pelo lado maior (a altura)', () => {
    expect(dimensoesAlvo(3000, 4000)).toEqual({ largura: 1200, altura: 1600, fator: 0.4 })
  })

  it('não amplia fotos menores que o limite', () => {
    expect(dimensoesAlvo(800, 600)).toEqual({ largura: 800, altura: 600, fator: 1 })
    expect(dimensoesAlvo(1600, 900)).toEqual({ largura: 1600, altura: 900, fator: 1 })
  })

  it('arredonda e nunca chega a zero', () => {
    expect(dimensoesAlvo(4032, 3024)).toEqual({ largura: 1600, altura: 1200, fator: 1600 / 4032 })
    expect(dimensoesAlvo(1601, 1)).toMatchObject({ largura: 1600, altura: 1 })
  })

  it('usa os valores do spec', () => {
    expect(LADO_MAXIMO).toBe(1600)
    expect(QUALIDADE_JPEG).toBe(0.8)
  })
})

describe('isoComFuso', () => {
  it('grava a hora local com o fuso (TZ dos testes: America/Sao_Paulo)', () => {
    expect(isoComFuso(new Date('2026-09-28T18:10:05Z'))).toBe('2026-09-28T15:10:05-03:00')
    expect(isoComFuso(new Date('2026-01-02T02:03:04Z'))).toBe('2026-01-01T23:03:04-03:00')
  })
})

describe('prepararArquivo', () => {
  afterEach(() => vi.useRealTimers())

  it('marca tiradaEm no momento da captura, antes de redimensionar', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-09-28T18:10:00Z'))
    const reduzida = new Blob(['jpeg'], { type: 'image/jpeg' })
    const reduzir = vi.fn(async () => {
      vi.setSystemTime(new Date('2026-09-28T18:10:09Z'))
      return reduzida
    })
    const original = new File(['x'], 'foto.heic', { type: 'image/heic' })
    const foto = await prepararArquivo(original, reduzir)
    expect(reduzir).toHaveBeenCalledWith(original)
    expect(foto).toEqual({ arquivo: reduzida, tiradaEm: '2026-09-28T15:10:00-03:00' })
  })
})

describe('redimensionar', () => {
  /** O que o contexto 2D e o canvas receberam, em ordem. */
  let chamadas: string[]
  /** O canvas que o redimensionar criou e as medidas dele no momento do toBlob. */
  let canvas: HTMLCanvasElement | undefined
  let medidasNoToBlob: [number, number] | undefined
  let fecharBitmap: ReturnType<typeof vi.fn>
  let gerarBlob: () => Blob | null
  const jpeg = new Blob(['jpeg'], { type: 'image/jpeg' })
  const original = new Blob(['png'], { type: 'image/png' })

  const bitmap = (largura: number, altura: number) => ({
    width: largura,
    height: altura,
    close: fecharBitmap,
  })

  beforeEach(() => {
    chamadas = []
    canvas = undefined
    medidasNoToBlob = undefined
    fecharBitmap = vi.fn()
    gerarBlob = () => jpeg
    const criarElemento = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const elemento = criarElemento(tag)
      if (elemento instanceof HTMLCanvasElement) canvas = elemento
      return elemento
    })
    // O jsdom não tem canvas: um contexto falso registra o que foi desenhado.
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function () {
      return {
        set fillStyle(cor: string) {
          chamadas.push(`fillStyle ${cor}`)
        },
        fillRect: (...a: number[]) => chamadas.push(`fillRect ${a.join(',')}`),
        drawImage: (_fonte: unknown, ...a: number[]) => chamadas.push(`drawImage ${a.join(',')}`),
      } as unknown as CanvasRenderingContext2D
    } as unknown as HTMLCanvasElement['getContext'])
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
      this: HTMLCanvasElement,
      pronto: BlobCallback,
      tipo?: string,
      qualidade?: number,
    ) {
      medidasNoToBlob = [this.width, this.height]
      chamadas.push(`toBlob ${tipo} ${qualidade}`)
      pronto(gerarBlob())
    })
  })
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('reduz 4000×3000 para 1600×1200 e gera JPEG 0,8', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap(4000, 3000)),
    )
    expect(await redimensionar(original)).toBe(jpeg)
    expect(medidasNoToBlob).toEqual([1600, 1200])
    expect(chamadas.at(-1)).toBe('toBlob image/jpeg 0.8')
  })

  it('pinta o fundo de branco antes de desenhar: PNG transparente não sai preto no JPEG', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap(4000, 3000)),
    )
    await redimensionar(original)
    expect(chamadas.slice(0, 3)).toEqual([
      'fillStyle #fff',
      'fillRect 0,0,1600,1200',
      'drawImage 0,0,1600,1200',
    ])
  })

  it('libera o canvas (0×0) e o bitmap depois de gerar o JPEG', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap(4000, 3000)),
    )
    await redimensionar(original)
    expect([canvas!.width, canvas!.height]).toEqual([0, 0])
    expect(fecharBitmap).toHaveBeenCalled()
  })

  it('se o toBlob falhar, rejeita e ainda assim libera o canvas e o bitmap', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => bitmap(800, 600)),
    )
    gerarBlob = () => null
    await expect(redimensionar(original)).rejects.toThrow('Falha ao gerar o JPEG')
    expect([canvas!.width, canvas!.height]).toEqual([0, 0])
    expect(fecharBitmap).toHaveBeenCalled()
  })

  describe('quando o createImageBitmap não aceita o formato (a <img> decodifica)', () => {
    let decodificar: ReturnType<typeof vi.fn>

    beforeEach(() => {
      vi.stubGlobal(
        'createImageBitmap',
        vi.fn(async () => {
          throw new Error('formato não suportado')
        }),
      )
      vi.stubGlobal('URL', {
        createObjectURL: vi.fn(() => 'blob:temporaria'),
        revokeObjectURL: vi.fn(),
      })
      // O jsdom não implementa decode() nem as medidas naturais da imagem.
      decodificar = vi.fn(async () => {})
      Object.defineProperty(HTMLImageElement.prototype, 'decode', {
        value: decodificar,
        configurable: true,
      })
      vi.spyOn(HTMLImageElement.prototype, 'naturalWidth', 'get').mockReturnValue(3000)
      vi.spyOn(HTMLImageElement.prototype, 'naturalHeight', 'get').mockReturnValue(4000)
    })
    afterEach(() => {
      delete (HTMLImageElement.prototype as Partial<HTMLImageElement>).decode
    })

    it('reduz pela <img> e revoga a URL temporária depois', async () => {
      expect(await redimensionar(original)).toBe(jpeg)
      expect(medidasNoToBlob).toEqual([1200, 1600])
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:temporaria')
    })

    it('se a <img> também não decodificar, rejeita e revoga a URL temporária', async () => {
      decodificar.mockRejectedValue(new Error('imagem corrompida'))
      await expect(redimensionar(original)).rejects.toThrow('imagem corrompida')
      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:temporaria')
    })
  })
})
