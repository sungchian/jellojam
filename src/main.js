import { createApp } from 'vue'
import { createPinia } from 'pinia'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import zhTw from 'element-plus/es/locale/lang/zh-tw'
import { createI18n } from 'vue-i18n'

import zh from './locales/zh'
import en from './locales/en'
import App from './App.vue'
import router from './router'
import './styles/global.css'

// ── i18n ──────────────────────────────────────────────────────────────────
const savedLang = localStorage.getItem('jj_lang') || 'zh'

export const i18n = createI18n({
  legacy:        false,       // use Composition API mode
  locale:        savedLang,
  fallbackLocale:'zh',
  messages:      { zh, en },
})

const app = createApp(App)

// Register all Element Plus icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component)
}

app.use(createPinia())
app.use(router)
app.use(ElementPlus, { locale: zhTw })
app.use(i18n)

app.mount('#app')
