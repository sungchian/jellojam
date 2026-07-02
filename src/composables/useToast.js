import { ref } from 'vue'

// Module-level singleton — shared across all component instances
const toasts = ref([])
let _nextId = 0

export function useToast() {
  function show(message, type = 'success', duration = 2800) {
    const id = ++_nextId
    toasts.value.push({ id, message, type })
    setTimeout(() => {
      toasts.value = toasts.value.filter(t => t.id !== id)
    }, duration)
  }

  function dismiss(id) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  return { toasts, show, dismiss }
}
