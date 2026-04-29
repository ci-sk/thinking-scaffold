<script setup lang="ts">
import { ref, computed } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import { CARD_TYPE_CONFIG } from '../types'

const store = useCanvasStore()
const showModal = ref(false)
const showOutline = ref(false)
const outlineText = ref('')
const isGenerating = ref(false)

const chipTexts = computed(() =>
  store.cards.map(c => c.content.substring(0, 25) + (c.content.length > 25 ? '…' : ''))
)

function open() {
  showModal.value = true
}

function close() {
  showModal.value = false
}

function closeOutline() {
  showOutline.value = false
}

function generateOutline() {
  showModal.value = false
  isGenerating.value = true

  setTimeout(() => {
    const groups: Record<string, string[]> = {}
    for (const card of store.cards) {
      const typeLabel = CARD_TYPE_CONFIG[card.type].label
      if (!groups[typeLabel]) groups[typeLabel] = []
      groups[typeLabel].push(card.content)
    }

    let outline = ''
    let i = 1
    for (const [type, items] of Object.entries(groups)) {
      outline += `\n${i}. ${type}相关\n`
      items.forEach(item => {
        outline += `   - ${item.slice(0, 60)}${item.length > 60 ? '...' : ''}\n`
      })
      i++
    }

    if (!outline.trim()) outline = '暂无碎片可生成大纲'

    outlineText.value = outline
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
  <!-- 缝合引导弹窗 -->
  <Teleport to="body">
    <div v-if="showModal" class="modal-overlay" @click.self="close">
      <div class="modal-dialog">
        <button class="modal-close" @click="close">✕</button>
        <div class="modal-icon">🧵</div>
        <h3>周期缝合</h3>
        <p class="modal-subtitle">当前画布上的碎片</p>
        <div class="highlight-chips">
          <span v-for="(text, i) in chipTexts" :key="i" class="highlight-chip">{{ text }}</span>
        </div>
        <div class="guided-question">🤔 如果只保留一个核心结论，会是什么？</div>
        <div class="btn-row">
          <button class="btn btn-primary" @click="generateOutline">✨ 生成大纲</button>
          <button class="btn btn-ghost" @click="close">稍后</button>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- 生成中 -->
  <Teleport to="body">
    <div v-if="isGenerating" class="modal-overlay">
      <div style="background:#fff;border-radius:24px;padding:40px 32px;text-align:center">
        <div style="width:32px;height:32px;border:3px solid #fdf3e7;border-top-color:#c7853a;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 16px"></div>
        <p style="color:#6b6b6b;font-size:14px">正在生成大纲...</p>
      </div>
    </div>
  </Teleport>

  <!-- 大纲结果弹窗 -->
  <Teleport to="body">
    <div v-if="showOutline" class="modal-overlay" @click.self="closeOutline">
      <div class="outline-dialog">
        <button class="modal-close" @click="closeOutline">✕</button>
        <div class="modal-icon">📋</div>
        <h3>缝合结果 · 结构化大纲</h3>
        <p class="modal-subtitle">基于 {{ store.cards.length }} 张卡片生成</p>
        <div class="outline-body">
          <pre class="outline-content">{{ outlineText }}</pre>
        </div>
        <div class="btn-row">
          <button class="btn btn-primary" @click="exportOutline">⬇️ 导出 Markdown</button>
          <button class="btn btn-ghost" @click="closeOutline">稍后再说</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.4);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.modal-dialog {
  background: #fff;
  border-radius: 24px;
  padding: 32px 28px 24px;
  max-width: 540px;
  width: 90%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  position: relative;
  animation: slideUp 0.35s ease;
}

.outline-dialog {
  background: #fff;
  border-radius: 24px;
  padding: 32px 28px 24px;
  max-width: 640px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  position: relative;
  animation: slideUp 0.35s ease;
}

.modal-close {
  position: absolute;
  top: 14px;
  right: 18px;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0efec;
  border: none;
  cursor: pointer;
  font-size: 16px;
  color: #999;
}

.modal-icon {
  font-size: 40px;
  text-align: center;
  margin-bottom: 8px;
}

h3 {
  text-align: center;
  font-size: 20px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #2c2c2c;
}

.modal-subtitle {
  text-align: center;
  font-size: 13px;
  color: #6b6b6b;
  margin-bottom: 20px;
}

.highlight-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
  margin-bottom: 20px;
}

.highlight-chip {
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 12px;
  background: #f8f6f3;
  border: 1px solid #e8e4df;
  color: #6b6b6b;
}

.guided-question {
  background: #fdfaf6;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  border-left: 3px solid #c7853a;
  font-family: Georgia, 'Noto Serif SC', serif;
  font-size: 14px;
  color: #2c2c2c;
}

.btn-row {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 12px;
}

.btn {
  padding: 10px 22px;
  border-radius: 24px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #c7853a;
  color: #fff;
}

.btn-primary:hover {
  background: #b07530;
}

.btn-ghost {
  background: transparent;
  color: #6b6b6b;
  border: 1px solid #e8e4df;
}

.btn-ghost:hover {
  background: #f5f3f0;
}

.outline-body {
  flex: 1;
  overflow-y: auto;
  margin: 8px 0 4px;
  background: #fafaf8;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e8e4df;
  max-height: 40vh;
}

.outline-content {
  font-size: 13px;
  color: #2c2c2c;
  white-space: pre-wrap;
  font-family: inherit;
  line-height: 1.7;
  margin: 0;
}

@keyframes slideUp {
  from { transform: translateY(40px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
