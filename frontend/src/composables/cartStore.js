// src/composables/cartStore.js
import { ref } from 'vue'

export const cartCount = ref(0)

export const setCartCount = (count) => {
    cartCount.value = count
}

export const incrementCartCount = (delta = 1) => {
    cartCount.value += delta
}

export const decrementCartCount = (delta = 1) => {
    cartCount.value = Math.max(0, cartCount.value - delta)
}
