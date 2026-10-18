<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import type { UploadFile } from 'element-plus';
import { Search, Upload as UploadIcon, Check, ArrowLeft } from '@element-plus/icons-vue';
import { GetImageSrc, ResponseWithError } from '@/api/token';
import { executeOcrMission, listCollectionImages, searchCollections, searchImages, uploadImage } from '@/api/componentRequests';
import type { SearchRequest } from '@/api/componentRequests';
import { mockCollectionItems, mockCollections, mockImages } from '@/mocks/blog';
import ImageMetadataEditor from '@/components/upload/ImageMetadataEditor.vue';
import type { ImageMetadataValue } from '@/components/upload/types';
import { localDateString, type BlogImageResult } from '@/api/blog';

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
    (e: 'select', images: BlogImageResult[], mode: 'insert' | 'reference'): void;
}>();

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const activeTab = ref<'library' | 'collections' | 'upload'>('library');
const query = ref('');
const loading = ref(false);
const page = ref(1);
const pageSize = 24;
const totalPage = ref(0);
const results = ref<BlogImageResult[]>([]);
const selected = ref<BlogImageResult[]>([]);
const uploadFile = ref<File | null>(null);
const uploadPreview = ref('');
const uploadMetadata = ref<ImageMetadataValue>(emptyMetadata());
const uploadingInsert = ref(false);
const collections = ref<BlogImageResult[]>([]);
const collectionsLoading = ref(false);
const collectionQuery = ref('');
const selectedCollection = ref<BlogImageResult | null>(null);
const collectionItems = ref<BlogImageResult[]>([]);
const collectionItemsLoading = ref(false);

let requestSeq = 0;
let collectionRequestSeq = 0;
let itemRequestSeq = 0;

const selectedSet = computed(() => new Set(selected.value.map((item) => item.src)));

function emptyMetadata(): ImageMetadataValue {
    return {
        title: '',
        date: props.date || localDateString(),
        keywords: [],
        properties: [],
        isOCR: false,
    };
}

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

const loadCollections = async () => {
    if (props.mock) {
        const keyword = collectionQuery.value.trim();
        collections.value = keyword
            ? mockCollections.filter((item) => `${item.title} ${item.date}`.includes(keyword))
            : [...mockCollections];
        return;
    }
    const seq = ++collectionRequestSeq;
    collectionsLoading.value = true;
    try {
        const response = await searchCollections({
            searchKey: collectionQuery.value.trim(),
            page: 1,
            pageSize: 100,
        });
        if (seq !== collectionRequestSeq) return;
        collections.value = (response.items ?? []).map((item) => ({
            src: item.src,
            title: item.title,
            date: item.date,
            isCollection: true,
            itemCount: item.itemCount,
        }));
    } catch (error) {
        if (seq === collectionRequestSeq) {
            console.error('load collections failed', error);
            ElMessage.error('加载合集失败');
        }
    } finally {
        if (seq === collectionRequestSeq) {
            collectionsLoading.value = false;
        }
    }
};

const openCollection = async (collection: BlogImageResult) => {
    selectedCollection.value = collection;
    collectionItems.value = [];
    if (props.mock) {
        collectionItems.value = [...(mockCollectionItems[collection.src] ?? [])];
        return;
    }
    const seq = ++itemRequestSeq;
    collectionItemsLoading.value = true;
    try {
        const items = await listCollectionImages(collection.src);
        if (seq !== itemRequestSeq) return;
        collectionItems.value = items.map((item) => ({
            src: item.image_href,
            title: item.title || item.image_href,
            date: item.date || collection.date,
            isCollection: false,
            collectionHref: item.collection_href || collection.src,
            collectionTitle: item.collection_title || collection.title,
        }));
    } catch (error) {
        if (seq === itemRequestSeq) {
            console.error('load collection items failed', error);
            ElMessage.error('加载合集图片失败');
        }
    } finally {
        if (seq === itemRequestSeq) {
            collectionItemsLoading.value = false;
        }
    }
};

const backToCollections = () => {
    selectedCollection.value = null;
    collectionItems.value = [];
};

const searchCollection = () => {
    void loadCollections();
};

const reset = () => {
    requestSeq += 1;
    collectionRequestSeq += 1;
    itemRequestSeq += 1;
    selected.value = [];
    uploadFile.value = null;
    uploadPreview.value = '';
    uploadMetadata.value = emptyMetadata();
    page.value = 1;
    query.value = '';
    activeTab.value = 'library';
    collections.value = [];
    collectionQuery.value = '';
    selectedCollection.value = null;
    collectionItems.value = [];
};

