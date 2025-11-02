<script setup lang="ts">

import { useRouter } from "vue-router";
import { computed, ref, useTemplateRef } from 'vue';
import { fetchDataAutoRetry, GetBlobImgSrc } from "@/token";
import SearchBar from "./SearchBar.vue";
import SearchToolBar from "./SearchToolBar.vue";
import Pagination from "./Pagination.vue";
import type { SearchParams } from "./SearchBar.vue";
import { debounce } from 'lodash';
import { onUpdated } from "vue";
import Masonry from 'masonry-layout';
import MasonryItemFigure from "./MasonryItemFigure.vue";
import { ElMessage, ElMessageBox } from 'element-plus';

const router = useRouter();
const searchword = ref(router.currentRoute.value.params.searchword as string);
const keywordsHint = ref<Array<string>>([]);
const propertiesHint = ref<Array<string>>([]);
const totalPage = ref(99);
const blobImgList = ref<Array<{ blobSrc: string, oriSrc: string, title: string, checked: boolean, date: Date }>>([]);
const isPictureMode = ref(true);
const renderPicture = ref(false);
const renderTable = ref(false);
const pageSize = computed(() => {
    if (isPictureMode.value) {
        return 20;
    } else {
        return 100;
    }
})

const searchParams: SearchParams = {
    searchword: '',
    dateFrom: '',
    dateTo: '',
    searchByTitle: false,
    searchByContent: false,
    sortBy: '',
    sortOrder: '',
    page: 1
};

const pageChanged = (newPage: number) => {
    searchParams.page = newPage;
    updateSearch();
}

interface SearchResponse {
    totalPage: number;
    hrefList: Array<{ src: string, title: string, date: Date }>;
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
    let order = 'desc'
    if (params.sortOrder == "升序") {
        order = 'asc'
    }
    searchParams.page = 1;
    searchParams.searchword = params.searchword;
    searchParams.dateFrom = params.dateFrom;
    searchParams.dateTo = params.dateTo;
    searchParams.searchByTitle = params.searchByTitle;
    searchParams.searchByContent = params.searchByContent;
    searchParams.sortBy = params.sortBy;
    searchParams.sortOrder = order;
    searchParams.keywords = params.keywords;
    searchParams.properties = params.properties;
    updateSearch();
}

const updateSearchHint = debounce(async () => {
    let data = await fetchDataAutoRetry('/api/searchhint/', {}, 'GET') as { keywords: Array<string>, properties: Array<string> };
    keywordsHint.value = data.keywords;
    propertiesHint.value = data.properties;
}, 300);

updateSearchHint();

const updateSearch = debounce(async () => {
    console.log(searchParams);
    if (!isPictureMode.value) {
        renderPicture.value = false;
    }
    if (isPictureMode.value) {
        renderTable.value = false;
    }
    let para = {
        searchKey: searchParams.searchword,
        page: searchParams.page,
        dateFrom: searchParams.dateFrom,
        dateTo: searchParams.dateTo,
        byName: searchParams.searchByTitle,
        byFullText: searchParams.searchByContent,
        orderBy: searchParams.sortBy,
        order: searchParams.sortOrder,
        pageSize: pageSize.value,
        keywords: searchParams.keywords,
        properties: searchParams.properties
    };
    let data = await fetchDataAutoRetry('/api/search/', para) as SearchResponse;
    blobImgList.value = data.hrefList.map(item => ({
        blobSrc: '',
        oriSrc: item.src,
        title: item.title,
        checked: false,
        date: item.date
    }));
    totalPage.value = data.totalPage;
    console.log(data);
    if (isPictureMode.value) {
        for (let item of data.hrefList) {
            GetBlobImgSrc("/imagebed/thumbnails/" + item.src).then((blobSrc) => {
                const imgItem = blobImgList.value.find(img => img.oriSrc === item.src);
                if (imgItem) {
                    imgItem.blobSrc = blobSrc;
                }
            }).catch(() => {
                router.push('/login');
            });
        }
    }
    if (isPictureMode.value) {
        renderPicture.value = true;
        renderTable.value = false;
    } else {
        renderPicture.value = false;
        renderTable.value = true;
    }
    if (isPictureMode.value && masonry) {
        masonry?.layout!();
    }
}, 200);

