<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowLeft, Picture, Delete, View } from '@element-plus/icons-vue';
import DOMPurify from 'dompurify';
import RichTextEditor from './RichTextEditor.vue';
import ImagePickerDialog from './ImagePickerDialog.vue';
import {
    createBlogPost,
    getBlogPost,
    getBlogTags,
    updateBlogPost,
    blogImageUrl,
    localDateString,
} from '@/api/blog';
import type { BlogKind, BlogPostDetail, BlogTag } from '@/api/blog';
import { getMockPost, mockTags } from '@/mocks/blog';
import type { MockImageResult } from '@/mocks/blog';
import { AuthenticationError } from '@/api/token';

const route = useRoute();
const router = useRouter();

const isMock = computed(() => route.query.mock === '1');
const postId = ref<number | null>(route.params.id ? Number(route.params.id) : null);
const loading = ref(false);
const initialized = ref(false);
const saving = ref(false);
const saveState = ref<'saved' | 'dirty' | 'saving'>('saved');
const lastSavedAt = ref('');
const pendingSave = ref(false);
const title = ref('');
const kind = ref<BlogKind>('article');
const status = ref<'draft' | 'published'>('draft');
const date = ref(localDateString());
const tags = ref<string[]>([]);
const availableTags = ref<BlogTag[]>([]);
const coverImageHref = ref<string | null>(null);
const isPinned = ref(false);
const contentJson = ref<Record<string, unknown> | null>(null);
const contentHtml = ref('');
const contentText = ref('');
const editorRef = ref<InstanceType<typeof RichTextEditor> | null>(null);
const imagePickerVisible = ref(false);
const imagePickerMode = ref<'insert' | 'reference'>('insert');
const coverPickerVisible = ref(false);
const previewVisible = ref(false);

const EXPAND_KEY = 'wardrobe-blog-editor-seed';
let autosaveTimer: number | null = null;
let allowAutosave = false;

const coverUrl = computed(() => coverImageHref.value ? blogImageUrl(coverImageHref.value, 'thumb') : '');
const safePreviewHtml = computed(() => DOMPurify.sanitize(contentHtml.value, {
    ADD_ATTR: ['target', 'data-image-href', 'data-image-ref'],
    ADD_TAGS: ['figure', 'figcaption'],
}));

const loadTags = async () => {
    if (isMock.value) {
        availableTags.value = mockTags;
        return;
    }
    try {
        availableTags.value = await getBlogTags();
    } catch {
        availableTags.value = [];
    }
};

const applyPost = (post: BlogPostDetail) => {
    postId.value = post.id;
    title.value = post.title;
    kind.value = post.kind;
    status.value = post.status;
    date.value = post.date;
    tags.value = [...post.tags];
    coverImageHref.value = post.coverImageHref;
    isPinned.value = post.isPinned;
    contentJson.value = post.contentJson;
    contentHtml.value = post.contentHtml;
    contentText.value = post.contentText;
};

const load = async () => {
    loading.value = true;
    try {
        await loadTags();
        const id = Number(route.params.id);
        if (Number.isFinite(id) && route.params.id) {
            if (isMock.value) {
                const mock = getMockPost(id);
                if (!mock) throw new Error('模拟文章不存在');
                applyPost(mock);
            } else {
                applyPost(await getBlogPost(id));
            }
        } else {
            const seed = sessionStorage.getItem(EXPAND_KEY);
            if (seed && route.query.fromQuick === '1') {
                sessionStorage.removeItem(EXPAND_KEY);
                try {
                    const parsed = JSON.parse(seed) as Partial<BlogPostDetail> & { tags?: string[] };
                    date.value = parsed.date || date.value;
                    contentJson.value = parsed.contentJson || null;
                    contentHtml.value = parsed.contentHtml || '';
                    contentText.value = parsed.contentText || '';
                    tags.value = parsed.tags || [];
                    kind.value = 'article';
                } catch {
                    // ignore broken seed
                }
            }
        }

        initialized.value = true;
        await nextTick();
        window.setTimeout(() => { allowAutosave = true; }, 300);
        const imageHref = typeof route.query.image === 'string' ? route.query.image : '';
        if (imageHref) {
            window.setTimeout(() => editorRef.value?.insertImage(imageHref), 120);
            const query = { ...route.query };
            delete query.image;
            void router.replace({ query });
        }
    } catch (error) {
        console.error('load blog editor failed', error);
        if (error instanceof AuthenticationError) {
            router.push('/login');
            return;
        }
        ElMessage.error('加载文章失败');
        router.replace({ name: 'diary' });
    } finally {
        loading.value = false;
    }
};

