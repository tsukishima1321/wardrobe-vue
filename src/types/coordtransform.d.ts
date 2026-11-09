declare module 'coordtransform' {
    const coordtransform: {
        wgs84togcj02(longitude: number, latitude: number): [number, number];
        gcj02towgs84(longitude: number, latitude: number): [number, number];
    };
    export default coordtransform;
}
