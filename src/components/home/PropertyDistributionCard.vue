<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ArrowDown, ArrowUp, Loading, Refresh, Search as SearchIcon } from '@element-plus/icons-vue'
import { GetBlobImgSrc } from '@/api/token'
import {
    getPropertyDistribution,
    searchImages,
    type ImageProperty,
    type PropertyDistributionResponse,
    type PropertyDistributionSample,
    type PropertyDistributionValue,
    type SearchResponse,
} from '@/api/componentRequests'

interface VisualSample extends PropertyDistributionSample {
    blobSrc: string
}

interface VisualValue extends Omit<PropertyDistributionValue, 'samples'> {
    samples: VisualSample[]
}

interface DisplayRow {
    key: string
    label: string
    count: number
    percentage: number
    color: string
    barWidth: number
    samples: VisualSample[]
    value?: string
}

interface ExpandedImage {
    src: string
    title: string
    date: string
    isCollection: boolean
    blobSrc: string
}

const emit = defineEmits<{
    openPropertySearch: [property: ImageProperty, searchKey: string]
    openDetail: [src: string]
}>()

const CHART_COLORS = ['#10b981', '#7c3aed', '#f59e0b', '#0ea5e9', '#f43f5e']
const OTHER_COLOR = '#cbd5e1'

const distribution = ref<PropertyDistributionResponse | null>(null)
const visualValues = ref<VisualValue[]>([])
const selectedProperty = ref('')
const searchInput = ref('')
const appliedSearchKey = ref('')
const loading = ref(true)
const errorMessage = ref('')
const expandedValue = ref('')
const expandedImages = ref<ExpandedImage[]>([])
const expandedPage = ref(0)
const expandedTotalPages = ref(0)
const expandedTotalItems = ref(0)
const expandedLoading = ref(false)
const expandedError = ref('')
const expandedScroll = ref<HTMLElement | null>(null)
let requestId = 0
let galleryRequestId = 0

const cleanupSamples = (values: VisualValue[]) => {
    values.forEach((item) => {
        item.samples.forEach((sample) => {
            if (sample.blobSrc.startsWith('blob:')) {
                URL.revokeObjectURL(sample.blobSrc)
            }
        })
    })
}

const hydrateSamples = async (values: VisualValue[], activeRequestId: number) => {
    await Promise.all(values.flatMap((item) => item.samples.map(async (sample) => {
        const suffix = sample.isCollection ? `?${Date.now()}` : ''
        const blobSrc = await GetBlobImgSrc(`/imagebed/thumbnails/small/${sample.src}${suffix}`)
        if (activeRequestId !== requestId) {
            if (blobSrc.startsWith('blob:')) URL.revokeObjectURL(blobSrc)
            return
        }
        sample.blobSrc = blobSrc
    })))
}

const cleanupExpandedImages = () => {
    expandedImages.value.forEach((image) => {
        if (image.blobSrc.startsWith('blob:')) {
            URL.revokeObjectURL(image.blobSrc)
        }
    })
}

const closeExpandedGallery = () => {
    galleryRequestId++
    cleanupExpandedImages()
    expandedValue.value = ''
    expandedImages.value = []
    expandedPage.value = 0
    expandedTotalPages.value = 0
    expandedTotalItems.value = 0
    expandedLoading.value = false
    expandedError.value = ''
}

const hydrateExpandedImage = async (image: ExpandedImage, activeGalleryRequestId: number) => {
    const suffix = image.isCollection ? `?${Date.now()}` : ''
    const blobSrc = await GetBlobImgSrc(`/imagebed/thumbnails/small/${image.src}${suffix}`)
    if (activeGalleryRequestId !== galleryRequestId) {
        if (blobSrc.startsWith('blob:')) URL.revokeObjectURL(blobSrc)
        return
    }

    const target = expandedImages.value.find((item) => item.src === image.src)
    if (!target) {
        if (blobSrc.startsWith('blob:')) URL.revokeObjectURL(blobSrc)
        return
    }
    target.blobSrc = blobSrc
}

