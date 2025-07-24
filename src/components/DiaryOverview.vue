<template>
  <div class="diary-overview">
    <!-- 顶部搜索栏 -->
    <el-card class="search-card" shadow="never">
      <div class="search-container">
        <div class="search-row">
          <div class="search-input-group">
            <el-input v-model="searchKey" placeholder="搜索日记内容..." :prefix-icon="Search" clearable
              @keyup.enter="handleSearch" class="search-input-main" />
            <el-date-picker v-model="dateFrom" type="date" placeholder="开始日期" format="YYYY-MM-DD"
              value-format="YYYY-MM-DD" class="date-picker" />
            <el-date-picker v-model="dateTo" type="date" placeholder="结束日期" format="YYYY-MM-DD"
              value-format="YYYY-MM-DD" class="date-picker" />
          </div>
          <div class="search-buttons">
            <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
            <el-button @click="clearSearch" plain>清空</el-button>
          </div>
        </div>
      </div>
      <div class="toolbar">
        <el-button type="primary" @click="showNewDiaryDialog" :icon="Plus">新建日记</el-button>
        <div class="toolbar-right">
          <el-select v-model="orderBy" placeholder="排序字段" class="sort-select">
            <el-option label="日期" value="date" />
          </el-select>
          <el-select v-model="order" placeholder="排序" class="order-select">
            <el-option label="降序" value="desc" />
            <el-option label="升序" value="asc" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 日记列表 -->
    <div class="diary-list-container">
      <el-empty v-if="textList.length === 0 && !loading" description="暂无日记" />

      <div v-else class="diary-list">
        <el-card v-for="diary in textList" :key="diary.id" class="diary-item" shadow="hover" @click="viewDiary(diary)">
          <div class="diary-header">
            <div class="diary-date">{{ formatDate(diary.date) }}</div>
            <div class="diary-actions">
              <el-button type="primary" text :icon="Edit" @click.stop="editDiary(diary)" size="small">
                编辑
              </el-button>
              <el-button type="danger" text :icon="Delete" @click.stop="deleteDiary(diary)" size="small">
                删除
              </el-button>
            </div>
          </div>
          <div class="diary-content">
            <p class="diary-preview">{{ getPreviewText(diary.text) }}</p>
          </div>
        </el-card>
      </div>
    </div>
    <Pagination @pageChanged="pageChanged" :maxPage="totalPage" />

    <!-- 新建/编辑日记对话框 -->
    <el-dialog v-model="diaryDialogVisible" :title="isEditing ? '编辑日记' : '新建日记'" width="90%" :max-width="800"
      @close="closeDiaryDialog">
      <el-form :model="diaryForm" label-width="80px">
        <el-form-item label="日期" required>
          <el-date-picker v-model="diaryForm.date" type="date" placeholder="选择日期" format="YYYY-MM-DD"
            value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="内容" required>
          <el-input v-model="diaryForm.text" type="textarea" :rows="10" placeholder="写下今天的记录..." maxlength="5000"
            show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDiaryDialog">取消</el-button>
          <el-button type="primary" @click="saveDiary" :loading="saving">
            {{ isEditing ? "保存" : "创建" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 日记详情对话框 -->
    <el-dialog v-model="viewDialogVisible" title="日记详情" width="90%" :max-width="800">
      <div v-if="selectedDiary" class="diary-detail">
        <div class="detail-header">
          <h3>{{ formatDate(selectedDiary.date) }}</h3>
        </div>
        <div class="detail-content">
          <p>{{ selectedDiary.text }}</p>
        </div>
      </div>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="viewDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="editDiary(selectedDiary)">编辑</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { fetchDataAutoRetry } from "@/token";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox, ElLoading } from "element-plus";
import { Search, Plus, Edit, Delete } from "@element-plus/icons-vue";
import Pagination from "./Pagination.vue";

const router = useRouter();

// 搜索相关
const searchKey = ref("");
const dateFrom = ref("");
const dateTo = ref("");
const orderBy = ref("date");
const order = ref("desc");
const pageSize = ref(20);
const currentPage = ref(1);
const totalPage = ref(0);
const loading = ref(false);

// 日记列表
interface DiaryItem {
  id: number;
  date: string;
  text: string;
}

const textList = ref<DiaryItem[]>([]);

// 对话框相关
const diaryDialogVisible = ref(false);
const viewDialogVisible = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const selectedDiary = ref<DiaryItem | null>(null);

// 表单数据
const diaryForm = ref({
  id: 0,
  date: new Date().toISOString().split("T")[0],
  text: "",
});

// 搜索日记
const searchDiaries = async () => {
  loading.value = true;
  try {
    const params = {
      searchKey: searchKey.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value,
      orderBy: orderBy.value,
      order: order.value,
      pageSize: pageSize.value,
      page: currentPage.value,
    };

    const response = (await fetchDataAutoRetry("/api/diary/search/", params, "POST")) as {
      totalPage: number;
      textList: DiaryItem[];
    };

    textList.value = response.textList;
    totalPage.value = response.totalPage;
  } catch (error) {
    console.error("搜索日记失败:", error);
    ElMessage.error("搜索日记失败，请重试");
    router.push("/login");
  } finally {
    loading.value = false;
  }
};

// 处理搜索
const handleSearch = () => {
  currentPage.value = 1;
  searchDiaries();
};

// 清空搜索
const clearSearch = () => {
  searchKey.value = "";
  dateFrom.value = "";
  dateTo.value = "";
  currentPage.value = 1;
  searchDiaries();
};

// 分页处理
const pageChanged = (page: number) => {
  currentPage.value = page;
  searchDiaries();
};

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
};

// 获取预览文本
const getPreviewText = (text: string) => {
  return text.length > 150 ? text.substring(0, 150) + "..." : text;
};

// 查看日记详情
const viewDiary = (diary: DiaryItem) => {
  selectedDiary.value = diary;
  viewDialogVisible.value = true;
};

// 显示新建日记对话框
const showNewDiaryDialog = () => {
  isEditing.value = false;
  diaryForm.value = {
    id: 0,
    date: new Date().toISOString().split("T")[0],
    text: "",
  };
  diaryDialogVisible.value = true;
};

// 编辑日记
const editDiary = (diary: DiaryItem | null) => {
  if (!diary) return;

  isEditing.value = true;
  diaryForm.value = {
    id: diary.id,
    date: diary.date,
    text: diary.text,
  };
  viewDialogVisible.value = false;
  diaryDialogVisible.value = true;
};

// 保存日记
const saveDiary = async () => {
  if (!diaryForm.value.date || !diaryForm.value.text.trim()) {
    ElMessage.warning("请填写完整的日记信息");
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value) {
      // 编辑日记
      await fetchDataAutoRetry(
        "/api/diary/edit/",
        {
          id: diaryForm.value.id,
          date: diaryForm.value.date,
          text: diaryForm.value.text,
        },
        "POST"
      );
      ElMessage.success("日记更新成功");
    } else {
      // 新建日记
      await fetchDataAutoRetry(
        "/api/diary/new/",
        {
          date: diaryForm.value.date,
          text: diaryForm.value.text,
        },
        "POST"
      );
      ElMessage.success("日记创建成功");
    }

    closeDiaryDialog();
    searchDiaries(); // 刷新列表
  } catch (error) {
    console.error("保存日记失败:", error);
    ElMessage.error("保存日记失败，请重试");
    router.push("/login");
  } finally {
    saving.value = false;
  }
};

