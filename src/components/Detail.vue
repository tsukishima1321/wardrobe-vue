<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref } from 'vue';
import iconNoEdit from '@/assets/icons/pencil-off.svg';
import iconcheck from '@/assets/icons/check.svg';
import { fetchDataAutoRetry, GetBlobImgSrc } from '../token.ts';

const router = useRouter();
const imgSrc = ref(router.currentRoute.value.params.src);
const blobSrc = ref('');
const enableEdit = ref(false);
const enableEditText = ref(false);
const types = ref<Array<string>>([]);

const typeSelected = ref('');
const imgTitle = ref('');
const imgText = ref('');
const imgDate = ref('');

interface imgData {
    src: string,
    title: string,
    type: string,
    date: string,
    text: string
}

const loadImg = () => {
    GetBlobImgSrc("/image/" + imgSrc.value).then((res) => {
        blobSrc.value = res;
        fetchDataAutoRetry(`/api/get/image/`, { src: imgSrc.value }, 'POST').then((res) => {
            const r = res as imgData;
            imgTitle.value = r.title;
            imgText.value = r.text;
            imgDate.value = r.date;
            typeSelected.value = r.type;
        }).catch(() => {
            router.push('/login');
        });
    }).catch(() => {
        router.push('/login');
    });
}

const startEdit = () => {
    if (enableEdit.value || enableEditText.value) {
        alert('Please submit the current changes before editing image');
        return;
    } else {
        enableEdit.value = true;
    }
}

const submitEdit = () => {
    const data = {
        src: imgSrc.value,
        title: imgTitle.value,
        type: typeSelected.value,
        date: imgDate.value,
    };
    fetchDataAutoRetry(`/api/set/image/`, data, 'POST').then(() => {
        enableEdit.value = false;
        loadImg();
    }).catch(() => {
        router.push('/login');
    });
}

const startEditText = () => {
    if (enableEdit.value || enableEditText.value) {
        alert('Please submit the current changes before editing image');
        return;
    } else {
        enableEditText.value = true;
    }
}

const submitEditText = () => {
    const data = {
        src: imgSrc.value,
        text: imgText.value
    };
    fetchDataAutoRetry(`/api/set/text/`, data, 'POST').then(() => {
        enableEditText.value = false;
        loadImg();
    }).catch(() => {
        router.push('/login');
    });
}

fetchDataAutoRetry('/api/types/', {}, 'GET').then((res) => {
    types.value = res as Array<string>;
    loadImg();
}).catch(() => {
    router.push('/login');
});
</script>

<template>
    <div class="detail">
        <div class="left">
            <div id="image-viewer">
                <img id="viewedImage" alt="Image Viewer" :src="blobSrc">
            </div>
        </div>
        <div class="right">
            <div class="row">
                <h4 id="imgTitle">{{ imgTitle }}</h4>
                <button v-if="!enableEdit" id="editButton" @click="startEdit">
                    <img :src="iconNoEdit" alt="Edit">
                </button>
                <button v-else id="submitButton" @click="submitEdit">
                    <img :src="iconcheck" alt="Submit">
                </button>
            </div>
            <input type="text" v-if="enableEdit" id="imgTitleInput" v-model="imgTitle">
            <div class="row">
                <select id="typeSelected" v-model="typeSelected" :disabled="!enableEdit">
                    <option v-for="type in types" :value="type">{{ type }}</option>
                </select>
                <input type='date' id="imgDate" :readonly="!enableEdit" v-model="imgDate">
            </div>
            <hr>
            <div class="row-button">
                <button v-if="!enableEditText" id="editButtonText" @click="startEditText">
                    <img :src="iconNoEdit" alt="Edit">
                </button>
                <button v-else id="submitButtonText" @click="submitEditText">
                    <img :src="iconcheck" alt="Submit">
                </button>
            </div>
            <textarea id="imgText" :readonly="!enableEditText" v-model="imgText"></textarea>
        </div>
    </div>
</template>

<style scoped>
.detail {
    width: 100%;
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: flex-start;
    height: 91%;
    background-color: #f0f0f0;
}

.left,
.right {
    padding: 20px;
}

@media (max-width: 600px) {
    .detail {
        flex-direction: column;
        height: auto;
    }

    .left,
    .right {
        padding: 10px;
    }
}

.left {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

#image-viewer {
    width: 50vw;
    height: 86vh;
    overflow: scroll;
    position: relative;
    border: 1px solid #ccc;
    padding: 0;
}

button {
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 5px;
    cursor: pointer;
}

@media (max-width: 600px) {
    #image-viewer {
        width: 90vw;
        height: 70vh;
    }
}

#image-viewer img {
    width: 100%;
    height: auto;
    position: absolute;
    cursor: grab;
    object-fit: cover;
    padding: 0;
}

.right {
    flex: 1;
    display: flex;
    flex-direction: column;
    width: 90vw;
}

h4 {
    margin: 0 0 10px 0;
    font-size: 24px;
}

hr {
    margin: 10px 0;
    border: 1px solid #ccc;
}

.row {
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
}

.row-button {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
}

select,
input[type='date'] {
    padding: 5px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 5px;
}

input[type='text'] {
    width: 100%;
    padding: 5px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 5px;
    margin-bottom: 10px;
}

textarea {
    width: 100%;
    height: 500px;
    padding: 10px;
    font-size: 16px;
    border: 1px solid #ccc;
    border-radius: 5px;
    resize: none;
}
</style>