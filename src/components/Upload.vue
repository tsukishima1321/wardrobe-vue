<script setup lang="ts">
import iconUpload from '@/assets/icons/upload.svg';
import iconCheck from '@/assets/icons/check.svg';
import { fetchDataAutoRetry, checkToken, refreshAccessToken } from '../token.ts';
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

const types = ref<Array<string>>([]);

const typeSelected = ref('');
const imgTitle = ref('');
const imgDate = ref(new Date().toISOString().split('T')[0]);
const isOCR = ref(true);

const previewImage = () => {
    const file = document.getElementById('fileInput') as HTMLInputElement;
    if (!file.files || file.files.length === 0) {
        return;
    }
    const imgFile = file.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = document.getElementById('viewedImage') as HTMLImageElement;
        img.src = e.target?.result as string;
    };
    reader.readAsDataURL(imgFile);
};

const uploadMaterial = () => {
    const file = document.getElementById('fileInput') as HTMLInputElement;
    file.click();
};

const submitEdit = async () => {
    const loadingScreen = document.getElementById('loading-screen') as HTMLDivElement;
    loadingScreen.style.display = 'flex';
    const file = document.getElementById('fileInput') as HTMLInputElement;
    if (!file.files || file.files.length === 0) {
        alert('Please select an image to upload');
        return;
    }
    const imgFile = file.files[0];
    const formData = new FormData();
    formData.append('image', imgFile);
    formData.append('title', imgTitle.value);
    formData.append('type', typeSelected.value);
    formData.append('date', imgDate.value);
    formData.append('doOCR', isOCR.value ? 'true' : 'false');

    const url = '/api/new/image/';
    const token = localStorage.getItem('wardrobe-access-token');
    if (!token) {
        router.push('/login');
        return;
    }
    if (await checkToken(token)) {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) {
            alert('上传失败!');
            console.error('Submit edit failed:', response);
            loadingScreen.style.display = 'none';
            return;
        }
    } else {
        const refreshToken = localStorage.getItem('wardrobe-refresh-token');
        if (!refreshToken) {
            console.error('Refresh token not found!');
            router.push('/login');
            loadingScreen.style.display = 'none';
            return;
        }
        try {
            refreshAccessToken(refreshToken);
        } catch (error) {
            console.error('Refresh token failed:', error);
            router.push('/login');
            return;
        }
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        if (!response.ok) {
            alert('上传失败!');
            console.error('Submit edit failed:', response);
            loadingScreen.style.display = 'none';
            return;
        }
    }
    loadingScreen.style.display = 'none';
    alert('上传成功!');
};

fetchDataAutoRetry('/api/types/', {}, 'GET').then((res) => {
    types.value = res as Array<string>;
    typeSelected.value = types.value[0];
}).catch(() => {
    router.push('/login');
});
</script>

<template>
    <div class="upload">
        <div id="loading-screen" class="loading-screen" style="display: none;">
            <div class="spinner"></div>
        </div>
        <div class="left">
            <input type="file" ref="fileInput" style="display:none" id="fileInput" accept="image/*"
                @change="previewImage">
            <button @click="uploadMaterial" class="uploadButton">
                <img :src="iconUpload" alt="Upload">
            </button>
            <div id="image-viewer">
                <img id="viewedImage" alt="Image Viewer">
            </div>
        </div>
        <div class="right">
            <input type="text" id="imgTitle" v-model="imgTitle">
            <div class="row">
                <select id="typeSelected" v-model="typeSelected">
                    <option v-for="type in types" :value="type">{{ type }}</option>
                </select>
                <div class="right-row">
                    <input type='date' id="dateInput" v-model="imgDate">
                    <input type='checkbox' id="imgOCR" checked="true" class="switch" v-model="isOCR">
                    <label for="imgOCR">是否启用OCR</label>
                </div>
            </div>
            <button id="submitButton" @click="submitEdit">
                <img :src="iconCheck" alt="Submit">
            </button>
            <hr>
        </div>
    </div>
</template>

<style scoped>
.upload {
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

.left {
    display: flex;
    flex-direction: column;
}

.uploadButton {
    width: 48px;
    height: 48px;
    margin-left: 10px;
    margin-right: auto;
    margin-top: 10px;
    margin-bottom: 10px;
}

.left,
.right {
    padding: 20px;
}


.left {
    flex: 1;
    display: flex;
    justify-content: center;
    align-items: center;
}

#image-viewer {
    width: 50vw;
    height: 83vh;
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


.right-row {
    display: flex;
}

.row-button {
    display: flex;
    justify-content: flex-end;
    margin-bottom: 10px;
}

@media (max-width: 600px) {
    .upload {
        flex-direction: column;
        height: auto;
    }

    .row {
        display: flex;
        flex-direction: column;
    }

    .left,
    .right {
        padding: 10px;
    }

    .right-row {
        margin-top: 10px;
    }
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

input[type='checkbox'].switch {
    padding-left: 5px;
    margin-top: auto;
    margin-bottom: auto;
    outline: none;
    appearance: none;
    -webkit-appearance: none;
    -moz-appearance: none;
    position: relative;
    width: 40px;
    height: 20px;
    background: #ccc;
    border-radius: 10px;
    transition: border-color .3s, background-color .3s;
}

label {
    margin-top: auto;
    margin-bottom: auto;
}

input[type='checkbox'].switch::after {
    content: '';
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border-radius: 50%;
    background: #fff;
    box-shadow: 0, 0, 2px, #999;
    transition: .4s;
    top: 2px;
    position: absolute;
    left: 2px;
}

input[type='checkbox'].switch:checked {
    background: rgb(19, 206, 102);
}

/* 当input[type=checkbox]被选中时：伪元素显示下面样式 位置发生变化 */
input[type='checkbox'].switch:checked::after {
    content: '';
    position: absolute;
    left: 55%;
    top: 2px;
}

.loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.4);
    z-index: 9999;
    display: flex;
    justify-content: center;
    align-items: center;
}

.spinner {
    width: 50px;
    height: 50px;
    border: 6px solid #ccc;
    border-top-color: #333;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}
</style>