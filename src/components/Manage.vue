<script setup lang="ts">
import {
    Memo,
    Box,
    Expand,
    Fold,
} from '@element-plus/icons-vue'
import { ref } from 'vue'
import ManageOcr from './ManageOcr.vue'
import ManageBackup from './ManageBackup.vue'

const activeIndex = ref('1');
const isMenuCollapsed = ref(false);

const handleSelect = (key: string, keyPath: string[]) => {
    activeIndex.value = key;
}

// 切换菜单折叠状态
const toggleMenuCollapse = () => {
    isMenuCollapsed.value = !isMenuCollapsed.value;
}
</script>

<template>
    <el-row class="manage">
        <el-col :span="isMenuCollapsed ? 1 : 8">
            <div class="menu-container">
                <!-- 折叠/展开按钮 -->
                <div class="menu-toggle-btn">
                    <el-button :icon="isMenuCollapsed ? Expand : Fold" @click="toggleMenuCollapse" type="primary"
                        text />
                </div>

                <el-menu default-active="1" @select="handleSelect" :collapse="isMenuCollapsed"
                    :collapse-transition="true">
                    <el-menu-item index="0">
                    </el-menu-item>
                    <el-menu-item index="1">
                        <el-icon>
                            <Memo />
                        </el-icon>
                        <span>OCR任务</span>
                    </el-menu-item>
                    <el-menu-item index="2">
                        <el-icon>
                            <Box />
                        </el-icon>
                        <span>备份管理</span>
                    </el-menu-item>
                </el-menu>
            </div>
        </el-col>
        <ManageOcr v-if="activeIndex === '1'" />
        <ManageBackup v-if="activeIndex === '2'" />
    </el-row>
</template>

<style scoped>
.el-col {
    min-width: 60px;
    max-width: 180px;
}

.menu-container {
    position: relative;
    height: 100%;
}

.menu-toggle-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
}

.el-menu {
    height: 95vh;
    border-right: none;
}

.manage {
    height: 95vh;
    background-color: #f0f2f5;
}
</style>
