<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useCanvasStore } from '../stores/canvas'
import type { LineStyle } from '../types'
import CardItem from './CardItem.vue'

const store = useCanvasStore()

const canvasContainer = ref<HTMLDivElement>()
const canvasInner = ref<HTMLDivElement>()
const canvasSvg = ref<SVGSVGElement>()

const dragCard = ref<{ id: string; offX: number; offY: number } | null>(null)
const draggingCardId = ref<string | null>(null)
const dragStartLocal = ref({ x: 0, y: 0 })

const lineDrag = ref({
  active: false,
  fromCardId: null as string | null,
  startX: 0,
  startY: 0,
  tempLine: null as SVGLineElement | null,
})

const pendingConnection = ref<{ fromId: string; toId: string } | null>(null)

// Canvas panning
const canvasPan = ref({ panning: false, startX: 0, startY: 0, scrollX: 0, scrollY: 0 })
const panOffsetX = ref(0)
const panOffsetY = ref(0)

// Gesture hash for delete (Shift+drag)
const isGestureHashing = ref(false)
const gesturePath = ref<{ x: number; y: number }[]>([])

const particles = ref<{ id: number; x: number; y: number; color: string; angle: number; speed: number; size: number; life: number }[]>([])
let particleId = 0

const connectionTypes: { type: string; color: string; dash: LineStyle }[] = [
  { type: '支撑', color: '#74c476', dash: 'solid' },
  { type: '反驳', color: '#e57373', dash: 'dashed' },
  { type: '延伸', color: '#6baed6', dash: 'dotted' },
  { type: '相关', color: '#bdbdbd', dash: 'solid' },
]

const redrawKey = ref(0)
const scale = ref(1)
const canvasHint = ref('拖拽空白平移 | 滚轮缩放 | 拖拽卡片 | 锚点连线 | Ctrl+划擦删除')

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val))
}

// --- Unified mousedown handler ---
function onCanvasMousedown(e: MouseEvent) {
  if (e.button !== 0) return
  const target = e.target as HTMLElement

  // Anchor click → connection drawing
  if (target.closest('.connector-anchor')) {
    const cardEl = target.closest('.canvas-card') as HTMLElement | null
    if (!cardEl) return
    const cardId = cardEl.dataset.cardId
    if (!cardId) return
    e.preventDefault(); e.stopPropagation()
    startLineDrag(e.clientX, e.clientY, cardId)
    document.addEventListener('mousemove', onLineDragMouseMove)
    document.addEventListener('mouseup', onLineDragMouseEnd)
    return
  }

  // Close/X button or editor → don't intercept
  if (target.closest('.card-close') || target.closest('.card-editor') || target.closest('.conn-hit') || target.closest('.conn-label')) return

  // Card drag
  const cardEl = target.closest('.canvas-card') as HTMLElement | null
  if (cardEl) {
    const cardId = cardEl.dataset.cardId
    if (!cardId) return
    if (!store.getCard(cardId)) return
    e.preventDefault(); e.stopPropagation()
    startCardDrag(cardId, e.clientX, e.clientY)
    document.addEventListener('mousemove', onCardMouseMove)
    document.addEventListener('mouseup', onCardMouseUp)
    return
  }

  // Clicked blank space → hash delete or pan
  if (e.shiftKey || e.ctrlKey || e.metaKey) {
    isGestureHashing.value = true
    gesturePath.value = [{ x: e.clientX, y: e.clientY }]
    document.addEventListener('mousemove', onGesturePointerMove)
    document.addEventListener('mouseup', onGesturePointerUp)
    return
  }

  // Otherwise pan
  canvasPan.value = { panning: true, startX: e.clientX, startY: e.clientY, scrollX: panOffsetX.value, scrollY: panOffsetY.value }
  document.addEventListener('mousemove', onPanPointerMove)
  document.addEventListener('mouseup', onPanPointerUp)
}

