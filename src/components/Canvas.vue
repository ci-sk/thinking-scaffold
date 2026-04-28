<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import { useCanvas } from '../composables/useCanvas'
import type { CardType, RelationType } from '../types'
import { RELATION_CONFIG, CARD_SIZE } from '../types'
import CardItem from './CardItem.vue'
import ConnectionLines from './ConnectionLines.vue'

const store = useCanvasStore()
const { offsetX, offsetY, scale, transform, screenToCanvas, zoomAtPoint } = useCanvas()

const canvasRef = ref<HTMLDivElement>()
const editingCardId = ref<string | null>(null)
const selectedCardId = ref<string | null>(null)

// Pan state
const isPanning = ref(false)
const panStart = ref({ x: 0, y: 0 })
const panStartOffset = ref({ x: 0, y: 0 })

// Drag state
const draggingCardId = ref<string | null>(null)
const dragStart = ref({ x: 0, y: 0 })
const dragStartCardPos = ref({ x: 0, y: 0 })

// Connection drawing state
const isConnecting = ref(false)
const connectFromCardId = ref<string | null>(null)
const connectFromAnchor = ref('')
const connectLine = ref({ x1: 0, y1: 0, x2: 0, y2: 0 })

// Selection rectangle state
const isSelecting = ref(false)
const selectStart = ref({ x: 0, y: 0 })
const selectRect = ref({ x: 0, y: 0, w: 0, h: 0 })

// Context menu
const showContextMenu = ref(false)
const contextMenuPos = ref({ x: 0, y: 0 })
const contextMenuCardId = ref<string | null>(null)

// Relation type picker for new connections
const showRelationPicker = ref(false)
const relationPickerPos = ref({ x: 0, y: 0 })
const pendingConnection = ref<{ fromId: string; toId: string } | null>(null)

function onPointerDown(e: PointerEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement

  // Close context menu if clicking elsewhere
  showContextMenu.value = false

  // If clicking on anchor, connection drawing starts (handled in CardItem)
  if (target.closest('[data-anchor]')) return

  // If clicking on a card contenteditable area, let the editor handle it
  if (target.closest('[contenteditable]')) return

  // If clicking on a card, start drag
  const cardEl = target.closest('.card') as HTMLElement | null
  if (cardEl) {
    const cardId = cardEl.closest('[data-card-id]')?.getAttribute('data-card-id')
    if (cardId) {
      startCardDrag(cardId, e)
      selectedCardId.value = cardId
    }
    return
  }

  // Canvas background clicked
  canvasRef.value?.setPointerCapture(e.pointerId)

  if (e.shiftKey) {
    // Selection mode
    isSelecting.value = true
    const rect = canvasRef.value!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const canvas = screenToCanvas(sx, sy)
    selectStart.value = { x: canvas.x, y: canvas.y }
    selectRect.value = { x: canvas.x, y: canvas.y, w: 0, h: 0 }
  } else {
    // Pan mode
    isPanning.value = true
    panStart.value = { x: e.clientX, y: e.clientY }
    panStartOffset.value = { x: offsetX.value, y: offsetY.value }
  }
}

function onPointerMove(e: PointerEvent) {
  if (isPanning.value) {
    const dx = e.clientX - panStart.value.x
    const dy = e.clientY - panStart.value.y
    offsetX.value = panStartOffset.value.x + dx
    offsetY.value = panStartOffset.value.y + dy
    return
  }

  if (isSelecting.value && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const canvas = screenToCanvas(sx, sy)
    selectRect.value = {
      x: Math.min(selectStart.value.x, canvas.x),
      y: Math.min(selectStart.value.y, canvas.y),
      w: Math.abs(canvas.x - selectStart.value.x),
      h: Math.abs(canvas.y - selectStart.value.y),
    }
    return
  }

  if (draggingCardId.value) {
    const rect = canvasRef.value!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const dx = (sx - dragStart.value.x) / scale.value
    const dy = (sy - dragStart.value.y) / scale.value
    store.updateCard(draggingCardId.value, {
      position: {
        x: dragStartCardPos.value.x + dx,
        y: dragStartCardPos.value.y + dy,
      },
    })
    return
  }

  if (isConnecting.value && canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const canvas = screenToCanvas(sx, sy)
    connectLine.value.x2 = canvas.x
    connectLine.value.y2 = canvas.y
    return
  }
}

