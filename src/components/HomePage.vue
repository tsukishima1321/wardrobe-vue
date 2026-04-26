<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { GetBlobImgSrc } from '../api/token';
import {
    generateTips as requestGenerateTips,
    getRandomImageInfo,
    getSearchHints,
    getStatistics,
    searchDiary,
    getTimelineReport,
    type TimelineGranularity,
    type TimelineBucket,
    type TimelineReportResponse,
} from '@/api/componentRequests';
import SearchBarSimple from './SearchBarSimple.vue';
import {
    Picture,
    Notebook,
    Upload,
    ArrowRight,
    Refresh,
    CaretTop,
    Minus,
} from '@element-plus/icons-vue';
import defaultAvatar from '@/assets/icons/defaultAvatar.jpg';
import * as echarts from 'echarts';

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
type TimelineMatchMode = 'title_keyword_property' | 'title_only';

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
const timelineWord = ref('');
const timelineGranularity = ref<TimelineGranularity>('month');
const timelineTopN = ref(2);
const timelineMatchMode = ref<TimelineMatchMode>('title_keyword_property');
const timelineLoading = ref(false);
const timelineError = ref('');
const timelineReport = ref<TimelineReportResponse | null>(null);
const timelineChartRef = ref<HTMLElement | null>(null);
let timelineChartInstance: echarts.ECharts | null = null;
const selectedTimelinePeriod = ref('');
const timelineDetailExpanded = ref(false);

const selectedTimelineBucket = computed<TimelineBucket | null>(() => {
    const bucketList = timelineReport.value?.timeline ?? [];
    if (!bucketList.length) return null;
    if (!selectedTimelinePeriod.value) return bucketList[bucketList.length - 1];
    return bucketList.find((item) => item.period === selectedTimelinePeriod.value) ?? bucketList[bucketList.length - 1];
});

const timelineMatchModeLabel = computed(() => {
    return timelineMatchMode.value === 'title_only' ? '仅标题匹配' : '全量匹配';
});

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
    const res = await getSearchHints();
    keywords.value = res.keywords;
    if (!timelineWord.value.trim()) {
        timelineWord.value = res.keywords[0] ?? '春天';
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
        `<div style=\"font-weight:600;margin-bottom:4px;\">${bucket.period}</div>`,
        `<div>匹配图片: ${bucket.matchedImageCount}</div>`,
        `<div>时间范围: ${bucket.startDate} ~ ${bucket.endDate}</div>`,
        `<div>标题共现: ${titleTop || '无'}</div>`,
        `<div>关键词: ${keywordTop || '无'}</div>`,
        `<div>属性: ${propertyTop || '无'}</div>`
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

    const target = router.resolve({
        name: 'search',
        params: { searchword },
        query: {
            dateFrom: bucket.startDate,
            dateTo: bucket.endDate,
        },
    });
    window.open(target.href, '_blank');
};

const fetchRandomImage = async () => {
    loadingImg.value = true;
    try {
        // Using existing API
        const keyword = selectedKeyword.value && selectedKeyword.value !== '不限'
            ? selectedKeyword.value
            : undefined;

        const res = await getRandomImageInfo(keyword) as ImgInfo;
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
    const res = await getStatistics() as StatResponse;
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
    const res = await searchDiary({
        page: 1, pageSize: 1, orderBy: 'date', order: 'desc'
    }) as any;
    if (res.textList && res.textList.length > 0) {
        latestDiary.value = res.textList[0];
    }
};

const navigateTo = (path: string) => router.push(path);

onMounted(async () => {
    try {
        requestGenerateTips().catch(() => { router.push('/login'); });
        updateTime();
        await fetchKeywords();
        fetchRandomImage();
        fetchStats();
        fetchLatestDiary();
        fetchTimeline();
    }
    catch (e) {
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
    { deep: true }
);

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

        <section class="timeline-panel">
            <div class="timeline-panel-header">
                <div>
                    <h3>Timeline Report</h3>
                    <p>Track how a word evolves across your memories.</p>
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

            <div v-else-if="timelineLoading" class="timeline-state timeline-loading">
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
                    <p class="timeline-chart-tip">悬停查看简要关系，点击节点并展开可查看详细信息。</p>
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
                            <li v-for="(title, idx) in selectedTimelineBucket.sampleTitles"
                                :key="`sample-${selectedTimelineBucket.period}-${idx}`">
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

.timeline-panel {
    margin-top: 2rem;
    border: 1px solid #ddd;
    border-radius: 14px;
    background: linear-gradient(180deg, #f8f9fb 0%, #ffffff 100%);
    padding: 1.5rem;
    box-shadow: 0 12px 30px rgba(18, 24, 40, 0.06);
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
    font-size: 1.15rem;
}

.timeline-panel-header p {
    margin: 0.25rem 0 0;
    color: #667085;
    font-size: 0.9rem;
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
.timeline-topn {
    width: 100%;
}

.timeline-mode-btn {
    width: 100%;
}

.timeline-state {
    padding: 1rem;
    border-radius: 10px;
    background: #fff;
    border: 1px dashed #d0d5dd;
    color: #475467;
}

.timeline-error {
    border-color: #fda29b;
    background: #fff6f5;
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
    padding: 0.9rem;
    border-radius: 10px;
    background: #ffffff;
    border: 1px solid #eceff3;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
}

.summary-label {
    color: #667085;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
}

.summary-item strong {
    color: #101828;
    font-size: 1.1rem;
}

.timeline-chart-container {
    background: #fff;
    border: 1px solid #eaecf0;
    border-radius: 12px;
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
    border-radius: 12px;
    padding: 0.85rem;
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
    line-height: 1.4;
    font-size: 0.85rem;
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

    .timeline-panel {
        margin-top: 1.25rem;
        padding: 1rem;
    }

    .timeline-panel-header {
        flex-direction: column;
    }

    .timeline-controls {
        width: 100%;
        grid-template-columns: 1fr 1fr;
    }

    .timeline-summary-grid {
        grid-template-columns: 1fr;
    }

    .timeline-chart {
        height: 240px;
    }

    .timeline-detail-head {
        flex-wrap: wrap;
        gap: 0.4rem;
    }
}
</style>