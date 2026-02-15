import { fetchDataAutoRetry } from "@/api/token";
import type { TokenResponse } from "@/api/token";

export interface BackupRecord {
    timestamp: string;
    comment: string;
}

export interface SearchHintResponse {
    keywords: string[];
    properties: string[];
}

export interface ImgInfo {
    src: string;
    title: string;
}

export interface TypeStatistics {
    type: string;
    totalAmount: number;
    lastYearAmount: number;
    lastMonthAmount: number;
}

export interface StatResponse {
    overall: {
        totalAmount: number;
        lastYearAmount: number;
        lastMonthAmount: number;
    };
    types: Array<TypeStatistics>;
}

export interface DiaryItem {
    id: number;
    date: string;
    text: string;
}

export interface DiarySearchLatestParams {
    page: number;
    pageSize: number;
    orderBy: string;
    order: string;
}

export interface DiarySearchResponse {
    textList?: DiaryItem[];
    [key: string]: unknown;
}

export interface DiarySearchParams {
    searchKey: string;
    dateFrom: string;
    dateTo: string;
    orderBy: string;
    order: string;
    page: number;
    pageSize: number;
}

export interface DiarySearchOverviewResponse {
    totalPage: number;
    totalItems: number;
    textList: DiaryItem[];
}

export interface SavedSearchItem {
    name: string;
    id: number;
}

export interface ImageProperty {
    name: string;
    value: string;
}

export interface ImageData {
    src: string;
    title: string;
    date: string;
    text: string;
    keywords?: Array<string>;
    propertys?: Array<ImageProperty>;
}

export interface OcrMissionItem {
    src: string;
    status: string;
}

export interface MessageData {
    id?: number;
    type: string;
    text: string;
    level: string;
    timestamp: string;
    status: string;
    link?: string;
}

export interface SearchRequest {
    searchKey: string;
    page: number;
    dateFrom: string;
    dateTo: string;
    byName: boolean;
    byFullText: boolean;
    orderBy: string;
    order: string;
    pageSize: number;
    keywords: string[];
    properties: Array<{ name: string; value: string }>;
    excludedKeywords: string[];
    excludedProperties: Array<{ name: string; value: string }>;
    propertiesPrecise?: boolean;
}

export interface SavedSearchParams {
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
    propertiesPrecise?: boolean;
}

export interface SearchResponse {
    totalPage: number;
    total: number;
    hrefList: Array<{ src: string; title: string; date: string }>;
}

export interface LoginRequest {
    username: string;
    password: string;
}

export interface ImageUploadResponse {
    md5: string;
    message?: string;
}

export interface ImagePredictResponse {
    keywords: string[];
    properties: Array<{ name: string; value: string }>;
}

export const getBackupList = async (): Promise<BackupRecord[]> => {
    return fetchDataAutoRetry('/api/backup/list/', {}, 'GET') as Promise<BackupRecord[]>;
};

export const createBackup = async (comment?: string): Promise<void> => {
    await fetchDataAutoRetry('/api/backup/create/', { comment }, 'POST');
};

export const deleteBackup = async (timestamp: string): Promise<void> => {
    await fetchDataAutoRetry('/api/backup/delete/', { timestamp }, 'POST');
};

export const getBackupDownloadUrl = (timestamp: string, token: string): string => {
    return `/api/backup/download/?timestamp=${timestamp}&token=${token}`;
};

export const getSearchHints = async (): Promise<SearchHintResponse> => {
    return fetchDataAutoRetry('/api/searchhint/', {}, 'GET') as Promise<SearchHintResponse>;
};

export const generateTips = async (): Promise<unknown> => {
    return fetchDataAutoRetry('/api/generatetips/', {}, 'GET') as Promise<unknown>;
};

export const getRandomImageInfo = async (keyword?: string): Promise<ImgInfo> => {
    const url = keyword ? `/api/random/?keyword=${encodeURIComponent(keyword)}` : '/api/random/';
    return fetchDataAutoRetry(url, {}, 'GET') as Promise<ImgInfo>;
};

export const getStatistics = async (): Promise<StatResponse> => {
    return fetchDataAutoRetry('/api/statistics/', {}, 'GET') as Promise<StatResponse>;
};

export const searchDiary = async (params: DiarySearchLatestParams): Promise<DiarySearchResponse> => {
    return fetchDataAutoRetry('/api/diary/search/', params, 'POST') as Promise<DiarySearchResponse>;
};

export const searchDiaryOverview = async (params: DiarySearchParams): Promise<DiarySearchOverviewResponse> => {
    return fetchDataAutoRetry('/api/diary/search/', params, 'POST') as Promise<DiarySearchOverviewResponse>;
};

export const createDiary = async (data: { date: string; text: string }): Promise<void> => {
    await fetchDataAutoRetry('/api/diary/new/', data, 'POST');
};

export const updateDiary = async (data: { id: number; date: string; text: string }): Promise<void> => {
    await fetchDataAutoRetry('/api/diary/edit/', data, 'POST');
};

export const deleteDiaryById = async (id: number): Promise<void> => {
    await fetchDataAutoRetry('/api/diary/delete/', { id }, 'POST');
};

export const getImageDetail = async (src: string): Promise<ImageData> => {
    return fetchDataAutoRetry('/api/image/get/', { src }, 'POST') as Promise<ImageData>;
};

