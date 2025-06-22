import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './assets/main.css';
import './assets/main.css'
import { createPinia } from 'pinia'
// ...
createApp(App).use(router).use(createPinia()).mount('#app')
