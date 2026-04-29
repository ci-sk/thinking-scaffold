<script setup lang="ts">
import { computed } from "vue";
import { useCanvasStore } from "../stores/canvas";

defineProps<{ mobilePanelOpen: boolean }>();

const emit = defineEmits<{
    toggleMobilePanel: [];
    openStitch: [];
    reset: [];
}>();

const store = useCanvasStore();
const cardCount = computed(() => store.cards.length);
</script>

<template>
    <header class="top-bar">
        <div class="logo"><span class="dot" />思维脚手架</div>

        <div
            class="stitch-banner"
            :class="{ 'cursor-not-allowed opacity-50': cardCount === 0 }"
            @click="cardCount > 0 && emit('openStitch')"
        >
            <span class="icon-sparkle">✦</span>
            <span class="stitch-text">积攒了 <strong>{{ cardCount }}</strong> 个碎片，要缝合吗？</span>
            <span class="stitch-count">{{ cardCount }}</span>
        </div>

        <button class="btn-icon btn-mobile-panel" @click="emit('toggleMobilePanel')">
            {{ mobilePanelOpen ? '✕' : '📥' }}
        </button>
        <button class="btn-icon" @click="emit('reset')" title="重置">↺</button>
    </header>
</template>

<style scoped>
.top-bar {
    height: 56px;
    display: flex;
    align-items: center;
    padding: 0 20px;
    gap: 16px;
    border-bottom: 1px solid #e8e4df;
    background: #fff;
    z-index: 15;
    flex-shrink: 0;
    border-radius: 20px 20px 0 0;
}

.logo {
    font-weight: 700;
    font-size: 17px;
    letter-spacing: -0.3px;
    color: #2c2c2c;
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    background: #c7853a;
    animation: pulse-dot 2.5s ease-in-out infinite;
}

.stitch-banner {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    background: #fdf3e7;
    border-radius: 20px;
    padding: 8px 18px;
    cursor: pointer;
    border: 1px solid transparent;
    transition: all 0.2s;
    min-width: 0;
}

.stitch-banner:hover {
    border-color: #f0c78e;
    box-shadow: 0 0 0 4px rgba(199, 133, 58, 0.06);
}

.icon-sparkle {
    font-size: 15px;
    animation: sparkle 2s infinite;
}

.stitch-text {
    font-size: 13px;
    color: #c7853a;
    font-weight: 500;
}

.stitch-count {
    background: #c7853a;
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    padding: 3px 9px;
    border-radius: 12px;
}

.btn-icon {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: 1px solid #e8e4df;
    background: #fff;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    color: #6b6b6b;
    transition: all 0.2s;
    flex-shrink: 0;
}

.btn-icon:hover {
    background: #f5f3f0;
    border-color: #d5d0c8;
}

.btn-mobile-panel {
    display: none;
}

@media (max-width: 800px) {
    .top-bar {
        padding: 0 10px;
        gap: 8px;
        border-radius: 0;
    }

    .btn-mobile-panel {
        display: flex;
    }

    .stitch-banner {
        padding: 6px 10px;
    }

    .stitch-text {
        font-size: 12px;
    }
}

@keyframes sparkle {
    0%, 100% { transform: scale(1); opacity: 0.8; }
    50% { transform: scale(1.3); opacity: 1; }
}

@keyframes pulse-dot {
    0%, 100% { box-shadow: 0 0 0 0 rgba(199, 133, 58, 0.5); }
    50% { box-shadow: 0 0 0 10px rgba(199, 133, 58, 0); }
}
</style>
