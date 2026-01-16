<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from "vue-router";
import { ElMessage } from 'element-plus';
import { loginWithPassword } from '@/api/componentRequests';
import 'element-plus/dist/index.css';

const router = useRouter()

const username = ref('');
const password = ref('');

const handleSubmit = async () => {
    try {
        const data = await loginWithPassword({
            username: username.value,
            password: password.value,
        });
        localStorage.setItem('wardrobe-access-token', data.access);
        localStorage.setItem('wardrobe-refresh-token', data.refresh);
        ElMessage.success('登录成功');
        router.push('/');
    } catch (error) {
        ElMessage.error('登录失败，请检查用户名或密码');
        console.error('There was a problem with the login request:', error);
    }
};
</script>

<template>
    <el-col>
        <el-card shadow="hover">
            <h2 style="text-align:center; margin-bottom: 24px;">登录</h2>
            <el-form @submit.prevent="handleSubmit" @submit.native.prevent="handleSubmit" >
                <el-form-item label="用户名" label-width="60px">
                    <el-input v-model="username" placeholder="请输入用户名" clearable />
                </el-form-item>
                <el-form-item label="密码" label-width="60px">
                    <el-input v-model="password" type="password" placeholder="请输入密码" show-password clearable />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" style="width:100%;" @click="handleSubmit">登录</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </el-col>
</template>

<style scoped>
.el-col {
    display: flex;
    align-items: flex-start;
    width: 100%;
}

.el-card {
    width: 100%;
    height: 300px;
    padding: 20px;
    max-width: 400px;
    margin: auto;
    margin-top: 40px;
}
</style>