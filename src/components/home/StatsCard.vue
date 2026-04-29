<script setup lang="ts">
import { CaretTop, Minus } from '@element-plus/icons-vue'
import type { TypeStatistics } from '@/api/componentRequests'

defineProps<{
    stats: {
        total: number
        newMonth: number
        newYear: number
        types: TypeStatistics[]
    }
}>()
</script>

<template>
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
