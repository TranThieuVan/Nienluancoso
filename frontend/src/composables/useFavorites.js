import axios from 'axios'
import Swal from 'sweetalert2'
import { ref } from 'vue'

export const useFavorites = () => {
    const favorites = ref([])

    const fetchFavorites = async () => {
        const token = localStorage.getItem('token')
        if (!token) return

        try {
            const res = await axios.get('/api/favorites', {
                headers: { Authorization: `Bearer ${token}` }
            })
            favorites.value = res.data.map(b => b._id)
            return res.data // nếu cần data sách
        } catch (err) {
            console.error('Lỗi khi lấy favorites:', err)
        }
    }

    const isFavorite = (bookId) => favorites.value.includes(bookId)

    const toggleFavorite = async (book, removeCallback = null) => {
        const token = localStorage.getItem('token')
        if (!token) return

        const headers = { Authorization: `Bearer ${token}` }

        try {
            if (isFavorite(book._id)) {
                await axios.delete(`/api/favorites/remove/${book._id}`, { headers })
                favorites.value = favorites.value.filter(id => id !== book._id)
                if (removeCallback) removeCallback(book._id) // để xoá khỏi UI nếu cần
                Swal.fire({
                    toast: true,
                    icon: 'info',
                    title: 'Đã xóa khỏi mục yêu thích',
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#fff',
                    color: '#333',
                    iconColor: '#888'
                })
            } else {
                await axios.post('/api/favorites/add', { bookId: book._id }, { headers })
                favorites.value.push(book._id)
                Swal.fire({
                    toast: true,
                    icon: 'success',
                    title: 'Đã thêm vào mục yêu thích',
                    position: 'bottom-end',
                    showConfirmButton: false,
                    timer: 2000,
                    background: '#fff',
                    color: '#333',
                    iconColor: '#e0245e'
                })
            }
        } catch (err) {
            console.error('Lỗi toggle favorite:', err)
        }
    }

    return { favorites, fetchFavorites, toggleFavorite, isFavorite }
}
