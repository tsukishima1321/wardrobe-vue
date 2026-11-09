<script setup lang="ts">
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useMapSettings } from '@/composables/useMapSettings';
import { getMapTileLayers } from '@/maps/providers';
import { getMapCrs } from '@/maps/crs';

const emit = defineEmits<{ ready: [map: L.Map] }>();
const host = ref<HTMLDivElement>();
const tileError = ref(false);
const settings = useMapSettings();
const missingToken = computed(() => settings.value.provider === 'tianditu' && !settings.value.tiandituToken);
const errorMessage = computed(() => settings.value.provider === 'tianditu'
    ? '天地图加载失败，请检查 Token、服务权限或网络。'
    : '地图底图加载失败，请检查网络。');
let map: L.Map | undefined;
let observer: ResizeObserver | undefined;
let tiles: L.TileLayer[] = [];

const createMap = () => {
    if (!host.value) return;
    const center = map?.getCenter() || L.latLng(31, 105);
    const zoom = map?.getZoom() ?? 4;
    for (const tile of tiles) tile.off();
    map?.remove();
    tileError.value = false;
    const definitions = getMapTileLayers(settings.value);
    const maxZoom = definitions[0]?.options.maxZoom ?? 18;
    const minZoom = definitions[0]?.options.minZoom ?? 0;
    map = L.map(host.value, { worldCopyJump: true, crs: getMapCrs(settings.value.provider), minZoom, maxZoom })
        .setView(center, Math.max(minZoom, Math.min(zoom, maxZoom)));
    tiles = definitions.map((definition) => {
        const osm = settings.value.provider === 'osm';
        const tile = L.tileLayer(osm ? import.meta.env.VITE_MAP_TILE_URL || definition.url : definition.url, {
            ...definition.options,
            attribution: osm ? import.meta.env.VITE_MAP_ATTRIBUTION || definition.options.attribution : definition.options.attribution,
        });
        tile.on('tileerror', () => { tileError.value = true; });
        return tile.addTo(map!);
    });
    emit('ready', map);
};

onMounted(() => {
    createMap();
    observer = new ResizeObserver(() => map?.invalidateSize());
    if (host.value) observer.observe(host.value);
});
watch(settings, createMap);

const retry = () => {
    tileError.value = false;
    for (const tile of tiles) tile.redraw();
};
onBeforeUnmount(() => {
    observer?.disconnect();
    for (const tile of tiles) tile.off();
    map?.remove();
});
</script>

<template>
    <div class="map-canvas">
        <div ref="host" class="map-host" aria-label="照片位置地图" />
        <div v-if="missingToken" class="tile-warning" role="status">请在「管理 → 配置」填写天地图 Token。</div>
        <div v-else-if="tileError" class="tile-warning" role="status">
            {{ errorMessage }}<button type="button" @click="retry">重试</button>
        </div>
        <slot />
    </div>
</template>

<style scoped>
.map-canvas { position: relative; width: 100%; height: 100%; min-height: 260px; isolation: isolate; background: #e9efeb; }
.map-host { height: 100%; width: 100%; min-height: inherit; z-index: 0; }
.tile-warning { position: absolute; left: 50%; top: 12px; transform: translateX(-50%); z-index: 2; padding: 10px 14px; border-radius: 8px; background: #fff8e6; color: #805b20; font-size: 13px; width: max-content; max-width: 85%; box-shadow: 0 2px 12px #0001; }
.tile-warning button { border: 0; background: none; color: #287459; cursor: pointer; }
</style>
