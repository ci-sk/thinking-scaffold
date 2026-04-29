<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import type { AnchorDir } from '../types'
import CardItem from './CardItem.vue'

const store = useCanvasStore()

const canvasContainer = ref<HTMLDivElement>()
const canvasInner = ref<HTMLDivElement>()
const canvasSvg = ref<SVGSVGElement>()

const dragCard = ref<{ id: string; offX: number; offY: number } | null>(null)
const draggingCardId = ref<string | null>(null)

const lineDrag = ref({
  active: false,
  fromCardId: null as string | null,
  startX: 0,
  startY: 0,
  tempLine: null as SVGLineElement | null,
})

const redrawKey = ref(0)

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

// --- Card drag (mouse) ---
function onCardMouseDown(e: MouseEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement
  if (target.closest('.connector-anchor') || target.closest('.card-close') || target.closest('.card-editor')) return
  const cardEl = target.closest('.canvas-card') as HTMLElement | null
  if (!cardEl) return
  const cardId = cardEl.dataset.cardId
  if (!cardId) return
  const card = store.getCard(cardId)
  if (!card) return
  e.preventDefault()
  startCardDrag(cardId, e.clientX, e.clientY)
  document.addEventListener('mousemove', onCardMouseMove)
  document.addEventListener('mouseup', onCardMouseUp)
}

function onCardMouseMove(e: MouseEvent) { moveCardDrag(e.clientX, e.clientY) }
function onCardMouseUp() { endCardDrag(false) }

// --- Card drag (touch) ---
function onCardTouchStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  const target = e.target as HTMLElement
  if (target.closest('.connector-anchor') || target.closest('.card-close') || target.closest('.card-editor')) return
  const cardEl = target.closest('.canvas-card') as HTMLElement | null
  if (!cardEl) return
  const cardId = cardEl.dataset.cardId
  if (!cardId) return
  const card = store.getCard(cardId)
  if (!card) return
  e.preventDefault()
  const t = e.touches[0]
  startCardDrag(cardId, t.clientX, t.clientY)
  document.addEventListener('touchmove', onCardTouchMove, { passive: false })
  document.addEventListener('touchend', onCardTouchEnd)
}

function onCardTouchMove(e: TouchEvent) {
  e.preventDefault()
  moveCardDrag(e.touches[0].clientX, e.touches[0].clientY)
}

function onCardTouchEnd() { endCardDrag(true) }

// --- Shared card drag logic ---
function startCardDrag(id: string, cx: number, cy: number) {
  const card = store.getCard(id)
  if (!card) return
  dragCard.value = { id, offX: cx - card.position.x, offY: cy - card.position.y }
  draggingCardId.value = id
}

function moveCardDrag(cx: number, cy: number) {
  if (!dragCard.value || !canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  let nx = cx - dragCard.value.offX
  let ny = cy - dragCard.value.offY
  nx = clamp(nx, 0, rect.width - 240)
  ny = clamp(ny, 0, rect.height - 120)
  store.updateCard(dragCard.value.id, { position: { x: nx, y: ny }, rotation: 0 })
  redrawKey.value++
}

function endCardDrag(isTouch: boolean) {
  if (dragCard.value) {
    store.updateCard(dragCard.value.id, { rotation: (Math.random() - 0.5) * 3 })
  }
  dragCard.value = null
  draggingCardId.value = null
  redrawKey.value++
  if (isTouch) {
    document.removeEventListener('touchmove', onCardTouchMove)
    document.removeEventListener('touchend', onCardTouchEnd)
  } else {
    document.removeEventListener('mousemove', onCardMouseMove)
    document.removeEventListener('mouseup', onCardMouseUp)
  }
}

// --- Connection drawing (mouse) ---
function onAnchorMouseDown(cardId: string, e: MouseEvent, _dir: AnchorDir) {
  e.preventDefault()
  e.stopPropagation()
  startLineDrag(e.clientX, e.clientY, cardId)
  document.addEventListener('mousemove', onLineDragMouseMove)
  document.addEventListener('mouseup', onLineDragMouseEnd)
}

function onLineDragMouseMove(e: MouseEvent) { moveLineDrag(e.clientX, e.clientY) }
function onLineDragMouseEnd(e: MouseEvent) { endLineDrag(e.clientX, e.clientY, false) }

// --- Connection drawing (touch) ---
function onAnchorTouchStart(cardId: string, e: TouchEvent, _dir: AnchorDir) {
  e.preventDefault()
  e.stopPropagation()
  const t = e.touches[0]
  startLineDrag(t.clientX, t.clientY, cardId)
  document.addEventListener('touchmove', onLineDragTouchMove, { passive: false })
  document.addEventListener('touchend', onLineDragTouchEnd)
}

function onLineDragTouchMove(e: TouchEvent) {
  e.preventDefault()
  moveLineDrag(e.touches[0].clientX, e.touches[0].clientY)
}

function onLineDragTouchEnd(e: TouchEvent) {
  endLineDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY, true)
}

