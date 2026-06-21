<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import GalleryGrid from './GalleryGrid.vue'
import { searchImages } from '@/api/componentRequests'
import type { GalleryImageItem } from './GalleryGrid.vue'
import type { SearchResponse } from '@/api/componentRequests'

const router = useRouter()
const images = ref<GalleryImageItem[]>([])
const page = ref(0)
const totalPages = ref(0)
const isLoading = ref(false)

const hasMore = computed(() => totalPages.value === 0 || page.value < totalPages.value)

async function fetchNextPage() {
  if (isLoading.value) return
  if (totalPages.value > 0 && page.value >= totalPages.value) return
  isLoading.value = true
  try {
    const data = await searchImages({
      searchKey: '',
      page: page.value + 1,
      dateFrom: '',
      dateTo: '',
      byName: true,
      byFullText: false,
      orderBy: 'date',
      order: 'desc',
      pageSize: 200,
      keywords: [],
      properties: [],
      excludedKeywords: [],
      excludedProperties: [],
    }) as SearchResponse
    totalPages.value = data.totalPage
    page.value++
    for (const item of data.hrefList) {
      images.value.push({
        src: item.src,
        title: item.title,
        date: item.date,
        is_collection: item.is_collection,
        blobSrc: '',
      })
    }
    await nextTick()
    ensureScrollable()
  } catch (e) {
    console.error('Failed to fetch images', e)
  } finally {
    isLoading.value = false
  }
}

function ensureScrollable() {
  if (totalPages.value === 0 || page.value < totalPages.value) {
    if (images.value.length < 200) return
    fetchNextPage()
  }
}

function onItemClick(src: string) {
  router.push('/detail/' + encodeURIComponent(src))
}

onMounted(() => {
  fetchNextPage()
})
</script>

<template>
  <div class="gallery-page">
    <GalleryGrid
      :images="images"
      :isLoading="isLoading"
      :hasMore="hasMore"
      @itemClick="onItemClick"
      @loadMore="fetchNextPage"
    />
    <div v-if="images.length === 0 && !isLoading" class="empty-state">暂无图片</div>
  </div>
</template>

<style scoped>
.gallery-page {
  height: calc(100vh - 60px);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary, #909399);
  font-size: 14px;
}
</style>