function onPanPointerMove(e: MouseEvent) {
  if (!canvasPan.value.panning) return
  const dx = e.clientX - canvasPan.value.startX
  const dy = e.clientY - canvasPan.value.startY
  panOffsetX.value = canvasPan.value.scrollX + dx
  panOffsetY.value = canvasPan.value.scrollY + dy
}

function onPanPointerUp(_e: MouseEvent) {
  if (!canvasPan.value.panning) return
  canvasPan.value.panning = false
  document.removeEventListener('mousemove', onPanPointerMove)
  document.removeEventListener('mouseup', onPanPointerUp)
}

// --- Wheel zoom ---
function onCanvasWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = -e.deltaY * 0.002
  const newScale = clamp(scale.value + delta, 0.1, 2)
  // Zoom towards cursor position
  if (canvasContainer.value) {
    const rect = canvasContainer.value.getBoundingClientRect()
    const cx = e.clientX - rect.left
    const cy = e.clientY - rect.top
    const ratio = newScale / scale.value
    panOffsetX.value = cx - (cx - panOffsetX.value) * ratio
    panOffsetY.value = cy - (cy - panOffsetY.value) * ratio
  }
  scale.value = newScale
  redrawKey.value++
}

function onCanvasWheelHandler(e: WheelEvent) { onCanvasWheel(e) }

// --- Gesture hash for delete ---
function onGesturePointerMove(e: MouseEvent) {
  if (!isGestureHashing.value) return
  gesturePath.value.push({ x: e.clientX, y: e.clientY })
}

function onGesturePointerUp(_e: MouseEvent) {
  if (!isGestureHashing.value) return
  document.removeEventListener('mousemove', onGesturePointerMove)
  document.removeEventListener('mouseup', onGesturePointerUp)
  isGestureHashing.value = false

  if (gesturePath.value.length < 8) { gesturePath.value = []; return }

  const crossedCards = new Set<string>()
  const crossedLines = new Set<string>()

  for (const card of store.cards) {
    const el = canvasInner.value?.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement | null
    if (!el) continue
    const r = el.getBoundingClientRect()
    for (const pt of gesturePath.value) {
      if (pt.x >= r.left && pt.x <= r.right && pt.y >= r.top && pt.y <= r.bottom) {
        crossedCards.add(card.id)
        break
      }
    }
  }

  if (canvasInner.value) {
    for (const conn of store.connections) {
      const fromEl = canvasInner.value.querySelector(`[data-card-id="${conn.from}"]`) as HTMLElement | null
      const toEl = canvasInner.value.querySelector(`[data-card-id="${conn.to}"]`) as HTMLElement | null
      if (!fromEl || !toEl) continue
      const fromRect = fromEl.getBoundingClientRect()
      const toRect = toEl.getBoundingClientRect()
      const cx1 = fromRect.left + fromRect.width / 2
      const cy1 = fromRect.top + fromRect.height / 2
      const cx2 = toRect.left + toRect.width / 2
      const cy2 = toRect.top + toRect.height / 2
      for (const pt of gesturePath.value) {
        if (pointToSegmentDist(pt.x, pt.y, cx1, cy1, cx2, cy2) < 24) {
          crossedLines.add(conn.id)
          break
        }
      }
    }
  }

  const targets: { el: HTMLElement; color: string; x: number; y: number }[] = []
  for (const id of crossedCards) {
    const el = canvasInner.value?.querySelector(`[data-card-id="${id}"]`) as HTMLElement | null
    if (el) {
      const r = el.getBoundingClientRect()
      const colors = ['#c7853a', '#5b7f95', '#6b8f71', '#8b7da8']
      targets.push({ el, color: colors[Math.floor(Math.random() * colors.length)], x: r.left + r.width / 2, y: r.top + r.height / 2 })
    }
  }

  if (targets.length > 0 || crossedLines.size > 0) {
    for (const t of targets) t.el.classList.add('shattering')
    spawnParticles(targets)
    setTimeout(() => {
      for (const t of targets) t.el.classList.remove('shattering')
      for (const id of crossedCards) store.deleteCard(id)
      for (const id of crossedLines) store.deleteConnection(id)
      redrawKey.value++
    }, 400)
  }

  gesturePath.value = []
}

function pointToSegmentDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}

function spawnParticles(targets: { el: HTMLElement; color: string; x: number; y: number }[]) {
  const newParticles: typeof particles.value = []
  for (const t of targets) {
    for (let i = 0; i < 16; i++) {
      newParticles.push({
        id: particleId++, x: t.x, y: t.y, color: t.color,
        angle: Math.random() * Math.PI * 2, speed: 60 + Math.random() * 140,
        size: 3 + Math.random() * 6, life: 500 + Math.random() * 300,
      })
    }
  }
  particles.value = newParticles
  setTimeout(() => { particles.value = [] }, 900)
}

function onCardMouseMove(e: MouseEvent) { moveCardDrag(e.clientX, e.clientY) }
function onCardMouseUp() { endCardDrag() }

// --- Touch handler ---
function onCanvasTouchstart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  const target = e.target as HTMLElement

  if (target.closest('.connector-anchor')) {
    const cardEl = target.closest('.canvas-card') as HTMLElement | null
    if (!cardEl) return
    const cardId = cardEl.dataset.cardId
    if (!cardId) return
    e.preventDefault(); e.stopPropagation()
    const t = e.touches[0]
    startLineDrag(t.clientX, t.clientY, cardId)
    document.addEventListener('touchmove', onLineDragTouchMove, { passive: false })
    document.addEventListener('touchend', onLineDragTouchEnd)
    return
  }

  if (target.closest('.card-close') || target.closest('.card-editor')) return

  const cardEl = target.closest('.canvas-card') as HTMLElement | null
  if (cardEl) {
    const cardId = cardEl.dataset.cardId
    if (!cardId) return
    if (!store.getCard(cardId)) return
    e.preventDefault(); e.stopPropagation()
    const t = e.touches[0]
    startCardDrag(cardId, t.clientX, t.clientY)
    document.addEventListener('touchmove', onCardTouchMove, { passive: false })
    document.addEventListener('touchend', onCardTouchEnd)
    return
  }
}

function onCardTouchMove(e: TouchEvent) { e.preventDefault(); moveCardDrag(e.touches[0].clientX, e.touches[0].clientY) }
function onCardTouchEnd() { endCardDrag() }

function startCardDrag(id: string, cx: number, cy: number) {
  const card = store.getCard(id)
  if (!card) return
  dragCard.value = { id, offX: card.position.x, offY: card.position.y }
  draggingCardId.value = id
  const local = screenToLocal(cx, cy)
  dragStartLocal.value = { x: local.x, y: local.y }
}

function moveCardDrag(cx: number, cy: number) {
  if (!dragCard.value || !canvasContainer.value) return
  const local = screenToLocal(cx, cy)
  const dx = local.x - dragStartLocal.value.x
  const dy = local.y - dragStartLocal.value.y
  store.updateCard(dragCard.value.id, {
    position: { x: dragCard.value.offX + dx, y: dragCard.value.offY + dy },
    rotation: 0,
  })
  redrawKey.value++
}

function endCardDrag() {
  if (dragCard.value) store.updateCard(dragCard.value.id, { rotation: (Math.random() - 0.5) * 3 })
  dragCard.value = null; draggingCardId.value = null; redrawKey.value++
  document.removeEventListener('mousemove', onCardMouseMove)
  document.removeEventListener('mouseup', onCardMouseUp)
  document.removeEventListener('touchmove', onCardTouchMove)
  document.removeEventListener('touchend', onCardTouchEnd)
}

// --- Connection drawing ---
function onLineDragMouseMove(e: MouseEvent) { moveLineDrag(e.clientX, e.clientY) }
function onLineDragMouseEnd(e: MouseEvent) { endLineDrag(e.clientX, e.clientY) }

