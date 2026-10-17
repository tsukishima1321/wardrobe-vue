<script setup lang="ts">
import { computed } from 'vue';
import { Picture, Notebook } from '@element-plus/icons-vue';
import type { BlogPostSummary } from '@/api/blog';
import { blogImageUrl } from '@/api/blog';

const props = defineProps<{
    post: BlogPostSummary;
}>();

const emit = defineEmits<{
    (e: 'open', post: BlogPostSummary): void;
}>();

const coverUrl = computed(() => props.post.coverImageHref ? blogImageUrl(props.post.coverImageHref, 'thumb') : '');

const dateText = computed(() => {
    if (!props.post.date) return '';
    const date = new Date(`${props.post.date}T00:00:00`);
    return date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
});

type Segment = { text: string; mark: boolean };

const previewSegments = computed<Segment[]>(() => {
    const snippet = props.post.snippet;
    if (!snippet || !snippet.highlights.length) {
        return [{ text: props.post.excerpt || props.post.title, mark: false }];
    }
    const segments: Segment[] = [];
    let cursor = 0;
    for (const [start, end] of snippet.highlights) {
        if (start > cursor) {
            segments.push({ text: snippet.text.slice(cursor, start), mark: false });
        }
        segments.push({ text: snippet.text.slice(start, end), mark: true });
        cursor = end;
    }
    if (cursor < snippet.text.length) {
        segments.push({ text: snippet.text.slice(cursor), mark: false });
    }
    return segments;
});

const open = () => emit('open', props.post);
</script>

<template>
    <article class="post-card" :class="[`kind-${post.kind}`, { 'has-cover': Boolean(coverUrl) }]" @click="open">
        <div v-if="coverUrl" class="post-cover">
            <img :src="coverUrl" :alt="post.title" loading="lazy" />
        </div>

        <div class="post-body">
            <div class="post-topline">
                <span class="kind-badge">
                    <el-icon>
                        <Picture v-if="post.kind === 'article'" />
                        <Notebook v-else />
                    </el-icon>
                    {{ post.kind === 'article' ? '文章' : '随手记' }}
                </span>
                <span class="post-date">{{ dateText }}</span>
                <span v-if="post.status === 'draft'" class="draft-badge">草稿</span>
            </div>

            <h2 v-if="post.title && post.kind === 'article'" class="post-title">{{ post.title }}</h2>
            <h3 v-else-if="post.title" class="post-title note-title">{{ post.title }}</h3>

            <p class="post-preview">
                <template v-for="(segment, index) in previewSegments" :key="index">
                    <mark v-if="segment.mark">{{ segment.text }}</mark>
                    <template v-else>{{ segment.text }}</template>
                </template>
            </p>

            <div class="post-footer">
                <div class="post-tags">
                    <el-tag v-for="tag in post.tags" :key="tag" size="small" type="info" effect="plain">
                        {{ tag }}
                    </el-tag>
                </div>
                <span class="post-length">{{ post.wordCount }} 字</span>
            </div>
        </div>
    </article>
</template>

<style scoped>
.post-card {
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid #ebeef5;
    border-radius: 14px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.post-card:hover {
    transform: translateY(-3px);
    border-color: #d9ecff;
    box-shadow: 0 12px 28px rgba(31, 45, 61, 0.08);
}

.post-card.kind-note {
    
}

.post-cover {
    height: 190px;
    overflow: hidden;
    background: #f5f7fa;
}

.post-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.35s ease;
}

.post-card:hover .post-cover img {
    transform: scale(1.03);
}

.post-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 16px 18px 18px;
    min-height: 170px;
}

.post-topline {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #909399;
    font-size: 12px;
}

.kind-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 8px;
    border-radius: 999px;
    background: #f4f8ff;
    color: #409eff;
}

.kind-note .kind-badge {
    background: #fff8ec;
    color: #b88230;
}

.post-date {
    color: #a8abb2;
}

.draft-badge {
    padding: 2px 7px;
    border-radius: 999px;
    background: #fef0f0;
    color: #f56c6c;
}

.post-title {
    margin: 0;
    color: #1f2d3d;
    font-size: 19px;
    line-height: 1.4;
}

.note-title {
    font-size: 16px;
    color: #5c4b2e;
    font-weight: 600;
}

.post-preview {
    margin: 0;
    color: #606266;
    line-height: 1.7;
    font-size: 14px;
    display: -webkit-box;
    -webkit-line-clamp: 4;
    line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
    white-space: pre-wrap;
    word-break: break-word;
}

.post-preview mark {
    background: #fff3c4;
    color: inherit;
    padding: 0 2px;
    border-radius: 3px;
}

.post-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: auto;
    padding-top: 8px;
}

.post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    min-width: 0;
}

.post-length {
    color: #c0c4cc;
    font-size: 12px;
    white-space: nowrap;
}

@media (max-width: 600px) {
    .post-cover {
        height: 160px;
    }

    .post-body {
        padding: 14px;
    }
}
</style>
