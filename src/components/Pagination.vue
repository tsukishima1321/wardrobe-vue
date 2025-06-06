<script lang="ts" setup>
import { ref } from 'vue'
import type { ComponentSize } from 'element-plus'

const { maxPage } = defineProps({
    maxPage: {
        type: Number,
        default: 99
    }
});

const emits = defineEmits<{
    pageChanged: [page: number]
}>();

const currentPage = ref(1)
const background = ref(false)
const disabled = ref(false)

const handleCurrentChange = (val: number) => {
    emits('pageChanged', val);
}
</script>

<template>
    <div class="pagination-block">
        <el-pagination v-model:current-page="currentPage" :disabled="disabled" :background="background"
            :pager-count="12" layout="prev, pager, next, jumper" :page-count="maxPage"
            @current-change="handleCurrentChange" />
    </div>
</template>

<style>
@media (max-width: 600px) {
    .pagination-block>.el-pagination>.el-pager {
        flex-direction: column;
    }

    .pagination-block>.el-pagination>.el-pagination__jump {
        margin: 0;
        flex-direction: column;
    }

    .pagination-block>.el-pagination>.el-pagination__jump>.el-input {
        margin: 0;
        margin-top: 5px;
        margin-right: 2px;
        width: 30px;
    }

    .pagination-block>.el-pagination>.el-pagination__jump>.el-pagination__goto {
        display: none;
    }
}
</style>

<style scoped>
.demo-pagination-block+.demo-pagination-block {
    margin-top: 10px;
}

.demo-pagination-block .demonstration {
    margin-bottom: 16px;
}

@media (min-width:600px) {
    .pagination-block {
        position: fixed;
        bottom: 0;
        width: 100%;
        background-color: #f1f1f1;
        padding: 10px;
        box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
    }

    .el-pagination {
        justify-content: center;
    }
}

@media (max-width: 600px) {
    .pagination-block {
        right: 0;
        bottom: auto;
        top: 50%;
        transform: translateY(-50%);
        width: auto;
        padding: 10px;
        background-color: rgba(241, 241, 241, 0.9);
        display: flex;
        justify-content: center;
        position: fixed;
        box-shadow: 0 -2px 5px rgba(0, 0, 0, 0.1);
    }

    .el-pagination {
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
    }

    .el-pager {
        flex-direction: column;
    }

    .pagination-block>.el-pagination>.el-pagination__jump {
        flex-direction: column;
    }
}
</style>