function onLineDragTouchMove(e: TouchEvent) { e.preventDefault(); moveLineDrag(e.touches[0].clientX, e.touches[0].clientY) }
function onLineDragTouchEnd(e: TouchEvent) { endLineDrag(e.changedTouches[0].clientX, e.changedTouches[0].clientY) }

function screenToLocal(sx: number, sy: number): { x: number; y: number } {
  if (!canvasContainer.value) return { x: sx, y: sy }
  const r = canvasContainer.value.getBoundingClientRect()
  return {
    x: (sx - r.left - panOffsetX.value) / scale.value,
    y: (sy - r.top - panOffsetY.value) / scale.value,
  }
}

function startLineDrag(cx: number, cy: number, cardId: string) {
  const local = screenToLocal(cx, cy)
  lineDrag.value = { active: true, fromCardId: cardId, startX: local.x, startY: local.y, tempLine: null }
}

function moveLineDrag(cx: number, cy: number) {
  if (!lineDrag.value.active) return
  const local = screenToLocal(cx, cy)
  drawTempLine(lineDrag.value.startX, lineDrag.value.startY, local.x, local.y)
}

function drawTempLine(x1: number, y1: number, x2: number, y2: number) {
  if (!lineDrag.value.tempLine && canvasSvg.value) {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    line.classList.add('temp-line')
    line.style.cssText = 'stroke:#c7853a;stroke-width:2.5;stroke-dasharray:6 4;opacity:0.8;'
    canvasSvg.value.appendChild(line)
    lineDrag.value.tempLine = line
  }
  if (lineDrag.value.tempLine) {
    lineDrag.value.tempLine.setAttribute('x1', String(x1)); lineDrag.value.tempLine.setAttribute('y1', String(y1))
    lineDrag.value.tempLine.setAttribute('x2', String(x2)); lineDrag.value.tempLine.setAttribute('y2', String(y2))
  }
}

function removeTempLine() { if (lineDrag.value.tempLine) { lineDrag.value.tempLine.remove(); lineDrag.value.tempLine = null } }

function endLineDrag(cx: number, cy: number) {
  if (!lineDrag.value.active || !canvasContainer.value) return
  finishLine(cx, cy)
  document.removeEventListener('mousemove', onLineDragMouseMove); document.removeEventListener('mouseup', onLineDragMouseEnd)
  document.removeEventListener('touchmove', onLineDragTouchMove); document.removeEventListener('touchend', onLineDragTouchEnd)
}

function finishLine(cx: number, cy: number) {
  removeTempLine()
  const fromId = lineDrag.value.fromCardId
  if (!fromId) { lineDrag.value.active = false; return }

  const targetEl = document.elementFromPoint(cx, cy)
  let toId: string | undefined

  // Try elementFromPoint first
  const cardEl = targetEl?.closest('.canvas-card') as HTMLElement | null
  if (cardEl) {
    toId = cardEl.dataset.cardId
  }

  // Fallback: check all card bounding rects
  if (!toId && canvasInner.value) {
    for (const card of store.cards) {
      if (card.id === fromId) continue
      const el = canvasInner.value.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement | null
      if (!el) continue
      const r = el.getBoundingClientRect()
      if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
        toId = card.id
        break
      }
    }
  }

  if (toId && toId !== fromId) {
    const exists = store.connections.some(c => (c.from === fromId && c.to === toId) || (c.from === toId && c.to === fromId))
    if (!exists) {
      pendingConnection.value = { fromId, toId }
      showPickerDOM()
    }
  }
  lineDrag.value.active = false; lineDrag.value.fromCardId = null
}

function applyConnectionType(type: { type: string; color: string; dash: LineStyle }) {
  if (!pendingConnection.value) return
  store.addConnection(pendingConnection.value.fromId, pendingConnection.value.toId, type.color, type.dash, type.type)
  hidePickerDOM()
  pendingConnection.value = null; redrawKey.value++
}

