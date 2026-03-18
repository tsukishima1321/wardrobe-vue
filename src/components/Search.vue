<script setup lang="ts">
import { ref, computed, onMounted, onUpdated, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import Masonry from 'masonry-layout';
import { debounce } from 'lodash';
import { ElMessage, ElMessageBox, ElDrawer, ElProgress, ElIcon } from 'element-plus';
import { Close } from '@element-plus/icons-vue';
import { GetBlobImgSrc } from "@/api/token";
import { deleteImage, deleteCollection, getSearchHints, searchImages, listCollectionImages } from "@/api/componentRequests";

import SearchFilterPanel from './SearchFilterPanel.vue';
import SearchResultsHeader from './SearchResultsHeader.vue';
import Pagination from './Pagination.vue';
import MasonryItemFigure from './MasonryItemFigure.vue';

// Interfaces
export interface SearchParams {
    searchword: string;
    dateFrom: string;
    dateTo: string;
    searchByTitle: boolean;
    searchByContent: boolean;
    sortBy: string;
    sortOrder: string;
    keywords: string[];
    properties: Array<{ name: string; value: string }>;
    excludedKeywords: string[];
    excludedProperties: Array<{ name: string; value: string }>;
    propertiesPrecise?: boolean;
}

interface SearchResponse {
    totalPage: number;
    total: number;
    hrefList: Array<{ src: string, title: string, date: string, is_collection?: boolean }>;
}

interface BlobImgItem {
    blobSrc: string;
    oriSrc: string;
    title: string;
    checked: boolean;
    date: string;
    isCollection: boolean;
}

const router = useRouter();

// State
const searchParams = ref<SearchParams>({
    searchword: (router.currentRoute.value.params.searchword as string) || '',
    dateFrom: new URLSearchParams(window.location.href.slice(window.location.href.indexOf('?'))).get('dateFrom') || '2000-01-01',
    dateTo: new URLSearchParams(window.location.href.slice(window.location.href.indexOf('?'))).get('dateTo') || new Date().toISOString().split('T')[0],
    searchByTitle: true,
    searchByContent: false,
    sortBy: 'date',
    sortOrder: 'desc',
    keywords: [],
    properties: [],
    excludedKeywords: [],
    excludedProperties: [],
    propertiesPrecise: false
});
const page = ref(1);

type PaginationExposed = {
    resetCurrentPage: () => void;
};

const paginationRef = ref<PaginationExposed | null>(null);

const blobImgList = ref<BlobImgItem[]>([]);
const totalPage = ref(1);
const totalItems = ref(0);
const isPictureMode = ref(true);
const isLoading = ref(false);
const keywordsHint = ref<string[]>([]);
const propertiesHint = ref<string[]>([]);
const showMobileFilter = ref(false);

// Download progress
const downloadProgress = ref({ visible: false, total: 0, completed: 0 });

// Computed
const hasSelection = computed(() => blobImgList.value.some(item => item.checked));
const isAllSelected = computed(() => blobImgList.value.length > 0 && blobImgList.value.every(item => item.checked));
const pageSize = computed(() => isPictureMode.value ? 20 : 100);

// Masonry
const masonryContainer = useTemplateRef('masonryContainer');
let masonry: Masonry | null = null;

const initMasonry = () => {
    if (isPictureMode.value && masonryContainer.value) {
        if (masonry) {
            masonry.destroy?.();
        }
        masonry = new Masonry(masonryContainer.value as Element, {
            itemSelector: '.masonry-item',
            columnWidth: 300,
            gutter: 20,
            fitWidth: true
        });
    }
};

watch(isPictureMode, (newVal) => {
    if (newVal) {
        // Wait for DOM update
        setTimeout(() => {
            initMasonry();
        }, 100);
    } else {
        if (masonry) {
            (masonry as any).destroy?.();
            masonry = null;
        }
    }
});

onUpdated(() => {
    if (isPictureMode.value && masonryContainer.value) {
        if (!masonry) {
            initMasonry();
        } else {
            (masonry as any).reloadItems();
            (masonry as any).layout();
        }
    }
});

// Methods
const updateSearchHint = debounce(async () => {
    let data = await getSearchHints();
    keywordsHint.value = data.keywords;
    propertiesHint.value = data.properties;
}, 300);

const updateSearch = debounce(async (resetpage: boolean = true) => {
    isLoading.value = true;

    if (resetpage) {
        paginationRef.value?.resetCurrentPage();
        page.value = 1;
    }

    const para = {
        searchKey: searchParams.value.searchword,
        page: page.value,
        dateFrom: searchParams.value.dateFrom,
        dateTo: searchParams.value.dateTo,
        byName: searchParams.value.searchByTitle,
        byFullText: searchParams.value.searchByContent,
        orderBy: searchParams.value.sortBy,
        order: searchParams.value.sortOrder,
        pageSize: pageSize.value,
        keywords: searchParams.value.keywords,
        properties: searchParams.value.properties,
        excludedKeywords: searchParams.value.excludedKeywords,
        excludedProperties: searchParams.value.excludedProperties,
        propertiesPrecise: searchParams.value.propertiesPrecise
    };

    try {
        const data = await searchImages(para) as SearchResponse;
        totalPage.value = data.totalPage;
        totalItems.value = data.total;

        blobImgList.value = data.hrefList.map(item => ({
            blobSrc: '',
            oriSrc: item.src,
            title: item.title,
            checked: false,
            date: item.date,
            isCollection: !!item.is_collection
        }));

        if (isPictureMode.value) {
            data.hrefList.forEach(item => {
                // 合集的缩略图可能变化，加上时间戳参数强制刷新缓存
                GetBlobImgSrc("/imagebed/thumbnails/" + item.src + (item.is_collection ? `?${Date.now()}` : '')).then((blobSrc) => {
                    const imgItem = blobImgList.value.find(img => img.oriSrc === item.src);
                    if (imgItem) {
                        imgItem.blobSrc = blobSrc;
                    }
                }).catch(() => {
                    // Handle error
                });
            });
        }
    } catch (error) {
        console.error(error);
    } finally {
        isLoading.value = false;
    }
}, 200);

const handleDelete = async () => {
    const selectedItems = blobImgList.value.filter(item => item.checked);
    if (selectedItems.length === 0) {
        ElMessage.warning('选择列表为空');
        return;
    }

    try {
        await ElMessageBox.confirm(`确定删除 ${selectedItems.length} 项吗？`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });

        for (const item of selectedItems) {
            if (item.isCollection) {
                await deleteCollection(item.oriSrc);
            } else {
                await deleteImage(item.oriSrc);
            }
        }
        ElMessage.success('删除成功');
        updateSearch(false);
    } catch (e) {
        // Cancelled
    }
};

