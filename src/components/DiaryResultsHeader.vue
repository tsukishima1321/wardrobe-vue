<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElInput, ElButton, ElSelect, ElOption, ElIcon } from 'element-plus';
import { Search, Plus, Filter } from '@element-plus/icons-vue';

const props = defineProps<{
    searchKey: string;
    orderBy: string;
    order: string;
    total: number;
}>();

const emit = defineEmits<{
    (e: 'update:searchKey', val: string): void;
    (e: 'update:orderBy', val: string): void;
    (e: 'update:order', val: string): void;
    (e: 'search'): void;
    (e: 'newDiary'): void;
    (e: 'openMobileFilter'): void;
}>();

const localSearchKey = ref(props.searchKey);
const localOrderBy = ref(props.orderBy || 'date');
const localOrder = ref(props.order || 'desc');

watch(() => props.searchKey, (val) => localSearchKey.value = val);
watch(() => props.orderBy, (val) => localOrderBy.value = val);
watch(() => props.order, (val) => localOrder.value = val);

const handleSearch = () => {
    emit('update:searchKey', localSearchKey.value);
    emit('search');
};

const handleSortChange = () => {
    emit('update:orderBy', localOrderBy.value);
    emit('update:order', localOrder.value);
    emit('search');
};
</script>

<template>
    <div class="results-header">
        <div class="top-row">
            <el-button class="mobile-filter-btn" :icon="Filter" @click="$emit('openMobileFilter')" circle />
            <div class="search-input-wrapper">
                <el-input v-model="localSearchKey" placeholder="Search diaries..." class="main-search-input"
                    @keyup.enter="handleSearch" clearable>
                    <template #prefix>
                        <el-icon>
                            <Search />
                        </el-icon>
                    </template>
                </el-input>
                <el-button type="primary" @click="handleSearch">Search</el-button>
            </div>
        </div>

        <div class="controls-row">
            <div class="left-controls">
                <span class="label">Sort by:</span>
                <el-select v-model="localOrderBy" style="width: 120px" @change="handleSortChange">
                    <el-option label="Date" value="date" />
                </el-select>
                <el-select v-model="localOrder" style="width: 100px" @change="handleSortChange">
                    <el-option label="Desc" value="desc" />
                    <el-option label="Asc" value="asc" />
                </el-select>
                <span class="total-count">Total: {{ total }}</span>
            </div>

            <div class="right-controls">
                <el-button type="primary" :icon="Plus" @click="$emit('newDiary')">New Diary</el-button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.results-header {
    background: #fff;
    border-bottom: 1px solid #e4e7ed;
    padding: 16px 24px;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.top-row {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
}

.mobile-filter-btn {
    display: none;
}

.search-input-wrapper {
    display: flex;
    width: 100%;
    max-width: 600px;
    gap: 8px;
}

.controls-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
}

.left-controls,
.right-controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
}

.label {
    font-size: 14px;
    color: #606266;
}

.total-count {
    font-size: 14px;
    color: #909399;
    margin-left: 8px;
}

@media (max-width: 768px) {
    .results-header {
        padding: 12px;
    }

    .mobile-filter-btn {
        display: inline-flex;
    }

    .controls-row {
        flex-direction: column;
        align-items: stretch;
    }

    .left-controls,
    .right-controls {
        justify-content: space-between;
        width: 100%;
    }
}
</style>