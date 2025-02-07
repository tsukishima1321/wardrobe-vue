<script setup lang="ts">
import { computed, ref } from 'vue';

const { maxPage } = defineProps({
    maxPage: {
        type: Number,
        default: 99
    }
});

const emits = defineEmits<{
    pageChanged: [page: number]
}>();

const currentPage = ref(1);
const visiblePages = computed(() => {
    const pages = Array<string>();
    let startPage = Math.max(1, currentPage.value - 2);
    let endPage = Math.min(maxPage, currentPage.value + 2);
    for (let i = 1; i <= maxPage; i++) {
        if (i > 0 && i <= 2 || i >= startPage && i <= endPage || i >= maxPage - 1 && i <= maxPage) {
            pages.push(i.toString());
        } else {
            pages.push('...');
            if (i == 3) {
                i = startPage - 1;
            } else if (i == endPage + 1) {
                i = maxPage - 2;
            }
        }
    }
    return pages;
});

const previousPage = () => {
    if (currentPage.value > 1) {
        currentPage.value--;
        emits('pageChanged', currentPage.value);
    }
}

const nextPage = () => {
    if (currentPage.value < maxPage) {
        currentPage.value++;
        emits('pageChanged', currentPage.value);
    }
}

const goToPage = (event: Event) => {
    const target = event.target as HTMLButtonElement;
    const pageNumber = Number(target.textContent);
    if (pageNumber) {
        currentPage.value = pageNumber;
        emits('pageChanged', currentPage.value);
    }
}

const goToPageInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const pageNumber = Number(target.value);
    if (pageNumber >= 1 && pageNumber <= maxPage) {
        currentPage.value = pageNumber;
        emits('pageChanged', currentPage.value);
    }
}

</script>

<template>
    <div id="pagination">
        <button @click="previousPage" id="prevButton" :disabled="currentPage === 1">&lt;&lt;</button>
        <span id="pageNumbers">
            <button v-for="page in visiblePages" :key="page" @click="goToPage"
                :class="{ active: currentPage == Number(page), omit: page == '...' }">{{ page }}</button>
        </span>
        <button @click="nextPage" id="nextButton" :disabled="currentPage === maxPage">&gt;&gt;</button>
        <input @change="goToPageInput" type="number" id="pageNumberInput" min="1" max="99">
    </div>
</template>

<style scoped>
.omit {
    border: none;
}

@media (min-width:600px) {
    #pagination {
        display: flex;
        justify-content: center;
        align-items: center;
        position: fixed;
        bottom: 0;
        width: 100%;
        background-color: #f1f1f1;
        padding: 10px;
        box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
    }

    #pagination button,
    #pagination #pageNumberInput {
        margin: 0 5px;
    }

    .active {
        background-color: #b1d6ff;
        color: rgb(0, 0, 0);
    }

    #pagination #pageNumbers {
        display: flex;
    }
}

@media (max-width: 600px) {
    #pagination {
        flex-direction: column;
        align-items: flex-end;
        right: 0;
        bottom: auto;
        top: 50%;
        transform: translateY(-50%);
        width: auto;
        padding: 10px;
        background-color: rgba(241, 241, 241, 0.9);
        display: flex;
        justify-content: center;
        position: fixed;
        box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
    }

    #pagination #pageNumbers {
        display: flex;
        flex-direction: column;
    }

    .active {
        background-color: #b1d6ff;
        color: white;
    }

    #pagination button,
    #pagination #pageNumberInput {
        margin: 5px 0;
        max-width: 2.5em;
    }
}
</style>