const buildPayload = (statusOverride?: 'draft' | 'published') => ({
    title: title.value,
    kind: kind.value,
    status: statusOverride ?? status.value,
    date: date.value,
    tags: tags.value,
    coverImageHref: coverImageHref.value,
    isPinned: isPinned.value,
    contentJson: editorRef.value?.getJSON() ?? contentJson.value ?? { type: 'doc', content: [] },
    contentHtml: editorRef.value?.getHTML() ?? contentHtml.value,
    contentText: editorRef.value?.getText() ?? contentText.value,
});

const persist = async (statusOverride?: 'draft' | 'published', silent = false): Promise<BlogPostDetail | null> => {
    if (isMock.value) {
        if (!silent) ElMessage.info('模拟数据预览模式不会保存');
        return null;
    }
    const payload = buildPayload(statusOverride);
    const hasContent = (payload.contentText || '').trim() || title.value.trim() || /<img|data-image-ref/.test(payload.contentHtml || '');
    if (!hasContent) return null;
    if (saving.value) {
        pendingSave.value = true;
        return null;
    }

    saving.value = true;
    pendingSave.value = false;
    if (!silent) saveState.value = 'saving';
    try {
        const response = postId.value
            ? await updateBlogPost(postId.value, payload)
            : await createBlogPost(payload);
        postId.value = response.post.id;
        status.value = response.post.status;
        if (!title.value.trim()) {
            title.value = response.post.title;
        }
        if (!coverImageHref.value) {
            coverImageHref.value = response.post.coverImageHref;
        }
        if (!route.params.id) {
            void router.replace({
                name: 'blog-editor-edit',
                params: { id: String(response.post.id) },
                query: { ...route.query },
            });
        }
        saveState.value = 'saved';
        lastSavedAt.value = new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        if (response.warnings?.length) {
            ElMessage.warning(response.warnings[0]);
        }
        return response.post;
    } catch (error) {
        console.error('save blog post failed', error);
        saveState.value = 'dirty';
        if (!silent) {
            if (error instanceof AuthenticationError) {
                router.push('/login');
            } else {
                ElMessage.error('保存失败，请稍后重试');
            }
        }
        return null;
    } finally {
        saving.value = false;
        if (pendingSave.value) {
            pendingSave.value = false;
            scheduleAutosave();
        }
    }
};

const scheduleAutosave = () => {
    if (!allowAutosave || isMock.value) return;
    saveState.value = 'dirty';
    if (autosaveTimer) window.clearTimeout(autosaveTimer);
    autosaveTimer = window.setTimeout(() => {
        autosaveTimer = null;
        void persist(status.value, true);
    }, 2500);
};

watch([title, kind, date, tags, coverImageHref, isPinned, contentJson, contentHtml, contentText], () => {
    if (initialized.value) {
        scheduleAutosave();
    }
}, { deep: true });

const updateContent = (payload: { json?: Record<string, unknown>; html?: string; text?: string }) => {
    if (payload.json) contentJson.value = payload.json;
    if (payload.html !== undefined) contentHtml.value = payload.html;
    if (payload.text !== undefined) contentText.value = payload.text;
};

const saveDraft = async () => {
    const result = await persist(status.value);
    if (result) ElMessage.success('已保存');
};

const publish = async () => {
    if (kind.value === 'article' && !title.value.trim()) {
        ElMessage.warning('长文发布前需要填写标题');
        return;
    }
    if ((editorRef.value?.isEmpty() ?? true) && !title.value.trim()) {
        ElMessage.warning('先写点什么吧');
        return;
    }
    if (saving.value) {
        await new Promise<void>((resolve) => {
            const timer = window.setInterval(() => {
                if (!saving.value) {
                    window.clearInterval(timer);
                    resolve();
                }
            }, 100);
        });
    }
    const result = await persist('published');
    if (result) {
        status.value = result.status;
        ElMessage.success('已发布');
        router.push({ name: 'blog-post', params: { id: String(result.id) }, query: isMock.value ? { mock: '1' } : {} });
    }
};

