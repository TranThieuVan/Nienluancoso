// src/stores/auth.js
import { defineStore } from 'pinia'
import axios from '@/utils/axios'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: null,
        token: localStorage.getItem('token') || ''
    }),
    actions: {
        async login(email, password) {
            const res = await axios.post('/auth/login', { email, password })
            this.token = res.data.token
            this.user = res.data.user
            localStorage.setItem('token', res.data.token)
        },
        logout() {
            this.user = null
            this.token = ''
            localStorage.removeItem('token')
        }
    }
})
