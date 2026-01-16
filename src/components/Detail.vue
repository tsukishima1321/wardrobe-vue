<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref } from 'vue';
import { ElMessage, ElLoading, ElInput } from 'element-plus';
import { GetBlobImgSrc } from '../api/token.ts';
import {
    createKeyword,
    createOcrMission,
    createProperty,
    deleteKeyword,
    deleteProperty,
    getImageDetail,
    getKeywordList,
    getPropertyList,
    setImageInfo,
    setImageText
} from '@/api/componentRequests';
import { ZoomIn, ZoomOut, Refresh, Picture, Edit, Check, Plus, Delete } from '@element-plus/icons-vue';

const router = useRouter();
const imgSrc = ref(router.currentRoute.value.params.src);
const blobSrc = ref('');
const enableEdit = ref(false);
const enableEditText = ref(false);
const imgLoading = ref(true);

interface ImageProperty {
    name: string;
    value: string;
}

const imgTitle = ref('');
const imgText = ref('');
const imgDate = ref('');
const keywords = ref<string[]>([]);
const newKeyword = ref('');
const keywordActionPending = ref(false);
const propertys = ref<ImageProperty[]>([]);
const newPropertyName = ref('');
const newPropertyValue = ref('');
const propertyActionPending = ref(false);
const propertyNameInput = ref<InstanceType<typeof ElInput> | null>(null);
const propertyValueInput = ref<InstanceType<typeof ElInput> | null>(null);

// 缩放相关状态
const zoomLevel = ref(1);
const minZoom = 0.1;
const maxZoom = 5;
const zoomStep = 0.2;

interface imgData {
    src: string,
    title: string,
    date: string,
    text: string,
    keywords?: Array<string>,
    propertys?: Array<ImageProperty>
}

const loadImg = async () => {
    imgLoading.value = true;
    try {
        const r = await getImageDetail(imgSrc.value as string) as imgData;
        imgTitle.value = r.title;
        imgText.value = r.text;
        imgDate.value = r.date;
        const keywordsData = await getKeywordList(imgSrc.value as string);
        keywords.value = keywordsData as Array<string>;
        const propertysData = await getPropertyList(imgSrc.value as string);
        propertys.value = propertysData as Array<ImageProperty>;
    } catch {
        router.push('/login');
    }

    try {
        blobSrc.value = await GetBlobImgSrc("/imagebed/" + imgSrc.value);
    } catch {
        ElMessage.error('图片加载失败');
        // router.push('/login');
    } finally {
        imgLoading.value = false;
    }
}

const startEdit = () => {
    if (enableEdit.value || enableEditText.value) {
        ElMessage.warning('请先提交当前的更改再编辑其他内容');
        return;
    } else {
        enableEdit.value = true;
    }
}

