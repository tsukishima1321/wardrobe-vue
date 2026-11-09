<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import MapCanvas from '@/components/location/MapCanvas.vue';
import { getLocatedImages, locationLabel, type LocatedImage } from '@/api/location';
import { GetImageSrc } from '@/api/token';
import { Search, Location, Refresh } from '@element-plus/icons-vue';

const route = useRoute();
const images = ref<LocatedImage[]>([]);
const loading = ref(true);
const error = ref('');
const search = ref('');
const inView = ref(true);
const visibleIds = ref(new Set<string>());
const selected = ref<LocatedImage | null>(null);
const limit = ref(60);
const dateRange = ref<[string, string] | null>(null);
let map: L.Map | undefined;
let clusters: L.MarkerClusterGroup;
const markers = new Map<string, L.Marker>();
const thumbnail = (src: string) => GetImageSrc(`/imagebed/thumbnails/small/${src}`);
const filtered = computed(() => images.value.filter((image) => {
    const text = `${image.title} ${image.location.name} ${image.date || ''}`.toLocaleLowerCase();
    const matchesDate = !dateRange.value || (image.date && image.date >= dateRange.value[0] && image.date <= dateRange.value[1]);
    return text.includes(search.value.toLocaleLowerCase().trim()) && matchesDate;
}));
const visibleImages = computed(() => filtered.value.filter((image) => !inView.value || visibleIds.value.has(image.src)));
const cards = computed(() => visibleImages.value.slice(0, limit.value));
const updateViewport = () => {
    if (!map) return;
    const bounds = map.getBounds();
    visibleIds.value = new Set(filtered.value.filter((image) => bounds.contains([image.location.latitude, image.location.longitude])).map((image) => image.src));
};
const fitAll = () => {
    if (!map || !filtered.value.length) return;
    map.fitBounds(L.latLngBounds(filtered.value.map((image) => [image.location.latitude, image.location.longitude])), { padding: [50, 50], maxZoom: 14 });
};
const focus = (image: LocatedImage) => {
    selected.value = image;
    const marker = markers.get(image.src);
    if (marker && map) {
        // Keep selection synchronous so filtering cannot leave plugin callbacks
        // attached to a marker that has already been removed.
        marker.setZIndexOffset(1000);
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 16), { animate: false });
    }
};
const renderMarkers = () => {
    if (!map) return;
    clusters.clearLayers();
    markers.clear();
    const layers: L.Marker[] = [];
    for (const image of filtered.value) {
        const element = document.createElement('div');
        element.className = 'photo-marker-content';
        const img = document.createElement('img');
        img.src = thumbnail(image.src);
        img.alt = '';
        img.loading = 'lazy';
        element.append(img);
        const marker = L.marker([image.location.latitude, image.location.longitude], {
            icon: L.divIcon({ className: 'photo-marker', html: element, iconSize: [48, 48], iconAnchor: [24, 24] }),
            title: image.title || '未命名照片',
        });
        marker.on('click', () => { selected.value = image; });
        markers.set(image.src, marker);
        layers.push(marker);
    }
    clusters.addLayers(layers);
    if (selected.value && !markers.has(selected.value.src)) selected.value = null;
    updateViewport();
};
const restoreView = () => {
    if (!map) return;
    const lat = Number(route.query.lat), lng = Number(route.query.lng);
    if (route.query.lat != null && route.query.lng != null && Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
        map.setView([lat, lng], 15);
    } else {
        try {
            const saved = JSON.parse(sessionStorage.getItem('wardrobe-photo-map-view') || 'null');
            if (saved && Array.isArray(saved.center) && Number.isFinite(saved.zoom)) {
                map.setView(saved.center, saved.zoom);
                return;
            }
        } catch { /* Fall back to all photos. */ }
        fitAll();
    }
};
const ready = (instance: L.Map) => {
    map = instance;
    clusters = L.markerClusterGroup({
        maxClusterRadius: 60, chunkedLoading: true, spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: (cluster) => L.divIcon({
            html: `<span>${cluster.getChildCount()}</span>`, className: 'photo-cluster', iconSize: [48, 48],
        }),
    }).addTo(map);
    map.on('moveend', () => {
        updateViewport();
        const center = map!.getCenter();
        try { sessionStorage.setItem('wardrobe-photo-map-view', JSON.stringify({ center: [center.lat, center.lng], zoom: map!.getZoom() })); } catch { /* Storage may be unavailable. */ }
    });
    renderMarkers();
    if (!loading.value) restoreView();
};
const load = async () => {
    loading.value = true;
    error.value = '';
    try {
        const response = await getLocatedImages();
        images.value = response.images;
        await nextTick();
        renderMarkers();
        restoreView();
    } catch {
        error.value = '照片位置加载失败，请重试';
    } finally { loading.value = false; }
};
watch(filtered, () => { limit.value = 60; renderMarkers(); });
watch(inView, () => { limit.value = 60; });
onMounted(load);
</script>

