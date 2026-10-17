import type { BlogArchiveItem, BlogPostDetail, BlogPostSummary, BlogSearchResponse, BlogTag } from '@/api/blog';

export const mockTags: BlogTag[] = [
    { id: 1, name: '日常', count: 12 },
    { id: 2, name: '旅行', count: 7 },
    { id: 3, name: '技术', count: 5 },
    { id: 4, name: '照片', count: 4 },
];

export const mockArchive: BlogArchiveItem[] = [
    { year: 2026, month: 10, count: 5, label: '2026-10' },
    { year: 2026, month: 9, count: 8, label: '2026-09' },
    { year: 2025, month: 12, count: 3, label: '2025-12' },
];

const mockPosts: BlogPostDetail[] = [
    {
        id: 101,
        title: '十月的风',
        kind: 'article',
        status: 'published',
        date: '2026-10-17',
        excerpt: '傍晚沿着河边走了一圈，风把树叶吹得沙沙响。',
        coverImageHref: null,
        wordCount: 128,
        isPinned: true,
        tags: ['日常', '照片'],
        createdAt: '2026-10-17T18:20:00',
        updatedAt: '2026-10-17T18:20:00',
        publishedAt: '2026-10-17T18:20:00',
        contentJson: { type: 'doc', content: [] },
        contentText: '傍晚沿着河边走了一圈，风把树叶吹得沙沙响。',
        contentHtml: '<p>傍晚沿着河边走了一圈，风把树叶吹得沙沙响。</p><p>这是用于本地预览的模拟文章，不会读取实际数据库。</p>',
        images: [],
    },
    {
        id: 102,
        title: '关于最近的一些碎片',
        kind: 'note',
        status: 'published',
        date: '2026-10-15',
        excerpt: '把桌面整理了一遍，翻出几张很久以前的照片。',
        coverImageHref: null,
        wordCount: 64,
        isPinned: false,
        tags: ['日常'],
        createdAt: '2026-10-15T09:10:00',
        updatedAt: '2026-10-15T09:10:00',
        publishedAt: '2026-10-15T09:10:00',
        contentJson: { type: 'doc', content: [] },
        contentText: '把桌面整理了一遍，翻出几张很久以前的照片。',
        contentHtml: '<p>把桌面整理了一遍，翻出几张很久以前的照片。</p>',
        images: [],
    },
    {
        id: 103,
        title: '富文本编辑器接入笔记',
        kind: 'article',
        status: 'published',
        date: '2026-10-12',
        excerpt: '记录一下 TipTap 的 JSON 存储、图片节点和搜索方案。',
        coverImageHref: null,
        wordCount: 210,
        isPinned: false,
        tags: ['技术'],
        createdAt: '2026-10-12T21:00:00',
        updatedAt: '2026-10-12T21:00:00',
        publishedAt: '2026-10-12T21:00:00',
        contentJson: { type: 'doc', content: [] },
        contentText: '记录一下 TipTap 的 JSON 存储、图片节点和搜索方案。',
        contentHtml: '<h2>TipTap</h2><p>JSON 作为内容真源，HTML 作为清洗后的渲染缓存。</p><blockquote><p>文章中的图片仍然来自图片系统。</p></blockquote>',
        images: [],
    },
];

const toSummary = (post: BlogPostDetail): BlogPostSummary => {
    const { contentJson: _contentJson, contentHtml: _contentHtml, contentText: _contentText, images: _images, ...summary } = post;
    return summary;
};

export const mockPostSummaries = mockPosts.map(toSummary);

export const getMockPost = (id: number): BlogPostDetail | null => {
    return mockPosts.find((post) => post.id === id) ?? null;
};

export const mockSearchResponse = (query: string): BlogSearchResponse => {
    const keyword = query.trim();
    const items = mockPostSummaries
        .filter((post) => !keyword || `${post.title} ${post.excerpt} ${post.tags.join(' ')}`.includes(keyword))
        .map((post) => ({
            ...post,
            snippet: {
                text: post.excerpt,
                highlights: keyword
                    ? [[Math.max(0, post.excerpt.indexOf(keyword)), Math.max(0, post.excerpt.indexOf(keyword)) + keyword.length] as [number, number]]
                    : [],
            },
        }));
    return {
        items,
        totalItems: items.length,
        totalPage: items.length ? 1 : 0,
        page: 1,
        pageSize: 20,
        query: keyword,
    };
};

export interface MockImageResult {
    src: string;
    title: string;
    date: string;
    isCollection: boolean;
    itemCount?: number;
    collectionHref?: string;
    collectionTitle?: string;
}

export const mockImages: MockImageResult[] = [
    { src: 'mock-october-wind.jpg', title: '十月的风', date: '2026-10-17', isCollection: false },
    { src: 'mock-river.jpg', title: '河边', date: '2026-10-15', isCollection: false },
    { src: 'mock-desk.jpg', title: '整理桌面', date: '2026-10-12', isCollection: false },
    { src: 'mock-collection.jpg', title: '夏日合集', date: '2026-08-01', isCollection: true, itemCount: 4 },
];

export const mockCollections: MockImageResult[] = [
    { src: 'mock-collection.jpg', title: '夏日合集', date: '2026-08-01', isCollection: true, itemCount: 4 },
    { src: 'mock-collection-cafe.jpg', title: '咖啡馆的下午', date: '2026-06-18', isCollection: true, itemCount: 3 },
];

export const mockCollectionItems: Record<string, MockImageResult[]> = {
    'mock-collection.jpg': [
        { src: 'mock-summer-1.jpg', title: '夏日合集 · 海边', date: '2026-08-01', isCollection: false, collectionHref: 'mock-collection.jpg', collectionTitle: '夏日合集' },
        { src: 'mock-summer-2.jpg', title: '夏日合集 · 树影', date: '2026-08-01', isCollection: false, collectionHref: 'mock-collection.jpg', collectionTitle: '夏日合集' },
        { src: 'mock-summer-3.jpg', title: '夏日合集 · 傍晚', date: '2026-08-01', isCollection: false, collectionHref: 'mock-collection.jpg', collectionTitle: '夏日合集' },
        { src: 'mock-summer-4.jpg', title: '夏日合集 · 街道', date: '2026-08-01', isCollection: false, collectionHref: 'mock-collection.jpg', collectionTitle: '夏日合集' },
    ],
    'mock-collection-cafe.jpg': [
        { src: 'mock-cafe-1.jpg', title: '咖啡馆的下午 · 窗边', date: '2026-06-18', isCollection: false, collectionHref: 'mock-collection-cafe.jpg', collectionTitle: '咖啡馆的下午' },
        { src: 'mock-cafe-2.jpg', title: '咖啡馆的下午 · 咖啡', date: '2026-06-18', isCollection: false, collectionHref: 'mock-collection-cafe.jpg', collectionTitle: '咖啡馆的下午' },
        { src: 'mock-cafe-3.jpg', title: '咖啡馆的下午 · 书页', date: '2026-06-18', isCollection: false, collectionHref: 'mock-collection-cafe.jpg', collectionTitle: '咖啡馆的下午' },
    ],
};
