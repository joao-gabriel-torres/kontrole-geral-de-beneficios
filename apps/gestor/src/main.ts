import 'vuetify/styles'
import '@kgb/ui/estilos.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import App from './App.vue'
import { criarClienteConsultas } from './consultas'
import { vuetify } from './plugins/vuetify'
import { router } from './router'
import { perderSessao } from './sessao'

const consultas = criarClienteConsultas(() => void perderSessao(router, consultas))
createApp(App)
  .use(vuetify)
  .use(router)
  .use(VueQueryPlugin, { queryClient: consultas })
  .mount('#app')
