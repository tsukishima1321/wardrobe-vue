import coordtransform from 'coordtransform';

const { wgs84togcj02, gcj02towgs84 } = coordtransform;

export const toAmapCoordinates = (longitude: number, latitude: number): [number, number] =>
    wgs84togcj02(longitude, latitude);

export const fromAmapCoordinates = (longitude: number, latitude: number): [number, number] => {
    let [lng, lat] = gcj02towgs84(longitude, latitude);
    // Refine the library's approximate inverse so repeated map switches and
    // selecting an existing point do not accumulate coordinate drift.
    for (let step = 0; step < 8; step++) {
        const [projectedLng, projectedLat] = wgs84togcj02(lng, lat);
        const deltaLng = projectedLng - longitude, deltaLat = projectedLat - latitude;
        lng -= deltaLng;
        lat -= deltaLat;
        if (Math.max(Math.abs(deltaLng), Math.abs(deltaLat)) < 1e-9) break;
    }
    return [lng, lat];
};
