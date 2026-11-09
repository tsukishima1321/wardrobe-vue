import L from 'leaflet';
import { toAmapCoordinates, fromAmapCoordinates } from './coordinates';
import type { MapProvider } from './providers';

const mercator = L.Projection.SphericalMercator;
const amapCrs: L.CRS = Object.assign(Object.create(L.CRS.EPSG3857), {
    code: 'EPSG:3857-GCJ02',
    projection: {
        ...mercator,
        project(point: L.LatLng) {
            const [lng, lat] = toAmapCoordinates(point.lng, point.lat);
            return mercator.project(L.latLng(lat, lng));
        },
        unproject(point: L.Point) {
            const projected = mercator.unproject(point);
            const [lng, lat] = fromAmapCoordinates(projected.lng, projected.lat);
            return L.latLng(lat, lng);
        },
    },
});

// Keep Leaflet's public coordinates in WGS84: markers, bounds, click/drag
// events and persisted photo locations all use the same coordinate system.
export const getMapCrs = (provider: MapProvider): L.CRS => provider === 'amap' ? amapCrs : L.CRS.EPSG3857;
