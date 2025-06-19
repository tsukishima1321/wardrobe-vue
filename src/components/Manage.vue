<script setup lang="ts">
import { fetchDataAutoRetry, GetBlobImgSrc } from "@/token";
import { useRouter } from "vue-router";
import {
    Memo,
    Box,
    Expand,
    Fold,
} from '@element-plus/icons-vue'
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter();

const activeIndex = ref('1');
const isMenuCollapsed = ref(false);

const handleSelect = (key: string, keyPath: string[]) => {
    activeIndex.value = key;
    if (activeIndex.value === '2') {
        // 切换到OCR任务时，加载任务列表
        fetchOcrMissionList();
    }
}

// 切换菜单折叠状态
const toggleMenuCollapse = () => {
    isMenuCollapsed.value = !isMenuCollapsed.value;
}

interface typeRow {
    type: string
}

const typeList = ref<Array<typeRow>>([]);
const currentTypeRow = ref<typeRow>({ type: 'null' });
const ocrMissionList = ref<Array<{ src: string, status: string }>>([]);
const currentOcrRow = ref<{ src: string, status: string }>({ src: 'null', status: '' });

// 对话框状态
const newTypeDialogVisible = ref(false);
const renameTypeDialogVisible = ref(false);
const deleteTypeDialogVisible = ref(false);

// 表单数据
const newTypeName = ref('');
const renameTypeName = ref('');
const replaceTypeName = ref('');

const refreshTypeList = () => {
    fetchDataAutoRetry('/api/types/', {}, 'GET').then((res) => {
        typeList.value = [];
        const array = res as Array<string>;
        for (const item of array) {
            typeList.value.push({ type: item });
        }
    }).catch(() => {
        router.push('/login');
    });
}

refreshTypeList();

const fetchOcrMissionList = () => {
    fetchDataAutoRetry('/api/ocrmission/get/', {}, 'GET').then((res) => {
        ocrMissionList.value = res as Array<{ src: string, status: string }>;
    }).catch(() => {
        router.push('/login');
    });
}

const resetOcr = () => {
    if (currentOcrRow.value.src === '') {
        ElMessage.warning('请先选择一个OCR任务');
        return;
    }

    ElMessageBox.confirm('确认重置该OCR任务吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(async () => {
        try {
            await fetchDataAutoRetry('/api/ocrmission/reset/', { src: currentOcrRow.value.src }, 'POST');
            ElMessage.success('OCR任务重置成功');
            fetchOcrMissionList();
        } catch (error) {
            ElMessage.error('OCR任务重置失败');
        }
    }).catch(() => {
        // 用户取消操作
    });
}

const performOcr = () => {
    if (currentOcrRow.value.src === '') {
        ElMessage.warning('请先选择一个OCR任务');
        return;
    }
    if (currentOcrRow.value.status !== 'waiting') {
        ElMessage.warning('当前OCR任务状态不允许执行');
        return;
    }

    ElMessageBox.confirm('确认执行OCR任务吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(async () => {
        try {
            await fetchDataAutoRetry('/api/ocrmission/execute/', { src: currentOcrRow.value.src }, 'POST');
            ElMessage.success('OCR任务已列队');
            fetchOcrMissionList();
        } catch (error) {
            ElMessage.error('OCR任务执行失败');
        }
    }).catch(() => {
        // 用户取消操作
    });
}

const performAllOcr = () => {
    ElMessageBox.confirm('确认执行所有OCR任务吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(async () => {
        currentOcrRow.value = { src: 'null', status: '' }
        try {
            await fetchDataAutoRetry('/api/ocrmission/executeall/', {}, 'POST');
            ElMessage.success('所有OCR任务已列队');
            fetchOcrMissionList();
        } catch (error) {
            ElMessage.error('执行所有OCR任务失败');
        }
    }).catch(() => {
        // 用户取消操作
    });
}

const handleTypeSelectChange = (row: typeRow) => {
    currentTypeRow.value = row;
}

const handleOCRSelectChange = (row: { src: string, status: string }) => {
    currentOcrRow.value = row;
}

// 新建分类
const newType = () => {
    newTypeName.value = '';
    newTypeDialogVisible.value = true;
}

