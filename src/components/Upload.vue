<script setup lang="ts">
import {
    getSearchHints,
    uploadImage,
    listUnprocessedImages,
    reprocessImage,
    setImageInfo,
    createKeyword,
    createProperty,
    deleteKeyword,
    deleteProperty,
    getImageDetail,
    executeOcrMission,
    newOcrMission,
    predictImage
} from '@/api/componentRequests';
import { GetBlobImgSrc, ResponseWithError } from '@/api/token';
import { ref, computed, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElLoading, ElMessageBox, ElInput } from 'element-plus';
import type { UploadFile } from 'element-plus';
import { debounce } from 'lodash';
import { Plus, Delete, UploadFilled, Picture, ZoomIn, ZoomOut, Refresh, Connection, List } from '@element-plus/icons-vue';

const router = useRouter();

// Mode Management
type UploadMode = 'normal' | 'quick' | 'reprocess';
const mode = ref<UploadMode>('normal');
const isReprocessMode = computed(() => mode.value === 'reprocess');
const isQuickMode = computed(() => mode.value === 'quick');

const switchMode = async (newMode: UploadMode) => {
    if (mode.value === newMode) return;

    if (fileQueue.value.length > 0) {
        try {
            await ElMessageBox.confirm('切换模式将清空当前队列，是否继续？', '提示', {
                confirmButtonText: '确定',
                cancelButtonText: '取消',
                type: 'warning'
            });
        } catch {
            return;
        }
    }

    fileQueue.value = [];
    mode.value = newMode;
    currentIndex.value = 0;

    if (newMode === 'reprocess') {
        loadUnprocessedImages();
    }
};

const loadUnprocessedImages = async () => {
    const loading = ElLoading.service({ text: '加载待处理图片...' });
    try {
        const list = await listUnprocessedImages();
        fileQueue.value = list.map((src, index) => ({
            uid: -index - 1,
            previewUrl: '', // Will load asynchronously
            src: src
        }));

        if (fileQueue.value.length === 0) {
            ElMessage.info('暂无待处理图片');
        } else {
            // Load the first one immediately
            selectFile(0);
        }

        // Lazy load previews
        for (const item of fileQueue.value) {
            try {
                if (item.src) {
                    const blobUrl = await GetBlobImgSrc("/imagebed/" + item.src);
                    item.previewUrl = blobUrl;
                }
            } catch (e) {
                console.error(`Failed to load preview for ${item.src}`, e);
            }
        }
    } catch (e) {
        console.error(e);
        ElMessage.error('加载列表失败');
    } finally {
        loading.close();
    }
};

// Queue Management
interface QueueItem {
    file?: File;
    uid: number;
    previewUrl: string;
    src?: string;
    originalData?: {
        keywords: string[];
        properties: { name: string; value: string }[];
    };
}

const fileQueue = ref<QueueItem[]>([]);
const currentIndex = ref(0);
const currentFile = computed(() => fileQueue.value[currentIndex.value]);

// Zoom Controls
const zoomLevel = ref(1);
const minZoom = 0.1;
const maxZoom = 5;
const zoomStep = 0.2;

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

// Form Data
const imgTitle = ref('');
const imgDate = ref(new Date().toISOString().split('T')[0]);
const isOCR = ref(true);
const keywords = ref<string[]>([]);
const newKeyword = ref('');
const properties = ref<{ name: string; value: string }[]>([]);
const newPropertyName = ref('');
const newPropertyValue = ref('');

// Hints
const keywordsHint = ref<string[]>([]);
const propertiesHint = ref<string[]>([]);

const updateSearchHint = debounce(async () => {
    try {
        let data = await getSearchHints();
        keywordsHint.value = data.keywords;
        propertiesHint.value = data.properties;
    } catch (e) {
        console.error(e);
    }
}, 300);

updateSearchHint();

// Autocomplete Helpers
const createFilter = (queryString: string) => {
    return (item: string) => {
        return (item.toLowerCase().indexOf(queryString.toLowerCase()) === 0);
    };
};

const querySearchKeywords = (queryString: string, cb: any) => {
    const results = queryString
        ? keywordsHint.value.filter(createFilter(queryString))
        : keywordsHint.value;
    cb(results.map(v => ({ value: v })));
};

const querySearchProps = (queryString: string, cb: any) => {
    const results = queryString
        ? propertiesHint.value.filter(createFilter(queryString))
        : propertiesHint.value;
    cb(results.map(v => ({ value: v })));
};

const handleSelectKeyword = (item: any) => {
    newKeyword.value = item.value;
    addKeyword();
};

