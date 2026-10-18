<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { CopyDocument, Search } from '@element-plus/icons-vue';
import { debounce } from 'lodash';
import { GetImageSrc } from '@/api/token';
import { getImageDetail, searchImages } from '@/api/componentRequests';
import type { ImageProperty, SearchRequest } from '@/api/componentRequests';
import { mockImages } from '@/mocks/blog';

interface CopyAttrItem {
    src: string;
    title: string;
    date: string;
    is_collection?: boolean;
    thumbSrc: string;
}

const props = withDefaults(defineProps<{
    modelValue: boolean;
    mock?: boolean;
}>(), {
    mock: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: boolean): void;
    (e: 'apply', payload: { keywords: string[]; properties: ImageProperty[] }): void;
}>();

const visible = computed({
    get: () => props.modelValue,
    set: (value: boolean) => emit('update:modelValue', value),
});

const search = ref('');
const items = ref<CopyAttrItem[]>([]);
const page = ref(0);
const totalPage = ref(0);
const loading = ref(false);
const loadingMore = ref(false);
const scrollRef = ref<HTMLElement>();

const buildParams = (pageNumber: number): SearchRequest => ({
    searchKey: search.value.trim(),
    page: pageNumber,
    dateFrom: '',
    dateTo: '',
    byName: true,
    byFullText: true,
    orderBy: 'date',
    order: 'desc',
    pageSize: 48,
    keywords: [],
    properties: [],
    excludedKeywords: [],
    excludedProperties: [],
});

const loadMock = () => {
    const keyword = search.value.trim();
    items.value = (keyword
        ? mockImages.filter((item) => `${item.title} ${item.date}`.includes(keyword))
        : mockImages
    ).map((item) => ({ ...item, thumbSrc: '/placeholder.png' }));
    totalPage.value = 1;
};

const load = async (reset: boolean) => {
    if (props.mock) {
        loadMock();
        return;
    }

    const pageNumber = reset ? 1 : page.value + 1;
    if (!reset && totalPage.value > 0 && pageNumber > totalPage.value) return;

    if (reset) loading.value = true;
    else loadingMore.value = true;
    try {
        const data = await searchImages(buildParams(pageNumber));
        totalPage.value = data.totalPage;
        page.value = pageNumber;
        const next = (data.hrefList || []).map((item) => ({
            src: item.src,
            title: item.title,
            date: item.date,
            is_collection: item.is_collection,
            thumbSrc: GetImageSrc(`/imagebed/thumbnails/small/${item.src}${item.is_collection ? `?${Date.now()}` : ''}`),
        }));
        items.value = reset ? next : [...items.value, ...next];
    } catch (error) {
        console.error('search copy attributes failed', error);
        ElMessage.error('搜索失败');
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

const onSearch = debounce(() => {
    void load(true);
}, 300);

const onScroll = () => {
    const element = scrollRef.value;
    if (!element || loadingMore.value) return;
    if (element.scrollTop + element.clientHeight >= element.scrollHeight - 100) {
        void load(false);
    }
};

const apply = async (item: CopyAttrItem) => {
    if (props.mock) {
        emit('apply', {
            keywords: ['日常', '照片'],
            properties: [{ name: '地点', value: '河边' }],
        });
        visible.value = false;
        return;
    }
    try {
        const data = await getImageDetail(item.src);
        emit('apply', {
            keywords: data.keywords ?? [],
            properties: data.properties ?? [],
        });
        visible.value = false;
    } catch (error) {
        console.error('get copy attributes failed', error);
        ElMessage.error('获取图片属性失败');
    }
};

watch(() => props.modelValue, (isOpen) => {
    if (isOpen && items.value.length === 0) {
        void load(true);
    }
});
</script>

<template>
    <el-dialog v-model="visible" title="复制属性" width="560px" append-to-body :close-on-click-modal="false"
        class="copy-attr-dialog">
        <div class="copy-attr-search">
            <el-input v-model="search" placeholder="搜索标题或内容" clearable :prefix-icon="Search"
                @input="onSearch" />
        </div>
        <div ref="scrollRef" class="copy-attr-grid" @scroll="onScroll">
            <div v-if="loading && items.length === 0" class="copy-attr-empty">
                <el-skeleton :rows="6" animated />
            </div>
            <div v-else-if="items.length === 0" class="copy-attr-empty">
                <el-empty description="暂无结果" />
            </div>
            <div v-else class="copy-attr-grid-inner">
                <div v-for="item in items" :key="item.src" class="copy-attr-thumb" :title="item.title"
                    @click="apply(item)">
                    <img :src="item.thumbSrc" :alt="item.title" class="copy-attr-thumb-img" loading="lazy" />
                    <div class="copy-attr-thumb-overlay">
                        <el-icon><CopyDocument /></el-icon>
                    </div>
                </div>
            </div>
            <div v-if="loadingMore" class="copy-attr-loading-more">加载中...</div>
            <div v-else-if="items.length > 0 && totalPage > 0 && page >= totalPage"
                class="copy-attr-loading-more">已显示全部结果</div>
        </div>
    </el-dialog>
</template>

<style scoped>
.copy-attr-search {
    margin-bottom: 12px;
}

.copy-attr-grid {
    max-height: 420px;
    overflow-y: auto;
    margin: 0 -6px;
    padding: 0 6px;
}

.copy-attr-grid-inner {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
}

.copy-attr-thumb {
    aspect-ratio: 1;
    border-radius: 6px;
    overflow: hidden;
    cursor: pointer;
    position: relative;
    background: #f5f5f7;
}

.copy-attr-thumb-img {
    width: 100%;
    height: 100%;
    display: block;
}

.copy-attr-thumb-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;
    opacity: 0;
    transition: opacity 0.2s;
}

.copy-attr-thumb:hover .copy-attr-thumb-overlay {
    opacity: 1;
}

.copy-attr-empty {
    padding: 24px 0;
}

.copy-attr-loading-more {
    text-align: center;
    padding: 12px;
    color: #909399;
    font-size: 13px;
}

@media (max-width: 768px) {
    .copy-attr-grid-inner {
        grid-template-columns: repeat(3, 1fr);
    }
}
</style>
