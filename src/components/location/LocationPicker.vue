<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue';
import L from 'leaflet';
import MapCanvas from './MapCanvas.vue';
import type { PhotoLocation } from '@/api/location';
import { ElMessage } from 'element-plus';

const props = defineProps<{ initial: PhotoLocation | null }>();
const emit = defineEmits<{ confirm: [value: PhotoLocation] }>();
const selected = ref<PhotoLocation | null>(props.initial ? { ...props.initial } : null);
const latitude = ref<number | undefined>(props.initial?.latitude);
const longitude = ref<number | undefined>(props.initial?.longitude);
const name = ref(props.initial?.name || '');
const locating = ref(false);
let map: L.Map;
let marker: L.Marker | undefined;
let alive = true;
const icon = L.divIcon({ className: 'location-pin', html: '<span></span>', iconSize: [24, 24], iconAnchor: [12, 12] });

const choose = (lat: number, lng: number, move = false) => {
    lng = ((lng + 180) % 360 + 360) % 360 - 180;
    selected.value = { latitude: Number(lat.toFixed(7)), longitude: Number(lng.toFixed(7)), name: name.value, source: 'manual' };
    latitude.value = selected.value.latitude;
    longitude.value = selected.value.longitude;
    if (marker) marker.setLatLng([lat, lng]);
    else {
        marker = L.marker([lat, lng], { icon, draggable: true, title: '拖动调整位置' }).addTo(map);
        marker.on('dragend', () => { const point = marker!.getLatLng(); choose(point.lat, point.lng); });
    }
    if (move) map.setView([lat, lng], 14);
};
const ready = (instance: L.Map) => {
    map = instance;
    marker = undefined;
    if (selected.value) {
        const previous = { ...selected.value };
        choose(previous.latitude, previous.longitude, true);
        selected.value = previous;
    }
    map.on('click', (event: L.LeafletMouseEvent) => choose(event.latlng.lat, event.latlng.lng));
};
const jump = () => {
    const lat = latitude.value, lng = longitude.value;
    if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
        ElMessage.warning('请输入有效的纬度（-90～90）和经度（-180～180）');
        return false;
    }
    choose(lat, lng, true);
    return true;
};
const locate = () => {
    if (!navigator.geolocation) { ElMessage.warning('当前浏览器不支持定位'); return; }
    locating.value = true;
    navigator.geolocation.getCurrentPosition((position) => {
        if (!alive) return;
        locating.value = false;
        choose(position.coords.latitude, position.coords.longitude, true);
    }, () => {
        if (!alive) return;
        locating.value = false;
        ElMessage.warning('无法获取当前位置，可直接在地图选点');
    }, { timeout: 10000 });
};
const confirm = () => {
    if (latitude.value !== selected.value?.latitude || longitude.value !== selected.value?.longitude) {
        if (!jump()) return;
    }
    if (!selected.value) return;
    emit('confirm', { ...selected.value, name: name.value.trim(), source: name.value.trim() === props.initial?.name ? selected.value.source : 'manual' });
};
onBeforeUnmount(() => { alive = false; });
</script>

<template>
    <div class="picker">
        <div class="picker-map"><MapCanvas @ready="ready" /></div>
        <div class="picker-tools">
            <span>点击地图或拖动标记选择地点</span>
            <el-button size="small" :loading="locating" @click="locate">我的位置</el-button>
        </div>
        <el-input v-model="name" placeholder="地点名称（可选）" maxlength="200" />
        <div class="coordinate-row">
            <el-input-number v-model="latitude" aria-label="纬度" placeholder="纬度" :min="-90" :max="90" :precision="7" :controls="false" />
            <el-input-number v-model="longitude" aria-label="经度" placeholder="经度" :min="-180" :max="180" :precision="7" :controls="false" />
            <el-button @click="jump">定位坐标</el-button>
        </div>
        <div class="picker-footer"><el-button type="primary" :disabled="!selected" @click="confirm">使用此位置</el-button></div>
    </div>
</template>

<style scoped>
.picker { display: flex; flex-direction: column; gap: 14px; }
.picker-map { height: min(48vh, 420px); border-radius: 10px; overflow: hidden; }
.picker-tools { display: flex; justify-content: space-between; gap: 12px; align-items: center; color: #737c78; font-size: 13px; }
.coordinate-row { display: flex; gap: 10px; }
.coordinate-row .el-input-number { width: 0; flex: 1; }
.picker-footer { display: flex; justify-content: flex-end; }
:deep(.location-pin) { background: none; border: none; }
:deep(.location-pin span) { display: block; width: 24px; height: 24px; border: 4px solid white; border-radius: 50%; background: #287459; box-shadow: 0 2px 10px #0005; }
</style>