watch(() => props.modelValue, (isOpen) => {
    if (isOpen) {
        reset();
        void load();
    }
});

watch(activeTab, (tab) => {
    if (tab === 'collections' && !collections.value.length) {
        void loadCollections();
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

const toggle = (image: BlogImageResult) => {
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

const onSingleFileChange = (file: UploadFile) => {
    const raw = file.raw;
    if (!raw) return;
    const oldName = uploadFile.value?.name || '';
    const oldAutoTitle = oldName.substring(0, oldName.lastIndexOf('.')) || oldName;
    const wasAutoTitle = !uploadMetadata.value.title.trim() || uploadMetadata.value.title === oldAutoTitle;

    uploadFile.value = raw;
    const reader = new FileReader();
    reader.onload = (event) => {
        uploadPreview.value = event.target?.result as string;
    };
    reader.readAsDataURL(raw);
    if (wasAutoTitle) {
        const name = raw.name;
        uploadMetadata.value = {
            ...uploadMetadata.value,
            title: name.substring(0, name.lastIndexOf('.')) || name,
        };
    }
};

const clearUploadFile = () => {
    uploadFile.value = null;
    uploadPreview.value = '';
    uploadMetadata.value = emptyMetadata();
};

const uploadAndInsert = async () => {
    if (!uploadFile.value) {
        ElMessage.warning('请先选择一张图片');
        return;
    }
    if (!uploadMetadata.value.title.trim()) {
        ElMessage.warning('请填写图片标题');
        return;
    }

    if (props.mock) {
        const image: BlogImageResult = {
            src: `mock-upload-${Date.now()}.jpg`,
            title: uploadMetadata.value.title.trim(),
            date: uploadMetadata.value.date || localDateString(),
            isCollection: false,
        };
        emit('select', [image], props.mode);
        visible.value = false;
        return;
    }

    uploadingInsert.value = true;
    try {
        const form = new FormData();
        form.append('image', uploadFile.value);
        form.append('title', uploadMetadata.value.title.trim());
        form.append('date', uploadMetadata.value.date || localDateString());
        form.append('doOCR', uploadMetadata.value.isOCR ? 'true' : 'false');
        form.append('keywords', JSON.stringify(uploadMetadata.value.keywords));
        form.append('properties', JSON.stringify(uploadMetadata.value.properties));

        let md5 = '';
        try {
            const response = await uploadImage(form);
            md5 = response.md5;
        } catch (error) {
            if (error instanceof ResponseWithError && error.data?.md5) {
                md5 = error.data.md5;
                ElMessage.info('图片已存在，直接引用已有图片');
            } else {
                throw error;
            }
        }

        if (!md5) throw new Error('上传未返回图片地址');

        if (uploadMetadata.value.isOCR) {
            void executeOcrMission(md5).catch((error) => {
                console.error('execute OCR after blog image upload failed', error);
            });
        }

        const image: BlogImageResult = {
            src: md5,
            title: uploadMetadata.value.title.trim(),
            date: uploadMetadata.value.date || localDateString(),
            isCollection: false,
        };
        emit('select', [image], props.mode);
        visible.value = false;
    } catch (error) {
        console.error('upload image for article failed', error);
        ElMessage.error('上传图片失败');
    } finally {
        uploadingInsert.value = false;
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
    <el-dialog v-model="visible" :title="mode === 'reference' ? '引用图片系统中的图片' : '插入图片'" width="min(94vw, 920px)"
        top="5vh" append-to-body destroy-on-close>
        <el-tabs v-model="activeTab">
            <el-tab-pane label="从图库选择" name="library">
                <div class="picker-search">
                    <el-input v-model="query" placeholder="搜索标题、OCR、关键词、属性……" clearable @keyup.enter="search">
                        <template #prefix>
                            <el-icon>
                                <Search />
                            </el-icon>
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
                            <el-icon>
                                <Check />
                            </el-icon>
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

            <el-tab-pane label="合集" name="collections">
                <template v-if="selectedCollection">
                    <div class="collection-detail-header">
                        <el-button link :icon="ArrowLeft" @click="backToCollections">返回合集</el-button>
                        <div class="collection-detail-title">
                            <strong>{{ selectedCollection.title }}</strong>
                            <span>{{ collectionItems.length }} 张图片</span>
                        </div>
                    </div>

                    <div v-loading="collectionItemsLoading" class="image-grid">
                        <button v-for="image in collectionItems" :key="image.src" type="button" class="image-card"
                            :class="{ selected: selectedSet.has(image.src) }" @click="toggle(image)">
                            <img :src="thumbUrl(image.src)" :alt="image.title" loading="lazy" />
                            <span v-if="selectedSet.has(image.src)" class="selected-check">
                                <el-icon>
                                    <Check />
                                </el-icon>
                            </span>
                            <span class="image-meta">
                                <strong>{{ image.title || image.src }}</strong>
                                <small>{{ image.date }}</small>
                            </span>
                        </button>
                        <el-empty v-if="!collectionItemsLoading && collectionItems.length === 0"
                            description="这个合集暂无图片" />
                    </div>
                </template>

                <template v-else>
                    <div class="picker-search">
                        <el-input v-model="collectionQuery" placeholder="搜索合集标题……" clearable
                            @keyup.enter="searchCollection">
                            <template #prefix>
                                <el-icon>
                                    <Search />
                                </el-icon>
                            </template>
                        </el-input>
                        <el-button type="primary" @click="searchCollection">搜索</el-button>
                    </div>

                    <div v-loading="collectionsLoading" class="collection-grid">
                        <button v-for="collection in collections" :key="collection.src" type="button"
                            class="collection-card" @click="openCollection(collection)">
                            <img :src="thumbUrl(collection.src)" :alt="collection.title" loading="lazy" />
                            <span class="collection-card-meta">
                                <strong>{{ collection.title }}</strong>
                                <small>{{ collection.itemCount ?? 0 }} 张图片 · {{ collection.date }}</small>
                            </span>
                        </button>
                        <el-empty v-if="!collectionsLoading && collections.length === 0" description="没有找到合集" />
                    </div>
                </template>
            </el-tab-pane>

            <el-tab-pane label="上传新图片" name="upload">
                <div class="upload-single">
                    <el-upload v-if="!uploadPreview" drag :auto-upload="false" :show-file-list="false"
                        :on-change="onSingleFileChange" accept="image/*">
                        <el-icon class="el-icon--upload">
                            <UploadIcon />
                        </el-icon>
                        <div class="el-upload__text">拖拽一张图片到此处，或<em>点击选择</em></div>
                    </el-upload>

                    <div v-else class="upload-preview-panel">
                        <el-image :src="uploadPreview" :preview-src-list="[uploadPreview]" fit="contain"
                            class="upload-preview-image" />
                        <div class="upload-preview-actions">
                            <span class="upload-file-name">{{ uploadFile?.name }}</span>
                            <el-button link type="danger" @click="clearUploadFile">重新选择</el-button>
                        </div>
                    </div>

                    <ImageMetadataEditor v-if="uploadFile" v-model="uploadMetadata" compact show-ocr :mock="mock" />

                    <div class="upload-actions">
                        <el-button type="primary" :loading="uploadingInsert"
                            :disabled="!uploadFile || !uploadMetadata.title.trim()" @click="uploadAndInsert">
                            上传并插入文章
                        </el-button>
                    </div>
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

.collection-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
    gap: 12px;
    min-height: 200px;
    max-height: 55vh;
    overflow-y: auto;
    padding: 2px;
}

.collection-card {
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

.collection-card:hover {
    border-color: #409eff;
    box-shadow: 0 6px 18px rgba(64, 158, 255, 0.15);
    transform: translateY(-1px);
}

.collection-card img {
    width: 100%;
    height: 130px;
    object-fit: cover;
    background: #f5f7fa;
}

.collection-card-meta {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 0 10px 10px;
    min-width: 0;
}

.collection-card-meta strong {
    font-size: 13px;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.collection-card-meta small {
    color: #909399;
    font-size: 11px;
}

.collection-detail-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
}

.collection-detail-title {
    display: flex;
    align-items: baseline;
    gap: 10px;
    min-width: 0;
}

.collection-detail-title strong {
    color: #303133;
    font-size: 15px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.collection-detail-title span {
    color: #909399;
    font-size: 12px;
    white-space: nowrap;
}

.upload-single {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.upload-preview-panel {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px;
    border: 1px solid #ebeef5;
    border-radius: 10px;
    background: #fafcff;
}

.upload-preview-image {
    width: 100%;
    max-height: 280px;
    border-radius: 8px;
    background: #f5f7fa;
}

.upload-preview-image :deep(img) {
    max-height: 280px;
    object-fit: contain;
}

.upload-preview-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
}

.upload-file-name {
    color: #909399;
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
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
