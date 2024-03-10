<script setup>
import { onMounted, ref, onUnmounted, nextTick } from 'vue';
import ProgressBar from 'primevue/progressbar';
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
const toolTipPosSet = ref(false);
const loading = ref(true);
const tooltipData = ref({});
const tooltipDiv = ref();
      
const snkid = 'snk-' + String(Math.random()).split('.')[1]

const emits = defineEmits(['goToFactory']);

const updateToolTipPosition = (e) => {
    if (showToolTip.value && ! toolTipPosSet.value) {
        const containerWidth = tooltipDiv.value.offsetWidth;
        const containerHeight = tooltipDiv.value.offsetHeight;
        const isPastMidwayX = e.clientX + 200 > window.innerWidth / 2;
        const isPastMidwayY = e.clientY + 200 > window.innerHeight / 2;
        tooltipDiv.value.style.left = `${Math.max(e.layerX + (isPastMidwayX ? (containerWidth + 200) * -1: 200), 20)}px`;
        tooltipDiv.value.style.top = `${Math.max(e.layerY + (isPastMidwayY ? (containerHeight + 200) * -1: 200), 150)}px`;

        toolTipPosSet.value = true;
    }
};
const handdleMouseOver = (e) => {
    showToolTip.value = true;
    tooltipData.value = e.detail.data;
};
const handdleMouseOut = (e) => {
    showToolTip.value = false;
    toolTipPosSet.value = false;
};
const handdleMouseClick = (e) => {
    showToolTip.value = false;
    if (e.detail.data?.factory_id) emits('goToFactory', e.detail.data);
};

const computeSankeyProps = () => {
    const pathRecursive = (source, depth = 0, visited = []) => {
        visited.push(source);
        return depth + props.graph.links.filter(l => l.source === source && !visited.includes(l.target))
            .map(l => pathRecursive(l.target, depth+1, visited))
            .reduce((p, c) => p > c ? p : c, 0);
    }
    
    const paths = props.graph.links.map(l => {
        return pathRecursive(l.source);
    });


    return {
        width: document.getElementById(snkid)?.clientHeight,
        height: document.getElementById(snkid)?.clientHeight,
        logarithmic: false,
        iterations: 60
    };
}

onMounted(() => {
    window.addEventListener('sankey_node_mouseover', handdleMouseOver);
    window.addEventListener('sankey_node_mouseout', handdleMouseOut);
    window.addEventListener('sankey_node_clicked', handdleMouseClick);
    nextTick(() => sankeyfy({data: props.graph, id: '#' + snkid, ...computeSankeyProps()}).then(() => loading.value = false));
})

onUnmounted(() => {
    window.removeEventListener('sankey_node_mouseover', handdleMouseOver);
    window.removeEventListener('sankey_node_mouseout', handdleMouseOut);
    window.removeEventListener('sankey_node_clicked', handdleMouseClick);
});

</script>

<template>
    <div v-show="showToolTip" ref="tooltipDiv" class="absolute p-3 border-round border-1 shadow-2 surface-50-trans w-6" >
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
            <div class="flex gap-2">
                <div class="w-6">
                    <div class="flex align-items-center gap-4">
                        <div>
                            <div class="flex flex-row text-sm mt-1" style="height: 24px;">
                                <div class="border-1 h-full flex align-items-center justify-content-between border-round-left bg-green-900 border-400 px-1 w-12rem">
                                    <i class="pi pi-plus text-green-500 mr-2" />
                                    Global Production 
                                </div>
                                <div
                                    class="flex h-full border-y-1 border-right-1 p-1 align-items-baseline justify-content-end border-round-right white-space-nowrap border-400 px-1 py-0 w-6rem">
                                    {{ roundNumber(tooltipData.produced) }} <span class="text-xxs">/minute</span>
                                </div>
                            </div>
                            <div class="flex flex-row text-sm mt-1" style="height: 24px;">
                                <div class="border-1 h-full flex align-items-center justify-content-between border-round-left bg-red-900 border-400 px-1 w-12rem">
                                    <i class="pi pi-minus text-red-500 mr-2" />
                                    Global Consumption 
                                </div>
                                <div
                                    class="flex h-full border-y-1 border-right-1 p-1 align-items-baseline justify-content-end border-round-right white-space-nowrap border-400 px-1 py-0 w-6rem">
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
                <div class="border-left-1 w-6 pl-3 mt-1">
                    <div v-for="c in tooltipData.consumers" class="flex justify-content-center align-items-center mb-1" style="height: 24px;">
                        <div class="relative border-400 bg-green-900 h-full flex pr-2 w-5rem justify-content-end align-items-center border-1 border-round-left flow-arrow text-sm">{{ c.value }}</div>
                        <div class="flex pl-4 border-400 h-full flex-grow-1 justify-content-start align-items-center border-1 border-round-right text-sm">{{c.target.name}}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <ConsumptionTag :consumption="conputeGlobalConsumption(props.factories)"  prefix="Total Global "/>
    <ProgressBar v-if="loading" class="mt-2" mode="indeterminate" style="height: 6px"></ProgressBar>
    <div :id="snkid"  @mousemove="updateToolTipPosition" class="sankey-container"></div>
</template>

<style>
    .flow-arrow::after {
        content: "";
        position: absolute;
        right: -12px; 
        width: 0;
        height: 0;
        border-left: 12px solid var(--green-900);
        border-top: 12px solid transparent;
        border-bottom: 12px solid transparent;
    }
    .sankey-container {
        height: 80vh;
    }
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
        font-size: 80%;
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
</style>