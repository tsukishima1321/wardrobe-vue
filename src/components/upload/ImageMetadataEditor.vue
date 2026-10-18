<script setup lang="ts">
import { computed, ref } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, MagicStick, Plus, Delete } from '@element-plus/icons-vue';
import { debounce } from 'lodash';
import { getSearchHints, predictImage } from '@/api/componentRequests';
import type { ImageProperty } from '@/api/componentRequests';
import CopyAttributesDialog from './CopyAttributesDialog.vue';
import type { ImageMetadataValue } from './types';

const props = withDefaults(defineProps<{
    modelValue: ImageMetadataValue;
    showOCR?: boolean;
    predictOnBlur?: boolean;
    compact?: boolean;
    mock?: boolean;
}>(), {
    showOCR: true,
    predictOnBlur: false,
    compact: false,
    mock: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: ImageMetadataValue): void;
}>();

const update = (patch: Partial<ImageMetadataValue>) => {
    emit('update:modelValue', { ...props.modelValue, ...patch });
};

const title = computed({
    get: () => props.modelValue.title,
    set: (value: string) => update({ title: value }),
});
const date = computed({
    get: () => props.modelValue.date,
    set: (value: string) => update({ date: value }),
});
const isOCR = computed({
    get: () => props.modelValue.isOCR,
    set: (value: boolean) => update({ isOCR: value }),
});

const newKeyword = ref('');
const newPropertyName = ref('');
const newPropertyValue = ref('');
const keywordsHint = ref<string[]>([]);
const propertiesHint = ref<string[]>([]);
const predicting = ref(false);
const copyVisible = ref(false);

const updateHints = debounce(async () => {
    if (props.mock) {
        keywordsHint.value = ['日常', '旅行', '照片'];
        propertiesHint.value = ['地点', '天气', '心情'];
        return;
    }
    try {
        const data = await getSearchHints();
        keywordsHint.value = data.keywords ?? [];
        propertiesHint.value = data.properties ?? [];
    } catch {
        keywordsHint.value = [];
        propertiesHint.value = [];
    }
}, 300);
updateHints();

const createFilter = (queryString: string) => (item: string) =>
    item.toLowerCase().startsWith(queryString.toLowerCase());

const querySearchKeywords = (queryString: string, callback: (items: Array<{ value: string }>) => void) => {
    const results = queryString
        ? keywordsHint.value.filter(createFilter(queryString))
        : keywordsHint.value;
    callback(results.map((value) => ({ value })));
};

const querySearchProps = (queryString: string, callback: (items: Array<{ value: string }>) => void) => {
    const results = queryString
        ? propertiesHint.value.filter(createFilter(queryString))
        : propertiesHint.value;
    callback(results.map((value) => ({ value })));
};

const addKeyword = (value?: string) => {
    const keyword = (value ?? newKeyword.value).trim();
    if (!keyword || props.modelValue.keywords.includes(keyword)) return;
    update({ keywords: [...props.modelValue.keywords, keyword] });
    newKeyword.value = '';
};

const handleSelectKeyword = (item: { value: string }) => {
    addKeyword(item.value);
};

const removeKeyword = (keyword: string) => {
    update({ keywords: props.modelValue.keywords.filter((item) => item !== keyword) });
};

const addProperty = () => {
    const name = newPropertyName.value.trim();
    const value = newPropertyValue.value.trim();
    if (!name || !value) return;
    if (props.modelValue.properties.some((item) => item.name === name && item.value === value)) {
        newPropertyName.value = '';
        newPropertyValue.value = '';
        return;
    }
    update({ properties: [...props.modelValue.properties, { name, value }] });
    newPropertyName.value = '';
    newPropertyValue.value = '';
};

const removeProperty = (index: number) => {
    const next = [...props.modelValue.properties];
    next.splice(index, 1);
    update({ properties: next });
};

const handlePredict = async () => {
    if (!title.value.trim() || predicting.value) return;
    if (props.mock) {
        update({
            keywords: Array.from(new Set([...props.modelValue.keywords, '日常', '照片'])),
            properties: [...props.modelValue.properties, { name: '地点', value: '河边' }],
        });
        ElMessage.success('已填充模拟预测信息');
        return;
    }
    predicting.value = true;
    try {
        const response = await predictImage(title.value);
        const nextKeywords = [...props.modelValue.keywords];
        let addedKeywords = 0;
        for (const keyword of response.keywords ?? []) {
            if (!nextKeywords.includes(keyword)) {
                nextKeywords.push(keyword);
                addedKeywords += 1;
            }
        }
        const nextProperties = [...props.modelValue.properties];
        let addedProperties = 0;
        for (const property of response.properties ?? []) {
            if (!nextProperties.some((item) => item.name === property.name && item.value === property.value)) {
                nextProperties.push({ name: property.name, value: property.value });
                addedProperties += 1;
            }
        }
        update({ keywords: nextKeywords, properties: nextProperties });
        if (addedKeywords || addedProperties) {
            ElMessage.success(`已填充 ${addedKeywords} 个关键词、${addedProperties} 个属性`);
        } else {
            ElMessage.info('没有新的预测结果');
        }
    } catch (error) {
        console.error('predict image metadata failed', error);
        ElMessage.error('属性预测失败');
    } finally {
        predicting.value = false;
    }
};

