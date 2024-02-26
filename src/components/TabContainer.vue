<script setup>
import TabContent from './TabContent.vue';
import localForage from 'localforage';
import { ref } from 'vue';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import AutoComplete from 'primevue/autocomplete';
import { useConfirm } from "primevue/useconfirm";
import { useToast } from 'primevue/usetoast';
import Sankeyfy from './Sankeyfy.vue';
import {
    computeFactoryConsumption,
    getAllNetDefecits,
    getAllNetProduction,
} from "../utilitites";

const toast = useToast();

const confirm = useConfirm();

const props = defineProps(['mainData'])

const factories = ref([]);
const factory = ref(null);
const showChangeFactoryName = ref({});
const showPasteFactory = ref({});
const createNewFactory = ref({});
const nameSuggestions = ref([]);
const loading = ref(true);
const showGlobalOverview = ref(false);
const graph = ref({nodes: [], links: []});

localForage.getItem('factoryData').then(data => {
    factories.value = data || [];
    factory.value = factories.value[0];
    convertFactoriesToGraph();
    loading.value = false;
});

const convertFactoriesToGraph = () => {
    const tNodes = new Set();
    graph.value.links = [];
    factories.value.forEach(f => {
        tNodes.add(f.id);
        getAllNetProduction(f.factoryData).forEach(p => {
            tNodes.add(p.name);
            graph.value.links.push({source: f.id, target: p.name, value: p.value || 1});
        });
        getAllNetDefecits(f.factoryData).forEach(d => {
            tNodes.add(d.name);
            graph.value.links.push({target: f.id, source: d.name, value: d.value * -1});
        });
    });
    graph.value.nodes = [...tNodes].map(n => {return {name: n}});
}

const makeName = () => {
    return uniqueNamesGenerator({
        dictionaries: [adjectives, animals],
        separator: ' ',
        style: 'capital',
        length: 2
    });
};

const createFactory = () => {
    createNewFactory.value.name = makeName() + ' Factory';
    createNewFactory.value.visible = true;
};

const doCreateFactory = () => {
    factories.value.push({id: createNewFactory.value.name.trim()});
    factory.value = factories.value.at(-1);
    createNewFactory.value.visible = false;
    saveChanges();
};

const deleteFactory = () => {
    factories.value = factories.value.filter(f => f.id !== factory.value.id);
    factory.value = null;
    saveChanges();
};

const editFactoryName = () => {
    showChangeFactoryName.value.visible = true;
    showChangeFactoryName.value.newFactoryName = factory.value.id;
};

const updateFactoryName = () => {
    showChangeFactoryName.value.visible = false;
    factory.value.id = showChangeFactoryName.value.newFactoryName.trim();
    saveChanges();
};

const saveChanges = (tab = null, data = null) => {
    if (tab && data) tab.factoryData = data;
    localForage.setItem('factoryData', JSON.parse(JSON.stringify(factories.value)));
};

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
};

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
};

const importFactory = () => {
    if (factories.value.find(f => f.id === showPasteFactory.value.importName)) {
        confirmOverwrite();
    }
    else {
        doFactoryImport();
    }
    showPasteFactory.value.visible = false;
};

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
    saveChanges();
};

const showOverview = () => {
    convertFactoriesToGraph();
    showGlobalOverview.value = true;
}

