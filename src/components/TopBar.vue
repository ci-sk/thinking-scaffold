<script setup lang="ts">
import { useCanvasStore } from '../stores/canvas'

const emit = defineEmits<{
  toggleSidebar: []
  openStitch: []
}>()

const store = useCanvasStore()
</script>

<template>
  <header
    class="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0 z-20"
  >
    <div class="flex items-center gap-3">
      <button
        class="w-8 h-8 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-500"
        @click="emit('toggleSidebar')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>
      </button>
      <div class="flex items-center gap-2">
        <span class="text-xl">🧱</span>
        <h1 class="text-sm font-semibold text-gray-800 tracking-tight">思维脚手架</h1>
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="store.cards.length > 0
          ? 'bg-warm text-white hover:bg-warm-light'
          : 'bg-gray-100 text-gray-400 cursor-not-allowed'"
        :disabled="store.cards.length === 0"
        @click="emit('openStitch')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
        缝合
        <span v-if="store.cards.length > 0" class="bg-white/20 text-xs px-1.5 py-0.5 rounded-full">
          {{ store.cards.length }}
        </span>
      </button>
    </div>
  </header>
</template>
