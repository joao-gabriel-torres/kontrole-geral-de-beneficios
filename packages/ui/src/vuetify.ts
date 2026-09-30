import type { VuetifyOptions } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { cores } from './tokens'

export interface OpcoesTemaRusso {
  /** Fundo do app: #F9F9F9 no gestor, branco no prestador. */
  fundo?: string
}

export function opcoesVuetify({ fundo = cores.superficie1 }: OpcoesTemaRusso = {}): VuetifyOptions {
  return {
    theme: {
      defaultTheme: 'russo',
      themes: {
        russo: {
          dark: false,
          colors: {
            background: fundo,
            surface: cores.branco,
            'on-background': cores.tinta,
            'on-surface': cores.tinta,
            primary: cores.primaria,
            'primary-darken-1': cores.primariaHover,
            secondary: cores.laranja,
            error: cores.perigo,
            success: cores.sucesso,
            warning: cores.laranja,
            info: cores.primaria,
            // O Vuetify escolhe o texto pelo contraste calculado e pôs tinta escura sobre o azul.
            'on-primary': cores.branco,
            'on-secondary': cores.branco,
            'on-error': cores.branco,
            'on-success': cores.branco,
            'on-warning': cores.branco,
            'on-info': cores.branco,
          },
        },
      },
    },
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } },
    defaults: {
      global: { ripple: false },
      VBtn: { variant: 'flat', height: 48 },
      VTextField: { variant: 'outlined', density: 'comfortable', hideDetails: 'auto' },
      VCard: { elevation: 0 },
    },
  }
}
