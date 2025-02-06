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
        <div id="overall-statistics">
            <h2>统计：</h2>
            <p>总数: <span id="overall-total">{{ overallTotal }}</span></p>
            <p>本年新增: <span id="overall-last-year">{{ overallLastYear }}</span></p>
            <p>本月新增: <span id="overall-last-month">{{ overallLastMonth }}</span></p>
        </div>
        <h2>分类统计：</h2>
        <div id="types-statistics">
            <StatisticsItem v-for="type in typesStatistics" :type="type.type" :totalAmount="type.totalAmount" :lastYearAmount="type.lastYearAmount" :lastMonthAmount="type.lastMonthAmount" />
        </div>
    </div>
</template>

<style scoped>
#statistics {
    margin-bottom: 20px;
}

#statistics h2 {
    margin-top: 0;
}

#types-statistics {
    height: 60vh;
    width: auto;
    display: flex;
    flex-wrap: wrap;
    overflow-y: scroll;
}

@media (max-width: 600px) {
    #types-statistics {
        height: auto;
    }
}

#types-statistics div {
    width: 48%;
    margin: 1%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    text-align: center;
}

#types-statistics div p {
    margin: 5px 0;
}
</style>