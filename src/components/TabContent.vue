<script setup>
import { ref, watch, onMounted, onUnmounted, computed, nextTick } from 'vue';
import ContextMenu from 'primevue/contextmenu';
import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import Dialog from 'primevue/dialog';
import { useConfirm } from "primevue/useconfirm";
import {
    computeFactoryConsumption,
    getData,
    computePpm,
    getName,
    computeSupply,
    getGlobalProductDeficit,
    roundNumber,
    isExtractor,
    isManual,
    getUom,
    getAutobuildNames,
    computeConsumption,
    getMaxSloops,
    maxEffectiveOc,
} from "../utilitites";

import SupplyDisplay from './SupplyDisplay.vue';
import FactoryIOs from './FactoryIOs.vue';
import ConsumptionTag from './ConsumptionTag.vue';

import DataView from 'primevue/dataview';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const confirm = useConfirm();

const props = defineProps(['mainData', 'modelValue', 'factories']);
const emits = defineEmits(['update:modelValue']);

const menu = ref();
const items = ref([
    { label: 'Select', icon: 'pi pi-plus', command: () => {
        checkAddRecipe(menu.value.product) 
    }},
    { label: 'Explore', icon: 'pi pi-search', command: () => {
        goToCompare(getData(menu.value.product), menu.value.ppm) 
    }}
]);

const productForRecipe = ref({});
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
const graph = ref({ nodes: [], links: [] });

const onProductRightClick = (event, pClass, ppm) => {
    menu.value.product = pClass;
    menu.value.ppm = ppm;
    menu.value.show(event);
};

const copyTextToClipboard = (text) => {
    navigator.clipboard.writeText(text)
}

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
    }, 80);
    window.addEventListener('sankey_node_clicked', handdleMouseClick);
    if (route.query.recipe) {
        router.push({ query: { ...route.query, recipe: null } });
        nextTick(() => {
            scrollTo([route.query.recipe]);
        })
    }
});

const handdleMouseClick = (e) => {
    const data = e.detail.data;
    if (data.material_class && data.produced === 0) {
        checkAddRecipe(data.material_class);
    }
};

onUnmounted(() => {
    window.removeEventListener('sankey_node_clicked', handdleMouseClick);
});

