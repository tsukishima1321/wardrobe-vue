<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { getTimelineReport, getSearchHints } from '@/api/componentRequests'
import type { TimelineBucket, TimelineGranularity, TimelineReportResponse } from '@/api/componentRequests'

type TimelineMatchMode = 'title_keyword_property' | 'title_only'

const emit = defineEmits<{
    'open-timeline-bucket-search': [bucket: { period: string; startDate: string; endDate: string; searchWord: string }]
}>()

const timelineChartRef = ref<HTMLElement | null>(null)
let timelineChartInstance: echarts.ECharts | null = null

const timelineWord = ref('春天')
const timelineGranularity = ref<TimelineGranularity>('month')
const timelineTopN = ref(2)
const timelineMatchMode = ref<TimelineMatchMode>('title_keyword_property')
const timelineLoading = ref(false)
const timelineError = ref('')
const timelineReport = ref<TimelineReportResponse | null>(null)
const selectedTimelinePeriod = ref('')
const timelineDetailExpanded = ref(false)

const timelineMatchModeLabel = computed(() => (
    timelineMatchMode.value === 'title_only' ? '仅标题匹配' : '全量匹配'
))

const selectedTimelineBucket = computed<TimelineBucket | null>(() => {
    const bucketList = timelineReport.value?.timeline ?? []
    if (!bucketList.length) return null
    if (!selectedTimelinePeriod.value) return bucketList[bucketList.length - 1]
    return bucketList.find((item) => item.period === selectedTimelinePeriod.value) ?? bucketList[bucketList.length - 1]
})

const parseYmdUtc = (value: string): Date => {
    const [year, month, day] = value.split('-').map(Number)
    return new Date(Date.UTC(year, month - 1, day))
}

const formatYmdUtc = (date: Date): string => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

const formatPeriod = (date: Date, granularity: TimelineGranularity): string => {
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    if (granularity === 'year') return String(year)
    if (granularity === 'month') return `${year}-${month}`
    return `${year}-${month}-${day}`
}

const stepDate = (date: Date, granularity: TimelineGranularity): Date => {
    const next = new Date(date.getTime())
    if (granularity === 'year') {
        next.setUTCFullYear(next.getUTCFullYear() + 1, 0, 1)
        return next
    }
    if (granularity === 'month') {
        next.setUTCMonth(next.getUTCMonth() + 1, 1)
        return next
    }
    next.setUTCDate(next.getUTCDate() + 1)
    return next
}

const getBucketBounds = (date: Date, granularity: TimelineGranularity): { startDate: string; endDate: string } => {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()

    if (granularity === 'year') {
        return {
            startDate: formatYmdUtc(new Date(Date.UTC(year, 0, 1))),
            endDate: formatYmdUtc(new Date(Date.UTC(year, 11, 31))),
        }
    }

    if (granularity === 'month') {
        return {
            startDate: formatYmdUtc(new Date(Date.UTC(year, month, 1))),
            endDate: formatYmdUtc(new Date(Date.UTC(year, month + 1, 0))),
        }
    }

    const ymd = formatYmdUtc(date)
    return { startDate: ymd, endDate: ymd }
}

const fillMissingTimelineBuckets = (report: TimelineReportResponse): TimelineReportResponse => {
    const { firstDate, lastDate } = report.summary
    if (!firstDate || !lastDate) return report

    const start = parseYmdUtc(firstDate)
    const end = parseYmdUtc(lastDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.getTime() > end.getTime()) return report

    const existingBucketMap = new Map(report.timeline.map((bucket) => [bucket.period, bucket]))
    const filledTimeline: TimelineBucket[] = []
    let cursor = new Date(start.getTime())

    while (cursor.getTime() <= end.getTime()) {
        const period = formatPeriod(cursor, report.granularity)
        const existing = existingBucketMap.get(period)

        if (existing) {
            filledTimeline.push(existing)
        } else {
            const bounds = getBucketBounds(cursor, report.granularity)
            filledTimeline.push({
                period,
                startDate: bounds.startDate,
                endDate: bounds.endDate,
                matchedImageCount: 0,
                titleRelations: [],
                keywordRelations: [],
                propertyRelations: [],
                sampleTitles: [],
            })
        }

        cursor = stepDate(cursor, report.granularity)
    }

    return {
        ...report,
        summary: {
            ...report.summary,
            bucketCount: filledTimeline.length,
        },
        timeline: filledTimeline,
    }
}

const buildTooltipHtml = (bucket: TimelineBucket): string => {
    const titleTop = bucket.titleRelations.slice(0, 2).map((item) => `${item.word}(${item.count})`).join(' / ')
    const keywordTop = bucket.keywordRelations.slice(0, 2).map((item) => `${item.keyword}(${item.count})`).join(' / ')
    const propertyTop = bucket.propertyRelations.slice(0, 2).map((item) => `${item.propertyName}: ${item.value}(${item.count})`).join(' / ')

    return [
        `<div style="font-weight:600;margin-bottom:4px;">${bucket.period}</div>`,
        `<div>匹配图片: ${bucket.matchedImageCount}</div>`,
        `<div>时间范围: ${bucket.startDate} ~ ${bucket.endDate}</div>`,
        `<div>标题共现: ${titleTop || '无'}</div>`,
        `<div>关键词: ${keywordTop || '无'}</div>`,
        `<div>属性: ${propertyTop || '无'}</div>`,
    ].join('')
}

