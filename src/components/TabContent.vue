<script setup>
import { ref, watch, onMounted } from 'vue';

import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import Dialog from 'primevue/dialog';
import { useConfirm } from "primevue/useconfirm";
import {
    extractorFactors,
    computeFactoryConsumption,
    getData,
    getAllNetDefecits,
    getAllNetProduction,
    computePpm,
    getName,
    computeSupply,
    roundNumber,
    isExtractor,
    getUom,
    getAutobuildNames,
    computeConsumption,
} from "../utilitites";
const confirm = useConfirm();

import SupplyDisplay from './SupplyDisplay.vue';

import DataView from 'primevue/dataview';

const props = defineProps(['mainData', 'modelValue']);
const emits = defineEmits(['update:modelValue']);

const productForRecipe = ref();
const selectedRecipe = ref();
const recipes = ref({});
const targetPpm = ref({});
const layout = ref('grid');
const showSelectRecipe = ref(false);
const possibleRecipes = ref([]);
const dragging = ref(null);
const dragHover = ref(null);
const holdAdjustMachines = {
    class: null,
    count: 0,
    rate: 0,
    multiplier: 0
};

onMounted(() => {
    recipes.value = props.modelValue.factoryData || {};
    window.addEventListener('mouseup', () => {
        holdAdjustMachines.class = null;
        holdAdjustMachines.count = 0;
        holdAdjustMachines.rate = 0;
        holdAdjustMachines.multiplier = 0;
    })
    setInterval(() => {
        if (holdAdjustMachines.class) {
            holdAdjustMachines.count++;

            if (holdAdjustMachines.count > 5) {
                holdAdjustMachines.rate = 1;
            }
            recipes.value[holdAdjustMachines.class].numMachines += holdAdjustMachines.rate * holdAdjustMachines.multiplier;
            if (recipes.value[holdAdjustMachines.class].numMachines <= 1) {
                recipes.value[holdAdjustMachines.class].numMachines = 1;
            }
        }
    }, 80)
});

const addRecipe = (recipe = null) => {
    if((selectedRecipe.value || recipe)  && !recipes.value[(selectedRecipe.value || recipe).class]) {
        const rClass = (selectedRecipe.value || recipe).class;
        recipes.value[rClass] = {
            class: rClass,
            overclock: 1,
            numMachines: 1,
            index: Object.keys(recipes.value).length
        };
        selectedRecipe.value = null;
    }
    showSelectRecipe.value = false;
};

const getFactoryConsumption = () => {
    return computeFactoryConsumption(recipes.value);
};

const removeRecipe = (dClass) => {
    delete recipes.value[dClass];
    adjustIndexes();
};

const getMkSpread = (dClass) => {
    const spread = [{l: '1', x: 1}];
    if (props.mainData.descs[dClass].form !== "RF_LIQUID") {
        return spread.concat([{l: '2', x: 2}, {l: '3', x: 4}])
    }
    return spread;
};

const adjustOverclock = (dClass, data) => {
    data.overclock = 1;
    const prodData = getData(data.class);
    const supply = computeSupply(dClass, recipes.value);
    const quantity = computePpm(prodData.products.find(x=>x.class === dClass).quantity, dClass, data);
    data.overclock -= supply / quantity;
};

const adjustInputOverclock = (dClass, data) => {
    data.overclock = 1;
    const prodData = getData(data.class);
    const supply = computeSupply(dClass, recipes.value);
    const quantity = computePpm(prodData.ingredients.find(x=>x.class === dClass).quantity, dClass, data);
    data.overclock += supply / quantity;
};

