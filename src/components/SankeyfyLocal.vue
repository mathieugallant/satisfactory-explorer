<script setup>
import { onMounted, ref, onUnmounted, nextTick } from 'vue';
import ProgressBar from 'primevue/progressbar';
import { sankeyfy } from './sankeyfy';
import {
    computeFactoryConsumption,
    computeConsumption,
    roundNumber,
    getAutobuildNames,
    getUom,
    getData,
    getName,
    computePpm,
} from "../utilitites";
import localforage from 'localforage';
import ConsumptionTag from './ConsumptionTag.vue';
import { useRoute } from 'vue-router';

const route = useRoute();

const graph = ref({ nodes: [], links: [] });
const showToolTip = ref(false);
const toolTipPosSet = ref(false);
const loading = ref(true);
const factory = ref({})
const tooltipData = ref({});
const tooltipDiv = ref();
      
const snkid = 'snk-' + String(Math.random()).split('.')[1]

const convertFactoryToGraph = () => {
    const tNodes = {};
    graph.value.links = [];
    graph.value.nodes = [];
    Object.values(factory.value.factoryData).forEach(r => {
        const recipeData = getData(r.class);
        graph.value.nodes.push({ 
            id: r.class, 
            name: r.class, 
            labels: [recipeData.name, `${r.numMachines}x ${getAutobuildNames(recipeData.produced, r.numMachines)}`], 
            data: {
                name: recipeData.name,
                machine_name: getAutobuildNames(recipeData.produced, r.numMachines),
                recipe_id: r.class,
                ...r
            } 
        })
        recipeData.products.forEach(p => {
    
            tNodes[p.class] ??= { id: p.class, name: p.class, labels: [getName(p.class)], desc: p.class, production: 0, consumption: 0 };
            tNodes[p.class].production += computePpm(p.quantity, p.class, r);
            graph.value.links.push({ source: r.class, target: p.class, value: computePpm(p.quantity, p.class, r) || 1 });
        });
        recipeData.ingredients.forEach(d => {
            tNodes[d.class] ??= { id: d.class, name: d.class, labels: [getName(d.class)], desc: d.class, production: 0, consumption: 0 };
            tNodes[d.class].consumption += computePpm(d.quantity, d.class, r, true);
            graph.value.links.push({ target: r.class, source: d.class, value: computePpm(d.quantity, d.class, r) });
        });
    });
    graph.value.nodes = [...graph.value.nodes, ...Object.values(tNodes).map(x => {
        return {
            id: x.name,
            name: x.name,
            labels: [
                `${x.labels}${roundNumber(x.consumption) > roundNumber(x.production) ? ' 🚨' : ''}`,
                `>] ${roundNumber(x.production)} /min`,
                `${roundNumber(x.consumption)} /min [>`, 
            ].filter(x=>x),
            highlight: roundNumber(x.consumption) > roundNumber(x.production),
            data: {
                material_class: x.desc,
                material_id: x.name,
                produced: x.production,
                consumed: x.consumption,
                consumers: graph.value.links.filter(l => l.source === x.id)
            },
        };
    })];
};
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
};
const computeSankeyProps = () => {
    return {
        // use a 16:9 display ratio
        width: document.getElementById(snkid)?.clientWidth,
        height: document.getElementById(snkid)?.clientWidth*0.5625,
        logarithmic: false,
        iterations: 5
    };
};

onMounted(() => {
    window.addEventListener('sankey_node_mouseover', handdleMouseOver);
    window.addEventListener('sankey_node_mouseout', handdleMouseOut);
    window.addEventListener('sankey_node_clicked', handdleMouseClick);
    if (route.query.factory) {
        localforage.getItem('factoryData').then(data => {
            factory.value = data.find(f => f.id === route.query.factory);
            convertFactoryToGraph();
            nextTick(() => sankeyfy({data: graph.value, id: '#' + snkid, ...computeSankeyProps()}).then(() => loading.value = false));
        });
    }
});
onUnmounted(() => {
    window.removeEventListener('sankey_node_mouseover', handdleMouseOver);
    window.removeEventListener('sankey_node_mouseout', handdleMouseOut);
    window.removeEventListener('sankey_node_clicked', handdleMouseClick);
});

</script>

