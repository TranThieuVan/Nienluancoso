<template>
  <div>
    <Navbar v-if="showNavbar" />
    <router-view />
  </div>
</template>

<script>
import { computed, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import Navbar from "./components/Navbar.vue";

export default {
  components: { Navbar },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const isAdminRoute = computed(() => route.path.startsWith("/admin"));
    const isAdminLoggedIn = computed(() => localStorage.getItem("adminToken"));

    // ✅ Dùng watchEffect để redirect sau khi route sẵn sàng
    watchEffect(() => {
      if (isAdminRoute.value && !isAdminLoggedIn.value && route.path !== '/admin/login') {
        router.push("/admin/login");
      }
    });

    const showNavbar = computed(() => {
      const hideRoutes = ["/login", "/register"];
      return !isAdminRoute.value && !hideRoutes.includes(route.path);
    });

    return { showNavbar };
  },
};
</script>