const confirmRemoveRecipe = (dClass) => {

    confirm.require({
        message: `Remove "${getData(dClass).name}" from the setup?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => {
            removeRecipe(dClass);
        }
    });
};

const adjustIndexes = () => {
    Object.values(recipes.value).sort((a,b) => a.index-b.index).forEach((x,i) => x.index = i);
};

const sortListAlpha = () => {
    Object.values(recipes.value).sort((a,b) => {
        const stringA = getData(a.class).name;
        const stringB = getData(b.class).name;
        return stringA.localeCompare(stringB);
    }).forEach((x,i) => x.index = i);
};

const startDrag = (index) => {
    dragging.value = index;
};

const moveToPosition = (e, index) => {
    e.preventDefault();

    if(dragging.value !== index) {
        const target = Object.values(recipes.value).find(x=>x.index===dragging.value) || Object.values(recipes.value)[dragging.value];
        target.index = index - 0.5;
        adjustIndexes();
    }
    dragging.value = null;
};

const showDragHoverEffect = (e, index) => {
    e.preventDefault();
    dragHover.value = index;
};

const startHoldAdjust = (rClass, adjust) => {
    if (recipes.value[rClass].numMachines + adjust) {
        recipes.value[rClass].numMachines += adjust;
    }
    holdAdjustMachines.class = rClass;
    holdAdjustMachines.multiplier = adjust;
};

const startSetPpm = (rClass, dClass, interactive=true) => {
    const data = getData(rClass);
    if (getAutobuildNames(data?.produced)) {
        targetPpm.value.visible = interactive;
        targetPpm.value.rClass = rClass;
        targetPpm.value.dClass = dClass;
        const quantity = data.products.find(x=>x.class === dClass)?.quantity || data.ingredients.find(x=>x.class === dClass).quantity;
        targetPpm.value.ppm = computePpm(quantity, dClass, recipes.value[rClass]);
        if (!interactive) {
            setPpm();
        }
    }
};

const setPpm = () => {
    const prodData = getData(targetPpm.value.rClass);
    const dClass = targetPpm.value.dClass;
    const quantity = prodData.products.find(x=>x.class === dClass)?.quantity || prodData.ingredients.find(x=>x.class === dClass).quantity;
    const factor = extractorFactors[dClass] || 1;

    targetPpm.value.visible = false;

    let correction = 1;
    if (isExtractor(prodData) && ['Desc_LiquidOil_C'].includes(dClass)) {
        correction = 2;
    }

    const baseRate = (quantity / 
        (props.mainData.descs[dClass].form === "RF_LIQUID" && !isExtractor(prodData)  ? 1000 : 1)
    ) * (60 / prodData.duration);

    let targetNumMachines = targetPpm.value.ppm / factor * correction / baseRate;

    if (targetNumMachines > Math.round(targetNumMachines)) {
        targetNumMachines++;
    }
    targetNumMachines = Math.round(targetNumMachines);
    recipes.value[targetPpm.value.rClass].numMachines = targetNumMachines;
    recipes.value[targetPpm.value.rClass].overclock = targetPpm.value.ppm / (baseRate * targetNumMachines);
};

const getProducingCandidates = (productClass) => {
    return Object.keys(recipes.value).filter(r => getData(r)?.products?.find(x=>x.class === productClass)?.quantity);
};

const checkScrollToOutput = (productClass, startingCandidate = null) => {
    const candidates = getProducingCandidates(productClass);
    scrollToOutput(candidates, startingCandidate);
};

const checkAddRecipe = (pClass) => {
    productForRecipe.value = getName(pClass) || pClass;
    const candidates = getProducingCandidates(pClass);
    if (candidates.length) {
        scrollToOutput(candidates);
    }
    else {
        possibleRecipes.value = props.mainData.recipes.filter(r => r.products.find(p => p.class === pClass));
        if (possibleRecipes.value.length) {
            showSelectRecipe.value = true;
        }
    }
};

const scrollToOutput = (candidates, startingCandidate = null) => {
    if (candidates.length) {
        let index = candidates.indexOf(startingCandidate);
      
        if (index >= 0 && index < candidates.length - 1) {
            index++;
        }
        else index = 0;
        const scrolltarget = document.getElementById(candidates[index]);
        if (scrolltarget) {
            scrolltarget.style.boxShadow = '0 0 8px #FA9549';
            scrolltarget.style.backgroundColor = '#FA9549';
            scrolltarget.scrollIntoView({ behavior: 'smooth', block: 'start' });
            setTimeout(() => {
                scrolltarget.style.boxShadow = 'none';
                scrolltarget.style.backgroundColor = 'unset';
            }, 1500);
        }
    }
}

watch(recipes, () => {
    emits('update:modelValue', recipes.value);
}, { deep: true });

watch(() => props.modelValue, () => {
    recipes.value = {};
    Object.keys(props.modelValue.factoryData || {}).forEach(k => {
        if (props.modelValue.factoryData[k]) {
            recipes.value[k] = props.modelValue.factoryData[k];
        }
    });
});

</script>

<template>
    <Dialog v-model:visible="showSelectRecipe" modal :header="'Add a Recipe for ' + productForRecipe">
        <div class="mb-2">
            Pick a recipe to add :
        </div>
        <div class="flex flex-wrap gap-2">
            <Button v-for="recipe of possibleRecipes" :label="recipe.name" @click="addRecipe(recipe)"/>
        </div>
    </Dialog>
    <Dialog v-model:visible="targetPpm.visible" modal header="Set Desired Rate Value">
        <div class="p-inputgroup flex flex-row">
            <InputNumber v-model="targetPpm.ppm" :useGrouping="false" class="w-full" :min="1" :minFractionDigits="0" :maxFractionDigits="8" :suffix="getUom(targetPpm.dClass, recipes[targetPpm.rClass])" />
            <Button label="Set!" :disabled="!Number(targetPpm.ppm)" @click="setPpm()"/>
        </div>
    </Dialog>
    <div class="md:absolute md:top-0 md:left-0 md:pt-7 md:max-h-screen flex flex-column p-2 w-full">
        <div class="w-full grid mb-2 p-1 pt-2">
            <div class="col-12 md:col-6 md:border-right-1 border-300">
                <h4 class="m-0 mb-1">Requied Inputs / min<span class="text-red-600">▼</span></h4>
                <div class="flex flex-wrap gap-1">
                    <div v-for="p of getAllNetDefecits(recipes)" class="flex flex-row align-items-center-center cursor-pointer" @click="checkAddRecipe(p.desc)">
                        <div class="px-1 bg-ficsit-secondary text-white border-1 border-right-none border-round-left border-400 text-sm">
                            {{ p.name }}
                        </div>
                        <div class="px-1 border-1 border-400 text-sm border-round-right">
                            <SupplyDisplay :supply="roundNumber(p.value)" />
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-12 md:col-6">            
                <h4 class="m-0 mb-1">Net Production / min <span class="text-green-600">▲</span></h4>
                <div class="flex flex-wrap gap-1 justify-content-start">
                    <div v-for="p of getAllNetProduction(recipes)" class="flex flex-row align-items-center-center cursor-pointer" @click="checkAddRecipe(p.desc)">
                        <div class="px-1 bg-ficsit-primary text-white border-1 border-right-none border-400 text-sm  border-round-left">
                            {{ p.name }}
                        </div>
                        <div class="px-1 border-1 border-400 text-sm border-round-right">
                            <SupplyDisplay :supply="roundNumber(p.value)" />
                        </div>
                    </div>
                </div>
            </div>        
        </div>
        <div class="border-x-1 border-1 border-100 flex-grow-1 md:overflow-y-auto md:mb-5">
            <DataView :value="Object.values(recipes).sort((a,b) => a?.index - b?.index)" :layout="layout">
                <template #header>
                    <div class="flex flex-column md:flex-row md:justify-content-between">
                        <div class="flex flex-row align-items-center gap-2">
                            <h3 class="m-1 cursor-pointer" @click="sortListAlpha()" title="Click to sort">Production Setup <i class="pi pi-sort-alpha-down" /></h3>
                            <div class="flex flex-row text-sm mt-1">
                                <div class="border-1 flex align-items-center border-round-left border-400 px-1 ">
                                    Total <i class="pi pi-bolt text-yellow-500" />
                                </div>
                                <div class="border-y-1 border-right-1 p-1 border-round-right white-space-nowrap border-400 px-1 py-0">
                                    {{ getFactoryConsumption() }} <span class="text-xxs">MW/h</span>
                                </div>
                            </div>
    
                        </div>
                        <div class="p-inputgroup w-20rem">
                            <Dropdown v-model="selectedRecipe" :options="props.mainData.recipes" filter optionLabel="name" placeholder="Select a Recipe" class="w-full md:w-14rem">
                            </Dropdown>
                            <Button icon="pi pi-plus" class="bg-bluegray-600 hover:bg-bluegray-400 border-bluegray-700" @click="addRecipe()"/>
                        </div>
                    </div>
                </template>
                <template #grid="slotProps">
                    <div
                        :id="slotProps.data.class"
                        draggable="true"
                        :class="'col-12 lg:col-6 xl:col-4 mt-2 p-1 recipe-card ' + (dragHover === slotProps.index && dragging !== slotProps.index ? 'hover-effect':'')" 
                        @drop="e => moveToPosition(e, slotProps.index)" 
                        @dragstart="startDrag(slotProps.index)"
                        @dragover="e=>showDragHoverEffect(e, slotProps.index)"
                        @dragend="()=> {dragHover = null}"
                    >
                        <div class="col-12 p-2 shadow-2 surface-50">
                            <div class="col-12 flex justify-content-between">
                                <div class="flex flex-row align-items-center flex-grow-1">
                                    <div class="flex flex-column">
                                        <h3 class="m-0">
                                            {{ getData(slotProps.data.class).name }}
                                        </h3>
                                        <div v-if="computeConsumption(slotProps.data)" class="flex flex-row text-sm mt-1">
                                            <div class="border-1 flex align-items-center border-round-left border-400 px-1 ">
                                                <i class="pi pi-bolt text-yellow-500" />
                                            </div>
                                            <div class="border-y-1 border-right-1 p-1 border-round-right white-space-nowrap border-400 px-1 py-0">
                                                {{ computeConsumption(slotProps.data) }} <span class="text-xxs">MW/h</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Button icon="pi pi-times" severity="danger" @click="confirmRemoveRecipe(slotProps.data.class)" size="small" class="w-2rem h-2rem" />
                                </div>
                            </div>
                            <div v-if="false && isExtractor(slotProps.data)" class="col-12 grid">
                                <div v-for="p of getData(slotProps.data.class).products" class="col-12">
                                    <div v-for="mk of getMkSpread(p.class)" class="w-full flex flex-row mt-1">
                                        <div class="px-1 bg-ficsit-primary border-1 border-400 text-white text-sm  border-round-left">
                                            <input type="radio" :id="'option' + mk.l " :value="mk.l" :name="slotProps.data.class" v-model="slotProps.data.mkSelection">
                                            {{ getName(p.class) }} (Mk. {{mk.l}})
                                        </div>
                                        <div class="px-1 border-1 text-sm">
                                            <div>
                                                <span>
                                                    {{ computePpm(p.quantity * mk.x, p.class, slotProps.data) }}
                                                </span>
                                                <span class="text-xxs">
                                                    {{ getUom(p.class, slotProps.data) }}
                                                </span>
                                            </div>
                                            <div class="w-full text-center text-xxs">
                                                Impure
                                            </div>
                                        </div>
                                        <div class="px-1 border-y-1 text-sm">
                                            <div>
                                                <span>
                                                    {{ computePpm(p.quantity * 2 * mk.x, p.class, slotProps.data) }}
                                                </span>
                                                <span class="text-xxs">
                                                    {{ getUom(p.class, slotProps.data) }}
                                                </span>
                                            </div>
                                            <div class="w-full text-center text-xxs">
                                                Normal
                                            </div>
                                        </div>
                                        <div class="px-1 border-1 text-sm  border-round-right">
                                            <div>
                                                <span>
                                                    {{ computePpm(p.quantity * 4 * mk.x, p.class, slotProps.data) }}
                                                </span>
                                                <span class="text-xxs">
                                                    {{ getUom(p.class) }}
                                                </span>
                                            </div>
                                            <div class="w-full text-center text-xxs">
                                                Pure
                                            </div>
                                        </div>
                                    </div>                    
                                </div>
                            </div>
                            <div v-else class="col-12 material-list">
                                <div class="mats">
                                    <div class="flex flex-column border-300 mats-in w-full">
                                        <div>Inputs</div>
                                        <div v-for="p of getData(slotProps.data.class).ingredients" class="flex flex-row align-items-center-center mt-1">
                                            <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer border-round-left" @click="checkAddRecipe(p.class)">
                                                {{ getName(p.class) }}
                                            </div>
                                            <div class="border-y-1 border-400 text-sm cursor-pointer" @click="adjustInputOverclock(p.class, slotProps.data)">
                                                <SupplyDisplay :supply="roundNumber(computeSupply(p.class, recipes))" />
                                            </div>
                                            <div class="px-1 border-1 border-400 text-sm cursor-pointer  border-round-right" @click="startSetPpm(slotProps.data.class, p.class)">
                                                <span>
                                                    {{ roundNumber(computePpm(p.quantity, p.class, slotProps.data)) }}
                                                </span>
                                                <span class="text-xxs">
                                                    {{ getUom(p.class, slotProps.data) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="w-full">
                                        <div>Outputs</div>
                                        <div v-for="p of getData(slotProps.data.class).products" class="flex flex-row align-items-center-center mt-1">
                                            <div class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm  border-round-left" @click="checkScrollToOutput(p.class, slotProps.data.class)">
                                                {{ props.mainData.descs[p.class].name || getData(slotProps.data.class).name }}
                                            </div>
                                            <div class="border-y-1 border-400 text-sm cursor-pointer" @click="adjustOverclock(p.class, slotProps.data)">
                                                <SupplyDisplay :supply="roundNumber(computeSupply(p.class, recipes))" />
                                            </div>
                                            <div class="px-1 border-1 border-400 text-sm cursor-pointer border-round-right"  @click="startSetPpm(slotProps.data.class, p.class)">
                                                <span>
                                                    {{ roundNumber(computePpm(p.quantity, p.class, slotProps.data)) }}
                                                </span>
                                                <span class="text-xxs">
                                                    {{ getUom(p.class, slotProps.data) }}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div v-if="getAutobuildNames(getData(slotProps.data.class)?.produced)" class="col-12">
                                <div class="w-full">
                                    <div class="p-inputgroup flex-1">
                                        <span title="Set overclock ratio : 1 = 100%" class="p-inputgroup-addon">
                                            🚀
                                        </span>
                                        <InputText v-model.number="slotProps.data.overclock" class="w-full" />
                                        <span title="Balance without overclock" class="p-inputgroup-addon cursor-pointer" @click="startSetPpm(slotProps.data.class, getData(slotProps.data.class).products[0].class, false)">
                                            ⚖️
                                        </span>
                                        <span title="Reset to 100% without balancing" class="p-inputgroup-addon cursor-pointer" @click="() => slotProps.data.overclock = 1">
                                            <i class="pi pi-refresh" />
                                        </span>
                                    </div>
                                    <Slider v-model="slotProps.data.overclock" class="w-full" :max="2.5" :step="0.05" style="margin-top: -1px;"/>
                                </div>
                                <div class="w-full mt-3">
                                    <div class="p-inputgroup flex-1">
                                        <Button icon="pi pi-minus" @mousedown="() => startHoldAdjust(slotProps.data.class, -1)"/>
                                        <InputNumber v-model="slotProps.data.numMachines" inputId="minmax-buttons" mode="decimal" :min="1" :suffix="'x ' + getAutobuildNames(getData(slotProps.data.class)?.produced, slotProps.data.numMachines)"/>
                                        <Button icon="pi pi-plus" @mousedown="() => startHoldAdjust(slotProps.data.class, 1)"/>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </template>      
            </DataView>
        </div>
    </div>
</template>

<style scoped>
.recipe-card {
    transition: all 0.5s ease-in-out;
}
.searched-highlight {
    box-shadow: 0 0 8px #FA9549BB;
}
.hover-effect {
    transform: translateX(8px);
}
.hover-effect::before {
  content: '';
  position: absolute;
  left: -6px;
  top: 0;
  height: 100%;
  width: 4px;
  background: #FA9549EE;
  box-shadow: 0 0 8px #FA9549BB;
  border-radius: 2px;
}
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