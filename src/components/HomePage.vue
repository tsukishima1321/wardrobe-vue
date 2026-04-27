<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import * as echarts from 'echarts';
import {
    ArrowRight,
    CaretTop,
    Minus,
    Notebook,
    Picture,
    Refresh,
    Upload,
} from '@element-plus/icons-vue';
import defaultAvatar from '@/assets/icons/defaultAvatar.jpg';
import SearchBarSimple from './SearchBarSimple.vue';
import { GetBlobImgSrc } from '../api/token';
import {
    generateTips as requestGenerateTips,
    getHomeDiscovery,
    getRandomImageInfo,
    getSearchHints,
    getStatistics,
    getTimelineReport,
    searchDiary,
    type DiaryItem,
    type HomeDiscoveryPicture,
    type HomeDiscoveryReminder,
    type HomeDiscoveryResponse,
    type ImageProperty,
    type ImgInfo,
    type StatResponse,
    type TimelineBucket,
    type TimelineGranularity,
    type TimelineReportResponse,
    type TypeStatistics,
} from '@/api/componentRequests';

type TimelineMatchMode = 'title_keyword_property' | 'title_only';

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
    newMonth: 0,
    newYear: 0,
    types: [] as TypeStatistics[],
});
const latestDiary = ref<DiaryItem | null>(null);
const timelineWord = ref('');
const timelineGranularity = ref<TimelineGranularity>('month');
const timelineTopN = ref(2);
const timelineMatchMode = ref<TimelineMatchMode>('title_keyword_property');
const timelineLoading = ref(false);
const timelineError = ref('');
const timelineReport = ref<TimelineReportResponse | null>(null);
const timelineChartRef = ref<HTMLElement | null>(null);
const selectedTimelinePeriod = ref('');
const timelineDetailExpanded = ref(false);
let timelineChartInstance: echarts.ECharts | null = null;

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

const digestStatCards = computed(() => {
    const digestStats = digestModule.value?.stats;
    if (!digestStats) {
        return [];
    }

    return [
        { label: '照片总数', value: `${digestStats.totalPictures}`, accent: false },
        { label: '本月新图', value: `${digestStats.picturesThisMonth} 张`, accent: digestStats.picturesThisMonth > 0 },
        { label: '本月日记', value: `${digestStats.diariesThisMonth} 篇`, accent: digestStats.diariesThisMonth > 0 },
        {
            label: '距离上次日记',
            value: digestStats.daysSinceLastDiary == null ? '暂无' : `${digestStats.daysSinceLastDiary} 天`,
            accent: false,
        },
        { label: '待补全图片', value: `${digestStats.blankPictures} 张`, accent: digestStats.blankPictures > 0 },
        { label: '未读消息', value: `${digestStats.unreadMessages} 条`, accent: digestStats.unreadMessages > 0 },
    ];
});

const selectedTimelineBucket = computed<TimelineBucket | null>(() => {
    const bucketList = timelineReport.value?.timeline ?? [];
    if (!bucketList.length) {
        return null;
    }
    if (!selectedTimelinePeriod.value) {
        return bucketList[bucketList.length - 1];
    }
    return bucketList.find((item) => item.period === selectedTimelinePeriod.value) ?? bucketList[bucketList.length - 1];
});

const timelineMatchModeLabel = computed(() => (
    timelineMatchMode.value === 'title_only' ? '仅标题匹配' : '全量匹配'
));

const truncateText = (text: string, maxLength = 96): string => {
    if (!text) {
        return '';
    }
    return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text;
};

const parseYmdUtc = (value: string): Date => {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};

const formatYmdUtc = (date: Date): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatPeriod = (date: Date, granularity: TimelineGranularity): string => {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    if (granularity === 'year') return String(year);
    if (granularity === 'month') return `${year}-${month}`;
    return `${year}-${month}-${day}`;
};

const stepDate = (date: Date, granularity: TimelineGranularity): Date => {
    const next = new Date(date.getTime());
    if (granularity === 'year') {
        next.setUTCFullYear(next.getUTCFullYear() + 1, 0, 1);
        return next;
    }
    if (granularity === 'month') {
        next.setUTCMonth(next.getUTCMonth() + 1, 1);
        return next;
    }
    next.setUTCDate(next.getUTCDate() + 1);
    return next;
};

