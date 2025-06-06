<script setup lang="ts">

import favicon from '@/assets/icons/favicon.ico';
import iconSearch from '@/assets/icons/search.svg';
import iconUpload from '@/assets/icons/upload.svg';

</script>

<template>
    <el-menu :default-active="'/'" class="headermenu" mode="horizontal" :ellipsis="false" :router="true">
        <el-menu-item index="/" class="logo-menu-item">
            <img style="width: 48px" :src="favicon" alt="静寂的壁橱" />
        </el-menu-item>
        <el-menu-item index="/search"><img style="width: 16px" :src="iconSearch">搜索</el-menu-item>
        <el-menu-item index="/upload"><img style="width: 16px" :src="iconUpload">上传</el-menu-item>
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