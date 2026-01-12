<script setup lang="ts">
import { fetchDataAutoRetry, refreshAccessToken } from "@/token";
import { useRouter } from "vue-router";
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import {
    Download,
    Delete,
    Plus,
} from '@element-plus/icons-vue'

const router = useRouter();

// Backup Logic
interface BackupRecord {
    timestamp: string;
    comment: string;
}

const backupList = ref<BackupRecord[]>([]);
const isBackupLoading = ref(false);

const fetchBackupList = () => {
    isBackupLoading.value = true;
    fetchDataAutoRetry('/api/backup/list/', {}, 'GET').then((res) => {
        backupList.value = res as BackupRecord[];
    }).catch(() => {
        ElMessage.error('获取备份列表失败');
    }).finally(() => {
        isBackupLoading.value = false;
    });
}

const handleCreateBackup = () => {
    ElMessageBox.prompt('请输入备份备注（可选）', '创建备份', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：系统升级前备份'
    }).then(({ value }) => {
        const loading = ElLoading.service({
            lock: true,
            text: '正在创建备份，请稍候...',
            background: 'rgba(0, 0, 0, 0.7)',
        });
        fetchDataAutoRetry('/api/backup/create/', { comment: value }, 'POST').then(() => {
            loading.close();
            ElMessage.success('备份创建成功');
            fetchBackupList();
        }).catch((err) => {
            loading.close();
            ElMessage.error('备份创建失败');
        });
    }).catch(() => {
        // Cancelled
    });
}

const selectedRows = ref<BackupRecord[]>([]);

const handleSelectionChange = (val: BackupRecord[]) => {
    selectedRows.value = val;
}

const handleBatchDelete = () => {
    if (selectedRows.value.length === 0) return;
    ElMessageBox.confirm(`确认删除选中的 ${selectedRows.value.length} 个备份吗？`, '警告', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(async () => {
        const loading = ElLoading.service({
            lock: true,
            text: '正在删除备份...',
            background: 'rgba(0, 0, 0, 0.7)',
        });
        try {
            await Promise.all(selectedRows.value.map(row =>
                fetchDataAutoRetry('/api/backup/delete/', { timestamp: row.timestamp }, 'POST')
            ));
            ElMessage.success('批量删除成功');
            fetchBackupList();
        } catch (error) {
            ElMessage.error('批量删除过程中发生错误');
            fetchBackupList();
        } finally {
            loading.close();
        }
    }).catch(() => {
        // Cancelled
    });
}

const handleDownloadBackup = async (row: BackupRecord) => {
    let token = localStorage.getItem('wardrobe-access-token');
    if (!token) {
        router.push('/login');
        return;
    }

    // 尝试刷新 token 以确保有效
    const refreshToken = localStorage.getItem('wardrobe-refresh-token');
    if (refreshToken) {
        await refreshAccessToken(refreshToken);
        token = localStorage.getItem('wardrobe-access-token');
    }

    if (!token) {
        ElMessage.error('无法获取有效Token');
        return;
    }

    const url = `/api/backup/download/?timestamp=${row.timestamp}&token=${token}`;
    window.open(url, '_blank');
}

onMounted(() => {
    fetchBackupList();
});

defineExpose({ fetchBackupList });
</script>

<template>
    <el-card class="manage-content">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin: 0;">备份管理</h2>
            <div>
                <el-button type="danger" :icon="Delete" @click="handleBatchDelete"
                    :disabled="selectedRows.length === 0">批量删除</el-button>
                <el-button type="primary" :icon="Plus" @click="handleCreateBackup">新建备份</el-button>
            </div>
        </div>
        <el-scrollbar :height="'calc(100vh - 200px)'">
            <el-table :data="backupList" v-loading="isBackupLoading" style="width: 100%"
                @selection-change="handleSelectionChange">
                <el-table-column type="selection" width="55" />
                <el-table-column prop="timestamp" label="备份时间" width="220" sortable />
                <el-table-column prop="comment" label="备注" min-width="200" />
                <el-table-column label="操作" width="200" align="right">
                    <template #default="scope">
                        <el-button size="small" :icon="Download"
                            @click="handleDownloadBackup(scope.row)">下载</el-button>
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
</style>