const getBucketBounds = (date: Date, granularity: TimelineGranularity): { startDate: string; endDate: string } => {
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth();

    if (granularity === 'year') {
        return {
            startDate: formatYmdUtc(new Date(Date.UTC(year, 0, 1))),
            endDate: formatYmdUtc(new Date(Date.UTC(year, 11, 31))),
        };
    }

    if (granularity === 'month') {
        return {
            startDate: formatYmdUtc(new Date(Date.UTC(year, month, 1))),
            endDate: formatYmdUtc(new Date(Date.UTC(year, month + 1, 0))),
        };
    }

    const ymd = formatYmdUtc(date);
    return {
        startDate: ymd,
        endDate: ymd,
    };
};

const fillMissingTimelineBuckets = (report: TimelineReportResponse): TimelineReportResponse => {
    const { firstDate, lastDate } = report.summary;
    if (!firstDate || !lastDate) {
        return report;
    }

    const start = parseYmdUtc(firstDate);
    const end = parseYmdUtc(lastDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) {
        return report;
    }

    const existingBucketMap = new Map(report.timeline.map((bucket) => [bucket.period, bucket]));
    const filledTimeline: TimelineBucket[] = [];
    let cursor = new Date(start.getTime());

    while (cursor.getTime() <= end.getTime()) {
        const period = formatPeriod(cursor, report.granularity);
        const existing = existingBucketMap.get(period);

        if (existing) {
            filledTimeline.push(existing);
        } else {
            const bounds = getBucketBounds(cursor, report.granularity);
            filledTimeline.push({
                period,
                startDate: bounds.startDate,
                endDate: bounds.endDate,
                matchedImageCount: 0,
                titleRelations: [],
                keywordRelations: [],
                propertyRelations: [],
                sampleTitles: [],
            });
        }

        cursor = stepDate(cursor, report.granularity);
    }

    return {
        ...report,
        summary: {
            ...report.summary,
            bucketCount: filledTimeline.length,
        },
        timeline: filledTimeline,
    };
};

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

