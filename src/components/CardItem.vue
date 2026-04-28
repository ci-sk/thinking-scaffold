<script setup lang="ts">
import { computed } from 'vue'
import type { Card } from '../types'
import { CARD_TYPE_CONFIG, CARD_SIZE } from '../types'

const props = defineProps<{
  card: Card
  selected: boolean
  editing: boolean
}>()

const emit = defineEmits<{
  startEdit: [id: string]
  finishEdit: [id: string, content: string]
  startConnect: [id: string, e: PointerEvent, anchor: string]
  openContextMenu: [id: string, e: PointerEvent]
}>()

const config = computed(() => CARD_TYPE_CONFIG[props.card.type])

function onDoubleClick() {
  emit('startEdit', props.card.id)
}

function onFinishEdit(e: Event) {
  const target = e.target as HTMLElement
  emit('finishEdit', props.card.id, target.textContent || '')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    ;(e.target as HTMLElement).blur()
  }
}

function onContextMenu(e: PointerEvent) {
  e.preventDefault()
  emit('openContextMenu', props.card.id, e)
}

function onAnchorPointerDown(e: PointerEvent, anchor: string) {
  e.stopPropagation()
  e.preventDefault()
  emit('startConnect', props.card.id, e, anchor)
}

const anchors = ['tl', 'tr', 'bl', 'br']

function anchorPosition(anchor: string) {
  const w = CARD_SIZE.width
  const h = CARD_SIZE.height
  const map: Record<string, { x: number; y: number }> = {
    tl: { x: 0, y: 0 },
    tr: { x: w, y: 0 },
    bl: { x: 0, y: h },
    br: { x: w, y: h },
  }
  return map[anchor] || { x: 0, y: 0 }
}
</script>

<template>
  <div
    class="card absolute select-none cursor-grab active:cursor-grabbing"
    :class="{
      'ring-2 ring-warm ring-offset-1 z-10': selected,
      'card-shadow': !selected,
      'card-shadow-hover': selected,
    }"
    :style="{
      left: card.position.x + 'px',
      top: card.position.y + 'px',
      width: CARD_SIZE.width + 'px',
      minHeight: CARD_SIZE.height + 'px',
      transform: `rotate(${card.rotation}deg)`,
    }"
    @dblclick="onDoubleClick"
    @contextmenu="onContextMenu"
  >
    <div
      class="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
      :style="{ backgroundColor: config.color }"
    />
    <div class="bg-white rounded-xl overflow-hidden h-full w-full border border-gray-100/80 pl-3 pr-3 pt-2.5 pb-2.5">
      <div class="flex items-center gap-1.5 mb-1.5">
        <span class="text-xs">{{ config.icon }}</span>
        <span class="text-[10px] font-medium uppercase tracking-wider text-gray-400">{{ config.label }}</span>
      </div>
      <div
        v-if="!editing"
        class="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap line-clamp-4 cursor-text"
      >
        {{ card.content }}
      </div>
      <div
        v-else
        contenteditable="true"
        class="text-xs leading-relaxed text-gray-700 whitespace-pre-wrap outline-none border-b border-warm/30 pb-1"
        @blur="onFinishEdit"
        @keydown="onKeydown"
        v-text="card.content"
      />
      <div v-if="card.source && !editing" class="mt-1.5">
        <span class="text-[10px] text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded truncate block">
          {{ card.source }}
        </span>
      </div>
      <div v-if="card.tags.length > 0 && !editing" class="mt-1.5 flex flex-wrap gap-1">
        <span
          v-for="tag in card.tags"
          :key="tag"
          class="text-[10px] px-1.5 py-0.5 rounded-full bg-warm-bg text-warm"
        >{{ tag }}</span>
      </div>
      <div class="mt-2 flex gap-0.5">
        <span
          v-for="i in 3"
          :key="i"
          class="text-[10px]"
          :class="i <= card.importance ? 'text-warm' : 'text-gray-200'"
        >★</span>
      </div>
      <div
        v-if="selected"
        v-for="anchor in anchors"
        :key="anchor"
        class="absolute w-2.5 h-2.5 rounded-full border-2 border-warm bg-white cursor-crosshair hover:scale-125 transition-transform"
        :style="{
          left: anchorPosition(anchor).x - 5 + 'px',
          top: anchorPosition(anchor).y - 5 + 'px',
        }"
        @pointerdown.stop.prevent="onAnchorPointerDown($event, anchor)"
      />
    </div>
  </div>
</template>
