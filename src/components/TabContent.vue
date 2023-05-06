<script setup>
import { ref, watch, onMounted } from 'vue';

import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import Dialog from 'primevue/dialog';
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();

import SupplyDisplay from './SupplyDisplay.vue';

import DataView from 'primevue/dataview';

const props = defineProps(['mainData', 'modelValue']);
const emits = defineEmits(['update:modelValue']);

const selectedRecipe = ref();
const recipes = ref({});
const targetPpm = ref({});
const layout = ref('grid');
const showSelectRecipe = ref(false);
const possibleRecipes = ref([]);
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

const manualBuildClasses = [
    "BP_BuildGun_C",
    "BP_WorkshopComponent_C",
    "BP_WorkBenchComponent_C",
    "FGBuildableAutomatedWorkBench"
];

const extractorFactors = {
    Desc_Coal_C: 1,
    Desc_RawQuartz_C: 1,
    Desc_OreUranium_C: 1, 
    Desc_OreGold_C: 1,
    Desc_OreCopper_C: 1,
    Desc_OreIron_C: 1,
    Desc_OreBauxite_C: 1,
    Desc_Stone_C: 1,
    Desc_Sulfur_C: 1,

    Desc_NitrogenGas_C: 0.001,

    Desc_Water_C: 1,
    Desc_LiquidOil_C: 1,
};

const checkAddRecipe = (pClass) => {
    possibleRecipes.value = props.mainData.recipes.filter(r => r.products.find(p => p.class === pClass));
    if (possibleRecipes.value.length) {
        if (possibleRecipes.value.length === 1) {
            addRecipe(possibleRecipes.value[0]);
        }
        else {
            showSelectRecipe.value = true;
        }
    }
}

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
}

const computePpm = (quantity, dClass, data) => {
    const prodData = getData(data.class);
    if(isManual(prodData)) {
        return quantity / prodData?.products?.[0]?.quantity;
    }

    const factor = extractorFactors[dClass] || 1;
    let correction = 1;
    if (isExtractor(prodData) && ['Desc_LiquidOil_C'].includes(dClass)) {
        correction = 2;
    }
    return Math.round(
        ( 
            quantity / 
            (props.mainData.descs[dClass].form === "RF_LIQUID" && !isExtractor(data)  ? 1000 : 1)
        ) * 
        (60 / prodData.duration) * 
        data.overclock * 
        data.numMachines * 
        factor * correction *
        100
    ) / 100;
}

const removeRecipe = (dClass) => {
    delete recipes.value[dClass];
    adjustIndexes();
}

const getName = (dClass) => {
    if (dClass === 'Build_Converter_C') {
        return 'Extrator';
    }
    return props.mainData.descs?.[dClass]?.name || dClass;
}

const getAutobuildNames = (produced, num = 1) => {
    return produced.filter(x => !manualBuildClasses.includes(x)).map(x=> {
        let tname = getName(x);
        if (num > 1) {
            if (tname.endsWith('y')) {
                tname = tname.slice(0, -1) + 'ies';
            }
            else tname += 's';
        }
        return tname;
    }).join(', ');
}

const getUom = (dClass, data) => {
    if (isManual(getData(data?.class))) {
        return '';
    }
    return props.mainData.descs[dClass].form === "RF_LIQUID" ? 'm³/min' : '/min'
}

const isExtractor = (data) => {
    return getData(data.class).produced.includes('Build_Converter_C')
}

const isManual = (data) => {
    return !data?.produced?.filter(x => !manualBuildClasses.includes(x))?.length;
}

const getMkSpread = (dClass) => {
    const spread = [{l: '1', x: 1}];
    if (props.mainData.descs[dClass].form !== "RF_LIQUID") {
        return spread.concat([{l: '2', x: 2}, {l: '3', x: 4}])
    }
    return spread;
}

const computeSupply = (dClass) => {
    let supply = 0;
    Object.values(recipes.value).forEach(t => {
        const r = {...t,...getData(t.class)};
        r.ingredients.forEach(i => {
            if(i.class === dClass) {
                supply -= computePpm(i.quantity, i.class, r);
            }
        });
        r.products.forEach(i => {
            if(i.class === dClass) {
                supply += computePpm(i.quantity, i.class, r);
            }
        });
    });
    return supply;
}

const getAllClasses = () => {
    const classes = {};
    Object.values(recipes.value)?.forEach(t => {
        const r = getData(t.class);
        r.ingredients.forEach(i => classes[i.class] = true);
        r.products.forEach(i => classes[i.class] = true);
    });
    return Object.keys(classes);
}

const getAllNetProduction = () => {
    const res = [];
    getAllClasses().forEach(p => {
        const netSupply = computeSupply(p);
        if (roundNumber(netSupply) > 0) {
            res.push(p);
        }
    })
    return res;
}

const getAllNetDefecits = () => {
    const res = [];
    getAllClasses().forEach(p => {
        const netSupply = computeSupply(p);
        if (roundNumber(netSupply) < 0) {
            res.push(p);
        }
    })
    return res;
}

