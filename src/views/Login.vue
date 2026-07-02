<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-logo">🛍️</div>
        <h1 class="brand-name">JelloJam</h1>
        <p class="brand-sub">ERP 後台管理系統</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="電子郵件" size="large" prefix-icon="Message"
            autocomplete="email" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密碼" size="large"
            prefix-icon="Lock" show-password autocomplete="current-password" />
        </el-form-item>
        <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
        <el-button type="primary" size="large" :loading="loading" @click="handleLogin"
          class="login-btn" native-type="submit">
          登入系統
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const router  = useRouter()
const auth    = useAuthStore()
const formRef = ref()
const loading = ref(false)
const errorMsg = ref('')

const form = ref({ email: '', password: '' })
const rules = {
  email:    [{ required: true, message: '請輸入電子郵件', trigger: 'blur' }],
  password: [{ required: true, message: '請輸入密碼',     trigger: 'blur' }],
}

async function handleLogin() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value  = true
    errorMsg.value = ''
    const result = await auth.login(form.value)
    loading.value = false
    if (result.success) {
      router.push('/dashboard')
    } else {
      errorMsg.value = result.message
    }
  })
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0f172a;
  position: relative;
  overflow: hidden;
}
.login-bg { position: absolute; inset: 0; pointer-events: none; }
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.15;
}
.blob-1 {
  width: 500px; height: 500px;
  background: radial-gradient(circle, #6366f1, #8b5cf6);
  top: -100px; left: -100px;
  animation: float 8s ease-in-out infinite;
}
.blob-2 {
  width: 400px; height: 400px;
  background: radial-gradient(circle, #3b82f6, #06b6d4);
  bottom: -80px; right: -80px;
  animation: float 10s ease-in-out infinite reverse;
}
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-30px) scale(1.05); }
}
.login-card {
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 20px;
  padding: 48px 40px;
  width: 400px;
  position: relative;
  z-index: 1;
  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.4);
}
.login-brand { text-align: center; margin-bottom: 36px; }
.brand-logo { font-size: 48px; margin-bottom: 8px; }
.brand-name { font-size: 28px; font-weight: 800; color: #fff; letter-spacing: -0.5px; }
.brand-sub  { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }
:deep(.el-input__wrapper) {
  background: rgba(255,255,255,0.07) !important;
  border: 1px solid rgba(255,255,255,0.12) !important;
  box-shadow: none !important;
}
:deep(.el-input__inner) { color: #fff !important; }
:deep(.el-input__inner::placeholder) { color: rgba(255,255,255,0.35) !important; }
:deep(.el-input__prefix-inner .el-icon) { color: rgba(255,255,255,0.4) !important; }
.login-btn {
  width: 100%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6) !important;
  border: none !important;
  height: 46px;
  font-size: 15px;
  font-weight: 600;
  border-radius: 10px;
  margin-top: 8px;
  letter-spacing: 1px;
}
.error-msg {
  font-size: 13px;
  color: #f87171;
  text-align: center;
  margin: 4px 0 8px;
}
</style>
