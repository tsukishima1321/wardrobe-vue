<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref, computed } from 'vue';
import { ElMessage, ElLoading, ElInput, ElMessageBox } from 'element-plus';
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
    setImageText,
    addImageToCollection,
    removeImageFromCollection,
    deleteCollection,
    deleteImage,
    listCollectionImages,
    likeCollectionImage
} from '@/api/componentRequests';
import type { CollectionItem } from '@/api/componentRequests';
import { ZoomIn, ZoomOut, Refresh, Picture, Edit, Check, Plus, Delete, Collection, Upload as UploadIcon, Star, StarFilled } from '@element-plus/icons-vue';
import { ElImageViewer } from 'element-plus';

const router = useRouter();
const imgSrc = ref(router.currentRoute.value.params.src);
const blobSrc = ref('');
const enableEdit = ref(false);
const enableEditText = ref(false);
const imgLoading = ref(true);

// Collection state
const isCollection = ref(false);
const collectionItems = ref<Array<CollectionItem & { blobSrc: string }>>([]);
const collectionLoading = ref(false);
const addImageDialogVisible = ref(false);
const selectedFiles = ref<File[]>([]);
const addingImages = ref(false);
const addProgress = ref(0);
const addTotal = ref(0);
const previewVisible = ref(false);
const previewList = ref<string[]>([]);
const previewIndex = ref(0);

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
    is_collection?: boolean,
    items?: CollectionItem[],
    keywords?: Array<string>,
    propertys?: Array<ImageProperty>
}

const loadCollectionImages = async () => {
    if (!isCollection.value) return;
    collectionLoading.value = true;
    try {
        const items = await listCollectionImages(imgSrc.value as string);
        collectionItems.value = items.map(item => ({ ...item, blobSrc: '' }));
        // Load thumbnails only
        for (const item of collectionItems.value) {
            GetBlobImgSrc("/imagebed/thumbnails/" + item.image_href).then(src => {
                item.blobSrc = src;
            }).catch(() => { });
        }
    } catch {
        ElMessage.error('加载合集图片失败');
    } finally {
        collectionLoading.value = false;
    }
};