<template>
    <div v-show="showToolTip" ref="tooltipDiv" class="absolute p-3 border-round border-1 border-400 shadow-2 surface-50-trans w-6" >
        <div v-if="tooltipData?.recipe_id">
            <div class="col-12 p-2 flex flex-column h-full">
                <div class="col-12 flex justify-content-between">
                    <div class="flex flex-row align-items-center flex-grow-1">
                        <div class="flex flex-column">
                            <h3 class="m-0">
                                📝 {{ getData(tooltipData.class).name }} Recipe
                            </h3>
                            <div v-if="getAutobuildNames(getData(tooltipData.class)?.produced)" class="flex flex-column md:flex-row align-items-baseline gap-2">
                                <ConsumptionTag :consumption="computeConsumption(tooltipData)" />
                                <div>
                                    {{tooltipData.numMachines}} x {{ getAutobuildNames(getData(tooltipData.class)?.produced, tooltipData.numMachines) }} @ {{ Math.round(tooltipData.overclock * 1000000) / 10000 }}%
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="flex">
                    <div class="flex flex-column border-300 align-items-end border-right-1 pr-3 w-6">
                        <div>Inputs</div>
                        <div v-if="!getData(tooltipData.class).ingredients?.length" class="text-sm mt-1">None
                        </div>
                        <div v-for="p of getData(tooltipData.class).ingredients"
                            class="flex flex-row align-items-center-center mt-1">
                            <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm border-round-left cursor-pointer">
                                {{ getName(p.class) }}
                            </div>
                            <div class="px-1 border-1 border-400 text-sm border-round-right">
                                <span>
                                    {{ roundNumber(computePpm(p.quantity, p.class, tooltipData)) }}
                                </span>
                                <span class="text-xxs">
                                    {{ getUom(p.class, tooltipData) }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div class="w-6 ml-3">
                        <div>Outputs</div>
                        <div v-if="!getData(tooltipData.class).products?.length" class="text-sm mt-1">None
                        </div>
                        <div v-for="p of getData(tooltipData.class).products"
                            class="flex flex-row align-items-center-center mt-1">
                            <div class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm border-round-left cursor-pointer">
                                {{ getName(p.class) || getData(tooltipData.class).name
                                }}
                            </div>
                            <div class="px-1 border-1 border-400 text-sm border-round-right">
                                <span>
                                    {{ roundNumber(computePpm(p.quantity, p.class, tooltipData)) }}
                                </span>
                                <span class="text-xxs">
                                    {{ getUom(p.class, tooltipData) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div v-if="getData(tooltipData.class).message" class="col-12">
                    <div class="w-full border-round border-2 border-yellow-900 p-2 text-sm">
                        👉 {{ getData(tooltipData.class).message }}
                    </div>
                </div>
            </div>
        </div>
        <div v-else-if="tooltipData?.material_id">
            <div v-if="tooltipData.consumed > tooltipData.produced" class="border-1 flex align-items-center border-round bg-yellow-900 border-400 px-1 mb-3">
                🚨 Import required.
            </div>
            <div class="mb-2">
                <h3 class="m-0">
                    📦 {{ getName(tooltipData.material_id) }}
                </h3>
                <div class="flex flex-row align-items-baseline gap-2">
                    <div>
                        Net {{ tooltipData.consumed > tooltipData.produced ? 'Deficit' : 'Surplus' }} : 
                    </div>
                    <div :class="`text-${tooltipData.consumed > tooltipData.produced ? 'red' : 'green'}-700 text-xl`">
                        {{ roundNumber(tooltipData.produced - tooltipData.consumed) }}
                        <span class="text-sm">/min</span>
                    </div>
                </div>
            </div>
            <div class="flex gap-2">
                <div class="w-6 pr-2">
                        <div class="flex flex-row text-sm mt-1" style="height: 24px;">
                            <div class="border-1 h-full flex align-items-center justify-content-between border-round-left bg-green-900 border-400 px-1 w-12rem">
                                <i class="pi pi-plus text-green-500 mr-2" />
                                Total Production 
                            </div>
                            <div
                                class="flex h-full border-y-1 border-right-1 p-1 align-items-baseline justify-content-end border-round-right white-space-nowrap border-400 px-1 py-0 flex-grow-1">
                                {{ roundNumber(tooltipData.produced) }} <span class="text-xxs">/min</span>
                            </div>
                        </div>
                        <div class="flex flex-row text-sm mt-1" style="height: 24px;">
                            <div class="border-1 h-full flex align-items-center justify-content-between border-round-left bg-red-900 border-400 px-1 w-12rem">
                                <i class="pi pi-minus text-red-500 mr-2" />
                                Total Consumption 
                            </div>
                            <div
                                class="flex h-full border-y-1 border-right-1 p-1 align-items-baseline justify-content-end border-round-right white-space-nowrap border-400 px-1 py-0 flex-grow-1">
                                {{ roundNumber(tooltipData.consumed) }} <span class="text-xxs">/min</span>
                            </div>
                        </div>
                </div>
                <div class="border-left-1 w-6 pl-3 mt-1">
                    <div v-for="c in tooltipData.consumers" class="flex justify-content-center align-items-center mb-1" style="height: 24px;">
                        <div class="relative border-400 bg-green-900 h-full flex pr-2 w-5rem justify-content-end align-items-center border-1 border-round-left flow-arrow text-sm">{{ c.value }}</div>
                        <div class="flex pl-4 border-400 h-full flex-grow-1 justify-content-start align-items-center border-1 border-round-right text-sm">{{getData(c.target.name).name}}</div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    <div v-if="!loading">
        <ConsumptionTag :consumption="computeFactoryConsumption(factory.factoryData)"  prefix="Total "/>
        <ProgressBar v-if="loading" class="mt-2" mode="indeterminate" style="height: 6px"></ProgressBar>
    </div>
    <div :id="snkid"  @mousemove="updateToolTipPosition" class="sankey-container" style="max-height: 60vw;"></div>
</template>
