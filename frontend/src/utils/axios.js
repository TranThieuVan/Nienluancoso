// src/utils/axios.js
import axios from 'axios'

const instance = axios.create({
    baseURL: 'http://localhost:5000/api', // ⚠️ Đúng URL backend của bạn
    headers: {
        'Content-Type': 'application/json'
    }
})

// Tự động thêm token nếu có
instance.interceptors.request.use(config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

export default instance
