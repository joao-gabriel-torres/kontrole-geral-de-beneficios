import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import FormularioLogin from './FormularioLogin.vue'

const montar = (props: Record<string, unknown> = {}) =>
  mount(FormularioLogin, {
    props: { subtitulo: 'Gestão de demandas', erro: null, enviando: false, ...props },
    global: { plugins: [createVuetify()] },
  })

describe('FormularioLogin', () => {
  it('emite e-mail (sem espaços) e senha ao enviar', async () => {
    const tela = montar()
    await tela.find('input[type="email"]').setValue('  renata@russo.dev ')
    await tela.find('input[type="password"]').setValue('russo2026')
    await tela.find('form').trigger('submit')
    expect(tela.emitted('enviar')).toEqual([['renata@russo.dev', 'russo2026']])
  })
  it('liga os rótulos aos campos (acessibilidade e testes por rótulo)', () => {
    const tela = montar()
    expect(tela.find('label[for="login-email"]').text()).toBe('E-mail')
    expect(tela.find('#login-email').element.tagName).toBe('INPUT')
    expect(tela.find('#login-senha').element.tagName).toBe('INPUT')
  })
  it('não envia com campos vazios', async () => {
    const tela = montar()
    await tela.find('form').trigger('submit')
    expect(tela.emitted('enviar')).toBeUndefined()
  })
  it('mostra o aviso recebido (senha criada pelo convite) depois de montar', async () => {
    const aviso = 'Senha criada. Entre com seu e-mail e a nova senha.'
    const tela = montar({ aviso })
    const regiao = tela.find('p[role="status"]')
    // A região nasce vazia e o texto entra depois: região viva que monta já
    // preenchida não é anunciada por muitos leitores de tela.
    expect(regiao.text()).toBe('')
    await nextTick()
    expect(regiao.text()).toBe(aviso)
    expect(regiao.classes()).not.toContain('vazio')
  })
  it('sem aviso, a região viva continua montada, vazia e fora do fluxo', async () => {
    const tela = montar()
    const regiao = tela.find('p[role="status"]')
    expect(regiao.exists()).toBe(true)
    await nextTick()
    expect(regiao.text()).toBe('')
    // Vazia, não pode ocupar espaço (o cartão usa gap) nem desenhar a faixa verde.
    expect(regiao.classes()).toContain('vazio')
  })
  it('mostra o erro recebido', () => {
    expect(montar({ erro: 'E-mail ou senha incorretos' }).find('p[role="alert"]').text()).toBe(
      'E-mail ou senha incorretos',
    )
  })
})