function cancelTypePicker() { hidePickerDOM(); pendingConnection.value = null }

let pickerEl: HTMLDivElement | null = null

function showPickerDOM() {
  if (pickerEl) pickerEl.remove()
  pickerEl = document.createElement('div')
  pickerEl.className = 'type-picker-overlay'
  pickerEl.innerHTML = `
    <div class="type-picker" style="position:relative">
      <div class="type-picker-title">选择连线类型</div>
      <div class="type-option" data-type="support"><span class="type-dot" style="background:#74c476"></span><span>支撑</span></div>
      <div class="type-option" data-type="refute"><span class="type-dot" style="background:#e57373"></span><span>反驳</span></div>
      <div class="type-option" data-type="extend"><span class="type-dot" style="background:#6baed6"></span><span>延伸</span></div>
      <div class="type-option" data-type="related"><span class="type-dot" style="background:#bdbdbd"></span><span>相关</span></div>
      <div class="type-option type-cancel">取消</div>
    </div>`
  pickerEl.addEventListener('click', (e) => {
    if (e.target === pickerEl) cancelTypePicker()
    const opt = (e.target as HTMLElement).closest('.type-option') as HTMLElement | null
    if (!opt) return
    if (opt.classList.contains('type-cancel')) { cancelTypePicker(); return }
    const dt = opt.dataset.type
    const map: Record<string, { type: string; color: string; dash: LineStyle }> = {
      support: connectionTypes[0], refute: connectionTypes[1], extend: connectionTypes[2], related: connectionTypes[3],
    }
    if (map[dt || '']) applyConnectionType(map[dt || ''])
  })
  document.body.appendChild(pickerEl)
}

function hidePickerDOM() {
  if (pickerEl) { pickerEl.remove(); pickerEl = null }
}

// --- SVG connections ---
function drawSvgConnections() {
  if (!canvasSvg.value || !canvasInner.value) return
  const svg = canvasSvg.value
  // Calculate bounds from all cards
  let maxX = 2000, maxY = 2000, minX = -500, minY = -500
  for (const card of store.cards) {
    if (card.position.x + 240 > maxX) maxX = card.position.x + 400
    if (card.position.y + 160 > maxY) maxY = card.position.y + 400
    if (card.position.x < minX) minX = card.position.x - 200
    if (card.position.y < minY) minY = card.position.y - 200
  }
  const w = maxX - minX, h = maxY - minY
  svg.setAttribute('viewBox', `${minX} ${minY} ${w} ${h}`)
  svg.style.width = w + 'px'; svg.style.height = h + 'px'
  svg.style.left = minX + 'px'; svg.style.top = minY + 'px'
  svg.querySelectorAll('g.conn-group').forEach(g => g.remove())

  store.connections.forEach(conn => {
    const fromCard = store.getCard(conn.from)
    const toCard = store.getCard(conn.to)
    if (!fromCard || !toCard) return

    const x1 = fromCard.position.x + 110
    const y1 = fromCard.position.y + 50
    const x2 = toCard.position.x + 110
    const y2 = toCard.position.y + 50
    const dx = x2 - x1, dy = y2 - y1
    const dist = Math.sqrt(dx * dx + dy * dy) || 1
    const curv = Math.min(dist * 0.3, 50)
    const perpX = -dy / dist * curv, perpY = dx / dist * curv
    const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2 - 15

    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g'); g.classList.add('conn-group')

    const hit = document.createElementNS('http://www.w3.org/2000/svg', 'path'); hit.classList.add('conn-hit')
    hit.setAttribute('d', `M${x1} ${y1} C${x1+perpX} ${y1+perpY}, ${x2+perpX} ${y2+perpY}, ${x2} ${y2}`)
    hit.setAttribute('stroke', 'transparent'); hit.setAttribute('stroke-width', '16'); hit.setAttribute('fill', 'none')
    hit.style.cssText = 'pointer-events:none;'
    hit.addEventListener('click', (e) => { e.stopPropagation(); destroyConnection(conn.id) })

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.classList.add('conn-path')
    path.setAttribute('d', `M${x1} ${y1} C${x1+perpX} ${y1+perpY}, ${x2+perpX} ${y2+perpY}, ${x2} ${y2}`)
    path.setAttribute('stroke', conn.color || '#b0b0b0'); path.setAttribute('stroke-width', '2.5')
    path.setAttribute('fill', 'none'); path.setAttribute('stroke-linecap', 'round')
    const dashMap: Record<string, string> = { solid: 'none', dashed: '6,4', dotted: '2,4', none: 'none' }
    path.setAttribute('stroke-dasharray', dashMap[conn.style || 'solid'] || 'none')

    const labelG = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    labelG.style.cssText = 'pointer-events:auto;cursor:pointer;'
    labelG.addEventListener('click', (e) => { e.stopPropagation(); destroyConnection(conn.id) })
    const lr = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    lr.setAttribute('x', String(midX - 16)); lr.setAttribute('y', String(midY - 8))
    lr.setAttribute('width', '32'); lr.setAttribute('height', '16'); lr.setAttribute('rx', '4')
    lr.setAttribute('fill', '#fff'); lr.setAttribute('stroke', conn.color); lr.setAttribute('stroke-width', '1')
    labelG.appendChild(lr)
    const lt = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    lt.setAttribute('x', String(midX)); lt.setAttribute('y', String(midY + 4))
    lt.setAttribute('text-anchor', 'middle'); lt.setAttribute('fill', conn.color)
    lt.setAttribute('font-size', '10'); lt.setAttribute('font-weight', '500')
    lt.textContent = conn.label || '相关'; labelG.appendChild(lt)
    g.appendChild(hit); g.appendChild(path); g.appendChild(labelG); svg.appendChild(g)
  })
}

