<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue';
import { EditorContent, useEditor, VueNodeViewRenderer } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import { Node, mergeAttributes } from '@tiptap/core';
import { ElMessageBox } from 'element-plus';
import { Link, Picture, RefreshLeft, RefreshRight } from '@element-plus/icons-vue';
import BlogImageView from './BlogImageView.vue';

type RichDoc = Record<string, unknown>;

const props = withDefaults(defineProps<{
    modelValue?: RichDoc | string | null;
    placeholder?: string;
    compact?: boolean;
    minHeight?: string;
    autofocus?: boolean;
}>(), {
    placeholder: '写点什么……',
    compact: false,
    minHeight: '260px',
    autofocus: false,
});

const emit = defineEmits<{
    (e: 'update:modelValue', value: RichDoc): void;
    (e: 'update:html', value: string): void;
    (e: 'update:text', value: string): void;
    (e: 'openImagePicker', mode: 'insert' | 'reference'): void;
}>();

const BlogImage = Image.extend({
    addAttributes() {
        return {
            ...this.parent?.(),
            href: {
                default: null,
                parseHTML: (element: HTMLElement) => element.getAttribute('data-image-href') || element.getAttribute('src'),
                renderHTML: (attributes: Record<string, unknown>) => attributes.href ? { 'data-image-href': attributes.href } : {},
            },
            caption: {
                default: '',
                parseHTML: (element: HTMLElement) => element.getAttribute('data-caption') || '',
                renderHTML: (attributes: Record<string, unknown>) => attributes.caption ? { 'data-caption': attributes.caption } : {},
            },
            width: {
                default: null,
                parseHTML: (element: HTMLElement) => {
                    const styleWidth = element.style?.width || '';
                    const percentage = styleWidth.match(/^(\d+(?:\.\d+)?)%$/);
                    if (percentage) {
                        return Math.min(100, Math.max(10, Math.round(Number(percentage[1]))));
                    }
                    const attribute = Number(element.getAttribute('width'));
                    return Number.isFinite(attribute) && attribute > 0
                        ? Math.min(100, Math.max(10, Math.round(attribute)))
                        : null;
                },
                renderHTML: (attributes: Record<string, unknown>) => {
                    const width = Number(attributes.width);
                    if (!Number.isFinite(width) || width <= 0) return {};
                    return { style: `width:${Math.min(100, Math.max(10, Math.round(width)))}%` };
                },
            },
        };
    },
    addNodeView() {
        return VueNodeViewRenderer(BlogImageView);
    },
    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
        const href = HTMLAttributes['data-image-href'] || HTMLAttributes.href;
        const caption = HTMLAttributes.caption || HTMLAttributes['data-caption'] || '';
        const rest = { ...HTMLAttributes };
        delete rest.href;
        delete rest['data-image-href'];
        delete rest.caption;
        delete rest['data-caption'];
        return ['img', mergeAttributes(rest, {
            src: href ? (href.startsWith('mock-') ? '/placeholder.png' : `/imagebed/thumbnails/large/${href}`) : '',
            'data-image-href': href || null,
            'data-caption': caption || null,
            class: 'blog-editor-image',
            loading: 'lazy',
        })];
    },
});

const ImageRef = Node.create({
    name: 'imageRef',
    group: 'inline',
    inline: true,
    atom: true,
    selectable: true,
    addAttributes() {
        return {
            href: { default: null },
            label: { default: '引用图片' },
        };
    },
    parseHTML() {
        return [{ tag: 'a[data-image-ref]' }];
    },
    renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
        const href = HTMLAttributes.href || '';
        return ['a', mergeAttributes({
            href: `#/detail/${href}`,
            'data-image-ref': href,
            class: 'blog-image-ref',
        }), HTMLAttributes.label || '引用图片'];
    },
});

