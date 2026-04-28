<script setup lang="ts">
import { ref } from 'vue'

export interface ToastMessage {
  id: number
  text: string
}

const toasts = ref<ToastMessage[]>([])
let nextId = 0

function addToast(text: string) {
  const id = nextId++
  toasts.value.push({ id, text })
  setTimeout(() => {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }, 2000)
}

defineExpose({ addToast })
</script>

<template>
  <div class="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
    <div
      v-for="toast in toasts"
      :key="toast.id"
      class="bg-gray-800 text-white text-sm px-4 py-2 rounded-lg shadow-lg pointer-events-auto animate-pulse"
    >
      {{ toast.text }}
    </div>
  </div>
</template>
