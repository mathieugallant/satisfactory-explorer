<script setup>
import { onMounted, ref, onUnmounted } from 'vue';
import { sankeyfy } from './sankeyfy';
import {
    computeFactoryConsumption,
    roundNumber,
    conputeGlobalConsumption,
} from "../utilitites";
import FactoryIOs from './FactoryIOs.vue';
import ConsumptionTag from './ConsumptionTag.vue';

const props = defineProps(['graph', 'factories']);
const showToolTip = ref(false);
const tooltipData = ref({});
const tooltipDiv = ref();
      
const snkid = 'snk-' + String(Math.random()).split('.')[1]

const emits = defineEmits(['goToFactory']);

const updateToolTipPosition = (e) => {
    if (showToolTip.value) {
        const containerWidth = tooltipDiv.value.offsetWidth;
        const containerHeight = tooltipDiv.value.offsetHeight;
        const isPastMidwayX = e.clientX > window.innerWidth / 2;
        const isPastMidwayY = e.clientY > window.innerHeight / 2;
        tooltipDiv.value.style.left = `${e.layerX + (isPastMidwayX ? (containerWidth + 20) * -1: 20)}px`;
        tooltipDiv.value.style.top = `${e.layerY + (isPastMidwayY ? (containerHeight + 20) * -1: 20)}px`;
    }
};
const handdleMouseOver = (e) => {
    showToolTip.value = true;
    tooltipData.value = e.detail.data;
};
const handdleMouseOut = (e) => {
    showToolTip.value = false;
};
const handdleMouseClick = (e) => {
    showToolTip.value = false;
    if (e.detail.data?.factory_id) emits('goToFactory', e.detail.data);
};

onMounted(() => {
    window.addEventListener('sankey_node_mouseover', handdleMouseOver);
    window.addEventListener('sankey_node_mouseout', handdleMouseOut);
    window.addEventListener('sankey_node_clicked', handdleMouseClick);
    sankeyfy({data: props.graph, id: '#' + snkid, logarithmic: false });
})

onUnmounted(() => {
    window.removeEventListener('sankey_node_mouseover', handdleMouseOver);
    window.removeEventListener('sankey_node_mouseout', handdleMouseOut);
    window.removeEventListener('sankey_node_clicked', handdleMouseClick);
});

</script>

<template>
    <div v-show="showToolTip" ref="tooltipDiv" :class="['absolute p-3 border-round border-1 shadow-2 surface-50-trans', tooltipData?.factory_id ? 'w-6' : ''].join(' ')" >
        <div v-if="tooltipData?.factory_id" >
            <h3 class="mb-0">🏭 {{ tooltipData.factory_id }}</h3>
            <ConsumptionTag :consumption="computeFactoryConsumption(factories.find(f => f.id === tooltipData.factory_id).factoryData)" />
            <FactoryIOs :recipes="factories.find(f => f.id === tooltipData.factory_id).factoryData" />
        </div>
        <div v-else-if="tooltipData?.material_id">
            <div v-if="tooltipData.consumed > tooltipData.produced" class="border-1 flex align-items-center border-round bg-yellow-900 border-400 px-1 mb-3">
                🚨 Warning : Insufficient production
            </div>
            <h3 class="mb-2 mt-0">📦 {{ tooltipData.material_id }}</h3>
            <div class="flex align-items-center gap-4">
                <div>
                    <div class="flex flex-row text-sm mt-1">
                        <div class="border-1 flex align-items-center justify-content-between border-round-left bg-green-900 border-400 px-1 w-12rem">
                            <i class="pi pi-plus text-green-500 mr-2" />
                            Global Production 
                        </div>
                        <div
                            class="flex border-y-1 border-right-1 p-1 align-items-baseline justify-content-end border-round-right white-space-nowrap border-400 px-1 py-0 w-6rem">
                            {{ roundNumber(tooltipData.produced) }} <span class="text-xxs">/minute</span>
                        </div>
                    </div>
                    <div class="flex flex-row text-sm mt-1">
                        <div class="border-1 flex align-items-center justify-content-between border-round-left bg-red-900 border-400 px-1 w-12rem">
                            <i class="pi pi-minus text-red-500 mr-2" />
                            Global Consumption 
                        </div>
                        <div
                            class="flex border-y-1 border-right-1 p-1 align-items-baseline justify-content-end border-round-right white-space-nowrap border-400 px-1 py-0 w-6rem">
                            {{ roundNumber(tooltipData.consumed) }} <span class="text-xxs">/minute</span>
                        </div>
                    </div>
                </div>
                <div>
                    <div>
                        Net {{ tooltipData.consumed > tooltipData.produced ? 'Deficit' : 'Surplus' }} : 
                    </div>
                    <div :class="`text-${tooltipData.consumed > tooltipData.produced ? 'red' : 'green'}-700 text-xl`">
                        {{ roundNumber(tooltipData.produced - tooltipData.consumed)  }} <span class="text-sm">/ minute</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <ConsumptionTag :consumption="conputeGlobalConsumption(props.factories)"  prefix="Total Global "/>
    <div :id="snkid" @mousemove="updateToolTipPosition"></div>
</template>

<style>
    .surface-50-trans {
        background-color: #262b2caa;
    }
    .sankey-node {
        fill: green;
        stroke-width: 2;
        transition: opacity 0.2s ease-out;
    }

    .sankey-node.dim {
        pointer-events: none;
        opacity: 0.2;
    }

    .sankey-link {
        transition: opacity 0.2s ease-out;
    }

    .sankey-link.dim {
        pointer-events: none;
        opacity: 0.02;
    }

    .sankey-label {
        cursor: default;
        font-size: 60%;
        font-weight: 400;
        fill: #fff;
        text-shadow: 0 1px 0 #5F668C;
    }

    .sankey-label.dim {
        opacity: 0.2;
    }

    .sankey-top-link {
        stroke: gray;
        opacity: 0.4;
    }

    .sankey-sub-link {
        opacity: 0.6;
        pointer-events: none;
        stroke: #AAAAAA;
        stroke-dasharray: 4;
        stroke-dashoffset: 50;
        animation: dash 1s linear forwards;
        animation-iteration-count: infinite;
    }

    .sankey-top-link.highlight {
        animation: pblink 0.5s linear alternate;
        animation-iteration-count: infinite;
    }

    rect.highlight {
        animation: rblink 0.5s linear alternate;
        animation-iteration-count: infinite;
    }

    @keyframes pblink {
        to {
            stroke: red;
        }
    }

    @keyframes rblink {
        to {
            stroke: #b3921d;
            fill: #665311;
        }
    }

    @keyframes dash {
        to {
            stroke-dashoffset: 0;
        }
    }
</style>