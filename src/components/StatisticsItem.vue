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
    <el-card class="type-statistic">
        <template #header>
            <h3>{{ type }}</h3>
        </template>
        <el-row>
            <el-col :span="8">
                <el-statistic title="总数" :value=totalAmount />
            </el-col>
            <el-col :span="8">
                <el-statistic title="本月新增" :value=lastYearAmount />
            </el-col>
            <el-col :span="8">
                <el-statistic title="本年新增" :value=lastMonthAmount />
            </el-col>
        </el-row>
    </el-card>
</template>
<style scoped>
h3 {
    margin:0;
}
.statheader {
    padding: 0;
}
.el-card {
    margin: 1%;
    text-align: center;
}
</style>