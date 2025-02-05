<script setup lang="ts">
import { useRouter } from "vue-router";
import { checkToken, refreshAccessToken } from '../token.ts';
import { ref } from 'vue';
import RandomImgPreview from './RandomImgPreview.vue';

const router = useRouter();

const isLogin = ref(false);

const accessToken = localStorage.getItem('wardrobe-access-token');
const refreshToken = localStorage.getItem('wardrobe-refresh-token');
if (!accessToken || !refreshToken) {
    console.log('No token Found');
    router.push('/login');
} else {
    checkToken(accessToken)
        .then((res) => {
            if (res) {
                console.log('Token is valid');
                isLogin.value = true;
            } else {
                refreshAccessToken(refreshToken)
                    .then((res) => {
                        if (res) {
                            console.log('Token is valid');
                            isLogin.value = true;
                        } else {
                            router.push('/login');
                        }
                    })
            }
        });
}
</script>

<template>
    <h1>Home Page</h1>
    <RandomImgPreview v-if="isLogin" :defaultType="'美图'" />
    <RandomImgPreview v-if="isLogin" />
</template>