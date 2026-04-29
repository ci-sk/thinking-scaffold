<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import type { InboxItem } from '../types'

defineProps<{ mobileOpen: boolean }>()

const store = useCanvasStore()

const activeTab = ref<'idea' | 'clip' | 'question'>('idea')

const ideaInput = ref('')
const clipLink = ref('')
const clipContent = ref('')
const clipWhy = ref('')
const questionInput = ref('')

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

function addIdea() {
  const text = ideaInput.value.trim()
  if (!text) return
  store.addInboxItem('idea', { id: uid(), text, source: 'thought', tag: '闪念' })
  ideaInput.value = ''
}

function addClip() {
  const content = clipContent.value.trim()
  const why = clipWhy.value.trim()
  if (!content || !why) return
  store.addInboxItem('clip', { id: uid(), text: content, source: 'web', tag: '剪藏', link: clipLink.value.trim(), why })
  clipLink.value = ''
  clipContent.value = ''
  clipWhy.value = ''
}

function addQuestion() {
  const text = questionInput.value.trim()
  if (!text) return
  store.addInboxItem('question', { id: uid(), text, source: 'question', tag: '追问' })
  questionInput.value = ''
}

function moveToCanvas(mode: 'idea' | 'clip' | 'question', item: InboxItem) {
  const typeMap: Record<string, 'idea' | 'quote' | 'question'> = { idea: 'idea', clip: 'quote', question: 'question' }
  const cardType = typeMap[mode] || 'idea'
  const vpW = window.innerWidth - 300
  const vpH = window.innerHeight - 56

  const el = document.querySelector(`[data-inbox-id="${item.id}"]`)
  if (el) el.classList.add('fly-out')
  setTimeout(() => {
    store.removeInboxItem(mode, item.id)
    store.addCard({
      type: cardType,
      content: item.text,
      source: item.tag || item.source || '',
      position: { x: 100 + Math.random() * (vpW - 320), y: 120 + Math.random() * (vpH - 260) },
    })
  }, 400)
}
</script>

<template>
  <aside class="side-panel" :class="{ 'mobile-open': mobileOpen }">
    <div class="mode-tabs">
      <button
        v-for="tab in [
          { id: 'idea' as const, label: '闪念', icon: '💡' },
          { id: 'clip' as const, label: '剪藏', icon: '📎' },
          { id: 'question' as const, label: '疑问', icon: '❓' },
        ]"
        :key="tab.id"
        class="mode-tab"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        <span>{{ tab.icon }}</span> {{ tab.label }}
      </button>
    </div>

    <!-- 闪念 -->
    <div v-if="activeTab === 'idea'" class="mode-panel">
      <div class="input-area">
        <textarea v-model="ideaInput" placeholder="突然冒出的想法..." rows="2" />
        <button class="btn-add" @click="addIdea">捕捉闪念</button>
      </div>
      <div class="inbox-list">
        <div v-for="item in store.inboxIdea" :key="item.id" :data-inbox-id="item.id" class="inbox-item" @click="moveToCanvas('idea', item)">
          <span class="item-dot idea" /><span class="flex-1">{{ item.text }}</span><span class="item-tag">{{ item.tag }}</span>
        </div>
      </div>
    </div>

    <!-- 剪藏 -->
    <div v-if="activeTab === 'clip'" class="mode-panel">
      <div class="input-area">
        <input v-model="clipLink" type="text" placeholder="粘贴链接（可选）" />
        <textarea v-model="clipContent" placeholder="摘录的文本..." rows="3" />
        <input v-model="clipWhy" type="text" placeholder="你为什么觉得它重要？（必填）" />
        <button class="btn-add" @click="addClip">存入剪藏</button>
      </div>
      <div class="inbox-list">
        <div v-for="item in store.inboxClip" :key="item.id" :data-inbox-id="item.id" class="inbox-item" @click="moveToCanvas('clip', item)">
          <span class="item-dot clip" /><span class="flex-1">{{ item.text }}</span><span class="item-tag">{{ item.tag }}</span>
        </div>
      </div>
    </div>

    <!-- 疑问 -->
    <div v-if="activeTab === 'question'" class="mode-panel">
      <div class="input-area">
        <textarea v-model="questionInput" placeholder="为什么……？如果……会怎样？" rows="2" />
        <button class="btn-add" @click="addQuestion">记录追问</button>
      </div>
      <div class="inbox-list">
        <div v-for="item in store.inboxQuestion" :key="item.id" :data-inbox-id="item.id" class="inbox-item" @click="moveToCanvas('question', item)">
          <span class="item-dot question" /><span class="flex-1">{{ item.text }}</span><span class="item-tag">{{ item.tag }}</span>
        </div>
      </div>
    </div>
  </aside>
</template>

<style scoped>
.side-panel {
  width: 300px;
  flex-shrink: 0;
  border-right: 1px solid #e8e4df;
  background: #fff;
  display: flex;
  flex-direction: column;
  z-index: 30;
  transition: left 0.3s;
}

@media (max-width: 800px) {
  .side-panel {
    position: absolute;
    left: -100%;
    top: 0;
    height: 100%;
    width: 85%;
    max-width: 320px;
    z-index: 30;
    border-radius: 0 18px 18px 0;
    box-shadow: none;
  }

  .side-panel.mobile-open {
    left: 0;
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15);
  }
}

.mode-tabs {
  display: flex;
  border-bottom: 1px solid #e8e4df;
  background: #f9f8f6;
}

.mode-tab {
  flex: 1;
  padding: 12px 4px;
  text-align: center;
  font-size: 13px;
  font-weight: 500;
  color: #999;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 2px solid transparent;
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.mode-tab.active {
  color: #c7853a;
  border-bottom-color: #c7853a;
  background: #fff;
  font-weight: 600;
}

.mode-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

.input-area {
  padding: 14px 14px 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-bottom: 1px solid #e8e4df;
}

.input-area textarea,
.input-area input[type="text"] {
  border: 1px solid #e8e4df;
  border-radius: 12px;
  padding: 10px 12px;
  font-size: 13px;
  font-family: inherit;
  background: #fafaf8;
  outline: none;
  resize: vertical;
  color: #2c2c2c;
  transition: all 0.2s;
}

.input-area textarea:focus,
.input-area input:focus {
  border-color: #c7853a;
  box-shadow: 0 0 0 3px rgba(199, 133, 58, 0.06);
  background: #fff;
}

.btn-add {
  align-self: flex-end;
  padding: 8px 18px;
  border-radius: 24px;
  background: #c7853a;
  color: #fff;
  border: none;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add:hover {
  background: #b07530;
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(199, 133, 58, 0.3);
}

.inbox-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.inbox-item {
  padding: 12px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
  background: #fcfbf9;
  font-size: 13px;
  line-height: 1.4;
  color: #6b6b6b;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.inbox-item:hover {
  background: #fff;
  border-color: #e8e4df;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  color: #2c2c2c;
}

.item-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.item-dot.idea { background: #c7853a; }
.item-dot.clip { background: #5b7f95; }
.item-dot.question { background: #8b7da8; }

.item-tag {
  font-size: 10px;
  background: #f0efec;
  padding: 2px 7px;
  border-radius: 10px;
  white-space: nowrap;
}

.fly-out {
  animation: flyToCanvas 0.5s cubic-bezier(0.25, 0.1, 0.25, 1) forwards;
}

@keyframes flyToCanvas {
  0% { transform: scale(1); opacity: 1; }
  100% { transform: scale(0.3) translate(200px, -100px); opacity: 0; }
}
</style>
