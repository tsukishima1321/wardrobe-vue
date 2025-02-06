<script setup lang="ts">
import { useRouter } from "vue-router";
import { ref } from 'vue';
const router = useRouter();
const imgSrc = ref(router.currentRoute.value.params.src);
</script>

<template>
    <div>
        <h1>{{ imgSrc }}</h1>
    </div>
</template>