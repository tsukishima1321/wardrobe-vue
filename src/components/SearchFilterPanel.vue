<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElCollapse, ElCollapseItem, ElDatePicker, ElCheckbox, ElSelect, ElOption, ElInput, ElButton, ElTag, ElIcon } from 'element-plus';
import { Delete, Plus } from '@element-plus/icons-vue';
import { fetchDataAutoRetry } from '@/token';

export interface PropItem {
    name: string;
    value: string;
}

export interface SearchParams {
    searchword: string;
    sortBy: string;
    sortOrder: string;
    dateFrom: string;
    dateTo: string;
    searchByTitle: boolean;
    searchByContent: boolean;
    page: number;
    keywords?: Array<string>;
    properties?: Array<PropItem>;
    excludedKeywords?: Array<string>;
    excludedProperties?: Array<PropItem>;
}

const props = defineProps<{
    modelValue: SearchParams;
    keywordsHint: string[];
    propertiesHint: string[];
}>();

const emit = defineEmits<{
    (e: 'update:modelValue', value: SearchParams): void;
    (e: 'search'): void;
}>();

// Local state to avoid mutating props directly
const localParams = ref<SearchParams>({ ...props.modelValue });

watch(() => props.modelValue, (newVal) => {
    localParams.value = { ...newVal };
}, { deep: true });

const updateParams = () => {
    emit('update:modelValue', localParams.value);
    emit('search');
};

// Collapse state
const activeNames = ref(['1', '2', '3']);

// Property Input State
const newPropName = ref('');
const newPropValue = ref('');

const addProperty = (isIncluded: boolean) => {
    if (!newPropName.value || !newPropValue.value) return;

    const targetList = isIncluded
        ? (localParams.value.properties || [])
        : (localParams.value.excludedProperties || []);

    // Check if exists
    const idx = targetList.findIndex(p => p.name === newPropName.value);
    if (idx >= 0) {
        targetList[idx].value = newPropValue.value;
    } else {
        targetList.push({ name: newPropName.value, value: newPropValue.value });
    }

    if (isIncluded) localParams.value.properties = targetList;
    else localParams.value.excludedProperties = targetList;

    newPropName.value = '';
    newPropValue.value = '';
    updateParams();
};

const removeProperty = (index: number, isIncluded: boolean) => {
    if (isIncluded && localParams.value.properties) {
        localParams.value.properties.splice(index, 1);
    } else if (!isIncluded && localParams.value.excludedProperties) {
        localParams.value.excludedProperties.splice(index, 1);
    }
    updateParams();
};

// Mock Saved Searches
const savedSearches = ref([
    { name: 'Recent Documents', id: 1 },
    { name: 'Images Only', id: 2 },
]);

const newSavedSearchName = ref('');

const getSavedSearches = async () => {
    console.log('Fetch saved searches from backend');
    savedSearches.value = await fetchDataAutoRetry('/api/savedsearch/list/', {}, 'GET') as Array<{ name: string; id: number }>;
}

const loadSavedSearch = async (id: number) => {
    console.log('Load saved search', id);
    const saved = await fetchDataAutoRetry(`/api/savedsearch/get/`, { id: id }) as SearchParams;
    localParams.value = saved;
    updateParams();
};

const postSavedSearch = async (name: string, params: SearchParams) => {
    console.log('Save current search as', name, params);
    const response = await fetchDataAutoRetry('/api/savedsearch/create/', {name: name, searchparams: params }) as {id: number};
    return response.id;
}

const handleSaveSearch = async () => {
    if (!newSavedSearchName.value.trim()) return;
    const id = await postSavedSearch(newSavedSearchName.value, localParams.value);
    savedSearches.value.push({ name: newSavedSearchName.value, id: id });
    newSavedSearchName.value = '';
}

const deleteSavedSearch = (id: number) => {
    console.log('Delete saved search', id);
    const response = fetchDataAutoRetry(`/api/savedsearch/delete/`, { id: id });
    const index = savedSearches.value.findIndex(s => s.id === id);
    if (index !== -1) {
        savedSearches.value.splice(index, 1);
    }
}

getSavedSearches();

</script>