function destroyConnection(id: string) {
  const g = canvasSvg.value?.querySelector(`g.conn-group:nth-child(${store.connections.findIndex(c => c.id === id) + 1})`) as SVGGElement | null
  if (g) { g.style.transition = 'opacity 0.3s, transform 0.3s'; g.style.opacity = '0'; g.style.transform = 'scale(0.5)' }
  setTimeout(() => { store.deleteConnection(id); redrawKey.value++ }, 300)
}

function onCanvasDblClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('.canvas-card') || target.closest('.conn-hit') || target.closest('.conn-label')) return
  if (!canvasContainer.value) return
  const content = prompt('输入想法内容：')
  if (content?.trim()) {
    const local = screenToLocal(e.clientX, e.clientY)
    store.addCard({ type: 'idea', content: content.trim(),
      position: { x: local.x - 110, y: local.y - 50 },
    })
    redrawKey.value++
  }
}

function onCardDelete(id: string) {
  const el = canvasInner.value?.querySelector(`[data-card-id="${id}"]`) as HTMLElement | null
  if (el) {
    const r = el.getBoundingClientRect()
    const colors = ['#c7853a', '#5b7f95', '#6b8f71', '#8b7da8']
    spawnParticles([{ el, color: colors[Math.floor(Math.random() * colors.length)], x: r.left + r.width / 2, y: r.top + r.height / 2 }])
    el.classList.add('shattering')
    setTimeout(() => { store.deleteCard(id); redrawKey.value++ }, 400)
  } else { store.deleteCard(id); redrawKey.value++ }
}

function onCardUpdate(id: string, changes: Partial<import('../types').Card>) { store.updateCard(id, changes); redrawKey.value++ }
function onCanvasClick() {}

watch(() => store.connections.length, () => nextTick(() => drawSvgConnections()))
watch(() => store.cards.length, () => nextTick(() => drawSvgConnections()))
watch(redrawKey, () => nextTick(() => drawSvgConnections()))
watch(scale, () => { nextTick(() => drawSvgConnections()) })

