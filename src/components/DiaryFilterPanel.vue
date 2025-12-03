<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElCollapse, ElCollapseItem, ElDatePicker } from 'element-plus';

export interface DiarySearchParams {
    searchKey: string;
    dateFrom: string;
    dateTo: string;
    orderBy: string;
    order: string;
    page: number;
    pageSize: number;
}

const props = defineProps<{
    modelValue: DiarySearchParams;
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: DiarySearchParams): void;
    (e: 'search'): void;
}>();

const localParams = ref<DiarySearchParams>({ ...props.modelValue });

watch(() => props.modelValue, (newVal) => {
    localParams.value = { ...newVal };
}, { deep: true });

const updateParams = () => {
    emit('update:modelValue', localParams.value);
    emit('search');
};

const activeNames = ref(['1']);
</script>

<template>
    <div class="filter-panel">
        <div class="panel-header">
            <h3>Filters</h3>
        </div>

        <el-collapse v-model="activeNames">
            <el-collapse-item title="Date Range" name="1">
                <div class="date-picker-group">
                    <el-date-picker v-model="localParams.dateFrom" type="date" placeholder="From" format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD" @change="updateParams" style="width: 100%; margin-bottom: 8px;" />
                    <el-date-picker v-model="localParams.dateTo" type="date" placeholder="To" format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD" @change="updateParams" style="width: 100%;" />
                </div>
            </el-collapse-item>
        </el-collapse>
    </div>
</template>

<style scoped>
.filter-panel {
    padding: 16px;
    background: #fff;
    height: 100%;
    border-right: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.panel-header h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #303133;
}

.date-picker-group {
    display: flex;
    flex-direction: column;
}
</style>