<script setup lang="ts">
import { fetchDataAutoRetry, checkToken, refreshAccessToken } from '../token.ts';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage, ElLoading } from 'element-plus';
import type { UploadFile } from 'element-plus';

const router = useRouter();

const types = ref<Array<string>>([]);
const typeSelected = ref('');
const imgTitle = ref('');
const imgDate = ref(new Date().toISOString().split('T')[0]);
const isOCR = ref(true);
const fileList = ref<UploadFile[]>([]);
const previewImageUrl = ref('');
const loading = ref(false);

const handleFileChange = (file: UploadFile) => {
    if (file.raw) {
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImageUrl.value = e.target?.result as string;
        };
        reader.readAsDataURL(file.raw);
    }
    fileList.value = [file];
    return false; // 阻止自动上传
};

const handleRemove = () => {
    fileList.value = [];
    previewImageUrl.value = '';
};

const submitEdit = async () => {
    if (fileList.value.length === 0) {
        ElMessage.warning('请选择要上传的图片');
        return;
    }

    if (!imgTitle.value.trim()) {
        ElMessage.warning('请输入图片标题');
        return;
    }

    if (!typeSelected.value) {
        ElMessage.warning('请选择图片类型');
        return;
    }

    loading.value = true;
    const loadingInstance = ElLoading.service({
        lock: true,
        text: '上传中...',
        background: 'rgba(0, 0, 0, 0.7)',
    });

    try {
        const imgFile = fileList.value[0].raw!;
        const formData = new FormData();
        formData.append('image', imgFile);
        formData.append('title', imgTitle.value);
        formData.append('type', typeSelected.value);
        formData.append('date', imgDate.value);
        formData.append('doOCR', isOCR.value ? 'true' : 'false');

        const url = '/api/image/new/';
        const token = localStorage.getItem('wardrobe-access-token');
        if (!token) {
            router.push('/login');
            return;
        }

        let response;
        if (await checkToken(token)) {
            response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': 'Bearer ' + token
                }
            });
        } else {
            const refreshToken = localStorage.getItem('wardrobe-refresh-token');
            if (!refreshToken) {
                console.error('Refresh token not found!');
                router.push('/login');
                return;
            }
            try {
                await refreshAccessToken(refreshToken);
            } catch (error) {
                console.error('Refresh token failed:', error);
                router.push('/login');
                return;
            }
            const newToken = localStorage.getItem('wardrobe-access-token');
            response = await fetch(url, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': 'Bearer ' + newToken
                }
            });
        }

        if (!response.ok) {
            ElMessage.error('上传失败!');
            console.error('Submit edit failed:', response);
            return;
        }

        ElMessage.success('上传成功!');
        // 重置表单
        fileList.value = [];
        previewImageUrl.value = '';
        imgTitle.value = '';
        imgDate.value = new Date().toISOString().split('T')[0];
        // 为便于连续上传，不重置ocr和类型选择
        // isOCR.value = true;
        // if (types.value.length > 0) {
        //    typeSelected.value = types.value[0];
        // }
    } catch (error) {
        console.error('Upload error:', error);
        ElMessage.error('上传失败!');
    } finally {
        loading.value = false;
        loadingInstance.close();
    }
};

// 获取类型列表
fetchDataAutoRetry('/api/types/', {}, 'GET').then((res) => {
    types.value = res as Array<string>;
    if (types.value.length > 0) {
        typeSelected.value = types.value[0];
    }
}).catch(() => {
    router.push('/login');
});
</script>

