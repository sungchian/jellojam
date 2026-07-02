/**
 * useIdleTimeout — logs out the ERP user after a period of inactivity.
 *
 * Listens for mouse, keyboard, touch, and scroll events to reset the timer.
 * When the idle threshold is hit, calls the provided `onIdle` callback.
 *
 * Usage (in MainLayout.vue):
 *   import { useIdleTimeout } from '@/composables/useIdleTimeout'
 *   useIdleTimeout({ minutes: 30, onIdle: () => authStore.logout() })
 */

import { onMounted, onUnmounted } from 'vue'

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

/**
 * @param {object}   opts
 * @param {number}   opts.minutes  — idle threshold in minutes (default 30)
 * @param {Function} opts.onIdle   — callback invoked when user has been idle
 */
export function useIdleTimeout({ minutes = 30, onIdle }) {
  const ms = minutes * 60 * 1000
  let timerId = null

  function reset() {
    clearTimeout(timerId)
    timerId = setTimeout(onIdle, ms)
  }

  function handleActivity() {
    reset()
  }

  onMounted(() => {
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }))
    reset()   // start the timer as soon as the layout mounts
  })

  onUnmounted(() => {
    ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity))
    clearTimeout(timerId)
  })
}
