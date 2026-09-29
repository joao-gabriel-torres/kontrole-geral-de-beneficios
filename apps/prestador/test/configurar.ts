import { enableAutoUnmount } from '@vue/test-utils'
import ResizeObserver from 'resize-observer-polyfill'
import { afterEach, expect } from 'vitest'

globalThis.ResizeObserver ??= ResizeObserver

// Node 25+ tem um localStorage global próprio que, sem --localstorage-file, fica indefinido e
// esconde o do jsdom. Nos testes, usamos o do jsdom (é ele que o @capacitor/preferences usa na web).
const { jsdom } = globalThis as unknown as { jsdom?: { window: Window } }
if (!globalThis.localStorage && jsdom) {
  Object.defineProperty(globalThis, 'localStorage', {
    value: jsdom.window.localStorage,
    configurable: true,
  })
}

// Um componente esquecido no body continua com timers e observers ativos e atrapalha os testes
// seguintes (foco, document.querySelector). Os afterEach rodam em pilha (o último registrado roda
// primeiro): a conferência vem antes no arquivo para rodar depois da desmontagem automática.
afterEach(() => {
  expect(document.body.innerHTML, 'algum teste deixou elementos no body').toBe('')
})
enableAutoUnmount(afterEach)