const loadExpandedPage = async (value: string) => {
    const propertyName = distribution.value?.property
    if (!propertyName || expandedValue.value !== value || expandedLoading.value) return
    if (expandedTotalPages.value > 0 && expandedPage.value >= expandedTotalPages.value) return

    const activeGalleryRequestId = galleryRequestId
    const nextPage = expandedPage.value + 1
    let shouldFillViewport = false
    expandedLoading.value = true
    expandedError.value = ''

    try {
        const response = await searchImages({
            searchKey: appliedSearchKey.value,
            page: nextPage,
            dateFrom: '',
            dateTo: '',
            byName: true,
            byFullText: false,
            orderBy: 'date',
            order: 'desc',
            pageSize: 48,
            keywords: [],
            properties: [{ name: propertyName, value }],
            excludedKeywords: [],
            excludedProperties: [],
            propertiesPrecise: true,
        }) as SearchResponse
        if (activeGalleryRequestId !== galleryRequestId || expandedValue.value !== value) return

        const nextImages: ExpandedImage[] = response.hrefList.map((item) => ({
            src: item.src,
            title: item.title,
            date: item.date,
            isCollection: !!item.is_collection,
            blobSrc: '',
        }))
        expandedImages.value.push(...nextImages)
        expandedPage.value = nextPage
        expandedTotalPages.value = response.totalPage
        expandedTotalItems.value = response.total
        nextImages.forEach((image) => hydrateExpandedImage(image, activeGalleryRequestId))

        await nextTick()
        const container = expandedScroll.value
        shouldFillViewport = !!container
            && container.scrollHeight <= container.clientHeight + 40
            && expandedPage.value < expandedTotalPages.value
    } catch (error) {
        if (activeGalleryRequestId !== galleryRequestId) return
        console.error('Failed to load expanded property images', error)
        expandedError.value = '图片加载失败，请重试。'
    } finally {
        if (activeGalleryRequestId === galleryRequestId) {
            expandedLoading.value = false
        }
    }

    if (shouldFillViewport) {
        loadExpandedPage(value)
    }
}

const loadDistribution = async (
    propertyName = '',
    searchKey = appliedSearchKey.value,
) => {
    const activeRequestId = ++requestId
    const previousProperty = distribution.value?.property ?? ''
    const previousSearchKey = appliedSearchKey.value
    if (
        (propertyName && propertyName !== previousProperty)
        || searchKey !== previousSearchKey
    ) {
        closeExpandedGallery()
    }
    loading.value = true
    errorMessage.value = ''

    try {
        const response = await getPropertyDistribution(propertyName, searchKey)
        if (activeRequestId !== requestId) return

        const nextValues: VisualValue[] = response.values.map((item) => ({
            ...item,
            samples: item.samples.map((sample) => ({ ...sample, blobSrc: '' })),
        }))

        cleanupSamples(visualValues.value)
        distribution.value = response
        visualValues.value = nextValues
        selectedProperty.value = response.property
        appliedSearchKey.value = response.searchKey
        searchInput.value = response.searchKey
        hydrateSamples(visualValues.value, activeRequestId)
    } catch (error) {
        console.error('Failed to load property distribution', error)
        selectedProperty.value = previousProperty
        searchInput.value = previousSearchKey
        errorMessage.value = '属性统计暂时无法加载，请稍后重试。'
    } finally {
        if (activeRequestId === requestId) loading.value = false
    }
}

const applyTextSearch = () => {
    loadDistribution(selectedProperty.value, searchInput.value.trim())
}

const displayRows = computed<DisplayRow[]>(() => {
    const maxCount = Math.max(1, ...visualValues.value.map((item) => item.count))
    const rows: DisplayRow[] = visualValues.value.map((item, index) => ({
        key: item.value,
        label: item.value,
        value: item.value,
        count: item.count,
        percentage: item.percentage,
        color: CHART_COLORS[index % CHART_COLORS.length],
        barWidth: item.count / maxCount * 100,
        samples: item.samples,
    }))

    if (distribution.value?.other) {
        rows.push({
            key: '__other__',
            label: `其他 ${distribution.value.other.valueCount} 项`,
            count: distribution.value.other.count,
            percentage: distribution.value.other.percentage,
            color: OTHER_COLOR,
            barWidth: Math.min(100, distribution.value.other.count / maxCount * 100),
            samples: [],
        })
    }
    return rows
})

