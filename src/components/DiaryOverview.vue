<template>
  <div class="diary-overview">
    <!-- Mobile Filter Drawer -->
    <el-drawer v-model="showMobileFilter" title="Filters" direction="ltr" size="80%" class="mobile-filter-drawer">
      <DiaryFilterPanel v-model="searchParams" @search="handleSearch" />
    </el-drawer>

    <div class="main-container">
      <!-- Desktop Sidebar -->
      <div class="sidebar">
        <DiaryFilterPanel v-model="searchParams" @search="handleSearch" />
      </div>

      <!-- Main Content -->
      <div class="content">
        <DiaryResultsHeader :search-key="searchParams.searchKey" :order-by="searchParams.orderBy"
          :order="searchParams.order" :total="totalItems" @update:search-key="val => searchParams.searchKey = val"
          @update:order-by="val => searchParams.orderBy = val" @update:order="val => searchParams.order = val"
          @search="handleSearch" @new-diary="showNewDiaryDialog" @open-mobile-filter="showMobileFilter = true" />

        <div class="results-area" ref="resultsArea">
          <el-empty v-if="textList.length === 0 && !loading" description="No diaries found" />

          <div v-else class="diary-list">
            <el-card v-for="diary in textList" :key="diary.id" class="diary-item" shadow="hover"
              @click="viewDiary(diary)">
              <div class="diary-header">
                <div class="diary-date">{{ formatDate(diary.date) }}</div>
                <div class="diary-actions">
                  <el-button type="primary" text :icon="Edit" @click.stop="editDiary(diary)" size="small">
                    Edit
                  </el-button>
                  <el-button type="danger" text :icon="Delete" @click.stop="deleteDiary(diary)" size="small">
                    Delete
                  </el-button>
                </div>
              </div>
              <div class="diary-content">
                <p class="diary-preview">{{ getPreviewText(diary.text) }}</p>
              </div>
            </el-card>
          </div>

          <div class="pagination-wrapper" v-if="textList.length > 0">
            <Pagination @pageChanged="pageChanged" :maxPage="totalPage" />
          </div>
        </div>
      </div>
    </div>

    <!-- New/Edit Diary Dialog -->
    <el-dialog v-model="diaryDialogVisible" :title="isEditing ? 'Edit Diary' : 'New Diary'" width="90%" :max-width="800"
      @close="closeDiaryDialog">
      <el-form :model="diaryForm" label-width="80px">
        <el-form-item label="Date" required>
          <el-date-picker v-model="diaryForm.date" type="date" placeholder="Select Date" format="YYYY-MM-DD"
            value-format="YYYY-MM-DD" style="width: 100%" />
        </el-form-item>
        <el-form-item label="Content" required>
          <el-input v-model="diaryForm.text" type="textarea" :rows="10" placeholder="Write something..."
            maxlength="5000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="closeDiaryDialog">Cancel</el-button>
          <el-button type="primary" @click="saveDiary" :loading="saving">
            {{ isEditing ? "Save" : "Create" }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- View Diary Dialog -->
    <el-dialog v-model="viewDialogVisible" title="Diary Detail" width="90%" :max-width="800">
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
          <el-button @click="viewDialogVisible = false">Close</el-button>
          <el-button type="primary" @click="editDiary(selectedDiary)">Edit</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from "vue";
import { fetchDataAutoRetry } from "@/token";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import { Edit, Delete } from "@element-plus/icons-vue";
import Pagination from "./Pagination.vue";
import DiaryFilterPanel, { type DiarySearchParams } from "./DiaryFilterPanel.vue";
import DiaryResultsHeader from "./DiaryResultsHeader.vue";

const router = useRouter();

// State
const showMobileFilter = ref(false);
const loading = ref(false);
const resultsArea = ref<HTMLElement | null>(null);

// Search Params
const searchParams = ref<DiarySearchParams>({
  searchKey: "",
  dateFrom: "",
  dateTo: "",
  orderBy: "date",
  order: "desc",
  page: 1,
  pageSize: 20,
});

// Diary List
interface DiaryItem {
  id: number;
  date: string;
  text: string;
}

const textList = ref<DiaryItem[]>([]);
const totalPage = ref(0);
const totalItems = ref(0);

// Dialogs
const diaryDialogVisible = ref(false);
const viewDialogVisible = ref(false);
const isEditing = ref(false);
const saving = ref(false);
const selectedDiary = ref<DiaryItem | null>(null);

// Form Data
const diaryForm = ref({
  id: 0,
  date: new Date().toISOString().split("T")[0],
  text: "",
});

// Search Diaries
const searchDiaries = async () => {
  loading.value = true;
  try {
    const response = (await fetchDataAutoRetry("/api/diary/search/", searchParams.value, "POST")) as {
      totalPage: number;
      totalItems: number;
      textList: DiaryItem[];
    };

    textList.value = response.textList;
    totalPage.value = response.totalPage;
    totalItems.value = response.totalItems;

    // Scroll to top of results
    if (resultsArea.value) {
      resultsArea.value.scrollTop = 0;
    }
  } catch (error) {
    console.error("Search failed:", error);
    ElMessage.error("Failed to load diaries");
    router.push("/login");
  } finally {
    loading.value = false;
  }
};

// Handle Search
const handleSearch = () => {
  searchParams.value.page = 1;
  searchDiaries();
  showMobileFilter.value = false;
};

// Pagination
const pageChanged = (page: number) => {
  searchParams.value.page = page;
  searchDiaries();
};

// Format Date
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
};

