<template>
  <div>
    <Navbar v-if="showNavbar" />
    <router-view />
  </div>
</template>

<script>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import Navbar from "./components/Navbar.vue";

export default {
  components: { Navbar },
  setup() {
    const route = useRoute();
    const router = useRouter();

    const isAdminRoute = computed(() => route.path.startsWith("/admin"));
    const isAdminLoggedIn = computed(() => localStorage.getItem("adminToken"));

    // Nếu đang ở trang admin mà chưa đăng nhập, chuyển hướng về admin login
    if (isAdminRoute.value && !isAdminLoggedIn.value) {
      router.push("/admin");
    }

    // Ẩn Navbar ở các trang đăng nhập và đăng ký user, cũng như admin
    const showNavbar = computed(() => {
      const hideRoutes = ["/login", "/register"];
      return !isAdminRoute.value && !hideRoutes.includes(route.path);
    });

    return { isAdminRoute, isAdminLoggedIn, showNavbar };
  },
};
</script>