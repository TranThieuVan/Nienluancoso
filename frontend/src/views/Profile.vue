<template>
  <div class="flex flex-col md:flex-row gap-6 p-4">
    <!-- LEFT SIDE MENU -->
    <div class="w-full md:w-1/3 bg-white rounded-xl shadow p-4 space-y-2">
      <div :class="tab === 'info' ? activeClass : inactiveClass" @click="tab = 'info'">
        Thông tin của tôi
      </div>
      <div :class="tab === 'security' ? activeClass : inactiveClass" @click="tab = 'security'">
        Email và mật khẩu
      </div>
      <div :class="tab === 'address' ? activeClass : inactiveClass" @click="tab = 'address'">
        Địa chỉ giao hàng
      </div>
    </div>

    <!-- RIGHT SIDE CONTENT -->
    <div class="w-full md:w-2/3 bg-white rounded-xl shadow p-6">
      <!-- TAB: THÔNG TIN CỦA TÔI -->
      <div v-if="tab === 'info'" class="space-y-6">
        <h2 class="text-2xl font-bold text-gray-800">Cập nhật thông tin</h2>

        <div class="flex items-center gap-4">
          <img :src="preview || `/${user.avatar}`" class="w-24 h-24 rounded-full object-cover border" />
          <input type="file" @change="onFileChange" />
        </div>

        <div>
          <label class="font-medium block mb-1">Tên người dùng</label>
          <input v-model="form.name" class="input-style" type="text" />
        </div>

        <button @click="updateProfile" class="btn-primary">Lưu thay đổi</button>
      </div>

      <!-- TAB: EMAIL VÀ MẬT KHẨU -->
      <div v-else-if="tab === 'security'" class="space-y-6">
        <h2 class="text-2xl font-bold text-gray-800">Bảo mật tài khoản</h2>

        <!-- EMAIL -->
        <div class="space-y-4">
          <div class="flex items-center gap-3 mb-2">
            <font-awesome-icon :icon="['fas', 'envelope']" class="text-red-500 text-xl" />
            <span class="text-base text-3xl font-semibold text-gray-800">{{ user.email }}</span>
          </div>

          <label class="block text-sm font-medium text-gray-700 mb-1">Thay đổi gmail của tôi</label>
          <input
              v-model="newEmail"
              type="email"
              name="new_email_custom_123"
              placeholder="Nhập email mới"
              autocomplete="off"
              class="input-style mb-3"
              @focus="newEmail = ''"
            />

          <button @click="updateEmail" class="btn-primary" :disabled="loadingEmail">
            <span v-if="loadingEmail"> Đang lưu... </span>
            <span v-else> Lưu </span>
          </button>
        </div>

        <!-- PASSWORD -->
        <div class="space-y-4">
          <div>
            <label class="font-medium block mb-1">Thay đổi mật khẩu</label>
            <input
              v-model="form.currentPassword"
              placeholder="Nhập mật khẩu hiện tại"
              type="password"
              autocomplete="new-password"
              name="current_password_custom"
              class="input-style"
            />
          </div>

          <div>
            <label class="font-medium block mb-1">Mật khẩu mới</label>
            <input
              v-model="form.newPassword"
              placeholder="Nhập mật khẩu mới"
              type="password"
              autocomplete="new-password"
              name="new_password_custom"
              class="input-style"
            />
          </div>

          <button @click="changePassword" class="btn-primary">Lưu</button>
          <p v-if="message" :class="messageClass">{{ message }}</p>
        </div>
      </div>

      <!-- TAB: ĐỊA CHỈ GIAO HÀNG -->
      <div v-else-if="tab === 'address'" class="space-y-6">
        <h2 class="text-2xl font-bold text-gray-800">Địa chỉ giao hàng</h2>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-medium mb-1">Họ và tên người nhận</label>
            <input v-model="addressForm.fullName" placeholder="Nhập họ và tên" class="input-style" />
          </div>
          <div></div>
        </div>

        <div>
          <label class="block font-medium mb-1">Địa chỉ nhà</label>
          <input v-model="addressForm.street" placeholder="Nhập địa chỉ nhà" class="input-style" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block font-medium mb-1">Quận / Huyện</label>
            <input v-model="addressForm.district" placeholder="Nhập quận / huyện" class="input-style" />
          </div>
          <div>
            <label class="block font-medium mb-1">Thành phố</label>
            <input v-model="addressForm.city" placeholder="Nhập thành phố" class="input-style" />
          </div>
        </div>

        <div>
          <label class="block font-medium mb-1">Số điện thoại</label>
          <input v-model="addressForm.phone" placeholder="Nhập số điện thoại" class="input-style" />
        </div>

        <div>
          <button @click="saveAddress" class="btn-primary">Lưu địa chỉ</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const tab = ref('info')
