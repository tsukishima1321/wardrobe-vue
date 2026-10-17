<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import RichTextEditor from './RichTextEditor.vue';
import ImagePickerDialog from './ImagePickerDialog.vue';
import { createBlogPost, getBlogTags, localDateString } from '@/api/blog';
import type { BlogTag } from '@/api/blog';
import { closeQuickCapture, consumeQuickCaptureSeed, useQuickCapture } from '@/composables/useQuickCapture';
import { mockTags } from '@/mocks/blog';
import type { MockImageResult } from '@/mocks/blog';

const router = useRouter();
const route = useRoute();
const isMock = computed(() => route.query.mock === '1');
const { visible } = useQuickCapture();

const editorRef = ref<InstanceType<typeof RichTextEditor> | null>(null);
const saving = ref(false);
const showMore = ref(false);
const tags = ref<string[]>([]);
const availableTags = ref<BlogTag[]>([]);
const date = ref(localDateString());
const contentJson = ref<Record<string, unknown>>({ type: 'doc', content: [] });
const contentHtml = ref('');
const contentText = ref('');
const imagePickerVisible = ref(false);
const imagePickerMode = ref<'insert' | 'reference'>('insert');

const DRAFT_KEY = 'wardrobe-quick-capture-draft';
const EXPAND_KEY = 'wardrobe-blog-editor-seed';

const canPublish = computed(() => Boolean(contentText.value.trim()) || /<img|data-image-ref/.test(contentHtml.value));

const toHtml = (text: string): string => {
    const escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    return escaped.split('\n').map((line) => `<p>${line || '<br>'}</p>`).join('');
};

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

const loadDraft = () => {
    const seed = consumeQuickCaptureSeed();
    const raw = localStorage.getItem(DRAFT_KEY);
    if (seed.text || seed.date) {
        date.value = seed.date || localDateString();
        const html = toHtml(seed.text);
        contentHtml.value = html;
        window.setTimeout(() => editorRef.value?.setContent(html), 60);
        return;
    }
    if (!raw) return;
    try {
        const draft = JSON.parse(raw) as { contentJson?: Record<string, unknown>; contentHtml?: string; contentText?: string; tags?: string[]; date?: string };
        contentJson.value = draft.contentJson ?? contentJson.value;
        contentHtml.value = draft.contentHtml ?? '';
        contentText.value = draft.contentText ?? '';
        tags.value = draft.tags ?? [];
        date.value = draft.date ?? date.value;
        window.setTimeout(() => editorRef.value?.setContent(contentJson.value), 60);
    } catch {
        localStorage.removeItem(DRAFT_KEY);
    }
};

const persistDraft = () => {
    if (!contentText.value.trim() && !contentHtml.value) {
        localStorage.removeItem(DRAFT_KEY);
        return;
    }
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
        contentJson: contentJson.value,
        contentHtml: contentHtml.value,
        contentText: contentText.value,
        tags: tags.value,
        date: date.value,
    }));
};

watch(visible, (open) => {
    if (open) {
        void loadTags();
        nextTick(loadDraft);
    }
}, { immediate: true });

watch([contentJson, contentHtml, contentText, tags, date], persistDraft, { deep: true });

const updateContent = (payload: { json?: Record<string, unknown>; html?: string; text?: string }) => {
    if (payload.json) contentJson.value = payload.json;
    if (payload.html !== undefined) contentHtml.value = payload.html;
    if (payload.text !== undefined) contentText.value = payload.text;
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

const publish = async () => {
    if (isMock.value) {
        ElMessage.info('模拟数据预览模式不会发布');
        return;
    }
    if (!canPublish.value) {
        ElMessage.warning('先写点什么吧');
        return;
    }
    saving.value = true;
    try {
        const response = await createBlogPost({
            kind: 'note',
            status: 'published',
            date: date.value,
            contentJson: contentJson.value,
            contentHtml: contentHtml.value,
            contentText: contentText.value,
            tags: tags.value,
        });
        ElMessage.success('已发布');
        localStorage.removeItem(DRAFT_KEY);
        closeQuickCapture();
        router.push({ name: 'blog-post', params: { id: String(response.post.id) } });
    } catch (error) {
        console.error('publish quick note failed', error);
        ElMessage.error('发布失败，请稍后重试');
    } finally {
        saving.value = false;
    }
};

const handleKeydown = (event: KeyboardEvent) => {
    if (!visible.value) return;
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        void publish();
    }
};

