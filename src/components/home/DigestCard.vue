<script setup lang="ts">
import { computed } from 'vue'
import type { HomeDiscoveryDigestModule, HomeDiscoveryReminder } from '@/api/componentRequests'

const props = defineProps<{
    digestModule: HomeDiscoveryDigestModule | null
    discoveryLoading: boolean
}>()

const emit = defineEmits<{
    'open-keyword-search': [keyword: string]
    'open-reminder-link': [reminder: HomeDiscoveryReminder]
}>()

const digestStatCards = computed(() => {
    const digestStats = props.digestModule?.stats
    if (!digestStats) return []

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
    ]
})

const getReminderClass = (severity?: string): string => {
    if (severity === 'warning') return 'warning'
    if (severity === 'error' || severity === 'danger') return 'danger'
    return 'neutral'
}
</script>

<template>
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
                        @click="emit('open-keyword-search', item.keyword)">
                        #{{ item.keyword }} · {{ item.count }}
                    </button>
                </div>
            </div>

            <div v-if="digestModule.highlights.length" class="digest-section">
                <p class="section-label">简短摘要</p>
                <ul class="digest-list">
                    <li v-for="(item, index) in digestModule.highlights.slice(0, 3)" :key="`highlight-${index}`">
                        {{ item }}
                    </li>
                </ul>
            </div>

            <div v-if="digestModule.reminders.length" class="digest-section">
                <p class="section-label">提醒</p>
                <div class="reminder-list">
                    <button v-for="(item, index) in digestModule.reminders" :key="`reminder-${index}`"
                        type="button" class="reminder-chip" :class="getReminderClass(item.severity)"
                        @click="emit('open-reminder-link', item)">
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

.digest-card {
    min-height: 0;
    flex: 1 1 auto;
}

.card-fill {
    flex: 1;
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

.digest-list {
    margin: 0;
    padding-left: 1rem;
}

.digest-list li {
    margin: 0;
    line-height: 1.65;
    color: #475467;
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
