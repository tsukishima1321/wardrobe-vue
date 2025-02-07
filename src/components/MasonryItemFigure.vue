<script setup lang="ts">
const { src, figcaption, oriSrc } = defineProps({
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
    }
});

const emits = defineEmits<{
    clicked: [src:string]
}>();

const clicked = ()=>{
    emits('clicked', oriSrc);
}
</script>

<template>
    <figure class="masonry-item">
        <img :src="src" @click="clicked">
        <figcaption>{{ figcaption }}</figcaption>
    </figure>
</template>

<style scoped>
.masonry-item {
    display: flex;
    flex-direction: column;
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

@media (max-width: 600px) {
    figure img {
        width: 100%;
    }
}
</style>