const editor = useEditor({
    content: props.modelValue ?? '',
    autofocus: props.autofocus,
    extensions: [
        StarterKit.configure({
            link: {
                openOnClick: false,
                autolink: true,
                linkOnPaste: true,
            },
        }),
        BlogImage.configure({
            inline: false,
            allowBase64: false,
        }),
        ImageRef,
        Placeholder.configure({ placeholder: props.placeholder }),
        TextAlign.configure({ types: ['heading', 'paragraph'] }),
        Highlight.configure({ multicolor: false }),
    ],
    editorProps: {
        attributes: {
            class: 'blog-prosemirror',
            spellcheck: 'false',
        },
    },
    onUpdate: ({ editor: current }) => {
        emit('update:modelValue', current.getJSON() as RichDoc);
        emit('update:html', current.getHTML());
        emit('update:text', current.getText());
    },
});

watch(() => props.modelValue, (value) => {
    if (!editor.value) return;
    if (value === null || value === undefined) return;
    const current = JSON.stringify(editor.value.getJSON());
    const next = JSON.stringify(value);
    if (current !== next) {
        editor.value.commands.setContent(value, { emitUpdate: false });
    }
}, { deep: true });

onBeforeUnmount(() => {
    editor.value?.destroy();
});

const run = (command: () => void) => {
    command();
};

const isActive = (name: string, attrs?: Record<string, unknown>) => {
    return editor.value?.isActive(name, attrs) ?? false;
};

const setLink = async () => {
    if (!editor.value) return;
    const previous = editor.value.getAttributes('link').href as string | undefined;
    try {
        const result = await ElMessageBox.prompt('输入链接地址', '插入链接', {
            inputValue: previous ?? 'https://',
            inputPattern: /^(https?:\/\/|\/|#|mailto:)/,
            inputErrorMessage: '请输入 http(s)、/、# 或 mailto: 链接',
            confirmButtonText: '确定',
            cancelButtonText: '取消',
        });
        const href = result.value.trim();
        if (!href) {
            editor.value.chain().focus().extendMarkRange('link').unsetLink().run();
            return;
        }
        editor.value.chain().focus().extendMarkRange('link').setLink({ href }).run();
    } catch {
        // cancelled
    }
};

const removeLink = () => {
    editor.value?.chain().focus().extendMarkRange('link').unsetLink().run();
};

const insertImage = (href: string, alt = '', caption = '') => {
    if (!editor.value || !href) return;
    editor.value.chain().focus().insertContent({
        type: 'image',
        attrs: { href, alt, caption },
    }).run();
};

const insertImageRef = (href: string, label = '引用图片') => {
    if (!editor.value || !href) return;
    editor.value.chain().focus().insertContent({
        type: 'imageRef',
        attrs: { href, label },
    }).run();
};

const setContent = (content: RichDoc | string | null) => {
    editor.value?.commands.setContent(content ?? '', { emitUpdate: false });
};

const focus = () => editor.value?.commands.focus();

const getJSON = () => editor.value?.getJSON() as RichDoc;
const getHTML = () => editor.value?.getHTML() ?? '';
const getText = () => editor.value?.getText() ?? '';
const isEmpty = () => editor.value?.isEmpty ?? true;

defineExpose({
    insertImage,
    insertImageRef,
    setContent,
    focus,
    getJSON,
    getHTML,
    getText,
    isEmpty,
});
</script>

<template>
    <div class="rich-editor" :class="{ 'is-compact': compact }">
        <div v-if="editor" class="editor-toolbar">
            <el-button-group>
                <el-button size="small" text :type="isActive('bold') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleBold().run())">
                    <strong>B</strong>
                </el-button>
                <el-button size="small" text :type="isActive('italic') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleItalic().run())">
                    <em>I</em>
                </el-button>
                <el-button size="small" text :type="isActive('strike') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleStrike().run())">
                    <s>S</s>
                </el-button>
                <el-button size="small" text :type="isActive('underline') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleUnderline().run())">
                    <u>U</u>
                </el-button>
                <el-button size="small" text :type="isActive('code') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleCode().run())">
                    &lt;/&gt;
                </el-button>
            </el-button-group>

            <el-button-group v-if="!compact">
                <el-button size="small" text :type="isActive('heading', { level: 2 }) ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleHeading({ level: 2 }).run())">H2</el-button>
                <el-button size="small" text :type="isActive('heading', { level: 3 }) ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleHeading({ level: 3 }).run())">H3</el-button>
            </el-button-group>

            <el-button-group>
                <el-button size="small" text :type="isActive('bulletList') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleBulletList().run())">• 列表</el-button>
                <el-button size="small" text :type="isActive('orderedList') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleOrderedList().run())">1. 列表</el-button>
            </el-button-group>

            <el-button-group v-if="!compact">
                <el-button size="small" text :type="isActive('blockquote') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleBlockquote().run())">引用</el-button>
                <el-button size="small" text :type="isActive('codeBlock') ? 'primary' : 'default'"
                    @click="run(() => editor?.chain().focus().toggleCodeBlock().run())">代码块</el-button>
                <el-button size="small" text @click="run(() => editor?.chain().focus().setHorizontalRule().run())">
                    分割线
                </el-button>
            </el-button-group>

            <el-button-group>
                <el-button size="small" text :type="isActive('link') ? 'primary' : 'default'" :icon="Link"
                    @click="setLink">链接</el-button>
                <el-button v-if="isActive('link')" size="small" text @click="removeLink">取消链接</el-button>
                <el-button size="small" text :icon="Picture" @click="$emit('openImagePicker', 'insert')">
                    插入图片
                </el-button>
                <el-button v-if="!compact" size="small" text @click="$emit('openImagePicker', 'reference')">
                    引用图片
                </el-button>
            </el-button-group>

            <el-button-group>
                <el-button size="small" text :icon="RefreshLeft" :disabled="!editor?.can().undo()"
                    @click="run(() => editor?.chain().focus().undo().run())" />
                <el-button size="small" text :icon="RefreshRight" :disabled="!editor?.can().redo()"
                    @click="run(() => editor?.chain().focus().redo().run())" />
            </el-button-group>
        </div>

        <EditorContent :editor="editor" class="editor-content" :style="{ minHeight }" />
    </div>
</template>

<style scoped>
.rich-editor {
    border: 1px solid #dcdfe6;
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
}

.rich-editor:focus-within {
    border-color: #409eff;
    box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.12);
}

