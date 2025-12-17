<script setup lang="ts">

import favicon from '@/assets/icons/favicon.ico';
import { Management, Picture, Notebook, Bell, Check, Link } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { fetchDataAutoRetry, refreshAccessToken } from '@/token';

interface MessageData {
    id?: number;
    type: string;
    text: string;
    level: string;
    timestamp: string;
    status: string;
    link?: string;
}

const router = useRouter();
let messageStream: EventSource | null = null;
const messages = ref<MessageData[]>([]);

const unreadCount = computed(() => messages.value.filter(m => m.status === 'unread').length);
const hasReadMessages = computed(() => messages.value.some(m => m.status === 'read'));

const handleCommand = (command: string | MessageData) => {
    if (command === 'clear-read') {
        clearReadMessages();
    }
};

const markAsRead = async (msg: MessageData) => {
    if (msg.status === 'unread') {
        try {
             await fetchDataAutoRetry('/api/message/read/', { id: msg.id }); 
             msg.status = 'read';
        } catch (e) {
            console.error('Failed to mark as read', e);
        }
    }
};

const visitLink = (msg: MessageData) => {
    if (msg.link) {
        router.push(msg.link);
    }
};

const clearReadMessages = async () => {
    try {
        await fetchDataAutoRetry('/api/message/clear_read/', {});
        messages.value = messages.value.filter(m => m.status !== 'read');
    } catch (e) {
        console.error('Failed to clear read messages', e);
    }
};

onMounted(async () => {
    messages.value = await fetchDataAutoRetry('/api/message/list/', {}) as MessageData[];

    let token = localStorage.getItem('wardrobe-access-token');
    if (!token) {
        router.push('/login');
    }

    // 尝试刷新 token 以确保有效
    const refreshToken = localStorage.getItem('wardrobe-refresh-token');
    if (refreshToken) {
        await refreshAccessToken(refreshToken);
        token = localStorage.getItem('wardrobe-access-token');
    }

    if (!token) {
        router.push('/login');
        return;
    }

    messageStream = new EventSource('/api/message/stream/?token=' + token);

    messageStream.onmessage = (event) => {
        const data = JSON.parse(event.data) as MessageData;
        console.log('Received message:', data);
        messages.value.push(data);
    };
});

onUnmounted(() => {
    if (messageStream) {
        messageStream.close();
    }
});

</script>

<template>
    <el-menu :default-active="'/'" class="headermenu" mode="horizontal" :ellipsis="false" :router="true">
        <el-menu-item index="/" class="logo-menu-item">
            <img style="width: 48px" :src="favicon" alt="静寂的壁橱" />
        </el-menu-item>
        <el-menu-item index="/diary"><el-icon>
                <Notebook />
            </el-icon>日记</el-menu-item>
        <el-menu-item index="/search"><el-icon>
                <Picture />
            </el-icon>图片</el-menu-item>
        <el-menu-item index="/manage"><el-icon>
                <Management />
            </el-icon>管理</el-menu-item>
        <el-menu-item class="notification-item">
            <el-dropdown trigger="hover" @command="handleCommand">
                <span class="el-dropdown-link">
                    <el-badge :value="unreadCount" :hidden="unreadCount === 0" class="item">
                        <el-icon :size="20"><Bell /></el-icon>
                    </el-badge>
                </span>
                <template #dropdown>
                    <el-dropdown-menu class="message-dropdown">
                        <div v-if="messages.length === 0" class="no-message">暂无消息</div>
                        <el-dropdown-item 
                            v-for="msg in messages" 
                            :key="msg.id || msg.timestamp" 
                            :command="{}"
                        >
                            <div class="message-row">
                                <div class="message-content" :class="{ 'is-read': msg.status === 'read' }">
                                    <div class="message-text">{{ msg.text }}</div>
                                    <div class="message-time">{{ new Date(msg.timestamp).toLocaleString() }}</div>
                                </div>
                                <div class="message-actions">
                                    <el-tooltip content="标记已读" placement="top" v-if="msg.status === 'unread'">
                                        <el-icon class="action-icon" @click.stop="markAsRead(msg)"><Check /></el-icon>
                                    </el-tooltip>
                                    <el-tooltip content="查看详情" placement="top" v-if="msg.link">
                                        <el-icon class="action-icon" @click="visitLink(msg)"><Link /></el-icon>
                                    </el-tooltip>
                                </div>
                            </div>
                        </el-dropdown-item>
                        <el-dropdown-item divided command="clear-read" v-if="hasReadMessages">
                            <div style="text-align: center; width: 100%">清除已读消息</div>
                        </el-dropdown-item>
                    </el-dropdown-menu>
                </template>
            </el-dropdown>
        </el-menu-item>
    </el-menu>
</template>

<style scoped>
.headermenu {
    width: 100%;
    margin: 0;
}

.el-menu--horizontal {
    width: 100%;
}

.el-menu--horizontal>.el-menu-item:nth-child(1) {
    margin-right: auto;
}

.el-dropdown-link {
    display: flex;
    align-items: center;
    height: 100%;
    outline: none;
}
</style>

<style>
.notification-item {
    padding: 5px !important;
}
.message-dropdown {
    max-width: 300px;
    max-height: 400px;
    overflow-y: auto;
}
.message-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    width: 100%;
}
.message-content {
    display: flex;
    flex-direction: column;
    line-height: 1.4;
    padding: 5px 0;
    min-width: 200px;
    flex: 1;
    margin-right: 10px;
}
.message-text {
    font-weight: bold;
    white-space: normal;
    word-break: break-word;
}
.message-time {
    font-size: 12px;
    color: #999;
    margin-top: 4px;
}
.message-actions {
    display: flex;
    gap: 8px;
    margin-top: 5px;
    flex-shrink: 0;
}
.action-icon {
    cursor: pointer;
    color: #909399;
    transition: color 0.3s;
    font-size: 16px;
}
.action-icon:hover {
    color: #409EFF;
}
.is-read .message-text {
    font-weight: normal;
    color: #666;
}
.no-message {
    padding: 15px;
    text-align: center;
    color: #999;
    font-size: 14px;
}
</style>