function onPointerUp(e: PointerEvent) {
  if (isPanning.value) {
    isPanning.value = false
    canvasRef.value?.releasePointerCapture(e.pointerId)
    return
  }

  if (isSelecting.value) {
    isSelecting.value = false
    canvasRef.value?.releasePointerCapture(e.pointerId)

    // Find cards within selection rectangle
    const selectedIds = store.cards.filter(c => {
      const cx = c.position.x + CARD_SIZE.width / 2
      const cy = c.position.y + CARD_SIZE.height / 2
      return (
        cx >= selectRect.value.x &&
        cx <= selectRect.value.x + selectRect.value.w &&
        cy >= selectRect.value.y &&
        cy <= selectRect.value.y + selectRect.value.h
      )
    }).map(c => c.id)

    if (selectedIds.length >= 2) {
      const groupName = prompt('为这个话题组命名：', '新话题组')
      if (groupName) {
        store.addTopicGroup(groupName, selectedIds, {
          x: selectRect.value.x,
          y: selectRect.value.y - 30,
        })
      }
    }
    selectRect.value = { x: 0, y: 0, w: 0, h: 0 }
    return
  }

  if (draggingCardId.value) {
    draggingCardId.value = null
    canvasRef.value?.releasePointerCapture(e.pointerId)
    return
  }

  if (isConnecting.value) {
    // Find card under pointer
    const rect = canvasRef.value!.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const canvas = screenToCanvas(sx, sy)

    const targetCard = store.cards.find(c => {
      return (
        c.id !== connectFromCardId.value &&
        canvas.x >= c.position.x &&
        canvas.x <= c.position.x + CARD_SIZE.width &&
        canvas.y >= c.position.y &&
        canvas.y <= c.position.y + CARD_SIZE.height
      )
    })

    if (targetCard && connectFromCardId.value) {
      pendingConnection.value = {
        fromId: connectFromCardId.value,
        toId: targetCard.id,
      }
      relationPickerPos.value = { x: e.clientX, y: e.clientY }
      showRelationPicker.value = true
    }

    isConnecting.value = false
    connectFromCardId.value = null
  }
}

function onWheel(e: WheelEvent) {
  e.preventDefault()
  if (canvasRef.value) {
    const rect = canvasRef.value.getBoundingClientRect()
    zoomAtPoint(e.clientX - rect.left, e.clientY - rect.top, e.deltaY)
  }
}

function startCardDrag(cardId: string, e: PointerEvent) {
  const card = store.getCard(cardId)
  if (!card || !canvasRef.value) return

  draggingCardId.value = cardId
  const rect = canvasRef.value.getBoundingClientRect()
  dragStart.value = { x: e.clientX - rect.left, y: e.clientY - rect.top }
  dragStartCardPos.value = { ...card.position }
  canvasRef.value.setPointerCapture(e.pointerId)
}

function startConnection(cardId: string, e: PointerEvent, anchor: string) {
  const card = store.getCard(cardId)
  if (!card || !canvasRef.value) return

  isConnecting.value = true
  connectFromCardId.value = cardId
  connectFromAnchor.value = anchor

  const hw = CARD_SIZE.width / 2
  const hh = CARD_SIZE.height / 2
  const cx = card.position.x + hw
  const cy = card.position.y + hh

  // Adjust based on anchor
  const offsetMap: Record<string, { x: number; y: number }> = {
    tl: { x: -hw, y: -hh },
    tr: { x: hw, y: -hh },
    bl: { x: -hw, y: hh },
    br: { x: hw, y: hh },
  }

  const aOffset = offsetMap[anchor] || { x: 0, y: 0 }
  connectLine.value = {
    x1: cx + aOffset.x,
    y1: cy + aOffset.y,
    x2: cx + aOffset.x,
    y2: cy + aOffset.y,
  }

  canvasRef.value.setPointerCapture(e.pointerId)
}

function startEditCard(cardId: string) {
  editingCardId.value = cardId
  nextTick(() => {
    const el = document.querySelector(`[data-card-id="${cardId}"] [contenteditable]`) as HTMLElement
    if (el) {
      el.focus()
      const range = document.createRange()
      range.selectNodeContents(el)
      const sel = window.getSelection()
      sel?.removeAllRanges()
      sel?.addRange(range)
    }
  })
}

function finishEditCard(cardId: string, content: string) {
  store.updateCard(cardId, { content })
  editingCardId.value = null
}

function openContextMenu(cardId: string, e: PointerEvent) {
  contextMenuCardId.value = cardId
  contextMenuPos.value = { x: e.clientX, y: e.clientY }
  showContextMenu.value = true
}

function handleContextMenuAction(action: string) {
  if (!contextMenuCardId.value) return

  switch (action) {
    case 'split':
      store.splitCard(contextMenuCardId.value)
      break
    case 'merge': {
      const conns = store.getConnectionsForCard(contextMenuCardId.value)
      const connected = conns.map(c =>
        c.fromCardId === contextMenuCardId.value ? c.toCardId : c.fromCardId
      )
      if (connected.length > 0) {
        store.mergeCards([contextMenuCardId.value, ...connected.slice(0, 1)])
      }
      break
    }
    case 'delete':
      store.deleteCard(contextMenuCardId.value)
      break
    case 'cycleType': {
      const card = store.getCard(contextMenuCardId.value)
      if (card) {
        const types: CardType[] = ['idea', 'quote', 'case', 'question']
        const idx = types.indexOf(card.type)
        store.updateCard(card.id, { type: types[(idx + 1) % types.length] })
      }
      break
    }
  }
  showContextMenu.value = false
}

