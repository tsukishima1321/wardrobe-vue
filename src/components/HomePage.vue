<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
    ArrowRight,
    Notebook,
    Picture,
    Refresh,
    Upload,
} from '@element-plus/icons-vue';
import defaultAvatar from '@/assets/icons/defaultAvatar.jpg';
import SearchBarSimple from './home/SearchBarSimple.vue';
import HeroCard from './home/HeroCard.vue';
import RemixCard from './home/RemixCard.vue';
import DigestCard from './home/DigestCard.vue';
import StatsCard from './home/StatsCard.vue';
import TimelineReport from './home/TimelineReport.vue';
import PropertyDistributionCard from './home/PropertyDistributionCard.vue';
import { GetBlobImgSrc } from '../api/token';
import {
    generateTips as requestGenerateTips,
    getHomeDiscovery,
    getRandomImageInfo,
    getSearchHints,
    getStatistics,
    searchDiary,
    type DiaryItem,
    type HomeDiscoveryPicture,
    type HomeDiscoveryReminder,
    type HomeDiscoveryResponse,
    type ImageProperty,
    type ImgInfo,
    type StatResponse,
    type TypeStatistics,
} from '@/api/componentRequests';

interface DiscoveryVisual extends HomeDiscoveryPicture {
    blobSrc: string;
}

const router = useRouter();

const greeting = ref('');
const currentDate = ref('');
const userAvatar = ref(defaultAvatar);
const discoveryLoading = ref(true);
const discoveryError = ref('');
const discoveryData = ref<HomeDiscoveryResponse | null>(null);
const heroVisuals = ref<DiscoveryVisual[]>([]);
const remixVisuals = ref<DiscoveryVisual[]>([]);
const featuredImg = ref('');
const featuredImgTitle = ref('');
const featuredImgOriginalSrc = ref('');
const loadingImg = ref(true);
const keywords = ref<string[]>([]);
const selectedKeyword = ref('');
const stats = ref({
    total: 0,
    totalExpanded: 0,
    newMonth: 0,
    newMonthExpanded: 0,
    newYear: 0,
    newYearExpanded: 0,
    types: [] as TypeStatistics[],
    typesExpanded: [] as TypeStatistics[],
});
const latestDiary = ref<DiaryItem | null>(null);

const heroModule = computed(() => discoveryData.value?.modules.hero ?? null);
const remixModule = computed(() => discoveryData.value?.modules.remix ?? null);
const digestModule = computed(() => discoveryData.value?.modules.digest ?? null);
const heroPicture = computed(() => heroModule.value?.pictures[0] ?? null);
const heroDiary = computed(() => heroModule.value?.diaries[0] ?? null);
const heroPrimaryVisual = computed(() => heroVisuals.value[0] ?? null);
const heroSecondaryVisuals = computed(() => heroVisuals.value.slice(1));
const remixAnchorVisual = computed(() => remixVisuals.value[0] ?? null);
const remixRelatedVisuals = computed(() => remixVisuals.value.slice(1, 4));

const heroRangeText = computed(() => {
    const years = [...(heroModule.value?.stats.yearRange ?? [])].sort((a, b) => a - b);
    if (!years.length) {
        return '尚无范围';
    }
    if (years.length === 1) {
        return String(years[0]);
    }
    return `${years[0]}-${years[years.length - 1]}`;
});

const heroMatchBadge = computed(() => {
    if (!heroModule.value) {
        return '';
    }
    return heroModule.value.exactMatch ? '同一天' : `前后 ${heroModule.value.windowDays} 天`;
});

const updateTime = () => {
    const now = new Date();
    const hour = now.getHours();
    if (hour < 12) greeting.value = 'Good Morning';
    else if (hour < 18) greeting.value = 'Good Afternoon';
    else greeting.value = 'Good Evening';

    currentDate.value = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
    });
};

