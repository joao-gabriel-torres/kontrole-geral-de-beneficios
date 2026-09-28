import ResizeObserver from 'resize-observer-polyfill'

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
