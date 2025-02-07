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
        GetBlobImgSrc("/image/thumbnails/" + r.src).then((blobSrc) => {
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
    <div id="random-img-preview">
        <div id="image-viewer">
            <img id="viewedImage" :src="pickedImg">
        </div>
        <select id="typeSelected" v-model="typeSelected">
            <option>不限</option>
            <option v-for="type in types" :value="type">{{ type }}</option>
        </select>
        <button id="randomButton" @click="pickImg">换一张</button>
        <button id="detailButton" @click="openDetail">查看详情</button>
    </div>
</template>

<style scoped>
img {
    max-width: 100%;
    height: auto;
    object-fit: cover;
}

#image-viewer {
    height: 60vh;
    width: 30vw;
    overflow: scroll;
    text-align: center;
    margin-bottom: 5px;
}

button {
    padding: 5px;
    margin-top: 5px;
    margin-left: 5px;
    cursor: pointer;
}

select {
    padding: 5px;
    margin-top: 5px;
}

#image-info {
    text-align: center;
}

@media (max-width: 600px) {
    #random-img-preview {
        margin-bottom: 20px;
    }

    #image-viewer {
        width: auto;
        height: 50vh;
    }
}
</style>