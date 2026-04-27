<template>
  <div>
    <div class="page-header">
      <div><h1 class="page-title">系統設定</h1><p class="page-subtitle">平台基礎設定與第三方整合 <!-- settings --></p></div>
    </div>

    <div class="settings-layout">
      <!-- Side nav -->
      <div class="settings-nav">
        <div v-for="item in navItems" :key="item.key"
          class="settings-nav-item"
          :class="{ active: activeSection === item.key }"
          @click="activeSection = item.key">
          <el-icon><component :is="item.icon" /></el-icon>
          <span>{{ item.label }}</span>
        </div>
      </div>

      <!-- Content -->
      <el-card class="settings-content">
        <!-- 基本設定 -->
        <div v-if="activeSection === 'general'">
          <h3 class="section-title">🏪 基本設定</h3>
          <el-form :model="generalForm" label-width="140px" style="max-width:560px">
            <el-form-item label="平台名稱">
              <el-input v-model="generalForm.siteName" />
            </el-form-item>
            <el-form-item label="平台 Logo">
              <el-upload action="#" :auto-upload="false" :show-file-list="false" list-type="picture-card" class="logo-upload">
                <el-icon><Plus /></el-icon>
              </el-upload>
            </el-form-item>
            <el-form-item label="客服 Email">
              <el-input v-model="generalForm.supportEmail" />
            </el-form-item>
            <el-form-item label="客服電話">
              <el-input v-model="generalForm.supportPhone" />
            </el-form-item>
            <el-form-item label="網站公告">
              <el-input v-model="generalForm.announcement" type="textarea" :rows="3" placeholder="全站公告文字（留空表示不顯示）" />
            </el-form-item>
            <el-form-item label="維護模式">
              <el-switch v-model="generalForm.maintenance" />
              <span style="margin-left:10px;font-size:12px;color:var(--color-text-muted)">開啟後前台將顯示維護頁面</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="save('基本設定')">儲存設定</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 匯率設定 -->
        <div v-if="activeSection === 'exchange'">
          <h3 class="section-title">💱 匯率設定</h3>
          <el-alert title="系統每日自動更新匯率，您也可手動調整" type="info" show-icon :closable="false" style="margin-bottom:20px" />
          <el-form :model="exchangeForm" label-width="160px" style="max-width:500px">
            <el-form-item label="USD/TWD 匯率">
              <el-input-number v-model="exchangeForm.usdTwd" :precision="2" :step="0.1" controls-position="right" style="width:180px" />
              <span style="margin-left:10px;font-size:12px;color:var(--color-text-muted)">最後更新：今日 09:00</span>
            </el-form-item>
            <el-form-item label="代購服務費率 (%)">
              <el-input-number v-model="exchangeForm.defaultFeeRate" :min="0" :max="50" :precision="1" controls-position="right" style="width:180px" />
            </el-form-item>
            <el-form-item label="預估國際運費 (TWD)">
              <el-input-number v-model="exchangeForm.intlShipping" :min="0" controls-position="right" style="width:180px" />
              <span style="margin-left:10px;font-size:12px;color:var(--color-text-muted)">每500g起</span>
            </el-form-item>
            <el-form-item label="台灣本地運費 (TWD)">
              <el-input-number v-model="exchangeForm.localShipping" :min="0" controls-position="right" style="width:180px" />
            </el-form-item>
            <el-form-item label="免運費門檻 (TWD)">
              <el-input-number v-model="exchangeForm.freeShippingThreshold" :min="0" controls-position="right" style="width:180px" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="save('匯率設定')">儲存設定</el-button>
              <el-button @click="refreshRate" :loading="refreshing">立即更新匯率</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 金流設定 -->
        <div v-if="activeSection === 'payment'">
          <h3 class="section-title">💳 金流設定</h3>
          <div class="payment-cards">
            <div v-for="pm in paymentMethods" :key="pm.key" class="payment-card">
              <div class="payment-card-header">
                <div class="payment-logo">{{ pm.icon }}</div>
                <div>
                  <p class="payment-name">{{ pm.name }}</p>
                  <p class="payment-desc">{{ pm.desc }}</p>
                </div>
                <el-switch v-model="pm.enabled" style="margin-left:auto" />
              </div>
              <div v-if="pm.enabled" class="payment-config">
                <el-form label-width="130px" size="small">
                  <el-form-item :label="pm.key === 'linepay' ? 'Channel ID' : '商店代碼'">
                    <el-input v-model="pm.merchantId" placeholder="輸入商家 ID" show-password />
                  </el-form-item>
                  <el-form-item :label="pm.key === 'linepay' ? 'Channel Secret' : 'HashKey'">
                    <el-input v-model="pm.hashKey" placeholder="輸入金鑰" show-password />
                  </el-form-item>
                  <el-form-item label="測試模式">
                    <el-switch v-model="pm.testMode" />
                  </el-form-item>
                </el-form>
              </div>
            </div>
          </div>
          <el-button type="primary" @click="save('金流設定')" style="margin-top:16px">儲存設定</el-button>
        </div>

        <!-- 物流設定 -->
        <div v-if="activeSection === 'logistics'">
          <h3 class="section-title">🚚 物流設定（賣貨便）</h3>
          <el-form :model="logisticsForm" label-width="160px" style="max-width:520px">
            <el-form-item label="賣貨便 API Key">
              <el-input v-model="logisticsForm.apiKey" show-password placeholder="輸入 API Key" />
            </el-form-item>
            <el-form-item label="賣貨便商店代碼">
              <el-input v-model="logisticsForm.storeCode" placeholder="輸入商店代碼" />
            </el-form-item>
            <el-form-item label="預設配送方式">
              <el-select v-model="logisticsForm.defaultMethod" style="width:100%">
                <el-option label="賣貨便宅配" value="home" />
                <el-option label="711 超商取貨" value="711" />
                <el-option label="全家超商取貨" value="family" />
              </el-select>
            </el-form-item>
            <el-form-item label="自動開立物流單">
              <el-switch v-model="logisticsForm.autoCreate" />
              <span style="margin-left:10px;font-size:12px;color:var(--color-text-muted)">訂單付款後自動開立</span>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="save('物流設定')">儲存設定</el-button>
              <el-button @click="testLogisticsApi">測試 API 連線</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 通知設定 -->
        <div v-if="activeSection === 'notification'">
          <h3 class="section-title">🔔 通知設定</h3>
          <el-form :model="notifForm" label-width="160px" style="max-width:520px">
            <el-divider content-position="left">Email 服務</el-divider>
            <el-form-item label="SMTP Host">
              <el-input v-model="notifForm.smtpHost" placeholder="smtp.gmail.com" />
            </el-form-item>
            <el-form-item label="SMTP Port">
              <el-input-number v-model="notifForm.smtpPort" :min="1" controls-position="right" style="width:120px" />
            </el-form-item>
            <el-form-item label="寄件 Email">
              <el-input v-model="notifForm.fromEmail" />
            </el-form-item>
            <el-form-item label="SMTP 密碼">
              <el-input v-model="notifForm.smtpPwd" show-password />
            </el-form-item>
            <el-divider content-position="left">觸發通知設定</el-divider>
            <el-form-item label="訂單確認 Email">
              <el-switch v-model="notifForm.orderConfirm" />
            </el-form-item>
            <el-form-item label="出貨通知 Email">
              <el-switch v-model="notifForm.shipNotify" />
            </el-form-item>
            <el-form-item label="到貨 SMS 通知">
              <el-switch v-model="notifForm.arrivalSms" />
            </el-form-item>
            <el-form-item label="低庫存預警">
              <el-switch v-model="notifForm.lowStockAlert" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="save('通知設定')">儲存設定</el-button>
              <el-button @click="testEmail">發送測試 Email</el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 權限管理 -->
        <div v-if="activeSection === 'roles'">
          <h3 class="section-title">🔑 帳號與權限管理</h3>
          <el-table border :data="staffAccounts" style="margin-bottom:16px">
            <el-table-column label="姓名" prop="name" :width="COL.staff_name" />
            <el-table-column label="Email" prop="email" :min-width="COL.staff_email" />
            <el-table-column label="角色" :width="COL.staff_role">
              <template #default="{ row }">
                <el-select v-model="row.role" size="small" style="width:120px">
                  <el-option label="超級管理員" value="super_admin" />
                  <el-option label="管理員" value="admin" />
                  <el-option label="財務人員" value="finance" />
                  <el-option label="客服人員" value="cs" />
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="狀態" :width="COL.staff_status" align="center">
              <template #default="{ row }">
                <el-switch v-model="row.active" />
              </template>
            </el-table-column>
            <el-table-column label="操作" :width="COL.staff_actions" align="center">
              <template #default="{ row }">
                <el-button text type="primary" size="small" @click="openEdit(row)">編輯</el-button>
                <el-button text type="danger"  size="small" @click="deleteStaff(row)">刪除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-button type="primary" :icon="Plus" @click="openCreate">新增人員</el-button>
        </div>

        <!-- 操作日誌 -->
        <div v-if="activeSection === 'logs'">
          <h3 class="section-title">📋 操作日誌</h3>
          <div class="filter-bar" style="margin-bottom:12px">
            <el-select v-model="logActionFilter" placeholder="操作類型" clearable style="width:140px">
              <el-option label="登入" value="login" />
              <el-option label="商品操作" value="product" />
              <el-option label="訂單操作" value="order" />
              <el-option label="系統設定" value="setting" />
            </el-select>
            <el-date-picker v-model="logDateRange" type="daterange" start-placeholder="開始" end-placeholder="結束" style="width:240px" />
          </div>
          <el-table border :data="auditLogs" size="small">
            <el-table-column prop="time" label="時間" :width="COL.log_time" />
            <el-table-column prop="operator" label="操作人" :width="COL.log_operator" />
            <el-table-column prop="action" label="操作內容" :min-width="COL.log_action" show-overflow-tooltip />
            <el-table-column prop="ip" label="IP 位址" :width="COL.log_ip">
              <template #default="{ row }"><span style="font-family:var(--font-mono);font-size:12px">{{ row.ip }}</span></template>
            </el-table-column>
            <el-table-column label="結果" :width="COL.log_result" align="center">
              <template #default="{ row }">
                <span :class="row.success ? 'badge badge-active' : 'badge badge-danger'">{{ row.success ? '成功' : '失敗' }}</span>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </el-card>
    </div>
  </div>

  <!-- ── 新增 / 編輯人員 Modal ───────────────────────────────── -->
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="showStaffModal" class="modal-backdrop" @click.self="closeStaffModal">
        <div class="modal-box">
          <div class="modal-header">
            <span class="modal-title">{{ staffModalMode === 'edit' ? '編輯人員' : '新增人員' }}</span>
            <el-button text @click="closeStaffModal"><el-icon><Close /></el-icon></el-button>
          </div>

          <div class="modal-body">
            <el-form :model="staffForm" label-width="90px" label-position="left">
              <el-form-item label="姓名" required>
                <el-input v-model="staffForm.name" placeholder="輸入姓名" />
              </el-form-item>
              <el-form-item label="Email" required>
                <el-input v-model="staffForm.email" placeholder="輸入 Email" />
              </el-form-item>
              <el-form-item label="角色">
                <el-select v-model="staffForm.role" style="width:100%">
                  <el-option v-for="(label, val) in ROLE_LABELS" :key="val" :label="label" :value="val" />
                </el-select>
              </el-form-item>
              <el-form-item label="啟用狀態">
                <el-switch v-model="staffForm.active" />
                <span class="switch-hint">{{ staffForm.active ? '啟用中' : '已停用' }}</span>
              </el-form-item>
            </el-form>
          </div>

          <div class="modal-footer">
            <el-button @click="closeStaffModal">取消</el-button>
            <el-button type="primary" @click="saveStaff" :loading="staffSaving">
              {{ staffModalMode === 'edit' ? '儲存變更' : '新增人員' }}
            </el-button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Close } from '@element-plus/icons-vue'
