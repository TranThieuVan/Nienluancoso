import { createRouter, createWebHistory } from 'vue-router'

// 📦 Layouts
import UserLayout from '@/layouts/UserLayout.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

// 📦 Pages người dùng
import Home from '@/views/Home.vue'
import Login from '@/views/Login.vue'
import Register from '@/views/Register.vue'
import Cart from '@/views/Cart.vue'
import BookDetail from '@/views/BookDetail.vue'
import Favorites from '@/views/Favorites.vue'
import Orders from '@/views/Orders.vue'
import Profile from '@/views/Profile.vue'
import Checkout from '@/views/Checkout.vue'
import SearchResults from '@/views/SearchResults.vue'
import BookList from './views/BookList.vue'
// 📦 Pages admin
import AdminDashboard from '@/views/admin/AdminDashboard.vue'
import AdminBookList from '@/views/admin/AdminBookList.vue'
import AddBook from '@/views/admin/AddBook.vue'
import EditBook from '@/views/admin/EditBook.vue'
import AdminUsers from '@/views/admin/AdminUsers.vue'
import AdminOrders from '@/views/admin/AdminOrders.vue'
import AdminCommentList from '@/views/admin/AdminCommentList.vue';

const routes = [
    // ✅ Đăng nhập / đăng ký: dùng layout riêng
    {
        path: '/login',
        component: () => import('@/layouts/AuthLayout.vue'),
        children: [{ path: '', name: 'Login', component: Login }]
    },
    {
        path: '/register',
        component: () => import('@/layouts/AuthLayout.vue'),
        children: [{ path: '', name: 'Register', component: Register }]
    },

    // 🧑‍💻 Các trang người dùng (dùng UserLayout)
    {
        path: '/',
        component: UserLayout,
        children: [
            { path: '', name: 'Home', component: Home },
            { path: 'books/:id', name: 'BookDetail', component: BookDetail },
            { path: 'favorites', name: 'Favorites', component: Favorites },
            { path: 'cart', name: 'Cart', component: Cart },
            { path: 'search', name: 'SearchResults', component: SearchResults },
            { path: 'books', name: 'BookList', component: BookList }, // ✅ Thêm route này để hiển thị danh sách sách
            {
                path: 'books/view-all',
                name: 'ViewAllBooks',
                component: () => import('@/views/ViewAllBooks.vue')
            },
            {
                path: 'profile',
                name: 'Profile',
                component: Profile,
                meta: { requiresAuth: true }
            },
            {
                path: 'checkout',
                name: 'Checkout',
                component: Checkout,
                meta: { requiresAuth: true }
            },
            {
                path: 'orders',
                name: 'Orders',
                component: Orders,
                meta: { requiresAuth: true }
            }
        ]
    },

    // 🛠️ Khu vực admin (dùng AdminLayout)
    {
        path: '/admin',
        component: AdminLayout,
        children: [
            { path: '', name: 'AdminDashboard', component: AdminDashboard },
            { path: 'books', name: 'AdminBookList', component: AdminBookList },
            { path: 'add-book', name: 'AddBook', component: AddBook },
            {
                path: 'edit-book/:id',
                name: 'EditBook',
                component: EditBook,
                props: true
            },
            { path: 'orders', name: 'AdminOrders', component: AdminOrders },
            { path: 'users', name: 'AdminUsers', component: AdminUsers },
            {
                path: 'orders/:id',
                name: 'AdminOrderDetail',
                component: () => import('@/views/admin/AdminOrderDetail.vue'),
                meta: { requiresAuth: true, requiresAdmin: true }
            },
            {
                path: 'revenue', // ✅ CHỈ sửa dòng này
                name: 'AdminRevenue',
                component: () => import('@/views/admin/AdminRevenue.vue'),
                meta: { requiresAdmin: true }
            },
            { path: 'comments', name: 'AdminComments', component: AdminCommentList },
            {
                path: 'messages',
                name: 'AdminMessages',
                component: () => import('@/views/admin/AdminMessages.vue'),
                meta: { requiresAdmin: true }
            }

        ]
    }
]

const router = createRouter({
    history: createWebHistory(),
    routes
})

// 🛡️ Middleware xác thực token cho admin
router.beforeEach((to, from, next) => {
    const isAdminRoute = to.path.startsWith('/admin')
    const adminToken = localStorage.getItem('adminToken')

    if (isAdminRoute && !adminToken) {
        return next('/login') // nếu chưa đăng nhập admin → về login chung
    }

    if (isAdminRoute) {
        localStorage.removeItem('token') // vào admin → xoá token user
    } else {
        localStorage.removeItem('adminToken') // ra ngoài → xoá token admin
    }

    next()
})

export default router
