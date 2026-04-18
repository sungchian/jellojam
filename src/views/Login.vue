<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="blob blob-1"></div>
      <div class="blob blob-2"></div>
    </div>
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-logo">🛍️</div>
        <h1 class="brand-name">NagouBuy</h1>
        <p class="brand-sub">ERP 後台管理系統</p>
      </div>

      <el-form :model="form" :rules="rules" ref="formRef" @submit.prevent="handleLogin">
        <el-form-item prop="email">
          <el-input v-model="form.email" placeholder="電子郵件" size="large" prefix-icon="Message" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" type="password" placeholder="密碼" size="large" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-button type="primary" size="large" :loading="loading" @click="handleLogin" class="login-btn" native-type="submit">
          登入系統
        </el-button>
      </el-form>

      <div class="demo-accounts">
        <p class="demo-title">測試帳號</p>
        <div class="demo-item" v-for="acc in demoAccounts" :key="acc.email" @click="fillDemo(acc)">
          <span class="demo-role">{{ acc.role }}</span>
          <span class="demo-email">{{ acc.email }}</span>
        </div>
        <p class="demo-pwd">密碼均為：<code>admin123</code></p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()
const formRef = ref()
const loading = ref(false)

const form = ref({ email: 'super@nagou.com', password: 'admin123' })
const rules = {
  email: [{ required: true, message: '請輸入電子郵件', trigger: 'blur' }],
  password: [{ required: true, message: '請輸入密碼', trigger: 'blur' }],
}
const demoAccounts = [
  { role: '超級管理員', email: 'super@nagou.com' },
  { role: '管理員', email: 'admin@nagou.com' },
  { role: '財務人員', email: 'finance@nagou.com' },
]

function fillDemo(acc) {
  form.value.email = acc.email
  form.value.password = 'admin123'
}

async function handleLogin() {
  await formRef.value.validate(async (valid) => {
    if (!valid) return
    loading.value = true
    await new Promise(r => setTimeout(r, 600))
    const result = auth.login(form.value)
    loading.value = false
    if (result.success) {
      ElMessage.success('登入成功！歡迎回來')
      router.push('/dashboard')
    } else {
      ElMessage.error(result.message)
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
.brand-name {
  font-size: 28px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.5px;
}
.brand-sub { font-size: 13px; color: rgba(255,255,255,0.5); margin-top: 4px; }
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
.demo-accounts {
  margin-top: 28px;
  padding: 16px;
  background: rgba(255,255,255,0.04);
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
}
.demo-title {
  font-size: 11px;
  color: rgba(255,255,255,0.4);
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 10px;
}
.demo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.2s;
  margin-bottom: 2px;
}
.demo-item:hover { background: rgba(255,255,255,0.07); }
.demo-role {
  font-size: 11px;
  font-weight: 600;
  color: #818cf8;
  min-width: 70px;
}
.demo-email { font-size: 12px; color: rgba(255,255,255,0.5); }
.demo-pwd {
  font-size: 12px;
  color: rgba(255,255,255,0.35);
  margin-top: 10px;
}
.demo-pwd code {
  background: rgba(255,255,255,0.1);
  padding: 1px 6px;
  border-radius: 4px;
  color: #a5b4fc;
  font-family: var(--font-mono);
}
</style>
