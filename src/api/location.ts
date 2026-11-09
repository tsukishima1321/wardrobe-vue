import { fetchDataAutoRetry } from './token';

export interface PhotoLocation {
    latitude: number;
    longitude: number;
    name: string;
    source: 'exif' | 'manual';
}

export interface LocatedImage {
    src: string;
    detailSrc: string;
    title: string;
    date: string | null;
    location: PhotoLocation;
    isCollection: boolean;
}

export const locationLabel = (value: PhotoLocation) =>
    value.name || `${value.latitude.toFixed(5)}, ${value.longitude.toFixed(5)}`;

export const previewLocation = async (image: File): Promise<PhotoLocation | null> => {
    const form = new FormData();
    form.append('image', image);
    const response = await fetchDataAutoRetry('/api/image/location/preview/', form, 'POST', false) as { location: PhotoLocation | null };
    return response.location;
};

export const getLocatedImages = () => fetchDataAutoRetry('/api/image/locations/', {}, 'GET') as Promise<{ images: LocatedImage[] }>;