// Get Preview Text
const getPreviewText = (text: string) => {
  return text.length > 150 ? text.substring(0, 150) + "..." : text;
};

// View Diary
const viewDiary = (diary: DiaryItem) => {
  selectedDiary.value = diary;
  viewDialogVisible.value = true;
};

// Show New Diary Dialog
const showNewDiaryDialog = () => {
  isEditing.value = false;
  diaryForm.value = {
    id: 0,
    date: new Date().toISOString().split("T")[0],
    text: "",
  };
  diaryDialogVisible.value = true;
};

// Close Diary Dialog
const closeDiaryDialog = () => {
  diaryDialogVisible.value = false;
};

// Edit Diary
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

// Save Diary
const saveDiary = async () => {
  if (!diaryForm.value.date || !diaryForm.value.text.trim()) {
    ElMessage.warning("Please fill in all fields");
    return;
  }

  saving.value = true;
  try {
    if (isEditing.value) {
      await fetchDataAutoRetry(
        "/api/diary/edit/",
        {
          id: diaryForm.value.id,
          date: diaryForm.value.date,
          text: diaryForm.value.text,
        },
        "POST"
      );
      ElMessage.success("Diary updated");
    } else {
      await fetchDataAutoRetry(
        "/api/diary/new/",
        {
          date: diaryForm.value.date,
          text: diaryForm.value.text,
        },
        "POST"
      );
      ElMessage.success("Diary created");
    }

    closeDiaryDialog();
    searchDiaries();
  } catch (error) {
    console.error("Save failed:", error);
    ElMessage.error("Failed to save diary");
    router.push("/login");
  } finally {
    saving.value = false;
  }
};

// Delete Diary
const deleteDiary = (diary: DiaryItem) => {
  ElMessageBox.confirm("Are you sure you want to delete this diary?", "Confirm Delete", {
    confirmButtonText: "Delete",
    cancelButtonText: "Cancel",
    type: "warning",
  })
    .then(async () => {
      try {
        await fetchDataAutoRetry(
          "/api/diary/delete/",
          { id: diary.id },
          "POST"
        );
        ElMessage.success("Diary deleted");
        searchDiaries();
      } catch (error) {
        console.error("Delete failed:", error);
        ElMessage.error("Failed to delete diary");
      }
    })
    .catch(() => { });
};

onMounted(() => {
  searchDiaries();
});
</script>

<style scoped>
.diary-overview {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  overflow: hidden;
}

.main-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  position: relative;
}

.sidebar {
  width: 280px;
  background-color: white;
  border-right: 1px solid #e0e0e0;
  display: flex;
  flex-direction: column;
  z-index: 10;
  flex-shrink: 0;
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 20px;
  /* Prevent flex item from overflowing */
  position: relative;
}

.results-area {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
}

.diary-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.diary-item {
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
  border-radius: 12px;
  background: white;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

.diary-item:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.diary-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.diary-date {
  font-weight: 600;
  color: #2c3e50;
  font-size: 1.1em;
}

.diary-content {
  color: #606266;
  line-height: 1.6;
  font-size: 0.95em;
}

.diary-preview {
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 4;
  line-clamp: 4;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding-bottom: 20px;
}

.diary-detail {
  padding: 10px;
}

.detail-header {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.detail-header h3 {
  margin: 0;
  color: #303133;
}

.detail-content {
  line-height: 1.8;
  color: #606266;
  font-size: 1.1em;
  white-space: pre-wrap;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .sidebar {
    display: none;
  }

  .diary-list {
    grid-template-columns: 1fr;
  }

  .results-area {
    padding: 12px;
  }
}
</style>
