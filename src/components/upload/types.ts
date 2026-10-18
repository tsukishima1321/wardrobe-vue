import type { ImageProperty } from '@/api/componentRequests';

export interface ImageMetadataValue {
    title: string;
    date: string;
    keywords: string[];
    properties: ImageProperty[];
    isOCR: boolean;
}
