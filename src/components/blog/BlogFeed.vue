<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus, EditPen, Search, Filter } from '@element-plus/icons-vue';
import BlogPostCard from './BlogPostCard.vue';
import {
    getBlogArchive,
    getBlogTags,
    listBlogPosts,
    searchBlogPosts,
} from '@/api/blog';
import type { BlogArchiveItem, BlogPostSummary, BlogTag } from '@/api/blog';
import { AuthenticationError } from '@/api/token';
import { openQuickCapture } from '@/composables/useQuickCapture';
import { mockArchive, mockPostSummaries, mockSearchResponse, mockTags } from '@/mocks/blog';

const route = useRoute();
const router = useRouter();

const isMock = computed(() => route.query.mock === '1');

const applyArchiveRoute = () => {
    const year = Number(route.params.year);
    const month = Number(route.params.month);
    if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return;
    const monthText = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    dateFrom.value = `${year}-${monthText}-01`;
    dateTo.value = `${year}-${monthText}-${String(lastDay).padStart(2, '0')}`;
};

const posts = ref<BlogPostSummary[]>([]);
const tags = ref<BlogTag[]>([]);
const archive = ref<BlogArchiveItem[]>([]);
const loading = ref(false);
const totalItems = ref(0);
const totalPage = ref(0);
const page = ref(1);
const pageSize = 48;
const query = ref('');
const activeTag = ref('');
const kind = ref<'' | 'note' | 'article'>('');
const status = ref<'published' | 'draft' | 'all'>('published');
const dateFrom = ref('');
const dateTo = ref('');
const showMobileFilter = ref(false);

const activeFilterCount = computed(() => {
    let count = 0;
    if (activeTag.value) count += 1;
    if (kind.value) count += 1;
    if (dateFrom.value || dateTo.value) count += 1;
    if (status.value !== 'published') count += 1;
    return count;
});

const loadMeta = async () => {
    if (isMock.value) {
        tags.value = mockTags;
        archive.value = mockArchive;
        return;
    }
    try {
        const [tagRows, archiveRows] = await Promise.all([getBlogTags(), getBlogArchive()]);
        tags.value = tagRows;
        archive.value = archiveRows;
    } catch (error) {
        console.error('load blog meta failed', error);
    }
};

const loadLocalMock = () => {
    let rows = [...mockPostSummaries];
    const keyword = query.value.trim();
    if (keyword) {
        rows = mockSearchResponse(keyword).items;
    }
    if (activeTag.value) {
        rows = rows.filter((post) => post.tags.includes(activeTag.value));
    }
    if (kind.value) {
        rows = rows.filter((post) => post.kind === kind.value);
    }
    posts.value = rows;
    totalItems.value = rows.length;
    totalPage.value = rows.length ? 1 : 0;
};

const loadPosts = async () => {
    if (isMock.value) {
        loadLocalMock();
        return;
    }
    loading.value = true;
    try {
        const keyword = query.value.trim();
        if (keyword) {
            const response = await searchBlogPosts({
                q: keyword,
                page: page.value,
                pageSize,
                tags: activeTag.value ? [activeTag.value] : [],
                kind: kind.value,
                status: status.value,
                dateFrom: dateFrom.value,
                dateTo: dateTo.value,
            });
            posts.value = response.items;
            totalItems.value = response.totalItems;
            totalPage.value = response.totalPage;
        } else {
            const response = await listBlogPosts({
                page: page.value,
                pageSize,
                tag: activeTag.value,
                kind: kind.value,
                status: status.value,
                dateFrom: dateFrom.value,
                dateTo: dateTo.value,
                orderBy: 'date',
                order: 'desc',
            });
            posts.value = response.items;
            totalItems.value = response.totalItems;
            totalPage.value = response.totalPage;
        }
    } catch (error) {
        console.error('load posts failed', error);
        if (error instanceof AuthenticationError) {
            router.push('/login');
        } else {
            ElMessage.error('加载日记失败');
        }
    } finally {
        loading.value = false;
    }
};

const search = () => {
    page.value = 1;
    void loadPosts();
};

const resetFilters = () => {
    query.value = '';
    activeTag.value = '';
    kind.value = '';
    status.value = 'published';
    dateFrom.value = '';
    dateTo.value = '';
    page.value = 1;
    void loadPosts();
};

const toggleTag = (tag: string) => {
    activeTag.value = activeTag.value === tag ? '' : tag;
    page.value = 1;
    void loadPosts();
};