const maybePredict = () => {
    if (props.predictOnBlur) {
        void handlePredict();
    }
};

const applyCopyAttributes = (payload: { keywords: string[]; properties: ImageProperty[] }) => {
    const nextKeywords = [...props.modelValue.keywords];
    let addedKeywords = 0;
    for (const keyword of payload.keywords) {
        if (!nextKeywords.includes(keyword)) {
            nextKeywords.push(keyword);
            addedKeywords += 1;
        }
    }
    const nextProperties = [...props.modelValue.properties];
    let addedProperties = 0;
    for (const property of payload.properties) {
        if (!nextProperties.some((item) => item.name === property.name && item.value === property.value)) {
            nextProperties.push({ name: property.name, value: property.value });
            addedProperties += 1;
        }
    }
    update({ keywords: nextKeywords, properties: nextProperties });
    ElMessage.success(`已复制 ${addedKeywords} 个关键词、${addedProperties} 个属性`);
};
</script>

<template>
    <div class="metadata-editor" :class="{ 'is-compact': compact }">
        <el-form label-position="top" :size="compact ? 'small' : 'default'">
            <el-form-item label="图片标题" required>
                <el-input v-model="title" placeholder="输入图片标题" maxlength="100" show-word-limit
                    @blur="maybePredict" />
            </el-form-item>
            <div class="meta-row">
                <el-form-item label="日期">
                    <el-date-picker v-model="date" type="date" placeholder="选择日期" format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD" style="width: 100%" />
                </el-form-item>
                <el-form-item v-if="showOCR" label="OCR">
                    <el-switch v-model="isOCR" active-text="启用" />
                </el-form-item>
            </div>
        </el-form>

        <div class="metadata-section">
            <div class="section-row">
                <span class="section-label">关键词</span>
                <div class="section-actions">
                    <el-button size="small" text :icon="MagicStick" :loading="predicting" @click="handlePredict">
                        预测属性
                    </el-button>
                    <el-button size="small" text :icon="CopyDocument" @click="copyVisible = true">复制属性</el-button>
                </div>
            </div>
            <div class="tags-wrapper">
                <el-tag v-for="keyword in modelValue.keywords" :key="keyword" closable type="info" effect="plain"
                    @close="removeKeyword(keyword)">{{ keyword }}</el-tag>
                <el-autocomplete v-model="newKeyword" :fetch-suggestions="querySearchKeywords" placeholder="添加关键词"
                    size="small" class="tag-input" @select="handleSelectKeyword" @keyup.enter="addKeyword()">
                    <template #append>
                        <el-button :icon="Plus" @click="addKeyword()" :size="'small'"/>
                    </template>
                </el-autocomplete>
            </div>
        </div>

        <div class="metadata-section">
            <div class="section-row">
                <span class="section-label">属性</span>
            </div>
            <div v-if="modelValue.properties.length" class="props-list">
                <div v-for="(property, index) in modelValue.properties" :key="`${property.name}:${property.value}`"
                    class="prop-item">
                    <span class="prop-name">{{ property.name }}</span>
                    <span class="prop-value">{{ property.value }}</span>
                    <el-button link type="danger" :icon="Delete" @click="removeProperty(index)" />
                </div>
            </div>
            <div class="add-prop-row">
                <el-autocomplete v-model="newPropertyName" :fetch-suggestions="querySearchProps" placeholder="属性名"
                    size="small" style="width: 36%" @keyup.enter.prevent="addProperty" />
                <el-input v-model="newPropertyValue" placeholder="属性值" size="small" style="flex: 1"
                    @keyup.enter="addProperty" />
                <el-button size="small" @click="addProperty">添加</el-button>
            </div>
        </div>

        <CopyAttributesDialog v-model="copyVisible" :mock="mock" @apply="applyCopyAttributes" />
    </div>
</template>

<style scoped>
.metadata-editor {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.meta-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: start;
}

.metadata-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.section-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
}

.section-label {
    color: #303133;
    font-weight: 600;
    font-size: 13px;
}

.section-actions {
    display: flex;
    align-items: center;
    gap: 2px;
}

.section-actions :deep(.el-button) {
    margin-left: 0;
}

.tags-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.tag-input {
    width: 180px;
}

.props-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.prop-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 10px;
    border-radius: 6px;
    background: #f9fafc;
    font-size: 13px;
}

.prop-name {
    color: #606266;
    font-weight: 500;
}

.prop-value {
    flex: 1;
    color: #303133;
    text-align: right;
}

.add-prop-row {
    display: flex;
    gap: 8px;
    align-items: center;
}

.metadata-editor.is-compact :deep(.el-form-item) {
    margin-bottom: 10px;
}

@media (max-width: 600px) {
    .meta-row {
        grid-template-columns: 1fr;
    }

    .tag-input {
        width: 100%;
    }
}
</style>
