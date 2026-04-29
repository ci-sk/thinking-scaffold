<script setup lang="ts">
import { ref } from "vue";
import TopBar from "./components/TopBar.vue";
import LeftSidebar from "./components/LeftSidebar.vue";
import Canvas from "./components/Canvas.vue";
import StitchModal from "./components/StitchModal.vue";
import { useCanvasStore } from "./stores/canvas";

const store = useCanvasStore();
const sidePanelMobileOpen = ref(false);
const stitchModalRef = ref<InstanceType<typeof StitchModal>>();

function toggleMobilePanel() {
    sidePanelMobileOpen.value = !sidePanelMobileOpen.value;
}

function closeMobilePanel() {
    sidePanelMobileOpen.value = false;
}

function openStitch() {
    stitchModalRef.value?.open();
}

function handleReset() {
    store.reset();
}
</script>

<template>
    <div class="mbody">
        <div class="device-frame">
            <TopBar
                :mobile-panel-open="sidePanelMobileOpen"
                @toggle-mobile-panel="toggleMobilePanel"
                @open-stitch="openStitch"
                @reset="handleReset"
            />

            <div class="main-body">
                <LeftSidebar :mobile-open="sidePanelMobileOpen" />
                <div class="canvas-area" @click="closeMobilePanel">
                    <Canvas />
                </div>
            </div>

            <StitchModal ref="stitchModalRef" />
        </div>
    </div>
</template>

<style scoped>
.mbody {
    font-family: var(--font-sans);
    background: #f0ece7;
    height: 100vh;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    user-select: none;
    -webkit-user-select: none;
    -webkit-font-smoothing: antialiased;
}

.device-frame {
    width: 100%;
    max-width: 1400px;
    height: 92vh;
    max-height: 880px;
    background: #faf8f5;
    border-radius: 20px;
    box-shadow:
        0 20px 50px rgba(0, 0, 0, 0.15),
        0 0 0 1px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
}

.main-body {
    flex: 1;
    display: flex;
    overflow: hidden;
    position: relative;
}

.canvas-area {
    flex: 1;
    display: flex;
}

@media (max-width: 800px) {
    .device-frame {
        max-width: none;
        height: 100vh;
        max-height: none;
        border-radius: 0;
        box-shadow: none;
    }
}
</style>
