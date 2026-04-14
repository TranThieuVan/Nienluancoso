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
    faHeart, faBagShopping, faHouse, faArrowRight, faBars, faBook, faComments, faCheck, faSliders, faGear,
    faEllipsisV, faPen, faBoxOpen, faUser, faMagnifyingGlass, faXmark, faRotateLeft, faChartPie, faUsers,
    faPaperPlane, faEnvelope, faLock, faRightFromBracket, faEdit, faTrash, faEllipsis, faCircleXmark, faBolt,
    faMedal, faCrown, faGem, faCircleCheck, faChevronUp, faArrowLeft, faBan, faClipboardList, faCircleInfo, faTriangleExclamation,
    faAngleLeft, faAngleRight, faChartLine, faStar as fasStar, faTruck, faShieldHalved, faMinus, faChevronRight,
    faMapMarkerAlt, faPhoneAlt, faQrcode, faMoneyBillWave, faTicketAlt, faBullhorn, faPlus, faChevronDown, faBox, faArrowRightFromBracket,
    faPhone
} from '@fortawesome/free-solid-svg-icons'

// Import Icon Regular (far)
import {
    faHeart as faHeartRegular,
    faUser as faUserRegular,
    faStar as farStar,
    faBell as faBellRegular // <-- ĐÃ THÊM ICON CHUÔNG Ở ĐÂY
} from '@fortawesome/free-regular-svg-icons'

// Import Icon Brands (fab)
import { faFacebookF, faInstagram, faXTwitter } from '@fortawesome/free-brands-svg-icons'

// Khởi tạo thư viện
library.add(
    // Solid Icons
    faHeart, faBagShopping, faHouse, faArrowRight, faBars, faBook, faComments, faCheck, faSliders, faGear,
    faEllipsisV, faPen, faBoxOpen, faUser, faMagnifyingGlass, faXmark, faRotateLeft, faCircleCheck,
    faPaperPlane, faEnvelope, faLock, faRightFromBracket, faEdit, faTrash, faEllipsis, faChartPie, faUsers, faBolt,
    faMedal, faCrown, faGem, faChevronUp, faArrowLeft, faBan, faClipboardList, faCircleInfo, faTriangleExclamation,
    faAngleLeft, faAngleRight, faChartLine, fasStar, faTruck, faShieldHalved, faMinus, faChevronRight, faCircleXmark,
    faMapMarkerAlt, faPhoneAlt, faQrcode, faMoneyBillWave, faTicketAlt, faBullhorn, faPlus, faChevronDown, faBox, faArrowRightFromBracket, faPhone,

    // Regular Icons
    faHeartRegular, faUserRegular, farStar, faBellRegular, // <-- ĐÃ THÊM VÀO LIBRARY

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