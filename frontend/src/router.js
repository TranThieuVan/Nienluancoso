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
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;