const addRecipe = (recipe = null) => {
    if ((selectedRecipe.value || recipe) && !recipes.value[(selectedRecipe.value || recipe).class]) {
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

const balanceInput = (dClass, rData) => {
    const prodData = getData(rData.class);
    targetPpm.value.rClass = rData.class;
    targetPpm.value.dClass = prodData.products[0].class;
    const currentIngredientPpm = computePpm(prodData.ingredients.find(x => x.class === dClass).quantity, dClass, rData, true);
    const currentIngredientSupply = computeSupply(dClass, recipes.value);
    const maxSloops = getMaxSloops(rData.class);
    const sloopFactor = maxSloops ? 1 + (recipes.value[targetPpm.value.rClass].sloopNumber || 0) / maxSloops : 1
    const targetRatio = (currentIngredientPpm + currentIngredientSupply) / currentIngredientPpm;
    targetPpm.value.ppm = computePpm(prodData.products[0]?.quantity, prodData.products[0].class, recipes.value[rData.class], true) * targetRatio * sloopFactor;
    setPpm();
};

const balanceOutput = (dClass, rData) => {
    const data = getData(rData.class);
    if (getAutobuildNames(data?.produced)) {
        targetPpm.value.rClass = rData.class;
        targetPpm.value.dClass = dClass;
        const quantity = data.products.find(x => x.class === dClass)?.quantity;
        targetPpm.value.ppm = computePpm(quantity, dClass, recipes.value[rData.class]) - computeSupply(dClass, recipes.value);
        setPpm();
    }
};

const balanceOutputGlobal = (dClass, rData) => {
    const data = getData(rData.class);
    if (getAutobuildNames(data?.produced)) {
        targetPpm.value.rClass = rData.class;
        targetPpm.value.dClass = dClass;
        const quantity = data.products.find(x => x.class === dClass)?.quantity;
        targetPpm.value.ppm = computePpm(quantity, dClass, recipes.value[rData.class]);
        targetPpm.value.ppm += getGlobalProductDeficit(dClass, props.factories).value * -1;
        setPpm();
    }
};

const balanceInputGlobal = (dClass, rData) => {
    const prodData = getData(rData.class);
    targetPpm.value.rClass = rData.class;
    targetPpm.value.dClass = prodData.products[0].class;
    const currentIngredientPpm = computePpm(prodData.ingredients.find(x => x.class === dClass).quantity, dClass, rData, true);
    const currentIngredientSupply = getGlobalProductDeficit(dClass, props.factories).value;
    const maxSloops = getMaxSloops(rData.class);
    const sloopFactor = maxSloops ? 1 + (recipes.value[targetPpm.value.rClass].sloopNumber || 0) / maxSloops : 1
    const targetRatio = (currentIngredientPpm + currentIngredientSupply) / currentIngredientPpm;
    targetPpm.value.ppm = computePpm(prodData.products[0]?.quantity, prodData.products[0].class, recipes.value[rData.class], true) * targetRatio * sloopFactor;
    setPpm();
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
    Object.values(recipes.value).sort((a, b) => a.index - b.index).forEach((x, i) => x.index = i);
};

const sortListAlpha = () => {
    Object.values(recipes.value).sort((a, b) => {
        const stringA = getData(a.class).name;
        const stringB = getData(b.class).name;
        return stringA.localeCompare(stringB);
    }).forEach((x, i) => x.index = i);
};

const startDrag = (index) => {
    dragging.value = index;
};

const moveToPosition = (e, index) => {
    e.preventDefault();

    if (dragging.value !== index) {
        const target = Object.values(recipes.value).find(x => x.index === dragging.value) || Object.values(recipes.value)[dragging.value];
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

const startSetPpm = (rClass, dClass, interactive = true, targetOverclock = 1) => {
    const data = getData(rClass);
    if (getAutobuildNames(data?.produced)) {
        targetPpm.value.visible = interactive;
        targetPpm.value.rClass = rClass;
        targetPpm.value.dClass = dClass;
        const quantity = data.products.find(x => x.class === dClass)?.quantity || data.ingredients.find(x => x.class === dClass).quantity;
        targetPpm.value.ppm = computePpm(quantity, dClass, recipes.value[rClass]);
        if (!interactive) {
            setPpm(targetOverclock);
        }
    }
};

const setPpm = (targetOverclock = 1) => {
    const prodData = getData(targetPpm.value.rClass);
    const dClass = targetPpm.value.dClass;
    const quantity = prodData.products.find(x => x.class === dClass)?.quantity || prodData.ingredients.find(x => x.class === dClass).quantity;

    targetPpm.value.visible = false;

    let correction = 1;
    if (isExtractor(prodData) && ['Desc_LiquidOil_C'].includes(dClass)) {
        correction = 2;
    }

    const maxSloops = getMaxSloops(targetPpm.value.rClass);
    const sloopFactor = maxSloops ? 1 + (recipes.value[targetPpm.value.rClass].sloopNumber || 0) / maxSloops : 1

    const baseRate = (quantity /
        (["RF_LIQUID", "RF_GAS"].includes(props.mainData.descs[dClass].form) ? 1000 : 1) * correction
    ) * (60 / prodData.duration) * sloopFactor;

    let targetNumMachines = targetPpm.value.ppm / correction / baseRate / targetOverclock;

    if (targetNumMachines > Math.round(targetNumMachines)) {
        targetNumMachines++;
    }
    targetNumMachines = Math.round(targetNumMachines);
    recipes.value[targetPpm.value.rClass].numMachines = targetNumMachines || 1;
    recipes.value[targetPpm.value.rClass].overclock = targetPpm.value.ppm / (baseRate * targetNumMachines) || 0;
};

const getCandidates = (productClass) => {
    return Object.keys(recipes.value).filter(r => getData(r)?.products?.find(x => x.class === productClass)?.quantity || getData(r)?.ingredients?.find(x => x.class === productClass)?.quantity);
};

const getProducingCandidates = (productClass) => {
    return Object.keys(recipes.value).filter(r => getData(r)?.products?.find(x => x.class === productClass)?.quantity).length;
};

const checkScrollTo = (productClass, startingCandidate = null) => {
    const candidates = getCandidates(productClass);
    scrollTo(candidates, startingCandidate);
};

const checkAddRecipe = (pClass, startingCandidate = null) => {
    productForRecipe.value = {name: getName(pClass) || pClass, class: pClass};
    const candidates = getCandidates(pClass);
    if (getProducingCandidates(pClass) && candidates.length) {
        scrollTo(candidates, startingCandidate);
    }
    else {
        possibleRecipes.value = props.mainData.recipes.filter(r => r.products.find(p => p.class === pClass));
        if (possibleRecipes.value.length) {
            showSelectRecipe.value = true;
        }
    }
};

const scrollTo = (candidates, startingCandidate = null) => {
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

const selectableRecipies = computed(() => {
    return props.mainData.recipes.filter(r => {
        return !isManual(r);
    }).sort((a,b) => a.name.localeCompare(b.name));
});

watch(() => route.query, () => {
    if (route.query.recipe){
        router.push({ query: { ...route.query, recipe: null} });
        scrollTo([route.query.recipe]);
    }
});

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

const goToCompare = (product, targetPpm = 1) => {
    router.push({ query: { ...route.query, mode: 'explorer', selectedMat: JSON.stringify({id: product.class, name: product.name, targetPpm: Math.abs(targetPpm) || 1}) } });
}
</script>

<template>
    <ContextMenu ref="menu" :model="items" />
    <Dialog v-model:visible="showSelectRecipe" modal header=" ">
        <div class="flex flex-column flex-center">
            <div class="mb-2 w-full">
                Pick a recipe to add to this factory :
            </div>
            <div class="flex flex-wrap gap-2">
                <Button v-for="recipe of possibleRecipes" :label="recipe.name" @click="addRecipe(recipe)" />
            </div>
            <div class="my-3">-OR-</div>
            <div class="border-1 border-400 border-round-sm p-2 bg-green-700 cursor-pointer" @click="goToCompare(productForRecipe, roundNumber(computeSupply(productForRecipe.class, recipes)))">Compare in Explorer</div>
        </div>
    </Dialog>
    <Dialog v-model:visible="targetPpm.visible" modal header="Set Desired Rate Value">
        <div class="p-inputgroup flex flex-row">
            <InputNumber v-model="targetPpm.ppm" :useGrouping="false" class="w-full" :min="1" :minFractionDigits="0"
                :maxFractionDigits="8" :suffix="getUom(targetPpm.dClass, recipes[targetPpm.rClass])" @keyup.enter="setPpm()" />
            <Button label="Set!" :disabled="!Number(targetPpm.ppm)" @click="setPpm()" />
        </div>
    </Dialog>
    <div class="w-full p-3 pb-0 surface-0 z-5 border-bottom-1 border-100">
        <FactoryIOs :recipes="recipes" @check-add-recipe="checkAddRecipe" />
    </div>
    <div class="p-2 w-full md:overflow-y-scroll">
        <DataView class="border-x-1 border-1 border-100 surface-card" :value="Object.values(recipes).sort((a, b) => a?.index - b?.index)" :layout="layout">
            <template #header>
                <div class="flex flex-column md:flex-row md:justify-content-between">
                    <div class="flex flex-row align-items-center gap-2">
                        <h3 class="m-1 cursor-pointer" @click="sortListAlpha()" title="Click to sort">Production Setup
                            <i class="pi pi-sort-alpha-down" /></h3>
                        <ConsumptionTag :consumption="getFactoryConsumption()" />
                    </div>
                    <div class="p-inputgroup w-20rem">
                        <Dropdown v-model="selectedRecipe" :options="selectableRecipies" filter optionLabel="name"
                            placeholder="Select a Recipe" class="w-full md:w-14rem">
                        </Dropdown>
                        <Button icon="pi pi-plus" class="bg-bluegray-600 hover:bg-bluegray-400 border-bluegray-700"
                            @click="addRecipe()" />
                    </div>
                </div>
            </template>
            <template #grid="slotProps">
                <div :id="slotProps.data.class" draggable="true"
                    :class="'col-12 lg:col-6 xl:col-4 mt-2 p-1 recipe-card ' + (dragHover === slotProps.index && dragging !== slotProps.index ? 'hover-effect' : '')"
                    @drop="e => moveToPosition(e, slotProps.index)" @dragstart="startDrag(slotProps.index)"
                    @dragover="e => showDragHoverEffect(e, slotProps.index)" @dragend="() => { dragHover = null }">
                    <div class="col-12 p-2 shadow-2 surface-50 flex flex-column h-full">
                        <div class="col-12 flex justify-content-between">
                            <div class="flex flex-row align-items-center flex-grow-1">
                                <div class="flex flex-column">
                                    <h3 class="m-0">
                                        {{ getData(slotProps.data.class).name }}
                                    </h3>
                                    <span class="text-xs text-400">{{ slotProps.data.class }}</span>
                                    <ConsumptionTag :consumption="computeConsumption(slotProps.data)" />
                                </div>
                            </div>
                            <div>
                                <Button icon="pi pi-times" severity="danger"
                                    @click="confirmRemoveRecipe(slotProps.data.class)" size="small"
                                    class="w-2rem h-2rem" />
                            </div>
                        </div>
                        <div class="col-12 material-list flex-grow-1">
                            <div class="mats">
                                <div class="flex flex-column border-300 mats-in w-full">
                                    <div>Inputs</div>
                                    <div v-if="!getData(slotProps.data.class).ingredients?.length" class="text-sm mt-1">None</div>
                                    <div v-for="p of getData(slotProps.data.class).ingredients"
                                        class="flex flex-row align-items-center-center mt-1">
                                        <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer border-round-left"
                                            @click="checkAddRecipe(p.class, slotProps.data.class)" @contextmenu="onProductRightClick($event, p.class, roundNumber(computePpm(p.quantity, p.class, slotProps.data, true)))">
                                            {{ getName(p.class) }}
                                        </div>
                                        <div v-if="!props.modelValue.hidden" class="border-y-1 border-right-1 border-400 text-sm cursor-pointer"
                                            @click="balanceInputGlobal(p.class, slotProps.data)"
                                            title="Global Surplus or Deficit. Click to balance.">
                                            <SupplyDisplay :supply="getGlobalProductDeficit(p.class, props.factories, true).value" />
                                        </div>
                                        <div class="border-y-1 border-400 text-sm cursor-pointer"
                                            @click="balanceInput(p.class, slotProps.data)"
                                            title="Local Surplus or Deficit. Click to balance.">
                                            <SupplyDisplay :supply="roundNumber(computeSupply(p.class, recipes))" />
                                        </div>
                                        <div class="px-1 border-1 border-400 text-sm cursor-pointer  border-round-right"
                                            @click="startSetPpm(slotProps.data.class, p.class)">
                                            <span>
                                                {{ roundNumber(computePpm(p.quantity, p.class, slotProps.data, true)) }}
                                            </span>
                                            <span class="text-xxs">
                                                {{ getUom(p.class, slotProps.data) }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div class="w-full">
                                    <div>Outputs</div>
                                    <div v-if="!getData(slotProps.data.class).products?.length" class="text-sm mt-1">None</div>
                                    <div v-for="p of getData(slotProps.data.class).products"
                                        class="flex flex-row align-items-center-center mt-1">
                                        <div class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm  border-round-left"
                                            @click="checkScrollTo(p.class, slotProps.data.class)" @contextmenu="onProductRightClick($event, p.class, roundNumber(computePpm(p.quantity, p.class, slotProps.data)))">
                                            {{ getName(p.class) || getData(slotProps.data.class).name
                                            }}
                                        </div>
                                        <div v-if="!props.modelValue.hidden" class="border-y-1 border-right-1 border-400 text-sm cursor-pointer"
                                            @click="balanceOutputGlobal(p.class, slotProps.data)"
                                            title="Global Surplus or Deficit. Click to balance.">
                                            <SupplyDisplay :supply="getGlobalProductDeficit(p.class, props.factories).value" />
                                        </div>
                                        <div class="border-y-1 border-400 text-sm cursor-pointer"
                                            @click="balanceOutput(p.class, slotProps.data)"
                                            title="Local Surplus or Deficit. Click to balance.">
                                            <SupplyDisplay :supply="roundNumber(computeSupply(p.class, recipes))" />
                                        </div>
                                        <div class="px-1 border-1 border-400 text-sm cursor-pointer border-round-right"
                                            @click="startSetPpm(slotProps.data.class, p.class)">
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
                        <div v-if="getData(slotProps.data.class).message" class="col-12">
                            <div  class="w-full border-round border-2 border-yellow-900 p-2 text-sm">
                                👉 {{ getData(slotProps.data.class).message }}
                            </div>
                        </div>
                        <div v-if="getAutobuildNames(getData(slotProps.data.class)?.produced)" class="col-12">
                            <div class="flex flex-row gap-4">
                                <div class="w-full">
                                    <div class="p-inputgroup flex-1">
                                        <span title="Balance for maximum overclock" class="p-inputgroup-addon cursor-pointer"
                                            @click="startSetPpm(slotProps.data.class, getData(slotProps.data.class).products[0].class, false, maxEffectiveOc(slotProps.data.class))">
                                            <img src="../assets/Clock_speed.png" class="h-1_5rem" />
                                        </span>
                                        <InputText v-model.number="slotProps.data.overclock" class="w-full" />
                                        <span title="Balance without overclock" class="p-inputgroup-addon cursor-pointer"
                                            @click="startSetPpm(slotProps.data.class, getData(slotProps.data.class).products[0].class, false)">
                                            ⚖️
                                        </span>
                                        <span title="Copy overclock percentage to clipboard" class="p-inputgroup-addon cursor-pointer"
                                            @click="copyTextToClipboard(slotProps.data.overclock * 100)">
                                            <i class="pi pi-copy" />
                                        </span>
                                        <span title="Reset to 100% without balancing"
                                            class="p-inputgroup-addon cursor-pointer"
                                            @click="() => slotProps.data.overclock = 1">
                                            <i class="pi pi-refresh" />
                                        </span>
                                    </div>
                                    <Slider v-model="slotProps.data.overclock" class="w-full" :max="maxEffectiveOc(slotProps.data.class)" :step="0.05"
                                        style="margin-top: -1px;" />
                                </div>
                                <div class=" w-7rem" :title="getMaxSloops(slotProps.data.class) ? 'Number of Somersloop' : 'No Somersloop slots available'">
                                    <div class="p-inputgroup">
                                        <InputNumber v-model="slotProps.data.sloopNumber" mode="decimal" :min="0" :max="getMaxSloops(slotProps.data.class)" :minFractionDigits="0" :maxFractionDigits="0" :step="1" placeholder="0" :disabled="!getMaxSloops(slotProps.data.class)"/>
                                        <span 
                                            class="p-inputgroup-addon"
                                            @click="setTargetOverclock(false)">
                                            <img src="../assets/Somersloop.png" :class="'h-1_5rem' + (getMaxSloops(slotProps.data.class) ? '' : ' opacity-50')" />
                                        </span>
                                    </div>
                                    <Slider v-model="slotProps.data.sloopNumber" class="w-full" :max="getMaxSloops(slotProps.data.class)" :step="1" :disabled="!getMaxSloops(slotProps.data.class)"
                                            style="margin-top: -1px;" />
                                </div>
                            </div>
                            <div class="w-full mt-3">
                                <div class="p-inputgroup flex-1">
                                    <Button icon="pi pi-minus"
                                        @mousedown="() => startHoldAdjust(slotProps.data.class, -1)" />
                                    <InputNumber v-model="slotProps.data.numMachines" inputId="minmax-buttons"
                                        mode="decimal" :min="1"
                                        :suffix="'x ' + getAutobuildNames(getData(slotProps.data.class)?.produced, slotProps.data.numMachines)" />
                                    <Button icon="pi pi-plus"
                                        @mousedown="() => startHoldAdjust(slotProps.data.class, 1)" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>
        </DataView>
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

.h-1_5rem {
    height: 1.5rem;
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