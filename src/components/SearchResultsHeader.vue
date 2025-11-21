<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElInput, ElButton, ElSelect, ElOption, ElRadioGroup, ElRadioButton, ElIcon } from 'element-plus';
import { Search, Delete, Download, Grid, List, Filter } from '@element-plus/icons-vue';

const props = defineProps<{
    searchword: string;
    sortBy: string;
    sortOrder: string;
    isPictureMode: boolean;
    hasSelection: boolean;
    isAllSelected: boolean;
    total: number;
}>();

const emit = defineEmits<{
    (e: 'update:searchword', val: string): void;
    (e: 'update:sortBy', val: string): void;
    (e: 'update:sortOrder', val: string): void;
    (e: 'update:isPictureMode', val: boolean): void;
    (e: 'search'): void;
    (e: 'delete'): void;
  (e: 'download'): void;
  (e: 'selectAll'): void;
  (e: 'selectNone'): void;
  (e: 'openMobileFilter'): void;
}>();

const localSearchword = ref(props.searchword);
const localSortBy = ref(props.sortBy || 'date');
const localSortOrder = ref(props.sortOrder || 'desc');

watch(() => props.searchword, (val) => localSearchword.value = val);
watch(() => props.sortBy, (val) => localSortBy.value = val);
watch(() => props.sortOrder, (val) => localSortOrder.value = val);

const handleSearch = () => {
    emit('update:searchword', localSearchword.value);
    emit('search');
};

const handleSortChange = () => {
    emit('update:sortBy', localSortBy.value);
    emit('update:sortOrder', localSortOrder.value);
    emit('search');
};

const toggleSelectAll = () => {
    if (props.isAllSelected) {
        emit('selectNone');
    } else {
        emit('selectAll');
    }
};

</script>

<template>
    <div class="results-header">
        <div class="top-row">
            <el-button class="mobile-filter-btn" :icon="Filter" @click="$emit('openMobileFilter')" circle />
            <div class="search-input-wrapper">
                <el-input v-model="localSearchword" placeholder="Search..." class="main-search-input"
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
                <el-select v-model="localSortBy" style="width: 120px" @change="handleSortChange">
                    <el-option label="Date" value="date" />
                    <el-option label="Filename" value="href" />
                    <el-option label="Title" value="description" />
                </el-select>
                <el-select v-model="localSortOrder" style="width: 100px" @change="handleSortChange">
                    <el-option label="Desc" value="desc" />
                    <el-option label="Asc" value="asc" />
                </el-select>
                <span class="total-count">Total: {{ total }}</span>
            </div>

            <div class="right-controls">
                <div v-if="hasSelection" class="batch-actions">
                    <span class="selection-info">Selected</span>
                    <el-button type="danger" plain :icon="Delete" circle @click="$emit('delete')" />
                    <el-button type="success" plain :icon="Download" circle @click="$emit('download')" />
                </div>

                <el-button :type="isAllSelected ? 'primary' : 'default'" plain @click="toggleSelectAll">
                    {{ isAllSelected ? 'Deselect All' : 'Select All' }}
                </el-button>

                <div class="view-toggle">
                    <el-radio-group :model-value="isPictureMode"
                        @update:model-value="$emit('update:isPictureMode', $event as boolean)">
                        <el-radio-button :value="true">
                            <el-icon>
                                <Grid />
                            </el-icon>
                        </el-radio-button>
                        <el-radio-button :value="false">
                            <el-icon>
                                <List />
                            </el-icon>
                        </el-radio-button>
                    </el-radio-group>
                </div>
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

.batch-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    padding-right: 12px;
    border-right: 1px solid #dcdfe6;
}

.selection-info {
    font-size: 12px;
    color: #909399;
    font-weight: 600;
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

    .batch-actions {
        border-right: none;
        padding-right: 0;
    }
}
</style>