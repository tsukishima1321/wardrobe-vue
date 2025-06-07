<script setup lang="ts">
import { ref } from 'vue'
import { Check, Delete, Download, FolderAdd } from '@element-plus/icons-vue'

const props = defineProps({
    typeList: {
        type: Array<string>,
        default: []
    }
});

// 定义emits
const emits = defineEmits<{
    selectAll: [],
    selectNone: [],
    delete: [],
    download: [],
    moveCategory: [typename: string],
    switchMode: [isPictureMode: boolean]
}>();

// 全选状态
const isAllSelected = ref(false)
// 移动分类对话框显示状态
const showMoveCategoryDialog = ref(false)
// 选中的分类
const selectedCategory = ref('')

const isPictureMode = ref<boolean>(true)

// 切换全选状态
const toggleSelectAll = () => {
    isAllSelected.value = !isAllSelected.value
    if (isAllSelected.value) {
        emits('selectAll')
    } else {
        emits('selectNone')
    }
}

// 删除操作
const handleDelete = () => {
    emits('delete')
}

// 下载操作
const handleDownload = () => {
    emits('download')
}

// 显示移动分类对话框
const showMoveCategory = () => {
    selectedCategory.value = ''
    showMoveCategoryDialog.value = true
}

// 确认移动分类
const confirmMoveCategory = () => {
    if (selectedCategory.value) {
        emits('moveCategory', selectedCategory.value)
        showMoveCategoryDialog.value = false
    }
}

const changeMode = (mode: boolean) => {
    emits('switchMode', mode);
}
</script>

<template>
    <el-card class="search-toolbar">
        <el-space :size="16" wrap>
            <!-- 删除按钮 -->
            <el-button type="danger" :icon="Delete" @click="handleDelete">
                删除
            </el-button>

            <!-- 下载按钮 -->
            <el-button type="success" :icon="Download" @click="handleDownload">
                下载
            </el-button>

            <!-- 移动分类按钮 -->
            <el-button type="warning" :icon="FolderAdd" @click="showMoveCategory">
                分类
            </el-button>
            <el-switch v-model="isPictureMode" style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                active-text="图片" inactive-text="表格" @change="changeMode" />
        </el-space>

        <!-- 移动分类对话框 -->
        <el-dialog v-model="showMoveCategoryDialog" title="选择新分类" width="400px"
            :before-close="() => showMoveCategoryDialog = false">
            <el-form label-width="80px">
                <el-form-item label="分类：">
                    <el-select v-model="selectedCategory" placeholder="请选择分类" style="width: 100%">
                        <el-option v-for="type in typeList" :key="type" :label="type" :value="type" />
                    </el-select>
                </el-form-item>
            </el-form>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="showMoveCategoryDialog = false">取消</el-button>
                    <el-button type="primary" @click="confirmMoveCategory" :disabled="!selectedCategory">
                        确定
                    </el-button>
                </span>
            </template>
        </el-dialog>
    </el-card>
</template>

<style scoped>
@media (min-width: 768px) {
    .el-space {
        flex-direction: column;
    }

    .search-toolbar {
        height: 239px;
        margin: 10px auto;
        margin-left: 10px;
    }
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

@media (max-width: 768px) {
    .search-toolbar {
        width: 90vw;
        margin-bottom: 20px;
    }

    .el-space {
        margin-left: auto;
        flex-direction: row;
    }
}
</style>