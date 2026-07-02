<template>
  <Teleport to="body">
    <div class="toast-stack" aria-live="polite">
      <TransitionGroup name="toast" tag="div" class="toast-list">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="toast-item"
          :class="[`toast-${toast.type}`]"
          @click="dismiss(toast.id)"
        >
          <span class="toast-icon">{{ icons[toast.type] }}</span>
          <span class="toast-msg">{{ toast.message }}</span>
          <button class="toast-close" @click.stop="dismiss(toast.id)">✕</button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToast } from '@/composables/useToast'

const { toasts, dismiss } = useToast()

const icons = {
  success: '🛒',
  error:   '⚠️',
  info:    'ℹ️',
}
</script>

<style scoped>
.toast-stack {
  position: fixed;
  bottom: 28px;
  right: 24px;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: flex-end;
}

.toast-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 13px 18px;
  border-radius: 14px;
  min-width: 220px;
  max-width: 320px;
  font-size: 14px;
  font-weight: 600;
  box-shadow: 0 8px 32px rgba(0,0,0,0.18);
  cursor: pointer;
  pointer-events: all;
  line-height: 1.4;
}

.toast-success {
  background: #fff;
  border-left: 4px solid #C97B84;
  color: #2C1A14;
}

.toast-error {
  background: #fff;
  border-left: 4px solid #f97316;
  color: #7c2d12;
}

.toast-info {
  background: #fff;
  border-left: 4px solid #7B5B8E;
  color: #2C1A14;
}

.toast-icon {
  font-size: 18px;
  flex-shrink: 0;
}

.toast-msg {
  flex: 1;
}

.toast-close {
  background: none;
  border: none;
  font-size: 13px;
  color: #9ca3af;
  cursor: pointer;
  padding: 0 0 0 4px;
  line-height: 1;
  flex-shrink: 0;
}
.toast-close:hover { color: #374151; }

/* ── TransitionGroup animations ── */
.toast-enter-active {
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateX(40px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(60px) scale(0.85);
}
.toast-move {
  transition: transform 0.3s ease;
}
</style>