const donutBackground = computed(() => {
    if (!displayRows.value.length) return '#eef2f6'
    let cursor = 0
    const segments = displayRows.value.map((row) => {
        const start = cursor
        cursor = Math.min(100, cursor + row.percentage)
        return `${row.color} ${start}% ${cursor}%`
    })
    if (cursor < 100) segments.push(`${OTHER_COLOR} ${cursor}% 100%`)
    return `conic-gradient(${segments.join(', ')})`
})

const visibleShare = computed(() => {
    return Math.min(100, visualValues.value.reduce((sum, item) => sum + item.percentage, 0))
})

const openValueSearch = (row: DisplayRow) => {
    if (!row.value || !distribution.value?.property) return
    emit('openPropertySearch', {
        name: distribution.value.property,
        value: row.value,
    }, appliedSearchKey.value)
}

const toggleExpandedGallery = (row: DisplayRow) => {
    if (!row.value) return
    if (expandedValue.value === row.value) {
        closeExpandedGallery()
        return
    }

    closeExpandedGallery()
    expandedValue.value = row.value
    loadExpandedPage(row.value)
}

const handleExpandedScroll = (event: Event) => {
    const container = event.currentTarget as HTMLElement
    if (container.scrollHeight - container.scrollTop - container.clientHeight < 320) {
        loadExpandedPage(expandedValue.value)
    }
}

const setExpandedScroll = (element: unknown) => {
    expandedScroll.value = element instanceof HTMLElement ? element : null
}

const openExpandedImage = (src: string) => {
    emit('openDetail', src)
}

const handleImageError = (event: Event) => {
    const image = event.target as HTMLImageElement
    image.src = '/placeholder.png'
    image.onerror = null
}

onMounted(() => loadDistribution())

onBeforeUnmount(() => {
    requestId++
    cleanupSamples(visualValues.value)
    closeExpandedGallery()
})
</script>

