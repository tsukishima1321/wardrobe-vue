<script setup lang="ts">
import { useRouter } from "vue-router";
import { checkToken, refreshAccessToken } from '../token.ts';
import { ref } from 'vue';
import RandomImgPreview from './RandomImgPreview.vue';
import SearchBarSimple from './SearchBarSimple.vue';
import Statistics from './Statistics.vue';

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

const search = (keyword: string) => {
    const newWindow = router.resolve({ name: 'search', params: { keyword: keyword } });
    window.open(newWindow.href, '_blank');
}
</script>

<template>
    <div v-if="isLogin" class="body">
        <div id="left-column">
            <div class="random-images">
                <RandomImgPreview :defaultType="'美图'" />
                <RandomImgPreview />
            </div>
            <SearchBarSimple @updateValue="search" />
        </div>
        <div id="right-column">
            <Statistics />
        </div>
    </div>
</template>

<style scoped>
.body {
    height: 80vh;
    display: grid;
    grid-template-columns: 70vw 25vw;
    padding: 10px;
}

@media (max-width: 600px) {
    .body {
        display: flex;
        height: auto;
        flex-direction: column;
    }
}

#right-column {
    display: inline-block;
    vertical-align: top;
    margin-left: 5px;
}

#left-column {
    display: column;
    flex-direction: column;
    width: 70vw;
}

.random-images {
    display: flex;
    flex-direction: row;
    padding-bottom: 10px;
}

#right-column {
    width: 25vw;
}

.random-image,
#search,
#statistics {
    margin-bottom: 20px;
}

@media (max-width: 600px) {
    .random-images {
        height: auto;
        flex-direction: column;
    }

    #left-column {
        width: 100%;
        border-right: none;
    }

    #right-column {
        width: 100%;
    }

    .image-viewer {
        width: auto;
        height: 50vh;
    }
}
</style>