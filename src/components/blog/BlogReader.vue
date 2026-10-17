<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElImageViewer, ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Edit, Delete, Calendar, Notebook, Picture } from '@element-plus/icons-vue';
import DOMPurify from 'dompurify';
import { blogImageUrl, blogOriginalImageUrl, deleteBlogPost, getBlogPost } from '@/api/blog';
import type { BlogPostDetail } from '@/api/blog';
import { getMockPost } from '@/mocks/blog';
import { AuthenticationError } from '@/api/token';

const route = useRoute();
const router = useRouter();

const post = ref<BlogPostDetail | null>(null);
const loading = ref(true);
const errorText = ref('');
const previewVisible = ref(false);
const previewIndex = ref(0);
const previewUrls = ref<string[]>([]);

const isMock = computed(() => route.query.mock === '1');

const safeHtml = computed(() => {
    if (!post.value) return '';
    return DOMPurify.sanitize(post.value.contentHtml || '', {
        ADD_ATTR: ['target', 'data-image-href', 'data-image-ref'],
        ADD_TAGS: ['figure', 'figcaption'],
    });
});

const displayTitle = computed(() => post.value?.title || '无标题');

const dateText = computed(() => {
    if (!post.value?.date) return '';
    const date = new Date(`${post.value.date}T00:00:00`);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });
});

const coverUrl = computed(() => post.value?.coverImageHref ? blogImageUrl(post.value.coverImageHref, 'thumb') : '');

const load = async () => {
    loading.value = true;
    errorText.value = '';
    const id = Number(route.params.id);
    if (!Number.isFinite(id)) {
        errorText.value = '文章 ID 无效';
        loading.value = false;
        return;
    }
    if (isMock.value) {
        post.value = getMockPost(id);
        if (!post.value) errorText.value = '模拟文章不存在';
        loading.value = false;
        return;
    }
    try {
        post.value = await getBlogPost(id);
    } catch (error) {
        console.error('load post failed', error);
        if (error instanceof AuthenticationError) {
            router.push('/login');
            return;
        }
        errorText.value = '文章不存在或加载失败';
    } finally {
        loading.value = false;
    }
};

const goBack = () => {
    router.push({ name: 'diary', query: isMock.value ? { mock: '1' } : {} });
};

const editPost = () => {
    if (!post.value) return;
    router.push({
        name: 'blog-editor-edit',
        params: { id: String(post.value.id) },
        query: isMock.value ? { mock: '1' } : {},
    });
};

const removePost = async () => {
    if (!post.value) return;
    if (isMock.value) {
        ElMessage.info('模拟数据预览模式不会删除');
        return;
    }
    try {
        await ElMessageBox.confirm('删除后不可恢复，确定删除这篇文章吗？', '删除文章', {
            type: 'warning',
            confirmButtonText: '删除',
            cancelButtonText: '取消',
        });
    } catch {
        return;
    }
    try {
        await deleteBlogPost(post.value.id);
        ElMessage.success('已删除');
        goBack();
    } catch (error) {
        console.error('delete post failed', error);
        ElMessage.error('删除失败');
    }
};

const onContentClick = (event: MouseEvent) => {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'IMG') return;
    event.preventDefault();
    const href = target.getAttribute('data-image-href');
    const src = href ? blogOriginalImageUrl(href) : (target as HTMLImageElement).src;
    previewUrls.value = [src];
    previewIndex.value = 0;
    previewVisible.value = true;
};

onMounted(load);
</script>

<template>
    <div class="blog-reader">
        <div class="reader-topbar">
            <el-button link :icon="ArrowLeft" @click="goBack">返回日记</el-button>
            <div v-if="post" class="reader-actions">
                <el-button link type="primary" :icon="Edit" @click="editPost">编辑</el-button>
                <el-button link type="danger" :icon="Delete" @click="removePost">删除</el-button>
            </div>
        </div>

        <div v-loading="loading" class="reader-shell">
            <el-result v-if="errorText" icon="warning" :title="errorText">
                <template #extra>
                    <el-button type="primary" @click="goBack">返回日记</el-button>
                </template>
            </el-result>

            <template v-else-if="post">
                <header class="reader-header">
                    <div class="reader-meta">
                        <span class="kind-badge">
                            <el-icon>
                                <Picture v-if="post.kind === 'article'" />
                                <Notebook v-else />
                            </el-icon>
                            {{ post.kind === 'article' ? '文章' : '随手记' }}
                        </span>
                        <span><el-icon><Calendar /></el-icon> {{ dateText }}</span>
                        <span v-if="post.status === 'draft'" class="draft-badge">草稿</span>
                        <span>{{ post.wordCount }} 字</span>
                    </div>
                    <h1>{{ displayTitle }}</h1>
                    <div v-if="post.tags.length" class="reader-tags">
                        <el-tag v-for="tag in post.tags" :key="tag" effect="plain" type="info">{{ tag }}</el-tag>
                    </div>
                </header>

                <div v-if="coverUrl" class="reader-cover">
                    <img :src="coverUrl" :alt="post.title" />
                </div>

                <article class="blog-content" v-html="safeHtml" @click="onContentClick"></article>

                <section v-if="post.images.length" class="reader-images">
                    <h2>本文图片</h2>
                    <div class="reader-image-grid">
                        <router-link v-for="image in post.images" :key="image.href"
                            :to="image.collectionHref
                                ? { name: 'detail', params: { src: image.collectionHref } }
                                : { name: 'detail', params: { src: image.href } }" class="reader-image-link">
                            <img :src="blogImageUrl(image.href, 'small')" :alt="image.href" loading="lazy" />
                            <span>{{ image.collectionHref ? `合集内图片 · ${image.href}` : image.href }}</span>
                        </router-link>
                    </div>
                </section>
            </template>
        </div>

        <ElImageViewer v-if="previewVisible" :url-list="previewUrls" :initial-index="previewIndex"
            @close="previewVisible = false" />
    </div>
