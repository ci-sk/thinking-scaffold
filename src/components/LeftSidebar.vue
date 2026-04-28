<script setup lang="ts">
import { ref } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import type { CardType } from '../types'

const props = defineProps<{ visible: boolean }>()

const emit = defineEmits<{
  cardAdded: [msg: string]
}>()

const store = useCanvasStore()

const activeTab = ref<'flash' | 'clip' | 'question' | 'skeleton'>('flash')

const flashText = ref('')
const clipUrl = ref('')
const clipExcerpt = ref('')
const clipWhy = ref('')
const questionText = ref('')
const skeletonText = ref('')
const selectedType = ref<CardType>('idea')

const tabs = [
  { id: 'flash' as const, label: '闪念', icon: '💡' },
  { id: 'clip' as const, label: '剪藏', icon: '📎' },
  { id: 'question' as const, label: '追问', icon: '❓' },
  { id: 'skeleton' as const, label: '骨架', icon: '🗂️' },
]

const cardTypeOptions: { type: CardType; label: string; icon: string }[] = [
  { type: 'idea', label: '想法', icon: '💡' },
  { type: 'quote', label: '引用', icon: '📎' },
  { type: 'case', label: '案例', icon: '📊' },
  { type: 'question', label: '追问', icon: '❓' },
]

function getDefaultPosition() {
  const vpW = window.innerWidth - 300
  const vpH = window.innerHeight - 56
  return {
    x: vpW / 2 + (Math.random() - 0.5) * 200,
    y: vpH / 2 + (Math.random() - 0.5) * 200,
  }
}

function addFlashCard() {
  const text = flashText.value.trim()
  if (!text) return
  const pos = getDefaultPosition()
  store.addCard({
    type: 'idea',
    content: text,
    position: pos,
  })
  flashText.value = ''
  emit('cardAdded', '闪念已存入画布')
}

function addClipCard() {
  const url = clipUrl.value.trim()
  const excerpt = clipExcerpt.value.trim()
  const why = clipWhy.value.trim()
  if (!excerpt && !url) return
  const content = [excerpt, url ? `\n来源: ${url}` : '', why ? `\n为什么重要: ${why}` : '']
    .filter(Boolean)
    .join('\n')
  const pos = getDefaultPosition()
  store.addCard({
    type: selectedType.value === 'question' ? 'case' : selectedType.value,
    content,
    source: url,
    position: pos,
  })
  clipUrl.value = ''
  clipExcerpt.value = ''
  clipWhy.value = ''
  emit('cardAdded', '剪藏已存入画布')
}

function addQuestionCard() {
  const text = questionText.value.trim()
  if (!text) return
  const pos = getDefaultPosition()
  store.addCard({
    type: 'question',
    content: text.startsWith('为什么') ? text : `为什么${text}？`,
    position: pos,
  })
  questionText.value = ''
  emit('cardAdded', '追问已存入画布')
}

function addSkeletonCards() {
  const text = skeletonText.value.trim()
  if (!text) return
  const lines = text.split('\n').filter(l => l.trim())
  const pos = getDefaultPosition()
  lines.forEach((line, i) => {
    store.addCard({
      type: 'idea',
      content: line.replace(/^[-*•\d.]+\s*/, '').trim(),
      position: { x: pos.x, y: pos.y + i * 170 },
    })
  })
  skeletonText.value = ''
  emit('cardAdded', `已添加 ${lines.length} 张骨架卡片`)
}

function handleVoiceInput() {
  emit('cardAdded', '语音输入功能即将上线')
}
</script>

