<script setup>
import Dropdown from 'primevue/dropdown';
import localforage from 'localforage';
import { ref, onMounted, watch } from 'vue';
import InputNumber from 'primevue/inputnumber';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import {
    extractorFactors,
    getData,
    computePpm,
    isExtractor,
    isManual,
    getName,
    maxEffectiveOc,
    roundNumber,
    getUom,
    getAutobuildNames,
    computeConsumption,
} from "../utilitites";
import ConsumptionTag from './ConsumptionTag.vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const emits = defineEmits(['showFactoryMaterial']);

const selectedMat = ref({});
const allProducts = ref([]);
const recipes = ref({});
const usedIn = ref([]);
const factories = ref([]);
const addRecipe = ref(null);
const showAddToFactory = ref(false);

const props = defineProps(['mainData']);

const setMaterialState = () => {
    router.push({ query: { ...route.query, selectedMat: JSON.stringify(selectedMat.value) } });
    updateRecipes();
};

const setTargetOverclock = (max = false) => {
    selectedMat.value.maxOverclock = max;
    setMaterialState();
};

const setPpm = (rClass) => {
    const targetOverclock = selectedMat.value.maxOverclock ? maxEffectiveOc(rClass) : 1;
    const prodData = getData(rClass);
    const dClass = selectedMat.value.id;
    const quantity = prodData.products.find(x => x.class === dClass)?.quantity || prodData.ingredients.find(x => x.class === dClass).quantity;
    const factor = extractorFactors[dClass] || 1;

    let correction = 1;
    if (isExtractor(prodData) && ['Desc_LiquidOil_C'].includes(dClass)) {
        correction = 2;
    }

    const baseRate = (quantity /
        (props.mainData.descs[dClass].form === "RF_LIQUID" && !isExtractor(prodData) ? 1000 : 1)
    ) * (60 / prodData.duration);

    let targetNumMachines = selectedMat.value.targetPpm / factor * correction / baseRate / targetOverclock;

    if (targetNumMachines > Math.round(targetNumMachines)) {
        targetNumMachines++;
    }
    targetNumMachines = Math.round(targetNumMachines);
    recipes.value[rClass].numMachines = targetNumMachines || 1;
    recipes.value[rClass].overclock = selectedMat.value.targetPpm / (baseRate * targetNumMachines * factor) || 0;
};

watch(() => route.query, () => {
    if (route.query.selectedMat){
        const mat = JSON.parse(route.query.selectedMat);
        selectedMat.value = allProducts.value.find(p => p.id === mat.id);
        selectedMat.value.targetPpm = mat.targetPpm || 1;
        selectedMat.value.maxOverclock = mat.maxOverclock || 1;
        updateRecipes();
    }
})

onMounted(() => {
    const matSet = new Set();
    props.mainData.recipes.forEach(r => {
        r.products.filter(p => p.class).forEach(p => {
            if (p.class) {
                matSet.add(p.class);
            }
        });
    });
    const mat = JSON.parse(route.query.selectedMat || '{}');
    allProducts.value = [...matSet].map(id => {
        if (mat && id === mat.id) {
            selectedMat.value = mat;
            return mat;
        }
        return { 
            id, 
            name: props.mainData.descs[id]?.name || id, 
            targetPpm: 1, 
            maxOverclock: false 
        }
    }).sort((a, b) => {
        if (!a.name ) console.log(a)
        return a.name.localeCompare(b.name)
    });
    updateRecipes();
    localforage.getItem('factoryData').then(data => {
        factories.value = data || [];
    });
});

const updateRecipes = () => {
    recipes.value = {};
    props.mainData.recipes.filter(r => r.products.map(x => x.class).includes(selectedMat.value?.id)).forEach(r => {
        recipes.value[r.class] = {
            class: r.class,
            overclock: 1,
            numMachines: 1
        }
    })
    Object.keys(recipes.value).forEach(r => setPpm(r));

    usedInList();
};

const hasAutobuild = () => {
    return !!Object.values(recipes.value).find(r => getAutobuildNames(getData(r.class)?.produced));
};

