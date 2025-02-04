<script setup lang="ts">
import { useRouter } from "vue-router";
import { checkToken, refreshAccessToken } from '../token.ts';

const router = useRouter();

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
            } else {
                refreshAccessToken(refreshToken)
                    .then((res) => {
                        if (res) {
                            console.log('Token is valid');
                        } else {
                            router.push('/login');
                        }
                    })
            }
        });
}
</script>

<template>
    <main>
        <h1>Home Page</h1>
    </main>
</template>