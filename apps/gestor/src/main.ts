import 'vuetify/styles'
import '@kgb/ui/estilos.css'
import { VueQueryPlugin } from '@tanstack/vue-query'
import { createApp } from 'vue'
import App from './App.vue'
import { criarClienteConsultas } from './consultas'
import { vuetify } from './plugins/vuetify'
import { router } from './router'

createApp(App)
  .use(vuetify)
  .use(router)
  .use(VueQueryPlugin, { queryClient: criarClienteConsultas() })
  .mount('#app')