const usedInList = () => {
    usedIn.value = props.mainData.recipes.filter(r => {
        const product = r.products.find(p => p.class);
        if (props.mainData.descs[product?.class]?.class) {
            return r.ingredients.map(i=>i.class).includes(selectedMat.value.id)
        }
    }).sort((a,b) => a.name.localeCompare(b.name));
};

const selectMaterial = (dClass) => {
    const mat = allProducts.value.find(m => m.id === dClass);
    if (mat) {
        selectedMat.value = mat;
        setMaterialState();
    }
};

const checkAddToFactory = (recipe) => {
    addRecipe.value = recipe;
    showAddToFactory.value = true;
}

const addRecipeToFactory = (factoryId) => {
    const targetFactory = factories.value.find(f => f.id === factoryId);
    targetFactory.factoryData[addRecipe.value.class] = {
        class: addRecipe.value.class,
        overclock: targetFactory.factoryData[addRecipe.value.class]?.overclock || addRecipe.value.overclock,
        numMachines: targetFactory.factoryData[addRecipe.value.class]?.numMachines || addRecipe.value.numMachines,
        index: targetFactory.factoryData[addRecipe.value.class]?.index || Object.keys(targetFactory.factoryData).length
    };

    showAddToFactory.value = false;
    localforage
        .setItem('factoryData', JSON.parse(JSON.stringify(factories.value)))
        .then(() => {
            router.push({ query: { ...route.query, mode: 'planner', factory: factoryId, recipe: addRecipe.value.class } });
        });
};
</script>

