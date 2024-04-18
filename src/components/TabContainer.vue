<script setup>
import TabContent from './TabContent.vue';
import FactorySelector from './FactorySelector.vue';
import localForage from 'localforage';
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { uniqueNamesGenerator, adjectives, animals } from 'unique-names-generator';

import Textarea from 'primevue/textarea';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import AutoComplete from 'primevue/autocomplete';
import { useConfirm } from "primevue/useconfirm";
import { useToast } from 'primevue/usetoast';
import Sankeyfy from './Sankeyfy.vue';
import SankeyfyLocal from './SankeyfyLocal.vue';

import {
    getAllNetDefecits,
    getAllNetProduction,
} from "../utilitites";
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const toast = useToast();

const confirm = useConfirm();

const props = defineProps(['mainData']);

const factories = ref([]);
const factory = ref(null);
const showChangeFactoryName = ref({});
const showFactoryOverview = ref(false);
const showPasteFactory = ref({});
const createNewFactory = ref({});
const nameSuggestions = ref([]);
const loading = ref(true);
const showGlobalOverview = ref(false);
const graph = ref({ nodes: [], links: [] });

localForage.getItem('factoryData').then(data => {
    factories.value = data || [];

    if (route.query.factory) {
        factory.value = factories.value.find(f => f.id === route.query.factory);
        loading.value = false;
    }
});

watch(() => route.query, () => {
    if (route.query.factory){
        factory.value = factories.value.find(f => f.id === route.query.factory);
    }
});

watch(() => factory.value, () => {
    if (factory.value?.id) {
        router.push({ query: { ...route.query, factory: factory.value.id } });
    }
});

const convertFactoriesToGraph = () => {
    const tNodes = {};
    graph.value.links = [];
    graph.value.nodes = [];
    factories.value.filter(f => !f.hidden).forEach(f => {
        graph.value.nodes.push({ id: f.id, name: f.id, data: { factory_id: f.id } })
        getAllNetProduction(f.factoryData).forEach(p => {
            tNodes[p.desc] ??= { id: p.name, name: p.name, desc: p.desc, production: 0, consumption: 0 };
            tNodes[p.desc].production += p.value;
            graph.value.links.push({ source: f.id, target: p.name, value: p.value || 1 });
        });
        getAllNetDefecits(f.factoryData).forEach(d => {
            tNodes[d.desc] ??= { id: d.name, name: d.name, desc: d.desc, production: 0, consumption: 0 };
            tNodes[d.desc].consumption += d.value;
            graph.value.links.push({ target: f.id, source: d.name, value: d.value * -1 });
        });
    });
    graph.value.nodes = [...graph.value.nodes, ...Object.values(tNodes).map(x => {
        return {
            id: x.name,
            name: x.name,
            labels: [`${x.name}${x.consumption * -1 > x.production ? ' 🚨' : ''}`],
            highlight: x.consumption * -1 > x.production,
            data: {
                material_class: x.desc,
                material_id: x.name,
                produced: x.production,
                consumed: x.consumption * -1,
                consumers: graph.value.links.filter(l => l.source === x.id)
            },
        };
    })];
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
    factories.value.push({ id: createNewFactory.value.name.trim() });
    createNewFactory.value.visible = false;
    router.push({ query: { ...route.query, factory: factories.value.at(-1).id } });
    saveChanges();
};