<template>
    <el-container class="upload-container">
        <el-main>
            <el-row :gutter="20" style="height: 100%;">
                <!-- 左侧：图片预览区域 -->
                <el-col :span="12">
                    <el-card class="preview-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <span>图片预览</span>
                            </div>
                        </template>
                        <!-- 上传组件 -->
                        <el-upload v-model:file-list="fileList" :on-change="handleFileChange" :on-remove="handleRemove"
                            :limit="1" accept="image/*" list-type="picture-card" :auto-upload="false">
                            <el-icon>
                                <Plus />
                            </el-icon>
                            <template #tip>
                                <div class="el-upload__tip">
                                    只能上传图片文件
                                </div>
                            </template>
                        </el-upload>

                        <!-- 图片预览 -->
                        <div v-if="previewImageUrl" class="preview-container">
                            <el-image :src="previewImageUrl" fit="contain" style="width: 100%; max-height: 500px;"
                                :preview-src-list="[previewImageUrl]" />
                        </div>
                    </el-card>
                </el-col>

                <!-- 右侧：表单区域 -->
                <el-col :span="12">
                    <el-card class="form-card" shadow="hover">
                        <template #header>
                            <div class="card-header">
                                <span>图片信息</span>
                            </div>
                        </template>

                        <el-form :model="{ imgTitle, typeSelected, imgDate, isOCR }" label-width="100px" size="large">
                            <!-- 图片标题 -->
                            <el-form-item label="图片标题" required>
                                <el-input v-model="imgTitle" placeholder="请输入图片标题" clearable />
                            </el-form-item>

                            <!-- 图片类型 -->
                            <el-form-item label="图片类型" required>
                                <el-select v-model="typeSelected" placeholder="请选择图片类型" style="width: 100%;" clearable>
                                    <el-option v-for="type in types" :key="type" :label="type" :value="type" />
                                </el-select>
                            </el-form-item>

                            <!-- 图片日期 -->
                            <el-form-item label="图片日期">
                                <el-date-picker v-model="imgDate" type="date" placeholder="选择日期" style="width: 100%;"
                                    format="YYYY-MM-DD" value-format="YYYY-MM-DD" />
                            </el-form-item>

                            <!-- OCR 开关 -->
                            <el-form-item label="启用OCR">
                                <el-switch v-model="isOCR" active-text="是" inactive-text="否" />
                            </el-form-item>

                            <!-- 提交按钮 -->
                            <el-form-item>
                                <el-button type="primary" size="large" :loading="loading" @click="submitEdit"
                                    style="width: 100%;">
                                    <el-icon>
                                        <Upload />
                                    </el-icon>
                                    {{ loading ? '上传中...' : '上传图片' }}
                                </el-button>
                            </el-form-item>
                        </el-form>
                    </el-card>
                </el-col>
            </el-row>
        </el-main>
    </el-container>
</template>

<style scoped>
.upload-container {
    min-height: 90vh;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.preview-card,
.form-card {
    height: 100%;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-header {
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    color: #333;
}

.preview-container {
    margin-top: 20px;
    text-align: center;
}

.el-image {
    overflow: scroll;
}

.el-upload {
    border: 2px dashed #d9d9d9;
    border-radius: 8px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: border-color 0.3s;
}

.el-upload:hover {
    border-color: #409eff;
}

.el-form {
    padding: 20px 0;
}

.el-form-item {
    margin-bottom: 24px;
}

.el-button {
    border-radius: 8px;
    font-size: 16px;
    padding: 12px 24px;
    transition: all 0.3s;
}

.el-button:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 768px) {
    .upload-container {
        padding: 10px;
    }

    .el-row {
        flex-direction: column;
    }

    .el-col {
        width: 100% !important;
        max-width: 100% !important;
        margin-bottom: 20px;
    }

    .preview-card,
    .form-card {
        height: auto;
        min-height: auto;
    }

    .preview-container {
        margin-top: 15px;
    }

    .el-image {
        max-height: 300px !important;
    }
}

/* 竖屏设备优化 */
@media (max-width: 768px) and (orientation: portrait) {
    .upload-container {
        min-height: 100vh;
        padding: 15px;
    }

    .el-main {
        padding: 0;
    }

    .el-row {
        height: auto !important;
        flex-direction: column;
        gap: 20px;
    }

    .preview-card {
        order: 1;
    }

    .form-card {
        order: 2;
    }

    .el-form {
        padding: 15px 0;
    }

    .el-form-item {
        margin-bottom: 20px;
    }
}
</style>