const buildSearchQuery = (options: {
    dateFrom?: string;
    dateTo?: string;
    keywords?: string[];
    excludedKeywords?: string[];
    properties?: ImageProperty[];
    propertiesPrecise?: boolean;
}) => {
    const query: Record<string, string | string[]> = {};
    if (options.dateFrom) query.dateFrom = options.dateFrom;
    if (options.dateTo) query.dateTo = options.dateTo;
    if (options.keywords?.length) query.keywords = options.keywords;
    if (options.excludedKeywords?.length) query.excludedKeywords = options.excludedKeywords;
    if (options.properties?.length) query.properties = options.properties.map((item) => JSON.stringify(item));
    if (options.propertiesPrecise) query.propertiesPrecise = 'true';
    return query;
};

const openSearchWindow = (
    searchword = '',
    options: {
        dateFrom?: string;
        dateTo?: string;
        keywords?: string[];
        excludedKeywords?: string[];
        properties?: ImageProperty[];
        propertiesPrecise?: boolean;
    } = {},
) => {
    const target = router.resolve({
        name: 'search',
        ...(searchword ? { params: { searchword } } : {}),
        query: buildSearchQuery(options),
    });
    window.open(target.href, '_blank');
};

const openKeywordSearch = (keyword: string) => {
    openSearchWindow('', { keywords: [keyword] });
};

const openPropertySearch = (property: ImageProperty, searchword = '') => {
    openSearchWindow(searchword, {
        properties: [{ name: property.name, value: property.value }],
        propertiesPrecise: true,
    });
};

const openReminderLink = (reminder: HomeDiscoveryReminder) => {
    if (!reminder.link) {
        return;
    }
    if (reminder.link.startsWith('/')) {
        const target = router.resolve({ path: reminder.link });
        window.open(target.href, '_blank');
        return;
    }
    window.open(reminder.link, '_blank');
};

const openThemeSearch = () => {
    const theme = remixModule.value?.theme;
    if (!theme) {
        return;
    }

    if (theme.kind === 'keyword') {
        openKeywordSearch(theme.label);
        return;
    }

    if (theme.kind === 'property' && theme.propertyName && theme.propertyValue) {
        openSearchWindow('', {
            properties: [{ name: theme.propertyName, value: theme.propertyValue }],
            propertiesPrecise: true,
        });
        return;
    }

    openSearchWindow(theme.label);
};

const fetchThumb = async (src: string, isCollection = false): Promise<string> => {
    const suffix = isCollection ? `?${Date.now()}` : '';
    return GetBlobImgSrc(`/imagebed/thumbnails/${src}${suffix}`);
};

const dedupePictures = (pictures: Array<HomeDiscoveryPicture | null | undefined>): HomeDiscoveryPicture[] => {
    const picked = new Map<string, HomeDiscoveryPicture>();
    pictures.forEach((picture) => {
        if (picture && !picked.has(picture.src)) {
            picked.set(picture.src, picture);
        }
    });
    return [...picked.values()];
};

const hydrateDiscoveryVisuals = async (payload: HomeDiscoveryResponse) => {
    heroVisuals.value = await Promise.all(
        payload.modules.hero.pictures.map(async (item) => ({
            ...item,
            blobSrc: await fetchThumb(item.src, item.isCollection),
        })),
    );

    const pictures = dedupePictures([payload.modules.remix.anchor, ...payload.modules.remix.pictures]).slice(0, 4);
    remixVisuals.value = await Promise.all(
        pictures.map(async (item) => ({
            ...item,
            blobSrc: await fetchThumb(item.src, item.isCollection),
        })),
    );
};

const fetchKeywords = async () => {
    const res = await getSearchHints();
    keywords.value = res.keywords;
};

const fetchDiscovery = async () => {
    discoveryLoading.value = true;
    discoveryError.value = '';
    try {
        const res = await getHomeDiscovery();
        discoveryData.value = res;
        await hydrateDiscoveryVisuals(res);
    } catch (error) {
        console.error(error);
        discoveryData.value = null;
        heroVisuals.value = [];
        remixVisuals.value = [];
        discoveryError.value = '首页聚合内容加载失败，请稍后重试。';
    } finally {
        discoveryLoading.value = false;
    }
};

