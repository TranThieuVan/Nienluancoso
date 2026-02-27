import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './assets/tailwind.css'
import './assets/main.css'

// Font Awesome Setup
import { library } from '@fortawesome/fontawesome-svg-core'
import {
    faHeart, faBagShopping, faHouse, faArrowRight, faBars, faBook, faComments,
    faEllipsisV, faPen, faBoxOpen, faUser, faMagnifyingGlass, faXmark,
    faPaperPlane, faEnvelope, faLock, faRightFromBracket, faEdit, faTrash,
    faAngleLeft, faAngleRight, faChartLine, faStar as fasStar,
    faMapMarkerAlt, faPhoneAlt // ✅ THÊM DÒNG NÀY (Icon định vị)
} from '@fortawesome/free-solid-svg-icons'
import {
    faHeart as faHeartRegular,
    faUser as faUserRegular,
    faStar as farStar
} from '@fortawesome/free-regular-svg-icons'

library.add(
    faHeart, faBagShopping, faHouse, faArrowRight, faBars,
    faMagnifyingGlass, faXmark, faHeartRegular, faUserRegular,
    fasStar, farStar, faPaperPlane, faEnvelope, faLock, faBook,
    faBoxOpen, faUser, faRightFromBracket, faEdit, faTrash,
    faAngleLeft, faAngleRight, faChartLine, faComments, faEllipsisV, faPen,
    faMapMarkerAlt, faPhoneAlt // ✅ THÊM DÒNG NÀY ĐỂ KÍCH HOẠT ICON
)

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <BrowserRouter>
            <App />
        </BrowserRouter>
    </React.StrictMode>
)