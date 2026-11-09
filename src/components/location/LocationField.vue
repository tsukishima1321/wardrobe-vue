<script setup lang="ts">
import { defineAsyncComponent, ref } from 'vue';
import { Location } from '@element-plus/icons-vue';
import { locationLabel, type PhotoLocation } from '@/api/location';
const LocationPicker = defineAsyncComponent(() => import('./LocationPicker.vue'));
defineProps<{ modelValue?: PhotoLocation | null; readonly?: boolean; loading?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: PhotoLocation | null] }>();
const visible = ref(false);
const confirm = (value: PhotoLocation) => { emit('update:modelValue', value); visible.value = false; };
</script>

<template>
    <div class="location-field">
        <div class="location-row">
            <span class="location-label"><el-icon><Location /></el-icon>位置</span>
            <template v-if="!readonly">
                <el-button text size="small" :loading="loading" @click="visible = true">{{ modelValue ? '修改位置' : '地图选点' }}</el-button>
                <el-button v-if="modelValue" text size="small" type="danger" @click="emit('update:modelValue', null)">移除</el-button>
            </template>
        </div>
        <template v-if="modelValue">
            <router-link v-if="readonly" :to="{ path: '/map', query: { lat: modelValue.latitude, lng: modelValue.longitude } }" class="location-value">{{ locationLabel(modelValue) }}</router-link>
            <span v-else class="location-value">{{ locationLabel(modelValue) }}</span>
            <span v-if="modelValue.source === 'exif'" class="exif-hint">来自照片 EXIF</span>
        </template>
        <span v-else class="empty-location">{{ loading ? '正在读取照片位置…' : '未设置位置' }}</span>
        <el-dialog v-model="visible" title="选择拍摄地点" width="680px" style="max-width: calc(100vw - 24px)" append-to-body destroy-on-close>
            <LocationPicker v-if="visible" :initial="modelValue || null" @confirm="confirm" />
        </el-dialog>
    </div>
</template>

<style scoped>
.location-field { display: flex; flex-direction: column; gap: 5px; padding: 4px 0; }
.location-row { display: flex; align-items: center; gap: 2px; }
.location-label { display: flex; gap: 6px; align-items: center; margin-right: auto; font-size: 13px; color: #606266; }
.location-value { font-size: 14px; color: #287459; overflow-wrap: anywhere; }
.exif-hint, .empty-location { font-size: 12px; color: #909399; }
</style>
