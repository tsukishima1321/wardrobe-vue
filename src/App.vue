<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue';
import { useRoute } from 'vue-router';
import Head from './components/common/Head.vue';
import { useQuickCapture } from './composables/useQuickCapture';

const QuickCapture = defineAsyncComponent(() => import('./components/blog/QuickCapture.vue'));
const { visible: quickCaptureVisible } = useQuickCapture();

const route = useRoute();
const showHead = computed(() => route.name != null && route.name !== 'login');
</script>

<template>
    <Head v-if="showHead" />
    <router-view />
    <QuickCapture v-if="quickCaptureVisible" />
</template>

<style scoped>
</style>
