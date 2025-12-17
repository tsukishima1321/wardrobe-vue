<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { fetchDataAutoRetry, GetBlobImgSrc } from '../token';
import SearchBarSimple from './SearchBarSimple.vue';
import {
    Picture,
    Notebook,
    Upload,
    ArrowRight,
    Refresh,
    CaretTop
} from '@element-plus/icons-vue';
import defaultAvatar from '@/assets/icons/defaultAvatar.jpg';

// Interfaces
interface TypeStatistics {
    type: string;
    totalAmount: number;
    lastYearAmount: number;
    lastMonthAmount: number;
}
interface ImgInfo { src: string; title: string; }
interface StatResponse {
    overall: {
        totalAmount: number;
        lastYearAmount: number;
        lastMonthAmount: number;
    };
    types: Array<TypeStatistics>;
}
interface DiaryItem { id: number; date: string; text: string; }

const router = useRouter();

// State
const greeting = ref('');
const currentDate = ref('');
const featuredImg = ref('');
const featuredImgTitle = ref('');
const featuredImgOriginalSrc = ref('');
const loadingImg = ref(true);
const keywords = ref<string[]>([]);
const selectedKeyword = ref('');
const stats = ref({
    total: 0,
    newMonth: 0,
    newYear: 0,
    types: [] as TypeStatistics[]
});
const latestDiary = ref<DiaryItem | null>(null);
const userAvatar = ref(defaultAvatar);

// Logic
const updateTime = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) greeting.value = 'Good Morning';
    else if (hour < 18) greeting.value = 'Good Afternoon';
    else greeting.value = 'Good Evening';

    currentDate.value = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
    });
};

const fetchKeywords = async () => {
    const res = await fetchDataAutoRetry('/api/searchhint/', {}, 'GET') as { keywords: string[] };
    keywords.value = res.keywords;
};

const generateTips = async () => {
    const res = await fetchDataAutoRetry('/api/generatetips/', {}, 'GET') as any;
};

const fetchRandomImage = async () => {
    loadingImg.value = true;
    try {
        // Using existing API
        const url = selectedKeyword.value && selectedKeyword.value !== '不限'
            ? `/api/random/?keyword=${selectedKeyword.value}`
            : '/api/random/';

        const res = await fetchDataAutoRetry(url, {}, 'GET') as ImgInfo;
        const blobSrc = await GetBlobImgSrc("/imagebed/thumbnails/" + res.src);
        featuredImg.value = blobSrc;
        featuredImgTitle.value = res.title;
        featuredImgOriginalSrc.value = res.src;
    } catch (e) {
        console.error(e);
    } finally {
        loadingImg.value = false;
    }
};

const fetchStats = async () => {
    const res = await fetchDataAutoRetry('/api/statistics/', {}, 'GET') as StatResponse;
    const sortedTypes = res.types.sort((a, b) =>
        (b.lastMonthAmount - a.lastMonthAmount) * 1000 +
        (b.lastYearAmount - a.lastYearAmount) * 10 +
        (b.totalAmount - a.totalAmount)
    );

    stats.value = {
        total: res.overall.totalAmount,
        newMonth: res.overall.lastMonthAmount,
        newYear: res.overall.lastYearAmount,
        types: sortedTypes
    };
};

const fetchLatestDiary = async () => {
    // Reusing search API to get latest
    const res = await fetchDataAutoRetry("/api/diary/search/", {
        page: 1, pageSize: 1, orderBy: 'date', order: 'desc'
    }, "POST") as any;
    if (res.textList && res.textList.length > 0) {
        latestDiary.value = res.textList[0];
    }
};

const navigateTo = (path: string) => router.push(path);

onMounted(async () => {
    try {
        generateTips();
        updateTime();
        fetchKeywords();
        fetchRandomImage();
        fetchStats();
        fetchLatestDiary();
    }
    catch (e) {
        router.push('/login');
    }
});

const search = (searchword: string) => {
    const newWindow = router.resolve({ name: 'search', params: { searchword: searchword } });
    window.open(newWindow.href, '_blank');
}

</script>