onMounted(() => window.addEventListener('keydown', handleKeydown));
onBeforeUnmount(() => window.removeEventListener('keydown', handleKeydown));

const expandToEditor = () => {
    localStorage.removeItem(DRAFT_KEY);
    sessionStorage.setItem(EXPAND_KEY, JSON.stringify({
        date: date.value,
        contentJson: contentJson.value,
        contentHtml: contentHtml.value,
        contentText: contentText.value,
        tags: tags.value,
    }));
    closeQuickCapture();
    router.push({ name: 'blog-editor', query: { fromQuick: '1' } });
};
</script>

<template>
    <el-dialog v-model="visible" title="随手一记" width="min(96vw, 760px)" top="6vh"
        :close-on-click-modal="false" class="quick-capture-dialog" destroy-on-close>
        <div class="quick-meta">
            <span class="date-pill">{{ date }}</span>
            <el-button v-if="!showMore" link type="primary" @click="showMore = true">更多设置</el-button>
        </div>

        <RichTextEditor ref="editorRef" compact min-height="220px" autofocus
            placeholder="今天想记下什么？可以直接粘贴或拖入图片……"
            :model-value="contentJson"
            @update:model-value="(value) => updateContent({ json: value })"
            @update:html="(html) => updateContent({ html })"
            @update:text="(text) => updateContent({ text })"
            @open-image-picker="openImagePicker" />

        <div class="quick-extra">
            <el-select v-model="tags" multiple filterable allow-create default-first-option
                placeholder="添加标签（可选）" class="tag-select">
                <el-option v-for="tag in availableTags" :key="tag.id" :label="tag.name" :value="tag.name" />
            </el-select>

            <div v-if="showMore" class="more-fields">
                <el-date-picker v-model="date" type="date" format="YYYY-MM-DD" value-format="YYYY-MM-DD"
                    placeholder="日期" style="width: 160px" />
            </div>
        </div>

        <template #footer>
            <div class="quick-footer">
                <div class="quick-options">
                    <el-button link @click="showMore = !showMore">
                        {{ showMore ? '收起' : '更多设置' }}
                    </el-button>
                    <el-button link type="primary" @click="expandToEditor">展开为长文</el-button>
                </div>
                <div class="quick-actions">
                    <el-button @click="visible = false">取消</el-button>
                    <el-button type="primary" :loading="saving" :disabled="!canPublish" @click="publish">
                        发布 <span class="shortcut-hint">Ctrl/⌘ + Enter</span>
                    </el-button>
                </div>
            </div>
        </template>

        <ImagePickerDialog v-model="imagePickerVisible" :mode="imagePickerMode" :date="date" :tags="tags"
            :mock="isMock" @select="onImagesSelected" />
    </el-dialog>
</template>

<style scoped>
.quick-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.date-pill {
    padding: 4px 10px;
    border-radius: 999px;
    background: #f2f6fc;
    color: #606266;
    font-size: 12px;
}

.quick-extra {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 14px;
}

.tag-select {
    width: 100%;
}

.more-fields {
    display: flex;
    gap: 10px;
}

.quick-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.quick-options,
.quick-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.shortcut-hint {
    margin-left: 6px;
    font-size: 11px;
    opacity: 0.7;
}

@media (max-width: 600px) {
    .quick-footer {
        flex-direction: column;
        align-items: stretch;
    }

    .quick-options,
    .quick-actions {
        justify-content: space-between;
    }
}
</style>
