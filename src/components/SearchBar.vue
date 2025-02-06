<script setup lang="ts">
import { ref, defineEmits, computed, watchEffect } from 'vue';

const props = defineProps({
  typeList: {
    type: Array<string>,
    default: []
  },
  keyword: {
    type: String,
    default: ''
  }
});

export interface SearchParams {
  keyword: string;
  sortBy: string;
  sortOrder: string;
  dateFrom: string;
  dateTo: string;
  typeFilter: Array<string>;
  searchByTitle: boolean;
  searchByContent: boolean;
  page: number;
}

const emits = defineEmits(['updateValue']);

const keyword = ref(props.keyword);
const sortByText = ref('日期');
const sortBy = computed(() => {
  switch (sortByText.value) {
    case '日期':
      return 'date';
    case '文件名':
      return 'href';
    case '标题':
      return 'description';
  }
})
const sortOrder = ref('desc');
const dateFrom = ref('');
const dateTo = ref('');
const typeFilter = ref(['']);
const searchByTitle = ref(true);
const searchByContent = ref(false);



watchEffect(() => {
  typeFilter.value = props.typeList;
})

function sendValue() {
  const searchParams = {
    keyword: keyword.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    typeFilter: typeFilter.value,
    searchByTitle: searchByTitle.value,
    searchByContent: searchByContent.value,
    page: 0
  }
  emits('updateValue', searchParams)
}

</script>

<template>
  <div class="searchDiv">
    <div class="searchRow">
      <input type="text" id="searchInput" @change="sendValue" v-model="keyword" placeholder="请输入...">
      <button @click="sendValue">搜索</button>
    </div>
    <div class="searchRow">
      <div class="flowLeft">
        <input type="checkbox" id="searchInTitle" checked v-model="searchByTitle">
        <label for="searchInTitle">标题</label>
        <input type="checkbox" id="searchInContent" unchecked v-model="searchByContent">
        <label for="searchInContent">内容</label>
      </div>
    </div>
    <div class="searchRow">
      <div class="flowRight">
        <label for="sortBy">排序:</label>
        <select id="sortBy" v-model="sortByText">
          <option>日期</option>
          <option>文件名</option>
          <option>标题</option>
        </select>
        <input type="radio" id="sortAscending" name="sortOrder" value="asc" checked v-model="sortOrder">
        <label for="sortAscending">升序</label>
        <input type="radio" id="sortDescending" name="sortOrder" value="desc" v-model="sortOrder">
        <label for="sortDescending">降序</label>
      </div>
    </div>
    <div class="searchRow">
      <details id="filterByDate">
        <summary>日期过滤：</summary>
        From：&emsp;<input type="date" id="dateFrom" v-model="dateFrom">
        <br>
        To：&emsp;<input type="date" id="dateTo" v-model="dateTo">
      </details>
    </div>
    <div class="searchRow">
      <details id="typeFilter">
        <summary>类型过滤:</summary>
        <label v-for="type in props.typeList" :key="type">
          <input type="checkbox" :id="type" v-model="typeFilter" :value="type">
          <label :for="type">{{ type }}</label>
        </label>
      </details>
    </div>
  </div>
</template>

<style scoped>
.searchDiv {
  width: 75vw;
  max-width: 1000px;
  margin: auto;
  margin-bottom: 10px;
  margin-top: 10px;
  padding: 20px;
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background-color: #f9f9f9;
}

.searchRow {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  margin-bottom: 5px;
}

.searchRow label {
  margin-right: 10px;
}

.searchRow .flowLeft {
  float: left;
}

.searchRow .flowRight {
  float: right;
  margin-right: 0;
  margin-left: auto;
}

.searchRow input[type="text"],
.searchRow select {
  flex: 1;
  padding: 8px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.searchRow input[type="date"] {
  flex: 1;
  padding: 0px;
  margin-right: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.searchRow input[type="checkbox"],
.searchRow input[type="radio"] {
  margin-right: 5px;
}

.searchRow button {
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  background-color: #007bff;
  color: white;
  cursor: pointer;
}

.searchRow button:hover {
  background-color: #0056b3;
}

details {
  border: 1px solid #aaa;
  border-radius: 4px;
  padding: 0.5em 0.5em 0;
  margin-right: 15px;
}

summary {
  font-weight: bold;
  margin: -0.5em -0.5em 0;
  padding: 0.5em;
}

details[open] {
  padding: 0.5em;
}

details[open] summary {
  border-bottom: 1px solid #aaa;
  margin-bottom: 0.5em;
}

#dateFrom #dateTo {
  height: auto;
}
</style>