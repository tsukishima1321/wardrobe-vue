<script setup lang="ts">
import { ref } from 'vue';
const props = defineProps({
    type: String,
    totalAmount: Number,
    lastYearAmount: Number,
    lastMonthAmount: Number
});
const type = ref(props.type);
const totalAmount = ref(props.totalAmount);
const lastYearAmount = ref(props.lastYearAmount);
const lastMonthAmount = ref(props.lastMonthAmount);
</script>
<template>
    <div class="type-statistic">
        <h3>{{ type }}</h3>
        <p>总数: <span>{{ totalAmount }}</span></p>
        <p>本年新增: <span>{{ lastYearAmount }}</span></p>
        <p>本月新增: <span>{{ lastMonthAmount }}</span></p>
    </div>
</template>
<style scoped>
div {
    width: 48%;
    margin: 1%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 5px;
    text-align: center;
}

div p {
    margin: 5px 0;
}
</style>