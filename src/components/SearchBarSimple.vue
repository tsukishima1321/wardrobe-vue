<script setup lang="ts">
import { ref, defineEmits } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const emits = defineEmits<{
    updateValue: [keyword: string]
}>();
const keyword = ref('');
function sendValue() {
    emits('updateValue', keyword.value)
}

</script>

<template>
    <el-card class="search">
        <el-row>
            <el-input id="searchText" placeholder="输入关键字" @change="sendValue" v-model="keyword" />
            <el-button id="searchButton" @click="sendValue" type="primary">搜索</el-button>
        </el-row>

    </el-card>
</template>

<style scoped>
.search {
    padding: 10px;
    width: 100%;
}

.el-row {
    display: flex;
    align-items: center;
    justify-content: center;
}

.el-input {
    width: 80%;
    padding: 5px;
    margin-right: 5px;
}

@media (max-width: 600px) {
    .el-input {
        width: 40%;
    }
}
</style>