<script setup>
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import { ref, watch, onMounted } from 'vue';
import localforage from 'localforage';
const props = defineProps(['callbacks', 'factories', 'modelValue']);
const emits = defineEmits(['update:modelValue']);

const factory = ref();
onMounted(() => factory.value = props.modelValue?.id);
watch(factory, () => {
    const f = props.factories?.find(x=>x.id === factory.value);
    if (f) {
        emits('update:modelValue', f);
    }
});

const saveLastFactory = (e) => {
    localforage.setItem('lastFactory', e.value);
}

watch(() => props.modelValue, () => factory.value = props.modelValue?.id);
</script>

<template>
    <div class="w-full z-4">
        <div class="md:block hidden w-full">
            <div class="flex justify-content-between bg-ficsit-secondary p-2">        
                <div class="p-inputgroup">
                    <Button v-if="factory" icon="pi pi-globe" severity="secondary" @click="props.callbacks.showOverview" title="Global View"/>
                </div>
                <div class="p-inputgroup w-full md:w-8 lg:w-6 xl:w-4">
                    <Button v-if="factory" icon="pi pi-copy" severity="info"  @click="props.callbacks.factoryToClipboard" title="Copy factory to clipboard"/>
                    <Button icon="pi pi-cloud-download" severity="warning"  @click="props.callbacks.pasteFactory" title="Import factory"/>
                    <Button v-if="factory" icon="pi pi-trash" severity="danger"  @click="props.callbacks.confirmDelete" title="Delete factory"/>
                    <Button v-if="factory" icon="pi pi-pencil" severity="success" @click="props.callbacks.editFactoryName" title="Edit factory" />
                    <Dropdown v-model="factory" :options="props.factories.map(x=>x.id)" filter placeholder="Select a factory"  @change="saveLastFactory" />
                    <Button icon="pi pi-plus" @click="props.callbacks.createFactory" title="Create new factory"/>
                </div>
            </div>
        </div>
        <div class="flex flex-column bg-ficsit-secondary p-2 md:hidden z-4">
            <div class="flex justify-content-between mb-2">
                <div class="p-inputgroup flex-grow-1 justify-content-end">
                    <Button v-if="factory" icon="pi pi-copy" severity="info"  @click="props.callbacks.factoryToClipboard" title="Copy factory to clipboard"/>
                    <Button icon="pi pi-cloud-download" severity="warning"  @click="props.callbacks.pasteFactory"  title="Import factory"/>
                    <Button v-if="factory" icon="pi pi-trash" severity="danger"  @click="props.callbacks.confirmDelete"  title="Delete factory"/>
                    <Button v-if="factory" icon="pi pi-pencil" severity="success" @click="props.callbacks.editFactoryName"  title="Edit factory" />
                </div>
            </div>
            <div class="p-inputgroup w-full">
                <Dropdown v-model="factory" :options="props.factories.map(x=>x.id)" filter placeholder="Select a factory" @change="saveLastFactory" />        
                <Button icon="pi pi-plus" @click="props.callbacks.createFactory" title="Create new factory"/>
            </div>
        </div>
    </div>
</template>