onMounted(() => {
  store.initSeedData(); nextTick(() => drawSvgConnections())
  if (canvasContainer.value) canvasContainer.value.addEventListener('wheel', onCanvasWheelHandler, { passive: false })
})
onUnmounted(() => {
  if (canvasContainer.value) canvasContainer.value.removeEventListener('wheel', onCanvasWheelHandler)
})
</script>

<template>
  <div ref="canvasContainer" class="canvas-container"
    @mousedown="onCanvasMousedown"
    @touchstart.prevent="onCanvasTouchstart"
    @dblclick="onCanvasDblClick"
    @click="onCanvasClick"
  >
    <!-- Inner transform container for pan + zoom -->
    <div ref="canvasInner" class="canvas-inner"
      :style="{
        transform: `translate(${panOffsetX}px, ${panOffsetY}px) scale(${scale})`,
      }"
    >
      <svg ref="canvasSvg" class="canvas-svg" />
      <CardItem
        v-for="card in store.cards" :key="card.id"
        :card="card" :selected="card.id === draggingCardId"
        @delete="onCardDelete"
        @update="onCardUpdate"
      />
    </div>

    <!-- Gesture hash marks -->
    <svg v-if="isGestureHashing" class="gesture-svg">
      <polyline
        :points="gesturePath.map(p => { const r = canvasContainer?.getBoundingClientRect(); return r ? `${p.x - r.left},${p.y - r.top}` : '' }).join(' ')"
        stroke="#e57373" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round"
        class="gesture-path"
      />
    </svg>

    <!-- Particles -->
    <div class="particles-layer">
      <div v-for="p in particles" :key="p.id" class="particle"
        :style="{
          '--x': p.x + 'px', '--y': p.y + 'px', '--angle': p.angle + 'rad',
          '--speed': p.speed + 'px', '--color': p.color, '--size': p.size + 'px', '--life': p.life + 'ms',
        }"
      />
    </div>

    <div class="canvas-hint">{{ canvasHint }}</div>

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
.canvas-container:active { cursor: grabbing; }
.canvas-inner { position: relative; transform-origin: 0 0; }
.canvas-svg { position: absolute; top: 0; left: 0; pointer-events: none; z-index: -1; }
.gesture-svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 50; }
.gesture-path {
  filter: drop-shadow(0 0 4px rgba(229, 115, 115, 0.6));
}

.canvas-hint {
  position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
  font-size: 12px; color: #c5bfb5; pointer-events: none; z-index: 2; text-align: center; white-space: nowrap;
}
@media (max-width: 800px) { .canvas-hint { display: none; } }

.particles-layer { position: absolute; top: 0; left: 0; width: 100%; height: 100%; overflow: hidden; pointer-events: none; z-index: 60; }
.particle {
  position: fixed; top: var(--y); left: var(--x); width: var(--size); height: var(--size);
  background: var(--color); border-radius: 50%; pointer-events: none;
  animation: particle-burst var(--life) ease-out forwards;
}
@keyframes particle-burst {
  0% { opacity: 1; transform: translate(-50%, -50%) translate(0, 0) scale(1); }
  80% { opacity: 0.6; }
  100% { opacity: 0; transform: translate(-50%, -50%) translate(calc(cos(var(--angle)) * var(--speed)), calc(sin(var(--angle)) * var(--speed))) scale(0); }
}
</style>

<style>
.type-picker-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 200; display: flex; align-items: center; justify-content: center; }
.type-picker { background: #fff; border-radius: 12px; box-shadow: 0 12px 32px rgba(0,0,0,0.15); padding: 6px 0; min-width: 140px; }
.type-picker-title { font-size: 11px; color: #999; padding: 4px 14px 6px; font-weight: 500; }
.type-option { padding: 8px 14px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 8px; color: #2c2c2c; transition: background 0.15s; }
.type-option:hover { background: #f5f3f0; }
.type-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.type-cancel { color: #999; border-top: 1px solid #e8e4df; margin-top: 4px; padding-top: 8px; }
</style>
