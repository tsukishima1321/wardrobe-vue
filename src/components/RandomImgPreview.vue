<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from "vue-router";
import { fetchDataAutoRetry, GetBlobImgSrc } from '../token.ts';

interface ImgInfo {
    src: string,
    title: string
}

const props = defineProps({
    defaultType: {
        type: String,
        default: ''
    }
});

const router = useRouter();

const pickedImg = ref('');
let oriSrc: string = '';
const pickImg = () => {
    fetchDataAutoRetry(`/api/random/${typeSelected.value == '不限' ? '' : `?type=${typeSelected.value}`}`, {}, 'GET').then((res) => {
        const r = res as ImgInfo;
        GetBlobImgSrc("/imagebed/thumbnails/" + r.src).then((blobSrc) => {
            oriSrc = r.src;
            pickedImg.value = blobSrc;
        }).catch(() => {
            router.push('/login');
        });
    }).catch(() => {
        router.push('/login');
    });
};

const types = ref<Array<string>>([]);
const typeSelected = ref('');
fetchDataAutoRetry('/api/types/', {}, 'GET').then((res) => {
    types.value = res as Array<string>;
    if (types.value.length > 0) {
        if (types.value.includes(props.defaultType)) {
            typeSelected.value = props.defaultType;
        } else {
            typeSelected.value = '不限';
        }
    }
    pickImg();
}).catch(() => {
    router.push('/login');
});

const openDetail = () => {
    const newWindow = router.resolve(`/detail/${oriSrc}`);
    window.open(newWindow.href, '_blank');
}
</script>

<template>
    <el-card id="random-img-preview">
        <div id="image-viewer">
            <el-image :src="pickedImg"></el-image>
        </div>
        <el-row>
            <el-select id="typeSelected" v-model="typeSelected">
                <el-option :value="'不限'">不限</el-option>
                <el-option v-for="type in types" :value="type">{{ type }}</el-option>
            </el-select>
            <el-button id="randomButton" @click="pickImg">换一张</el-button>
            <el-button id="detailButton" @click="openDetail">查看详情</el-button>
        </el-row>

    </el-card>
</template>

<style scoped>
#random-img-preview {
    margin-right: 5px;
}

.el-image {
    height: auto;
    object-fit: cover;
    padding: 0;
    margin: 0;
    width: 80%;
}

#image-viewer {
    height: 70vh;
    width: 33vw;
    overflow: scroll;
    text-align: center;
    margin-bottom: 5px;
}

.el-select {
    width: 200px;
    margin-right: auto;
}

.el-row {
    margin-top: 5px;
}

@media (max-width: 600px) {
    .el-select {
        width: 100px;
        margin-right: auto;
    }

    #random-img-preview {
        margin-bottom: 20px;
    }

    #image-viewer {
        width: auto;
        height: 50vh;
    }
}
</style>