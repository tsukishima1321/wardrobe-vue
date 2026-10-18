import { fetchDataAutoRetry, GetImageSrc } from '@/api/token';

export type BlogKind = 'note' | 'article';
export type BlogStatus = 'draft' | 'published';

export interface BlogTag {
    id: number;
    name: string;
    count?: number;
}

export interface BlogSnippet {
    text: string;
    highlights: Array<[number, number]>;
}

export interface BlogPostSummary {
    id: number;
    title: string;
    kind: BlogKind;
    status: BlogStatus;
    date: string;
    excerpt: string;
    coverImageHref: string | null;
    wordCount: number;
    isPinned: boolean;
    tags: string[];
    createdAt: string | null;
    updatedAt: string | null;
    publishedAt: string | null;
    snippet?: BlogSnippet;
}

export interface BlogImageLink {
    href: string;
    collectionHref: string | null;
    role: string;
    origin: string;
    sortOrder: number;
}

export interface BlogPostDetail extends BlogPostSummary {
    contentJson: Record<string, unknown>;
    contentHtml: string;
    contentText: string;
    images: BlogImageLink[];
}

export interface BlogListResponse {
    items: BlogPostSummary[];
    totalItems: number;
    totalPage: number;
    page: number;
    pageSize: number;
}

export interface BlogSearchResponse extends BlogListResponse {
    query: string;
}

export interface BlogArchiveItem {
    year: number;
    month: number;
    count: number;
    label: string;
}

export interface BlogPostPayload {
    title?: string;
    kind?: BlogKind;
    status?: BlogStatus;
    date?: string;
    contentJson?: Record<string, unknown>;
    contentHtml?: string;
    contentText?: string;
    excerpt?: string;
    coverImageHref?: string | null;
    isPinned?: boolean;
    tags?: string[];
}

export interface BlogListParams {
    page?: number;
    pageSize?: number;
    q?: string;
    tag?: string;
    kind?: BlogKind | '';
    status?: BlogStatus | 'all' | '';
    dateFrom?: string;
    dateTo?: string;
    orderBy?: string;
    order?: 'asc' | 'desc';
}

export interface BlogSearchParams {
    q?: string;
    page?: number;
    pageSize?: number;
    tags?: string[];
    kind?: BlogKind | '';
    status?: BlogStatus | 'all' | '';
    dateFrom?: string;
    dateTo?: string;
}

interface BlogPostEnvelope {
    post: BlogPostDetail;
    warnings?: string[];
}

export interface BlogImageResult {
    src: string;
    title: string;
    date: string;
    isCollection: boolean;
    itemCount?: number;
    collectionHref?: string;
    collectionTitle?: string;
}

const buildQuery = (params: Record<string, string | number | undefined | null>): string => {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });
    const query = search.toString();
    return query ? `?${query}` : '';
};

export const listBlogPosts = async (params: BlogListParams = {}): Promise<BlogListResponse> => {
    return fetchDataAutoRetry(
        `/api/blog/posts/${buildQuery({
            page: params.page,
            pageSize: params.pageSize,
            q: params.q,
            tag: params.tag,
            kind: params.kind,
            status: params.status,
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            orderBy: params.orderBy,
            order: params.order,
        })}`,
        {},
        'GET',
    ) as Promise<BlogListResponse>;
};

export const getBlogPost = async (id: number): Promise<BlogPostDetail> => {
    const response = await fetchDataAutoRetry(`/api/blog/posts/${id}/`, {}, 'GET') as BlogPostEnvelope;
    return response.post;
};

export const createBlogPost = async (payload: BlogPostPayload): Promise<BlogPostEnvelope> => {
    return fetchDataAutoRetry('/api/blog/posts/', payload, 'POST') as Promise<BlogPostEnvelope>;
};

export const updateBlogPost = async (id: number, payload: BlogPostPayload): Promise<BlogPostEnvelope> => {
    return fetchDataAutoRetry(`/api/blog/posts/${id}/`, payload, 'PATCH') as Promise<BlogPostEnvelope>;
};

export const deleteBlogPost = async (id: number): Promise<void> => {
    await fetchDataAutoRetry(`/api/blog/posts/${id}/`, {}, 'DELETE');
};

export const publishBlogPost = async (id: number): Promise<BlogPostEnvelope> => {
    return fetchDataAutoRetry(`/api/blog/posts/${id}/publish/`, {}, 'POST') as Promise<BlogPostEnvelope>;
};

export const unpublishBlogPost = async (id: number): Promise<BlogPostEnvelope> => {
    return fetchDataAutoRetry(`/api/blog/posts/${id}/unpublish/`, {}, 'POST') as Promise<BlogPostEnvelope>;
};

export const autosaveBlogPost = async (id: number, payload: BlogPostPayload): Promise<BlogPostEnvelope> => {
    return fetchDataAutoRetry(`/api/blog/posts/${id}/autosave/`, payload, 'PATCH') as Promise<BlogPostEnvelope>;
};

export const searchBlogPosts = async (params: BlogSearchParams): Promise<BlogSearchResponse> => {
    return fetchDataAutoRetry('/api/blog/search/', params, 'POST') as Promise<BlogSearchResponse>;
};

export const getBlogTags = async (): Promise<BlogTag[]> => {
    const response = await fetchDataAutoRetry('/api/blog/tags/', {}, 'GET') as { items?: BlogTag[] };
    return response.items ?? [];
};

export const getBlogArchive = async (): Promise<BlogArchiveItem[]> => {
    const response = await fetchDataAutoRetry('/api/blog/archive/', {}, 'GET') as { items?: BlogArchiveItem[] };
    return response.items ?? [];
};

export const syncBlogPostImages = async (id: number): Promise<{ warnings?: string[] }> => {
    return fetchDataAutoRetry(`/api/blog/posts/${id}/images/sync/`, {}, 'POST') as Promise<{ warnings?: string[] }>;
};

export const blogImageUrl = (href: string, size: 'large' | 'thumb' | 'small' = 'large'): string => {
    if (!href) return '';
    if (size === 'large') {
        return GetImageSrc(`/imagebed/thumbnails/large/${href}`);
    }
    if (size === 'small') {
        return GetImageSrc(`/imagebed/thumbnails/small/${href}`);
    }
    return GetImageSrc(`/imagebed/thumbnails/${href}`);
};

export const blogOriginalImageUrl = (href: string): string => {
    return href ? GetImageSrc(`/imagebed/${href}`) : '';
};


export const localDateString = (value: Date = new Date()): string => {
    const offset = value.getTimezoneOffset();
    return new Date(value.getTime() - offset * 60 * 1000).toISOString().slice(0, 10);
};