const handowSwitchMode = (pictureMode: boolean) => {
    isPictureMode.value = pictureMode;
    searchParams.page = 1;
    updateSearch();
}

const imgClicked = (src: string) => {
    const newWindow = router.resolve('/detail/' + src);
    window.open(newWindow.href, '_blank');
}

const imgSelected = (src: string) => {
    const item = blobImgList.value.find(item => item.oriSrc == src);
    if (item) {
        item.checked = true;
    }
}

const imgUnSelected = (src: string) => {
    const item = blobImgList.value.find(item => item.oriSrc == src);
    if (item) {
        item.checked = false;
    }
}

const handleDelete = async () => {
    const selectedList = blobImgList.value.filter(item => item.checked).map(item => item.oriSrc);
    if (selectedList.length === 0) {
        ElMessage.warning('选择列表为空');
        return;
    }
    for (let item of selectedList) {
        const yes = await ElMessageBox.confirm(`确定删除图片 ${item} 吗？`, '提示', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
        });
        if (yes) {
            fetchDataAutoRetry('/api/image/delete/', { src: item }, 'POST').then(() => {
                ElMessage.success(`图片 ${item} 已删除`);
            }).catch(() => {
                router.push('/login');
            });
        }
    }
    updateSearch();
}

const handleDownload = async () => {
    const selectedList = blobImgList.value.filter(item => item.checked).map(item => item.oriSrc);
    if (selectedList.length === 0) {
        ElMessage.warning('选择列表为空');
        return;
    }
    for (let item of selectedList) {
        const link = document.createElement('a');
        link.href = await GetBlobImgSrc('/imagebed/' + item);
        link.download = item;
        link.click();
    }
}

const tableSelect = (selection: Array<{ blobSrc: string, oriSrc: string, title: string, checked: boolean, date: Date }>) => {
    blobImgList.value.forEach(item => {
        item.checked = selection.some(sel => sel.oriSrc === item.oriSrc);
    });
}

const handleRowDoubleClidked = (row: { blobSrc: string, oriSrc: string, title: string, checked: boolean, date: Date }) => {
    const src = row.oriSrc
    const newWindow = router.resolve('/detail/' + src);
    window.open(newWindow.href, '_blank');
}

</script>

<template>
    <div class="search">
        <el-container class="tool">
            <SearchBar :searchword="searchword" :keywords-hint="keywordsHint"
                :properties-hint="propertiesHint" @updateValue="updateSearchPara" />
            <SearchToolBar  @delete="handleDelete" @download="handleDownload"
                @switch-mode="handowSwitchMode" />
        </el-container>

        <div v-if="renderPicture" class="masonryContainerContainer">
            <div ref="masonryContainer" class="masonry">
                <MasonryItemFigure v-for="blobImg in blobImgList" :key="blobImg.blobSrc" :src="blobImg.blobSrc"
                    :oriSrc="blobImg.oriSrc" :figcaption="blobImg.title" @clicked="imgClicked" @selected="imgSelected"
                    @unselected="imgUnSelected" />
            </div>
        </div>
        <div v-if="renderTable" class="tableContainer">
            <el-table :data="blobImgList" stripe style="width: 100%" @selection-change="tableSelect"
                @row-dblclick="handleRowDoubleClidked">
                <el-table-column type="selection" width="55" />
                <el-table-column prop="date" label="日期" width="180" />
                <el-table-column prop="title" label="标题" width="500" />
            </el-table>
        </div>
        <Pagination @pageChanged="pageChanged" :maxPage="totalPage" />
    </div>
    <el-backtop :right="100" :bottom="100" />
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

.el-table {
    margin-left: auto;
    margin-right: auto;
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

.tableContainer {
    margin-left: auto;
    margin-right: auto;
}

@media (min-width: 768px) {
    .tool {
        flex-direction: row;
        justify-content: center;
        margin-left: auto;
        margin-right: auto;
    }

    .tableContainer {
        width: 50%;
        min-width: fit-content;
    }
}

@media (max-width: 768px) {
    .tool {
        margin-left: auto;
        margin-right: auto;
        flex-direction: column;
    }

    .tableContainer {
        width: 95%;
    }
}
</style>