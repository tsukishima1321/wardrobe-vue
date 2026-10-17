<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadFile } from 'element-plus';
import { Search, Upload as UploadIcon, Check } from '@element-plus/icons-vue';
import { GetImageSrc, ResponseWithError } from '@/api/token';
import { searchImages, uploadImage } from '@/api/componentRequests';
import type { SearchRequest } from '@/api/componentRequests';
import { mockImages } from '@/mocks/blog';
import { localDateString } from '@/api/blog';
import type { MockImageResult } from '@/mocks/blog';

const props = withDefaults(defineProps<{
    modelValue: boolean;
    mode?: 'insert' | 'reference';
    date?: string;
    tags?: string[];
    mock?: boolean;
}>(), {
    mode: 'insert',
    date: '',
    tags: () => [],
    mock: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'select', images: MockImageResult[], mode: 'insert' | 'reference'): void;
}>();

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const activeTab = ref<'library' | 'upload'>('library');
const query = ref('');
const loading = ref(false);
const page = ref(1);
const pageSize = 24;
const totalPage = ref(0);
const results = ref<MockImageResult[]>([]);
const selected = ref<MockImageResult[]>([]);
const files = ref<UploadFile[]>([]);
const uploading = ref(false);
const uploadProgress = ref(0);

let requestSeq = 0;

const selectedSet = computed(() => new Set(selected.value.map((item) => item.src)));

const thumbUrl = (src: string): string => {
    if (props.mock || src.startsWith('mock-')) {
        return '/placeholder.png';
    }
    return GetImageSrc(`/imagebed/thumbnails/small/${src}`);
};

const load = async () => {
    if (props.mock) {
        const keyword = query.value.trim();
        results.value = keyword
            ? mockImages.filter((item) => `${item.title} ${item.date}`.includes(keyword))
            : [...mockImages];
        totalPage.value = 1;
        return;
    }

    const seq = ++requestSeq;
    loading.value = true;
    try {
        const params: SearchRequest = {
            searchKey: query.value.trim(),
            page: page.value,
            dateFrom: '2000-01-01',
            dateTo: '2099-01-01',
            byName: true,
            byFullText: true,
            orderBy: 'date',
            order: 'desc',
            pageSize,
            keywords: [],
            properties: [],
            excludedKeywords: [],
            excludedProperties: [],
            propertiesPrecise: false,
        };
        const response = await searchImages(params);
        if (seq !== requestSeq) return;
        results.value = (response.hrefList ?? []).map((item) => ({
            src: item.src,
            title: item.title,
            date: item.date,
            isCollection: Boolean(item.is_collection),
        }));
        totalPage.value = response.totalPage ?? 0;
    } catch (error) {
        if (seq === requestSeq) {
            console.error('load images failed', error);
            ElMessage.error('加载图片失败');
        }
    } finally {
        if (seq === requestSeq) {
            loading.value = false;
        }
    }
};

const reset = () => {
    selected.value = [];
    files.value = [];
    uploadProgress.value = 0;
    page.value = 1;
    query.value = '';
    activeTab.value = 'library';
};

watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        reset();
        void load();
    }
});

const search = () => {
    page.value = 1;
    void load();
};

const changePage = (next: number) => {
    page.value = next;
    void load();
};

const toggle = (image: MockImageResult) => {
    if (props.mode === 'reference') {
        selected.value = selectedSet.value.has(image.src) ? [] : [image];
        return;
    }
    const index = selected.value.findIndex((item) => item.src === image.src);
    if (index === -1) {
        selected.value.push(image);
    } else {
        selected.value.splice(index, 1);
    }
};

const onFileChange = (file: UploadFile, fileList: UploadFile[]) => {
    files.value = fileList;
};

const uploadSelectedFiles = async () => {
    if (!files.value.length) {
        ElMessage.warning('请先选择图片');
        return;
    }
    uploading.value = true;
    uploadProgress.value = 0;
    const uploaded: MockImageResult[] = [];
    const total = files.value.length;
    try {
        for (const file of files.value) {
            const raw = file.raw;
            if (!raw) continue;
            const form = new FormData();
            form.append('image', raw);
            form.append('title', raw.name.replace(/\.[^.]+$/, ''));
            form.append('date', props.date || localDateString());
            form.append('doOCR', 'false');
            form.append('unprocessed', 'false');
            if (props.tags.length) {
                form.append('keywords', JSON.stringify(props.tags));
            }
            try {
                const response = await uploadImage(form);
                uploaded.push({
                    src: response.md5,
                    title: raw.name,
                    date: props.date || localDateString(),
                    isCollection: false,
                });
            } catch (error) {
                if (error instanceof ResponseWithError && error.data?.md5) {
                    uploaded.push({
                        src: error.data.md5,
                        title: raw.name,
                        date: props.date || localDateString(),
                        isCollection: false,
                    });
                    ElMessage.info(`图片已存在，直接引用：${raw.name}`);
                } else {
                    throw error;
                }
            }
            uploadProgress.value += 1;
        }
        selected.value = uploaded.slice(0, props.mode === 'reference' ? 1 : uploaded.length);
        ElMessage.success(`已上传 ${uploaded.length} 张图片`);
        files.value = [];
        activeTab.value = 'library';
        page.value = 1;
        await load();
    } catch (error) {
        console.error('upload images failed', error);
        ElMessage.error('上传图片失败');
    } finally {
        uploading.value = false;
        uploadProgress.value = Math.min(uploadProgress.value, total);
    }
};