<template>
    <div class="filter-panel">
        <div class="panel-header">
            <h3>Filters</h3>
        </div>

        <div class="filter-section">
            <div class="section-title">Scope</div>
            <div class="checkbox-group">
                <el-checkbox v-model="localParams.searchByTitle" label="Title" @change="updateParams"
                    :disabled="!localParams.searchByContent" />
                <el-checkbox v-model="localParams.searchByContent" label="Content" @change="updateParams"
                    :disabled="!localParams.searchByTitle" />
            </div>
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

            <el-collapse-item title="Keywords" name="2">
                <div class="filter-group">
                    <label>Include:</label>
                    <el-select v-model="localParams.keywords" multiple filterable allow-create
                        placeholder="Select keywords" @change="updateParams">
                        <el-option v-for="k in keywordsHint" :key="k" :label="k" :value="k" />
                    </el-select>
                </div>
                <div class="filter-group mt-2">
                    <label>Exclude:</label>
                    <el-select v-model="localParams.excludedKeywords" multiple filterable allow-create
                        placeholder="Exclude keywords" @change="updateParams">
                        <el-option v-for="k in keywordsHint" :key="k" :label="k" :value="k" />
                    </el-select>
                </div>
            </el-collapse-item>

            <el-collapse-item title="Properties" name="3">
                <div class="add-property">
                    <el-select v-model="newPropName" filterable allow-create placeholder="Name" size="small"
                        style="margin-bottom: 4px;">
                        <el-option v-for="p in propertiesHint" :key="p" :label="p" :value="p" />
                    </el-select>
                    <el-input v-model="newPropValue" placeholder="Value" size="small" style="margin-bottom: 4px;" />
                    <div class="btn-group">
                        <el-button size="small" @click="addProperty(true)">+ Inc</el-button>
                        <el-button size="small" @click="addProperty(false)">- Exc</el-button>
                    </div>
                </div>

                <div class="property-list">
                    <div v-for="(p, i) in localParams.properties" :key="'inc-' + i" class="prop-tag inc">
                        <span>{{ p.name }}: {{ p.value }}</span>
                        <el-icon @click="removeProperty(i, true)" class="cursor-pointer">
                            <Delete />
                        </el-icon>
                    </div>
                    <div v-for="(p, i) in localParams.excludedProperties" :key="'exc-' + i" class="prop-tag exc">
                        <span>NOT {{ p.name }}: {{ p.value }}</span>
                        <el-icon @click="removeProperty(i, false)" class="cursor-pointer">
                            <Delete />
                        </el-icon>
                    </div>
                </div>
            </el-collapse-item>
        </el-collapse>

        <div class="saved-searches">
            <div class="section-title">Saved Searches</div>
            <div class="save-search-input">
                <el-input v-model="newSavedSearchName" placeholder="Save filter..." size="small">
                    <template #append>
                        <el-button :icon="Plus" @click="handleSaveSearch" />
                    </template>
                </el-input>
            </div>
            <ul>
                <li v-for="s in savedSearches" :key="s.id" class="saved-search-item">
                    <span @click="loadSavedSearch(s.id)">{{ s.name }}</span>
                    <el-icon class="delete-icon" @click.stop="deleteSavedSearch(s.id)">
                        <Delete />
                    </el-icon>
                </li>
            </ul>
        </div>
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

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: #606266;
    margin-bottom: 8px;
}

.checkbox-group {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.filter-group label {
    display: block;
    font-size: 12px;
    color: #909399;
    margin-bottom: 4px;
}

.mt-2 {
    margin-top: 8px;
}

.add-property {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 8px;
    background: #f5f7fa;
    border-radius: 4px;
}

.btn-group {
    display: flex;
    gap: 4px;
}

.property-list {
    margin-top: 8px;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.prop-tag {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 8px;
    border-radius: 4px;
    font-size: 12px;
}

.prop-tag.inc {
    background: #ecf5ff;
    color: #409eff;
}

.prop-tag.exc {
    background: #fef0f0;
    color: #f56c6c;
}

.cursor-pointer {
    cursor: pointer;
}

.save-search-input {
    margin-bottom: 8px;
}

.saved-searches ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

.saved-search-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    cursor: pointer;
    border-radius: 4px;
    color: #606266;
    font-size: 14px;
}

.saved-search-item:hover {
    background: #f5f7fa;
    color: #409eff;
}

.saved-search-item span {
    flex-grow: 1;
    /* Ensure text takes up space so click target is large */
}

.delete-icon {
    display: none;
    color: #f56c6c;
    font-size: 14px;
    padding: 2px;
}

.delete-icon:hover {
    background-color: #fef0f0;
    border-radius: 4px;
}

.saved-search-item:hover .delete-icon {
    display: block;
}

.hint-text {
    font-size: 10px;
    color: #909399;
    margin-top: 4px;
    font-style: italic;
}
</style>