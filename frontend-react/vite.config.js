import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Cấu hình Vite dành cho React - Chuyển đổi từ bản Vue của bạn
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            // Giữ nguyên alias '@' để bạn copy code từ Vue sang không bị lỗi path
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5174, // Chạy cổng 5174 để không đụng hàng với Vue (5173)
        proxy: {
            // Kết nối API
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true
            },
            // Kết nối thư mục chứa ảnh (quan trọng để hiện hình ảnh sách)
            '/uploads': {
                target: 'http://localhost:5000',
                changeOrigin: true
            }
        }
    }
})