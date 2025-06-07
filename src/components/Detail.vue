<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref } from 'vue';
import { ElMessage, ElLoading } from 'element-plus';
import { fetchDataAutoRetry, GetBlobImgSrc } from '../token.ts';
import { ZoomIn, ZoomOut, Refresh, Picture, Edit, Check } from '@element-plus/icons-vue';

const router = useRouter();
const imgSrc = ref(router.currentRoute.value.params.src);
const blobSrc = ref('');
const enableEdit = ref(false);
const enableEditText = ref(false);
const types = ref<Array<string>>([]);

const typeSelected = ref('');
const imgTitle = ref('');
const imgText = ref('');
const imgDate = ref('');

// 缩放相关状态
const zoomLevel = ref(1);
const minZoom = 0.1;
const maxZoom = 5;
const zoomStep = 0.2;

interface imgData {
    src: string,
    title: string,
    type: string,
    date: string,
    text: string
}

const loadImg = () => {
    GetBlobImgSrc("/image/" + imgSrc.value).then((res) => {
        blobSrc.value = res;
        fetchDataAutoRetry(`/api/image/get/`, { src: imgSrc.value }, 'POST').then((res) => {
            const r = res as imgData;
            imgTitle.value = r.title;
            imgText.value = r.text;
            imgDate.value = r.date;
            typeSelected.value = r.type;
        }).catch(() => {
            router.push('/login');
        });
    }).catch(() => {
        router.push('/login');
    });
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
            src: imgSrc.value,
            title: imgTitle.value,
            type: typeSelected.value,
            date: imgDate.value,
        };

        await fetchDataAutoRetry(`/api/image/set/`, data, 'POST');
        enableEdit.value = false;
        ElMessage.success('图片信息保存成功！');
        loadImg();
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
            src: imgSrc.value,
            text: imgText.value
        };

        await fetchDataAutoRetry(`/api/text/set/`, data, 'POST');
        enableEditText.value = false;
        ElMessage.success('图片文本保存成功！');
        loadImg();
    } catch (error) {
        console.error('Save text failed:', error);
        ElMessage.error('保存失败，请重试');
        router.push('/login');
    } finally {
        loading.close();
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

fetchDataAutoRetry('/api/types/', {}, 'GET').then((res) => {
    types.value = res as Array<string>;
    loadImg();
}).catch(() => {
    router.push('/login');
});
</script>

<template>
    <el-container class="detail-container">
        <el-main>
            <el-row :gutter="20" style="height: 100%;">
                <!-- 左侧：图片展示区域 -->
                <el-col :span="14">
                    <el-card class="image-card" shadow="hover">                        <template #header>
                            <div class="card-header-with-zoom">
                                <span>图片详情</span>
                                <div class="zoom-controls">
                                    <el-button-group size="small">
                                        <el-button @click="zoomOut" :disabled="zoomLevel <= minZoom">
                                            <el-icon>
                                                <ZoomOut />
                                            </el-icon>
                                        </el-button>
                                        <el-button @click="resetZoom" :disabled="zoomLevel === 1">
                                            <el-icon>
                                                <Refresh />
                                            </el-icon>
                                        </el-button>
                                        <el-button @click="zoomIn" :disabled="zoomLevel >= maxZoom">
                                            <el-icon>
                                                <ZoomIn />
                                            </el-icon>
                                        </el-button>
                                    </el-button-group>
                                    <el-text size="small" class="zoom-level">{{ Math.round(zoomLevel * 100) }}%</el-text>
                                </div>
                            </div>
                        </template>                        <div class="image-container">
                            <div class="image-scroll-wrapper">
                                <el-image :src="blobSrc" :preview-src-list="[blobSrc]" fit="cover"
                                    class="scrollable-image" :style="{ transform: `scale(${zoomLevel})`, transformOrigin: 'center top' }">
                                    <template #error>
                                        <div class="image-slot">
                                            <el-icon>
                                                <Picture />
                                            </el-icon>
                                            <div>图片加载失败</div>
                                        </div>
                                    </template>
                                </el-image>
                            </div>
                        </div>
                    </el-card>
                </el-col>

                <!-- 右侧：信息编辑区域 -->
                <el-col :span="10">
                    <el-space direction="vertical" fill style="width: 100%;" :size="20">
                        <!-- 图片基本信息 -->
                        <el-card class="info-card" shadow="hover">
                            <template #header>
                                <div class="card-header-with-action">
                                    <span>基本信息</span> <el-button v-if="!enableEdit" type="primary" size="small"
                                        @click="startEdit">
                                        <el-icon>
                                            <Edit />
                                        </el-icon>
                                        编辑
                                    </el-button>
                                    <el-button v-else type="success" size="small" @click="submitEdit">
                                        <el-icon>
                                            <Check />
                                        </el-icon>
                                        保存
                                    </el-button>
                                </div>
                            </template>

                            <el-form label-width="80px" size="default">
                                <!-- 图片标题 -->
                                <el-form-item label="标题">
                                    <el-text v-if="!enableEdit" size="large">{{ imgTitle }}</el-text>
                                    <el-input v-else v-model="imgTitle" placeholder="请输入图片标题" clearable />
                                </el-form-item>

                                <!-- 图片类型 -->
                                <el-form-item label="类型">
                                    <el-select v-model="typeSelected" placeholder="请选择图片类型" style="width: 100%;"
                                        :disabled="!enableEdit">
                                        <el-option v-for="type in types" :key="type" :label="type" :value="type" />
                                    </el-select>
                                </el-form-item>

                                <!-- 图片日期 -->
                                <el-form-item label="日期">
                                    <el-date-picker v-model="imgDate" type="date" placeholder="选择日期"
                                        style="width: 100%;" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                                        :disabled="!enableEdit" />
                                </el-form-item>
                            </el-form>
                        </el-card>

                        <!-- 图片文本信息 -->
                        <el-card class="text-card" shadow="hover">
                            <template #header>
                                <div class="card-header-with-action">
                                    <span>文本信息</span> <el-button v-if="!enableEditText" type="primary" size="small"
                                        @click="startEditText">
                                        <el-icon>
                                            <Edit />
                                        </el-icon>
                                        编辑
                                    </el-button>
                                    <el-button v-else type="success" size="small" @click="submitEditText">
                                        <el-icon>
                                            <Check />
                                        </el-icon>
                                        保存
                                    </el-button>
                                </div>
                            </template>

                            <el-input v-model="imgText" type="textarea" :rows="15" placeholder="请输入图片相关文本信息..."
                                :readonly="!enableEditText" resize="none" />
                        </el-card>
                    </el-space>
                </el-col>
            </el-row>
        </el-main>
    </el-container>
</template>

<style scoped>
.detail-container {
    height: 95vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.el-main {
    height: 90vh;
}

.image-card,
.info-card,
.text-card {
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.image-card {
    height: 85vh;
}

.card-header {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.card-header-with-zoom {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    color: #333;
    gap: 20px;
}

.zoom-controls {
    display: flex;
    align-items: center;
    gap: 10px;
}

.zoom-level {
    min-width: 50px;
    text-align: center;
    font-weight: 600;
    color: #666;
}

.card-header-with-action {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 16px;
    font-weight: 600;
    color: #333;
}

.image-container {
    padding: 20px;
    height: calc(85vh - 120px);
    overflow: hidden;
}

.image-scroll-wrapper {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    border-radius: 8px;
    position: relative;
    /* 自定义滚动条样式 */
    scrollbar-width: thin;
    scrollbar-color: rgba(0, 0, 0, 0.3) transparent;
}

/* WebKit浏览器滚动条样式 */
.image-scroll-wrapper::-webkit-scrollbar {
    width: 8px;
}

.image-scroll-wrapper::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
}

.image-scroll-wrapper::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
    border-radius: 4px;
    transition: background 0.3s;
}

.image-scroll-wrapper::-webkit-scrollbar-thumb:hover {
    background: rgba(0, 0, 0, 0.5);
}

.scrollable-image {
    width: 100%;
    min-height: 100%;
    object-fit: contain;
    display: block;
    transition: transform 0.2s ease-in-out;
    transform-origin: center top;
}

.scrollable-image :deep(.el-image__inner) {
    width: 100% !important;
    height: auto !important;
    object-fit: contain;
    cursor: grab;
    transition: transform 0.2s ease-in-out;
}

.scrollable-image :deep(.el-image__inner:active) {
    cursor: grabbing;
}

.image-slot {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    font-size: 14px;
    color: var(--el-text-color-placeholder);
    height: 200px;
}

.image-slot .el-icon {
    font-size: 48px;
    margin-bottom: 8px;
}

.el-form {
    padding: 10px 0;
}

.el-form-item {
    margin-bottom: 20px;
}

.el-text {
    font-size: 16px;
    font-weight: 500;
    color: #333;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .el-main {
        overflow-x: hidden;
        height: auto;
    }

    .detail-container {
        overflow-x: hidden;
        height: auto;
        padding: 10px;
    }

    .el-row {
        flex-direction: column;
    }

    .el-col {
        width: 100% !important;
        max-width: 100% !important;
        margin-bottom: 20px;
    }

    .image-card,
    .info-card,
    .text-card {
        height: auto;
        min-height: auto;
    }

    .image-container {
        padding: 10px;
        height: 60vh;
    }

    .image-scroll-wrapper {
        height: 100%;
    }

    .card-header-with-zoom {
        flex-direction: column;
        gap: 10px;
    }

    .zoom-controls {
        flex-wrap: wrap;
        justify-content: center;
    }
}

/* 竖屏设备优化 */
@media (max-width: 768px) and (orientation: portrait) {
    .detail-container {
        min-height: 100vh;
        padding: 15px;
    }

    .el-main {
        padding: 0;
    }

    .el-row {
        height: auto !important;
        flex-direction: column;
        gap: 20px;
    }

    .image-card {
        order: 1;
    }

    .info-card,
    .text-card {
        order: 2;
    }

    .el-form {
        padding: 10px 0;
    }

    .el-form-item {
        margin-bottom: 16px;
    }
}
</style>