<template>
    <article class="property-card" v-loading="loading && !!distribution">
        <div class="card-top">
            <el-input
                v-model="searchInput"
                class="distribution-search"
                placeholder="筛选"
                clearable
                @keyup.enter="applyTextSearch"
                @clear="applyTextSearch"
            >
                <template #prefix>
                    <el-icon><SearchIcon /></el-icon>
                </template>
                <template #append>
                    <el-button
                        :icon="SearchIcon"
                        :loading="loading"
                        aria-label="应用搜索筛选"
                        @click="applyTextSearch"
                    />
                </template>
            </el-input>
            <label class="property-select-wrap">
                <el-select
                    v-model="selectedProperty"
                    class="property-select"
                    filterable
                    :disabled="!distribution?.properties.length"
                    @change="loadDistribution"
                >
                    <el-option
                        v-for="option in distribution?.properties ?? []"
                        :key="option.name"
                        :label="`${option.name} · ${option.count}`"
                        :value="option.name"
                    />
                </el-select>
            </label>
        </div>

        <div v-if="errorMessage && distribution" class="inline-error">
            <span>{{ errorMessage }}</span>
            <el-button link :icon="Refresh" @click="loadDistribution(selectedProperty)">重试</el-button>
        </div>

        <template v-if="distribution">
            <div class="summary-grid">
                <div class="summary-item">
                    <strong>{{ distribution.summary.totalPictures }}</strong>
                    <span>已标注图片</span>
                </div>
                <div class="summary-item">
                    <strong>{{ distribution.summary.valueCount }}</strong>
                    <span>不同值</span>
                </div>
                <div class="summary-item">
                    <strong>{{ distribution.summary.totalAssignments }}</strong>
                    <span>标注记录</span>
                </div>
            </div>

            <div v-if="displayRows.length" class="distribution-content">
                <div class="donut-zone">
                    <div class="donut" :style="{ background: donutBackground }">
                        <div class="donut-center">
                            <strong>{{ distribution.summary.totalAssignments }}</strong>
                            <span>标注记录</span>
                        </div>
                    </div>
                    <p>前 {{ visualValues.length }} 项占全部记录的 {{ visibleShare.toFixed(1) }}%</p>
                </div>

                <div class="value-list">
                    <template v-for="row in displayRows" :key="row.key">
                        <button
                            type="button"
                            class="value-row"
                            :class="{ clickable: !!row.value, active: expandedValue === row.value }"
                            :disabled="!row.value"
                            :aria-expanded="row.value ? expandedValue === row.value : undefined"
                            :style="{
                                '--row-color': row.color,
                                '--bar-width': `${row.barWidth}%`,
                            }"
                            @click="toggleExpandedGallery(row)"
                        >
                            <span class="value-name">
                                <i />
                                <strong>{{ row.label }}</strong>
                            </span>
                            <span class="value-bar"><i /></span>
                            <span class="value-count">
                                <strong>{{ row.count }}</strong>
                            </span>
                            <span class="row-tail">
                                <span class="sample-stack">
                                    <span v-for="sample in row.samples" :key="sample.src" class="sample-image">
                                        <img
                                            v-if="sample.blobSrc"
                                            :src="sample.blobSrc"
                                            :alt="sample.title || row.label"
                                            @error="handleImageError"
                                        />
                                        <i v-else />
                                    </span>
                                </span>
                                <el-icon v-if="row.value" class="expand-icon">
                                    <ArrowUp v-if="expandedValue === row.value" />
                                    <ArrowDown v-else />
                                </el-icon>
                            </span>
                        </button>

                        <div v-if="row.value && expandedValue === row.value" class="expanded-panel">
                            <div class="expanded-header">
                                <div>
                                    <strong>{{ distribution.property }} · {{ row.value }}</strong>
                                    <span v-if="expandedTotalItems">共 {{ expandedTotalItems }} 张</span>
                                </div>
                                <el-button link @click="openValueSearch(row)">在搜索页打开</el-button>
                            </div>

                            <div :ref="setExpandedScroll" class="expanded-scroll" @scroll="handleExpandedScroll">
                                <div v-if="expandedImages.length" class="expanded-grid">
                                    <button
                                        v-for="image in expandedImages"
                                        :key="image.src"
                                        type="button"
                                        class="expanded-image"
                                        :title="image.title || image.date || image.src"
                                        @click="openExpandedImage(image.src)"
                                    >
                                        <img
                                            v-if="image.blobSrc"
                                            :src="image.blobSrc"
                                            :alt="image.title"
                                            @error="handleImageError"
                                        />
                                        <span v-else class="grid-placeholder" />
                                        <span v-if="image.isCollection" class="collection-badge">合集</span>
                                    </button>
                                </div>

                                <div v-if="expandedLoading && !expandedImages.length" class="gallery-state initial">
                                    <el-icon class="is-loading"><Loading /></el-icon>
                                    <span>正在加载图片…</span>
                                </div>
                                <div v-else-if="expandedError && !expandedImages.length" class="gallery-state initial">
                                    <span>{{ expandedError }}</span>
                                    <el-button link :icon="Refresh" @click="loadExpandedPage(row.value)">重试</el-button>
                                </div>
                                <div v-else-if="!expandedLoading && !expandedImages.length" class="gallery-state initial">
                                    没有找到对应图片
                                </div>

                                <div v-if="expandedImages.length" class="gallery-state footer">
                                    <template v-if="expandedLoading">
                                        <el-icon class="is-loading"><Loading /></el-icon>
                                        <span>继续加载…</span>
                                    </template>
                                    <template v-else-if="expandedError">
                                        <span>{{ expandedError }}</span>
                                        <el-button link @click="loadExpandedPage(row.value)">重试</el-button>
                                    </template>
                                </div>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <div v-else class="empty-state">这个属性还没有可统计的 value。</div>
        </template>

        <div v-else-if="loading" class="loading-state">
            <el-skeleton :rows="6" animated />
        </div>

        <div v-else class="error-state">
            <p>{{ errorMessage }}</p>
            <el-button :icon="Refresh" @click="loadDistribution()">重新加载</el-button>
        </div>
    </article>
</template>

<style scoped>
.property-card {
    position: relative;
    overflow: hidden;
    padding: 1.75rem;
    border: 1px solid #eaecf0;
    border-radius: 24px;
    color: #1f2937;
    background:
        radial-gradient(circle at 6% 2%, rgba(220, 252, 231, 0.72), transparent 23%),
        linear-gradient(180deg, #fff 0%, #fcfcfd 100%);
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.06);
}

.card-top {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    gap: 0.75rem;
}

.distribution-search {
    width: 250px;
}