// 删除日记
const deleteDiary = (diary: DiaryItem) => {
  ElMessageBox.confirm("确认删除这篇日记吗？删除后不可恢复。", "确认删除", {
    confirmButtonText: "确定",
    cancelButtonText: "取消",
    type: "warning",
  })
    .then(async () => {
      try {
        await fetchDataAutoRetry(
          "/api/diary/delete/",
          {
            id: diary.id,
          },
          "POST"
        );
        ElMessage.success("日记删除成功");
        searchDiaries(); // 刷新列表
      } catch (error) {
        console.error("删除日记失败:", error);
        ElMessage.error("删除日记失败，请重试");
        router.push("/login");
      }
    })
    .catch(() => {
      // 用户取消
    });
};

// 关闭对话框
const closeDiaryDialog = () => {
  diaryDialogVisible.value = false;
  diaryForm.value = {
    id: 0,
    date: new Date().toISOString().split("T")[0],
    text: "",
  };
};

// 初始化
onMounted(() => {
  searchDiaries();
});
</script>

<style scoped>
.diary-overview {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  width: 100%;
  height: auto;
  min-height: 100vh;
  margin-left: auto;
  margin-right: auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.search-card {
  width: 90%;
  margin-top: 10px;
  margin-bottom: 20px;
  border-radius: 12px;
}

.search-container {
  margin-bottom: 15px;
}

.search-row {
  display: flex;
  align-items: flex-end;
  gap: 15px;
  flex-wrap: wrap;
}

.search-input-group {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 300px;
  flex-wrap: wrap;
}

.search-input-main {
  flex: 1;
  min-width: 200px;
}

.date-picker {
  width: 140px;
  flex-shrink: 0;
}

.search-buttons {
  display: flex;
  gap: 10px;
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  padding-top: 15px;
  border-top: 1px solid #ebeef5;
}

.toolbar-right {
  display: flex;
  gap: 10px;
  align-items: center;
}

.sort-select {
  width: 120px;
}

.order-select {
  width: 100px;
}

.diary-list-container {
  max-width: 1600px;
  margin: 0 auto;
}

.diary-list {
  display: grid;
  gap: 20px;
  margin-bottom: 30px;
}

.diary-item {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.diary-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.diary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #ebeef5;
}

.diary-date {
  font-weight: 600;
  color: #409eff;
  font-size: 16px;
}

.diary-actions {
  display: flex;
  gap: 5px;
}

.diary-content {
  line-height: 1.6;
}

.diary-preview {
  color: #606266;
  margin: 0;
  white-space: pre-wrap;
}

.diary-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-header h3 {
  color: #409eff;
  margin: 0 0 20px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #ebeef5;
}

.detail-content {
  line-height: 1.8;
  font-size: 16px;
}

.detail-content p {
  margin: 0;
  white-space: pre-wrap;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 手机竖屏适配 */
@media (max-width: 768px) {
  .diary-overview {
    padding: 10px;
  }

  .search-card {
    width: 95%;
  }

  .search-row {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .search-input-group {
    flex-direction: column;
    gap: 12px;
    min-width: auto;
  }

  .search-input-main {
    min-width: auto;
  }

  .date-picker {
    width: 100%;
  }

  .search-buttons {
    justify-content: center;
    width: 100%;
  }

  .search-buttons .el-button {
    flex: 1;
    max-width: 120px;
  }

  .toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 15px;
  }

  .toolbar-right {
    justify-content: center;
    gap: 15px;
  }

  .sort-select,
  .order-select {
    width: 140px;
  }

  .diary-list {
    grid-template-columns: 1fr;
  }

  .diary-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .diary-actions {
    align-self: flex-end;
  }

  .diary-date {
    font-size: 14px;
  }

  .diary-preview {
    font-size: 14px;
  }
}

@media (min-width: 769px) and (max-width: 1024px) {
  .search-input-group {
    flex-wrap: nowrap;
  }

  .date-picker {
    width: 130px;
  }

  .diary-list {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  }
}

@media (min-width: 769px) {
  .diary-list {
    grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  }

  .search-buttons .el-button {
    min-width: 80px;
  }
}

@media (min-width: 1200px) {
  .diary-list {
    grid-template-columns: repeat(auto-fill, minmax(500px, 1fr));
  }

  .search-input-group {
    max-width: 70%;
  }
}
</style>
