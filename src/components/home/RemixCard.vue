<script setup lang="ts">
import type { HomeDiscoveryRemixModule, HomeDiscoveryDiary, HomeDiscoveryPicture } from '@/api/componentRequests'

interface DiscoveryVisual extends HomeDiscoveryPicture {
    blobSrc: string
}

defineProps<{
    remixModule: HomeDiscoveryRemixModule | null
    remixAnchorVisual: DiscoveryVisual | null
    remixRelatedVisuals: DiscoveryVisual[]
    discoveryLoading: boolean
}>()

const emit = defineEmits<{
    'open-detail': [src: string]
    'open-diary-entry': [diary: { id: number; date: string; text: string }]
    'open-theme-search': []
}>()

const truncateText = (text: string, maxLength = 96): string => {
    if (!text) return ''
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
}
</script>

<template>
    <article class="card remix-card">
        <div class="card-top">
            <div>
                <p class="card-kicker">记忆重组</p>
                <h3>{{ remixModule?.title || '记忆重组' }}</h3>
                <p class="card-subtitle">
                    {{ remixModule?.subtitle || '把不同时间里反复出现的主题，拼成一条更有趣的线索。' }}
                </p>
            </div>
            <el-button v-if="remixModule && !remixModule.empty" link class="theme-link" @click="emit('open-theme-search')">
                {{ remixModule.theme.label }} →
            </el-button>
        </div>

        <div v-if="discoveryLoading" class="card-fill">
            <el-skeleton :rows="6" animated />
        </div>

        <template v-else-if="remixModule && !remixModule.empty">
            <button v-if="remixAnchorVisual" type="button" class="remix-anchor"
                @click="emit('open-detail', remixAnchorVisual.src)">
                <img :src="remixAnchorVisual.blobSrc" class="remix-anchor-image" alt="" />
                <div class="remix-anchor-copy">
                    <span>{{ remixAnchorVisual.date }}</span>
                    <strong>{{ remixAnchorVisual.title || '查看锚点记忆' }}</strong>
                </div>
            </button>

            <div v-if="remixRelatedVisuals.length" class="remix-collage">
                <button v-for="item in remixRelatedVisuals" :key="`remix-${item.src}`" type="button"
                    class="remix-thumb" @click="emit('open-detail', item.src)">
                    <img :src="item.blobSrc" alt="" />
                    <span>{{ item.date }}</span>
                </button>
            </div>

            <div class="remix-meta-row">
                <span class="soft-badge">{{ remixModule.theme.kind }}</span>
                <span class="meta-copy">关联 {{ remixModule.theme.relatedCount }} 条</span>
            </div>

            <div v-if="remixModule.diaries.length" class="remix-notes">
                <button v-for="diary in remixModule.diaries.slice(0, 2)" :key="`remix-diary-${diary.id}`"
                    type="button" class="remix-note-btn" @click="emit('open-diary-entry', diary)">
                    {{ truncateText(diary.preview || diary.text, 58) }}
                </button>
            </div>
        </template>

        <div v-else class="empty-panel compact">
            <p>今天的重组线索还没拼出来，稍后刷新也许会有新的锚点。</p>
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

.card h3 {
    margin: 0;
    font-weight: 600;
    color: #101828;
    font-size: 1.18rem;
    letter-spacing: -0.02em;
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

.card-kicker {
    margin: 0 0 0.45rem;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #98a2b3;
}

.remix-card {
    min-height: 0;
}

.theme-link {
    padding-top: 0.1rem;
    color: #111827 !important;
}

.remix-anchor {
    position: relative;
    width: 100%;
    border-radius: 18px;
    overflow: hidden;
    min-height: 180px;
    background: #eef2f6;
    border: none;
    padding: 0;
    cursor: pointer;
}

.remix-anchor-image {
    width: 100%;
    height: 220px;
    object-fit: cover;
    display: block;
}

.remix-anchor-copy {
    position: absolute;
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    color: #fff;
    text-align: left;
}

.remix-anchor-copy span {
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.76);
}

.remix-collage {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.7rem;
}

.remix-thumb {
    position: relative;
    border-radius: 16px;
    overflow: hidden;
    min-height: 104px;
    border: none;
    padding: 0;
    cursor: pointer;
}

.remix-thumb img {
    width: 100%;
    height: 104px;
    object-fit: cover;
    display: block;
}

.remix-thumb span {
    position: absolute;
    left: 0.65rem;
    right: 0.65rem;
    bottom: 0.55rem;
    font-size: 0.72rem;
    color: #fff;
    text-align: left;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.45);
}

.remix-meta-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
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

.remix-card .soft-badge {
    background: #eff6ff;
    color: #1d4ed8;
    border-color: #bfdbfe;
}

.meta-copy {
    font-size: 0.84rem;
    color: #667085;
}

.remix-notes {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}

.remix-note-btn {
    margin: 0;
    line-height: 1.65;
    color: #475467;
    border: 1px solid #eef2f6;
    border-radius: 14px;
    background: #f8fafc;
    padding: 0.75rem 0.85rem;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
}

.remix-note-btn:hover {
    border-color: #d0d5dd;
    background: #eef2f6;
}

.card-fill {
    flex: 1;
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

.empty-panel.compact {
    min-height: 0;
    color: #475467;
    background: #f8fafc;
    border: 1px dashed #d0d5dd;
}

.empty-panel p {
    margin: 0;
    line-height: 1.65;
}
</style>