const fetchRandomImage = async () => {
    loadingImg.value = true;
    try {
        const keyword = selectedKeyword.value || undefined;
        const res = await getRandomImageInfo(keyword) as ImgInfo;
        featuredImg.value = await fetchThumb(res.src);
        featuredImgTitle.value = res.title;
        featuredImgOriginalSrc.value = res.src;
    } catch (error) {
        console.error(error);
    } finally {
        loadingImg.value = false;
    }
};

const fetchStats = async () => {
    const res = await getStatistics() as StatResponse;

    stats.value = {
        total: res.overall.totalAmount,
        totalExpanded: res.overallExpanded.totalAmount,
        newMonth: res.overall.lastMonthAmount,
        newMonthExpanded: res.overallExpanded.lastMonthAmount,
        newYear: res.overall.lastYearAmount,
        newYearExpanded: res.overallExpanded.lastYearAmount,
        types: res.types,
        typesExpanded: res.typesExpanded,
    };
};

const fetchLatestDiary = async () => {
    const res = await searchDiary({
        page: 1,
        pageSize: 1,
        orderBy: 'date',
        order: 'desc',
    });
    if (res.textList && res.textList.length > 0) {
        latestDiary.value = res.textList[0];
    } else {
        latestDiary.value = null;
    }
};

const navigateTo = (path: string) => router.push(path);

const DIARY_FOCUS_STORAGE_KEY = 'wardrobe-focus-diary';

const openDiaryEntry = (diary: { id: number; date: string; text: string }) => {
    sessionStorage.setItem(DIARY_FOCUS_STORAGE_KEY, JSON.stringify({
        id: diary.id,
        date: diary.date,
        text: diary.text,
    }));
    router.push({
        path: '/diary',
        query: {
            diaryId: String(diary.id),
            diaryDate: diary.date,
        },
    });
};

const openHeroMemory = () => {
    if (heroPicture.value?.src) {
        navigateTo(`/detail/${heroPicture.value.src}`);
        return;
    }
    if (heroDiary.value?.id) {
        openDiaryEntry(heroDiary.value);
        return;
    }
    navigateTo('/upload');
};

const openDetail = (src: string) => {
    //navigateTo(`/detail/${src}`);
    window.open(router.resolve({ path: `/detail/${src}` }).href, '_blank');
};

const search = (searchword: string) => {
    openSearchWindow(searchword);
};

const openLatestDiaryCard = () => {
    if (latestDiary.value) {
        openDiaryEntry(latestDiary.value);
        return;
    }
    navigateTo('/diary');
};

const handleTimelineBucketSearch = (bucket: { period: string; startDate: string; endDate: string; searchWord: string }) => {
    const searchword = bucket.searchWord.trim();
    if (!searchword) {
        return;
    }
    openSearchWindow(searchword, {
        dateFrom: bucket.startDate,
        dateTo: bucket.endDate,
    });
};

onMounted(async () => {
    try {
        await requestGenerateTips();
        updateTime();
        await fetchKeywords();
        await Promise.allSettled([
            fetchDiscovery(),
            fetchRandomImage(),
            fetchStats(),
            fetchLatestDiary(),
        ]);
    } catch (error) {
        console.error(error);
        router.push('/login');
    }
});
</script>

