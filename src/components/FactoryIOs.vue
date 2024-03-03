<script setup>
import {
    getAllNetDefecits,
    getAllNetProduction,
    roundNumber,
} from "../utilitites";
import SupplyDisplay from './SupplyDisplay.vue';

const props = defineProps(['recipes']);
const emits = defineEmits(['checkAddRecipe']);

const checkAddRecipe = (desc) => emits('checkAddRecipe', desc);
</script>
<template>
    <div class="w-full grid mb-2 p-1 pt-2">
        <div class="col-12 md:col-6 md:border-right-1 border-300">
            <h4 class="m-0 mb-1">Requied Inputs / min<span class="text-red-600">▼</span></h4>
            <div class="flex flex-wrap gap-1">
                <div v-for="p of getAllNetDefecits(recipes)"
                    class="flex flex-row align-items-center-center cursor-pointer" @click="checkAddRecipe(p.desc)">
                    <div
                        class="px-1 bg-ficsit-secondary text-white border-1 border-right-none border-round-left border-400 text-sm">
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
                        class="px-1 bg-ficsit-primary text-white border-1 border-right-none border-400 text-sm  border-round-left">
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