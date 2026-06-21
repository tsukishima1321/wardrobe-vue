<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useVirtualizer } from '@tanstack/vue-virtual'
import { GetBlobImgSrc } from '@/api/token'

export interface GalleryImageItem {
  src: string
  title: string
  date: string
  is_collection?: boolean
  blobSrc: string
}

interface DateSection {
  label: string
  images: GalleryImageItem[]
}

const ZOOM_CONFIG = [
  { columns: 24, thumbnail: 'small', granularity: 'year' as const },
  { columns: 16, thumbnail: 'small', granularity: 'month' as const },
  { columns: 8, thumbnail: 'medium', granularity: 'month' as const },
  { columns: 6, thumbnail: 'medium', granularity: 'day' as const },
]

const props = defineProps<{
  images: GalleryImageItem[]
  isLoading?: boolean
  hasMore?: boolean
}>()

const emit = defineEmits<{
  itemClick: [src: string]
  loadMore: []
}>()

const scrollContainer = ref<HTMLElement>()
const zoomLevel = ref(3)

const currentConfig = computed(() => ZOOM_CONFIG[zoomLevel.value])
const columns = computed(() => currentConfig.value.columns)
const thumbnailSize = computed(() => currentConfig.value.thumbnail)
const granularity = computed(() => currentConfig.value.granularity)

function formatDateKey(date: string, gran: string): string {
  if (!date) return 'unknown'
  const d = new Date(date)
  if (isNaN(d.getTime())) {
    const prefix = date.substring(0, gran === 'year' ? 4 : gran === 'month' ? 7 : 10)
    return prefix || 'unknown'
  }
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  if (gran === 'year') return `${y}`
  if (gran === 'month') return `${y}-${m}`
  return `${y}-${m}-${dd}`
}

function formatSectionLabel(key: string, gran: string): string {
  if (gran === 'year') return `${key}年`
  if (gran === 'month') {
    const [y, m] = key.split('-')
    return `${y}年${parseInt(m)}月`
  }
  const [y, m, d] = key.split('-')
  return `${y}年${parseInt(m)}月${parseInt(d)}日`
}

const sections = computed<DateSection[]>(() => {
  const groups = new Map<string, GalleryImageItem[]>()
  for (const img of props.images) {
    const key = formatDateKey(img.date, granularity.value)
    const arr = groups.get(key)
    if (arr) {
      arr.push(img)
    } else {
      groups.set(key, [img])
    }
  }
  const keys = Array.from(groups.keys()).sort((a, b) => b.localeCompare(a))
  return keys.map(key => ({
    label: formatSectionLabel(key, granularity.value),
    images: groups.get(key)!,
  }))
})

function calcCellSize(): number {
  if (!scrollContainer.value) return 180
  const w = scrollContainer.value.clientWidth
  return Math.floor((w - (columns.value - 1) * 2) / columns.value)
}

function estimateSectionHeight(index: number): number {
  const section = sections.value[index]
  if (!section || !scrollContainer.value) return 300
  const headerHeight = 44
  const cellSize = calcCellSize()
  const gap = 2
  const rows = Math.ceil(section.images.length / columns.value)
  return headerHeight + rows * (cellSize + gap) - gap
}

const virtualizer = useVirtualizer(computed(() => ({
  count: sections.value.length,
  getScrollElement: () => scrollContainer.value ?? null,
  estimateSize: (index: number) => estimateSectionHeight(index),
  overscan: 5 as const,
  onChange: () => {
    loadVisibleThumbnails()
  },
})))

const loadingThumbs = new Set<string>()

function loadVisibleThumbnails() {
  const indices = new Set<number>()
  for (const item of virtualizer.value.getVirtualItems()) {
    indices.add(item.index)
  }
  for (const idx of indices) {
    const section = sections.value[idx]
    if (!section) continue
    for (const img of section.images) {
      const key = `${thumbnailSize.value}/${img.src}`
      if (img.blobSrc || loadingThumbs.has(key)) continue
      loadingThumbs.add(key)
      const suffix = img.is_collection ? `?${Date.now()}` : ''
      const url = `/imagebed/thumbnails/${thumbnailSize.value}/${img.src}${suffix}`
      GetBlobImgSrc(url).then(blobSrc => {
        img.blobSrc = blobSrc
        loadingThumbs.delete(key)
      }).catch(() => {
        loadingThumbs.delete(key)
      })
    }
  }
}

