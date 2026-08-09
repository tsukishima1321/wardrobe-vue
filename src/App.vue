<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Head from './components/common/Head.vue';

const route = useRoute();
const showHead = computed(() => route.name != null && route.name !== 'login');
</script>

<template>
    <Head v-if="showHead" />
    <router-view />
</template>

<style scoped>
</style>