const submitEdit = async () => {
    if (!imgTitle.value.trim()) {
        ElMessage.warning('请输入图片标题');
        return;
    }

    const loading = ElLoading.service({
        lock: true,
        text: '保存中...',
        background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
        const data = {
            src: imgSrc.value as string,
            title: imgTitle.value,
            date: imgDate.value,
        };

        await setImageInfo(data);
        enableEdit.value = false;
        ElMessage.success('图片信息保存成功！');
        await loadImg();
    } catch (error) {
        console.error('Save failed:', error);
        ElMessage.error('保存失败，请重试');
        router.push('/login');
    } finally {
        loading.close();
    }
}

const startEditText = () => {
    if (enableEdit.value || enableEditText.value) {
        ElMessage.warning('请先提交当前的更改再编辑其他内容');
        return;
    } else {
        enableEditText.value = true;
    }
}

const submitEditText = async () => {
    const loading = ElLoading.service({
        lock: true,
        text: '保存中...',
        background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
        const data = {
            src: imgSrc.value as string,
            text: imgText.value
        };

        await setImageText(data);
        enableEditText.value = false;
        ElMessage.success('图片文本保存成功！');
        await loadImg();
    } catch (error) {
        console.error('Save text failed:', error);
        ElMessage.error('保存失败，请重试');
        router.push('/login');
    } finally {
        loading.close();
    }
}

const newOCRTask = async () => {
    await createOcrMission(imgSrc.value as string).then(() => {
        ElMessage.success('OCR任务已创建');
    }).catch(() => {
        ElMessage.error('创建OCR任务失败，请重试');
    });
}

const addKeyword = async () => {
    const keyword = newKeyword.value.trim();
    if (!keyword) {
        ElMessage.warning('请输入关键词');
        return;
    }
    if (keywords.value.includes(keyword)) {
        ElMessage.warning('关键词已存在');
        return;
    }
    if (keywordActionPending.value) {
        return;
    }
    keywordActionPending.value = true;
    try {
        await createKeyword(imgSrc.value as string, keyword);
        newKeyword.value = '';
        ElMessage.success('关键词添加成功');
        await loadImg();
    } catch (error) {
        console.error('Add keyword failed:', error);
        ElMessage.error('添加关键词失败，请重试');
    } finally {
        keywordActionPending.value = false;
    }
}

const removeKeyword = async (keyword: string) => {
    if (keywordActionPending.value) {
        return;
    }
    keywordActionPending.value = true;
    try {
        await deleteKeyword(imgSrc.value as string, keyword);
        ElMessage.success('关键词已删除');
        await loadImg();
    } catch (error) {
        console.error('Remove keyword failed:', error);
        ElMessage.error('删除关键词失败，请重试');
    } finally {
        keywordActionPending.value = false;
    }
}

const addProperty = async () => {
    const name = newPropertyName.value.trim();
    const value = newPropertyValue.value.trim();
    if (!name || !value) {
        ElMessage.warning('请输入完整的属性名和值');
        return;
    }
    if (propertyActionPending.value) {
        return;
    }
    propertyActionPending.value = true;
    try {
        await createProperty(imgSrc.value as string, name, value);
        newPropertyName.value = '';
        newPropertyValue.value = '';
        ElMessage.success('属性添加成功');
        await loadImg();
        propertyNameInput.value?.focus();
    } catch (error) {
        console.error('Add property failed:', error);
        ElMessage.error('添加属性失败，请重试');
    } finally {
        propertyActionPending.value = false;
    }
}

const focusPropertyValueInput = () => {
    if (!newPropertyName.value.trim()) {
        return;
    }
    propertyValueInput.value?.focus();
};

const handlePropertyValueEnter = () => {
    addProperty();
};

const removeProperty = async (attr: ImageProperty) => {
    if (propertyActionPending.value) {
        return;
    }
    propertyActionPending.value = true;
    try {
        await deleteProperty(imgSrc.value as string, attr.name, attr.value);
        ElMessage.success('属性已删除');
        await loadImg();
    } catch (error) {
        console.error('Remove property failed:', error);
        ElMessage.error('删除属性失败，请重试');
    } finally {
        propertyActionPending.value = false;
    }
}

// 缩放控制函数
const zoomIn = () => {
    if (zoomLevel.value < maxZoom) {
        zoomLevel.value = Math.min(zoomLevel.value + zoomStep, maxZoom);
    }
}

const zoomOut = () => {
    if (zoomLevel.value > minZoom) {
        zoomLevel.value = Math.max(zoomLevel.value - zoomStep, minZoom);
    }
}

const resetZoom = () => {
    zoomLevel.value = 1;
}

loadImg();

</script>

<template>
    <div class="layout-container">
        <!-- Left: Image Viewer -->
        <div class="image-viewer">
            <div class="image-stage">
                <div class="image-content" :style="{ width: `${zoomLevel * 100}%` }">
                    <el-skeleton v-if="imgLoading" animated>
                        <template #template>
                            <el-skeleton-item variant="image" style="width: 100%; height: 80vh; border-radius: 8px;" />
                        </template>
                    </el-skeleton>
                    <el-image v-show="!imgLoading" :src="blobSrc" :preview-src-list="[blobSrc]" class="main-image">
                        <template #error>
                            <div class="image-error">
                                <el-icon>
                                    <Picture />
                                </el-icon>
                                <span>无法加载图片</span>
                            </div>
                        </template>
                    </el-image>
                </div>
            </div>

            <!-- Floating Zoom Controls -->
            <div class="zoom-bar">
                <el-button-group>
                    <el-button :icon="ZoomOut" circle @click="zoomOut" :disabled="zoomLevel <= minZoom" />
                    <el-button @click="resetZoom" :disabled="zoomLevel === 1">{{ Math.round(zoomLevel * 100)
                    }}%</el-button>
                    <el-button :icon="ZoomIn" circle @click="zoomIn" :disabled="zoomLevel >= maxZoom" />
                </el-button-group>
            </div>
        </div>

        <!-- Right: Details Panel -->
        <div class="details-panel">
            <div class="panel-content">
                <!-- Header / Basic Info -->
                <div class="section basic-info">
                    <div class="section-header">
                        <h2 v-if="!enableEdit" class="title-display">{{ imgTitle || '无标题' }}</h2>
                        <el-input v-else v-model="imgTitle" placeholder="图片标题" class="title-input" size="large" />

                        <div class="actions">
                            <el-button v-if="!enableEdit" link type="primary" @click="startEdit">
                                <el-icon>
                                    <Edit />
                                </el-icon> 编辑
                            </el-button>
                            <el-button v-else type="primary" link @click="submitEdit">
                                <el-icon>
                                    <Check />
                                </el-icon> 保存
                            </el-button>
                        </div>
                    </div>

                    <div class="meta-row">
                        <span class="label">日期</span>
                        <span v-if="!enableEdit" class="value">{{ imgDate || '-' }}</span>
                        <el-date-picker v-else v-model="imgDate" type="date" placeholder="选择日期" format="YYYY-MM-DD"
                            value-format="YYYY-MM-DD" size="small" style="width: 140px;" />
                    </div>
                </div>

                <el-divider />

                <!-- Keywords -->
                <div class="section keywords-section">
                    <div class="section-title">关键词</div>
                    <div class="tags-wrapper">
                        <el-tag v-for="keyword in keywords" :key="keyword" closable type="info" effect="plain"
                            @close="removeKeyword(keyword)" class="custom-tag" style="height: 32px;">
                            {{ keyword }}
                        </el-tag>

                        <div class="add-tag-wrapper">
                            <el-input v-model="newKeyword" placeholder="新关键词" class="new-tag-input"
                                @keyup.enter="addKeyword" :disabled="keywordActionPending">
                                <template #append>
                                    <el-button @click="addKeyword" :loading="keywordActionPending" size="small">
                                        <el-icon>
                                            <Plus />
                                        </el-icon>
                                    </el-button>
                                </template>
                            </el-input>
                        </div>
                    </div>
                </div>

                <el-divider />

                <!-- Properties -->
                <div class="section properties-section">
                    <div class="section-title">属性</div>
                    <div class="props-list">
                        <div v-for="prop in propertys" :key="prop.name + prop.value" class="prop-item">
                            <span class="prop-name">{{ prop.name }}</span>
                            <span class="prop-value">{{ prop.value }}</span>
                            <el-button link type="danger" @click="removeProperty(prop)"
                                class="delete-prop">
                                <el-icon>
                                    <Delete />
                                </el-icon>
                            </el-button>
                        </div>
                    </div>

                    <div class="add-prop-row">
                        <el-input ref="propertyNameInput" v-model="newPropertyName" placeholder="属性名"
                            style="width: 35%" @keyup.enter.prevent="focusPropertyValueInput"
                            :disabled="propertyActionPending" />
                        <el-input ref="propertyValueInput" v-model="newPropertyValue" placeholder="属性值"
                            style="flex: 1" @keyup.enter.prevent="handlePropertyValueEnter"
                            :disabled="propertyActionPending" />
                        <el-button @click="addProperty" :loading="propertyActionPending">添加</el-button>
                    </div>
                </div>

                <el-divider />

                <!-- Text / OCR -->
                <div class="section text-section">
                    <div class="section-header">
                        <div class="section-title">文本内容</div>
                        <div class="actions">
                            <el-button v-if="!enableEditText" link size="small" @click="newOCRTask">OCR识别</el-button>
                            <el-button v-if="!enableEditText" link type="primary" size="small"
                                @click="startEditText">编辑</el-button>
                            <el-button v-else link type="primary" size="small" @click="submitEditText">保存</el-button>
                        </div>
                    </div>
                    <div class="text-content-wrapper">
                        <el-input v-model="imgText" type="textarea" :rows="10" placeholder="暂无文本信息"
                            :readonly="!enableEditText" resize="none" class="text-area-custom" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Reset & Layout */
.layout-container {
    display: flex;
    margin: 0 auto;
    height: calc(100vh - 60px);
    width: 100vw;
    background-color: #fff;
}

/* Left: Image Viewer */
.image-viewer {
    flex: 1;
    background-color: #f5f5f7;
    /* Neutral gray */
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.image-stage {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: auto;
    padding: 20px;
}

.image-content {
    min-height: 100%;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    transition: width 0.2s ease-out;
}

.main-image {
    width: 100%;
    height: auto;
    display: block;
}

.image-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    color: #909399;
    gap: 10px;
}

.zoom-bar {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    padding: 4px;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(4px);
}

/* Right: Details Panel */
.details-panel {
    width: 400px;
    background: #fff;
    border-left: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    padding-right: 10px;
    z-index: 10;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

/* Typography & Sections */
.section {
    margin-bottom: 8px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 12px;
}

.title-display {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    line-height: 1.4;
    word-break: break-word;
}

.title-input {
    font-size: 16px;
}

.meta-row {
    display: flex;
    align-items: center;
    gap: 12px;
    color: #606266;
    font-size: 14px;
}

.label {
    color: #909399;
}

.section-title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
    margin-bottom: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

/* Keywords */
.tags-wrapper {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
}

.custom-tag {
    border-radius: 4px;
}

.add-tag-wrapper {
    width: 120px;
}

/* Properties */
.props-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 12px;
}

.prop-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background-color: #f9fafc;
    border-radius: 6px;
    font-size: 14px;
}

.prop-name {
    color: #606266;
    font-weight: 500;
}

.prop-value {
    color: #303133;
    flex: 1;
    text-align: right;
    margin: 0 12px;
}

.delete-prop {
    padding: 0;
    height: auto;
    opacity: 0.5;
}

.delete-prop:hover {
    opacity: 1;
}

.add-prop-row {
    display: flex;
    gap: 8px;
}

/* Text Area */
.text-area-custom :deep(.el-textarea__inner) {
    background-color: #f9fafc;
    border: none;
    padding: 12px;
    font-size: 14px;
    line-height: 1.6;
    color: #303133;
}

.text-area-custom :deep(.el-textarea__inner:focus) {
    background-color: #fff;
    box-shadow: 0 0 0 1px #409eff inset;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .layout-container {
        flex-direction: column;
        height: auto;
        min-height: 100vh;
    }

    .image-viewer {
        height: 50vh;
        flex: none;
        border-bottom: 1px solid #e4e7ed;
    }

    .details-panel {
        width: 100%;
        height: auto;
        border-left: none;
        flex: 1;
    }

    .panel-content {
        padding: 20px;
    }
}
</style>