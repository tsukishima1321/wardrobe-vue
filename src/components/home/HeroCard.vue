<script setup lang="ts">
import { Refresh } from '@element-plus/icons-vue'
import type { HomeDiscoveryHeroModule, HomeDiscoveryDiary, HomeDiscoveryPicture, ImageProperty } from '@/api/componentRequests'

interface DiscoveryVisual extends HomeDiscoveryPicture {
    blobSrc: string
}

defineProps<{
    heroModule: HomeDiscoveryHeroModule | null
    heroPrimaryVisual: DiscoveryVisual | null
    heroSecondaryVisuals: DiscoveryVisual[]
    heroDiary: HomeDiscoveryDiary | null
    heroPicture: HomeDiscoveryPicture | null
    heroMatchBadge: string
    heroRangeText: string
    discoveryLoading: boolean
    discoveryError: string
    generatedAt?: string
}>()

const emit = defineEmits<{
    'open-hero-memory': []
    'open-detail': [src: string]
    'open-diary-entry': [diary: { id: number; date: string; text: string }]
    'open-keyword-search': [keyword: string]
    'open-property-search': [property: ImageProperty]
    'navigate': [path: string]
    'refresh': []
}>()

const truncateText = (text: string, maxLength = 96): string => {
    if (!text) return ''
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}
</script>

<template>
    <article class="card hero-card">
        <div class="card-top">
            <div>
                <p class="card-kicker">今日回看</p>
                <h2>{{ heroModule?.title || '那年今日' }}</h2>
                <p class="card-subtitle">
                    {{ heroModule?.subtitle || '从过去的同一天里，重新摸到一小段今天会在意的记忆。' }}
                </p>
            </div>
            <div class="card-top-actions">
                <span v-if="heroMatchBadge" class="soft-badge">{{ heroMatchBadge }}</span>
                <el-button link :icon="Refresh" class="refresh-link" @click="emit('refresh')" />
            </div>
        </div>

        <div v-if="discoveryLoading" class="card-fill">
            <el-skeleton animated>
                <template #template>
                    <el-skeleton-item variant="image" class="hero-skeleton" />
                    <el-skeleton-item variant="text" style="width: 65%; margin-top: 16px;" />
                    <el-skeleton-item variant="text" style="width: 100%;" />
                    <el-skeleton-item variant="text" style="width: 92%;" />
                </template>
            </el-skeleton>
        </div>

        <template v-else-if="heroModule && !heroModule.empty">
            <button type="button" class="hero-media" @click="emit('open-hero-memory')">
                <img v-if="heroPrimaryVisual" :src="heroPrimaryVisual.blobSrc" class="hero-image" alt="" />
                <div class="hero-surface"></div>
                <div class="hero-media-meta">
                    <span class="hero-date">{{ heroPrimaryVisual?.date || heroDiary?.date || generatedAt }}</span>
                    <strong>{{ heroPrimaryVisual?.title || '打开这段回忆' }}</strong>
                </div>
            </button>

            <div v-if="heroSecondaryVisuals.length" class="hero-gallery">
                <button v-for="item in heroSecondaryVisuals" :key="`hero-${item.src}`" type="button"
                    class="hero-gallery-item" @click="emit('open-detail', item.src)">
                    <img :src="item.blobSrc" :alt="item.title || item.date" />
                    <span>{{ item.date }}</span>
                </button>
            </div>

            <div class="hero-metrics">
                <div class="metric-pill">
                    <span>图片命中</span>
                    <strong>{{ heroModule.stats.matchedPictures }}</strong>
                </div>
                <div class="metric-pill">
                    <span>日记片段</span>
                    <strong>{{ heroModule.stats.matchedDiaries }}</strong>
                </div>
                <div class="metric-pill">
                    <span>年份范围</span>
                    <strong>{{ heroRangeText }}</strong>
                </div>
            </div>

            <button v-if="heroDiary" type="button" class="memory-snippet diary-snippet-btn"
                @click="emit('open-diary-entry', heroDiary)">
                <span class="snippet-label">日记回声</span>
                <p>{{ truncateText(heroDiary.preview || heroDiary.text, 80) }}</p>
            </button>

            <div v-if="heroPicture" class="chip-row">
                <button v-for="keyword in heroPicture.keywords.slice(0, 4)" :key="`hero-keyword-${keyword}`"
                    type="button" class="chip-button" @click.stop="emit('open-keyword-search', keyword)">
                    #{{ keyword }}
                </button>
                <button v-for="property in heroPicture.properties.slice(0, 2)"
                    :key="`hero-property-${property.name}-${property.value}`" type="button"
                    class="chip-button subtle" @click.stop="emit('open-property-search', property)">
                    {{ property.name }} · {{ property.value }}
                </button>
            </div>
        </template>

        <div v-else class="empty-panel">
            <p>{{ discoveryError || '今天还没有命中"那年今日"，不如先去补一张新图，或者换个入口随便逛逛。' }}</p>
            <div class="empty-actions">
                <el-button type="primary" @click="emit('navigate', '/upload')">去上传</el-button>
                <el-button plain @click="emit('navigate', '/search')">去探索</el-button>
            </div>
        </div>
    </article>
