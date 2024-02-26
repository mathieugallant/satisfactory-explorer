<script setup>
import { onMounted } from 'vue';
import { sankeyfy } from './sankeyfy';

const props = defineProps(['graph']);
      
const snkid = 'snk-' + String(Math.random()).split('.')[1]

onMounted(() => {
    sankeyfy({data: props.graph, id: '#' + snkid, logarithmic: false });
})

</script>

<template>
    <div :id="snkid"></div>
</template>

<style>
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
            stroke-width: 5;
            stroke: yellow;
        }
    }

    @keyframes dash {
        to {
            stroke-dashoffset: 0;
        }
    }
</style>