import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './assets/tailwind.css'
import './assets/main.css'
import ScrollToTop from './components/ScrollToTop'
// Font Awesome Setup
import { library } from '@fortawesome/fontawesome-svg-core'
import {
    faHeart, faBagShopping, faHouse, faArrowRight, faBars, faBook, faComments, faCheck, faSliders,
    faEllipsisV, faPen, faBoxOpen, faUser, faMagnifyingGlass, faXmark, faRotateLeft,
    faPaperPlane, faEnvelope, faLock, faRightFromBracket, faEdit, faTrash,
    faAngleLeft, faAngleRight, faChartLine, faStar as fasStar, faTruck, faShieldHalved, faMinus,
    faMapMarkerAlt, faPhoneAlt, faQrcode, faMoneyBillWave, faTicketAlt, faBullhorn, faPlus, faChevronDown, faBox, faArrowRightFromBracket,
    faPhone // ✅ THÊM DÒNG NÀY (Icon định vị)
} from '@fortawesome/free-solid-svg-icons'
import {
    faHeart as faHeartRegular,
    faUser as faUserRegular,
    faStar as farStar
} from '@fortawesome/free-regular-svg-icons'
import { faFacebookF, faInstagram, faXTwitter } from '@fortawesome/free-brands-svg-icons'

library.add(
    faHeart, faBagShopping, faHouse, faArrowRight, faBars,
    faMagnifyingGlass, faXmark, faHeartRegular, faUserRegular,
    fasStar, farStar, faPaperPlane, faEnvelope, faLock, faBook,
    faBoxOpen, faUser, faRightFromBracket, faEdit, faTrash, faRotateLeft,
    faAngleLeft, faAngleRight, faChartLine, faComments, faEllipsisV, faPen,
    faMapMarkerAlt, faPhoneAlt, faMoneyBillWave, faQrcode, faTicketAlt, faBullhorn, faPlus, faCheck, faFacebookF, faInstagram, faXTwitter,
    faChevronDown, faBox, faArrowRightFromBracket,
    faPhone, faSliders, faTruck, faShieldHalved, faMinus // ✅ THÊM DÒNG NÀY ĐỂ KÍCH HOẠT ICON
)

import { FavoritesProvider } from './composables/useFavorites'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <ScrollToTop />

            <FavoritesProvider>
                <App />
            </FavoritesProvider>

        </BrowserRouter>
    </React.StrictMode>
)