// File Operations
const handleFileChange = async (uploadFile: UploadFile) => {
    if (!uploadFile.raw) return;

    if (isQuickMode.value) {
        // Quick Mode: Upload Immediately
        const loadingInstance = ElLoading.service({
            lock: true,
            text: `快速上传中: ${uploadFile.name}`,
            background: 'rgba(0, 0, 0, 0.7)',
        });

        try {
            const formData = new FormData();
            formData.append('image', uploadFile.raw);
            formData.append('title', uploadFile.name); // Just filename
            formData.append('date', new Date().toISOString().split('T')[0]); // Today
            formData.append('doOCR', 'false');
            formData.append('keywords', '[]');
            formData.append('properties', '[]');
            formData.append('unprocessed', 'true');

            const res = await uploadImage(formData);
            if (res.message) {
                ElMessage.warning(res.md5 + ': ' + res.message);
            } else {
                ElMessage.success(`上传成功: ${uploadFile.name}， MD5: ${res.md5}`);
            }
        } catch (error: unknown) {
            if (error instanceof ResponseWithError) {
                ElMessage.warning(`上传失败: ${uploadFile.name}, ${error.data?.md5}, ${error.data?.message || '未知错误'}`);
            } else {
                ElMessage.error(`上传失败: ${uploadFile.name}, 未知错误。`);
            }

        } finally {
            loadingInstance.close();
        }
        return;
    }

    if (isReprocessMode.value) {
        ElMessage.warning('补全模式下无法上传新图片');
        return;
    }

    if (uploadFile.raw) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const newItem: QueueItem = {
                file: uploadFile.raw!,
                uid: uploadFile.uid,
                previewUrl: e.target?.result as string
            };
            fileQueue.value.push(newItem);

            // If this is the first file added, init form
            if (fileQueue.value.length === 1) {
                currentIndex.value = 0;
                initFormForFile(newItem);
            }
        };
        reader.readAsDataURL(uploadFile.raw);
    }
};

const initFormForFile = async (item: QueueItem) => {
    keywords.value = [];
    properties.value = [];

    if (isReprocessMode.value && item.src) {
        // Load existing data
        const loading = ElLoading.service({ target: '.details-panel', text: '加载详情...' });
        try {
            const data = await getImageDetail(item.src);
            imgTitle.value = data.title || '';
            imgDate.value = data.date || new Date().toISOString().split('T')[0];
            keywords.value = data.keywords ? [...data.keywords] : [];
            properties.value = data.propertys ? data.propertys.map(p => ({ name: p.name, value: p.value })) : [];

            item.originalData = {
                keywords: [...keywords.value],
                properties: [...properties.value]
            };
        } catch (e) {
            console.error(e);
            ElMessage.error('获取详情失败');
        } finally {
            loading.close();
        }
    } else if (item.file) {
        const name = item.file.name;
        imgTitle.value = name.substring(0, name.lastIndexOf('.')) || name;
        imgDate.value = new Date().toISOString().split('T')[0];
    }
};

const selectFile = async (index: number) => {
    if (index >= 0 && index < fileQueue.value.length) {
        currentIndex.value = index;
        await initFormForFile(fileQueue.value[index]);
    }
};

const removeFile = (index: number) => {
    fileQueue.value.splice(index, 1);
    if (fileQueue.value.length === 0) {
        currentIndex.value = 0;
    } else {
        if (index < currentIndex.value) {
            currentIndex.value--;
        } else if (index === currentIndex.value) {
            if (currentIndex.value >= fileQueue.value.length) {
                currentIndex.value = fileQueue.value.length - 1;
            }
            initFormForFile(fileQueue.value[currentIndex.value]);
        }
    }
};

const handlePredict = async () => {
    if (!imgTitle.value.trim()) return;

    // Only predict if keywords/properties are empty? Or always merge?
    // User asked to "automatically fill", usually implies assist.
    // Let's merge.

    const loadingInstance = ElLoading.service({
        target: '.details-panel',
        text: 'AI 预测中...',
        background: 'rgba(255, 255, 255, 0.7)',
    });

    try {
        const res = await predictImage(imgTitle.value);
        
        if (res.keywords) {
            res.keywords.forEach(k => {
                if (!keywords.value.includes(k)) {
                    keywords.value.push(k);
                }
            });
        }

        if (res.properties) {
            res.properties.forEach(p => {
                // Check for duplicate name/value pair
                const exists = properties.value.some(
                    curr => curr.name === p.name && curr.value === p.value
                );
                if (!exists) {
                    properties.value.push({ name: p.name, value: p.value });
                }
            });
        }
        
        if ((res.keywords && res.keywords.length > 0) || (res.properties && res.properties.length > 0)) {
            ElMessage.success('已自动填充预测信息');
        }
        
    } catch (e) {
        console.error('Predict failed', e);
        // Don't disturb user too much if auto-fetch fails
    } finally {
        loadingInstance.close();
    }
};