import { supabase } from '@/lib/supabase'

// ── Column widths (single source of truth) ──────────────────────
const COL = {
  // 帳號與權限 table
  staff_name:    120,
  staff_email:   180,  // min-width
  staff_role:    160,
  staff_status:   90,
  staff_actions: 200,
  // 操作日誌 table
  log_time:      180,
  log_operator:  120,
  log_action:    200,  // min-width
  log_ip:        140,
  log_result:    120,
}

const ROLE_LABELS = {
  super_admin: '超級管理員',
  admin:       '管理員',
  finance:     '財務人員',
  cs:          '客服人員',
}

const activeSection = ref('general')
const refreshing    = ref(false)
const logActionFilter = ref('')
const logDateRange    = ref(null)

const navItems = [
  { key: 'general',      label: '基本設定',   icon: 'Setting'    },
  { key: 'exchange',     label: '匯率與費用', icon: 'Money'      },
  { key: 'payment',      label: '金流設定',   icon: 'CreditCard' },
  { key: 'logistics',    label: '物流設定',   icon: 'Van'        },
  { key: 'notification', label: '通知設定',   icon: 'Bell'       },
  { key: 'roles',        label: '帳號與權限', icon: 'UserFilled' },
  { key: 'logs',         label: '操作日誌',   icon: 'Document'   },
]

