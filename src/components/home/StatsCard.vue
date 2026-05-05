<script setup lang="ts">
import { computed, ref } from 'vue'
import { CaretTop, Minus } from '@element-plus/icons-vue'
import type { TypeStatistics } from '@/api/componentRequests'

type StatsViewMode = 'compact' | 'expanded' | 'both'

interface StatsCardTypeRow {
    type: string
    compact: TypeStatistics
    expanded: TypeStatistics
}

const props = defineProps<{
    stats: {
        total: number
        totalExpanded: number
        newMonth: number
        newMonthExpanded: number
        newYear: number
        newYearExpanded: number
        types: TypeStatistics[]
        typesExpanded: TypeStatistics[]
    }
}>()

const modeOrder: StatsViewMode[] = ['compact', 'expanded', 'both']
const mode = ref<StatsViewMode>('compact')

const modeLabel = computed(() => {
    if (mode.value === 'compact') return '默认统计'
    if (mode.value === 'expanded') return '扩展统计'
    return '全部显示'
})

const nextMode = () => {
    const currentIndex = modeOrder.indexOf(mode.value)
    mode.value = modeOrder[(currentIndex + 1) % modeOrder.length]
}

const normalizeType = (type?: TypeStatistics): TypeStatistics => ({
    type: type?.type ?? '',
    totalAmount: type?.totalAmount ?? 0,
    lastYearAmount: type?.lastYearAmount ?? 0,
    lastMonthAmount: type?.lastMonthAmount ?? 0,
})

const mergedTypes = computed<StatsCardTypeRow[]>(() => {
    const typeMap = new Map<string, StatsCardTypeRow>()

    props.stats.types.forEach((item) => {
        typeMap.set(item.type, {
            type: item.type,
            compact: normalizeType(item),
            expanded: normalizeType(),
        })
    })

    props.stats.typesExpanded.forEach((item) => {
        const existing = typeMap.get(item.type)
        if (existing) {
            existing.expanded = normalizeType(item)
            return
        }
        typeMap.set(item.type, {
            type: item.type,
            compact: normalizeType({ type: item.type, totalAmount: 0, lastYearAmount: 0, lastMonthAmount: 0 }),
            expanded: normalizeType(item),
        })
    })

    return [...typeMap.values()]
})

const compareTypes = (left: TypeStatistics, right: TypeStatistics) => (
    (right.lastMonthAmount - left.lastMonthAmount) * 1000 +
    (right.lastYearAmount - left.lastYearAmount) * 10 +
    (right.totalAmount - left.totalAmount)
)

const sortedTypes = computed(() => {
    return [...mergedTypes.value].sort((a, b) => {
        if (mode.value === 'expanded') {
            return compareTypes(a.expanded, b.expanded)
        }
        if (mode.value === 'both') {
            return (
                compareTypes(a.compact, b.compact) ||
                compareTypes(a.expanded, b.expanded)
            )
        }
        return compareTypes(a.compact, b.compact)
    })
})

const overviewStats = computed(() => {
    if (mode.value === 'expanded') {
        return {
            total: props.stats.totalExpanded,
            month: props.stats.newMonthExpanded,
            year: props.stats.newYearExpanded,
        }
    }
    return {
        total: props.stats.total,
        totalExpanded: props.stats.totalExpanded,
        month: props.stats.newMonth,
        monthExpanded: props.stats.newMonthExpanded,
        year: props.stats.newYear,
        yearExpanded: props.stats.newYearExpanded,
    }
})

const formatStatValue = (compact: number, expanded: number) => {
    if (mode.value === 'expanded') return String(expanded)
    if (mode.value === 'both') return `${compact} (${expanded})`
    return String(compact)
}
</script>

<template>
    <article class="card stats-card">
        <div class="card-top">
            <div>
                <p class="card-kicker">全量概览</p>
                <h3>图库统计</h3>
            </div>
            <el-button class="stats-toggle" text bg @click="nextMode">
                {{ modeLabel }}
            </el-button>
        </div>

        <div class="stats-overview">
            <div class="stat-box">
                <span class="stat-label">Total</span>
                <span class="stat-value">
                    {{ formatStatValue(stats.total, stats.totalExpanded) }}
                </span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Month</span>
                <span class="stat-value highlight">
                    {{ formatStatValue(stats.newMonth, stats.newMonthExpanded) }}
                    <el-icon v-if="overviewStats.month > 0" class="trend-icon-up">
                        <CaretTop />
                    </el-icon>
                </span>
            </div>
            <div class="stat-box">
                <span class="stat-label">Year</span>
                <span class="stat-value highlight">
                    {{ formatStatValue(stats.newYear, stats.newYearExpanded) }}
                    <el-icon v-if="overviewStats.year > 0" class="trend-icon-up">
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
                <div v-for="type in sortedTypes" :key="type.type" class="stats-row">
                    <span class="type-name">{{ type.type }}</span>
                    <span class="type-val">{{ formatStatValue(type.compact.totalAmount, type.expanded.totalAmount) }}</span>
                    <span class="type-val highlight">
                        {{ formatStatValue(type.compact.lastMonthAmount, type.expanded.lastMonthAmount) }}
                        <el-icon
                            v-if="(mode === 'expanded' ? type.expanded.lastMonthAmount : type.compact.lastMonthAmount) > 0"
                            class="trend-icon-up"
                        >
                            <CaretTop />
                        </el-icon>
                        <el-icon v-else class="trend-icon-flat">
                            <Minus />
                        </el-icon>
                    </span>
                    <span class="type-val highlight">
                        {{ formatStatValue(type.compact.lastYearAmount, type.expanded.lastYearAmount) }}
                        <el-icon
                            v-if="(mode === 'expanded' ? type.expanded.lastYearAmount : type.compact.lastYearAmount) > 0"
                            class="trend-icon-up"
                        >
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

.stats-card {
    min-height: 0;
}

.stats-toggle {
    border-radius: 999px;
    padding-inline: 0.9rem;
    font-weight: 600;
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
</style>
