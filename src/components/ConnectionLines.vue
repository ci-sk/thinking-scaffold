<script setup lang="ts">
import { computed } from 'vue'
import type { Connection as ConnType } from '../types'
import { RELATION_CONFIG, CARD_SIZE } from '../types'
import { useCanvasStore } from '../stores/canvas'

const props = defineProps<{
  connections: ConnType[]
}>()

const store = useCanvasStore()

interface LineData {
  connection: ConnType
  x1: number
  y1: number
  x2: number
  y2: number
  mx: number
  my: number
  label: string
  color: string
  dasharray: string
}

const lines = computed<LineData[]>(() => {
  return props.connections
    .map(conn => {
      const from = store.getCard(conn.fromCardId)
      const to = store.getCard(conn.toCardId)
      if (!from || !to) return null
      const hw = CARD_SIZE.width / 2
      const hh = CARD_SIZE.height / 2
      const x1 = from.position.x + hw
      const y1 = from.position.y + hh
      const x2 = to.position.x + hw
      const y2 = to.position.y + hh
      const config = RELATION_CONFIG[conn.relationType]
      return {
        connection: conn,
        x1, y1, x2, y2,
        mx: (x1 + x2) / 2,
        my: (y1 + y2) / 2,
        label: config.label,
        color: config.color,
        dasharray: config.style === 'dashed' ? '6,4' : config.style === 'dotted' ? '2,4' : 'none',
      }
    })
    .filter(Boolean) as LineData[]
})
</script>

<template>
  <svg class="absolute inset-0 pointer-events-none" style="width: 100%; height: 100%">
    <defs>
      <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
        <polygon points="0 0, 8 3, 0 6" fill="#bdbdbd" />
      </marker>
    </defs>
    <g v-for="line in lines" :key="line.connection.id">
      <path
        :d="`M ${line.x1} ${line.y1} Q ${(line.x1 + line.x2) / 2} ${line.my - 30} ${line.x2} ${line.y2}`"
        :stroke="line.color"
        :stroke-width="1.5"
        :stroke-dasharray="line.dasharray"
        fill="none"
        class="transition-all duration-200"
      />
      <rect
        :x="line.mx - 18"
        :y="line.my - 28"
        width="36"
        height="16"
        rx="4"
        fill="white"
        :stroke="line.color"
        stroke-width="1"
        class="pointer-events-auto cursor-pointer"
      />
      <text
        :x="line.mx"
        :y="line.my - 15"
        text-anchor="middle"
        :fill="line.color"
        font-size="10"
        font-weight="500"
        class="pointer-events-auto cursor-pointer"
      >
        {{ line.label }}
      </text>
    </g>
  </svg>
</template>
