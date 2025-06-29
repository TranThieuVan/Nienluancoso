// src/main.js hoặc src/main.ts
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import './assets/tailwind.css' // Nếu đang dùng TailwindCSS
// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faHeart, faBagShopping, faHouse, faArrowRight, faBars, faUser, faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons'
import { faHeart as faHeartRegular, faUser as faUserRegular } from '@fortawesome/free-regular-svg-icons'
import { faPaperPlane } from '@fortawesome/free-solid-svg-icons'
import { faStar as fasStar } from '@fortawesome/free-solid-svg-icons'
import { faStar as farStar } from '@fortawesome/free-regular-svg-icons'

library.add(faHeart, faBagShopping, faHouse, faArrowRight, faBars, faUser, faMagnifyingGlass, faXmark, faHeartRegular, faUserRegular, fasStar, farStar, faPaperPlane)

const app = createApp(App)
app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)
app.mount('#app')