const deleteFactory = () => {
    factories.value = factories.value.filter(f => f.id !== factory.value.id);
    router.push({ query: { ...route.query, factory: null } });
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
    router.push({ query: { ...route.query, factory: factory.value.id } });
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

const getSuggestions = ({ query }) => {
    nameSuggestions.value = props.mainData.recipes.filter(r => r.name.indexOf(query) >= 0).map(r => r.name);
};

const handdleMouseClick = (e) => {
    const data = e.detail.data;
    if (data.factory_id) {
        if (data.factory_id !== factory.value.id) {
            factory.value = factories.value.find(f => f.id === data.factory_id);
        }
    }
    if (data.factory_id || (data.material_class && data.produced === 0 )) {
        showGlobalOverview.value = false;
        showFactoryOverview.value = false;
    }
    if (data.recipe_id) {
        showFactoryOverview.value = false;
        router.push({ query: { ...route.query, recipe: data.recipe_id } });
    }
};

const setShowFactoryOverview = () => {
    showFactoryOverview.value = true;
}

onMounted(() => {
    window.addEventListener('sankey_node_clicked', handdleMouseClick);
})

onUnmounted(() => {
    window.removeEventListener('sankey_node_clicked', handdleMouseClick);
});

</script>
<template>
    <Dialog v-model:visible="showFactoryOverview" modal :header="`${factory?.id} Overview`" class="w-11"
        style="max-height: calc(100vh - 20px);">
        <SankeyfyLocal />
    </Dialog>
    <Dialog v-model:visible="showGlobalOverview" modal header="Global Overview" class="w-11"
        style="max-height: calc(100vh - 20px);">
        <Sankeyfy :graph="graph" :factories="factories" />
    </Dialog>
    <Dialog v-model:visible="createNewFactory.visible" modal header="Create a new Factory" class="w-11 md:w-8 lg:w-6">
        <div class="flex flex-wrap gap-2">
            <div class="p-inputgroup flex-1">
                <span class="p-inputgroup-addon cursor-pointer"
                    @click="() => createNewFactory.name = makeName() + ' Factory'" title="Generate a random name">
                    🏭
                </span>
                <AutoComplete v-model="createNewFactory.name" :suggestions="nameSuggestions" @complete="getSuggestions"
                    :completeOnFocus="true" />
                <Button label="Create" @click="doCreateFactory()"
                    :disabled="!createNewFactory.name.trim() || factories.find(f => f.id === createNewFactory.name.trim())" />
            </div>
        </div>
    </Dialog>
    <Dialog v-model:visible="showChangeFactoryName.visible" modal header="Edit Factory Name" class="w-11 md:w-8 lg:w-6">
        <div class="flex flex-wrap gap-2">
            <div class="p-inputgroup flex-1">
                <span class="p-inputgroup-addon cursor-pointer"
                    @click="() => showChangeFactoryName.newFactoryName = makeName() + ' Factory'"
                    title="Generate a random name">
                    🏭
                </span>
                <AutoComplete v-model="showChangeFactoryName.newFactoryName" :suggestions="nameSuggestions"
                    @complete="getSuggestions" :completeOnFocus="true" />
                <Button label="Update" @click="updateFactoryName()"
                    :disabled="!showChangeFactoryName.newFactoryName.trim() || factories.find(f => f.id === showChangeFactoryName.newFactoryName.trim())" />
            </div>
        </div>
    </Dialog>
    <Dialog v-model:visible="showPasteFactory.visible" modal header="Import Factory" class="w-11">
        <div class="flex flex-column w-full">
            <label>Import Factory As :</label>
            <div class="p-inputgroup flex-1 mb-2">
                <span class="p-inputgroup-addon cursor-pointer"
                    @click="() => showPasteFactory.importName = makeName() + ' Factory'" title="Generate a random name">
                    🏭
                </span>
                <AutoComplete v-model="showPasteFactory.importName" :suggestions="nameSuggestions"
                    @complete="getSuggestions" :completeOnFocus="true" />
            </div>
            <label>Paste factory data in this box :</label>
            <Textarea v-model="showPasteFactory.content" class="mb-2" />
            <div class="w-full flex justify-content-end">
                <Button label="Import" @click="importFactory()" />
            </div>
        </div>
    </Dialog>

    <div class="w-full z-4 toolbar">
        <FactorySelector
            :callbacks="{ showOverview, factoryToClipboard, pasteFactory, confirmDelete, editFactoryName, createFactory, setShowFactoryOverview }"
            :factories="factories" v-model="factory" />
    </div>
    <TabContent v-if="factory" :mainData="props.mainData" :modelValue="factory" :factories="factories"
            @update:modelValue="(data) => saveChanges(factory, data)" />
</template>

<style scoped>.text-xxs {
    font-size: 0.5rem;
}

.anti-padding {
    margin: -1rem;
}


.toolbar {
    height: 60px;
}

@media (max-width: 500px) {
    .toolbar {
        height: 120px;
    }
}
</style>