const user = ref({ name: '', email: '', avatar: '' })
const token = localStorage.getItem('token')



const activeClass = 'bg-blue-100 font-semibold p-2 rounded cursor-pointer'
const inactiveClass = 'p-2 rounded cursor-pointer hover:bg-gray-100'

const form = ref({
  name: '',
  email: '',
  currentPassword: '',
  newPassword: '',
  avatar: null
})

const preview = ref(null)
const message = ref('')
const messageClass = ref('')
const newEmail = ref('')
const loadingEmail = ref(false)

// Load user profile
onMounted(async () => {
  const res = await axios.get('/api/users/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
  user.value = res.data
  form.value.name = user.value.name
  form.value.email = user.value.email
  newEmail.value = user.value.email

  // Load address
  try {
    const res = await axios.get('/api/addresses', {
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.data.length > 0) {
      const addr = res.data[0]
      addressForm.value = {
        fullName: addr.fullName,
        phone: addr.phone,
        street: addr.street,
        district: addr.district,
        city: addr.city
      }
      addressId.value = addr._id
    }
  } catch (err) {
    console.error('Không thể tải địa chỉ:', err)
  }
})

function onFileChange(e) {
  const file = e.target.files[0]
  if (file) {
    preview.value = URL.createObjectURL(file)
    form.value.avatar = file
  }
}

async function updateProfile() {
  try {
    const formData = new FormData()
    formData.append('name', form.value.name)
    if (form.value.avatar) formData.append('avatar', form.value.avatar)

    const res = await axios.put('/api/users/me', formData, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data'
      }
    })

    user.value = res.data.user
    localStorage.setItem('user', JSON.stringify(res.data.user))
    window.location.reload()
  } catch (err) {
    message.value = 'Có lỗi xảy ra!'
    messageClass.value = 'text-red-600'
  }
}

async function changePassword() {
  if (!form.value.currentPassword || !form.value.newPassword) {
    message.value = 'Vui lòng nhập đầy đủ thông tin'
    messageClass.value = 'text-red-600'
    return
  }

  try {
    const res = await axios.put('/api/users/change-password', {
      currentPassword: form.value.currentPassword,
      newPassword: form.value.newPassword
    }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    if (res.data.success) {
      message.value = 'Đổi mật khẩu thành công'
      messageClass.value = 'text-green-600'
      form.value.currentPassword = ''
      form.value.newPassword = ''
    } else {
      message.value = 'Nhập sai mật khẩu cũ'
      messageClass.value = 'text-red-600'
    }
  } catch (err) {
    message.value = 'Lỗi đổi mật khẩu'
    messageClass.value = 'text-red-600'
  }
}

const updateEmail = async () => {
  if (!newEmail.value || newEmail.value === user.value.email) {
    alert('Vui lòng nhập email mới hợp lệ!')
    return
  }

  try {
    loadingEmail.value = true
    await axios.put('/api/users/update-email', { email: newEmail.value }, {
      headers: { Authorization: `Bearer ${token}` }
    })

    user.value.email = newEmail.value
    localStorage.setItem('user', JSON.stringify(user.value))
    alert('Email đã được cập nhật!')
  } catch (err) {
    alert('Lỗi: ' + (err.response?.data?.msg || 'Không thể cập nhật email'))
  } finally {
    loadingEmail.value = false
  }
}

// ===== ĐỊA CHỈ GIAO HÀNG ===== //
const addressForm = ref({
  fullName: '',
  phone: '',
  street: '',
  district: '',
  city: ''  
})

const addressId = ref(null)

const saveAddress = async () => {
  try {
    if (addressId.value) {
      await axios.put(`/api/addresses/${addressId.value}`, addressForm.value, {
        headers: { Authorization: `Bearer ${token}` }
      })
    } else {
      const res = await axios.post('/api/addresses', addressForm.value, {
        headers: { Authorization: `Bearer ${token}` }
      })
      addressId.value = res.data._id
    }
    alert('Lưu địa chỉ thành công!')
  } catch (err) {
    console.error(err)
    alert('Lỗi khi lưu địa chỉ!')
  }
}
</script>

<style scoped>
.input-style {
  @apply mt-1 block w-full border border-gray-300 rounded p-2 focus:outline-none focus:ring-2 focus:ring-blue-500;
}
.btn-primary {
  @apply bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition;
}
</style>
