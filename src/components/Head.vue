<script setup lang="ts">
import { RouterLink } from 'vue-router';

import favicon from '@/assets/icons/favicon.ico';
import iconSearch from '@/assets/icons/search.svg';
import iconUpload from '@/assets/icons/upload.svg';
</script>

<template>
    <div class="head">
        <h1>静寂的壁橱</h1>
        <nav>
            <img :src="favicon" alt="logo">
            <RouterLink to="/">首页</RouterLink>
            <img :src="iconSearch" alt="logo">
            <RouterLink to="/search">搜索</RouterLink>
            <img :src="iconUpload" alt="logo">
            <RouterLink to="/upload">上传</RouterLink>
        </nav>
    </div>
</template>

<style scoped>
.head {
    width: 100%;
    margin: 0;
    height: 5vh;
    display: flex;
    flex-direction: row;
    background-color: rgb(196, 210, 255);
}

nav {
    margin-top: auto;
    margin-bottom: auto;
    color: black;
    text-decoration: none;
}

h1 {
    font-size: 16px;
    margin: 0;
    margin-left: 20px;
    margin-right: 10px;
    margin-top: auto;
    margin-bottom: auto;
}

img {
    width: 20px;
    height: 20px;
    margin-top: auto;
    margin-bottom: auto;
    margin-left: 10px;
    margin-right: 10px;
}
</style>