// 确认新建分类
const confirmNewType = async () => {
    if (!newTypeName.value.trim()) {
        ElMessage.warning('请输入分类名称');
        return;
    }

    // 检查分类是否已存在
    if (typeList.value.some(item => item.type === newTypeName.value.trim())) {
        ElMessage.warning('该分类已存在');
        return;
    }

    try {
        await fetchDataAutoRetry('/api/type/new/', {
            typename: newTypeName.value.trim()
        }, 'POST');

        refreshTypeList();
        newTypeDialogVisible.value = false;
        ElMessage.success('新建分类成功');
    } catch (error) {
        ElMessage.error('新建分类失败');
    }
}

// 重命名分类
const renameType = () => {
    renameTypeName.value = currentTypeRow.value.type;
    renameTypeDialogVisible.value = true;
}

// 确认重命名分类
const confirmRenameType = async () => {
    if (!renameTypeName.value.trim()) {
        ElMessage.warning('请输入新的分类名称');
        return;
    }

    if (renameTypeName.value.trim() === currentTypeRow.value.type) {
        ElMessage.warning('新名称与原名称相同');
        return;
    }

    // 检查新分类名是否已存在
    if (typeList.value.some(item => item.type === renameTypeName.value.trim())) {
        ElMessage.warning('该分类名称已存在');
        return;
    }

    try {
        await fetchDataAutoRetry(`/api/type/rename/`, {
            oldName: currentTypeRow.value.type,
            newName: renameTypeName.value.trim()
        }, 'POST');

        refreshTypeList();

        renameTypeDialogVisible.value = false;
        ElMessage.success('重命名成功');
    } catch (error) {
        ElMessage.error('重命名失败');
    }
}

// 删除分类
const deleteType = () => {
    replaceTypeName.value = '';
    deleteTypeDialogVisible.value = true;
}

// 确认删除分类
const confirmDeleteType = async () => {
    if (!replaceTypeName.value) {
        ElMessage.warning('请选择替换分类');
        return;
    }

    if (replaceTypeName.value === currentTypeRow.value.type) {
        ElMessage.warning('替换分类不能与当前分类相同');
        return;
    }

    try {
        await fetchDataAutoRetry(`/api/type/delete/`, {
            typename: currentTypeRow.value.type,
            altType: replaceTypeName.value
        }, 'POST');

        refreshTypeList();

        currentTypeRow.value = { type: 'null' };
        deleteTypeDialogVisible.value = false;
        ElMessage.success('删除分类成功');
    } catch (error) {
        ElMessage.error('删除分类失败');
    }
}

const filterStatus = (value: string, row: { src: string, status: string }) => {
    return row.status === value
}

const handleRowDoubleClidked = (row: { src: string, status: string }) => {
    const src = row.src
    const newWindow = router.resolve('/detail/' + src);
    window.open(newWindow.href, '_blank');
}

// 获取可用的替换分类列表（排除当前选中的分类）
const getAvailableTypes = () => {
    return typeList.value.filter(item => item.type !== currentTypeRow.value.type);
}

</script>

