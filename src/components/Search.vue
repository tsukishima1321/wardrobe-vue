<script setup lang="ts">

import { useRouter } from "vue-router";
import { ref, useTemplateRef } from 'vue';
import { fetchDataAutoRetry, GetBlobImgSrc } from "@/token";
import SearchBar from "./SearchBar.vue";
import Pagination from "./Pagination.vue";
import type { SearchParams } from "./SearchBar.vue";
import { debounce } from 'lodash';
import { onUpdated } from "vue";
import Masonry from 'masonry-layout';
import MasonryItemFigure from "./MasonryItemFigure.vue";

const router = useRouter();
const keyword = ref(router.currentRoute.value.params.keyword as string);
const typeList = ref<Array<string>>([]);
const totalPage = ref(99);
const blobImgList = ref<Array<{ blobSrc: string, oriSrc: string, title: string }>>([]);

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

interface SearchResponse {
    totalPage: number;
    hrefList: Array<{ src: string, title: string }>;
}

const masonryContainer = useTemplateRef('masonryContainer');
let masonry: Masonry;
onUpdated(() => {
    masonry = new Masonry(masonryContainer.value as Element, {
        itemSelector: '.masonry-item',
        columnWidth: 300,
        gutter: 20,
        fitWidth: true
    })
})

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
    let data = fetchDataAutoRetry('/api/search/', para) as Promise<SearchResponse>;
    data.then(data => {
        blobImgList.value = [];
        totalPage.value = data.totalPage;
        console.log(data);
        for (let item of data.hrefList) {
            GetBlobImgSrc("/image/thumbnails/" + item.src).then((blobSrc) => {
                blobImgList.value.push({ blobSrc: blobSrc, oriSrc: item.src, title: item.title });
            }).catch(() => {
                router.push('/login');
            });
        }
        if (masonry) {
            masonry?.layout!();
        }
    });
}, 200);

const imgClicked = (src: string) => {
    const newWindow = router.resolve('/detail/' + src);
    window.open(newWindow.href, '_blank');
}
</script>

<template>
    <div class="search">
        <SearchBar :typeList="typeList" :keyword="keyword" @updateValue="updateSearchPara" />
        <div class="masonryContainerContainer">
            <div ref="masonryContainer" class="masonry">
                <MasonryItemFigure v-for="blobImg in blobImgList" :key="blobImg.blobSrc" :src="blobImg.blobSrc"
                    :oriSrc="blobImg.oriSrc" :figcaption="blobImg.title" @clicked="imgClicked"/>
            </div>
        </div>
        <Pagination @pageChanged="pageChanged" :maxPage="totalPage" />
    </div>
</template>

<style scoped>
.search {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 95vh;
    width: 100%;
    height: auto;
    margin-left: auto;
    margin-right: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
}

.masonry {
    margin-left: auto;
    margin-right: auto;
}

.masonryContainerContainer {
    margin-left: auto;
    margin-right: auto;
    width: 90%;
}
</style>