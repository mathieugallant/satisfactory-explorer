<script setup>
import { onMounted, ref, nextTick, computed } from 'vue';
import TabContainer from './components/TabContainer.vue';
import RecipeCompare from './components/RecipeCompare.vue';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { useConfirm } from "primevue/useconfirm";
import Recipies from "./recipeData.json";
import Descriptions from "./descData.json";
import Help from "./components/Help.vue"
import Dialog from 'primevue/dialog';
import localForage from 'localforage';
import { useRoute, useRouter } from 'vue-router';

const router = useRouter();
const route = useRoute();
const confirm = useConfirm();

const mainData = {};
const showHelp = ref(false);
const initialized = ref(false);
const mode = computed(() => route.query.mode);

onMounted(() => {
  mainData.recipes = Recipies;
  mainData.descs = Descriptions;
  initialized.value = true;
});

const setMode = (newMode) => {
  router.push({ query: { ...route.query, mode: newMode } });
}

const checkResetFD = () => {
  confirm.require({
    message: `Really reset the Factory Data?`,
    icon: 'pi pi-exclamation-triangle',
    acceptClass: 'p-button-danger',
    accept: () => {
      initialized.value = false;
      localForage.removeItem('factoryData').then(() => {
        nextTick(() => {
          initialized.value = true;
          showHelp.value = false
        });
      })
    }
  });
}
</script>

<template>
  <Dialog v-model:visible="showHelp" modal header="How to use" class="w-11 lg:w-9">
    <Help @checkResetFD="checkResetFD()" />
  </Dialog>
  <div class="z-5 w-full bg-primary flex align-items-center justify-content-between h-2rem">
    <div class="flex align-items-center">
      <img src="./assets/satisfactory_logo.png" class="h-2rem mx-2" />
      <div
        :class="`cursor-pointer pt-1 flex-center border-bottom-3 w-4rem md:w-8rem h-2rem bg-yellow-300 border-${mode === 'explorer' ? 'red-400 font-bold' : 'yellow-300'}`"
        @click="setMode('explorer')">
        <span><i class="pi pi-search mr-2" /></span>
        <span class="hidden md:block">explorer</span>
      </div>
      <div
        :class="`cursor-pointer pt-1 flex-center border-bottom-3 w-4rem md:w-8rem h-2rem bg-green-300 border-${mode === 'planner' ? 'red-400 font-bold' : 'green-300'}`"
        @click="setMode('planner')">
        <span><i class="pi pi-sitemap mr-2" /></span>
        <span class="hidden md:block">planner</span>
      </div>
    </div>
    <div class="flex justify-content-center align-items-center gap-3 pr-3">
      <div
        class="flex justify-content-center align-items-center border-circle cursor-pointer w-1rem h-1rem text-white border-2 border-white text-xs"
        @click="() => showHelp = true">?</div>
      <a href="https://github.com/mathieugallant/satisfactory-explorer" target="_blank">
        <i class="pi pi-github text-white" />
      </a>
    </div>
  </div>
  <TabContainer v-if="mode === 'planner' && initialized" :mainData="mainData" />
  <RecipeCompare v-if="mode === 'explorer' && initialized" :mainData="mainData" />
  <ConfirmDialog />
  <Toast />
</template>

<style>
body {
  margin: 0;
  padding: 0;
  font-family: var(--font-family);
}

.bg-ficsit-primary {
  background-color: #FA9549;
}

.bg-ficsit-secondary {
  background-color: #5F668C;
}

.p-dropdown-panel {
  max-width: 100vw;
}

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}

.text-xxs {
  font-size: 0.5rem;
}

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

.sankey-label > tspan:nth-child(1n+2) {
    font-size: 60%; /* Adjust the value as needed */
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