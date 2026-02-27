import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import './assets/tailwind.css'
import './assets/main.css'

// Font Awesome
import { library } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
    faHeart, faBagShopping, faHouse, faArrowRight, faBars, faBook, faComments, faEllipsisV, faPen,
    faBoxOpen, faUser, faMagnifyingGlass, faXmark,
    faPaperPlane, faEnvelope, faLock, faRightFromBracket, faEdit, faTrash, faAngleLeft, faAngleRight, faChartLine
} from '@fortawesome/free-solid-svg-icons'
import {
    faHeart as faHeartRegular,
    faUser as faUserRegular
} from '@fortawesome/free-regular-svg-icons'
import {
    faStar as fasStar
} from '@fortawesome/free-solid-svg-icons'
import {
    faStar as farStar
} from '@fortawesome/free-regular-svg-icons'

library.add(
    faHeart, faBagShopping, faHouse, faArrowRight, faBars,
    faMagnifyingGlass, faXmark, faHeartRegular, faUserRegular,
    fasStar, farStar, faPaperPlane, faEnvelope, faLock, faBook,
    faBoxOpen, faUser, faRightFromBracket, faEdit, faTrash, faAngleLeft, faAngleRight, faChartLine, faComments, faEllipsisV, faPen
)

const app = createApp(App)
const pinia = createPinia() //Tạo Pinia store

app.component('font-awesome-icon', FontAwesomeIcon)
app.use(router)
app.use(pinia)              //Dùng Pinia trước khi mount
app.mount('#app')           //Mount cuối cùng
