<script setup lang="ts">
</script>

<template>
    <div class="search">
        <input type="text" id="searchText" placeholder="输入关键字" onchange="search()" />
        <button id="searchButton" onclick="search()">搜索</button>
    </div>
</template>

<style scoped>
.search {
    margin-bottom: 20px;
}

input {
    width: 80%;
    padding: 5px;
    margin-right: 5px;
}

button {
    padding: 5px;
}
</style>