const submitCurrent = async () => {
    if (!currentFile.value) return;

    // Reprocess Mode Logic
    if (isReprocessMode.value) {
        await submitReprocess();
        return;
    }

    if (!imgTitle.value.trim()) {
        ElMessage.warning('请输入标题');
        return;
    }

    if (!currentFile.value.file) return;

    const loadingInstance = ElLoading.service({
        lock: true,
        text: '上传中...',
        background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
        const formData = new FormData();
        formData.append('image', currentFile.value.file);
        formData.append('title', imgTitle.value);
        formData.append('date', imgDate.value);
        formData.append('doOCR', isOCR.value ? 'true' : 'false');
        formData.append('keywords', JSON.stringify(keywords.value));
        formData.append('properties', JSON.stringify(properties.value));

        await uploadImage(formData);
        ElMessage.success('上传成功');

        // Remove current file and move to next
        removeFile(currentIndex.value);

    } catch (error: unknown) {
            if (error instanceof ResponseWithError) {
                ElMessage.warning(`上传失败: ${currentFile.value.file.name}, ${error.data?.md5}, ${error.data?.message || '未知错误'}`);
            } else {
                ElMessage.error(`上传失败: ${currentFile.value.file.name}, 未知错误。`);
            }

        } finally {
            loadingInstance.close();
        }
};

const submitReprocess = async () => {
    const item = currentFile.value;
    if (!item?.src) return;

    const loadingInstance = ElLoading.service({
        lock: true,
        text: '更新中...',
        background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
        // 1. Set Basic Info
        await setImageInfo({
            src: item.src,
            title: imgTitle.value,
            date: imgDate.value
        });

        // 2. Sync Keywords
        const originalKeywords = item.originalData?.keywords || [];
        const currentKeywords = keywords.value;

        const toAddK = currentKeywords.filter(k => !originalKeywords.includes(k));
        const toDeleteK = originalKeywords.filter(k => !currentKeywords.includes(k));

        for (const k of toAddK) {
            try { await createKeyword(item.src, k); } catch { }
        }
        for (const k of toDeleteK) {
            try { await deleteKeyword(item.src, k); } catch { }
        }

        // 3. Sync Properties
        const originalProps = item.originalData?.properties || [];
        const currentProps = properties.value;

        // Use JSON stringify for simple object comparison
        const opSet = new Set(originalProps.map(p => JSON.stringify(p)));
        const cpSet = new Set(currentProps.map(p => JSON.stringify(p)));

        const toAddP = currentProps.filter(p => !opSet.has(JSON.stringify(p)));
        const toDeleteP = originalProps.filter(p => !cpSet.has(JSON.stringify(p)));

        for (const p of toAddP) {
            try { await createProperty(item.src, p.name, p.value); } catch { }
        }
        for (const p of toDeleteP) {
            try { await deleteProperty(item.src, p.name, p.value); } catch { }
        }

        if (isOCR.value) {
            await newOcrMission(item.src);
            await executeOcrMission(item.src);
        }

        // 4. Reprocess / Confirm
        await reprocessImage(item.src);

        ElMessage.success('处理完成');
        removeFile(currentIndex.value);

    } catch (error) {
        console.error(error);
        ElMessage.error('提交失败');
    } finally {
        loadingInstance.close();
    }
};


// Keyword & Property Logic
const addKeyword = () => {
    const val = newKeyword.value.trim();
    if (val && !keywords.value.includes(val)) {
        keywords.value.push(val);
        newKeyword.value = '';
    }
};

const removeKeyword = (k: string) => {
    keywords.value = keywords.value.filter(item => item !== k);
};

const addProperty = () => {
    const name = newPropertyName.value.trim();
    const value = newPropertyValue.value.trim();
    if (name && value) {
        properties.value.push({ name, value });
        newPropertyName.value = '';
        newPropertyValue.value = '';
    }
    propertyNameInput.value?.focus();
};

const removeProperty = (index: number) => {
    properties.value.splice(index, 1);
};

const propertyValueInput = ref<InstanceType<typeof ElInput> | null>(null);
const propertyNameInput = ref<InstanceType<typeof ElInput> | null>(null);

const focusPropertyValueInput = () => {
    propertyValueInput.value?.focus();
};

</script>

<template>
    <div class="layout-container">
        <!-- Left: Image Viewer & Queue -->
        <div class="image-viewer">
            <!-- Empty State / Drop Zone -->
            <div v-if="fileQueue.length === 0" class="empty-state">
                <el-upload class="upload-drop-zone" drag multiple :auto-upload="false" :show-file-list="false"
                    :on-change="handleFileChange" accept="image/*" :disabled="isReprocessMode">
                    <el-icon class="el-icon--upload">
                        <upload-filled />
                    </el-icon>
                    <div class="el-upload__text" v-if="isQuickMode">
                        <span style="color: #E6A23C">快速模式:</span> 直接上传图片，稍后补全信息
                    </div>
                    <div class="el-upload__text" v-else-if="isReprocessMode">
                        请点击右侧加载待处理图片
                    </div>
                    <div class="el-upload__text" v-else>
                        拖拽图片到此处 或 <em>点击上传</em>
                    </div>
                </el-upload>
            </div>

            <!-- Image Preview -->
            <div v-else class="image-stage">
                <div class="image-content" :style="{ width: `${zoomLevel * 100}%` }">
                    <el-image :src="currentFile.previewUrl" :preview-src-list="[currentFile.previewUrl]"
                        class="main-image" />
                </div>
            </div>

            <!-- Floating Zoom Controls -->
            <div v-if="fileQueue.length > 0" class="zoom-bar">
                <el-button-group>
                    <el-button :icon="ZoomOut" circle @click="zoomOut" :disabled="zoomLevel <= minZoom" />
                    <el-button @click="resetZoom" :disabled="zoomLevel === 1">{{ Math.round(zoomLevel * 100)
                    }}%</el-button>
                    <el-button :icon="ZoomIn" circle @click="zoomIn" :disabled="zoomLevel >= maxZoom" />
                </el-button-group>
            </div>

            <!-- Thumbnail Strip -->
            <div v-if="fileQueue.length > 0" class="thumbnail-strip">
                <div class="strip-content">
                    <div v-for="(item, index) in fileQueue" :key="item.uid" class="thumb-item"
                        :class="{ active: index === currentIndex }" @click="selectFile(index)">
                        <el-image :src="item.previewUrl" fit="cover" class="thumb-img" />
                        <div class="thumb-overlay" @click.stop="removeFile(index)">
                            <el-icon>
                                <Delete />
                            </el-icon>
                        </div>
                    </div>
                    <!-- Add More -->
                    <el-upload class="thumb-uploader" multiple :auto-upload="false" :show-file-list="false"
                        :on-change="handleFileChange" accept="image/*" v-if="!isReprocessMode">
                        <div class="add-thumb">
                            <el-icon>
                                <Plus />
                            </el-icon>
                        </div>
                    </el-upload>
                </div>
            </div>
        </div>

        <!-- Right: Details Panel -->
        <div class="details-panel">
            <div class="mode-switch-wrapper">
                <el-radio-group v-model="mode" size="small" @change="switchMode">
                    <el-radio-button label="normal">普通上传</el-radio-button>
                    <el-radio-button label="quick">快速上传</el-radio-button>
                    <el-radio-button label="reprocess">补全信息</el-radio-button>
                </el-radio-group>
            </div>

            <div v-if="fileQueue.length === 0" class="panel-empty">
                <el-empty description="列表为空" />
                <el-button v-if="isReprocessMode" type="primary" @click="loadUnprocessedImages">刷新列表</el-button>
            </div>
            <div v-else class="panel-content">
                <!-- Header -->
                <div class="section basic-info">
                    <div class="section-header">
                        <div class="header-left">
                            <span class="queue-info">剩余: {{ fileQueue.length }}</span>
                        </div>
                        <el-button type="primary" @click="submitCurrent">
                            <el-icon>
                                <UploadFilled />
                            </el-icon> {{ isReprocessMode ? '确认完成' : '提交当前' }}
                        </el-button>
                    </div>

                    <el-form label-position="top" size="default">
                        <el-form-item label="标题">
                            <el-input v-model="imgTitle" placeholder="图片标题" @blur="handlePredict" />
                        </el-form-item>
                        <el-row :gutter="10">
                            <el-col :span="12">
                                <el-form-item label="日期">
                                    <el-date-picker v-model="imgDate" type="date" placeholder="选择日期" style="width: 100%"
                                        format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
                                </el-form-item>
                            </el-col>
                            <el-col :span="12">
                                <el-form-item label="OCR">
                                    <el-switch v-model="isOCR" active-text="启用" />
                                </el-form-item>
                            </el-col>
                        </el-row>
                    </el-form>
                </div>

                <el-divider />

                <!-- Keywords -->
                <div class="section">
                    <div class="section-title">关键词</div>
                    <div class="tags-wrapper">
                        <el-tag v-for="k in keywords" :key="k" closable type="info" effect="plain"
                            @close="removeKeyword(k)" class="custom-tag" style="height: 32px;">
                            {{ k }}
                        </el-tag>

                        <div class="add-tag-wrapper">
                            <el-autocomplete v-model="newKeyword" :fetch-suggestions="querySearchKeywords"
                                placeholder="新关键词" class="new-tag-input" @select="handleSelectKeyword"
                                @keyup.enter="addKeyword">
                                <template #append>
                                    <el-button @click="addKeyword" size="small">
                                        <el-icon>
                                            <Plus />
                                        </el-icon>
                                    </el-button>
                                </template>
                            </el-autocomplete>
                        </div>
                    </div>
                </div>

                <el-divider />

                <!-- Properties -->
                <div class="section">
                    <div class="section-title">属性</div>
                    <div class="props-list">
                        <div v-for="(p, i) in properties" :key="i" class="prop-item">
                            <span class="prop-name">{{ p.name }}</span>
                            <span class="prop-value">{{ p.value }}</span>
                            <el-button link type="danger" size="small" @click="removeProperty(i)">
                                <el-icon>
                                    <Delete />
                                </el-icon>
                            </el-button>
                        </div>
                    </div>
                    <div class="add-prop-row">
                        <el-autocomplete ref="propertyNameInput" v-model="newPropertyName"
                            :fetch-suggestions="querySearchProps" placeholder="属性名" style="width: 40%"
                            @keyup.enter.prevent="focusPropertyValueInput" />
                        <el-input ref="propertyValueInput" v-model="newPropertyValue" placeholder="属性值" style="flex: 1"
                            @keyup.enter="addProperty" />
                        <el-button @click="addProperty">添加</el-button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Layout */
.layout-container {
    display: flex;
    height: 95vh;
    width: 100vw;
    overflow: hidden;
    background-color: #fff;
}

.image-viewer {
    flex: 1;
    background-color: #f5f5f7;
    position: relative;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    height: 100%;
    /* Fix height for reliable scrolling */
}

.empty-state {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
}

.upload-drop-zone {
    width: 100%;
    max-width: 400px;
}

.image-stage {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    overflow: auto;
    padding: 20px;
    padding-bottom: 120px;
    /* Space for thumbnail strip */
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

.zoom-bar {
    position: absolute;
    bottom: 110px;
    /* Above thumbnail strip */
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 255, 255, 0.9);
    padding: 4px;
    border-radius: 20px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(4px);
    z-index: 20;
}

/* Thumbnail Strip */
.thumbnail-strip {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 90px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(10px);
    border-top: 1px solid #e4e7ed;
    padding: 10px;
    z-index: 10;
}

.strip-content {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    height: 100%;
    align-items: center;
    padding: 0 10px;
}

.thumb-item {
    width: 60px;
    height: 60px;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    border: 2px solid transparent;
    flex-shrink: 0;
    transition: all 0.2s;
}

.thumb-item.active {
    border-color: #409eff;
    transform: translateY(-2px);
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.thumb-img {
    width: 100%;
    height: 100%;
    display: block;
}

.thumb-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
    color: #fff;
}

.thumb-item:hover .thumb-overlay {
    opacity: 1;
}

.add-thumb {
    width: 60px;
    height: 60px;
    border-radius: 6px;
    border: 1px dashed #dcdfe6;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #909399;
    transition: all 0.2s;
}

.add-thumb:hover {
    border-color: #409eff;
    color: #409eff;
}

.mode-switch-wrapper {
    padding: 12px;
    border-bottom: 1px solid #f0f0f0;
    display: flex;
    justify-content: center;
}

.details-panel {
    width: 400px;
    background: #fff;
    border-left: 1px solid #e4e7ed;
    display: flex;
    flex-direction: column;
    z-index: 10;
}

.panel-empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    /* Allow button to stack */
    align-items: center;
    justify-content: center;
}

.panel-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
}

.section {
    margin-bottom: 16px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.queue-info {
    font-size: 14px;
    color: #606266;
    font-weight: 500;
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
    width: 140px;
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

.add-prop-row {
    display: flex;
    gap: 8px;
}

/* Mobile Responsive */
@media (max-width: 768px) {
    .layout-container {
        flex-direction: column;
        height: auto;
        min-height: 100vh;
    }

    .image-viewer {
        height: 70vh;
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