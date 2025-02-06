<script setup lang="ts">

import { useRouter } from "vue-router";
import { ref } from 'vue';
import { fetchDataAutoRetry } from "@/token";
import SearchBar from "./SearchBar.vue";
import Pagination from "./Pagination.vue";
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

const searchParams: SearchParams = {
    keyword: '',
    dateFrom: '',
    dateTo: '',
    searchByTitle: false,
    searchByContent: false,
    sortBy: '',
    sortOrder: '',
    typeFilter: [''],
    page: 1
};

const pageChanged = (newPage: number) => {
    searchParams.page = newPage;
    updateSearch();
}

const updateSearchPara = (params: SearchParams) => {
    searchParams.keyword = params.keyword;
    searchParams.dateFrom = params.dateFrom;
    searchParams.dateTo = params.dateTo;
    searchParams.searchByTitle = params.searchByTitle;
    searchParams.searchByContent = params.searchByContent;
    searchParams.sortBy = params.sortBy;
    searchParams.sortOrder = params.sortOrder;
    searchParams.typeFilter = params.typeFilter;
    updateSearch();
}

const updateSearch = debounce(() => {
    console.log(searchParams);
    let para = {
        searchKey: searchParams.keyword,
        page: searchParams.page,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
        byName: searchParams.searchByTitle,
        byFullText: searchParams.searchByContent,
        orderBy: searchParams.sortBy,
        order: searchParams.sortOrder,
        type: searchParams.typeFilter.join('^')
    };
    let data = fetchDataAutoRetry('/api/search/', para);
    data.then(data => {
        console.log(data);
    });
}, 200);
</script>

<template>
    <div class="search">
        <SearchBar :typeList="typeList" :keyword="keyword" @updateValue="updateSearchPara" />
        <Pagination @pageChanged="pageChanged"/>
    </div>
</template>

<style scoped>
.search {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}
</style>