.card-kicker {
    margin: 0 0 0.5rem;
    color: #98a2b3;
    font-size: 0.7rem;
    letter-spacing: 0.18em;
}

h3 {
    margin: 0;
    color: #101828;
    font-size: 1.5rem;
    letter-spacing: -0.03em;
}

.card-subtitle {
    margin: 0.5rem 0 0;
    color: #667085;
    font-size: 0.88rem;
}

.property-select-wrap {
    min-width: 190px;
}

.property-select-wrap > span {
    display: block;
    margin-bottom: 0.4rem;
    color: #98a2b3;
    font-size: 0.7rem;
}

.property-select {
    width: 100%;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.65rem;
    margin: 1.5rem 0;
}

.summary-item {
    padding: 0.8rem 0.95rem;
    border: 1px solid #eef2f6;
    border-radius: 14px;
    background: rgba(248, 250, 252, 0.84);
}

.summary-item strong {
    display: block;
    color: #101828;
    font-size: 1.3rem;
}

.summary-item span {
    color: #667085;
    font-size: 0.75rem;
}

.distribution-content {
    display: grid;
    grid-template-columns: 270px minmax(0, 1fr);
    gap: 2rem;
    align-items: start;
}

.donut-zone {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 1rem;
}

.donut {
    position: relative;
    width: 206px;
    aspect-ratio: 1;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.7);
}

.donut::after {
    content: '';
    position: absolute;
    inset: 25px;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06);
}

.donut-center {
    position: absolute;
    inset: 0;
    z-index: 1;
    display: grid;
    place-content: center;
    text-align: center;
}

.donut-center strong {
    color: #101828;
    font-size: 1.95rem;
    line-height: 1;
}

.donut-center span {
    margin-top: 0.45rem;
    color: #98a2b3;
    font-size: 0.7rem;
}

.donut-zone p {
    margin: 0.9rem 0 0;
    color: #667085;
    font-size: 0.75rem;
}

.value-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
}

.value-row {
    display: grid;
    grid-template-columns: minmax(90px, 0.8fr) minmax(130px, 1.4fr) 94px 142px;
    gap: 1rem;
    align-items: center;
    width: 100%;
    min-height: 62px;
    padding: 0.5rem 0.65rem;
    color: inherit;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 14px;
    background: transparent;
    transition: border-color 0.2s ease, background 0.2s ease, transform 0.2s ease;
}

.value-row.clickable {
    cursor: pointer;
}

.value-row.clickable:hover,
.value-row.clickable:focus-visible,
.value-row.active {
    border-color: #dfe5eb;
    outline: none;
    background: rgba(248, 250, 252, 0.82);
    transform: translateX(2px);
}

