<script setup lang="ts">

defineProps<{ msg: string }>()

</script>

<template>
  <h1>我是HelloWorld</h1>
  <h1>{{ msg }}</h1>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