<template>
    <Dialog v-model:visible="showAddToFactory" header="Add recipe to factory" modal>
        <div>
            <div class="flex flex-row flex-center">
                <div class="mr-5 flex justify-content-end align-items-center">
                    {{ mainData.recipes.find(r => r.class == addRecipe.class).name }}
                </div>
                <i class="pi pi-arrow-right text-xl" />
                <div class="ml-5 flex flex-column justify-content-center align-items-start gap-1">
                    <div v-for="factory of factories.filter(f => !Object.keys(f.factoryData).includes(addRecipe.class))" class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm border-round cursor-pointer" @click="addRecipeToFactory(factory.id)">
                        {{ factory.id }}
                    </div>
                </div>
            </div>
            <div class="text-sm text-400 mt-4">
                Note: Factories which already produce this recipe are not shown.
            </div>
        </div>
    </Dialog>
    <div class="w-full z-4 flex justify-content-end bg-ficsit-secondary p-2" style="height: 60px;">
        <div class="max-w-full p-inputgroup w-full md:w-8 lg:w-6 xl:w-4">
            <Dropdown v-model="selectedMat" :options="allProducts" optionLabel="name" filter
                placeholder="Select a material" @change="setMaterialState">
                <template #option="slotProps">
                    <div>
                        <div>{{ slotProps.option.name }}</div>
                        <div class="text-sm text-400">{{ slotProps.option.id }}</div>
                    </div>
                </template>
            </Dropdown>
        </div>
    </div>
    <div class="w-full md:overflow-y-scroll" style="height: calc(100vh - 92px);">
        <div v-if="selectedMat.id" class="w-full flex flex-column gap-3 p-2">
            <div class="w-full">
                <h1 class="mb-0">{{ props.mainData.descs[selectedMat.id].name }}</h1>
                <span class="text-400">{{ selectedMat.id }}</span>
                <p>{{ props.mainData.descs[selectedMat.id].description }}</p>
                <p v-if="props.mainData.descs[selectedMat.id].resourceSinkPoints">Resource Sink Points : {{
                        props.mainData.descs[selectedMat.id].resourceSinkPoints }}</p>
            </div>
            <div v-if="Object.values(recipes).length" class="surface-card surface-border border-1 border-round-md p-3">
                <h3 class="mt-2">Recipes</h3>
                <div v-if="hasAutobuild()" class="p-inputgroup w-20rem">
                    <InputNumber v-model="selectedMat.targetPpm" mode="decimal" :min="0" :minFractionDigits="0" :maxFractionDigits="5" :step="0.1" suffix=" / minute" placeholder="Target Rate" @update:modelValue="setMaterialState" />
                    <span title="Balance for maximum overclock"
                        class="p-inputgroup-addon cursor-pointer"
                        @click="setTargetOverclock(true)">
                        🚀
                    </span>
                    <span title="Balance without overclock"
                        class="p-inputgroup-addon cursor-pointer"
                        @click="setTargetOverclock(false)">
                        ⚖️
                    </span>
                </div>
                <div v-else>Manual build only material</div>
                <div class="w-full flex flex-row flex-wrap">
                    <div v-for="recipe of recipes" :id="recipe.class" class="col-12 lg:col-6 xl:col-4 mt-2 p-1">
                        <div class="col-12 p-2 shadow-2 surface-50 flex flex-column h-full">
                            <div class="col-12 flex justify-content-between">
                                <div class="flex flex-row align-items-center flex-grow-1">
                                    <div class="flex flex-column">
                                        <h3 class="m-0">
                                            {{ getData(recipe.class).name }}
                                        </h3>
                                        <div v-if="getAutobuildNames(getData(recipe.class)?.produced)" class="flex flex-column md:flex-row align-items-baseline gap-2">
                                            <ConsumptionTag :consumption="computeConsumption(recipe)" />
                                            <div>
                                                {{recipe.numMachines}} x {{ getAutobuildNames(getData(recipe.class)?.produced, recipe.numMachines) }} @ {{ Math.round(recipe.overclock * 1000000) / 10000 }}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div v-if="!isManual(getData(recipe.class))">
                                    <Button icon="pi pi-plus" severity="success"
                                        @click="checkAddToFactory(recipe)" size="small"
                                        class="w-2rem h-2rem" />
                                </div>
                            </div>
                            <div class="col-12 material-list flex-grow-1">
                                <div class="mats">
                                    <div class="flex flex-column border-300 mats-in w-full">
                                        <div>Inputs</div>
                                        <div v-if="!getData(recipe.class).ingredients?.length" class="text-sm mt-1">None
                                        </div>
                                        <div v-for="p of getData(recipe.class).ingredients"
                                            class="flex flex-row align-items-center-center mt-1">
                                            <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm border-round-left cursor-pointer" @click="selectMaterial(p.class)">
                                                {{ getName(p.class) }}
                                            </div>
                                            <div class="px-1 border-1 border-400 text-sm border-round-right">
                                                <span>
                                                    {{ roundNumber(computePpm(p.quantity, p.class, recipe)) }}
                                                </span>
                                                <span class="text-xxs">
                                                    {{ getUom(p.class, recipe) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="w-full">
                                        <div>Outputs</div>
                                        <div v-if="!getData(recipe.class).products?.length" class="text-sm mt-1">None
                                        </div>
                                        <div v-for="p of getData(recipe.class).products"
                                            class="flex flex-row align-items-center-center mt-1">
                                            <div class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm border-round-left cursor-pointer" @click="selectMaterial(p.class)">
                                                {{ props.mainData.descs[p.class].name || getData(recipe.class).name
                                                }}
                                            </div>
                                            <div class="px-1 border-1 border-400 text-sm border-round-right">
                                                <span>
                                                    {{ roundNumber(computePpm(p.quantity, p.class, recipe)) }}
                                                </span>
                                                <span class="text-xxs">
                                                    {{ getUom(p.class, recipe) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="getData(recipe.class).message" class="col-12">
                                <div class="w-full border-round border-2 border-yellow-900 p-2 text-sm">
                                    👉 {{ getData(recipe.class).message }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div v-if="Object.values(recipes).length" class="surface-card surface-border border-1 border-round-md p-3">
                <h3 class="mt-2">Used to make :</h3>
                <div class="flex flex-row flex-wrap align-items-center gap-2 mt-1">
                    <div v-for="p of usedIn" class="px-1 bg-green-700 text-white border-1 border-400 text-sm border-round cursor-pointer" @click="selectMaterial(p.products[0]?.class)">
                        {{ p.name }}
                    </div>
                    <div v-if="!usedIn.length">Nothing...</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.material-list {
    container-type: inline-size;
}

.mats {
    display: block;
}

.mats-in {
    margin-bottom: 1rem;
}

@container (min-width: 500px) {
    .mats {
        display: flex;
    }

    .mats-in {
        align-items: end;
        border-right: 1px solid;
        padding-right: 0.5rem;
        margin-right: 0.5rem;
        margin-bottom: 0rem;
    }
}
</style>