<template>
    <div class="dashboard">
        <header class="header">
            <div class="greeting">
                <p class="eyebrow">HOME DISCOVERY</p>
                <h1>{{ greeting }}</h1>
                <p class="date">{{ currentDate }}</p>
            </div>
            <div class="user-avatar" @click="navigateTo('/manage')">
                <img v-if="userAvatar" :src="userAvatar" class="avatar-img" alt="User Avatar" />
                <div v-else class="avatar-circle">Me</div>
            </div>
        </header>

        <section class="discovery-grid">
            <div class="discovery-column left-discovery-column">
                <HeroCard
                    :hero-module="heroModule"
                    :hero-primary-visual="heroPrimaryVisual"
                    :hero-secondary-visuals="heroSecondaryVisuals"
                    :hero-diary="heroDiary"
                    :hero-picture="heroPicture"
                    :hero-match-badge="heroMatchBadge"
                    :hero-range-text="heroRangeText"
                    :discovery-loading="discoveryLoading"
                    :discovery-error="discoveryError"
                    :generated-at="discoveryData?.generatedAt"
                    @open-hero-memory="openHeroMemory"
                    @open-detail="openDetail"
                    @open-diary-entry="openDiaryEntry"
                    @open-keyword-search="openKeywordSearch"
                    @open-property-search="openPropertySearch"
                    @navigate="navigateTo"
                    @refresh="fetchDiscovery"
                />

                <article class="card actions-card">
                    <div class="action-btn" @click="navigateTo('/upload')">
                        <el-icon>
                            <Upload />
                        </el-icon>
                        <strong>上传照片</strong>
                        <span>把今天放进下一次回看里</span>
                    </div>
                    <div class="action-btn" @click="navigateTo('/diary')">
                        <el-icon>
                            <Notebook />
                        </el-icon>
                        <strong>写点日记</strong>
                        <span>给照片加一句情绪和背景</span>
                    </div>
                    <div class="action-btn" @click="navigateTo('/search')">
                        <el-icon>
                            <Picture />
                        </el-icon>
                        <strong>进入图库</strong>
                        <span>从更多筛选条件里继续找</span>
                    </div>
                </article>
            </div>

            <div class="discovery-column right-discovery-column">
                <RemixCard
                    :remix-module="remixModule"
                    :remix-anchor-visual="remixAnchorVisual"
                    :remix-related-visuals="remixRelatedVisuals"
                    :discovery-loading="discoveryLoading"
                    @open-detail="openDetail"
                    @open-diary-entry="openDiaryEntry"
                    @open-theme-search="openThemeSearch"
                />

                <DigestCard
                    :digest-module="digestModule"
                    :discovery-loading="discoveryLoading"
                    @open-keyword-search="openKeywordSearch"
                    @open-reminder-link="openReminderLink"
                />
            </div>
        </section>

        <section class="support-grid">
            <div class="support-column">
                <article class="card search-card">
                    <div class="card-top">
                        <div>
                            <p class="card-kicker">继续探索</p>
                            <h3>从一个词开始</h3>
                        </div>
                    </div>
                    <SearchBarSimple @update-value="search" />
                </article>

                <article class="card random-card">
                    <div class="card-top">
                        <div>
                            <p class="card-kicker">随机翻翻</p>
                            <h3>意外发现</h3>
                        </div>
                        <div class="card-top-actions">
                            <el-select v-model="selectedKeyword" placeholder="关键词" size="small" filterable allow-create
                                default-first-option class="keyword-select" @change="fetchRandomImage">
                                <el-option label="全部" value="" />
                                <el-option v-for="keyword in keywords" :key="keyword" :label="keyword"
                                    :value="keyword" />
                            </el-select>
                            <el-button link :icon="Refresh" class="refresh-link" @click="fetchRandomImage" />
                        </div>
                    </div>

                    <button type="button" class="random-visual" :disabled="loadingImg || !featuredImgOriginalSrc"
                        @click="openDetail(featuredImgOriginalSrc)">
                        <el-skeleton v-if="loadingImg" animated style="width: 100%;">
                            <template #template>
                                <el-skeleton-item variant="image" class="random-skeleton" />
                            </template>
                        </el-skeleton>
                        <template v-else>
                            <img :src="featuredImg" class="random-image" alt="" />
                            <div class="random-meta">
                                <strong>{{ featuredImgTitle || 'Untitled' }}</strong>
                                <span>{{ selectedKeyword || '全部主题' }}</span>
                            </div>
                        </template>
                    </button>
                </article>
            </div>

            <div class="support-column">
                <article class="card diary-card" @click="openLatestDiaryCard">
                    <div class="card-top">
                        <div>
                            <p class="card-kicker">最新想法</p>
                        </div>
                        <el-icon class="arrow-icon">
                            <ArrowRight />
                        </el-icon>
                    </div>

                    <div v-if="latestDiary" class="diary-preview">
                        <p class="diary-date">{{ latestDiary.date }}</p>
                        <p class="diary-text">{{ latestDiary.text }}</p>
                    </div>
                    <div v-else class="empty-panel compact">
                        <p>还没有日记，写下一句今天的想法，之后首页就会开始有"你的声音"。</p>
                    </div>
                </article>

                <StatsCard :stats="stats" />
            </div>
        </section>

        <section class="property-distribution-section">
            <PropertyDistributionCard
                @open-property-search="openPropertySearch"
                @open-detail="openDetail"
            />
        </section>

        <TimelineReport @open-timeline-bucket-search="handleTimelineBucketSearch" />
    </div>
