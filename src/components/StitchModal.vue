<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import { CARD_TYPE_CONFIG } from '../types'

const store = useCanvasStore()

const showStitch = ref(false)
const showOutline = ref(false)
const isGenerating = ref(false)
const outlineText = ref('')

const guidingQuestions = [
  '这些观点之间有哪些共识与矛盾？',
  '如果只保留一个核心结论，会是什么？',
  '这个结论能用在你正在做的哪个项目中？',
]

function open() {
  showStitch.value = true
}

function closeStitch() {
  showStitch.value = false
}

function closeOutline() {
  showOutline.value = false
}

function generateOutline() {
  showStitch.value = false
  isGenerating.value = true

  setTimeout(() => {
    const groups: Record<string, string[]> = {}
    for (const card of store.cards) {
      const typeLabel = CARD_TYPE_CONFIG[card.type].label
      if (!groups[typeLabel]) groups[typeLabel] = []
      groups[typeLabel].push(card.content.split('\n')[0])
    }

    let outline = ''
    let sectionNum = 1
    for (const [type, items] of Object.entries(groups)) {
      outline += `\n${sectionNum}. ${type}相关\n`
      items.forEach(item => {
        outline += `   - ${item.slice(0, 60)}${item.length > 60 ? '...' : ''}\n`
      })
      sectionNum++
    }

    outlineText.value = outline || '暂无碎片可生成大纲'
    isGenerating.value = false
    showOutline.value = true
  }, 600)
}

function exportOutline() {
  const blob = new Blob([outlineText.value], { type: 'text/markdown' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `思维脚手架-大纲-${new Date().toISOString().slice(0, 10)}.md`
  a.click()
  URL.revokeObjectURL(url)
}

defineExpose({ open })
</script>

<template>
  <!-- Generating overlay -->
  <Teleport to="body">
    <div
      v-if="isGenerating"
      class="fixed inset-0 z-50 bg-black/20 flex items-center justify-center"
    >
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="animate-spin w-8 h-8 border-2 border-warm border-t-transparent rounded-full mx-auto mb-4" />
        <p class="text-gray-600 text-sm">正在生成大纲...</p>
      </div>
    </div>
  </Teleport>

  <!-- Stitch dialog - guiding questions -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showStitch"
        class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center"
        @click.self="closeStitch"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden">
          <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
            <div>
              <h2 class="text-base font-semibold text-gray-800">周期缝合</h2>
              <p class="text-xs text-gray-400 mt-0.5">你积攒了 {{ store.cards.length }} 个碎片，想花几分钟缝合它们吗？</p>
            </div>
            <button
              class="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100 text-gray-400 text-sm"
              @click="closeStitch"
            >✕</button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <p class="text-xs font-medium text-gray-400 mb-2">相关碎片</p>
              <div class="flex flex-wrap gap-2">
                <span
                  v-for="card in store.cards.slice(0, 12)"
                  :key="card.id"
                  class="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600"
                  :style="{ borderLeftColor: CARD_TYPE_CONFIG[card.type].color, borderLeftWidth: '2px' }"
                >
                  {{ CARD_TYPE_CONFIG[card.type].icon }}
                  {{ card.content.slice(0, 20) }}{{ card.content.length > 20 ? '...' : '' }}
                </span>
                <span v-if="store.cards.length > 12" class="text-xs text-gray-400 self-center">
                  +{{ store.cards.length - 12 }} 更多
                </span>
              </div>
            </div>

            <div>
              <p class="text-xs font-medium text-gray-400 mb-2">引导式追问</p>
              <div class="space-y-2">
                <div
                  v-for="(q, i) in guidingQuestions"
                  :key="i"
                  class="flex items-start gap-2 p-3 rounded-lg bg-warm-bg border border-warm/10"
                >
                  <span class="text-warm font-serif text-sm mt-0.5">{{ i + 1 }}.</span>
                  <p class="text-sm text-gray-700 font-serif italic">{{ q }}</p>
                </div>
              </div>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
            <button
              class="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              @click="closeStitch"
            >稍后再说</button>
            <button
              class="px-4 py-2 text-sm font-medium bg-warm text-white rounded-lg hover:bg-warm-light transition-colors flex items-center gap-1.5"
              @click="generateOutline"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
              生成大纲
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Outline result dialog -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showOutline"
        class="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-8"
        @click.self="closeOutline"
      >
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden">
          <div class="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-gray-800">缝合结果 · 结构化大纲</h2>
              <p class="text-xs text-gray-400 mt-0.5">基于 {{ store.cards.length }} 张卡片生成</p>
            </div>
            <button
              class="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400"
              @click="closeOutline"
            >✕</button>
          </div>

          <div class="flex-1 overflow-y-auto p-6">
            <pre class="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">{{ outlineText }}</pre>
          </div>

          <div class="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              class="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              @click="closeOutline"
            >稍后再说</button>
            <div class="flex gap-2">
              <button
                class="px-4 py-2 text-sm font-medium bg-warm text-white rounded-lg hover:bg-warm-light transition-colors"
                @click="exportOutline"
              >导出 Markdown</button>
              <button
                class="px-4 py-2 text-sm font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                @click="generateOutline"
              >重新生成</button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