// --- Shared line drag logic ---
function startLineDrag(cx: number, cy: number, cardId: string) {
  if (!canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  lineDrag.value = {
    active: true,
    fromCardId: cardId,
    startX: cx - rect.left,
    startY: cy - rect.top,
    tempLine: null,
  }
}

function moveLineDrag(cx: number, cy: number) {
  if (!lineDrag.value.active || !canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  const mx = cx - rect.left
  const my = cy - rect.top
  drawTempLine(lineDrag.value.startX, lineDrag.value.startY, mx, my)
}

function drawTempLine(x1: number, y1: number, x2: number, y2: number) {
  if (!lineDrag.value.tempLine && canvasSvg.value) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.classList.add('temp-line')
    line.style.cssText = 'stroke:#c7853a;stroke-width:2.5;stroke-dasharray:6 4;opacity:0.8;pointer-events:none;'
    canvasSvg.value.appendChild(line)
    lineDrag.value.tempLine = line
  }
  if (lineDrag.value.tempLine) {
    lineDrag.value.tempLine.setAttribute('x1', String(x1))
    lineDrag.value.tempLine.setAttribute('y1', String(y1))
    lineDrag.value.tempLine.setAttribute('x2', String(x2))
    lineDrag.value.tempLine.setAttribute('y2', String(y2))
  }
}

function removeTempLine() {
  if (lineDrag.value.tempLine) {
    lineDrag.value.tempLine.remove()
    lineDrag.value.tempLine = null
  }
}

function endLineDrag(cx: number, cy: number, isTouch: boolean) {
  if (!lineDrag.value.active || !canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  const mx = cx - rect.left + rect.left
  const my = cy - rect.top + rect.top
  finishLine(mx, my)
  if (isTouch) {
    document.removeEventListener('touchmove', onLineDragTouchMove)
    document.removeEventListener('touchend', onLineDragTouchEnd)
  } else {
    document.removeEventListener('mousemove', onLineDragMouseMove)
    document.removeEventListener('mouseup', onLineDragMouseEnd)
  }
}

function finishLine(mx: number, my: number) {
  removeTempLine()
  const targetEl = document.elementFromPoint(mx, my)
  const cardEl = targetEl?.closest('.canvas-card') as HTMLElement | null
  if (cardEl && lineDrag.value.fromCardId) {
    const toId = cardEl.dataset.cardId
    if (toId && toId !== lineDrag.value.fromCardId) {
      const exists = store.connections.some(
        c => (c.from === lineDrag.value.fromCardId && c.to === toId) ||
             (c.from === toId && c.to === lineDrag.value.fromCardId)
      )
      if (!exists) {
        store.addConnection(lineDrag.value.fromCardId, toId, '#c7853a')
        redrawKey.value++
      }
    }
  }
  lineDrag.value.active = false
  lineDrag.value.fromCardId = null
}

// --- SVG connections drawing ---
function drawSvgConnections() {
  if (!canvasSvg.value || !canvasContainer.value || !canvasInner.value) return
  const svg = canvasSvg.value
  const rect = canvasContainer.value.getBoundingClientRect()
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`)
  svg.style.width = rect.width + 'px'
  svg.style.height = rect.height + 'px'

  svg.querySelectorAll('path.conn-path').forEach(p => p.remove())

  store.connections.forEach(conn => {
    const fromEl = canvasInner.value!.querySelector(`[data-card-id="${conn.from}"]`) as HTMLElement | null
    const toEl = canvasInner.value!.querySelector(`[data-card-id="${conn.to}"]`) as HTMLElement | null
    if (!fromEl || !toEl) return

    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()
    const containerRect = canvasContainer.value!.getBoundingClientRect()

    const x1 = fromRect.left + fromRect.width / 2 - containerRect.left
    const y1 = fromRect.top + fromRect.height / 2 - containerRect.top
    const x2 = toRect.left + toRect.width / 2 - containerRect.left
    const y2 = toRect.top + toRect.height / 2 - containerRect.top

    const dx = x2 - x1
    const dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const curv = Math.min(dist * 0.3, 50)
    const perpX = -dy / dist * curv
    const perpY = dx / dist * curv

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.classList.add('conn-path')
    path.setAttribute('d', `M${x1} ${y1} C${x1 + perpX} ${y1 + perpY}, ${x2 + perpX} ${y2 + perpY}, ${x2} ${y2}`)
    path.setAttribute('stroke', conn.color || '#b0b0b0')
    path.setAttribute('stroke-width', '2.5')
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke-linecap', 'round')
    svg.appendChild(path)
  })
}

// --- Canvas double-click to add card ---
function onCanvasDblClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.canvas-card')) return
  if (!canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  const content = prompt('输入想法内容：')
  if (content?.trim()) {
    store.addCard({
      type: 'idea',
      content: content.trim(),
      position: {
        x: clamp(e.clientX - rect.left - 110, 0, rect.width - 240),
        y: clamp(e.clientY - rect.top - 50, 0, rect.height - 120),
      },
    })
    redrawKey.value++
  }
}

function onCardDelete(id: string) {
  store.deleteCard(id)
  redrawKey.value++
}

function onCardUpdate(id: string, changes: Partial<import('../types').Card>) {
  store.updateCard(id, changes)
  redrawKey.value++
}

function onResize() {
  drawSvgConnections()
  redrawKey.value++
}

watch(() => store.connections.length, () => {
  nextTick(() => drawSvgConnections())
})

watch(() => store.cards.length, () => {
  nextTick(() => drawSvgConnections())
})

watch(redrawKey, () => {
  nextTick(() => drawSvgConnections())
})

onMounted(() => {
  store.initSeedData()
  nextTick(() => drawSvgConnections())
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
})
</script>

<template>
  <div
    ref="canvasContainer"
    class="canvas-container"
    @mousedown="onCardMouseDown"
    @touchstart.prevent="onCardTouchStart"
    @dblclick="onCanvasDblClick"
  >
    <div ref="canvasInner" class="canvas-inner">
      <CardItem
        v-for="card in store.cards"
        :key="card.id"
        :card="card"
        :selected="card.id === draggingCardId"
        @delete="onCardDelete"
        @start-connect="onAnchorMouseDown"
        @start-connect-touch="onAnchorTouchStart"
        @update="onCardUpdate"
      />
    </div>

    <svg ref="canvasSvg" class="canvas-svg" />

    <div class="canvas-hint">
      拖拽卡片 · 从锚点拖线连接 · 双击编辑 · 点击顶部缝合
    </div>
  </div>
</template>

<style scoped>
.canvas-container {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle, rgba(0, 0, 0, 0.015) 1px, transparent 1px);
  background-size: 24px 24px;
  cursor: grab;
  touch-action: none;
}

.canvas-container:active {
  cursor: grabbing;
}

.canvas-inner {
  width: 100%;
  height: 100%;
  position: relative;
}

.canvas-svg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}

.canvas-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #c5bfb5;
  pointer-events: none;
  z-index: 2;
  text-align: center;
  white-space: nowrap;
}

@media (max-width: 800px) {
  .canvas-hint {
    display: none;
  }
}
</style>