const confirm = () => {
    if (!selected.value.length) {
        ElMessage.warning('请选择图片');
        return;
    }
    emit('select', [...selected.value], props.mode);
    visible.value = false;
};
</script>

<template>
    <el-dialog v-model="visible" :title="mode === 'reference' ? '引用图片系统中的图片' : '插入图片'"
        width="min(94vw, 920px)" top="5vh" append-to-body destroy-on-close>
        <el-tabs v-model="activeTab">
            <el-tab-pane label="从图库选择" name="library">
                <div class="picker-search">
                    <el-input v-model="query" placeholder="搜索标题、OCR、关键词、属性……" clearable
                        @keyup.enter="search">
                        <template #prefix>
                            <el-icon><Search /></el-icon>
                        </template>
                    </el-input>
                    <el-button type="primary" @click="search">搜索</el-button>
                </div>

                <div v-loading="loading" class="image-grid">
                    <button v-for="image in results" :key="image.src" type="button" class="image-card"
                        :class="{ selected: selectedSet.has(image.src) }" @click="toggle(image)">
                        <img :src="thumbUrl(image.src)" :alt="image.title" loading="lazy" />
                        <span v-if="image.isCollection" class="collection-badge">合集</span>
                        <span v-if="selectedSet.has(image.src)" class="selected-check">
                            <el-icon><Check /></el-icon>
                        </span>
                        <span class="image-meta">
                            <strong>{{ image.title || image.src }}</strong>
                            <small>{{ image.date }}</small>
                        </span>
                    </button>
                    <el-empty v-if="!loading && results.length === 0" description="没有找到图片" />
                </div>

                <div v-if="totalPage > 1" class="picker-pagination">
                    <el-pagination small layout="prev, pager, next" :current-page="page" :page-size="pageSize"
                        :total="totalPage * pageSize" @current-change="changePage" />
                </div>
            </el-tab-pane>

            <el-tab-pane label="上传新图片" name="upload">
                <el-upload drag multiple :auto-upload="false" :on-change="onFileChange" accept="image/*"
                    :file-list="files">
                    <el-icon class="el-icon--upload"><UploadIcon /></el-icon>
                    <div class="el-upload__text">拖拽图片到此处，或<em>点击选择</em></div>
                    <template #tip>
                        <div class="el-upload__tip">上传后会先进入图片系统，再插入文章。重复图片会自动复用。</div>
                    </template>
                </el-upload>
                <div class="upload-actions">
                    <el-progress v-if="uploading" :percentage="files.length ? Math.round(uploadProgress / files.length * 100) : 0"
                        :format="() => `${uploadProgress} / ${files.length}`" />
                    <el-button type="primary" :loading="uploading" @click="uploadSelectedFiles">
                        上传并选择
                    </el-button>
                </div>
            </el-tab-pane>
        </el-tabs>

        <template #footer>
            <div class="picker-footer">
                <span class="selected-count">已选 {{ selected.length }} 张</span>
                <div>
                    <el-button @click="visible = false">取消</el-button>
                    <el-button type="primary" :disabled="!selected.length" @click="confirm">
                        {{ mode === 'reference' ? '插入引用' : '插入图片' }}
                    </el-button>
                </div>
            </div>
        </template>
    </el-dialog>
</template>

<style scoped>
.picker-search {
    display: flex;
    gap: 10px;
    margin-bottom: 16px;
}

.image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 12px;
    min-height: 240px;
    max-height: 55vh;
    overflow-y: auto;
    padding: 2px;
}

.image-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 0;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
    cursor: pointer;
    text-align: left;
    transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}

.image-card:hover {
    border-color: #409eff;
    box-shadow: 0 6px 18px rgba(64, 158, 255, 0.15);
    transform: translateY(-1px);
}

.image-card.selected {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.image-card img {
    width: 100%;
    height: 116px;
    object-fit: cover;
    background: #f5f7fa;
}

.image-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 0 10px 10px;
    min-width: 0;
}

.image-meta strong {
    font-size: 13px;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.image-meta small {
    color: #909399;
    font-size: 11px;
}

.collection-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    padding: 2px 7px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    font-size: 11px;
}

.selected-check {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 22px;
    height: 22px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #409eff;
    color: #fff;
}

.picker-pagination {
    display: flex;
    justify-content: center;
    margin-top: 16px;
}

.upload-actions {
    display: flex;
    align-items: center;
    gap: 16px;
    margin-top: 16px;
}

.upload-actions :deep(.el-progress) {
    flex: 1;
}

.picker-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.selected-count {
    color: #909399;
    font-size: 13px;
}
</style>