const selectArchive = (item: BlogArchiveItem) => {
    const month = String(item.month).padStart(2, '0');
    const lastDay = new Date(item.year, item.month, 0).getDate();
    dateFrom.value = `${item.year}-${month}-01`;
    dateTo.value = `${item.year}-${month}-${String(lastDay).padStart(2, '0')}`;
    page.value = 1;
    void loadPosts();
};

const changePage = (next: number) => {
    page.value = next;
    void loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

const openPost = (post: BlogPostSummary) => {
    router.push({ name: 'blog-post', params: { id: String(post.id) }, query: isMock.value ? { mock: '1' } : {} });
};

const openEditor = () => {
    router.push({ name: 'blog-editor', query: isMock.value ? { mock: '1' } : {} });
};

onMounted(async () => {
    applyArchiveRoute();
    await loadMeta();
    await loadPosts();
});
</script>

<template>
    <div class="blog-feed">
        <header class="feed-header">
            <div class="feed-actions">
                <el-button type="primary" :icon="EditPen" @click="openQuickCapture()">随手一记</el-button>
                <el-button :icon="Plus" @click="openEditor">写长文</el-button>
            </div>
        </header>

        <div v-if="isMock" class="mock-banner">
            当前为模拟数据预览模式，不会读取实际数据库。
        </div>

        <div class="feed-toolbar">
            <div class="search-box">
                <el-input v-model="query" placeholder="搜索标题、正文或标签……" clearable @keyup.enter="search">
                    <template #prefix>
                        <el-icon><Search /></el-icon>
                    </template>
                </el-input>
                <el-button type="primary" @click="search">搜索</el-button>
            </div>
            <el-button class="mobile-filter-button" :icon="Filter" @click="showMobileFilter = true">
                筛选<span v-if="activeFilterCount">（{{ activeFilterCount }}）</span>
            </el-button>
        </div>

        <div class="feed-layout">
            <aside class="feed-sidebar">
                <section class="filter-section">
                    <h3>标签</h3>
                    <div class="tag-list">
                        <button v-for="tag in tags" :key="tag.id" type="button" class="tag-pill"
                            :class="{ active: activeTag === tag.name }" @click="toggleTag(tag.name)">
                            {{ tag.name }} <span>{{ tag.count }}</span>
                        </button>
                        <span v-if="!tags.length" class="muted">暂无标签</span>
                    </div>
                </section>

                <section class="filter-section">
                    <h3>筛选</h3>
                    <el-select v-model="kind" clearable placeholder="全部类型" style="width: 100%; margin-bottom: 8px"
                        @change="search">
                        <el-option label="随手记" value="note" />
                        <el-option label="长文" value="article" />
                    </el-select>
                    <el-select v-model="status" style="width: 100%; margin-bottom: 8px" @change="search">
                        <el-option label="已发布" value="published" />
                        <el-option label="草稿" value="draft" />
                        <el-option label="全部" value="all" />
                    </el-select>
                    <el-date-picker v-model="dateFrom" type="date" placeholder="从" format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD" style="width: 100%; margin-bottom: 8px" @change="search" />
                    <el-date-picker v-model="dateTo" type="date" placeholder="到" format="YYYY-MM-DD"
                        value-format="YYYY-MM-DD" style="width: 100%; margin-bottom: 8px" @change="search" />
                    <el-button v-if="activeFilterCount" link type="primary" @click="resetFilters">清除筛选</el-button>
                </section>

                <section class="filter-section">
                    <h3>归档</h3>
                    <button v-for="item in archive" :key="item.label" type="button" class="archive-row"
                        @click="selectArchive(item)">
                        <span>{{ item.label }}</span>
                        <span>{{ item.count }}</span>
                    </button>
                </section>

            </aside>

            <main v-loading="loading" class="feed-main">
                <div v-if="posts.length" class="post-grid">
                    <BlogPostCard v-for="post in posts" :key="post.id" :post="post" @open="openPost" />
                </div>
                <el-empty v-else-if="!loading" description="还没有内容，写一篇吧">
                    <el-button type="primary" :icon="EditPen" @click="openQuickCapture()">随手一记</el-button>
                </el-empty>

                <div v-if="totalPage > 1" class="feed-pagination">
                    <el-pagination background layout="prev, pager, next" :current-page="page"
                        :page-size="pageSize" :total="totalPage * pageSize" @current-change="changePage" />
                </div>
            </main>
        </div>

        <el-drawer v-model="showMobileFilter" title="筛选" direction="ltr" size="82%">
            <div class="mobile-filter-body">
                <h3>标签</h3>
                <div class="tag-list">
                    <button v-for="tag in tags" :key="tag.id" type="button" class="tag-pill"
                        :class="{ active: activeTag === tag.name }" @click="toggleTag(tag.name)">
                        {{ tag.name }} <span>{{ tag.count }}</span>
                    </button>
                </div>
                <h3>归档</h3>
                <button v-for="item in archive" :key="item.label" type="button" class="archive-row"
                    @click="selectArchive(item); showMobileFilter = false">
                    <span>{{ item.label }}</span>
                    <span>{{ item.count }}</span>
                </button>
                <h3>筛选</h3>
                <el-select v-model="kind" clearable placeholder="全部类型" style="width: 100%; margin-bottom: 8px"
                    @change="search">
                    <el-option label="随手记" value="note" />
                    <el-option label="长文" value="article" />
                </el-select>
                <el-select v-model="status" style="width: 100%; margin-bottom: 8px" @change="search">
                    <el-option label="已发布" value="published" />
                    <el-option label="草稿" value="draft" />
                    <el-option label="全部" value="all" />
                </el-select>
                <el-button v-if="activeFilterCount" link type="primary" @click="resetFilters">清除筛选</el-button>
            </div>
        </el-drawer>
    </div>
</template>

<style scoped>
.blog-feed {
    max-width: 1240px;
    margin: 0 auto;
    padding: 26px 20px 60px;
    min-height: calc(100vh - 60px);
}

.feed-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    margin-bottom: 18px;
}