.editor-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 8px 10px;
    border-bottom: 1px solid #ebeef5;
    background: #fafcff;
}

.editor-toolbar :deep(.el-button) {
    margin-left: 0;
}

.editor-content {
    padding: 18px 20px;
    overflow-y: auto;
}

.rich-editor.is-compact .editor-content {
    padding: 14px 16px;
}

.editor-content :deep(.blog-prosemirror) {
    outline: none;
    min-height: inherit;
    line-height: 1.8;
    color: #303133;
    font-size: 15px;
}

.editor-content :deep(.blog-prosemirror p) {
    margin: 0 0 0.9em;
}

.editor-content :deep(.blog-prosemirror h1),
.editor-content :deep(.blog-prosemirror h2),
.editor-content :deep(.blog-prosemirror h3) {
    margin: 1.2em 0 0.6em;
    color: #1f2d3d;
}

.editor-content :deep(.blog-prosemirror img) {
    max-width: 100%;
    height: auto;
    border-radius: 8px;
    display: block;
    margin: 12px auto;
}

.editor-content :deep(.blog-prosemirror blockquote) {
    margin: 1em 0;
    padding: 8px 16px;
    border-left: 3px solid #c6e2ff;
    background: #f6faff;
    color: #5c6b7a;
}

.editor-content :deep(.blog-prosemirror pre) {
    background: #f5f7fa;
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
}

.editor-content :deep(.blog-prosemirror code) {
    background: #f5f7fa;
    padding: 2px 5px;
    border-radius: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.9em;
}

.editor-content :deep(.blog-prosemirror pre code) {
    background: transparent;
    padding: 0;
}

.editor-content :deep(.blog-prosemirror a) {
    color: #409eff;
    text-decoration: underline;
    text-underline-offset: 2px;
}

.editor-content :deep(.blog-image-ref) {
    display: inline-flex;
    align-items: center;
    padding: 2px 8px;
    border-radius: 999px;
    background: #ecf5ff;
    color: #409eff;
    text-decoration: none;
    font-size: 0.92em;
}

.editor-content :deep(.is-editor-empty:first-child::before) {
    content: attr(data-placeholder);
    float: left;
    color: #a8abb2;
    pointer-events: none;
    height: 0;
}

.editor-content :deep(.ProseMirror-selectednode) {
    outline: 2px solid #409eff;
    outline-offset: 2px;
}
</style>