const loadImg = async () => {
    imgLoading.value = true;
    try {
        const r = await getImageDetail(imgSrc.value as string) as imgData;
        imgTitle.value = r.title;
        imgText.value = r.text;
        imgDate.value = r.date;
        isCollection.value = !!r.is_collection;
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
    } finally {
        imgLoading.value = false;
    }

    if (isCollection.value) {
        await loadCollectionImages();
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

// Collection methods
const handleAddImageFiles = (file: any) => {
    if (file.raw) {
        selectedFiles.value.push(file.raw);
    }
    return false;
};

const submitAddImages = async () => {
    if (selectedFiles.value.length === 0) {
        ElMessage.warning('请选择要添加的图片');
        return;
    }
    addingImages.value = true;
    addTotal.value = selectedFiles.value.length;
    addProgress.value = 0;
    try {
        for (const file of selectedFiles.value) {
            await addImageToCollection(imgSrc.value as string, file);
            addProgress.value++;
        }
        ElMessage.success(`成功添加 ${selectedFiles.value.length} 张图片`);
        selectedFiles.value = [];
        addImageDialogVisible.value = false;
        await loadCollectionImages();
        // Refresh thumbnail (the backend regenerates it)
        blobSrc.value = await GetBlobImgSrc("/imagebed/" + imgSrc.value + '?t=' + Date.now());
    } catch (error: any) {
        if (error?.data?.status === 'Already exists') {
            ElMessage.warning('部分图片已在合集中');
        } else {
            ElMessage.error('添加图片失败');
        }
    } finally {
        addingImages.value = false;
    }
};

const handleRemoveFromCollection = async (imageHref: string) => {
    try {
        await ElMessageBox.confirm('确定从合集中移除此图片吗？', '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });
        await removeImageFromCollection(imgSrc.value as string, imageHref);
        ElMessage.success('图片已从合集中移除');
        await loadCollectionImages();
        blobSrc.value = await GetBlobImgSrc("/imagebed/" + imgSrc.value + '?t=' + Date.now());
    } catch (e) {
        // cancelled or error
    }
};

const handleLikeCollection = async (imageHref: string) => {
    try {
        const item = collectionItems.value.find(i => i.image_href === imageHref);
        if (!item) return;
        const response = await likeCollectionImage(imgSrc.value as string, imageHref, !(item.liked));
        item.liked = response.liked;
        ElMessage.success(response.liked ? '已点赞' : '已取消点赞');
    } catch {
        ElMessage.error('操作失败，请重试');
    }
};

const handleDeleteThis = async () => {
    const label = isCollection.value ? '合集' : '图片';
    try {
        await ElMessageBox.confirm(`确定删除此${label}吗？此操作不可恢复。`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });
        if (isCollection.value) {
            await deleteCollection(imgSrc.value as string);
        } else {
            await deleteImage(imgSrc.value as string);
        }
        ElMessage.success(`${label}已删除`);
        window.close();
    } catch (e) {
        // cancelled
    }
};

const openCollectionPreview = async (index: number) => {
    const loading = ElLoading.service({
        lock: true,
        text: '原图加载中...',
        background: 'rgba(0, 0, 0, 0.7)',
    });
    const item = collectionItems.value[index];
    if (!item) return;
    try {
        const fullSrc = await GetBlobImgSrc("/imagebed/" + item.image_href);
        previewList.value = [fullSrc];
        previewIndex.value = 0;
        previewVisible.value = true;
    } catch {
        ElMessage.error('图片加载失败');
    } finally {
        loading.close();
    }
};

loadImg();

</script>

<template>
    <div class="layout-container">
        <!-- Left: Image Viewer / Collection Gallery -->
        <div class="image-viewer">
            <!-- Single image mode -->
            <template v-if="!isCollection">
                <div class="image-stage">
                    <div class="image-content" :style="{ width: `${zoomLevel * 100}%` }">
                        <el-skeleton v-if="imgLoading" animated>
                            <template #template>
                                <el-skeleton-item variant="image"
                                    style="width: 100%; height: 80vh; border-radius: 8px;" />
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
            </template>

            <!-- Collection gallery mode -->
            <template v-else>
                <div class="collection-gallery">
                    <div class="collection-header">
                        <div class="collection-badge-title">
                            <el-icon>
                                <Collection />
                            </el-icon>
                            <span>合集 · {{ collectionItems.length }} 张图片</span>
                        </div>
                        <el-button type="primary" :icon="Plus" @click="addImageDialogVisible = true">添加图片</el-button>
                    </div>
                    <div class="collection-grid" v-loading="collectionLoading">
                        <div v-for="(item, index) in collectionItems" :key="item.image_href"
                            class="collection-grid-item">
                            <div class="collection-img-wrapper">
                                <el-image :src="item.blobSrc" fit="cover" class="collection-thumb"
                                    @click="openCollectionPreview(index)">
                                    <template #error>
                                        <div class="image-error">
                                            <el-icon>
                                                <Picture />
                                            </el-icon>
                                        </div>
                                    </template>
                                </el-image>
                                <div class="collection-item-actions-like" :class="{ 'is-liked': item.liked }">
                                    <el-button :type="item.liked ? 'warning' : 'default'" :icon="item.liked ? StarFilled : Star" circle size="small"
                                        @click.stop="handleLikeCollection(item.image_href)" />
                                </div>
                                <div class="collection-item-actions-delete">
                                    <el-button type="danger" :icon="Delete" circle size="small"
                                        @click.stop="handleRemoveFromCollection(item.image_href)" />
                                </div>
                            </div>
                            <div class="collection-item-label">{{ item.image_href }}</div>
                        </div>
                        <div v-if="collectionItems.length === 0 && !collectionLoading" class="collection-empty">
                            <el-empty description="合集中暂无图片，点击上方按钮添加" />
                        </div>
                    </div>
                </div>

                <!-- Add images dialog -->
                <el-dialog v-model="addImageDialogVisible" title="向合集添加图片" width="500px">
                    <el-upload drag multiple :auto-upload="false" :on-change="handleAddImageFiles" accept="image/*">
                        <el-icon class="el-icon--upload">
                            <UploadIcon />
                        </el-icon>
                        <div class="el-upload__text">
                            拖拽文件到此处，或<em>点击上传</em>
                        </div>
                    </el-upload>
                    <template #footer>
                        <div v-if="addingImages" style="width: 100%; margin-bottom: 12px;">
                            <el-progress :percentage="addTotal > 0 ? Math.round(addProgress / addTotal * 100) : 0"
                                :format="() => `${addProgress} / ${addTotal}`" :stroke-width="20" :text-inside="true" />
                        </div>
                        <el-button @click="addImageDialogVisible = false; selectedFiles = []" :disabled="addingImages">取消</el-button>
                        <el-button type="primary" @click="submitAddImages" :loading="addingImages">
                            上传 {{ selectedFiles.length }} 张图片
                        </el-button>
                    </template>
                </el-dialog>

                <!-- Full-size image preview viewer -->
                <ElImageViewer v-if="previewVisible" :url-list="previewList" :initial-index="previewIndex"
                    :z-index="2000" @close="previewVisible = false" />
            </template>
        </div>

        <!-- Right: Details Panel -->
        <div class="details-panel">
            <div class="panel-content">
                <!-- Collection indicator -->
                <div v-if="isCollection" class="collection-indicator">
                    <el-icon>
                        <Collection />
                    </el-icon>
                    <span>图片合集</span>
                </div>

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
                            <el-button link type="danger" @click="removeProperty(prop)" class="delete-prop">
                                <el-icon>
                                    <Delete />
                                </el-icon>
                            </el-button>
                        </div>
                    </div>

                    <div class="add-prop-row">
                        <el-input ref="propertyNameInput" v-model="newPropertyName" placeholder="属性名" style="width: 35%"
                            @keyup.enter.prevent="focusPropertyValueInput" :disabled="propertyActionPending" />
                        <el-input ref="propertyValueInput" v-model="newPropertyValue" placeholder="属性值" style="flex: 1"
                            @keyup.enter.prevent="handlePropertyValueEnter" :disabled="propertyActionPending" />
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

                <el-divider />

                <!-- Danger Zone -->
                <div class="section danger-section">
                    <el-button type="danger" plain @click="handleDeleteThis" :icon="Delete">
                        删除{{ isCollection ? '合集' : '图片' }}
                    </el-button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Reset & Layout */
.layout-container {
    display: flex;
    height: calc(100vh - 60px);
    width: 100%;
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

    .collection-grid {
        grid-template-columns: repeat(2, 1fr) !important;
    }
}

/* Collection indicator */
.collection-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    background-color: #fdf6ec;
    border: 1px solid #f5dab1;
    border-radius: 6px;
    color: #e6a23c;
    font-size: 14px;
    font-weight: 500;
    margin-bottom: 16px;
}

/* Collection gallery */
.collection-gallery {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    padding: 20px;
}

.collection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.collection-badge-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
    color: #303133;
}

.collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 16px;
    flex: 1;
}

.collection-grid-item {
    display: flex;
    flex-direction: column;
    min-width: 0;
}

.collection-img-wrapper {
    position: relative;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    aspect-ratio: 1;
    background-color: #f5f5f7;
}

.collection-thumb {
    width: 100%;
    height: 100%;
    display: block;
}

.collection-item-actions-delete {
    position: absolute;
    top: 6px;
    right: 6px;
    opacity: 0;
    transition: opacity 0.2s;
}

.collection-item-actions-like {
    position: absolute;
    top: 6px;
    left: 6px;
    opacity: 0;
    transition: opacity 0.2s;
}

.collection-item-actions-like.is-liked {
    opacity: 1;
}

.collection-img-wrapper:hover .collection-item-actions-like,
.collection-img-wrapper:hover .collection-item-actions-delete {
    opacity: 1;
}

.collection-item-label {
    font-size: 11px;
    color: #909399;
    margin-top: 4px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.collection-empty {
    grid-column: 1 / -1;
    padding: 40px 0;
}

/* Danger zone */
.danger-section {
    display: flex;
    justify-content: flex-end;
}
</style>