let lastPinchDist = 0

function handleWheel(e: WheelEvent) {
  if (e.shiftKey) {
    e.preventDefault()
    zoomLevel.value = Math.max(0, Math.min(3, zoomLevel.value + (e.deltaY > 0 ? -1 : 1)))
  }
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    lastPinchDist = Math.hypot(
      e.touches[0].clientX - e.touches[1].clientX,
      e.touches[0].clientY - e.touches[1].clientY,
    )
  }
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length !== 2 || lastPinchDist === 0) return
  const dist = Math.hypot(
    e.touches[0].clientX - e.touches[1].clientX,
    e.touches[0].clientY - e.touches[1].clientY,
  )
  const ratio = dist / lastPinchDist
  if (ratio > 1.25) {
    zoomLevel.value = Math.min(3, zoomLevel.value + 1)
    lastPinchDist = dist
  } else if (ratio < 0.75) {
    zoomLevel.value = Math.max(0, zoomLevel.value - 1)
    lastPinchDist = dist
  }
}

function handleTouchEnd() {
  lastPinchDist = 0
}

let scrollTimer: ReturnType<typeof setTimeout> | null = null

function onScroll() {
  if (scrollTimer) return
  scrollTimer = setTimeout(() => {
    scrollTimer = null
    if (!scrollContainer.value || !props.hasMore) return
    const { scrollTop, scrollHeight, clientHeight } = scrollContainer.value
    if (scrollHeight - scrollTop - clientHeight < 1200) {
      emit('loadMore')
    }
  }, 150)
}

function openDetail(src: string) {
  emit('itemClick', src)
}

watch(zoomLevel, () => {
  for (const img of props.images) {
    if (img.blobSrc) {
      if (img.blobSrc.startsWith('blob:')) {
        URL.revokeObjectURL(img.blobSrc)
      }
      img.blobSrc = ''
    }
  }
  loadingThumbs.clear()
  nextTick(() => {
    loadVisibleThumbnails()
  })
})

defineExpose({ zoomLevel })
</script>

<template>
  <div ref="scrollContainer" class="gallery-scroll" @scroll="onScroll" @wheel="handleWheel"
    @touchstart="handleTouchStart" @touchmove="handleTouchMove" @touchend="handleTouchEnd">
    <div class="gallery-virtual" :style="{ height: virtualizer.getTotalSize() + 'px' }">
      <div v-for="vItem in virtualizer.getVirtualItems()" :key="vItem.index"
        :ref="(el) => virtualizer.measureElement(el as HTMLElement)" :data-index="vItem.index" class="section-wrapper"
        :style="{ transform: `translateY(${vItem.start}px)` }">
        <div class="section-header">{{ sections[vItem.index].label }}</div>
        <div class="section-grid" :style="{ gridTemplateColumns: `repeat(${columns}, 1fr)` }">
          <div v-for="img in sections[vItem.index].images" :key="img.src" class="thumbnail-item"
            @click="openDetail(img.src)">
            <img v-if="img.blobSrc" :src="img.blobSrc" :alt="img.title" />
            <div v-else class="thumbnail-placeholder"></div>
          </div>
        </div>
      </div>
    </div>
    <div v-if="isLoading" class="loading-indicator">加载中...</div>
    <div v-else-if="images.length > 0 && !hasMore" class="loading-indicator">已显示全部图片</div>
  </div>
</template>

<style scoped>
.gallery-scroll {
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0;
  margin: 0;
  touch-action: pan-y;
}

.gallery-virtual {
  position: relative;
  width: 100%;
}

.section-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  padding: 0 2px;
  box-sizing: border-box;
}

.section-header {
  height: 44px;
  line-height: 44px;
  padding: 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary, #303133);
  background: var(--el-bg-color, #fff);
  opacity: 0.95;
}

.section-grid {
  display: grid;
  gap: 2px;
}

.thumbnail-item {
  aspect-ratio: 1;
  overflow: hidden;
  cursor: pointer;
  background: var(--el-fill-color-light, #f5f5f7);
  position: relative;
}

.thumbnail-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.thumbnail-placeholder {
  width: 100%;
  height: 100%;
  background: var(--el-fill-color-light, #f5f5f7);
}

.loading-indicator {
  text-align: center;
  padding: 16px;
  color: var(--el-text-color-secondary, #909399);
  font-size: 13px;
}
</style>