</template>

<style scoped>
.card {
    background: linear-gradient(180deg, #ffffff 0%, #fcfcfd 100%);
    border: 1px solid #eaecf0;
    border-radius: 22px;
    padding: 1.35rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    box-sizing: border-box;
    overflow: hidden;
    position: relative;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
    transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.card:hover {
    transform: translateY(-2px);
    border-color: #d0d5dd;
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.08);
}

.card h2,
.card h3 {
    margin: 0;
    font-weight: 600;
    color: #101828;
}

.card h2 {
    font-size: 1.8rem;
    letter-spacing: -0.03em;
}

.card-subtitle {
    margin: 0.45rem 0 0;
    color: #667085;
    line-height: 1.6;
    font-size: 0.92rem;
}

.card-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
}

.card-top-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
}

.card-kicker {
    margin: 0 0 0.45rem;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #98a2b3;
}

.hero-card {
    min-height: 590px;
    flex: 1 1 auto;
    padding: 1.45rem;
    color: #1f2937;
    background:
        radial-gradient(circle at top left, rgba(125, 211, 252, 0.22), transparent 30%),
        radial-gradient(circle at right center, rgba(244, 114, 182, 0.14), transparent 24%),
        linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.hero-card h2,
.hero-card .card-subtitle {
    color: #101828;
}

.hero-card .card-subtitle {
    color: #667085;
}

.hero-skeleton {
    width: 100%;
    height: 400px;
    border-radius: 18px;
}

.card-fill {
    flex: 1;
}

.hero-media {
    position: relative;
    display: block;
    width: 100%;
    height: min(48vw, 360px);
    min-height: 240px;
    max-height: 360px;
    border-radius: 22px;
    overflow: hidden;
    background: #eef2f6;
}

.hero-media,
.remix-anchor,
.random-visual,
.remix-thumb {
    border: none;
    padding: 0;
    background: transparent;
    cursor: pointer;
}

.hero-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.hero-surface {
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.12) 0%, rgba(15, 23, 42, 0.72) 100%);
}

.hero-media-meta {
    position: absolute;
    left: 1.25rem;
    right: 1.25rem;
    bottom: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    text-align: left;
    color: #fff;
}

.hero-media-meta span,
.hero-date {
    font-size: 0.82rem;
    color: rgba(255, 255, 255, 0.76);
}

.hero-media-meta strong {
    font-size: 1.1rem;
}

.hero-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(288px, 1fr));
    gap: 0.7rem;
}

.hero-gallery-item {
    position: relative;
    border: 1px solid #e5e7eb;
    border-radius: 16px;
    overflow: hidden;
    background: #eef2f6;
    min-height: 88px;
    height: 288px;
}

.hero-gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.hero-gallery-item span {
    position: absolute;
    left: 0.55rem;
    right: 0.55rem;
    bottom: 0.45rem;
    font-size: 0.68rem;
    color: #fff;
    text-align: left;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}

.hero-metrics {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
}

.metric-pill {
    padding: 0.9rem 1rem;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.metric-pill span {
    font-size: 0.74rem;
    color: #667085;
}

.metric-pill strong {
    font-size: 1.15rem;
    color: #101828;
}

.memory-snippet {
    padding: 1rem 1.1rem;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #e5e7eb;
}

.snippet-label {
    display: inline-block;
    margin-bottom: 0.45rem;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #98a2b3;
}

.memory-snippet p {
    margin: 0;
    line-height: 1.7;
    color: #344054;
}

.diary-snippet-btn {
    width: 100%;
    border: none;
    text-align: left;
    cursor: pointer;
}

.chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.55rem;
}

.chip-button {
    border: 1px solid #d0d5dd;
    border-radius: 999px;
    background: #fff;
    color: #344054;
    padding: 0.42rem 0.8rem;
    font-size: 0.82rem;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease, color 0.2s ease;
}

.chip-button:hover {
    border-color: #98a2b3;
    background: #f8fafc;
    color: #111827;
}

.chip-button.subtle {
    background: #f8fafc;
    border-color: #d0d5dd;
    color: #344054;
}

.chip-button.subtle:hover {
    background: #eef2f6;
    color: #111827;
}

.empty-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 1rem;
    min-height: 180px;
    padding: 1.2rem;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px dashed #d0d5dd;
    color: #475467;
}

.empty-panel p {
    margin: 0;
    line-height: 1.65;
}

.empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.soft-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    padding: 0.2rem 0.7rem;
    border-radius: 999px;
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    color: #1d4ed8;
    font-size: 0.78rem;
}

.refresh-link {
    color: #667085 !important;
}
</style>
