import type { TileLayerOptions } from 'leaflet';

export type MapProvider = 'osm' | 'amap' | 'tianditu';
export interface MapSettings {
    provider: MapProvider;
    tiandituToken: string;
}

export const MAP_SETTINGS_KEY = 'wardrobe-map-settings';
export const mapProviders = [
    { value: 'osm', label: 'OSM' },
    { value: 'amap', label: '高德' },
    { value: 'tianditu', label: '天地图' },
] as const;

export const parseMapSettings = (raw: string | null): MapSettings => {
    try {
        const value = JSON.parse(raw || 'null');
        return {
            provider: mapProviders.some(item => item.value === value?.provider) ? value.provider : 'osm',
            tiandituToken: typeof value?.tiandituToken === 'string' ? value.tiandituToken.trim() : '',
        };
    } catch {
        return { provider: 'osm', tiandituToken: '' };
    }
};

export interface MapTileLayer {
    url: string;
    options: TileLayerOptions;
}

export const getMapTileLayers = (settings: MapSettings): MapTileLayer[] => {
    if (settings.provider === 'amap') {
        return [{
            url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
            options: { subdomains: '1234', minZoom: 1, maxZoom: 18, attribution: '&copy; <a href="https://www.amap.com/">高德地图</a>' },
        }];
    }
    if (settings.provider === 'tianditu') {
        if (!settings.tiandituToken.trim()) return [];
        const token = encodeURIComponent(settings.tiandituToken.trim());
        return ['vec', 'cva'].map(layer => ({
            url: `https://t{s}.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer}&STYLE=default&TILEMATRIXSET=w&FORMAT=tiles&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&tk=${token}`,
            options: { subdomains: '01234567', minZoom: 1, maxZoom: 18, attribution: layer === 'vec' ? '&copy; <a href="https://www.tianditu.gov.cn/">天地图</a>' : undefined },
        }));
    }
    return [{
        url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' },
    }];
};
