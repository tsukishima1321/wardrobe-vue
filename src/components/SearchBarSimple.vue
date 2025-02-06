<script setup lang="ts">
import { ref, defineEmits } from 'vue';
const emits = defineEmits(['updateValue']);
const keyword = ref('');
function sendValue() {
    emits('updateValue', keyword.value)
}

</script>

<template>
    <div class="search">
        <input type="text" id="searchText" placeholder="输入关键字" @change="sendValue" v-model="keyword" />
        <button id="searchButton" @click="sendValue">搜索</button>
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