<template>
    <main class="photo-map-page">
        <header class="page-toolbar">
            <div class="page-heading"><el-icon><Location /></el-icon><h1>照片地图</h1><span>{{ images.length }} 张照片</span></div>
            <div class="filters">
                <el-input v-model="search" :prefix-icon="Search" placeholder="搜索照片或地点" clearable aria-label="搜索照片或地点" />
                <el-date-picker v-model="dateRange" type="daterange" value-format="YYYY-MM-DD" start-placeholder="开始日期" end-placeholder="结束日期" />
                <el-button :icon="Refresh" :loading="loading" @click="load" aria-label="刷新照片" />
            </div>
        </header>
        <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon><el-button link @click="load">重试</el-button></el-alert>
        <div class="map-layout" v-loading="loading">
            <section class="map-region">
                <MapCanvas @ready="ready" />
                <el-button class="fit-button" @click="fitAll" :disabled="!filtered.length">显示全部地点</el-button>
            </section>
            <aside class="photo-panel">
                <div class="panel-toolbar"><span>{{ visibleImages.length }} 张照片</span><el-checkbox v-model="inView">仅看地图范围</el-checkbox></div>
                <div v-if="selected" class="selected-photo">
                    <button class="close-selection" aria-label="关闭照片预览" @click="selected = null">×</button>
                    <el-image :src="GetImageSrc(`/imagebed/thumbnails/${selected.src}`)" fit="contain" :preview-src-list="[GetImageSrc(`/imagebed/${selected.src}`)]" preview-teleported />
                    <div class="selected-info">
                        <h2>{{ selected.title || '未命名照片' }}</h2>
                        <p>{{ selected.date || '日期未设置' }}</p>
                        <p>{{ locationLabel(selected.location) }}</p>
                        <router-link :to="{ name: 'detail', params: { src: selected.detailSrc } }">{{ selected.detailSrc !== selected.src ? '查看所属合集' : '查看照片详情' }} →</router-link>
                    </div>
                </div>
                <div v-if="!loading && !visibleImages.length" class="empty-state">
                    <el-icon :size="32"><Location /></el-icon>
                    <h2>{{ !images.length ? '把回忆放到地图上' : '这里还没有照片' }}</h2>
                    <p>{{ !images.length ? '上传带有 GPS 信息的照片，或在照片详情中添加位置。' : '移动地图，或调整搜索与日期范围。' }}</p>
                    <router-link v-if="!images.length" to="/upload">上传照片 →</router-link>
                    <el-button v-else text @click="inView = false">浏览全部搜索结果</el-button>
                </div>
                <div class="photo-list">
                    <button v-for="image in cards" :key="image.src" class="photo-card" :class="{ active: selected?.src === image.src }" @click="focus(image)">
                        <img :src="thumbnail(image.src)" :alt="image.title || '照片'" loading="lazy" />
                        <span class="card-info"><strong>{{ image.title || '未命名照片' }}</strong><span>{{ image.date || '日期未设置' }}</span><span>{{ locationLabel(image.location) }}</span></span>
                    </button>
                    <el-button v-if="visibleImages.length > cards.length" text @click="limit += 60">加载更多照片</el-button>
                </div>
            </aside>
        </div>
    </main>
</template>