</template>

<style scoped>
.dashboard {
    max-width: 1240px;
    margin: 0 auto;
    padding: 2rem;
    color: #1f2937;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 1rem;
    margin-bottom: 1.75rem;
}

.eyebrow,
.card-kicker {
    margin: 0 0 0.45rem;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #98a2b3;
}

.greeting h1 {
    margin: 0;
    font-size: 2.6rem;
    font-weight: 300;
    letter-spacing: -0.04em;
}

.date {
    margin: 0.45rem 0 0;
    font-size: 0.95rem;
    color: #667085;
}

.avatar-circle,
.avatar-img {
    width: 78px;
    height: 78px;
    border-radius: 50%;
    cursor: pointer;
}

.avatar-circle {
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    background: #111827;
    font-size: 0.82rem;
}

.avatar-img {
    object-fit: cover;
    border: 1px solid #e5e7eb;
}

.discovery-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.45fr) minmax(320px, 0.95fr);
    gap: 1.5rem;
    align-items: stretch;
}

.discovery-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    min-height: 100%;
}

.support-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
    margin-top: 1.5rem;
    align-items: start;
}

.support-column {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
}

.property-distribution-section {
    margin-top: 1.5rem;
}

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

.card-top-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
}

.search-card {
    background:
        radial-gradient(circle at top right, rgba(180, 252, 174, 0.42), transparent 24%),
        linear-gradient(180deg, #ffffff 0%, #f7faf8 100%);
}

.actions-card {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.9rem;
}

.action-btn {
    min-height: 156px;
    padding: 1rem;
    border-radius: 18px;
    background: #f8fafc;
    border: 1px solid #eef2f6;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: 0.7rem;
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.2s ease;
}

.action-btn:hover {
    border-color: #d0d5dd;
    transform: translateY(-1px);
}

.action-btn :deep(.el-icon) {
    font-size: 1.4rem;
    color: #111827;
}

.action-btn strong {
    font-size: 1rem;
    color: #111827;
}

.action-btn span {
    font-size: 0.84rem;
    line-height: 1.6;
    color: #667085;
}

.keyword-select {
    width: 120px;
}

.random-visual {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    text-align: left;
    border: none;
    padding: 0;
    background: transparent;
    cursor: pointer;
}

.random-image {
    width: 100%;
    height: 400px;
    object-fit: cover;
    display: block;
    border-radius: 18px;
    background: #eef2f6;
}

.random-skeleton {
    width: 100%;
    height: 400px;
    border-radius: 18px;
}

.random-meta {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.8rem;
}

.random-meta strong {
    font-size: 1rem;
    color: #101828;
}

.random-meta span {
    font-size: 0.82rem;
    color: #667085;
}

.diary-card {
    cursor: pointer;
}

.arrow-icon {
    color: #98a2b3;
    font-size: 1rem;
}

.diary-preview {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
}

.diary-date {
    margin: 0;
    font-size: 0.8rem;
    color: #98a2b3;
    letter-spacing: 0.05em;
    text-transform: uppercase;
}

.diary-text {
    margin: 0;
    line-height: 1.65;
    color: #475467;
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

.refresh-link {
    color: #667085 !important;
}

@media (max-width: 960px) {

    .discovery-grid,
    .support-grid {
        grid-template-columns: 1fr;
    }

    .discovery-column {
        min-height: 0;
    }

    .actions-card {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 768px) {
    .dashboard {
        padding: 1rem;
    }

    .header {
        flex-direction: column;
        align-items: flex-start;
    }

    .greeting h1 {
        font-size: 2.15rem;
    }

    .card {
        border-radius: 18px;
    }

    .card-top {
        flex-direction: column;
    }

    .card-top-actions {
        width: 100%;
        justify-content: space-between;
    }

    .random-meta {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
