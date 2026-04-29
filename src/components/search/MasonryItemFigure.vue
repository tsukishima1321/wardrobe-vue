<script setup lang="ts">
import { ref, watch } from 'vue'
import { Collection } from '@element-plus/icons-vue'

const { src, figcaption, oriSrc, checked, isCollection } = defineProps({
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
    },
    isCollection: {
        type: Boolean,
        default: false
    }
});

const selected = ref<boolean>(checked);

watch(() => checked, (newVal) => {
    selected.value = newVal;
});

const emits = defineEmits<{
    clicked: [src: string],
    selected: [src: string],
    unselected: [src: string]
}>();

const clicked = () => {
    emits('clicked', oriSrc);
}

const changed = () => {
    if (selected.value) {
        emits('selected', oriSrc);
    } else {
        emits('unselected', oriSrc);
    }
}
</script>

<template>
    <figure class="masonry-item">
        <div class="img-wrapper">
            <img :src="src" @click="clicked" :onerror="(e : any) => { e.target.src = '/placeholder.png'; e.onerror = null }" />
            <div v-if="isCollection" class="collection-badge">
                <el-icon><Collection /></el-icon>
            </div>
        </div>
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

.img-wrapper {
    position: relative;
}

.img-wrapper img {
    width: 100%;
    height: auto;
    margin-bottom: 0px;
    border-radius: 4px 4px 0 0;
    display: block;
}

.collection-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: #fff;
    border-radius: 4px;
    padding: 4px 6px;
    font-size: 16px;
    display: flex;
    align-items: center;
    gap: 4px;
    backdrop-filter: blur(4px);
}
</style>