const openPropertySearch = (property: ImageProperty) => {
    openSearchWindow('', {
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

const getReminderClass = (severity?: string): string => {
    if (severity === 'warning') return 'warning';
    if (severity === 'error' || severity === 'danger') return 'danger';
    return 'neutral';
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
    if (!timelineWord.value.trim()) {
        timelineWord.value = res.keywords[0] ?? '春天';
    }
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

const fetchTimeline = async () => {
    const word = timelineWord.value.trim();
    if (!word) {
        timelineError.value = '请输入关键词后再生成时间线报告';
        timelineReport.value = null;
        return;
    }

    timelineLoading.value = true;
    timelineError.value = '';
    try {
        const report = await getTimelineReport({
            word,
            granularity: timelineGranularity.value,
            topN: timelineTopN.value,
            match_mode: timelineMatchMode.value,
        });
        timelineReport.value = fillMissingTimelineBuckets(report);
        selectedTimelinePeriod.value = timelineReport.value.timeline[timelineReport.value.timeline.length - 1]?.period ?? '';
    } catch (error) {
        console.error(error);
        timelineReport.value = null;
        timelineError.value = '时间线报告加载失败，请稍后重试';
    } finally {
        timelineLoading.value = false;
    }
};

const buildTooltipHtml = (bucket: TimelineBucket): string => {
    const titleTop = bucket.titleRelations.slice(0, 2).map((item) => `${item.word}(${item.count})`).join(' / ');
    const keywordTop = bucket.keywordRelations.slice(0, 2).map((item) => `${item.keyword}(${item.count})`).join(' / ');
    const propertyTop = bucket.propertyRelations.slice(0, 2).map((item) => `${item.propertyName}: ${item.value}(${item.count})`).join(' / ');

    return [
        `<div style="font-weight:600;margin-bottom:4px;">${bucket.period}</div>`,
        `<div>匹配图片: ${bucket.matchedImageCount}</div>`,
        `<div>时间范围: ${bucket.startDate} ~ ${bucket.endDate}</div>`,
        `<div>标题共现: ${titleTop || '无'}</div>`,
        `<div>关键词: ${keywordTop || '无'}</div>`,
        `<div>属性: ${propertyTop || '无'}</div>`,
    ].join('');
};

const renderTimelineChart = () => {
    const chartDom = timelineChartRef.value;
    const bucketList = timelineReport.value?.timeline ?? [];

    if (!chartDom || !bucketList.length) {
        if (timelineChartInstance) {
            timelineChartInstance.dispose();
            timelineChartInstance = null;
        }
        return;
    }

    if (!timelineChartInstance) {
        timelineChartInstance = echarts.init(chartDom);
        timelineChartInstance.on('click', (params) => {
            const index = typeof params.dataIndex === 'number' ? params.dataIndex : -1;
            if (index >= 0 && bucketList[index]) {
                selectedTimelinePeriod.value = bucketList[index].period;
                timelineDetailExpanded.value = true;
            }
        });
    }

    const option: echarts.EChartsOption = {
        animationDuration: 400,
        grid: { left: 30, right: 20, top: 30, bottom: 30 },
        tooltip: {
            trigger: 'axis',
            backgroundColor: '#101828',
            borderWidth: 0,
            textStyle: { color: '#f9fafb' },
            formatter: (params) => {
                const first = Array.isArray(params) ? params[0] : params;
                const index = typeof first?.dataIndex === 'number' ? first.dataIndex : -1;
                const bucket = bucketList[index];
                if (!bucket) return '';
                selectedTimelinePeriod.value = bucket.period;
                return buildTooltipHtml(bucket);
            },
        },
        xAxis: {
            type: 'category',
            data: bucketList.map((item) => item.period),
            axisLabel: { color: '#667085' },
            axisLine: { lineStyle: { color: '#d0d5dd' } },
        },
        yAxis: {
            type: 'value',
            minInterval: 1,
            axisLabel: { color: '#667085' },
            splitLine: { lineStyle: { color: '#eaecf0' } },
        },
        series: [
            {
                type: 'line',
                smooth: true,
                showSymbol: true,
                symbolSize: (value: number | number[]): number => {
                    const numericValue = Array.isArray(value) ? Number(value[1] ?? value[0] ?? 0) : Number(value);
                    return numericValue === 0 ? 0 : 8;
                },
                data: bucketList.map((item) => item.matchedImageCount),
                lineStyle: {
                    width: 3,
                    color: '#0ea5e9',
                },
                itemStyle: {
                    color: '#0369a1',
                },
                areaStyle: {
                    color: 'rgba(14,165,233,0.18)',
                },
            },
        ],
    };

    timelineChartInstance.setOption(option);
    timelineChartInstance.resize();
};

const handleTimelineResize = () => {
    timelineChartInstance?.resize();
};

const toggleTimelineMatchMode = async () => {
    timelineMatchMode.value = timelineMatchMode.value === 'title_keyword_property'
        ? 'title_only'
        : 'title_keyword_property';
    await fetchTimeline();
};

const openTimelineBucketSearch = () => {
    const bucket = selectedTimelineBucket.value;
    const searchword = timelineWord.value.trim();
    if (!bucket || !searchword) {
        return;
    }

    openSearchWindow(searchword, {
        dateFrom: bucket.startDate,
        dateTo: bucket.endDate,
    });
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
    const sortedTypes = [...res.types].sort((a, b) => (
        (b.lastMonthAmount - a.lastMonthAmount) * 1000 +
        (b.lastYearAmount - a.lastYearAmount) * 10 +
        (b.totalAmount - a.totalAmount)
    ));

    stats.value = {
        total: res.overall.totalAmount,
        newMonth: res.overall.lastMonthAmount,
        newYear: res.overall.lastYearAmount,
        types: sortedTypes,
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
    navigateTo(`/detail/${src}`);
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
        await fetchTimeline();
    } catch (error) {
        console.error(error);
        router.push('/login');
    }

    window.addEventListener('resize', handleTimelineResize);
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleTimelineResize);
    if (timelineChartInstance) {
        timelineChartInstance.dispose();
        timelineChartInstance = null;
    }
});

watch(
    () => [timelineReport.value, timelineLoading.value],
    async () => {
        await nextTick();
        renderTimelineChart();
    },
    { deep: true },
);
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
                            <el-button link :icon="Refresh" class="refresh-link" @click="fetchDiscovery" />
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
                        <button type="button" class="hero-media" @click="openHeroMemory">
                            <img v-if="heroPrimaryVisual" :src="heroPrimaryVisual.blobSrc" class="hero-image" alt="" />
                            <div class="hero-surface"></div>
                            <div class="hero-media-meta">
                                <span class="hero-date">{{ heroPrimaryVisual?.date || heroDiary?.date ||
                                    discoveryData?.generatedAt }}</span>
                                <strong>{{ heroPrimaryVisual?.title || '打开这段回忆' }}</strong>
                            </div>
                        </button>

                        <div v-if="heroSecondaryVisuals.length" class="hero-gallery">
                            <button v-for="item in heroSecondaryVisuals" :key="`hero-${item.src}`" type="button"
                                class="hero-gallery-item" @click="openDetail(item.src)">
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
                            @click="openDiaryEntry(heroDiary)">
                            <span class="snippet-label">日记回声</span>
                            <p>{{ truncateText(heroDiary.preview || heroDiary.text, 80) }}</p>
                        </button>

                        <div v-if="heroPicture" class="chip-row">
                            <button v-for="keyword in heroPicture.keywords.slice(0, 4)" :key="`hero-keyword-${keyword}`"
                                type="button" class="chip-button" @click.stop="openKeywordSearch(keyword)">
                                #{{ keyword }}
                            </button>
                            <button v-for="property in heroPicture.properties.slice(0, 2)"
                                :key="`hero-property-${property.name}-${property.value}`" type="button"
                                class="chip-button subtle" @click.stop="openPropertySearch(property)">
                                {{ property.name }} · {{ property.value }}
                            </button>
                        </div>
                    </template>

                    <div v-else class="empty-panel">
                        <p>{{ discoveryError || '今天还没有命中“那年今日”，不如先去补一张新图，或者换个入口随便逛逛。' }}</p>
                        <div class="empty-actions">
                            <el-button type="primary" @click="navigateTo('/upload')">去上传</el-button>
                            <el-button plain @click="navigateTo('/search')">去探索</el-button>
                        </div>
                    </div>
                </article>

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
                <article class="card remix-card">
                    <div class="card-top">
                        <div>
                            <p class="card-kicker">记忆重组</p>
                            <h3>{{ remixModule?.title || '记忆重组' }}</h3>
                            <p class="card-subtitle">
                                {{ remixModule?.subtitle || '把不同时间里反复出现的主题，拼成一条更有趣的线索。' }}
                            </p>
                        </div>
                        <el-button v-if="remixModule && !remixModule.empty" link class="theme-link"
                            @click="openThemeSearch">
                            {{ remixModule.theme.label }} →
                        </el-button>
                    </div>

                    <div v-if="discoveryLoading" class="card-fill">
                        <el-skeleton :rows="6" animated />
                    </div>

                    <template v-else-if="remixModule && !remixModule.empty">
                        <button v-if="remixAnchorVisual" type="button" class="remix-anchor"
                            @click="openDetail(remixAnchorVisual.src)">
                            <img :src="remixAnchorVisual.blobSrc" class="remix-anchor-image" alt="" />
                            <div class="remix-anchor-copy">
                                <span>{{ remixAnchorVisual.date }}</span>
                                <strong>{{ remixAnchorVisual.title || '查看锚点记忆' }}</strong>
                            </div>
                        </button>

                        <div v-if="remixRelatedVisuals.length" class="remix-collage">
                            <button v-for="item in remixRelatedVisuals" :key="`remix-${item.src}`" type="button"
                                class="remix-thumb" @click="openDetail(item.src)">
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
                                type="button" class="remix-note-btn" @click="openDiaryEntry(diary)">
                                {{ truncateText(diary.preview || diary.text, 58) }}
                            </button>
                        </div>
                    </template>

                    <div v-else class="empty-panel compact">
                        <p>今天的重组线索还没拼出来，稍后刷新也许会有新的锚点。</p>
                    </div>
                </article>

                <article class="card digest-card">
                    <div class="card-top">
                        <div>
                            <p class="card-kicker">最近的你</p>
                        </div>
                    </div>

                    <div v-if="discoveryLoading" class="card-fill">
                        <el-skeleton :rows="6" animated />
                    </div>

                    <template v-else-if="digestModule">
                        <div class="digest-stats">
                            <div v-for="item in digestStatCards" :key="item.label" class="digest-stat"
                                :class="{ accent: item.accent }">
                                <span>{{ item.label }}</span>
                                <strong>{{ item.value }}</strong>
                            </div>
                        </div>

                        <div v-if="digestModule.topKeywords.length" class="digest-section">
                            <p class="section-label">最近常出现</p>
                            <div class="chip-row">
                                <button v-for="item in digestModule.topKeywords.slice(0, 5)"
                                    :key="`digest-keyword-${item.keyword}`" type="button" class="chip-button"
                                    @click="openKeywordSearch(item.keyword)">
                                    #{{ item.keyword }} · {{ item.count }}
                                </button>
                            </div>
                        </div>

                        <div v-if="digestModule.highlights.length" class="digest-section">
                            <p class="section-label">简短摘要</p>
                            <ul class="digest-list">
                                <li v-for="(item, index) in digestModule.highlights.slice(0, 3)"
                                    :key="`highlight-${index}`">
                                    {{ item }}
                                </li>
                            </ul>
                        </div>

                        <div v-if="digestModule.reminders.length" class="digest-section">
                            <p class="section-label">提醒</p>
                            <div class="reminder-list">
                                <button v-for="(item, index) in digestModule.reminders" :key="`reminder-${index}`"
                                    type="button" class="reminder-chip" :class="getReminderClass(item.severity)"
                                    @click="openReminderLink(item)">
                                    {{ item.text }}
                                </button>
                            </div>
                        </div>

                        <p v-if="digestModule.stats.lastBackupAt" class="digest-footer">
                            上次备份: {{ digestModule.stats.lastBackupAt }}
                        </p>
                    </template>

                    <div v-else class="empty-panel compact">
                        <p>摘要区暂时不可用，但下面的搜索、统计和时间线仍然可以继续使用。</p>
                    </div>
                </article>
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
                    <SearchBarSimple @updateValue="search" />
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
                        <p class="diary-text">{{ truncateText(latestDiary.text, 180) }}</p>
                    </div>
                    <div v-else class="empty-panel compact">
                        <p>还没有日记，写下一句今天的想法，之后首页就会开始有“你的声音”。</p>
                    </div>
                </article>

                <article class="card stats-card">
                    <div class="card-top">
                        <div>
                            <p class="card-kicker">全量概览</p>
                            <h3>图库统计</h3>
                        </div>
                    </div>

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

                    <div class="stats-list-container">
                        <div class="stats-list-header">
                            <span>Keyword</span>
                            <span style="text-align: right;">Total</span>
                            <span style="text-align: right;">Month</span>
                            <span style="text-align: right;">Year</span>
                        </div>
                        <el-scrollbar height="250px">
                            <div v-for="type in stats.types" :key="type.type" class="stats-row">
                                <span class="type-name">{{ type.type }}</span>
                                <span class="type-val">{{ type.totalAmount }}</span>
                                <span class="type-val highlight">
                                    {{ type.lastMonthAmount }}
                                    <el-icon v-if="type.lastMonthAmount > 0" class="trend-icon-up">
                                        <CaretTop />
                                    </el-icon>
                                    <el-icon v-else class="trend-icon-flat">
                                        <Minus />
                                    </el-icon>
                                </span>
                                <span class="type-val highlight">
                                    {{ type.lastYearAmount }}
                                    <el-icon v-if="type.lastYearAmount > 0" class="trend-icon-up">
                                        <CaretTop />
                                    </el-icon>
                                    <el-icon v-else class="trend-icon-flat">
                                        <Minus />
                                    </el-icon>
                                </span>
                            </div>
                        </el-scrollbar>
                    </div>
                </article>
            </div>
        </section>

        <section class="timeline-panel">
            <div class="timeline-panel-header">
                <div>
                    <p class="card-kicker">继续下滑</p>
                    <h3>时间线报告</h3>
                    <p>信息更密一点的探索工具放在这里，适合带着一个词往下深挖。</p>
                </div>
                <div class="timeline-controls">
                    <el-input v-model="timelineWord" placeholder="关键词" clearable class="timeline-word-input"
                        @keyup.enter="fetchTimeline" />
                    <el-select v-model="timelineGranularity" class="timeline-granularity"
                        aria-label="timeline granularity">
                        <el-option label="按天" value="day" />
                        <el-option label="按月" value="month" />
                        <el-option label="按年" value="year" />
                    </el-select>
                    <el-button plain class="timeline-mode-btn" :loading="timelineLoading"
                        @click="toggleTimelineMatchMode">
                        {{ timelineMatchModeLabel }}
                    </el-button>
                    <el-input-number v-model="timelineTopN" :min="1" :max="20" class="timeline-topn" />
                    <el-button type="primary" :loading="timelineLoading" @click="fetchTimeline">生成</el-button>
                </div>
            </div>

            <div v-if="timelineError" class="timeline-state timeline-error">
                {{ timelineError }}
            </div>

            <div v-else-if="timelineLoading" class="timeline-state">
                <el-skeleton :rows="5" animated />
            </div>

            <div v-else-if="timelineReport" class="timeline-content">
                <div class="timeline-summary-grid">
                    <div class="summary-item">
                        <span class="summary-label">Matched Images</span>
                        <strong>{{ timelineReport.summary.matchedImageCount }}</strong>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Buckets</span>
                        <strong>{{ timelineReport.summary.bucketCount }}</strong>
                    </div>
                    <div class="summary-item">
                        <span class="summary-label">Date Range</span>
                        <strong>{{ timelineReport.summary.firstDate || '-' }} ~ {{ timelineReport.summary.lastDate ||
                            '-'
                            }}</strong>
                    </div>
                </div>

                <div class="timeline-chart-container">
                    <div ref="timelineChartRef" class="timeline-chart"></div>
                    <p class="timeline-chart-tip">悬停查看简要关系，点击节点后展开明细。</p>
                </div>

                <div class="timeline-detail-head">
                    <span v-if="selectedTimelineBucket">当前节点: {{ selectedTimelineBucket.period }}</span>
                    <el-button text @click="timelineDetailExpanded = !timelineDetailExpanded">
                        {{ timelineDetailExpanded ? '收起明细' : '展开明细' }}
                    </el-button>
                </div>

                <el-collapse-transition>
                    <div v-if="timelineDetailExpanded && selectedTimelineBucket" class="timeline-detail-panel">
                        <div class="timeline-detail-meta">
                            <span>{{ selectedTimelineBucket.startDate }} ~ {{ selectedTimelineBucket.endDate }}</span>
                            <strong>{{ selectedTimelineBucket.matchedImageCount }} 张</strong>
                        </div>

                        <div class="timeline-detail-actions">
                            <el-button type="primary" plain size="small" @click="openTimelineBucketSearch">
                                搜索结果
                            </el-button>
                        </div>

                        <div class="timeline-detail-relations">
                            <el-tag v-for="item in selectedTimelineBucket.titleRelations"
                                :key="`bucket-title-${selectedTimelineBucket.period}-${item.word}`" effect="light"
                                size="small">
                                标题: {{ item.word }} ({{ item.count }})
                            </el-tag>
                            <el-tag v-for="item in selectedTimelineBucket.keywordRelations"
                                :key="`bucket-keyword-${selectedTimelineBucket.period}-${item.keyword}`" type="success"
                                effect="light" size="small">
                                关键词: {{ item.keyword }} ({{ item.count }})
                            </el-tag>
                            <el-tag v-for="item in selectedTimelineBucket.propertyRelations"
                                :key="`bucket-property-${selectedTimelineBucket.period}-${item.propertyName}-${item.value}`"
                                type="warning" effect="light" size="small">
                                属性: {{ item.propertyName }}={{ item.value }} ({{ item.count }})
                            </el-tag>
                        </div>

                        <ul v-if="selectedTimelineBucket.sampleTitles.length" class="timeline-samples">
                            <li v-for="(title, index) in selectedTimelineBucket.sampleTitles"
                                :key="`sample-${selectedTimelineBucket.period}-${index}`">
                                {{ title }}
                            </li>
                        </ul>
                    </div>
                </el-collapse-transition>
            </div>

            <div v-else class="timeline-state">
                暂无时间线数据
            </div>
        </section>
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

.card h3 {
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

.refresh-link {
    color: #667085 !important;
}

.refresh-link.dark {
    color: #ffffff !important;
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

.hero-skeleton,
.random-skeleton {
    width: 100%;
    height: 400px;
    border-radius: 18px;
}

.card-fill {
    flex: 1;
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

.empty-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
}

.remix-card,
.digest-card,
.search-card,
.random-card,
.diary-card,
.stats-card {
    min-height: 0;
}

.digest-card {
    flex: 1 1 auto;
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

.remix-note-btn,
.remix-notes p,
.digest-list li,
.diary-text {
    margin: 0;
    line-height: 1.65;
    color: #475467;
}

.remix-note-btn {
    border: 1px solid #eef2f6;
    border-radius: 14px;
    background: #f8fafc;
    padding: 0.75rem 0.85rem;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s ease, background 0.2s ease;
}

.remix-note-btn:hover,
.diary-snippet-btn:hover {
    border-color: #d0d5dd;
    background: #eef2f6;
}

.remix-note-btn:hover {
    background: #f1f5f9;
    border-color: #d0d5dd;
}

.digest-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.75rem;
}

.digest-stat {
    padding: 0.9rem 0.95rem;
    border-radius: 16px;
    background: #f8fafc;
    border: 1px solid #eef2f6;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.digest-stat span {
    font-size: 0.75rem;
    color: #667085;
}

.digest-stat strong {
    font-size: 1rem;
    color: #101828;
}

.digest-stat.accent {
    background: #fff8eb;
    border-color: #f5d18f;
}

.digest-section {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}

.section-label {
    margin: 0;
    font-size: 0.78rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #98a2b3;
}

.digest-list {
    margin: 0;
    padding-left: 1rem;
}

.reminder-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
}

.reminder-chip {
    border: none;
    border-radius: 999px;
    padding: 0.48rem 0.86rem;
    font-size: 0.82rem;
    cursor: pointer;
}

.reminder-chip.neutral {
    background: #eef2ff;
    color: #4338ca;
}

.reminder-chip.warning {
    background: #fff7ed;
    color: #c2410c;
}

.reminder-chip.danger {
    background: #fef2f2;
    color: #b42318;
}

.digest-footer {
    margin: 0;
    font-size: 0.82rem;
    color: #667085;
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
}

.random-image {
    width: 100%;
    height: 400px;
    object-fit: cover;
    display: block;
    border-radius: 18px;
    background: #eef2f6;
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

.stats-overview {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
}

.stat-box {
    padding: 0.85rem;
    border-radius: 16px;
    background: #f8fafc;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
}

.stat-label {
    font-size: 0.72rem;
    color: #98a2b3;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.stat-value {
    font-size: 1.35rem;
    font-weight: 600;
    color: #111827;
}

.stat-value.highlight {
    display: inline-flex;
    align-items: center;
    gap: 0.15rem;
}

.trend-icon-up {
    color: var(--el-color-success);
}

.trend-icon-flat {
    color: var(--el-color-warning);
}

.stat-divider {
    height: 1px;
    background: #eaecf0;
}

.stats-list-container {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
}

.stats-list-header,
.stats-row {
    display: grid;
    grid-template-columns: 2fr repeat(3, minmax(54px, 1fr));
    gap: 0.7rem;
    align-items: center;
}

.stats-list-header {
    font-size: 0.74rem;
    color: #98a2b3;
    text-transform: uppercase;
    letter-spacing: 0.08em;
}

.stats-row {
    padding: 0.6rem 0;
    border-bottom: 1px dashed #eef2f6;
    font-size: 0.9rem;
}

.type-name {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: #344054;
    font-weight: 500;
}

.type-val {
    text-align: right;
    color: #667085;
}

.type-val.highlight {
    display: inline-flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.15rem;
    color: #111827;
}

.timeline-panel {
    margin-top: 2rem;
    border: 1px solid #dde3ea;
    border-radius: 24px;
    background: linear-gradient(180deg, #f8f9fb 0%, #ffffff 100%);
    padding: 1.5rem;
    box-shadow: 0 18px 40px rgba(15, 23, 42, 0.05);
}

.timeline-panel-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
}

.timeline-panel-header h3 {
    margin: 0;
    font-size: 1.2rem;
    color: #101828;
}

.timeline-panel-header p:last-child {
    margin: 0.35rem 0 0;
    color: #667085;
    line-height: 1.6;
    font-size: 0.92rem;
}

.timeline-controls {
    display: grid;
    grid-template-columns: minmax(180px, 240px) 100px 120px 96px 90px;
    gap: 0.6rem;
    align-items: center;
}

.timeline-word-input {
    min-width: 180px;
}

.timeline-granularity,
.timeline-topn,
.timeline-mode-btn {
    width: 100%;
}

.timeline-state {
    padding: 1rem;
    border-radius: 14px;
    background: #fff;
    border: 1px dashed #d0d5dd;
    color: #475467;
}

.timeline-error {
    background: #fff6f5;
    border-color: #fda29b;
    color: #b42318;
}

.timeline-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.timeline-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.8rem;
}

.summary-item {
    padding: 0.95rem;
    border-radius: 14px;
    background: #ffffff;
    border: 1px solid #eceff3;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
}

.summary-label {
    color: #667085;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.summary-item strong {
    color: #101828;
    font-size: 1.08rem;
}

.timeline-chart-container {
    background: #fff;
    border: 1px solid #eaecf0;
    border-radius: 16px;
    padding: 0.5rem 0.5rem 0.25rem;
}

.timeline-chart {
    width: 100%;
    height: 280px;
}

.timeline-chart-tip {
    margin: 0.3rem 0 0.25rem;
    color: #667085;
    font-size: 0.82rem;
    text-align: right;
}

.timeline-detail-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #344054;
    font-size: 0.9rem;
}

.timeline-detail-panel {
    border: 1px solid #eaecf0;
    border-radius: 16px;
    padding: 0.9rem;
    background: #fff;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
}

.timeline-detail-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: #475467;
    font-size: 0.82rem;
}

.timeline-detail-meta strong {
    color: #111827;
    font-size: 1rem;
}

.timeline-detail-actions {
    display: flex;
    justify-content: flex-end;
}

.timeline-detail-relations {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
}

.timeline-detail-relations :deep(.el-tag) {
    transition: none !important;
    animation: none !important;
}

.timeline-samples {
    margin: 0;
    padding-left: 1rem;
    color: #344054;
    line-height: 1.5;
    font-size: 0.85rem;
}

@media (max-width: 960px) {

    .discovery-grid,
    .support-grid {
        grid-template-columns: 1fr;
    }

    .discovery-column {
        min-height: 0;
    }

    .hero-card {
        min-height: 0;
    }

    .actions-card {
        grid-template-columns: 1fr;
    }

    .timeline-panel-header {
        flex-direction: column;
    }

    .timeline-controls {
        width: 100%;
        grid-template-columns: 1fr 1fr;
    }

    .timeline-summary-grid,
    .hero-metrics,
    .digest-stats,
    .stats-overview {
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

    .card,
    .timeline-panel {
        border-radius: 18px;
    }

    .card-top {
        flex-direction: column;
    }

    .card-top-actions {
        width: 100%;
        justify-content: space-between;
    }

    .timeline-controls {
        grid-template-columns: 1fr;
    }

    .timeline-chart {
        height: 240px;
    }

    .timeline-detail-head,
    .timeline-detail-meta,
    .random-meta,
    .remix-meta-row {
        flex-direction: column;
        align-items: flex-start;
    }

    .remix-collage {
        grid-template-columns: 1fr 1fr;
    }
}
</style>