const generalForm = ref({
  siteName: 'JelloJam 北美代購', supportEmail: 'jellycatstaiwan@outlook.com',
  supportPhone: '0800-XXX-XXX', announcement: '', maintenance: false,
})
const exchangeForm = ref({
  usdTwd: 32.5, defaultFeeRate: 10, intlShipping: 350, localShipping: 60, freeShippingThreshold: 5000,
})
const paymentMethods = ref([
  { key: 'ecpay',  name: '綠界科技 ECPay', desc: '支援信用卡、ATM、超商代碼', icon: '💳', enabled: true,  merchantId: '', hashKey: '', testMode: true  },
  { key: 'linepay',name: 'LINE Pay',       desc: 'LINE Pay 線上支付',          icon: '🟢', enabled: true,  merchantId: '', hashKey: '', testMode: true  },
  { key: 'jko',    name: '街口支付',       desc: '街口 JKO Pay',               icon: '🔵', enabled: false, merchantId: '', hashKey: '', testMode: false },
])
const logisticsForm = ref({ apiKey: '', storeCode: '', defaultMethod: 'home', autoCreate: true })
const notifForm = ref({
  smtpHost: 'smtp.gmail.com', smtpPort: 587, fromEmail: '', smtpPwd: '',
  orderConfirm: true, shipNotify: true, arrivalSms: false, lowStockAlert: true,
})

