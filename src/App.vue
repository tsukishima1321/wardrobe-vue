<script setup lang="ts">
import Head from './components/Head.vue';
</script>

<template>
  <div class="main">
    <Head />
    <router-view />
  </div>
</template>

<style scoped>

.main {
  padding: 0;
  margin: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

</style>