.value-row.active {
    border-color: color-mix(in srgb, var(--row-color) 32%, #dfe5eb);
}

.value-name {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
}

.value-name i {
    width: 9px;
    height: 9px;
    flex: none;
    border-radius: 50%;
    background: var(--row-color);
}

.value-name strong {
    overflow: hidden;
    color: #344054;
    font-size: 0.88rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.value-bar {
    height: 7px;
    overflow: hidden;
    border-radius: 999px;
    background: #eef2f6;
}

.value-bar i {
    display: block;
    width: var(--bar-width);
    height: 100%;
    border-radius: inherit;
    background: var(--row-color);
}

.value-count {
    text-align: left;
    white-space: nowrap;
}

.value-count strong {
    color: #101828;
    font-size: 0.94rem;
}

.value-count small {
    margin-left: 0.3rem;
    color: #98a2b3;
    font-size: 0.68rem;
}

.sample-stack {
    display: flex;
    justify-content: flex-end;
    min-height: 42px;
    padding-right: 4px;
}

.row-tail {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0.8rem;
    min-width: 0;
}

.expand-icon {
    flex: none;
    color: #98a2b3;
    font-size: 0.9rem;
}

.sample-image {
    width: 42px;
    height: 42px;
    margin-right: -10px;
    overflow: hidden;
    border: 3px solid #fff;
    border-radius: 11px;
    background: #eef2f6;
    box-shadow: 0 3px 10px rgba(15, 23, 42, 0.12);
}

.sample-image img,
.sample-image i {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.sample-image i {
    background: linear-gradient(135deg, #f2f4f7, #d0d5dd);
}

.expanded-panel {
    height: 410px;
    max-height: 410px;
    display: flex;
    flex-direction: column;
    margin: 0.15rem 0.65rem 0.75rem;
    overflow: hidden;
    border: 1px solid #e4e7ec;
    border-radius: 16px;
    background: #f8fafc;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.expanded-header {
    height: 52px;
    flex: 0 0 52px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0 1rem;
    border-bottom: 1px solid #e4e7ec;
    background: rgba(255, 255, 255, 0.92);
}

.expanded-header > div {
    display: flex;
    align-items: baseline;
    gap: 0.65rem;
    min-width: 0;
}

.expanded-header strong {
    overflow: hidden;
    color: #344054;
    font-size: 0.84rem;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.expanded-header span {
    flex: none;
    color: #98a2b3;
    font-size: 0.7rem;
}

.expanded-scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-gutter: stable;
}

.expanded-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
    gap: 5px;
    padding: 8px;
}

.expanded-image {
    position: relative;
    min-width: 0;
    aspect-ratio: 1;
    overflow: hidden;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: #e4e7ec;
    cursor: pointer;
}

.expanded-image img,
.grid-placeholder {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.2s ease;
}

.grid-placeholder {
    background: linear-gradient(135deg, #eef2f6, #d0d5dd);
}

.expanded-image:hover img {
    transform: scale(1.04);
}

.expanded-image:focus-visible {
    outline: 2px solid #409eff;
    outline-offset: -2px;
}

.collection-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    padding: 2px 5px;
    color: #fff;
    border-radius: 5px;
    background: rgba(17, 24, 39, 0.68);
    font-size: 0.62rem;
    backdrop-filter: blur(4px);
}

.gallery-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    color: #98a2b3;
    font-size: 0.75rem;
}

.gallery-state.initial {
    height: 100%;
    flex-direction: column;
}

.gallery-state.footer {
    min-height: 42px;
    padding: 0.4rem;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1.25rem;
    padding-top: 1.1rem;
    border-top: 1px solid #f0f2f5;
}

.card-footer span {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: #98a2b3;
    font-size: 0.7rem;
}

.inline-error {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1rem;
    padding: 0.65rem 0.8rem;
    color: #b54708;
    border-radius: 10px;
    background: #fffaeb;
    font-size: 0.78rem;
}

.loading-state,
.error-state,
.empty-state {
    min-height: 280px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.loading-state :deep(.el-skeleton) {
    width: 100%;
}

.error-state {
    flex-direction: column;
    gap: 0.75rem;
    color: #667085;
}

.error-state p {
    margin: 0;
}

.empty-state {
    color: #98a2b3;
    font-size: 0.85rem;
}

@media (max-width: 760px) {
    .property-card {
        padding: 1.25rem;
        border-radius: 20px;
    }

    .card-top {
        flex-direction: column;
    }

    .property-select-wrap {
        width: 100%;
    }

    .distribution-search {
        width: 100%;
    }

    .summary-item {
        padding: 0.65rem;
    }

    .summary-item strong {
        font-size: 1.15rem;
    }

    .summary-item span {
        display: block;
        line-height: 1.35;
    }

    .distribution-content {
        grid-template-columns: 1fr;
        gap: 1.4rem;
    }

    .donut-zone {
        padding-top: 0;
    }

    .donut {
        width: 176px;
    }

    .value-row {
        grid-template-columns: minmax(80px, 1fr) 74px 104px;
        gap: 0.5rem;
        padding-inline: 0.25rem;
    }

    .value-bar {
        display: none;
    }

    .row-tail {
        gap: 0;
    }

    .expand-icon {
        display: none;
    }

    .expanded-panel {
        height: 360px;
        max-height: 360px;
        margin-inline: 0;
    }

    .expanded-grid {
        grid-template-columns: repeat(auto-fill, minmax(76px, 1fr));
    }

    .card-footer {
        flex-direction: column;
        align-items: flex-start;
    }

    .card-footer span:last-child {
        align-self: flex-end;
    }
}

@media (max-width: 420px) {
    h3 {
        font-size: 1.35rem;
    }

    .sample-image {
        width: 36px;
        height: 36px;
    }

    .value-row {
        grid-template-columns: minmax(72px, 1fr) 68px 88px;
    }
}
</style>
