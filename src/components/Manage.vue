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


const ocrMissionList = ref<Array<{ src: string, status: string }>>([]);
const currentOcrRow = ref<{ src: string, status: string }>({ src: 'null', status: '' });

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


const handleOCRSelectChange = (row: { src: string, status: string }) => {
    currentOcrRow.value = row;
}

const filterStatus = (value: string, row: { src: string, status: string }) => {
    return row.status === value
}

const handleRowDoubleClidked = (row: { src: string, status: string }) => {
    const src = row.src
    const newWindow = router.resolve('/detail/' + src);
    window.open(newWindow.href, '_blank');
}

</script>

<template>
    <el-row class="manage">
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
                            <Memo />
                        </el-icon>
                        <span>OCR任务</span>
                    </el-menu-item>
                </el-menu>
            </div>
        </el-col>
        <el-card v-if="activeIndex === '1'" class="manage-content">
            <h2>OCR任务</h2>
            <el-button type="primary" @click="fetchOcrMissionList">刷新任务列表</el-button>
            <el-scrollbar :height="'calc(100vh - 300px)'">
                <el-table :data="ocrMissionList" @row-dblclick="handleRowDoubleClidked" highlight-current-row
                    @current-change="handleOCRSelectChange">
                    <el-table-column prop="src" label="文件" width="160" />
                    <el-table-column prop="status" label="状态" width="90"
                        :filters="[{ text: '已完成', value: 'finished' }, { text: '进行中', value: 'processing' }, { text: '等待中', value: 'waiting' }]"
                        :filter-method="filterStatus" />

                </el-table>
            </el-scrollbar>
            <el-button type="primary" @click="performAllOcr">执行所有</el-button>
            <el-button type="primary" :disabled="currentOcrRow?.src == 'null'" @click="performOcr">执行</el-button>
            <el-button type="success" :disabled="currentOcrRow?.src == 'null'" @click="resetOcr">重置</el-button>
        </el-card>
    </el-row>
</template>

<style scoped>
.el-col {
    min-width: 60px;
    max-width: 180px;
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
</style>