const roundNumber = (num) => {
    return Math.round(num * 1000) / 1000;
}

const adjustOverclock = (dClass, data) => {
    data.overclock = 1;
    const prodData = getData(data.class);
    const supply = computeSupply(dClass);
    const quantity = computePpm(prodData.products.find(x=>x.class === dClass).quantity, dClass, data);
    data.overclock -= supply / quantity;
}

const adjustInputOverclock = (dClass, data) => {
    data.overclock = 1;
    const prodData = getData(data.class);
    const supply = computeSupply(dClass);
    const quantity = computePpm(prodData.ingredients.find(x=>x.class === dClass).quantity, dClass, data);
    data.overclock += supply / quantity;
}

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

const dragging = ref(null);
const dragHover = ref(null);

const startDrag = (index) => {
    dragging.value = index;
}

const moveToPosition = (e, index) => {
    e.preventDefault();

    if(dragging.value !== index) {
        const target = Object.values(recipes.value).find(x=>x.index===dragging.value) || Object.values(recipes.value)[dragging.value];
        target.index = index - 0.5;
        adjustIndexes();
    }
    dragging.value = null;
}

const showDragHoverEffect = (e, index) => {
    e.preventDefault();
    dragHover.value = index;
}

const getData = (tClass) => {
    if (tClass?.startsWith('Recipe')) {
        return props.mainData.recipes.find(r=>r.class === tClass);
    }
    return props.mainData.descs.find?.(d=>d?.class === tClass);
}

const startHoldAdjust = (rClass, adjust) => {
    if (recipes.value[rClass].numMachines + adjust) {
        recipes.value[rClass].numMachines += adjust;
    }
    holdAdjustMachines.class = rClass;
    holdAdjustMachines.multiplier = adjust;
}

const startSetPpm = (rClass, dClass) => {
    const data = getData(rClass);
    if (getAutobuildNames(data?.produced)) {
        targetPpm.value.visible = true;
        targetPpm.value.rClass = rClass;
        targetPpm.value.dClass = dClass;
        const quantity = data.products.find(x=>x.class === dClass)?.quantity || data.ingredients.find(x=>x.class === dClass).quantity;
        targetPpm.value.ppm = computePpm(quantity, dClass, recipes.value[rClass]);
    }
}

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
}
</script>

