<script setup lang="ts">

import favicon from '@/assets/icons/favicon.ico';
import { Management, Search, UploadFilled,ChatSquare } from '@element-plus/icons-vue';

</script>

<template>
    <el-menu :default-active="'/'" class="headermenu" mode="horizontal" :ellipsis="false" :router="true">
        <el-menu-item index="/" class="logo-menu-item">
            <img style="width: 48px" :src="favicon" alt="静寂的壁橱" />
        </el-menu-item>
        <el-menu-item index="/diary"><el-icon>
                <ChatSquare />
            </el-icon>日记</el-menu-item>
        <el-menu-item index="/search"><el-icon>
                <Search />
            </el-icon>搜索</el-menu-item>
        <el-menu-item index="/upload"><el-icon>
                <UploadFilled />
            </el-icon>上传</el-menu-item>
        <el-menu-item index="/manage"><el-icon>
                <Management />
            </el-icon>管理</el-menu-item>
    </el-menu>
</template>

<style scoped>
.head {
    width: 100%;
    margin: 0;
}

.el-menu--horizontal {
    width: 100%;
}

.el-menu--horizontal>.el-menu-item:nth-child(1) {
    margin-right: auto;
}
</style>