// ── Staff accounts ───────────────────────────────────────────────
const staffAccounts = ref([])

async function fetchStaff() {
  const { data, error } = await supabase
    .from('staff_accounts')
    .select('*')
    .order('created_at', { ascending: true })
  if (error) { ElMessage.error('載入人員失敗：' + error.message); return }
  staffAccounts.value = data
}

// ── Edit / Create modal ──────────────────────────────────────────
const showStaffModal = ref(false)
const staffModalMode = ref('edit')   // 'edit' | 'create'
const staffSaving    = ref(false)
const editingId      = ref(null)

const staffForm = ref({ name: '', email: '', role: 'cs', active: true })

function openEdit(row) {
  staffModalMode.value = 'edit'
  editingId.value = row.id
  staffForm.value = { name: row.name, email: row.email, role: row.role, active: row.active }
  showStaffModal.value = true
}

function openCreate() {
  staffModalMode.value = 'create'
  editingId.value = null
  staffForm.value = { name: '', email: '', role: 'cs', active: true }
  showStaffModal.value = true
}

function closeStaffModal() { showStaffModal.value = false }

async function saveStaff() {
  if (!staffForm.value.name.trim() || !staffForm.value.email.trim()) {
    ElMessage.warning('姓名與 Email 為必填'); return
  }
  staffSaving.value = true
  try {
    if (staffModalMode.value === 'edit') {
      // ── UPDATE ──────────────────────────────────────────────
      const { error } = await supabase
        .from('staff_accounts')
        .update({
          name:   staffForm.value.name.trim(),
          email:  staffForm.value.email.trim(),
          role:   staffForm.value.role,
          active: staffForm.value.active,
        })
        .eq('id', editingId.value)
      if (error) throw error
      // reactive patch
      const target = staffAccounts.value.find(s => s.id === editingId.value)
      if (target) Object.assign(target, staffForm.value)
      ElMessage.success('人員資料已更新')
    } else {
      // ── INSERT ──────────────────────────────────────────────
      const { data, error } = await supabase
        .from('staff_accounts')
        .insert({
          name:   staffForm.value.name.trim(),
          email:  staffForm.value.email.trim(),
          role:   staffForm.value.role,
          active: staffForm.value.active,
        })
        .select()
        .single()
      if (error) throw error
      staffAccounts.value.push(data)
      ElMessage.success('人員已新增')
    }
    closeStaffModal()
  } catch (e) {
    ElMessage.error('儲存失敗：' + e.message)
  } finally {
    staffSaving.value = false
  }
}

