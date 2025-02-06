<script setup lang="ts">

import { useRouter } from "vue-router";
import { ref } from 'vue';
import { fetchDataAutoRetry } from "@/token";
import SearchBar from "./SearchBar.vue";
import type { SearchParams } from "./SearchBar.vue";
import { debounce } from 'lodash';
const router = useRouter();
const keyword = ref(router.currentRoute.value.params.keyword as string);
const typeList = ref(['']);

fetchDataAutoRetry('/api/types/', {}, 'GET').then((res) => {
    typeList.value = res as Array<string>;
}).catch(() => {
    router.push('/login');
});

const updateSearch = debounce((params: SearchParams) => {
    params.page = 1;
    console.log(params);
    let para = {
        searchKey: params.keyword,
        page: params.page,
        dateFrom: params.dateFrom,
        dateTo: params.dateTo,
        byName: params.searchByTitle,
        byFullText: params.searchByContent,
        orderBy: params.sortBy,
        order: params.sortOrder,
        type: params.typeFilter.join('^')
    };
    let data = fetchDataAutoRetry('/api/search/', para);
    data.then(data => {
        console.log(data);
    });
}, 200);
</script>

<template>
    <div>
        <SearchBar :typeList="typeList" :keyword="keyword" @updateValue="updateSearch" />
    </div>
</template>