const togglePublish = async () => {
    if (!postId.value) return;
    try {
        if (status.value === 'published') {
            await ElMessageBox.confirm('转为草稿后不会出现在 Feed 和首页发现中，继续吗？', '转为草稿', {
                type: 'warning',
                confirmButtonText: '转为草稿',
                cancelButtonText: '取消',
            });
            const result = await persist('draft');
            if (result) ElMessage.success('已转为草稿');
        } else {
            if (kind.value === 'article' && !title.value.trim()) {
                ElMessage.warning('长文发布前需要填写标题');
                return;
            }
            const result = await persist('published');
            if (result) ElMessage.success('已发布');
        }
    } catch (error) {
        if (error === 'cancel' || error === 'close') return;
        console.error('toggle publish failed', error);
        ElMessage.error('操作失败');
    }
};

const openImagePicker = (mode: 'insert' | 'reference') => {
    imagePickerMode.value = mode;
    imagePickerVisible.value = true;
};

const onImagesSelected = (images: MockImageResult[], mode: 'insert' | 'reference') => {
    if (mode === 'reference') {
        const image = images[0];
        if (image) editorRef.value?.insertImageRef(image.src, image.title || '引用图片');
        return;
    }
    images.forEach((image) => editorRef.value?.insertImage(image.src, image.title || '', ''));
};

const onCoverSelected = (images: MockImageResult[]) => {
    const image = images[0];
    if (image) coverImageHref.value = image.src;
};

const goBack = () => {
    if (postId.value) {
        router.push({ name: 'blog-post', params: { id: String(postId.value) }, query: isMock.value ? { mock: '1' } : {} });
    } else {
        router.push({ name: 'diary', query: isMock.value ? { mock: '1' } : {} });
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void saveDraft();
    }
};

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
    void load();
});


onBeforeUnmount(() => {
    allowAutosave = false;
    window.removeEventListener('keydown', handleKeydown);
    if (autosaveTimer) window.clearTimeout(autosaveTimer);
});
</script>

<template>
    <div class="blog-editor-page">
        <div class="editor-topbar">
            <el-button link :icon="ArrowLeft" @click="goBack">返回</el-button>
            <div class="editor-top-actions">
                <span class="save-state" :class="saveState">
                    <template v-if="saveState === 'saving'">保存中…</template>
                    <template v-else-if="saveState === 'dirty'">未保存</template>
                    <template v-else>已保存{{ lastSavedAt ? ` ${lastSavedAt}` : '' }}</template>
                </span>
                <el-button :icon="View" @click="previewVisible = true">预览</el-button>
                <el-button @click="saveDraft" :loading="saving">保存</el-button>
                <el-button v-if="postId" :type="status === 'published' ? 'warning' : 'success'" plain
                    @click="togglePublish">
                    {{ status === 'published' ? '转为草稿' : '发布' }}
                </el-button>
                <el-button type="primary" :loading="saving" @click="publish">发布</el-button>
            </div>
        </div>

        <div v-if="isMock" class="mock-banner">模拟数据预览模式，不会写入实际数据库。</div>

        <div v-loading="loading" class="editor-shell">
            <template v-if="!loading">
                <div class="editor-main">
                    <el-input v-model="title"
                        :placeholder="kind === 'article' ? '文章标题' : '标题（可留空，默认为日期）'"
                        class="title-input" maxlength="200" show-word-limit />

                    <div class="editor-meta">
                        <el-date-picker v-model="date" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                            placeholder="日期" style="width: 150px" />
                        <el-select v-model="kind" style="width: 120px">
                            <el-option label="长文" value="article" />
                            <el-option label="随手记" value="note" />
                        </el-select>
                        <el-select v-model="tags" multiple filterable allow-create default-first-option
                            placeholder="标签" class="tag-select">
                            <el-option v-for="tag in availableTags" :key="tag.id" :label="tag.name" :value="tag.name" />
                        </el-select>
                        <el-checkbox v-model="isPinned">置顶</el-checkbox>
                    </div>

                    <RichTextEditor ref="editorRef" :model-value="contentJson" min-height="440px"
                        placeholder="开始写正文……"
                        @update:model-value="(value) => updateContent({ json: value })"
                        @update:html="(html) => updateContent({ html })"
                        @update:text="(text) => updateContent({ text })"
                        @open-image-picker="openImagePicker" />
                </div>

                <aside class="editor-side">
                    <section class="side-card">
                        <h3>封面</h3>
                        <div v-if="coverUrl" class="cover-preview">
                            <img :src="coverUrl" alt="封面" />
                            <el-button circle size="small" type="danger" :icon="Delete"
                                @click="coverImageHref = null" />
                        </div>
                        <el-button v-else :icon="Picture" @click="coverPickerVisible = true">选择封面</el-button>
                        <el-button v-if="coverUrl" link type="primary" @click="coverPickerVisible = true">
                            更换封面
                        </el-button>
                    </section>

                    <section class="side-card">
                        <h3>文章信息</h3>
                        <p><span>类型</span><strong>{{ kind === 'article' ? '长文' : '随手记' }}</strong></p>
                        <p><span>状态</span><strong>{{ status === 'published' ? '已发布' : '草稿' }}</strong></p>
                        <p><span>字数</span><strong>{{ contentText.length }}</strong></p>
                        <p v-if="postId"><span>ID</span><strong>{{ postId }}</strong></p>
                    </section>

                    <section class="side-card hint-card">
                        <h3>写作提示</h3>
                        <p>图片会通过图片系统插入，保存后自动登记引用关系。</p>
                        <p>随手记可以留空标题，发布时会使用日期作为标题。</p>
                        <p>Ctrl/⌘ + S 可手动保存草稿。</p>
                    </section>
                </aside>
            </template>
        </div>

        <ImagePickerDialog v-model="imagePickerVisible" :mode="imagePickerMode" :date="date" :tags="tags"
            :mock="isMock" @select="onImagesSelected" />
        <ImagePickerDialog v-model="coverPickerVisible" mode="insert" :date="date" :tags="tags" :mock="isMock"
            @select="onCoverSelected" />

        <el-dialog v-model="previewVisible" title="预览" width="min(96vw, 860px)" top="4vh">
            <article class="preview-content" v-html="safePreviewHtml"></article>
        </el-dialog>
    </div>
