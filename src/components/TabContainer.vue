<script setup>
import TabView from 'primevue/tabview';
import TabPanel from 'primevue/tabpanel';
import TabContent from './TabContent.vue';
import { ref, onMounted } from 'vue';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

import InputText from 'primevue/inputtext';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';

const props = defineProps(['mainData'])

const makeName = () => {
    return uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: ' ',
        style: 'capital',
        length: 2
    });
}

const tabs = ref([]);
const showChangeFactoryName = ref({});

const addTab = () => {
    tabs.value.push({id: makeName()});
    saveChanges();
}

const removeTab = (index) => {
    tabs.value = [...tabs.value.slice(0,index), ...tabs.value.slice(index+1)];
    saveChanges();
}

const editFactoryName = (tab) => {
    showChangeFactoryName.value.visible = true;
    showChangeFactoryName.value.tab = tab;
    showChangeFactoryName.value.newFactoryName = tab.id;
}

const updateFactoryName = () => {
    showChangeFactoryName.value.visible = false;
    showChangeFactoryName.value.tab.id = showChangeFactoryName.value.newFactoryName;
    saveChanges();
}

const saveChanges = (tab = null, data = null) => {
    if (tab && data) tab.factoryData = data;
    localStorage.setItem('factoryData', JSON.stringify(tabs.value));
}

onMounted(() => {
    tabs.value = JSON.parse(localStorage.getItem('factoryData') || '[]');
})
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
    <TabView :scrollable="true">
        <TabPanel v-for="(tab, i) in tabs">
            <template #header>
                <div class="flex align-items-center" @dblclick="editFactoryName(tab)">
                    <span class="mr-2">🏭 {{tab.id}}</span>
                    <span class="flex justify-content-center align-items-center w-1rem h-1rem border-circle bg-red-600 text-white">
                        <i class="pi pi-times text-xxs" @click="removeTab(i)"/>
                    </span>
                </div>
            </template>
            <TabContent :mainData="props.mainData" :modelValue="tab.factoryData" @update:modelValue="(data) => saveChanges(tab, data)"/>
        </TabPanel>
        <TabPanel>
            <template #header>
                <div class="flex align-items-center" @click="addTab">
                    &nbsp;
                    <span class="flex justify-content-center align-items-center w-2rem h-2rem bg-ficsit-primary text-white anti-padding">
                        <i class="pi pi-plus text-xs"/>
                    </span>
                    &nbsp;
                </div>
            </template>
        </TabPanel>
    </TabView>
</template>

<style scoped>
.text-xxs {
    font-size: 0.5rem;
}

.anti-padding {
    margin: -1rem;
}
</style>