import type { ImageProperty } from '@/api/componentRequests';
import type { PhotoLocation } from '@/api/location';

export interface ImageMetadataValue {
    location?: PhotoLocation | null;
    title: string;
    date: string;
    keywords: string[];
    properties: ImageProperty[];
    isOCR: boolean;
}