<template> <el-row class="manage">
        <el-col :span="isMenuCollapsed ? 1 : 8">
            <div class="menu-container">
                <!-- 折叠/展开按钮 -->
                <div class="menu-toggle-btn">
                    <el-button :icon="isMenuCollapsed ? Expand : Fold" @click="toggleMenuCollapse" type="primary"
                        text />
                </div>

                <el-menu default-active="1" @select="handleSelect" :collapse="isMenuCollapsed"
                    :collapse-transition="true">
                    <el-menu-item index="0">
                    </el-menu-item>
                    <el-menu-item index="1">
                        <el-icon>
                            <Box />
                        </el-icon>
                        <span>分类管理</span>
                    </el-menu-item>
                    <el-menu-item index="2">
                        <el-icon>
                            <Memo />
                        </el-icon>
                        <span>OCR任务</span>
                    </el-menu-item>
                </el-menu>
            </div>
        </el-col> <el-card v-if="activeIndex === '1'" class="manage-content">
            <h2>分类管理</h2>
            <el-table :data="typeList" highlight-current-row @current-change="handleTypeSelectChange">
                <el-table-column prop="type" label="分类" width="200" />
            </el-table>
            <el-button type="primary" @click="newType">新建</el-button>
            <el-button type="danger" :disabled="currentTypeRow.type == 'null'" @click="deleteType">删除</el-button>
            <el-button type="success" :disabled="currentTypeRow.type == 'null'" @click="renameType">重命名</el-button>
        </el-card>
        <el-card v-else-if="activeIndex === '2'" class="manage-content">
            <h2>OCR任务</h2>
            <el-button type="primary" @click="fetchOcrMissionList">刷新任务列表</el-button>
            <el-scrollbar :height="'calc(100vh - 300px)'">
                <el-table :data="ocrMissionList" @row-dblclick="handleRowDoubleClidked" highlight-current-row
                    @current-change="handleOCRSelectChange">
                    <el-table-column prop="src" label="文件" width="200" />
                    <el-table-column prop="status" label="状态" width="100"
                        :filters="[{ text: '已完成', value: 'finished' }, { text: '进行中', value: 'processing' }, { text: '等待中', value: 'waiting' }]"
                        :filter-method="filterStatus" />

                </el-table>
            </el-scrollbar>
            <el-button type="primary" @click="performAllOcr">执行所有</el-button>
            <el-button type="primary" :disabled="currentOcrRow?.src == 'null'" @click="performOcr">执行所选</el-button>
            <el-button type="success" :disabled="currentOcrRow?.src == 'null'" @click="resetOcr">重置所选</el-button>
        </el-card>

        <!-- 新建分类对话框 -->
        <el-dialog v-model="newTypeDialogVisible" title="新建分类" width="400px"
            :before-close="() => newTypeDialogVisible = false">
            <el-form label-width="90px">
                <el-form-item label="分类名称：">
                    <el-input v-model="newTypeName" placeholder="请输入分类名称" maxlength="50" show-word-limit
                        @keyup.enter="confirmNewType" />
                </el-form-item>
            </el-form>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="newTypeDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="confirmNewType" :disabled="!newTypeName.trim()">
                        确定
                    </el-button>
                </span>
            </template>
        </el-dialog>

        <!-- 重命名分类对话框 -->
        <el-dialog v-model="renameTypeDialogVisible" title="重命名分类" width="400px"
            :before-close="() => renameTypeDialogVisible = false">
            <el-form label-width="90px">
                <el-form-item label="原名称：">
                    <el-input :value="currentTypeRow.type" disabled />
                </el-form-item>
                <el-form-item label="新名称：">
                    <el-input v-model="renameTypeName" placeholder="请输入新的分类名称" maxlength="50" show-word-limit
                        @keyup.enter="confirmRenameType" />
                </el-form-item>
            </el-form>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="renameTypeDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="confirmRenameType"
                        :disabled="!renameTypeName.trim() || renameTypeName.trim() === currentTypeRow.type">
                        确定
                    </el-button>
                </span>
            </template>
        </el-dialog>

        <!-- 删除分类对话框 -->
        <el-dialog v-model="deleteTypeDialogVisible" title="删除分类" width="500px"
            :before-close="() => deleteTypeDialogVisible = false"> <el-alert title="注意" type="warning"
                :description="`删除分类 '${currentTypeRow.type}' 后，该分类下的所有项目将被移动到指定的替换分类中。此操作不可撤销！`" :show-icon="true"
                :closable="false" style="margin-bottom: 20px" />

            <el-form label-width="120px">
                <el-form-item label="要删除的分类：">
                    <el-input :value="currentTypeRow.type" disabled />
                </el-form-item>
                <el-form-item label="替换为分类：" required>
                    <el-select v-model="replaceTypeName" placeholder="请选择替换的分类" style="width: 100%">
                        <el-option v-for="type in getAvailableTypes()" :key="type.type" :label="type.type"
                            :value="type.type" />
                    </el-select>
                </el-form-item>
            </el-form>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="deleteTypeDialogVisible = false">取消</el-button>
                    <el-button type="danger" @click="confirmDeleteType" :disabled="!replaceTypeName">
                        确认删除
                    </el-button>
                </span>
            </template>
        </el-dialog>
    </el-row>
</template>

<style scoped>
.el-col {
    min-width: 60px;
    max-width: 200px;
}

.menu-container {
    position: relative;
    height: 100%;
}

.menu-toggle-btn {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
}

.el-menu {
    height: 95vh;
    border-right: none;
}

.manage {
    height: 95vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.el-card {
    margin: 20px;
    height: fit-content;
    background-color: #fff;
}

.el-table {
    margin-bottom: 20px;
}

.dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
}

.el-form-item {
    margin-bottom: 20px;
}
</style>