import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMapSettings, getMapTileLayers } from '../src/maps/providers.ts';
import { toAmapCoordinates, fromAmapCoordinates } from '../src/maps/coordinates.ts';

test('missing, corrupt or unsupported saved providers fall back to OSM', () => {
    for (const raw of [null, 'broken', 'null', '[]', '{"provider":"other"}', '{"provider":42}']) {
        assert.deepEqual(parseMapSettings(raw), { provider: 'osm', tiandituToken: '' });
    }
    assert.deepEqual(parseMapSettings('{"provider":"tianditu","tiandituToken":" key "}'), {
        provider: 'tianditu', tiandituToken: 'key',
    });
    assert.equal(parseMapSettings('{"provider":"tianditu","tiandituToken":42}').tiandituToken, '');
});

test('OSM and Amap use separate HTTPS services without a token', () => {
    const osm = getMapTileLayers({ provider: 'osm', tiandituToken: 'unused' });
    const amap = getMapTileLayers({ provider: 'amap', tiandituToken: 'unused' });
    assert.equal(osm.length, 1);
    assert.match(osm[0].url, /^https:\/\/tile\.openstreetmap\.org\//);
    assert.match(amap[0].url, /^https:\/\/webrd0\{s\}\.is\.autonavi\.com\//);
    assert.ok(!amap[0].url.includes('unused'));
});

test('Tianditu requires a token and loads vector tiles plus Chinese labels', () => {
    assert.deepEqual(getMapTileLayers({ provider: 'tianditu', tiandituToken: ' ' }), []);
    const token = 'key&other={x}';
    const layers = getMapTileLayers({ provider: 'tianditu', tiandituToken: token });
    assert.equal(layers.length, 2);
    assert.match(layers[0].url, /\/vec_w\/wmts\?/);
    assert.match(layers[1].url, /\/cva_w\/wmts\?/);
    for (const layer of layers) {
        assert.ok(layer.url.endsWith(`tk=${encodeURIComponent(token)}`));
        assert.match(layer.url, /TILEMATRIXSET=w/);
        assert.equal(layer.options.maxZoom, 18);
    }
});

test('WGS84 converts to the published Beijing GCJ-02 reference point', () => {
    const [lng, lat] = toAmapCoordinates(116.404, 39.915);
    assert.ok(Math.abs(lng - 116.41024449916938) < 1e-9);
    assert.ok(Math.abs(lat - 39.91640428150164) < 1e-9);
});

test('map coordinates round-trip without drift, including overseas and zero coordinates', () => {
    for (const point of [[121.5, 31.2083333], [116.404, 39.915], [114.0579, 22.5431],
                         [104.0665, 30.5723], [-0.1276, 51.5072], [-74, 40.71], [0, 0]]) {
        const converted = toAmapCoordinates(...point);
        const restored = fromAmapCoordinates(...converted);
        assert.ok(Math.abs(restored[0] - point[0]) < 1e-7, `longitude ${point}`);
        assert.ok(Math.abs(restored[1] - point[1]) < 1e-7, `latitude ${point}`);
    }
    assert.deepEqual(toAmapCoordinates(-74, 40.71), [-74, 40.71]);
});
