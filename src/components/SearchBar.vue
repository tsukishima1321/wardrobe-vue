<script setup lang="ts">
import { ref, defineEmits, computed, watchEffect } from 'vue';
import { ElInput, ElButton, ElCheckbox, ElSelect, ElOption, ElRadio, ElRadioGroup, ElDatePicker, ElCollapse, ElCollapseItem, ElCheckboxGroup, ElCard, ElTag } from 'element-plus';
import { Search } from '@element-plus/icons-vue';

type PropItem = { name: string; value: string };

const props = defineProps({
  searchword: {
    type: String,
    default: ''
  },
  keywordsHint: {
    type: Array<string>,
    default: []
  },
  propertiesHint: {
    type: Array<string>,
    default: []
  }
});

export interface SearchParams {
  searchword: string;
  sortBy: string;
  sortOrder: string;
  dateFrom: string;
  dateTo: string;
  searchByTitle: boolean;
  searchByContent: boolean;
  page: number;
  keywords?: Array<string>;
  properties?: Array<PropItem>;
}

const searchword = ref(props.searchword);
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
const sortOrder = ref('降序');
const dateFrom = ref('');
const dateTo = ref('');
const searchByTitle = ref(true);
const searchByContent = ref(false);
const properties = ref<Array<PropItem>>([]);
const keywords = ref<Array<string>>([]);
const propertyName = ref('');
const propertyValue = ref('');


const emits = defineEmits<{
  updateValue: [params: SearchParams]
}>();

function sendValue() {
  const searchParams: SearchParams = {
    searchword: searchword.value,
    sortBy: sortBy.value,
    sortOrder: sortOrder.value,
    dateFrom: dateFrom.value,
    dateTo: dateTo.value,
    searchByTitle: searchByTitle.value,
    searchByContent: searchByContent.value,
    page: 0,
    keywords: keywords.value,
    properties: properties.value
  }
  emits('updateValue', searchParams)
}

function addProperty() {
  const name = (propertyName.value || '').toString().trim();
  const value = (propertyValue.value || '').toString().trim();
  if (!name || !value) {
    return;
  }
  const idx = properties.value.findIndex(p => p.name === name);
  if (idx >= 0) {
    // replace existing value
    properties.value[idx].value = value;
  } else {
    properties.value.push({ name, value });
  }
  propertyName.value = '';
  propertyValue.value = '';
}

function removeProperty(index: number) {
  properties.value.splice(index, 1);
}

</script>

<template>
  <ElCard class="search-card" shadow="hover">
    <!-- 搜索输入框 -->
    <div class="search-row">
      <ElInput v-model="searchword" placeholder="请输入..." @change="sendValue" @keyup.enter="sendValue"
        style="flex: 1; margin-right: 10px;" />
      <ElButton type="primary" :icon="Search" @click="sendValue">
        搜索
      </ElButton>
    </div>

    <!-- 搜索范围选择 -->
    <div class="search-row">
      <div class="checkbox-group">
        <el-checkbox-button v-model="searchByTitle" label="标题" />
        <el-checkbox-button v-model="searchByContent" label="内容" />
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
        <el-segmented v-model="sortOrder" :options="['升序', '降序']" size="large" />
      </div>
    </div>

    <!-- 日期过滤 -->
    <div class="search-row">
      <ElCollapse>
        <ElCollapseItem title="日期过滤" name="date">
          <div class="date-filter">
            <div style="margin-bottom: 10px;">
              <span style="margin-right: 10px;">From:</span>
              <ElDatePicker v-model="dateFrom" type="date" placeholder="选择开始日期" format="YYYY-MM-DD"
                value-format="YYYY-MM-DD" />
            </div>
            <div>
              <span style="margin-right: 10px;padding-right: 16px;">To:</span>
              <ElDatePicker v-model="dateTo" type="date" placeholder="选择结束日期" format="YYYY-MM-DD"
                value-format="YYYY-MM-DD" />
            </div>
          </div>
        </ElCollapseItem>
      </ElCollapse>
    </div>

    <!-- 关键词与属性过滤 -->
    <div class="search-row">
      <ElCollapse>
        <ElCollapseItem title="关键词与属性" name="filters">
          <div class="filters-section">
            <!-- 关键词：可选提示或手动输入 -->
            <div class="keywords-row" style="display:flex; align-items:center; gap:10px;">
              <span class="sort-label">关键词:</span>
              <ElSelect v-model="keywords" multiple filterable allow-create placeholder="选择或输入关键词"
                style="flex: 3; min-width: 200px;">
                <ElOption v-for="k in props.keywordsHint" :key="k" :label="k" :value="k" />
              </ElSelect>
            </div>

            <!-- 属性：选择属性名（可新建） + 输入属性值 -->
            <div class="properties-row" style="display:flex; align-items:center; gap:10px; margin-top:12px;">
              <span class="sort-label">属性:</span>
              <ElSelect v-model="propertyName" filterable allow-create placeholder="选择或输入属性名"
                style="width:220px;">
                <ElOption v-for="p in props.propertiesHint" :key="p" :label="p" :value="p" />
              </ElSelect>
              <ElInput v-model="propertyValue" placeholder="属性值" style="width:220px;" />
              <ElButton type="primary" @click="addProperty">添加属性</ElButton>
            </div>

            <!-- 已添加的属性展示 -->
            <div class="properties-list" style="margin-top:12px; display:flex; gap:8px; flex-wrap:wrap;">
              <ElTag v-for="(prop, idx) in properties" :key="prop.name + '-' + idx" closable @close="removeProperty(idx)">
                {{ prop.name }}: {{ prop.value }}
              </ElTag>
            </div>
          </div>
        </ElCollapseItem>
      </ElCollapse>
    </div>
  </ElCard>
</template>

<style scoped>
.search-card {
  height: fit-content;
  width: 60vw;
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
  margin-top: 5px;
  display: flex;
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

/* 响应式设计 */
@media (max-width: 768px) {
  .search-card {
    width: 90vw;
  }

  .sort-section {
    margin-left: 0;
    margin-bottom: 5px;
  }

  .search-row {
    margin-bottom: 10px;
    flex-direction: column;
    align-items: flex-start;
  }

  .search-row:first-child {
    flex-direction: row;
  }
}
</style>