const handleDownload = async () => {
    const selectedItems = blobImgList.value.filter(item => item.checked);
    if (selectedItems.length === 0) {
        ElMessage.warning('选择列表为空');
        return;
    }

    if (downloadProgress.value.visible) {
        ElMessage.info('已有下载任务正在进行中，请先等待完成');
        return;
    }

    // Collect all hrefs to download, expanding collections
    const downloadHrefs: string[] = [];
    for (const item of selectedItems) {
        if (item.isCollection) {
            const images = await listCollectionImages(item.oriSrc);
            if (images.length === 0) {
                ElMessage.info(`合集 ${item.title} 中没有图片`);
                continue;
            }
            try {
                await ElMessageBox.confirm(
                    `合集「${item.title}」包含 ${images.length} 张图片，确定全部下载吗？`,
                    '下载合集',
                    { confirmButtonText: '下载', cancelButtonText: '跳过', type: 'info' }
                );
                downloadHrefs.push(...images.map(img => img.image_href));
            } catch {
                // User chose to skip this collection
            }
        } else {
            downloadHrefs.push(item.oriSrc);
        }
    }

    if (downloadHrefs.length === 0) return;

    downloadProgress.value = { visible: true, total: downloadHrefs.length, completed: 0 };

    for (const href of downloadHrefs) {
        try {
            const link = document.createElement('a');
            link.href = await GetBlobImgSrc('/imagebed/' + href);
            link.download = href;
            link.click();
        } finally {
            downloadProgress.value.completed++;
        }
    }

    setTimeout(() => {
        downloadProgress.value.visible = false;
    }, 2000);
};

const selectAll = () => {
    blobImgList.value.forEach(item => item.checked = true);
};

const selectNone = () => {
    blobImgList.value.forEach(item => item.checked = false);
};

const toggleSelection = () => {
    if (isAllSelected.value) {
        selectNone();
    } else {
        selectAll();
    }
};

const pageChanged = (newPage: number) => {
    page.value = newPage;
    updateSearch(false);
};

const imgClicked = (src: string) => {
    const newWindow = router.resolve('/detail/' + src);
    window.open(newWindow.href, '_blank');
};

const imgSelected = (src: string) => {
    const item = blobImgList.value.find(item => item.oriSrc == src);
    if (item) item.checked = true;
};

const imgUnSelected = (src: string) => {
    const item = blobImgList.value.find(item => item.oriSrc == src);
    if (item) item.checked = false;
};

const handleRowDoubleClick = (row: BlobImgItem) => {
    imgClicked(row.oriSrc);
};

watch(searchParams, () => {
    updateSearch(true);
}, { deep: true });

watch(isPictureMode, (newVal) => {
    updateSearch(true);
    if (newVal) {
        // Wait for DOM update
        setTimeout(() => {
            initMasonry();
        }, 100);
    } else {
        if (masonry) {
            (masonry as any).destroy?.();
            masonry = null;
        }
    }
});

onMounted(() => {
    updateSearchHint();
    updateSearch();
});
</script>

