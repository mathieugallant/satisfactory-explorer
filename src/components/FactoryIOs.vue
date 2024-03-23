<script setup>
import {
    getAllNetDefecits,
    getAllNetProduction,
    roundNumber,
    getData,
} from "../utilitites";
import ContextMenu from 'primevue/contextmenu';
import SupplyDisplay from './SupplyDisplay.vue';
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();

const props = defineProps(['recipes']);
const emits = defineEmits(['checkAddRecipe']);

const menu = ref();
const items = ref([
    { label: 'Select', icon: 'pi pi-plus', command: () => {
        checkAddRecipe(menu.value.product) 
    }},
    { label: 'Explore', icon: 'pi pi-search', command: () => {
        goToCompare(getData(menu.value.product), menu.value.ppm) 
    }}
]);

const checkAddRecipe = (desc) => emits('checkAddRecipe', desc);

const onProductRightClick = (event, pClass, ppm) => {
    menu.value.product = pClass;
    menu.value.ppm = ppm;
    menu.value.show(event);
};

const goToCompare = (product, targetPpm = 1) => {
    router.push({ query: { ...route.query, mode: 'explorer', selectedMat: JSON.stringify({id: product.class, name: product.name, targetPpm: Math.abs(targetPpm) || 1}) } });
}
</script>
<template>
    <ContextMenu ref="menu" :model="items" />
    <div class="w-full grid mb-2 p-1 pt-2">
        <div class="col-12 md:col-6 md:border-right-1 border-300">
            <h4 class="m-0 mb-1">Requied Inputs / min<span class="text-red-600">▼</span></h4>
            <div class="flex flex-wrap gap-1">
                <div v-for="p of getAllNetDefecits(recipes)"
                    class="flex flex-row align-items-center-center cursor-pointer" @click="checkAddRecipe(p.desc)">
                    <div
                        class="px-1 bg-ficsit-secondary text-white border-1 border-right-none border-round-left border-400 text-sm" @contextmenu="onProductRightClick($event, p.desc, roundNumber(p.value))">
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
                <div v-for="p of getAllNetProduction(recipes)"
                    class="flex flex-row align-items-center-center cursor-pointer" @click="checkAddRecipe(p.desc)">
                    <div
                        class="px-1 bg-ficsit-primary text-white border-1 border-right-none border-400 text-sm  border-round-left" @contextmenu="onProductRightClick($event, p.desc, roundNumber(p.value))">
                        {{ p.name }}
                    </div>
                    <div class="px-1 border-1 border-400 text-sm border-round-right">
                        <SupplyDisplay :supply="roundNumber(p.value)" />
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>