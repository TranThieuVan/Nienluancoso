import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '@/views/LoginView.vue'
import BookListView from '@/views/BookListView.vue'

const routes = [
  { path: '/', redirect: '/admin/books' },
  { path: '/admin/login', component: LoginView },
  { path: '/admin/books', component: BookListView },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