<template>
    <div class="search-page">
        <aside class="sidebar hidden-xs-only">
            <SearchFilterPanel v-model:modelValue="searchParams" :keywordsHint="keywordsHint"
                :propertiesHint="propertiesHint" @search="updateSearch" />
        </aside>

        <el-drawer v-model="showMobileFilter" title="Filters" direction="ltr" size="80%" class="mobile-filter-drawer">
            <SearchFilterPanel v-model:modelValue="searchParams" :keywordsHint="keywordsHint"
                :propertiesHint="propertiesHint" @search="updateSearch" />
        </el-drawer>

        <main class="main-content">
            <SearchResultsHeader :searchword="searchParams.searchword" :sortBy="searchParams.sortBy"
                :sortOrder="searchParams.sortOrder" :total="totalItems" :hasSelection="hasSelection"
                :isAllSelected="isAllSelected" v-model:isPictureMode="isPictureMode"
                @update:searchword="val => searchParams.searchword = val"
                @update:sortBy="val => searchParams.sortBy = val"
                @update:sortOrder="val => searchParams.sortOrder = val" @search="updateSearch" @delete="handleDelete"
                @download="handleDownload" @selectAll="selectAll" @selectNone="selectNone"
                @openMobileFilter="showMobileFilter = true" />

            <div class="results-area" v-loading="isLoading">
                <div v-if="isPictureMode" class="masonry-container-wrapper">
                    <div ref="masonryContainer" class="masonry">
                        <MasonryItemFigure v-for="blobImg in blobImgList" :key="blobImg.oriSrc" :src="blobImg.blobSrc"
                            :oriSrc="blobImg.oriSrc" :figcaption="blobImg.title" :checked="blobImg.checked"
                            :isCollection="blobImg.isCollection" @clicked="imgClicked" @selected="imgSelected"
                            @unselected="imgUnSelected" />
                    </div>
                </div>

                <div v-else class="table-container">
                    <el-table :data="blobImgList" stripe style="width: 100%" @selection-change="(selection: BlobImgItem[]) => {
                        blobImgList.forEach(item => item.checked = false);
                        selection.forEach(sel => {
                            const item = blobImgList.find(i => i.oriSrc === sel.oriSrc);
                            if (item) item.checked = true;
                        });
                    }" @row-dblclick="handleRowDoubleClick">
                        <el-table-column type="selection" width="55" />
                        <el-table-column prop="date" label="日期" width="180" />
                        <el-table-column prop="title" label="标题" />
                        <el-table-column label="类型" width="80">
                            <template #default="{ row }">
                                <el-tag v-if="row.isCollection" size="small" type="warning">合集</el-tag>
                                <el-tag v-else size="small" type="info">图片</el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </div>
            </div>

            <Pagination ref="paginationRef" :maxPage="totalPage" @pageChanged="pageChanged" />
        </main>

        <!-- Download progress float -->
        <Transition name="slide-up">
            <div v-if="downloadProgress.visible" class="download-progress">
                <div class="download-progress-header">
                    <span>下载进度</span>
                    <el-icon class="download-progress-close" @click="downloadProgress.visible = false">
                        <Close />
                    </el-icon>
                </div>
                <el-progress
                    :percentage="downloadProgress.total ? Math.round(downloadProgress.completed / downloadProgress.total * 100) : 0"
                    :stroke-width="10"
                    :status="downloadProgress.completed >= downloadProgress.total ? 'success' : undefined" />
                <div class="download-progress-text">
                    {{ downloadProgress.completed }} / {{ downloadProgress.total }} 张
                </div>
            </div>
        </Transition>
    </div>
</template>

<style scoped>
.search-page {
    display: flex;
    margin: 0 auto;
    height: calc(100vh - 60px);
    background-color: #f0f2f5;
}

.sidebar {
    width: 280px;
    flex-shrink: 0;
    background-color: #fff;
    border-right: 1px solid #e0e0e0;
    position: sticky;
    top: 0;
    overflow-y: auto;
    padding: 0;
    box-sizing: border-box;
}

.main-content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
    padding: 20px;
    overflow-x: hidden;
    overflow-y: auto;
}

.results-area {
    flex-grow: 1;
    margin-bottom: 20px;
    margin-top: 20px;
}

.masonry-container-wrapper {
    width: 100%;
    margin: 0 auto;
}

.masonry {
    margin: 0 auto;
}

.download-progress {
    position: fixed;
    bottom: 24px;
    right: 24px;
    width: 280px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    padding: 16px;
    z-index: 2000;
}

.download-progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    font-weight: 600;
    font-size: 14px;
    color: #303133;
}

.download-progress-close {
    cursor: pointer;
    color: #909399;
}

.download-progress-close:hover {
    color: #303133;
}

.download-progress-text {
    margin-top: 6px;
    font-size: 12px;
    color: #909399;
    text-align: right;
}

.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.3s ease;
}

.slide-up-enter-from,
.slide-up-leave-to {
    transform: translateY(20px);
    opacity: 0;
}

@media (max-width: 768px) {
    .sidebar {
        display: none;
    }

    .main-content {
        padding: 10px;
    }
}
</style>