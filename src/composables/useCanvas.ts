import { ref, computed } from 'vue'

export function useCanvas() {
  const offsetX = ref(0)
  const offsetY = ref(0)
  const scale = ref(1)

  const transform = computed(() => `translate(${offsetX.value}px, ${offsetY.value}px) scale(${scale.value})`)

  function screenToCanvas(sx: number, sy: number): { x: number; y: number } {
    return {
      x: (sx - offsetX.value) / scale.value,
      y: (sy - offsetY.value) / scale.value,
    }
  }

  function canvasToScreen(cx: number, cy: number): { x: number; y: number } {
    return {
      x: cx * scale.value + offsetX.value,
      y: cy * scale.value + offsetY.value,
    }
  }

  function zoomAtPoint(cursorX: number, cursorY: number, delta: number) {
    const oldScale = scale.value
    const newScale = Math.min(2, Math.max(0.1, oldScale * (1 - delta * 0.0015)))
    const canvasPoint = screenToCanvas(cursorX, cursorY)
    scale.value = newScale
    offsetX.value = cursorX - canvasPoint.x * newScale
    offsetY.value = cursorY - canvasPoint.y * newScale
  }

  function reset() {
    offsetX.value = 0
    offsetY.value = 0
    scale.value = 1
  }

  return {
    offsetX,
    offsetY,
    scale,
    transform,
    screenToCanvas,
    canvasToScreen,
    zoomAtPoint,
    reset,
  }
}
