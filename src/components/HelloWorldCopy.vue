<script setup lang="ts">
import counter from '../utils/counter';
// import cat from 'virtual';

defineProps<{ msg: string }>()

</script>

<template>
  <h1>我是HelloWorldCopy</h1>
  <h1>{{ msg }}</h1>
  <h1>{{ counter(1, 2) }}</h1>
  <!-- <h1>{{ cat() }}</h1> -->
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