<template>
    <Dialog v-model:visible="showSelectRecipe" modal header="Multiple Choices Available!">
        <div class="mb-2">
            Pick a recipe to add :
        </div>
        <div class="flex flex-wrap gap-2">
            <Button v-for="recipe of possibleRecipes" :label="recipe.name" @click="addRecipe(recipe)"/>
        </div>
    </Dialog>
    <Dialog v-model:visible="targetPpm.visible" modal header="Set Desired Rate Value">
        <div class="flex flex-row">
            <InputNumber v-model="targetPpm.ppm" :useGrouping="false" class="w-full" :min="1" :minFractionDigits="0" :maxFractionDigits="8" :suffix="getUom(targetPpm.dClass, recipes[targetPpm.rClass])" />
            <Button label="Set!" :disabled="!Number(targetPpm.ppm)" @click="setPpm()"/>
        </div>
    </Dialog>
    <div class="w-full grid mb-2 p-1 pt-2">
        <div class="col-12 md:col-6 md:border-right-1 border-300">
            <h4 class="m-0 mb-1">Requied Inputs <span class="text-red-600">▼</span></h4>
            <div class="flex flex-wrap gap-1">
                <div v-for="p of getAllNetDefecits()" class="flex flex-row align-items-center-center cursor-pointer" @click="checkAddRecipe(p)">
                    <div class="px-1 bg-ficsit-secondary text-white border-1 border-right-none border-400 text-sm">
                        {{ getName(p) }}
                    </div>
                    <div class="px-1 border-1 border-400 text-sm">
                        <SupplyDisplay :supply="roundNumber(computeSupply(p))" />
                    </div>
                </div>
            </div>
        </div>
        <div class="col-12 md:col-6">            
            <h4 class="m-0 mb-1">Net Production <span class="text-green-600">▲</span></h4>
            <div class="flex flex-wrap gap-1 justify-content-start">
                <div v-for="p of getAllNetProduction()" class="flex flex-row align-items-center-center cursor-pointer" @click="checkAddRecipe(p)">
                    <div class="px-1 bg-ficsit-primary text-white border-1 border-right-none border-400 text-sm">
                        {{ getName(p) }}
                    </div>
                    <div class="px-1 border-1 border-400 text-sm">
                        <SupplyDisplay :supply="roundNumber(computeSupply(p))" />
                    </div>
                </div>
            </div>
        </div>        
    </div>
    <div class="border-x-1 border-bottom-1 border-100">
        <DataView :value="Object.values(recipes).sort((a,b) => a?.index - b?.index)" :layout="layout">
            <template #header>
                <div class="flex flex-column md:flex-row md:justify-content-between">
                    <h3 class="m-1">Production Setup</h3>
                    <div class="p-inputgroup w-20rem">
                        <Dropdown v-model="selectedRecipe" :options="props.mainData.recipes" filter optionLabel="name" placeholder="Select a Recipe" class="w-full md:w-14rem">
                        </Dropdown>
                        <Button icon="pi pi-plus" class="bg-bluegray-600 hover:bg-bluegray-400 border-bluegray-700" @click="addRecipe()"/>
                    </div>
                </div>
            </template>
    
            <template #grid="slotProps">
                <div 
                    draggable="true" 
                    :class="'col-12 lg:col-6 xl:col-4 mt-2 py-2 pl-3 p-fluid bg-white recipe-card ' + (dragHover === slotProps.index && dragging !== slotProps.index ? 'hover-effect':'')" 
                    @drop="e => moveToPosition(e, slotProps.index)" 
                    @dragstart="startDrag(slotProps.index)"
                    @dragover="e=>showDragHoverEffect(e, slotProps.index)"
                    @dragend="()=> {dragHover = null}"
                >
                    <div class="col-12 p-2 shadow-2 grid">
                        <div class="col-12 flex justify-content-between">
                            <div class="flex flex-row align-items-center">
                                <div class="flex flex-column">
                                    <h3 class="m-0">
                                        {{ getData(slotProps.data.class).name }}
                                    </h3>
                                    <div class="text-500 text-xs ">
                                        {{ getData(slotProps.data.class).products.map(x => x.class).join(', ') }}
                                    </div>
                                </div>
                            </div>
                            <div class="bg-red-600 p-2 w-2rem h-2rem flex justify-content-center align-items-center" @click="confirmRemoveRecipe(slotProps.data.class)">
                                <i class="pi pi-times text-white" />
                            </div>
                        </div>
                        <div v-if="isExtractor(slotProps.data)" class="col-12 grid">
                            <div v-for="p of getData(slotProps.data.class).products" class="col-12">
                                <div v-for="mk of getMkSpread(p.class)" class="w-full flex flex-row mt-1">
                                    <div class="px-1 bg-ficsit-primary border-1 border-400 text-white text-sm">
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
                                    <div class="px-1 border-1 text-sm">
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
                        <div v-else class="col-12 grid">
                            <div class="col-12 md:col-6 flex flex-column md:align-items-end md:border-right-1 border-300">
                                <div>Inputs</div>
                                <div v-for="p of getData(slotProps.data.class).ingredients" class="flex flex-row align-items-center-center mt-1">
                                    <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer" @click="checkAddRecipe(p.class)">
                                        {{ getName(p.class) }}
                                    </div>
                                    <div class="border-y-1 border-400 text-sm cursor-pointer" @click="adjustInputOverclock(p.class, slotProps.data)">
                                        <SupplyDisplay :supply="roundNumber(computeSupply(p.class, getData(slotProps.data.class)))" />
                                    </div>
                                    <div class="px-1 border-1 border-400 text-sm cursor-pointer" @click="startSetPpm(slotProps.data.class, p.class)">
                                        <span>
                                            {{ roundNumber(computePpm(p.quantity, p.class, slotProps.data)) }}
                                        </span>
                                        <span class="text-xxs">
                                            {{ getUom(p.class, slotProps.data) }}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div class="col-12 md:col-6">
                                <div>Outputs</div>
                                <div v-for="p of getData(slotProps.data.class).products" class="flex flex-row align-items-center-center mt-1">
                                    <div class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm">
                                        {{ props.mainData.descs[p.class].name || getData(slotProps.data.class).name }}
                                    </div>
                                    <div class="border-y-1 border-400 text-sm cursor-pointer" @click="adjustOverclock(p.class, slotProps.data)">
                                        <SupplyDisplay :supply="roundNumber(computeSupply(p.class, getData(slotProps.data.class)))" />
                                    </div>
                                    <div class="px-1 border-1 border-400 text-sm cursor-pointer"  @click="startSetPpm(slotProps.data.class, p.class)">
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
                        <div v-if="getAutobuildNames(getData(slotProps.data.class)?.produced)" class="col-12">
                            <div class="w-full">
                                <div class="p-inputgroup flex-1">
                                    <span class="p-inputgroup-addon">
                                        <i class="pi pi-clock" />
                                    </span>
                                    <InputText v-model.number="slotProps.data.overclock" class="w-full" />
                                    <Button icon="pi pi-refresh" @click="() => slotProps.data.overclock = 1"/>
                                </div>
                                <Slider v-model="slotProps.data.overclock" class="w-full" :max="2.5" :step="0.05" />
                            </div>
                            <div class="w-full mt-4">
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
</template>

<style scoped>
.recipe-card {
    transition: all 0.2s ease-in-out;
}
.hover-effect {
    transform: translateX(15px);
}
</style>