<style scoped>
.photo-map-page { padding: 24px; max-width: 1800px; margin: auto; }
.page-toolbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; margin-bottom: 20px; flex-wrap: wrap; }
.page-heading { display: flex; align-items: center; gap: 10px; color: #287459; }
h1 { font-size: 23px; font-weight: 650; color: #24382f; margin: 0; }
.page-heading > span { font-size: 13px; color: #84908a; margin-left: 6px; }
.filters { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.filters > .el-input { width: 220px; }
.filters :deep(.el-date-editor) { width: 260px; }
.map-layout { display: grid; grid-template-columns: minmax(0, 1fr) 340px; height: calc(100dvh - 175px); min-height: 480px; border: 1px solid #e1e8e2; border-radius: 14px; overflow: hidden; background: white; }
.map-region { position: relative; min-width: 0; }
.fit-button { position: absolute; right: 16px; top: 16px; z-index: 1; box-shadow: 0 2px 12px #0001; }
.photo-panel { overflow: auto; border-left: 1px solid #e1e8e2; }
.panel-toolbar { position: sticky; top: 0; background: #fffffff5; z-index: 2; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eef1ee; font-size: 13px; }
.photo-list { padding: 10px; display: flex; flex-direction: column; gap: 6px; }
.photo-card { display: flex; width: 100%; padding: 8px; gap: 12px; border: 1px solid transparent; background: transparent; border-radius: 9px; cursor: pointer; text-align: left; font: inherit; color: #26372f; }
.photo-card:hover { background: #f4f7f4; }
.photo-card.active { background: #edf5ef; border-color: #91b6a0; }
.photo-card > img { height: 72px; width: 72px; flex-shrink: 0; border-radius: 6px; object-fit: cover; background: #eef1ee; }
.card-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; font-size: 12px; color: #839087; }
.card-info strong { color: #304337; font-size: 14px; font-weight: 550; }
.card-info > * { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.selected-photo { margin: 14px; border-radius: 10px; overflow: hidden; position: relative; border: 1px solid #e1e8e2; }
.selected-photo .el-image { display: block; width: 100%; height: 220px; background: #f4f6f3; }
.close-selection { position: absolute; right: 8px; top: 8px; z-index: 1; width: 28px; height: 28px; border: 0; border-radius: 50%; background: #fff; color: #37483f; font-size: 22px; cursor: pointer; box-shadow: 0 2px 8px #0002; }
.selected-info { padding: 14px; }
.selected-info h2 { font-size: 17px; margin: 0 0 8px; overflow-wrap: anywhere; }
.selected-info p { font-size: 12px; color: #738278; margin: 5px 0; overflow-wrap: anywhere; }
.selected-info a { display: inline-block; margin-top: 10px; font-size: 13px; color: #287459; }
.empty-state { padding: 70px 24px; text-align: center; color: #89968d; }
.empty-state h2 { font-size: 17px; color: #3c5143; margin: 20px 0 10px; }
.empty-state p { font-size: 13px; line-height: 1.8; }
:deep(.photo-marker) { background: transparent; border: 0; }
:deep(.photo-marker-content) { width: 48px; height: 48px; padding: 3px; background: #fff; border-radius: 9px; box-shadow: 0 2px 10px #0005; }
:deep(.photo-marker-content img) { width: 100%; height: 100%; border-radius: 6px; object-fit: cover; }
:deep(.photo-cluster) { border-radius: 50%; background: #28745925; padding: 5px; }
:deep(.photo-cluster span) { display: grid; place-items: center; width: 38px; height: 38px; background: #287459; color: white; font-weight: 650; font-size: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 2px 10px #0002; }
@media (max-width: 850px) {
    .photo-map-page { padding: 14px; }
    .map-layout { grid-template-columns: minmax(0, 1fr) 280px; }
    .filters { width: 100%; }
    .filters > .el-input { flex: 1; width: 160px; }
}
@media (max-width: 600px) {
    .map-layout { display: flex; flex-direction: column; height: auto; min-height: 0; }
    .map-region { height: 52dvh; min-height: 300px; }
    .photo-panel { border-left: 0; max-height: 60dvh; }
    .filters :deep(.el-date-editor) { width: 100%; flex-basis: 100%; order: 3; }
}
</style>