const fetchTimeline = async () => {
    const word = timelineWord.value.trim()
    if (!word) {
        timelineError.value = '请输入关键词后再生成时间线报告'
        timelineReport.value = null
        return
    }

    timelineLoading.value = true
    timelineError.value = ''
    try {
        const report = await getTimelineReport({
            word,
            granularity: timelineGranularity.value,
            topN: timelineTopN.value,
            match_mode: timelineMatchMode.value,
        })
        timelineReport.value = fillMissingTimelineBuckets(report)
        selectedTimelinePeriod.value = timelineReport.value.timeline[timelineReport.value.timeline.length - 1]?.period ?? ''
    } catch (error) {
        console.error(error)
        timelineReport.value = null
        timelineError.value = '时间线报告加载失败，请稍后重试'
    } finally {
        timelineLoading.value = false
    }
}

const renderTimelineChart = () => {
    const chartDom = timelineChartRef.value
    const bucketList = timelineReport.value?.timeline ?? []

    if (!chartDom || !bucketList.length) {
        if (timelineChartInstance) {
            timelineChartInstance.dispose()
            timelineChartInstance = null
        }
        return
    }

    if (!timelineChartInstance) {
        timelineChartInstance = echarts.init(chartDom)
        timelineChartInstance.on('click', (params) => {
            const index = typeof params.dataIndex === 'number' ? params.dataIndex : -1
            if (index >= 0 && bucketList[index]) {
                selectedTimelinePeriod.value = bucketList[index].period
                timelineDetailExpanded.value = true
            }
        })
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
                const first = Array.isArray(params) ? params[0] : params
                const index = typeof first?.dataIndex === 'number' ? first.dataIndex : -1
                const bucket = bucketList[index]
                if (!bucket) return ''
                selectedTimelinePeriod.value = bucket.period
                return buildTooltipHtml(bucket)
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
                    const numericValue = Array.isArray(value) ? Number(value[1] ?? value[0] ?? 0) : Number(value)
                    return numericValue === 0 ? 0 : 8
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
    }

    timelineChartInstance.setOption(option)
    timelineChartInstance.resize()
}

const handleTimelineResize = () => {
    timelineChartInstance?.resize()
}

const toggleTimelineMatchMode = async () => {
    timelineMatchMode.value = timelineMatchMode.value === 'title_keyword_property'
        ? 'title_only'
        : 'title_keyword_property'
    await fetchTimeline()
}

onMounted(() => {
    window.addEventListener('resize', handleTimelineResize)
    const searchHints = getSearchHints()
    searchHints.then((hints) => {
        if (hints.keywords.length) {
            timelineWord.value = hints.keywords[Math.floor(Math.random() * hints.keywords.length / 2)]
            fetchTimeline()
        }
    })
})

onBeforeUnmount(() => {
    window.removeEventListener('resize', handleTimelineResize)
    if (timelineChartInstance) {
        timelineChartInstance.dispose()
        timelineChartInstance = null
    }
})

watch(
    () => [timelineReport.value, timelineLoading.value],
    async () => {
        await nextTick()
        renderTimelineChart()
    },
    { deep: true },
)
</script>

<template>
    <div class="timeline-panel">
        <div class="timeline-panel-header">
            <div>
                <p class="card-kicker">继续下滑</p>
                <h3>时间线报告</h3>
                <p>信息更密一点的探索工具放在这里，适合带着一个词往下深挖。</p>
            </div>
            <div class="timeline-controls">
                <el-input v-model="timelineWord" placeholder="关键词" clearable class="timeline-word-input"
                    @keyup.enter="fetchTimeline" />
                <el-select v-model="timelineGranularity" class="timeline-granularity" aria-label="timeline granularity">
                    <el-option label="按天" value="day" />
                    <el-option label="按月" value="month" />
                    <el-option label="按年" value="year" />
                </el-select>
                <el-button plain class="timeline-mode-btn" :loading="timelineLoading" @click="toggleTimelineMatchMode">
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
                    <strong>{{ timelineReport.summary.firstDate || '-' }} ~ {{ timelineReport.summary.lastDate || '-'
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
                        <el-button type="primary" plain size="small"
                            @click="emit('open-timeline-bucket-search', { period: selectedTimelineBucket.period, startDate: selectedTimelineBucket.startDate, endDate: selectedTimelineBucket.endDate, searchWord: timelineWord.trim() })">
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
    </div>
</template>

<style scoped>
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

.card-kicker {
    margin: 0 0 0.45rem;
    font-size: 0.72rem;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #98a2b3;
}

@media (max-width: 960px) {
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
}

@media (max-width: 768px) {
    .timeline-panel {
        border-radius: 18px;
    }

    .timeline-controls {
        grid-template-columns: 1fr;
    }

    .timeline-chart {
        height: 240px;
    }

    .timeline-detail-head,
    .timeline-detail-meta {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
