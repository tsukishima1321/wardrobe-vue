<script setup lang="ts">
import { ref, computed, onMounted, onUpdated, useTemplateRef, watch } from 'vue';
import { useRouter } from 'vue-router';
import Masonry from 'masonry-layout';
import { debounce } from 'lodash';
import { ElMessage, ElMessageBox, ElDrawer } from 'element-plus';
import { fetchDataAutoRetry, GetBlobImgSrc } from "@/token";

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
    page: number;
    keywords: string[];
    properties: Array<{ name: string; value: string }>;
    excludedKeywords: string[];
    excludedProperties: Array<{ name: string; value: string }>;
}

interface SearchResponse {
    totalPage: number;
    total: number;
    hrefList: Array<{ src: string, title: string, date: Date }>;
}

interface BlobImgItem {
    blobSrc: string;
    oriSrc: string;
    title: string;
    checked: boolean;
    date: Date;
}

const router = useRouter();

// State
const searchParams = ref<SearchParams>({
    searchword: (router.currentRoute.value.params.searchword as string) || '',
    dateFrom: '2000-01-01',
    dateTo: new Date().toISOString().split('T')[0],
    searchByTitle: true,
    searchByContent: false,
    sortBy: 'date',
    sortOrder: 'desc',
    page: 1,
    keywords: [],
    properties: [],
    excludedKeywords: [],
    excludedProperties: []
});

const blobImgList = ref<BlobImgItem[]>([]);
const totalPage = ref(1);
const totalItems = ref(0);
const isPictureMode = ref(true);
const isLoading = ref(false);
const keywordsHint = ref<string[]>([]);
const propertiesHint = ref<string[]>([]);
const showMobileFilter = ref(false);

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
    let data = await fetchDataAutoRetry('/api/searchhint/', {}, 'GET') as { keywords: Array<string>, properties: Array<string> };
    keywordsHint.value = data.keywords;
    propertiesHint.value = data.properties;
}, 300);

const updateSearch = debounce(async () => {
    isLoading.value = true;

    const para = {
        searchKey: searchParams.value.searchword,
        page: searchParams.value.page,
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
        excludedProperties: searchParams.value.excludedProperties
    };

    try {
        const data = await fetchDataAutoRetry('/api/search/', para) as SearchResponse;
        totalPage.value = data.totalPage;
        totalItems.value = data.total;

        blobImgList.value = data.hrefList.map(item => ({
            blobSrc: '',
            oriSrc: item.src,
            title: item.title,
            checked: false,
            date: item.date
        }));

        if (isPictureMode.value) {
            data.hrefList.forEach(item => {
                GetBlobImgSrc("/imagebed/thumbnails/" + item.src).then((blobSrc) => {
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
    const selectedList = blobImgList.value.filter(item => item.checked).map(item => item.oriSrc);
    if (selectedList.length === 0) {
        ElMessage.warning('选择列表为空');
        return;
    }

    try {
        await ElMessageBox.confirm(`确定删除 ${selectedList.length} 项吗？`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });

        for (const item of selectedList) {
            await fetchDataAutoRetry('/api/image/delete/', { src: item }, 'POST');
        }
        ElMessage.success('删除成功');
        updateSearch();
    } catch (e) {
        // Cancelled
    }
};

const handleDownload = async () => {
    const selectedList = blobImgList.value.filter(item => item.checked).map(item => item.oriSrc);
    if (selectedList.length === 0) {
        ElMessage.warning('选择列表为空');
        return;
    }

    for (const item of selectedList) {
        const link = document.createElement('a');
        link.href = await GetBlobImgSrc('/imagebed/' + item);
        link.download = item;
        link.click();
    }
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
    searchParams.value.page = newPage;
    updateSearch();
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
    updateSearch();
}, { deep: true });

watch(isPictureMode, (newVal) => {
    searchParams.value.page = 1;
    updateSearch();
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
                            @clicked="imgClicked" @selected="imgSelected" @unselected="imgUnSelected" />
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
                    </el-table>
                </div>
            </div>

            <Pagination :maxPage="totalPage" @pageChanged="pageChanged" />
        </main>
    </div>
</template>

<style scoped>
.search-page {
    display: flex;
    height: 100%;
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

@media (max-width: 768px) {
    .sidebar {
        display: none;
    }

    .main-content {
        padding: 10px;
    }
}
</style>