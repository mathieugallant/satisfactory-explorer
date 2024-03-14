<script setup>
import Dropdown from 'primevue/dropdown';
import localforage from 'localforage';
import { ref, onMounted } from 'vue';
import InputNumber from 'primevue/inputnumber';
import Panel from 'primevue/panel';
import {
    extractorFactors,
    getData,
    computePpm,
    isExtractor,
    getName,
    maxEffectiveOc,
    roundNumber,
    getUom,
    getAutobuildNames,
    computeConsumption,
} from "../utilitites";
import ConsumptionTag from './ConsumptionTag.vue';

const selectedMat = ref(null);
const allProducts = ref([]);
const recipes = ref({});

const props = defineProps(['mainData']);

const saveLastMaterial = () => {
    localforage.setItem('lastMaterial', JSON.parse(JSON.stringify(selectedMat.value)));
    updateRecipes();
};

const setTargetOverclock = (max = false) => {
    selectedMat.value.maxOverclock = max;
    saveLastMaterial();
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

onMounted(() => {
    const matSet = new Set();
    props.mainData.recipes.forEach(r => {
        r.products.forEach(p => {
            if (props.mainData.descs[p.class]?.name) {
                matSet.add(p.class);
            }
        });
    });
    localforage.getItem('lastMaterial').then(mat => {
        allProducts.value = [...matSet].map(id => {
            if (id === mat.id) {
                selectedMat.value = mat;
                return mat
            }
            return { id, name: props.mainData.descs[id]?.name || id, targetPpm: 1, maxOverclock: false }
        }).sort((a, b) => a.name.localeCompare(b.name));
        updateRecipes();
    })
});

const updateRecipes = () => {
    recipes.value = {};
    props.mainData.recipes.filter(r => r.products.map(x => x.class).includes(selectedMat.value.id)).forEach(r => {
        recipes.value[r.class] = {
            class: r.class,
            overclock: 1,
            numMachines: 1
        }
    })
    Object.keys(recipes.value).forEach(r => setPpm(r));
};

const hasAutobuild = () => {
    return !!Object.values(recipes.value).find(r => getAutobuildNames(getData(r.class)?.produced));
};

const usedInList = () => {
    return props.mainData.recipes.filter(r => {
        const product = r.products[0];
        if (props.mainData.descs[product?.class]?.name) {
            return r.ingredients.map(i=>i.class).includes(selectedMat.value.id)
        }
    });
};

const selectMaterial = (dClass) => {
    console.log(dClass)
    const mat = allProducts.value.find(m => m.id === dClass);
    if (mat) {
        selectedMat.value = mat;
        saveLastMaterial();
    }
};
</script>

<template>
    <div class="flex flex-column md:h-screen md:mt-5 md:absolute md:top-0 w-full">
        <div class="w-full z-4">
            <div class="flex justify-content-end bg-ficsit-secondary p-2">
                <div class="p-inputgroup w-full md:w-8 lg:w-6 xl:w-4">
                    <Dropdown v-model="selectedMat" :options="allProducts" optionLabel="name" filter
                        placeholder="Select a material" @change="saveLastMaterial" />
                </div>
            </div>
        </div>
        <div v-if="selectedMat" class="p-2 md:absolute md:top-0 md:pt-7 w-full z-3">
            <div class="w-full mb-4 p-2">
                <h1>{{ props.mainData.descs[selectedMat.id].name }}</h1>
                <p>{{ props.mainData.descs[selectedMat.id].description }}</p>
                <p v-if="props.mainData.descs[selectedMat.id].resourceSinkPoints">Resource Sink Points : {{
                        props.mainData.descs[selectedMat.id].resourceSinkPoints }}</p>
            </div>
            <Panel class="mb-4" v-if="Object.values(recipes).length" header="Recipes">
                <div v-if="hasAutobuild()" class="p-inputgroup w-20rem">
                    <InputNumber v-model="selectedMat.targetPpm" mode="decimal" :min="0" :minFractionDigits="0" :maxFractionDigits="5" :step="0.1" suffix=" / minute" placeholder="Target Rate" @update:modelValue="saveLastMaterial" />
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
                                        <div v-if="getAutobuildNames(getData(recipe.class)?.produced)" class="flex flex-row align-items-baseline gap-2">
                                            <ConsumptionTag :consumption="computeConsumption(recipe)" />
                                            {{recipe.numMachines}} x {{ getAutobuildNames(getData(recipe.class)?.produced, recipe.numMachines) }} @ {{ Math.round(recipe.overclock * 1000000) / 10000 }}%
                                        </div>
                                    </div>
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
            </Panel>
            <Panel v-if="Object.values(recipes).length" header="Used to make :">
                <div class="flex flex-row flex-wrap align-items-center gap-2 mt-1">
                    <div v-for="p of usedInList()" class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm border-round cursor-pointer" @click="selectMaterial(p.products[0]?.class)">
                        {{ p.name }}
                    </div>
                </div>
            </Panel>
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