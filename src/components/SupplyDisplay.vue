<script setup>
const props = defineProps(['supply'])
</script>
<template>
    <div v-if="supply > 0" class="px-1 text-green-600">+{{ supply }}</div>
    <div v-else-if="supply < 0" class="px-1 text-red-600">{{ supply }}</div>
    <div v-else class="px-1 text-green-600">✓</div>
</template>