<template>
    <div class="dashboard">
        <!-- Header Section -->
        <header class="header">
            <div class="greeting">
                <h1>{{ greeting }}</h1>
                <p class="date">{{ currentDate }}</p>
            </div>
            <div class="user-avatar" @click="navigateTo('/manage')">
                <img v-if="userAvatar" :src="userAvatar" class="avatar-img" alt="User Avatar" />
                <div v-else class="avatar-circle">Me</div>
            </div>
        </header>

        <!-- Bento Grid -->
        <div class="bento-grid">

            <!-- 1. Featured Memory (Large) -->
            <div class="card featured-card">
                <div class="card-header">
                    <h3>Flashback</h3>
                    <div class="header-controls">
                        <el-select v-model="selectedKeyword" placeholder="Keyword" size="small" filterable allow-create
                            default-first-option @change="fetchRandomImage" class="keyword-select">
                            <el-option label="All" value="" />
                            <el-option v-for="k in keywords" :key="k" :label="k" :value="k" />
                        </el-select>
                        <el-button link :icon="Refresh" @click.stop="fetchRandomImage" class="refresh-btn" />
                    </div>
                </div>
                <div class="img-container" @click="navigateTo('/detail/' + featuredImgOriginalSrc)">
                    <el-skeleton v-if="loadingImg" style="width: 100%; height: 100%" animated>
                        <template #template>
                            <el-skeleton-item variant="image" style="width: 100%; height: 100%" />
                        </template>
                    </el-skeleton>
                    <img v-else :src="featuredImg" class="featured-img" />
                    <div class="img-overlay" v-if="!loadingImg">
                        <span>{{ featuredImgTitle || 'Untitled' }}</span>
                    </div>
                </div>
            </div>

            <!-- 2. Detailed Stats -->
            <div class="card stats-card">
                <div class="stats-header">
                    <h3>Total Memories</h3>
                </div>

                <!-- Overall Big Numbers -->
                <div class="stats-overview">
                    <div class="stat-box">
                        <span class="stat-label">Total</span>
                        <span class="stat-value">{{ stats.total }}</span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Month</span>
                        <span class="stat-value highlight">
                            {{ stats.newMonth }}
                            <el-icon v-if="stats.newMonth > 0" class="trend-icon-up">
                                <CaretTop />
                            </el-icon>
                        </span>
                    </div>
                    <div class="stat-box">
                        <span class="stat-label">Year</span>
                        <span class="stat-value highlight">
                            {{ stats.newYear }}
                            <el-icon v-if="stats.newYear > 0" class="trend-icon-up">
                                <CaretTop />
                            </el-icon>
                        </span>
                    </div>
                </div>

                <div class="stat-divider"></div>

                <!-- Category List -->
                <div class="stats-list-container">
                    <div class="stats-list-header">
                        <span>Keyword</span>
                        <span>Total</span>
                        <span>Month</span>
                        <span>Year</span>
                    </div>
                    <el-scrollbar height="250px">
                        <div v-for="type in stats.types" :key="type.type" class="stats-row">
                            <span class="type-name">{{ type.type }}</span>
                            <span class="type-val">{{ type.totalAmount }}</span>
                            <span class="type-val highlight">
                                <span v-if="type.lastMonthAmount > 0"></span>{{ type.lastMonthAmount }}
                                <el-icon v-if="type.lastMonthAmount > 0" class="trend-icon-up">
                                    <CaretTop />
                                </el-icon>
                                <el-icon v-if="type.lastMonthAmount == 0" class="trend-icon-flat">
                                    <Minus />
                                </el-icon>
                            </span>
                            <span class="type-val highlight">
                                <span v-if="type.lastYearAmount > 0"></span>{{ type.lastYearAmount }}
                                <el-icon v-if="type.lastYearAmount > 0" class="trend-icon-up">
                                    <CaretTop />
                                </el-icon>
                                <el-icon v-if="type.lastYearAmount == 0" class="trend-icon-flat">
                                    <Minus />
                                </el-icon>
                            </span>
                        </div>
                    </el-scrollbar>
                </div>
            </div>

            <!-- 3. Latest Thought -->
            <div class="card diary-card" @click="navigateTo('/diary')">
                <div class="card-header">
                    <h3>Latest Thought</h3>
                    <el-icon>
                        <ArrowRight />
                    </el-icon>
                </div>
                <div class="diary-preview" v-if="latestDiary">
                    <p class="diary-date">{{ latestDiary.date }}</p>
                    <p class="diary-text">{{ latestDiary.text.substring(0, 150) }}...</p>
                </div>
                <div v-else class="empty-state">
                    No diaries yet.
                </div>
            </div>

            <!-- 4. Quick Actions -->
            <div class="card actions-card">
                <div class="action-btn" @click="navigateTo('/upload')">
                    <el-icon>
                        <Upload />
                    </el-icon>
                    <span>Upload</span>
                </div>
                <div class="action-btn" @click="navigateTo('/diary')">
                    <el-icon>
                        <Notebook />
                    </el-icon>
                    <span>Journal</span>
                </div>
                <div class="action-btn" @click="navigateTo('/search')">
                    <el-icon>
                        <Picture />
                    </el-icon>
                    <span>Gallery</span>
                </div>
            </div>

            <!-- 5. Search (Full Width Bottom) -->
            <div class="card search-card">
                <SearchBarSimple @updateValue="search" />
            </div>

        </div>
    </div>
</template>

<style scoped>
/* Modern, Clean, "No-AI" Style */
.dashboard {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    color: #333;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    margin-bottom: 2rem;
}

.greeting h1 {
    font-size: 2.5rem;
    font-weight: 300;
    /* Light weight for modern feel */
    margin: 0;
    letter-spacing: -0.02em;
}

