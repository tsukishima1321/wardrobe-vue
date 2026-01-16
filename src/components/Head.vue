<script setup lang="ts">

import favicon from '@/assets/icons/favicon.ico';
import { Management, Picture, Notebook, Bell, Check, Link } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
import { onMounted, onUnmounted, ref, computed } from 'vue';
import { refreshAccessToken } from '@/api/token';
import { clearReadMessages as clearReadMessagesRequest, createMessageStream, getMessageList, markMessageRead } from '@/api/componentRequests';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

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
const dialogVisible = ref(false);
const currentMessage = ref<MessageData | null>(null);

const unreadCount = computed(() => messages.value.filter(m => m.status === 'unread').length);
const hasReadMessages = computed(() => messages.value.some(m => m.status === 'read'));

const handleCommand = (command: string | MessageData) => {
    if (command === 'clear-read') {
        clearReadMessages();
    }
};

const openMessageDialog = (msg: MessageData) => {
    markAsRead(msg);
    currentMessage.value = msg;
    dialogVisible.value = true;
};

const renderMarkdown = (text: string) => {
    return DOMPurify.sanitize(marked.parse(text) as string);
};

const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length > maxLength) {
        return text.slice(0, maxLength) + '...';
    }
    return text;
};

const markAsRead = async (msg: MessageData) => {
    if (msg.status === 'unread') {
        try {
             await markMessageRead(msg.id); 
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
        await clearReadMessagesRequest();
        messages.value = messages.value.filter(m => m.status !== 'read');
    } catch (e) {
        console.error('Failed to clear read messages', e);
    }
};

onMounted(async () => {
    messages.value = await getMessageList() as MessageData[];

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

    messageStream = createMessageStream(token);

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
                                <div class="message-content" :class="['msg-level-' + msg.level, { 'is-read': msg.status === 'read' }]">
                                    <div 
                                        class="message-text" 
                                        :class="{ 'is-truncated': msg.text.length > 100 }"
                                        @click="msg.text.length > 100 ? openMessageDialog(msg) : null"
                                    >
                                        {{ truncateText(msg.text) }}
                                    </div>
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

    <el-dialog
        v-model="dialogVisible"
        title="消息详情"
        width="800px"
        align-center
        append-to-body
    >
        <div v-if="currentMessage">
            <div class="dialog-content">
                <div class="dialog-text" v-html="renderMarkdown(currentMessage.text)"></div>
                <p class="dialog-time">{{ new Date(currentMessage.timestamp).toLocaleString() }}</p>
            </div>
        </div>
        <template #footer>
            <span class="dialog-footer">
                <el-button @click="dialogVisible = false">关闭</el-button>
                <el-button type="primary" @click="visitLink(currentMessage); dialogVisible = false" v-if="currentMessage?.link">
                    前往查看
                </el-button>
            </span>
        </template>
    </el-dialog>
</template>

<style scoped>
.headermenu {
    width: 100%;
    margin: 0;
}
.el-menu-item {
    padding: 5px;
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
    padding: 5px 0 5px 10px;
    min-width: 200px;
    flex: 1;
    margin-right: 10px;
    border-left: 3px solid transparent;
}
.msg-level-tips {
    border-left-color: #67C23A;
}
.msg-level-info {
    border-left-color: #909399;
}
.msg-level-warning {
    border-left-color: #E6A23C;
}
.msg-level-warning .message-text {
    color: #E6A23C;
}
.is-read {
    border-left-color: #EBEEF5;
}
.message-text {
    font-weight: bold;
    white-space: normal;
    word-break: break-word;
}
.is-truncated {
    cursor: pointer;
}
.is-truncated:hover {
    color: #409EFF;
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
.dialog-content {
    padding: 10px 0;
}
.dialog-text {
    font-size: 16px;
    line-height: 1.6;
    margin-bottom: 15px;
    word-break: break-word;
}
.dialog-text :deep(p) {
    margin-bottom: 10px;
}
.dialog-text :deep(a) {
    color: #409EFF;
    text-decoration: none;
}
.dialog-text :deep(a:hover) {
    text-decoration: underline;
}
.dialog-text :deep(ul), .dialog-text :deep(ol) {
    padding-left: 20px;
    margin-bottom: 10px;
}
.dialog-text :deep(code) {
    background-color: #f4f4f5;
    padding: 2px 4px;
    border-radius: 4px;
    font-family: monospace;
}
.dialog-text :deep(pre) {
    background-color: #f4f4f5;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    margin-bottom: 10px;
}
.dialog-text :deep(pre code) {
    background-color: transparent;
    padding: 0;
}
.dialog-time {
    font-size: 12px;
    color: #999;
    text-align: right;
}
</style>