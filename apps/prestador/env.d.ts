/// <reference types="vite/client" />
import 'vue-router'

declare module 'vue-router' {
  interface RouteMeta {
    publica?: boolean
    /** Tela cheia, sem a barra de abas (Detalhe do acionamento). */
    semAbas?: boolean
  }
}
