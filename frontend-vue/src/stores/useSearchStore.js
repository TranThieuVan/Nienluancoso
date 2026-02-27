import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useSearchStore = defineStore('search', () => {
    const query = ref('')
    const setQuery = (q) => {
        query.value = q
    }

    return { query, setQuery }
})