<template>
  <aside
    class="shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden transition-all duration-300"
    :style="{ width: visible ? '300px' : '0px', minWidth: visible ? '300px' : '0px' }"
  >
    <div class="p-4 border-b border-gray-100">
      <div class="flex gap-1 bg-gray-50 rounded-lg p-1">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          class="flex-1 text-xs font-medium py-1.5 px-1 rounded-md transition-colors"
          :class="activeTab === tab.id ? 'bg-white text-warm shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab.id"
        >
          <span class="mr-0.5">{{ tab.icon }}</span>{{ tab.label }}
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4">
      <!-- 闪念 -->
      <div v-if="activeTab === 'flash'" class="flex flex-col gap-3">
        <p class="text-xs text-gray-400">快速捕捉转瞬即逝的想法</p>
        <textarea
          v-model="flashText"
          placeholder="写下你的想法..."
          class="w-full h-32 text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm/20 placeholder:text-gray-300"
        />
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 rounded-lg text-sm font-medium bg-warm text-white hover:bg-warm-light transition-colors"
            :class="{ 'opacity-50 cursor-not-allowed': !flashText.trim() }"
            :disabled="!flashText.trim()"
            @click="addFlashCard"
          >
            存入画布
          </button>
          <button
            class="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:bg-gray-50 transition-colors"
            title="语音输入"
            @click="handleVoiceInput"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
          </button>
        </div>
      </div>

      <!-- 剪藏 -->
      <div v-if="activeTab === 'clip'" class="flex flex-col gap-3">
        <p class="text-xs text-gray-400">从外部来源摘录片段，必须标注为什么重要</p>
        <input
          v-model="clipUrl"
          type="url"
          placeholder="粘贴链接（选填）"
          class="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-warm placeholder:text-gray-300"
        />
        <textarea
          v-model="clipExcerpt"
          placeholder="摘录文本..."
          class="w-full h-24 text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm/20 placeholder:text-gray-300"
        />
        <div>
          <label class="text-xs text-warm font-medium mb-1 block">为什么重要 *</label>
          <textarea
            v-model="clipWhy"
            placeholder="这条信息为什么值得保留？"
            class="w-full h-16 text-sm border-2 border-warm/30 rounded-lg p-3 resize-none bg-warm-bg focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm/20 placeholder:text-gray-300"
          />
        </div>
        <div class="flex gap-1">
          <button
            v-for="opt in cardTypeOptions"
            :key="opt.type"
            class="text-xs px-2 py-1 rounded-md transition-colors"
            :class="selectedType === opt.type ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'"
            @click="selectedType = opt.type"
          >
            {{ opt.icon }} {{ opt.label }}
          </button>
        </div>
        <button
          class="py-2 rounded-lg text-sm font-medium bg-warm text-white hover:bg-warm-light transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': !clipExcerpt.trim() && !clipUrl.trim() }"
          :disabled="!clipExcerpt.trim() && !clipUrl.trim()"
          @click="addClipCard"
        >
          存入画布
        </button>
      </div>

      <!-- 追问 -->
      <div v-if="activeTab === 'question'" class="flex flex-col gap-3">
        <p class="text-xs text-gray-400">记录你脑子里的疑惑和矛盾点</p>
        <textarea
          v-model="questionText"
          placeholder="为什么……？"
          class="w-full h-32 text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm/20 placeholder:text-gray-300 font-serif italic"
        />
        <button
          class="py-2 rounded-lg text-sm font-medium bg-warm text-white hover:bg-warm-light transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': !questionText.trim() }"
          :disabled="!questionText.trim()"
          @click="addQuestionCard"
        >
          存入画布
        </button>
      </div>

      <!-- 结构骨架 -->
      <div v-if="activeTab === 'skeleton'" class="flex flex-col gap-3">
        <p class="text-xs text-gray-400">输入大纲或列表，每行生成一张卡片</p>
        <textarea
          v-model="skeletonText"
          placeholder="- 第一点&#10;- 第二点&#10;- 第三点"
          class="w-full h-40 text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-warm focus:ring-1 focus:ring-warm/20 placeholder:text-gray-300 font-mono"
        />
        <button
          class="py-2 rounded-lg text-sm font-medium bg-warm text-white hover:bg-warm-light transition-colors"
          :class="{ 'opacity-50 cursor-not-allowed': !skeletonText.trim() }"
          :disabled="!skeletonText.trim()"
          @click="addSkeletonCards"
        >
          生成骨架卡片
        </button>
      </div>
    </div>
  </aside>
</template>