.eyebrow {
    margin: 0 0 4px;
    color: #a8abb2;
    font-size: 11px;
    letter-spacing: 0.18em;
}

.feed-header h1 {
    margin: 0;
    color: #1f2d3d;
    font-size: 32px;
}

.feed-subtitle {
    margin: 6px 0 0;
    color: #909399;
    font-size: 14px;
}

.feed-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.mock-banner {
    margin-bottom: 16px;
    padding: 10px 14px;
    border-radius: 10px;
    background: #fdf6ec;
    color: #b88230;
    font-size: 13px;
}

.feed-toolbar {
    display: flex;
    gap: 12px;
    margin-bottom: 18px;
}

.search-box {
    display: flex;
    gap: 8px;
    flex: 1;
    max-width: 620px;
}

.mobile-filter-button {
    display: none;
}

.feed-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 24px;
    align-items: start;
}

.feed-sidebar {
    position: sticky;
    top: 76px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    padding: 16px;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 14px;
}

.filter-section h3 {
    margin: 0 0 10px;
    color: #303133;
    font-size: 14px;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
}

.tag-pill {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    border: 1px solid #e4e7ed;
    border-radius: 999px;
    background: #fff;
    color: #606266;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.tag-pill span {
    color: #a8abb2;
    font-size: 11px;
}

.tag-pill:hover,
.tag-pill.active {
    border-color: #409eff;
    background: #ecf5ff;
    color: #409eff;
}

.archive-row {
    display: flex;
    justify-content: space-between;
    width: 100%;
    padding: 7px 2px;
    border: none;
    background: transparent;
    color: #606266;
    font-size: 13px;
    cursor: pointer;
}

.archive-row:hover {
    color: #409eff;
}

.feed-main {
    min-height: 420px;
}

.post-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 18px;
}

.feed-pagination {
    display: flex;
    justify-content: center;
    margin-top: 28px;
}

.muted {
    color: #c0c4cc;
    font-size: 12px;
}

.mobile-filter-body h3 {
    margin: 18px 0 8px;
    font-size: 14px;
    color: #303133;
}

@media (max-width: 900px) {
    .feed-layout {
        grid-template-columns: 1fr;
    }

    .feed-sidebar {
        display: none;
    }

    .mobile-filter-button {
        display: inline-flex;
    }
}

@media (max-width: 600px) {
    .blog-feed {
        padding: 18px 12px 40px;
    }

    .feed-header {
        flex-direction: column;
        align-items: flex-start;
    }

    .feed-header h1 {
        font-size: 28px;
    }

    .search-box {
        max-width: none;
    }

    .post-grid {
        grid-template-columns: 1fr;
    }
}
</style>
