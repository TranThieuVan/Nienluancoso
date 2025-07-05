import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import Login from "./views/Login.vue";
import Register from "./views/Register.vue";
import AdminLogin from "./views/admin/AdminLogin.vue";
import AdminBookList from '@/views/admin/AdminBookList.vue'
import AddBook from '@/views/admin/AddBook.vue'
import EditBook from '@/views/admin/EditBook.vue'
import Cart from '@/views/Cart.vue'
import BookDetail from '@/views/BookDetail.vue';
import Favorites from '@/views/Favorites.vue'
import Orders from '@/views/Orders.vue'
const routes = [

    { path: "/", component: Home },
    { path: "/login", component: Login },
    { path: "/register", component: Register },

    {
        path: "/admin",
        redirect: "/admin/login", // ✅ Khi vào /admin thì tự động chuyển sang /admin/login
    },
    {
        path: '/admin/books',
        name: 'AdminBookList',
        component: AdminBookList,
    },
    {
        path: '/admin/add-book',
        name: 'AddBook',
        component: AddBook
    },
    {
        path: '/admin/edit-book/:id',
        name: 'EditBook',
        component: EditBook,
        props: true
    },
    { path: "/books", name: "BookList", component: () => import('./views/BookList.vue') },
    {
        path: '/cart',
        name: 'Cart',
        component: Cart,
    },
    { path: '/books/:id', name: 'BookDetail', component: BookDetail },
    {
        path: '/favorites',
        name: 'Favorites',
        component: Favorites,
        // meta: { requiresAuth: true } // nếu bạn có middleware kiểm tra đăng nhập
    },
    {
        path: '/profile',
        name: 'Profile',
        component: () => import('@/views/Profile.vue'),
        meta: { requiresAuth: true }
    },
    {
        path: '/checkout',
        name: 'Checkout',
        component: () => import('@/views/Checkout.vue'),
        meta: { requiresAuth: true } // nếu cần đăng nhập mới cho checkout
    },
    {
        path: '/orders',
        name: 'Orders',
        component: Orders,
        meta: { requiresAuth: true } // nếu bạn có middleware check đăng nhập
    },
    {
        path: '/search',
        name: 'SearchResults',
        component: () => import('@/views/SearchResults.vue') // file kết quả tìm kiếm
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;