<!-- src/layouts/UserLayout.vue -->
<template>
  <div>
    <Navbar />
    <router-view />

    <!--hộp chat người dùng -->
<ChatIcon @toggle="showChat = !showChat" />
    
    <Transition name="chat-slide">
      <ChatBox
        v-if="showChat && user && user.id"
        @close="showChat = false"
        :user-id="user.id"
      />
    </Transition>

    <Footer />
  </div>
</template>

<script setup>
import Navbar from '@/components/Navbar.vue'
import ChatIcon from '@/components/ChatIcon.vue'
import ChatBox from '@/components/ChatBox.vue'
import Footer from '@/components/Footer.vue'
import { useAuthStore } from '@/stores/auth'
import { ref, computed, watchEffect } from 'vue'
import { onMounted } from 'vue'
const auth = useAuthStore()
onMounted(() => {
  auth.loadFromLocalStorage()
})
const showChat = ref(false)

//Reactive user
const user = computed(() => auth.user)

//heo dõi khi user được cập nhật sau login
watchEffect(() => {
  if (!user.value || !user.value.id) {
    showChat.value = false // reset khi logout
  }
})
</script>
