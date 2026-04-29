<script setup lang="ts">
import { addUserDict, deleteUserDict, listUserDict } from '@/api/componentRequests';
import { ref, computed, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Delete, Plus, Refresh } from '@element-plus/icons-vue';

const userDictList = ref<string[]>([]);
const isLoading = ref(false);
const newWord = ref('');
const selectedWords = ref<string[]>([]);

const isAddDisabled = computed(() => newWord.value.trim().length === 0);

const fetchUserDictList = async () => {
    isLoading.value = true;
    try {
        const list = await listUserDict();
        userDictList.value = list;
    } catch (error) {
        ElMessage.error('获取用户词典失败');
    } finally {
        isLoading.value = false;
    }
};

const handleAddWord = async () => {
    const word = newWord.value.trim();
    if (!word) {
        ElMessage.warning('请输入词条');
        return;
    }

    if (userDictList.value.includes(word)) {
        ElMessage.warning('该词条已存在');
        return;
    }

    try {
        await addUserDict(word);
        ElMessage.success('新增词条成功');
        newWord.value = '';
        await fetchUserDictList();
    } catch (error) {
        ElMessage.error('新增词条失败');
    }
};

const handleDeleteWord = async (word: string) => {
    try {
        await ElMessageBox.confirm(`确认删除词条 "${word}" 吗？`, '提示', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        });
    } catch (error) {
        return;
    }

    try {
        await deleteUserDict(word);
        ElMessage.success('删除词条成功');
        await fetchUserDictList();
    } catch (error) {
        ElMessage.error('删除词条失败');
    }
};

const handleSelectionChange = (selection: Array<{ word: string }>) => {
    selectedWords.value = selection.map((item) => item.word);
};

const handleBatchDelete = async () => {
    if (selectedWords.value.length === 0) {
        ElMessage.warning('请先选择词条');
        return;
    }

    try {
        await ElMessageBox.confirm(`确认删除选中的 ${selectedWords.value.length} 个词条吗？`, '警告', {
            confirmButtonText: '删除',
            cancelButtonText: '取消',
            type: 'warning',
        });
    } catch (error) {
        return;
    }

    try {
        await Promise.all(selectedWords.value.map((word) => deleteUserDict(word)));
        ElMessage.success('批量删除成功');
        selectedWords.value = [];
        await fetchUserDictList();
    } catch (error) {
        ElMessage.error('批量删除失败');
    }
};

const tableData = computed(() => userDictList.value.map((word) => ({ word })));

onMounted(() => {
    fetchUserDictList();
});
</script>

<template>
    <el-card class="manage-content">
        <div class="header-row">
            <h2>用户词典</h2>
            <div class="header-actions">
                <el-button :icon="Refresh" @click="fetchUserDictList">刷新</el-button>
                <el-button type="danger" :icon="Delete" @click="handleBatchDelete" :disabled="selectedWords.length === 0">
                    批量删除
                </el-button>
            </div>
        </div>

        <div class="add-row">
            <el-input
                v-model="newWord"
                placeholder="输入新词条"
                clearable
                @keyup.enter="handleAddWord"
            />
            <el-button type="primary" :icon="Plus" :disabled="isAddDisabled" @click="handleAddWord">
                新增词条
            </el-button>
        </div>

        <el-scrollbar :height="'calc(100vh - 280px)'">
            <el-table
                :data="tableData"
                v-loading="isLoading"
                style="width: 100%"
                @selection-change="handleSelectionChange"
            >
                <el-table-column type="selection" width="55" />
                <el-table-column prop="word" label="词条" min-width="220" />
                <el-table-column label="操作" width="120" align="right">
                    <template #default="scope">
                        <el-button size="small" type="danger" :icon="Delete" @click="handleDeleteWord(scope.row.word)">
                            删除
                        </el-button>
                    </template>
                </el-table-column>
            </el-table>
        </el-scrollbar>
    </el-card>
</template>

<style scoped>
.el-card {
    margin: 20px;
    height: fit-content;
    background-color: #fff;
}

.header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.header-row h2 {
    margin: 0;
}

.header-actions {
    display: flex;
    gap: 8px;
}

.add-row {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
}
</style>
