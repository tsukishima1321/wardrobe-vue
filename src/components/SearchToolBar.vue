<script setup lang="ts">
import { ref } from 'vue'
import { Check, Delete, Download, FolderAdd } from '@element-plus/icons-vue'

// 定义emits
const emits = defineEmits<{
    selectAll: [],
    selectNone: [],
    delete: [],
    download: [],
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

            <el-switch v-model="isPictureMode" style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949"
                active-text="图片" inactive-text="表格" @change="changeMode" />
        </el-space>

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