</template>

<style scoped>
.blog-editor-page {
    max-width: 1240px;
    margin: 0 auto;
    padding: 18px 20px 60px;
}

.editor-topbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    margin-bottom: 18px;
}

.editor-top-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.save-state {
    color: #a8abb2;
    font-size: 12px;
    margin-right: 4px;
}

.save-state.dirty {
    color: #e6a23c;
}

.mock-banner {
    margin-bottom: 14px;
    padding: 9px 14px;
    border-radius: 10px;
    background: #fdf6ec;
    color: #b88230;
    font-size: 13px;
}

.editor-shell {
    min-height: 480px;
}

.editor-main {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.title-input :deep(.el-input__wrapper) {
    box-shadow: none;
    border-bottom: 1px solid #e4e7ed;
    border-radius: 0;
    padding-left: 0;
}

.title-input :deep(.el-input__inner) {
    font-size: 30px;
    font-weight: 700;
    color: #1f2d3d;
    height: 54px;
}

.editor-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
}

.tag-select {
    min-width: 220px;
    flex: 1;
    max-width: 420px;
}

.editor-side {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px;
    margin-top: 22px;
}

.side-card {
    padding: 14px 16px;
    border: 1px solid #ebeef5;
    border-radius: 12px;
    background: #fff;
}

.side-card h3 {
    margin: 0 0 10px;
    color: #303133;
    font-size: 14px;
}

.side-card p {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    margin: 6px 0;
    color: #909399;
    font-size: 13px;
}

.side-card p strong {
    color: #606266;
    font-weight: 500;
}

.hint-card p {
    display: block;
    line-height: 1.6;
    margin: 0 0 8px;
    color: #909399;
}

.cover-preview {
    position: relative;
    margin-bottom: 10px;
}

.cover-preview img {
    width: 100%;
    height: 120px;
    object-fit: cover;
    border-radius: 8px;
}

.cover-preview :deep(.el-button) {
    position: absolute;
    top: 8px;
    right: 8px;
}

.preview-content {
    max-height: 74vh;
    overflow-y: auto;
    line-height: 1.8;
    color: #303133;
}

.preview-content :deep(img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
}

.preview-content :deep(blockquote) {
    margin: 1em 0;
    padding: 8px 16px;
    border-left: 3px solid #c6e2ff;
    background: #f6faff;
}

.preview-content :deep(pre) {
    background: #f5f7fa;
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
}

@media (max-width: 900px) {
    .editor-side {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 600px) {
    .blog-editor-page {
        padding: 12px 12px 40px;
    }

    .editor-topbar {
        flex-direction: column;
        align-items: flex-start;
    }

    .title-input :deep(.el-input__inner) {
        font-size: 24px;
    }
}
</style>