function handleDblClickCanvas(e: MouseEvent) {
  if (!canvasRef.value) return
  const rect = canvasRef.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const pos = screenToCanvas(sx, sy)

  const content = prompt('输入想法内容：')
  if (content?.trim()) {
    store.addCard({
      type: 'idea',
      content: content.trim(),
      position: pos,
    })
  }
}

function addConnection(relationType: RelationType) {
  if (!pendingConnection.value) return
  store.addConnection(
    pendingConnection.value.fromId,
    pendingConnection.value.toId,
    relationType,
  )
  showRelationPicker.value = false
  pendingConnection.value = null
}

function onCanvasContainerClick() {
  showContextMenu.value = false
  showRelationPicker.value = false
}

onMounted(() => {
  canvasRef.value?.addEventListener('wheel', onWheel, { passive: false })
})

onUnmounted(() => {
  canvasRef.value?.removeEventListener('wheel', onWheel)
})
</script>

<template>
  <div
    ref="canvasRef"
    class="flex-1 relative overflow-hidden select-none"
    :style="{ background: '#f0eee8' }"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointerleave="onPointerUp"
    @dblclick="handleDblClickCanvas"
    @click="onCanvasContainerClick"
  >
    <!-- Dot grid background -->
    <div class="absolute inset-0" :style="{
      backgroundImage: 'radial-gradient(circle, #d4d0c8 1px, transparent 1px)',
      backgroundSize: `${20 * scale}px ${20 * scale}px`,
      backgroundPosition: `${offsetX}px ${offsetY}px`,
    }" />

    <!-- Empty state -->
    <div
      v-if="store.cards.length === 0"
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <p class="text-gray-400 text-base font-serif italic">
        把碎片拖到此处，开始拼凑你的想法
      </p>
    </div>

    <!-- Canvas transform container -->
    <div
      class="absolute"
      :style="{ transform, transformOrigin: '0 0' }"
    >
      <ConnectionLines :connections="store.connections" />

      <!-- Card items -->
      <CardItem
        v-for="card in store.cards"
        :key="card.id"
        :card="card"
        :selected="card.id === selectedCardId"
        :editing="card.id === editingCardId"
        :data-card-id="card.id"
        @start-edit="startEditCard"
        @finish-edit="finishEditCard"
        @start-connect="startConnection"
        @open-context-menu="openContextMenu"
      />

      <!-- Connection drawing line -->
      <svg
        v-if="isConnecting"
        class="absolute inset-0 pointer-events-none"
        style="width: 100%; height: 100%"
      >
        <line
          :x1="connectLine.x1"
          :y1="connectLine.y1"
          :x2="connectLine.x2"
          :y2="connectLine.y2"
          stroke="#c7853a"
          stroke-width="2"
          stroke-dasharray="6,4"
        />
      </svg>

      <!-- Selection rectangle -->
      <div
        v-if="isSelecting && selectRect.w > 5"
        class="absolute border-2 border-warm bg-warm/10 rounded pointer-events-none"
        :style="{
          left: selectRect.x + 'px',
          top: selectRect.y + 'px',
          width: selectRect.w + 'px',
          height: selectRect.h + 'px',
        }"
      />
    </div>

    <!-- Context menu -->
    <Teleport to="body">
      <div
        v-if="showContextMenu"
        class="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-36"
        :style="{ left: contextMenuPos.x + 'px', top: contextMenuPos.y + 'px' }"
      >
        <button class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2" @click="handleContextMenuAction('split')">
          ✂️ 拆分卡片
        </button>
        <button class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2" @click="handleContextMenuAction('merge')">
          🔗 与连线卡片合并
        </button>
        <button class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2" @click="handleContextMenuAction('cycleType')">
          🔄 切换类型
        </button>
        <hr class="my-1 border-gray-100" />
        <button class="w-full text-left px-3 py-1.5 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2" @click="handleContextMenuAction('delete')">
          🗑️ 删除
        </button>
      </div>
    </Teleport>

    <!-- Relation type picker -->
    <Teleport to="body">
      <div
        v-if="showRelationPicker"
        class="fixed z-50 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-36"
        :style="{ left: relationPickerPos.x + 'px', top: relationPickerPos.y + 'px' }"
      >
        <button
          v-for="(config, type) in RELATION_CONFIG"
          :key="type"
          class="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 flex items-center gap-2"
          @click="addConnection(type as RelationType)"
        >
          <span
            class="w-2.5 h-2.5 rounded-full"
            :style="{ backgroundColor: config.color }"
          />
          {{ config.label }}
          <span class="text-[10px] text-gray-400 ml-auto">{{ config.style === 'dashed' ? '┅' : config.style === 'dotted' ? '···' : '──' }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>
