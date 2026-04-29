<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import type { Card, AnchorDir } from '../types'
import { CARD_TYPE_CONFIG, CARD_SIZE } from '../types'

const props = defineProps<{
  card: Card
  selected: boolean
}>()

const emit = defineEmits<{
  delete: [id: string]
  moveToInbox: [id: string]
  update: [id: string, changes: Partial<Card>]
}>()

const config = computed(() => CARD_TYPE_CONFIG[props.card.type])
const editing = ref(false)
const editContent = ref('')

const anchors: AnchorDir[] = ['top', 'bottom', 'left', 'right']

function openEditor(e: MouseEvent) {
  e.stopPropagation()
  editing.value = true
  editContent.value = props.card.content
  nextTick(() => {
    const ta = document.querySelector(`[data-card-id="${props.card.id}"] .editor-textarea`) as HTMLTextAreaElement
    ta?.focus()
  })
}

function saveEdit() {
  const content = editContent.value.trim()
  if (content) {
    emit('update', props.card.id, { content })
  }
  editing.value = false
}

function onEditorKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && e.ctrlKey) {
    saveEdit()
  }
}

function onDelete(e: MouseEvent) {
  e.stopPropagation()
  emit('delete', props.card.id)
}
</script>

<template>
  <div
    class="canvas-card"
    :class="[`type-${card.type}`, { dragging: selected }]"
    :data-card-id="card.id"
    :style="{
      left: card.position.x + 'px',
      top: card.position.y + 'px',
      width: CARD_SIZE.width + 'px',
      transform: selected ? 'rotate(0deg)' : `rotate(${card.rotation}deg)`,
    }"
    @dblclick="openEditor"
  >
    <div class="card-type-strip" />
    <div class="card-label">{{ config.icon }} {{ config.label }}</div>
    <div class="card-content">{{ card.content }}</div>
    <div v-if="card.source" class="card-source">{{ card.source }}</div>
    <button class="card-close" @click="onDelete" title="删除">×</button>
    <button class="card-inbox" @click="emit('moveToInbox', card.id)" title="撤回收件箱">↩</button>

    <!-- Connection anchors -->
    <div
      v-for="dir in anchors"
      :key="dir"
      :class="['connector-anchor', dir]"
    />

    <!-- Editor overlay -->
    <div v-if="editing" class="card-editor" @mousedown.stop>
      <textarea
        v-model="editContent"
        class="editor-textarea"
        @keydown="onEditorKeydown"
      />
      <button class="btn-save" @click="saveEdit">保存</button>
    </div>
  </div>
</template>

<style scoped>
.canvas-card {
  position: absolute;
  width: 220px;
  min-height: 100px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06), 0 2px 6px rgba(0, 0, 0, 0.04);
  padding: 16px;
  cursor: grab;
  z-index: 3;
  transition: box-shadow 0.2s;
  border: 1px solid #e8e4df;
  font-size: 13px;
  line-height: 1.55;
  display: flex;
  flex-direction: column;
  gap: 8px;
  user-select: none;
}

.canvas-card:hover {
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1), 0 4px 10px rgba(0, 0, 0, 0.05);
  z-index: 10;
}

.canvas-card.dragging {
  cursor: grabbing;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15), 0 8px 20px rgba(0, 0, 0, 0.07);
  z-index: 20;
  border-color: #f0c78e;
}

.card-type-strip {
  position: absolute;
  left: 0;
  top: 12px;
  bottom: 12px;
  width: 4px;
  border-radius: 0 3px 3px 0;
}

.type-idea .card-type-strip { background: #c7853a; }
.type-quote .card-type-strip { background: #5b7f95; }
.type-case .card-type-strip { background: #6b8f71; }
.type-question .card-type-strip { background: #8b7da8; }

.card-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: #999;
}

.type-idea .card-label { color: #c7853a; }
.type-quote .card-label { color: #5b7f95; }
.type-case .card-label { color: #6b8f71; }
.type-question .card-label { color: #8b7da8; }

.card-content {
  font-size: 13px;
  color: #2c2c2c;
  flex: 1;
  word-break: break-word;
}

.card-source {
  font-size: 10px;
  color: #999;
}

.card-close {
  position: absolute;
  top: 6px;
  right: 8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f0efec;
  border: none;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 5;
  padding: 0;
}

.card-close:hover {
  background: #e0ddd8;
  color: #c45c4a;
}

.card-inbox {
  position: absolute;
  top: 6px;
  right: 30px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #f0efec;
  border: none;
  cursor: pointer;
  font-size: 12px;
  line-height: 1;
  color: #999;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  z-index: 5;
  padding: 0;
}

.card-inbox:hover {
  background: #fdf3e7;
  color: #c7853a;
}

.connector-anchor {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  border: 2px solid #d0ccc4;
  position: absolute;
  z-index: 6;
  cursor: crosshair;
  transition: transform 0.15s, border-color 0.15s;
}

.connector-anchor:hover {
  border-color: #c7853a;
  transform: scale(1.4);
  background: #fdf3e7;
}

.connector-anchor.top { top: -9px; left: 50%; transform: translateX(-50%); }
.connector-anchor.top:hover { transform: translateX(-50%) scale(1.4); }
.connector-anchor.bottom { bottom: -9px; left: 50%; transform: translateX(-50%); }
.connector-anchor.bottom:hover { transform: translateX(-50%) scale(1.4); }
.connector-anchor.left { left: -9px; top: 50%; transform: translateY(-50%); }
.connector-anchor.left:hover { transform: translateY(-50%) scale(1.4); }
.connector-anchor.right { right: -9px; top: 50%; transform: translateY(-50%); }
.connector-anchor.right:hover { transform: translateY(-50%) scale(1.4); }

.card-editor {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: #fff;
  border-radius: 12px;
  z-index: 25;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 6px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1);
  border: 2px solid #c7853a;
  box-sizing: border-box;
}

.editor-textarea {
  flex: 1;
  border: 1px solid #e8e4df;
  border-radius: 8px;
  padding: 8px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  outline: none;
}

.editor-textarea:focus {
  border-color: #c7853a;
}

.btn-save {
  align-self: flex-end;
  padding: 6px 16px;
  border-radius: 16px;
  background: #c7853a;
  color: #fff;
  border: none;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
}

.btn-save:hover {
  background: #b07530;
}

/* Scoped deeper since .shattering is added dynamically */
:global(.shattering) {
  animation: shatter 0.4s ease-in forwards !important;
  pointer-events: none !important;
}

@keyframes shatter {
  0% {
    transform: scale(1);
    opacity: 1;
    filter: blur(0);
  }
  60% {
    transform: scale(1.1);
    opacity: 0.4;
    filter: blur(2px);
  }
  100% {
    transform: scale(0.3);
    opacity: 0;
    filter: blur(6px);
  }
}

@media (max-width: 800px) {
  .canvas-card {
    width: 170px;
    min-height: 80px;
    padding: 12px;
    font-size: 11px;
  }

  .card-content {
    font-size: 11px;
  }
}
</style>
