<script setup>
    const props = defineProps(['consumption', 'prefix'])
</script>
<template>
    <div v-if="consumption" class="flex flex-row text-sm mt-1">
        <div class="border-1 flex align-items-center border-round-left border-400 px-1 ">
            {{ prefix }} <i class="pi pi-bolt text-yellow-500" />
        </div>
        <div
            class="border-y-1 border-right-1 p-1 border-round-right white-space-nowrap border-400 px-1 py-0">
            {{ consumption }} <span class="text-xxs">MW/h</span>
        </div>
    </div>
</template>