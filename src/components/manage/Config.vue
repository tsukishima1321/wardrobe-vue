<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage, ElInput } from 'element-plus';
import { useMapSettings, saveMapSettings } from '@/composables/useMapSettings';
import { mapProviders } from '@/maps/providers';

const settings = useMapSettings();
const mapProvider = ref(settings.value.provider);
const tiandituToken = ref(settings.value.tiandituToken);
const tokenInput = ref<InstanceType<typeof ElInput>>();
const saveMap = () => {
    if (mapProvider.value === 'tianditu' && !tiandituToken.value.trim()) {
        ElMessage.warning('请填写天地图 Token');
        tokenInput.value?.focus();
        return;
    }
    try {
        saveMapSettings({ provider: mapProvider.value, tiandituToken: tiandituToken.value });
        tiandituToken.value = tiandituToken.value.trim();
        ElMessage.success('地图设置已保存');
    } catch {
        ElMessage.error('设置保存失败，请检查浏览器存储权限');
    }
};

const useLocalImagebed = ref(false);
const localImagebedPath = ref('');

const handleImagebedChange = (value: boolean) => {
    window.localStorage.setItem('useLocalImagebed', value.toString());
    ElMessage.success('设置已保存');
};

const handleLocalImagebedPathChange = (value: string) => {
    window.localStorage.setItem('localImagebedPath', value);
    ElMessage.success('设置已保存');
};

onMounted(() => {
    const localImagebedSetting = window.localStorage.getItem('useLocalImagebed');
    useLocalImagebed.value = localImagebedSetting === 'true';
    const localImagebedPathSetting = window.localStorage.getItem('localImagebedPath');
    localImagebedPath.value = localImagebedPathSetting || '';
});
</script>

<template>
    <el-card class="manage-content">
        <h2>图床</h2>
        <el-switch v-model="useLocalImagebed" active-text="使用本地图床" inactive-text="使用在线图床" @change="handleImagebedChange" />
        <el-input v-if="useLocalImagebed" v-model="localImagebedPath" placeholder="请输入本地图床路径" @change="handleLocalImagebedPathChange" />
        <el-divider />
        <h2>地图服务</h2>
        <el-form label-position="top" @submit.prevent="saveMap">
            <el-form-item label="地图来源">
                <el-radio-group v-model="mapProvider" aria-label="地图来源">
                    <el-radio-button v-for="provider in mapProviders" :key="provider.value" :value="provider.value">{{ provider.label }}</el-radio-button>
                </el-radio-group>
            </el-form-item>
            <el-form-item v-if="mapProvider === 'tianditu'" label="天地图 Token">
                <el-input ref="tokenInput" v-model="tiandituToken" type="password" show-password clearable
                    autocomplete="off" placeholder="请输入天地图 Token" aria-label="天地图 Token" />
                <a class="token-link" href="https://cloudcenter.tianditu.gov.cn/" target="_blank" rel="noopener noreferrer">获取 Token ↗</a>
            </el-form-item>
            <p class="setting-hint">用于照片地图和地图选点，保存在当前浏览器。</p>
            <el-button type="primary" native-type="submit">保存地图设置</el-button>
        </el-form>
    </el-card>
</template>

<style scoped>
.el-card {
    margin: 20px;
    flex: 1;
    min-width: 0;
    max-width: 640px;
    height: fit-content;
    background-color: #fff;
}

h2 { margin: 0 0 16px; font-size: 17px; font-weight: 600; }
.setting-hint { margin: 0 0 16px; font-size: 12px; color: #909399; }
.token-link { margin-top: 6px; font-size: 12px; }
@media (max-width: 600px) {
    .el-card { margin: 12px; }
    :deep(.el-radio-button__inner) { padding: 8px 12px; }
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.header-row h2 {
    margin: 0;
}

.header-actions {
    display: flex;
    gap: 8px;
}

.add-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}
</style>