.date {
    color: #888;
    margin: 0.5rem 0 0 0;
    font-size: 0.9rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.avatar-circle {
    width: 80px;
    height: 80px;
    background: #000;
    color: #fff;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    cursor: pointer;
}

.avatar-img {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    cursor: pointer;
    border: 1px solid #eaeaea;
}

/* Bento Grid Layout */
.bento-grid {
    display: grid;
    grid-template-columns: 1.5fr 1fr;
    grid-template-rows: 400px auto auto;
    gap: 1.5rem;
}

.card {
    background: #fff;
    border: 1px solid #eaeaea;
    border-radius: 8px;
    /* Subtle radius */
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    transition: border-color 0.2s;
    overflow: hidden;
    position: relative;
    box-sizing: border-box;
}

.card:hover {
    border-color: #000;
}

/* Featured Card (Top Left) */
.featured-card {
    grid-column: 1 / 2;
    grid-row: 1 / 2;
    padding: 0;
    /* Full bleed image */
    position: relative;
    border: none;
    /* Image acts as border */
    background: #f5f5f5;
}

.featured-card .card-header {
    position: absolute;
    top: 1rem;
    left: 1rem;
    right: 1rem;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}

.keyword-select {
    width: 120px;
    opacity: 0.8;
    transition: opacity 0.2s;
}

.keyword-select:hover {
    opacity: 1;
}

.featured-card h3 {
    margin: 0;
    color: #fff;
    text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
    font-weight: 500;
}

.refresh-btn {
    color: #fff !important;
}

.img-container {
    width: 100%;
    height: 100%;
    cursor: pointer;
    position: relative;
}

.featured-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.5s ease;
}

.featured-card:hover .featured-img {
    transform: scale(1.02);
}

.img-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 1.5rem;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
    color: #fff;
    font-size: 0.9rem;
}

/* Stats Card (Top Right) */
.stats-card {
    grid-column: 2 / 3;
    grid-row: 1 / 2;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.stats-header h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #333;
}

.stats-overview {
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.5rem;
}

.stat-box {
    display: flex;
    flex-direction: column;
    align-items: center;
}

.stat-label {
    font-size: 0.75rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.stat-value {
    font-size: 1.5rem;
    font-weight: 600;
    line-height: 1.2;
}

.stat-value.highlight {
    color: #000;
    display: flex;
    align-items: center;
    gap: 2px;
}

.trend-icon-up {
    font-size: 0.8em;
    color: var(--el-color-success);
}

.trend-icon-flat {
    font-size: 0.8em;
    color: var(--el-color-warning);
}

.stat-divider {
    height: 1px;
    background: #eee;
    width: 100%;
}

.stats-list-container {
    flex: 1;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}

.stats-list-header {
    display: flex;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f5f5f5;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    color: #999;
    text-transform: uppercase;
}

.stats-list-header span:nth-child(1) {
    flex: 2;
}

.stats-list-header span:nth-child(2),
.stats-list-header span:nth-child(3),
.stats-list-header span:nth-child(4) {
    flex: 1;
    text-align: right;
}

.stats-row {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    font-size: 0.9rem;
    border-bottom: 1px dashed #f9f9f9;
}

.stats-row:last-child {
    border-bottom: none;
}

.type-name {
    flex: 2;
    font-weight: 500;
    color: #444;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding-right: 5px;
}

.type-val {
    flex: 1;
    text-align: right;
    color: #666;
}

.type-val.highlight {
    color: #000;
    font-weight: 500;
}

/* Diary Card (Bottom Right, Spans Row 2 & 3) */
.diary-card {
    grid-column: 2 / 3;
    grid-row: 2 / 4;
    cursor: pointer;
}

.diary-card .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
}

.diary-card h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
}

.diary-preview {
    font-size: 0.9rem;
    color: #555;
    line-height: 1.5;
}

.diary-date {
    font-size: 0.75rem;
    color: #999;
    margin-bottom: 0.5rem;
}

/* Actions Card (Bottom Left, Row 2) */
.actions-card {
    grid-column: 1 / 2;
    grid-row: 2 / 3;
    flex-direction: row;
    justify-content: space-around;
    align-items: center;
    padding: 0;
}

.action-btn {
    flex: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    cursor: pointer;
    transition: background 0.2s;
    color: #555;
    padding: 10px;
}

.action-btn:hover {
    background: #f9f9f9;
    color: #000;
}

.action-btn span {
    font-size: 0.8rem;
}

/* Search Card (Bottom Left, Row 3) */
.search-card {
    grid-column: 1 / 2;
    grid-row: 3 / 4;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fafafa;
    border-style: dashed;
}

/* Responsive */
@media (max-width: 768px) {
    .bento-grid {
        grid-template-columns: 1fr;
        grid-template-rows: auto;
        display: flex;
        flex-direction: column;
    }

    .featured-card,
    .stats-card,
    .diary-card,
    .actions-card,
    .search-card {
        grid-column: auto;
        grid-row: auto;
        width: 100%;
    }

    .featured-card {
        height: 300px;
    }

    .stats-card {
        height: auto;
        min-height: 400px;
    }

    .header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
    }
}
</style>