export const getKeywordList = async (src: string): Promise<string[]> => {
    return fetchDataAutoRetry('/api/keyword/list/', { src }, 'POST') as Promise<string[]>;
};

export const getPropertyList = async (src: string): Promise<ImageProperty[]> => {
    return fetchDataAutoRetry('/api/property/list/', { src }, 'POST') as Promise<ImageProperty[]>;
};

export const setImageInfo = async (data: { src: string; title: string; date: string }): Promise<void> => {
    await fetchDataAutoRetry('/api/image/set/', data, 'POST');
};

export const setImageText = async (data: { src: string; text: string }): Promise<void> => {
    await fetchDataAutoRetry('/api/text/set/', data, 'POST');
};

export const createOcrMission = async (src: string): Promise<void> => {
    await fetchDataAutoRetry('/api/ocrmission/new/', { src }, 'POST');
};

export const createKeyword = async (src: string, keyword: string): Promise<void> => {
    await fetchDataAutoRetry('/api/keyword/create/', { src, keyword }, 'POST');
};

export const deleteKeyword = async (src: string, keyword: string): Promise<void> => {
    await fetchDataAutoRetry('/api/keyword/delete/', { src, keyword }, 'POST');
};

export const createProperty = async (src: string, name: string, value: string): Promise<void> => {
    await fetchDataAutoRetry('/api/property/create/', { src, name, value }, 'POST');
};

export const deleteProperty = async (src: string, name: string, value: string): Promise<void> => {
    await fetchDataAutoRetry('/api/property/delete/', { src, name, value }, 'POST');
};

export const getOcrMissionList = async (): Promise<OcrMissionItem[]> => {
    return fetchDataAutoRetry('/api/ocrmission/get/', {}, 'GET') as Promise<OcrMissionItem[]>;
};

export const newOcrMission = async (src: string): Promise<void> => {
    await fetchDataAutoRetry('/api/ocrmission/new/', { src }, 'POST');
}

export const cleanOcrMissionList = async (): Promise<void> => {
    await fetchDataAutoRetry('/api/ocrmission/clean/', {}, 'POST');
};

export const resetOcrMission = async (src: string): Promise<void> => {
    await fetchDataAutoRetry('/api/ocrmission/reset/', { src }, 'POST');
};

export const executeOcrMission = async (src: string): Promise<void> => {
    await fetchDataAutoRetry('/api/ocrmission/execute/', { src }, 'POST');
};

export const executeAllOcrMissions = async (): Promise<void> => {
    await fetchDataAutoRetry('/api/ocrmission/executeall/', {}, 'POST');
};

export const markMessageRead = async (id?: number): Promise<void> => {
    await fetchDataAutoRetry('/api/message/read/', { id }, 'POST');
};

export const clearReadMessages = async (): Promise<void> => {
    await fetchDataAutoRetry('/api/message/clear_read/', {}, 'POST');
};

export const getMessageList = async (): Promise<MessageData[]> => {
    return fetchDataAutoRetry('/api/message/list/', {}, 'POST') as Promise<MessageData[]>;
};

export const createMessageStream = (token: string): EventSource => {
    return new EventSource('/api/message/stream/?token=' + token);
};

export const searchImages = async (params: SearchRequest): Promise<SearchResponse> => {
    return fetchDataAutoRetry('/api/search/', params, 'POST') as Promise<SearchResponse>;
};

export const deleteImage = async (src: string): Promise<void> => {
    await fetchDataAutoRetry('/api/image/delete/', { src }, 'POST');
};

export const uploadImage = async (formData: FormData): Promise<ImageUploadResponse> => {
    return fetchDataAutoRetry('/api/image/new/', formData, 'POST', false) as Promise<ImageUploadResponse>;
};

export const getSavedSearchList = async (): Promise<SavedSearchItem[]> => {
    return fetchDataAutoRetry('/api/savedsearch/list/', {}, 'GET') as Promise<SavedSearchItem[]>;
};

export const getSavedSearch = async (id: number): Promise<SavedSearchParams> => {
    return fetchDataAutoRetry('/api/savedsearch/get/', { id }, 'POST') as Promise<SavedSearchParams>;
};

export const createSavedSearch = async (name: string, params: SavedSearchParams): Promise<{ id: number }> => {
    return fetchDataAutoRetry('/api/savedsearch/create/', { name, searchparams: params }, 'POST') as Promise<{ id: number }>;
};

export const deleteSavedSearch = async (id: number): Promise<void> => {
    await fetchDataAutoRetry('/api/savedsearch/delete/', { id }, 'POST');
};

export const listUnprocessedImages = async (): Promise<string[]> => {
    return fetchDataAutoRetry('/api/image/listblanks/', {}, 'POST') as Promise<string[]>;
};

export const reprocessImage = async (src: string): Promise<void> => {
    await fetchDataAutoRetry('/api/image/reprocess/', { src }, 'POST');
};

export const predictImage = async (description: string): Promise<ImagePredictResponse> => {
    return fetchDataAutoRetry('/api/metadata/predict/', { description }, 'POST') as Promise<ImagePredictResponse>;
};

export const loginWithPassword = async (payload: LoginRequest): Promise<TokenResponse> => {
    const response = await fetch('/api/token/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        throw new Error('Login failed');
    }

    return response.json() as Promise<TokenResponse>;
};
