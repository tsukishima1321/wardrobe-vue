<script setup lang="ts">
import { ref } from 'vue'
const { src, figcaption, oriSrc, checked } = defineProps({
    src: {
        type: String,
        default: '/placeholder.png'
    },
    figcaption: {
        type: String,
        default: 'Placeholder image'
    },
    oriSrc: {
        type: String,
        default: '/placeholder.png'
    },
    checked: {
        type: Boolean,
        default: false
    }
});

const selected = ref<boolean>(checked);

const emits = defineEmits<{
    clicked: [src: string],
    selected: [src: string],
    unselected: [src: string]
}>();

const clicked = () => {
    emits('clicked', oriSrc);
}

const changed = () => {
    if (selected) {
        emits('selected', oriSrc);
    } else {
        emits('unselected', oriSrc);
    }
}
</script>

<template>
    <figure class="masonry-item">
        <img :src="src" @click="clicked">
        <figcaption><el-checkbox v-model="selected" @change="changed" style="display: inline;"></el-checkbox>{{
            figcaption }}</figcaption>
    </figure>
</template>

<style scoped>
.masonry-item {
    display: flex;
    flex-direction: column;
}

.el-checkbox {
    margin-right: 5px;
}

figure {
    width: 300px;
    box-shadow: 0 1px 2px rgba(34, 25, 25, 0.4);
    margin: 0;
    margin-bottom: 10px;
    border-radius: 4px;
}

figure figcaption {
    word-wrap: break-word;
    padding: 5px;
    border-radius: 0 0 4px 4px;
    background-color: #f1f1f1;
}

figure img {
    width: 100%;
    height: auto;
    margin-bottom: 0px;
    border-radius: 4px 4px 0 0;
}
</style>