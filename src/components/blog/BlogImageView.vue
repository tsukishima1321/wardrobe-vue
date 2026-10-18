<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue';
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';

const props = defineProps(nodeViewProps);

const wrapperRef = ref<HTMLElement | null>(null);
const imageRef = ref<HTMLImageElement | null>(null);
const dragging = ref(false);

const href = computed(() => (props.node.attrs.href as string | null) || '');
const alt = computed(() => (props.node.attrs.alt as string | null) || '');
const width = computed(() => {
    const value = Number(props.node.attrs.width);
    if (!Number.isFinite(value) || value <= 0) return 100;
    return Math.min(100, Math.max(10, Math.round(value)));
});
const src = computed(() => {
    if (!href.value) return '';
    if (href.value.startsWith('mock-')) return '/placeholder.png';
    return `/imagebed/thumbnails/large/${href.value}`;
});

const setWidth = (value: number) => {
    props.updateAttributes({
        width: Math.min(100, Math.max(10, Math.round(value))),
    });
};

let startX = 0;
let startWidth = 0;
let containerWidth = 0;
let pendingWidth = 0;
let rafId = 0;

const onPointerMove = (event: PointerEvent) => {
    if (!dragging.value || !containerWidth) return;
    const delta = event.clientX - startX;
    pendingWidth = Math.min(containerWidth, Math.max(120, startWidth + delta));
    if (rafId) return;
    rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        if (!containerWidth) return;
        setWidth((pendingWidth / containerWidth) * 100);
    });
};

const stopResize = () => {
    dragging.value = false;
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', stopResize);
    document.body.style.userSelect = '';
    if (rafId) {
        window.cancelAnimationFrame(rafId);
        rafId = 0;
    }
};

const startResize = (event: PointerEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const frame = imageRef.value?.parentElement;
    const container = wrapperRef.value?.parentElement;
    if (!frame || !container) return;

    startX = event.clientX;
    startWidth = frame.getBoundingClientRect().width;
    containerWidth = container.clientWidth;
    pendingWidth = startWidth;
    dragging.value = true;
    document.body.style.userSelect = 'none';
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', stopResize);
};

onBeforeUnmount(() => {
    stopResize();
});
</script>

<template>
    <NodeViewWrapper class="blog-image-node" :class="{ 'is-selected': selected }">
        <div ref="wrapperRef" class="blog-image-inner">
            <div class="blog-image-toolbar" contenteditable="false">
                <span class="image-size-label">{{ width }}%</span>
                <button type="button" class="size-button" @click.stop="setWidth(25)">25%</button>
                <button type="button" class="size-button" @click.stop="setWidth(50)">50%</button>
                <button type="button" class="size-button" @click.stop="setWidth(75)">75%</button>
                <button type="button" class="size-button" @click.stop="setWidth(100)">100%</button>
                <button type="button" class="size-button delete-button" title="删除图片"
                    @click.stop="deleteNode">删除</button>
            </div>

            <div class="blog-image-frame" :style="{ width: `${width}%` }">
                <img ref="imageRef" :src="src" :alt="alt" draggable="false" />
                <span class="resize-handle" title="拖动调整大小" @pointerdown="startResize"></span>
            </div>
        </div>
    </NodeViewWrapper>
</template>

<style scoped>
.blog-image-node {
    margin: 14px 0;
}

.blog-image-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}

.blog-image-toolbar {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 6px;
    border: 1px solid #dcdfe6;
    border-radius: 8px;
    background: #fff;
    box-shadow: 0 4px 14px rgba(31, 45, 61, 0.12);
    opacity: 0;
    pointer-events: none;
    transform: translateY(4px);
    transition: opacity 0.15s ease, transform 0.15s ease;
}

.blog-image-node:hover .blog-image-toolbar,
.blog-image-node.is-selected .blog-image-toolbar {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
}

.image-size-label {
    padding: 0 4px;
    color: #909399;
    font-size: 11px;
    white-space: nowrap;
}

.size-button {
    padding: 3px 7px;
    border: none;
    border-radius: 5px;
    background: #f5f7fa;
    color: #606266;
    font-size: 11px;
    cursor: pointer;
}

.size-button:hover {
    background: #ecf5ff;
    color: #409eff;
}

.delete-button {
    color: #f56c6c;
}

.delete-button:hover {
    background: #fef0f0;
    color: #f56c6c;
}

.blog-image-frame {
    position: relative;
    max-width: 100%;
    transition: width 0.15s ease;
}

.blog-image-frame img {
    display: block;
    width: 100%;
    height: auto;
    border-radius: 8px;
}

.blog-image-node.is-selected .blog-image-frame {
    outline: 2px solid #409eff;
    outline-offset: 3px;
    border-radius: 8px;
}

.resize-handle {
    position: absolute;
    right: -7px;
    bottom: -7px;
    width: 14px;
    height: 14px;
    border: 2px solid #fff;
    border-radius: 4px;
    background: #409eff;
    box-shadow: 0 1px 4px rgba(31, 45, 61, 0.25);
    cursor: nwse-resize;
    opacity: 0;
    transition: opacity 0.15s ease;
}

.blog-image-node:hover .resize-handle,
.blog-image-node.is-selected .resize-handle {
    opacity: 1;
}

@media (max-width: 600px) {
    .blog-image-toolbar {
        opacity: 1;
        pointer-events: auto;
        transform: none;
    }

    .resize-handle {
        opacity: 1;
    }
}
</style>
