<script setup lang="ts">
import { ref, defineEmits, computed, watchEffect } from 'vue';
import { ElInput, ElButton, ElCheckbox, ElSelect, ElOption, ElRadio, ElRadioGroup, ElDatePicker, ElCollapse, ElCollapseItem, ElCheckboxGroup, ElCard } from 'element-plus';
import { Search } from '@element-plus/icons-vue';

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
  return 'date';
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

const emits = defineEmits<{
  updateValue: [params: SearchParams]
}>();

function sendValue() {
  const searchParams:SearchParams = {
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
  <ElCard class="search-card" shadow="hover">
    <!-- 搜索输入框 -->
    <div class="search-row">
      <ElInput
        v-model="keyword"
        placeholder="请输入..."
        @change="sendValue"
        @keyup.enter="sendValue"
        style="flex: 1; margin-right: 10px;"
      />
      <ElButton type="primary" :icon="Search" @click="sendValue">
        搜索
      </ElButton>
    </div>

    <!-- 搜索范围选择 -->
    <div class="search-row">
      <div class="checkbox-group">
        <ElCheckbox v-model="searchByTitle" label="标题" />
        <ElCheckbox v-model="searchByContent" label="内容" />
      </div>
    </div>

    <!-- 排序选项 -->
    <div class="search-row">
      <div class="sort-section">
        <span class="sort-label">排序:</span>
        <ElSelect v-model="sortByText" style="width: 100px; margin-right: 10px;">
          <ElOption label="日期" value="日期" />
          <ElOption label="文件名" value="文件名" />
          <ElOption label="标题" value="标题" />
        </ElSelect>
        <ElRadioGroup v-model="sortOrder">
          <ElRadio value="asc">升序</ElRadio>
          <ElRadio value="desc">降序</ElRadio>
        </ElRadioGroup>
      </div>
    </div>

    <!-- 日期过滤 -->
    <div class="search-row">
      <ElCollapse>
        <ElCollapseItem title="日期过滤" name="date">
          <div class="date-filter">
            <div style="margin-bottom: 10px;">
              <span style="margin-right: 10px;">From:</span>
              <ElDatePicker
                v-model="dateFrom"
                type="date"
                placeholder="选择开始日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </div>
            <div>
              <span style="margin-right: 10px;padding-right: 16px;">To:</span>
              <ElDatePicker
                v-model="dateTo"
                type="date"
                placeholder="选择结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
              />
            </div>
          </div>
        </ElCollapseItem>
      </ElCollapse>
    </div>

    <!-- 类型过滤 -->
    <div class="search-row">
      <ElCollapse>
        <ElCollapseItem title="类型过滤" name="type">
          <ElCheckboxGroup v-model="typeFilter" class="type-filter">
            <ElCheckbox 
              v-for="type in props.typeList" 
              :key="type" 
              :value="type"
              :label="type"
            />
          </ElCheckboxGroup>
        </ElCollapseItem>
      </ElCollapse>
    </div>
  </ElCard>
</template>

<style scoped>
.search-card {
  width: 90vw;
  margin: 10px auto;
}

.search-row {
  margin-left: auto;
  margin-right: auto;
  max-width: 800px;
  display: flex;
  align-items: center;
  margin-bottom: 0px;
  flex-wrap: wrap;
}

.checkbox-group {
  display: flex;
  gap: 15px;
}

.sort-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

.sort-label {
  font-weight: 500;
  color: #606266;
}

.date-filter {
  padding: 10px 0;
}

.type-filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .search-card {
    width: 95vw;
  }
  
  .sort-section {
    margin-left: 0;
    margin-bottom: 5px;
  }
  
  .search-row {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .search-row:first-child {
    flex-direction: row;
  }
}
</style>