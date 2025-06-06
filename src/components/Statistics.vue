<script setup lang="ts">
import StatisticsItem from './StatisticsItem.vue';
import { ref } from 'vue';
import { fetchDataAutoRetry } from '../token.ts';

interface TypeStatistics {
    type: string,
    totalAmount: number,
    lastYearAmount: number,
    lastMonthAmount: number
}

interface StatResponse {
    overall: {
        totalAmount: number,
        lastYearAmount: number,
        lastMonthAmount: number
    },
    types: Array<TypeStatistics>
}

const typesStatistics = ref([] as Array<TypeStatistics>);
const overallTotal = ref(0);
const overallLastYear = ref(0);
const overallLastMonth = ref(0);

const updateStat = async () => {
    const data = await fetchDataAutoRetry('/api/statistics/', {}, 'GET') as StatResponse;
    const overall = data.overall;
    let types = data.types;
    overallTotal.value = overall.totalAmount;
    overallLastYear.value = overall.lastYearAmount;
    overallLastMonth.value = overall.lastMonthAmount;

    types = types.sort((a, b) => b.lastMonthAmount - a.lastMonthAmount);

    typesStatistics.value = types;
}

updateStat();
</script>

<template>
    <div id="statistics">
        <el-card id="overall-statistics">
            <template #header>
                <h2>统计：</h2>
            </template>
            <el-row>
                <el-col :span="8">
                    <el-statistic title="总数" :value=overallTotal />
                </el-col>
                <el-col :span="8">
                    <el-statistic title="本月新增" :value=overallLastMonth>
                        <template #prefix v-if="overallLastMonth && overallLastMonth > 0">
                            <el-icon style="vertical-align: -0.125em;color: var(--el-color-success);">
                                <CaretTop />
                            </el-icon>
                        </template>
                    </el-statistic>
                </el-col>
                <el-col :span="8">
                    <el-statistic title="本年新增" :value=overallLastYear>
                        <template #prefix v-if="overallLastYear && overallLastYear > 0">
                            <el-icon style="vertical-align: -0.125em;color: var(--el-color-success);">
                                <CaretTop />
                            </el-icon>
                        </template>
                    </el-statistic>
                </el-col>
            </el-row>
        </el-card>
        <h2>分类统计：</h2>
        <el-col id="types-statistics">
            <StatisticsItem v-for="type in typesStatistics" :type="type.type" :totalAmount="type.totalAmount"
                :lastYearAmount="type.lastYearAmount" :lastMonthAmount="type.lastMonthAmount" />
        </el-col>
    </div>
</template>

<style scoped>
h2 {
    margin: 0;
}

#overall-statistics {
    margin-bottom: 10px;
}

#statistics {
    margin-bottom: 20px;
}

#statistics h2 {
    margin-top: 0;
}

#types-statistics {
    height: 65vh;
    width: auto;
    overflow-y: scroll;
}

@media (max-width: 600px) {
    #types-statistics {
        height: auto;
    }
}

#types-statistics div {
    margin: 1%;
    padding: 10px;
    text-align: center;
}
</style>