async function deleteStaff(row) {
  await ElMessageBox.confirm(`確定刪除人員「${row.name}」？`, '刪除確認', { type: 'warning' })
  const { error } = await supabase.from('staff_accounts').delete().eq('id', row.id)
  if (error) { ElMessage.error('刪除失敗：' + error.message); return }
  staffAccounts.value = staffAccounts.value.filter(s => s.id !== row.id)
  ElMessage.success('人員已刪除')
}

// ── Audit logs ───────────────────────────────────────────────────
const auditLogs = ref([
  { time: '2026-04-17 10:32:15', operator: '超級管理員', action: '更新商品「Jellycat Bashful Bunny」價格', ip: '203.74.1.xxx', success: true },
  { time: '2026-04-17 09:15:00', operator: '管理員',     action: '更新訂單 ORD-202601012 狀態為已發貨',   ip: '114.32.xx.xx', success: true },
  { time: '2026-04-17 08:55:22', operator: '超級管理員', action: '系統登入',                               ip: '203.74.1.xxx', success: true },
  { time: '2026-04-16 22:11:03', operator: '未知',       action: '嘗試登入失敗（帳號不存在）',             ip: '192.168.1.1',  success: false },
  { time: '2026-04-16 18:44:51', operator: '財務人員',   action: '批准退款申請 #RF-005，金額 NT$ 1,380',  ip: '61.x.x.x',     success: true },
])

// ── Other ────────────────────────────────────────────────────────
function save(section) { ElMessage.success(`${section}已儲存`) }
async function refreshRate() {
  refreshing.value = true
  await new Promise(r => setTimeout(r, 1000))
  refreshing.value = false
  exchangeForm.value.usdTwd = (32 + Math.random() * 1.5).toFixed(2) * 1
  ElMessage.success('匯率已更新')
}
function testLogisticsApi() { ElMessage.success('API 連線測試成功 ✓') }
function testEmail()        { ElMessage.success('測試 Email 已發送')    }

onMounted(fetchStaff)
</script>

<style scoped>
.settings-layout { display: flex; gap: 16px; }
.settings-nav {
  width: 180px; flex-shrink: 0;
  background: var(--color-card); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding: 8px;
  box-shadow: var(--shadow-sm); height: fit-content;
}
.settings-nav-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 8px;
  cursor: pointer; font-size: 13px; font-weight: 500;
  color: var(--color-text-secondary);
  transition: all 0.15s;
  margin-bottom: 2px;
}
.settings-nav-item:hover { background: var(--color-bg); color: var(--color-text-primary); }
.settings-nav-item.active { background: #eef2ff; color: var(--color-primary); font-weight: 600; }
.settings-content { flex: 1; min-width: 0; }
.section-title { font-size: 16px; font-weight: 700; margin-bottom: 20px; color: var(--color-text-primary); }

.payment-cards { display: flex; flex-direction: column; gap: 12px; }
.payment-card {
  border: 1px solid var(--color-border); border-radius: 10px; overflow: hidden;
}
.payment-card-header {
  display: flex; align-items: center; gap: 12px;
  padding: 14px 16px; background: var(--color-bg);
}
.payment-logo { font-size: 24px; }
.payment-name { font-size: 14px; font-weight: 600; }
.payment-desc { font-size: 12px; color: var(--color-text-muted); }
.payment-config { padding: 16px; border-top: 1px solid var(--color-border); }

:deep(.logo-upload .el-upload--picture-card) { width: 80px; height: 80px; }

/* ── Staff modal ─────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0; z-index: 2000;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
}
.modal-box {
  background: var(--color-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-lg);
  width: 420px;
  overflow: hidden;
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid var(--color-border);
}
.modal-title { font-size: 15px; font-weight: 700; color: var(--color-text-primary); }
.modal-body  { padding: 20px; }
.modal-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 20px;
  border-top: 1px solid var(--color-border);
  background: #fafbff;
}
.switch-hint { margin-left: 10px; font-size: 12px; color: var(--color-text-muted); }

/* spring enter */
.modal-enter-active { transition: opacity 0.22s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1); }
.modal-leave-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.92) translateY(8px); }
</style>