</template>

<style scoped>
.blog-reader {
    max-width: 980px;
    margin: 0 auto;
    padding: 20px 20px 80px;
}

.reader-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
}

.reader-actions {
    display: flex;
    gap: 10px;
}

.reader-shell {
    min-height: 420px;
}

.reader-header {
    margin-bottom: 26px;
}

.reader-meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    color: #909399;
    font-size: 13px;
}

.reader-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.kind-badge {
    padding: 3px 9px;
    border-radius: 999px;
    background: #f4f8ff;
    color: #409eff;
}

.draft-badge {
    padding: 2px 8px;
    border-radius: 999px;
    background: #fef0f0;
    color: #f56c6c;
}

.reader-header h1 {
    margin: 14px 0 12px;
    color: #1f2d3d;
    font-size: 36px;
    line-height: 1.3;
    word-break: break-word;
}

.reader-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.reader-cover {
    margin: 0 0 30px;
    border-radius: 16px;
    overflow: hidden;
    background: #f5f7fa;
}

.reader-cover img {
    display: block;
    width: 100%;
    max-height: 480px;
    object-fit: cover;
}

.blog-content {
    color: #303133;
    font-size: 16px;
    line-height: 1.9;
    word-break: break-word;
}

.blog-content :deep(p) {
    margin: 0 0 1.15em;
}

.blog-content :deep(h1),
.blog-content :deep(h2),
.blog-content :deep(h3),
.blog-content :deep(h4) {
    margin: 1.6em 0 0.7em;
    color: #1f2d3d;
    line-height: 1.4;
}

.blog-content :deep(h1) { font-size: 1.8em; }
.blog-content :deep(h2) { font-size: 1.5em; }
.blog-content :deep(h3) { font-size: 1.25em; }

.blog-content :deep(a) {
    color: #409eff;
    text-decoration: underline;
    text-underline-offset: 2px;
}

.blog-content :deep(blockquote) {
    margin: 1.2em 0;
    padding: 10px 18px;
    border-left: 3px solid #c6e2ff;
    background: #f6faff;
    color: #5c6b7a;
}

.blog-content :deep(ul),
.blog-content :deep(ol) {
    padding-left: 1.5em;
    margin: 0 0 1.2em;
}

.blog-content :deep(li) {
    margin: 0.3em 0;
}

.blog-content :deep(pre) {
    margin: 1.2em 0;
    padding: 16px;
    border-radius: 10px;
    background: #f5f7fa;
    overflow-x: auto;
    line-height: 1.6;
}

.blog-content :deep(code) {
    padding: 2px 5px;
    border-radius: 4px;
    background: #f5f7fa;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
}

.blog-content :deep(pre code) {
    padding: 0;
    background: transparent;
}

.blog-content :deep(img) {
    display: block;
    max-width: 100%;
    height: auto;
    margin: 20px auto;
    border-radius: 12px;
    cursor: zoom-in;
}

.blog-content :deep(hr) {
    margin: 2em auto;
    border: none;
    border-top: 1px solid #ebeef5;
}

.blog-content :deep(mark) {
    background: #fff3c4;
    padding: 0 2px;
    border-radius: 3px;
}

.blog-content :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 1.2em 0;
}

.blog-content :deep(th),
.blog-content :deep(td) {
    border: 1px solid #ebeef5;
    padding: 8px 10px;
    text-align: left;
}

.blog-content :deep(th) {
    background: #fafcff;
}

.blog-content :deep(.blog-image-ref) {
    display: inline-flex;
    align-items: center;
    padding: 2px 9px;
    border-radius: 999px;
    background: #ecf5ff;
    color: #409eff;
    text-decoration: none;
    font-size: 0.92em;
}

.reader-images {
    margin-top: 46px;
    padding-top: 24px;
    border-top: 1px solid #ebeef5;
}

.reader-images h2 {
    margin: 0 0 14px;
    font-size: 18px;
    color: #303133;
}

.reader-image-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(108px, 1fr));
    gap: 10px;
}

.reader-image-link {
    display: flex;
    flex-direction: column;
    gap: 5px;
    color: #a8abb2;
    font-size: 11px;
    text-decoration: none;
}

.reader-image-link img {
    width: 100%;
    aspect-ratio: 1;
    object-fit: cover;
    border-radius: 8px;
    background: #f5f7fa;
}

.reader-image-link span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

@media (max-width: 600px) {
    .blog-reader {
        padding: 14px 14px 50px;
    }

    .reader-header h1 {
        font-size: 28px;
    }

    .blog-content {
        font-size: 15px;
    }
}
</style>
