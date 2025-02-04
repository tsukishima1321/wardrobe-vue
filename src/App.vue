<script setup lang="ts">
</script>

<template>
  <header>
    <router-view />
  </header>
</template>

<style scoped>
@media (min-width: 1024px) {
  .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
