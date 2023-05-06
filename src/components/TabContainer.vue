<script setup>
import TabContent from './TabContent.vue';
import { ref } from 'vue';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import AutoComplete from 'primevue/autocomplete';
import { useConfirm } from "primevue/useconfirm";
import { useToast } from 'primevue/usetoast';

const toast = useToast();

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
const showPasteFactory = ref({});
const createNewFactory = ref({});
const nameSuggestions = ref([]);

const createFactory = () => {
    createNewFactory.value.name = makeName() + ' Factory';
    createNewFactory.value.visible = true;
}

const doCreateFactory = () => {
    factories.value.push({id: createNewFactory.value.name.trim()});
    factory.value = factories.value.at(-1);
    createNewFactory.value.visible = false;
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
    factory.value.id = showChangeFactoryName.value.newFactoryName.trim();
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
const factoryToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(factory.value)).then(() => {
        toast.add({ severity: 'info', summary: 'Copied to clipboard!', life: 3000 });
    }).catch(e => {
        toast.add({ severity: 'warning', summary: "Can't Copy Factory Data", life: 8000 });
    });
}

const pasteFactory = () => {
    navigator.clipboard.readText().then(clip => {
        try {
            const tFactoryData = JSON.parse(clip);
            if (tFactoryData.id && tFactoryData.factoryData) {
                showPasteFactory.value.content = clip;
                showPasteFactory.value.object = tFactoryData;
                showPasteFactory.value.importName = tFactoryData.id;
            }
            else {
                console.warn("Clipboard doesn't contain factory data", clip);
            }
        }
        catch {
            console.warn("Clipboard doesn't contain JSON data", clip);
            showPasteFactory.value.content = '{}';
            showPasteFactory.value.object = {};
        }
        showPasteFactory.value.visible = true;
    });
}

const importFactory = () => {
    if (factories.value.find(f => f.id === showPasteFactory.value.importName)) {
        confirmOverwrite();
    }
    else {
        doFactoryImport();
    }
    showPasteFactory.value.visible = false;
}

const confirmOverwrite = () => {
    confirm.require({
        message: `"${showPasteFactory.value.importName}" already exists. Overwrite?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => doFactoryImport()
    });
};

const doFactoryImport = () => {
    showPasteFactory.value.object.id = showPasteFactory.value.importName.trim();
    const tFactory = factories.value.findIndex(f => f.id === showPasteFactory.value.object.id);
    if (tFactory >= 0) {
        factories.value[tFactory] = showPasteFactory.value.object;
    }
    else {
        factories.value.push(showPasteFactory.value.object);
    }
    factory.value = factories.value.find(f => f.id === showPasteFactory.value.object.id);
    console.log(tFactory, factories.value);
    saveChanges();
};

const getSuggestions = ({query}) => {
    nameSuggestions.value = props.mainData.recipes.filter(r => r.name.indexOf(query) >= 0).map(r => r.name);
}
</script>
<template>
    <Dialog v-model:visible="createNewFactory.visible" modal header="Create a new Factory">
        <div class="flex flex-wrap gap-2">
            <div class="p-inputgroup flex-1">
                <span class="p-inputgroup-addon cursor-pointer" @click="() => createNewFactory.name = makeName() + ' Factory'">
                    🏭
                </span>
                <AutoComplete v-model="createNewFactory.name" :suggestions="nameSuggestions" @complete="getSuggestions" :completeOnFocus="true" />
                <Button icon="pi pi-times" @click="() => createNewFactory.name = ''" />
            </div>
            <Button label="Create" @click="doCreateFactory()" :disabled="!createNewFactory.name.trim() || factories.find(f => f.id === createNewFactory.name.trim())"/>
        </div>
    </Dialog>
    <Dialog v-model:visible="showChangeFactoryName.visible" modal header="Edit Factory Name" class="w-11 md:w-8 lg:w-6">
        <div class="flex flex-wrap gap-2">
            <div class="p-inputgroup flex-1">
                <span class="p-inputgroup-addon cursor-pointer" @click="() => showChangeFactoryName.newFactoryName = makeName() + ' Factory'">
                    🏭
                </span>
                <AutoComplete v-model="showChangeFactoryName.newFactoryName" :suggestions="nameSuggestions" @complete="getSuggestions" :completeOnFocus="true" />
                <Button icon="pi pi-times" @click="() => showChangeFactoryName.newFactoryName = ''" />
            </div>
            <Button label="Update" @click="updateFactoryName()" :disabled="!showChangeFactoryName.newFactoryName.trim() || factories.find(f => f.id === showChangeFactoryName.newFactoryName.trim())"/>
        </div>
    </Dialog>
    <Dialog v-model:visible="showPasteFactory.visible" modal header="Import From Clipboard" class="w-11 md:w-8 lg:w-6">
        <div class="flex flex-column w-full">
            <label>Import Factory As :</label>
            <div class="p-inputgroup flex-1 mb-2">
                <span class="p-inputgroup-addon cursor-pointer" @click="() => showPasteFactory.importName = makeName() + ' Factory'">
                    🏭
                </span>
                <AutoComplete v-model="showPasteFactory.importName" :suggestions="nameSuggestions" @complete="getSuggestions" :completeOnFocus="true" />
                <Button icon="pi pi-times" @click="() => showPasteFactory.importName = ''" />
            </div>
            <label>Paste factory data in this box :</label>
            <Textarea v-model="showPasteFactory.content" class="mb-2" />
            <div class="w-full flex justify-content-end">
                <Button label="Import" @click="importFactory()"/>
            </div>
        </div>
    </Dialog>
    <div class="flex justify-content-end bg-ficsit-secondary p-2">        
        <div class="p-inputgroup w-full md:w-8 lg:w-6 xl:w-4">
            <Button v-if="factory" icon="pi pi-copy" severity="info"  @click="factoryToClipboard()" />
            <Button v-if="factory" icon="pi pi-cloud-download" severity="warning"  @click="pasteFactory()" />
            <Button v-if="factory" icon="pi pi-trash" severity="danger"  @click="confirmDelete()" />
            <Button v-if="factory" icon="pi pi-pencil" severity="success" @click="editFactoryName()" />
            <Dropdown v-model="factory" :options="factories" filter optionLabel="id" placeholder="Select a factory" />        
            <Button icon="pi pi-plus" @click="createFactory" />
        </div>
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