import { defineStore } from 'pinia'

export const useAuthStore = defineStore('auth', {
    state: () => ({
        user: JSON.parse(localStorage.getItem('user')) || null,
        token: localStorage.getItem('token') || null
    }),
    getters: {
        isLoggedIn: (state) => !!state.token,
        isAdmin: (state) => state.user?.role === 'admin',
        isUser: (state) => state.user?.role === 'user',
    },
    actions: {
        login(userData, token) {
            this.user = userData
            this.token = token
            localStorage.setItem('user', JSON.stringify(userData))
            localStorage.setItem('token', token)
        },
        logout() {
            this.user = null
            this.token = null
            localStorage.removeItem('user')
            localStorage.removeItem('token')
        },
        loadFromLocalStorage() {
            this.user = JSON.parse(localStorage.getItem('user')) || null
            this.token = localStorage.getItem('token') || null
        }
    }
})
