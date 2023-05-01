<script setup>
import { ref, watch, onMounted } from 'vue';

import Dropdown from 'primevue/dropdown';
import Button from 'primevue/button';
import InputText from 'primevue/inputtext';
import InputNumber from 'primevue/inputnumber';
import Slider from 'primevue/slider';
import Dialog from 'primevue/dialog';

import SupplyDisplay from './SupplyDisplay.vue';

import DataView from 'primevue/dataview';

const props = defineProps(['mainData', 'modelValue']);
const emits = defineEmits(['update:modelValue']);

const selectedRecipe = ref();
const recipes = ref({});
const layout = ref('grid');
const showSelectRecipe = ref(false);
const possibleRecipes = ref([]);

onMounted(() => {
    recipes.value = props.modelValue || {};
})

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
        recipes.value[(selectedRecipe.value || recipe).class] = {
            ...(selectedRecipe.value || recipe ), 
            overclock: 1,
            numMachines: 1
        };
        selectedRecipe.value = null;
    }
    showSelectRecipe.value = false;
}

const computePpm = (quantity, dClass, data) => {
    if(isManual(data)) {
        return quantity / data?.products?.[0]?.quantity;
    }

    const factor = extractorFactors[dClass] || 1;
    let correction = 1;
    if (isExtractor(data) && ['Desc_LiquidOil_C'].includes(dClass)) {
        correction = 2;
    }
    return Math.round(
        ( 
            quantity / 
            (props.mainData.descs[dClass].form === "RF_LIQUID" && !isExtractor(data)  ? 1000 : 1)
        ) * 
        (60 / data.duration) * 
        data.overclock * 
        data.numMachines * 
        factor * correction *
        100
    ) / 100;
}

const removeRecipe = (dClass) => {
    delete recipes.value[dClass];
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
    if (isManual(data)) {
        return '';
    }
    return props.mainData.descs[dClass].form === "RF_LIQUID" ? 'm³/M' : '/M'
}

const isExtractor = (data) => {
    return data.produced.includes('Build_Converter_C')
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
    Object.values(recipes.value).forEach(r => {
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
    Object.values(recipes.value)?.forEach(r => {
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
    const supply = computeSupply(dClass);
    const quantity = computePpm(data.products.find(x=>x.class === dClass).quantity, dClass, data);
    data.overclock -= supply / quantity;
}

const adjustInputOverclock = (dClass, data) => {
    data.overclock = 1;
    const supply = computeSupply(dClass);
    const quantity = computePpm(data.ingredients.find(x=>x.class === dClass).quantity, dClass, data);
    data.overclock += supply / quantity;
}

watch(recipes, () => {
    emits('update:modelValue', recipes.value);
}, { deep: true });
</script>

<template>
    <Dialog v-model:visible="showSelectRecipe" modal header="Multiple Choices Available!">
        <div class="mb-4">
            Pick a recipe to add :
        </div>
        <div class="flex flex-wrap gap-2">
            <Button v-for="recipe of possibleRecipes" :label="recipe.name" @click="addRecipe(recipe)"/>
        </div>
    </Dialog>
    <div class="w-full grid mb-2 p-1">
        <div class="col-12 md:col-6 md:border-right-1 border-300 mt-2">
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
        <DataView :value="Object.values(recipes)" :layout="layout">
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
                <div class="col-12 lg:col-6 xl:col-4 mt-2 py-2 pl-3 p-fluid">
                    <div class="col-12 p-2 shadow-2 grid">
                        <div class="col-12 flex justify-content-between">
                            <div class="flex flex-column">
                                <h3 class="m-0">
                                    {{ slotProps.data.name }}
                                </h3>
                                <div class="text-500 text-xs ">
                                    {{ slotProps.data.products.map(x => x.class).join(', ') }}
                                </div>
                            </div>
                            <div class="bg-red-600 p-2 w-2rem h-2rem flex justify-content-center align-items-center" @click="removeRecipe(slotProps.data.class)">
                                <i class="pi pi-times text-white" />
                            </div>
                        </div>
                        <div v-if="isExtractor(slotProps.data)" class="col-12 grid">
                            <div v-for="p of slotProps.data.products" class="col-12">
                                <div v-for="mk of getMkSpread(p.class)" class="w-full flex flex-row mt-1">
                                    <div class="px-1 bg-ficsit-primary text-white text-sm">
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
                                <div v-for="p of slotProps.data.ingredients" class="flex flex-row align-items-center-center mt-1">
                                    <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer" @click="checkAddRecipe(p.class)">
                                        {{ getName(p.class) }}
                                    </div>
                                    <div class="border-y-1 border-400 text-sm cursor-pointer" @click="adjustInputOverclock(p.class, slotProps.data)">
                                        <SupplyDisplay :supply="roundNumber(computeSupply(p.class, slotProps.data))" />
                                    </div>
                                    <div class="px-1 border-1 border-400 text-sm">
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
                                <div v-for="p of slotProps.data.products" class="flex flex-row align-items-center-center mt-1">
                                    <div class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm">
                                        {{ props.mainData.descs[p.class].name || slotProps.data.name }}
                                    </div>
                                    <div class="border-y-1 border-400 text-sm cursor-pointer" @click="adjustOverclock(p.class, slotProps.data)">
                                        <SupplyDisplay :supply="roundNumber(computeSupply(p.class, slotProps.data))" />
                                    </div>
                                    <div class="px-1 border-1 border-400 text-sm">
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
                        <div v-if="getAutobuildNames(slotProps.data?.produced)" class="col-12">
                            <div class="w-full">
                                <div class="p-inputgroup flex-1">
                                    <span class="p-inputgroup-addon">
                                        OC
                                    </span>
                                    <InputText v-model.number="slotProps.data.overclock" class="w-full" />
                                    <Button icon="pi pi-refresh" @click="() => slotProps.data.overclock = 1"/>
                                </div>
                                <Slider v-model="slotProps.data.overclock" class="w-full" :max="2.5" :step="0.05" />
                            </div>
                            <div class="w-full mt-4">
                                <div class="p-inputgroup flex-1">
                                    <Button icon="pi pi-minus"  @click="() => slotProps.data.numMachines>0?slotProps.data.numMachines--:null"/>
                                    <InputNumber v-model="slotProps.data.numMachines" inputId="minmax-buttons" mode="decimal" :min="1" :suffix="'x ' + getAutobuildNames(slotProps.data?.produced, slotProps.data.numMachines)"/>
                                    <Button icon="pi pi-plus" @click="() => slotProps.data.numMachines++"/>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </template>      
        </DataView>
    </div>
</template>