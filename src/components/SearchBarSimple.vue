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

function upload() {
    router.push('/upload');
}

</script>

<template>
    <el-card class="search">
        <el-row>
            <el-button id="uploadButton" @click="upload" type="primary">上传图片</el-button>
            <el-input id="searchText" placeholder="输入关键字" @change="sendValue" v-model="keyword" />
            <el-button id="searchButton" @click="sendValue" type="primary">搜索</el-button>
        </el-row>

    </el-card>
</template>

<style scoped>
.search {
    margin-right: 5px;
    margin-bottom: 20px;
}

.el-row {
    display: flex;
    align-items: center;
    justify-content: center;
}

.uploadButton {
    margin-right: 10px;
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