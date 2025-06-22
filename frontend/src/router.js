import { createRouter, createWebHistory } from "vue-router";
import Home from "./views/Home.vue";
import Login from "./views/Login.vue";
import Register from "./views/Register.vue";
import AdminLogin from "./views/AdminLogin.vue";
const routes = [

    { path: "/", component: Home },
    { path: "/login", component: Login },
    { path: "/register", component: Register },

    {
        path: "/admin",
        redirect: "/admin/login", // ✅ Khi vào /admin thì tự động chuyển sang /admin/login
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes,
});

export default router;