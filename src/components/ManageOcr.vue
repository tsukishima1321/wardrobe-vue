<script setup lang="ts">
import {
    cleanOcrMissionList as cleanOcrMissionListRequest,
    executeAllOcrMissions,
    executeOcrMission,
    getOcrMissionList,
    resetOcrMission
} from "@/api/componentRequests";
import { useRouter } from "vue-router";
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const router = useRouter();

const ocrMissionList = ref<Array<{ src: string, status: string }>>([]);
const currentOcrRow = ref<{ src: string, status: string }>({ src: 'null', status: '' });

const fetchOcrMissionList = () => {
    getOcrMissionList().then((res) => {
        ocrMissionList.value = res as Array<{ src: string, status: string }>;
    }).catch(() => {
        router.push('/login');
    });
}

const cleanOcrMissionList = () => {
    ElMessageBox.confirm('确认清理OCR任务列表吗？该操作不可撤销。', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
    }).then(async () => {
        try {
            await cleanOcrMissionListRequest();
            ElMessage.success('OCR任务列表清理成功');
            fetchOcrMissionList();
        } catch (error) {
            ElMessage.error('OCR任务列表清理失败');
        }
    }).catch(() => {
        // 用户取消操作
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
            await resetOcrMission(currentOcrRow.value.src);
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
            await executeOcrMission(currentOcrRow.value.src);
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
            await executeAllOcrMissions();
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

onMounted(() => {
    fetchOcrMissionList();
});

defineExpose({ fetchOcrMissionList });
</script>

<template>
    <el-card class="manage-content">
        <h2>OCR任务</h2>
        <el-button type="primary" @click="fetchOcrMissionList">刷新任务列表</el-button>
        <el-button type="warning" @click="cleanOcrMissionList">清理列表</el-button>
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
</template>

<style scoped>
.el-card {
    margin: 20px;
    height: fit-content;
    background-color: #fff;
}

.el-table {
    margin-bottom: 20px;
}
</style>
