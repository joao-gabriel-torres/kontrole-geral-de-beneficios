import 'vuetify/styles'
import '@kgb/ui/estilos.css'
import { createApp } from 'vue'
import App from './App.vue'
import { vuetify } from './plugins/vuetify'
import { router } from './router'
import { carregarToken } from './token'

await carregarToken()
createApp(App).use(vuetify).use(router).mount('#app')
