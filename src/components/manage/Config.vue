<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';

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
        <el-switch v-model="useLocalImagebed" active-text="使用本地图床" inactive-text="使用在线图床" @change="handleImagebedChange" />
        <el-input v-if="useLocalImagebed" v-model="localImagebedPath" placeholder="请输入本地图床路径" @change="handleLocalImagebedPathChange" />
    </el-card>
</template>

<style scoped>
.el-card {
    margin: 20px;
    height: fit-content;
    background-color: #fff;
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
