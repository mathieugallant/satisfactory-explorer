<script setup>
import TabContent from './TabContent.vue';
import { ref } from 'vue';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();

const props = defineProps(['mainData'])

const makeName = () => {
    return uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: ' ',
        style: 'capital',
        length: 2
    });
}

const factories = ref(JSON.parse(localStorage.getItem('factoryData') || '[]'));
const factory = ref(factories.value?.[0]);
const showChangeFactoryName = ref({});

const createFactory = () => {
    const newFactoryName = makeName()
    factories.value.push({id: newFactoryName});
    factory.value = factories.value.at(-1);
    saveChanges();
}

const deleteFactory = () => {
    factories.value = factories.value.filter(f => f.id !== factory.value.id);
    factory.value = null;
    saveChanges();
}

const editFactoryName = () => {
    showChangeFactoryName.value.visible = true;
    showChangeFactoryName.value.newFactoryName = factory.value.id;
}

const updateFactoryName = () => {
    showChangeFactoryName.value.visible = false;
    factory.value.id = showChangeFactoryName.value.newFactoryName;
    saveChanges();
}

const saveChanges = (tab = null, data = null) => {
    if (tab && data) tab.factoryData = data;
    localStorage.setItem('factoryData', JSON.stringify(factories.value));
}

const confirmDelete = () => {
    confirm.require({
        message: `Delete the "${factory.value.id}" factory?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => {
            deleteFactory();
        }
    });
};
</script>

<template>
    <Dialog v-model:visible="showChangeFactoryName.visible" modal header="Edit Factory Name">
        <div class="flex flex-wrap gap-2">
            <div class="p-inputgroup flex-1">
                <span class="p-inputgroup-addon">
                    🏭
                </span>
                <InputText v-model="showChangeFactoryName.newFactoryName" class="w-full" />
            </div>
            <Button label="Update" @click="updateFactoryName()"/>
        </div>
    </Dialog>
    <div class="flex justify-content-end gap-2 bg-ficsit-secondary p-2">
        <Button v-if="factory" icon="pi pi-trash" severity="danger"  @click="confirmDelete()" />
        <Button v-if="factory" icon="pi pi-pencil" severity="success" @click="editFactoryName()" />
        <Button icon="pi pi-plus" @click="createFactory" />
        <Dropdown v-model="factory" :options="factories" filter optionLabel="id" placeholder="Select a factory" class="w-full md:w-14rem " />        
    </div>
    <div v-if="factory" class="p-2">
        <TabContent :mainData="props.mainData" :modelValue="factory" @update:modelValue="(data) => saveChanges(factory, data)"/>
    </div>
</template>

<style scoped>
.text-xxs {
    font-size: 0.5rem;
}

.anti-padding {
    margin: -1rem;
}
</style>