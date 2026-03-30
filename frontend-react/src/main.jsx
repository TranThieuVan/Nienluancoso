import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './assets/tailwind.css'
import './assets/main.css'
import ScrollToTop from './components/ScrollToTop'
// Font Awesome Setup
import { library } from '@fortawesome/fontawesome-svg-core'

// Import Icon Solid (fas)
import {
    faHeart, faBagShopping, faHouse, faArrowRight, faBars, faBook, faComments, faCheck, faSliders,
    faEllipsisV, faPen, faBoxOpen, faUser, faMagnifyingGlass, faXmark, faRotateLeft,
    faPaperPlane, faEnvelope, faLock, faRightFromBracket, faEdit, faTrash, faEllipsis,
    faMedal, faCrown, faGem, faCircleCheck, faChevronUp,
    faAngleLeft, faAngleRight, faChartLine, faStar as fasStar, faTruck, faShieldHalved, faMinus,
    faMapMarkerAlt, faPhoneAlt, faQrcode, faMoneyBillWave, faTicketAlt, faBullhorn, faPlus, faChevronDown, faBox, faArrowRightFromBracket,
    faPhone
} from '@fortawesome/free-solid-svg-icons'

// Import Icon Regular (far)
import {
    faHeart as faHeartRegular,
    faUser as faUserRegular,
    faStar as farStar
} from '@fortawesome/free-regular-svg-icons'

// Import Icon Brands (fab)
import { faFacebookF, faInstagram, faXTwitter } from '@fortawesome/free-brands-svg-icons'

// Khởi tạo thư viện
library.add(
    // Solid Icons
    faHeart, faBagShopping, faHouse, faArrowRight, faBars, faBook, faComments, faCheck, faSliders,
    faEllipsisV, faPen, faBoxOpen, faUser, faMagnifyingGlass, faXmark, faRotateLeft, faCircleCheck,
    faPaperPlane, faEnvelope, faLock, faRightFromBracket, faEdit, faTrash, faEllipsis,
    faMedal, faCrown, faGem, faChevronUp,
    faAngleLeft, faAngleRight, faChartLine, fasStar, faTruck, faShieldHalved, faMinus,
    faMapMarkerAlt, faPhoneAlt, faQrcode, faMoneyBillWave, faTicketAlt, faBullhorn, faPlus, faChevronDown, faBox, faArrowRightFromBracket, faPhone,

    // Regular Icons
    faHeartRegular, faUserRegular, farStar,

    // Brand Icons
    faFacebookF, faInstagram, faXTwitter
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