const getSuggestions = ({query}) => {
    nameSuggestions.value = props.mainData.recipes.filter(r => r.name.indexOf(query) >= 0).map(r => r.name);
};
</script>
<template>
    <Dialog v-model:visible="showGlobalOverview" modal header="Global Overview"  class="w-11" style="max-height: calc(100vh - 20px);">
        <Sankeyfy :graph="graph" />
    </Dialog>
    <Dialog v-model:visible="createNewFactory.visible" modal header="Create a new Factory"  class="w-11 md:w-8 lg:w-6">
        <div class="flex flex-wrap gap-2">
            <div class="p-inputgroup flex-1">
                <span class="p-inputgroup-addon cursor-pointer" @click="() => createNewFactory.name = makeName() + ' Factory'"  title="Generate a random name">
                    🏭
                </span>
                <AutoComplete v-model="createNewFactory.name" :suggestions="nameSuggestions" @complete="getSuggestions" :completeOnFocus="true" />
            </div>
            <Button label="Create" @click="doCreateFactory()" :disabled="!createNewFactory.name.trim() || factories.find(f => f.id === createNewFactory.name.trim())"/>
        </div>
    </Dialog>
    <Dialog v-model:visible="showChangeFactoryName.visible" modal header="Edit Factory Name" class="w-11 md:w-8 lg:w-6">
        <div class="flex flex-wrap gap-2">
            <div class="p-inputgroup flex-1">
                <span class="p-inputgroup-addon cursor-pointer" @click="() => showChangeFactoryName.newFactoryName = makeName() + ' Factory'"  title="Generate a random name">
                    🏭
                </span>
                <AutoComplete v-model="showChangeFactoryName.newFactoryName" :suggestions="nameSuggestions" @complete="getSuggestions" :completeOnFocus="true" />
            </div>
            <Button label="Update" @click="updateFactoryName()" :disabled="!showChangeFactoryName.newFactoryName.trim() || factories.find(f => f.id === showChangeFactoryName.newFactoryName.trim())"/>
        </div>
    </Dialog>
    <Dialog v-model:visible="showPasteFactory.visible" modal header="Import Factory" class="w-11 md:w-8 lg:w-6">
        <div class="flex flex-column w-full">
            <label>Import Factory As :</label>
            <div class="p-inputgroup flex-1 mb-2">
                <span class="p-inputgroup-addon cursor-pointer" @click="() => showPasteFactory.importName = makeName() + ' Factory'"  title="Generate a random name">
                    🏭
                </span>
                <AutoComplete v-model="showPasteFactory.importName" :suggestions="nameSuggestions" @complete="getSuggestions" :completeOnFocus="true" />
            </div>
            <label>Paste factory data in this box :</label>
            <Textarea v-model="showPasteFactory.content" class="mb-2" />
            <div class="w-full flex justify-content-end">
                <Button label="Import" @click="importFactory()"/>
            </div>
        </div>
    </Dialog>

    <div class="flex flex-column md:h-screen md:mt-5 md:absolute md:top-0 w-full">
        <div class="md:block hidden w-full z-4">
            <div class="flex justify-content-between bg-ficsit-secondary p-2">        
                <div class="p-inputgroup">
                    <Button v-if="factory" icon="pi pi-globe" severity="secondary" @click="showOverview" title="Global View"/>
                </div>
                <div class="p-inputgroup w-full md:w-8 lg:w-6 xl:w-4">
                    <Button v-if="factory" icon="pi pi-copy" severity="info"  @click="factoryToClipboard()" title="Copy factory to clipboard"/>
                    <Button icon="pi pi-cloud-download" severity="warning"  @click="pasteFactory()" title="Import factory"/>
                    <Button v-if="factory" icon="pi pi-trash" severity="danger"  @click="confirmDelete()" title="Delete factory"/>
                    <Button v-if="factory" icon="pi pi-pencil" severity="success" @click="editFactoryName()" title="Edit factory" />
                    <Dropdown v-model="factory" :options="factories" filter optionLabel="id" placeholder="Select a factory" />        
                    <Button icon="pi pi-plus" @click="createFactory" title="Create new factory"/>
                </div>
            </div>
        </div>
        <div class="flex flex-column bg-ficsit-secondary p-2 md:hidden z-4">
            <div class="flex justify-content-between mb-2">
                <div class="p-inputgroup">
                    <Button v-if="factory" icon="pi pi-globe" severity="secondary"  @click="showOverview" title="Global View"/>
                </div>
                <div class="p-inputgroup flex-grow-1 justify-content-end">
                    <Button v-if="factory" icon="pi pi-copy" severity="info"  @click="factoryToClipboard()" title="Copy factory to clipboard"/>
                    <Button icon="pi pi-cloud-download" severity="warning"  @click="pasteFactory()"  title="Import factory"/>
                    <Button v-if="factory" icon="pi pi-trash" severity="danger"  @click="confirmDelete()"  title="Delete factory"/>
                    <Button v-if="factory" icon="pi pi-pencil" severity="success" @click="editFactoryName()"  title="Edit factory" />
                </div>
            </div>
            <div class="p-inputgroup w-full">
                <Dropdown v-model="factory" :options="factories" filter optionLabel="id" placeholder="Select a factory" />        
                <Button icon="pi pi-plus" @click="createFactory" title="Create new factory"/>
            </div>
        </div>
        <div v-if="factory" class="p-2 md:absolute md:top-0 md:pt-7 w-full z-3">
            <TabContent :mainData="props.mainData" :modelValue="factory" @update:modelValue="(data) => saveChanges(factory, data)"/>
        </div>
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