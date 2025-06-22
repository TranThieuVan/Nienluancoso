import { createApp } from 'vue'
import App from './App.vue'
import router from './router'  // Import router
import './assets/tailwind.css' // Nếu đang dùng TailwindCSS

const app = createApp(App)
app.use(router)  // Kích hoạt Vue Router
app.mount('#app')