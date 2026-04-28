<script setup lang="ts">
import { ref } from 'vue'
import TopBar from './components/TopBar.vue'
import LeftSidebar from './components/LeftSidebar.vue'
import Canvas from './components/Canvas.vue'
import StitchModal from './components/StitchModal.vue'
import Toast from './components/Toast.vue'

const showSidebar = ref(true)
const stitchModalRef = ref<InstanceType<typeof StitchModal>>()
const toastRef = ref<InstanceType<typeof Toast>>()

function toggleSidebar() {
  showSidebar.value = !showSidebar.value
}

function openStitch() {
  stitchModalRef.value?.open()
}

function onCardAdded(msg: string) {
  toastRef.value?.addToast(msg)
}
</script>

<template>
  <div class="h-screen flex flex-col bg-cream overflow-hidden">
    <TopBar
      @toggle-sidebar="toggleSidebar"
      @open-stitch="openStitch"
    />

    <div class="flex-1 flex overflow-hidden">
      <LeftSidebar
        :visible="showSidebar"
        @card-added="onCardAdded"
      />

      <Canvas />
    </div>

    <StitchModal ref="stitchModalRef" />
    <Toast ref="toastRef" />
  </div>
</template>
