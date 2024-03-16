<script setup>
import { onMounted, ref, nextTick } from 'vue';
import TabContainer  from './components/TabContainer.vue';
import RecipeCompare from './components/RecipeCompare.vue';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import { useConfirm } from "primevue/useconfirm";
import Recipies from "./recipeData.json";
import Descriptions from "./descData.json";
import Help from "./components/Help.vue"
import Dialog from 'primevue/dialog';
import localForage from 'localforage';
const confirm = useConfirm();

const mainData = {};
const showHelp = ref(false);
const initialized = ref(false);
const factoryNav = ref({});
const mode = ref();

onMounted(() => {
  mainData.recipes = Recipies;
  mainData.descs = Descriptions;
  initialized.value = true;
  localForage.getItem('lastMode').then(newMode => mode.value = newMode || "explorer");
});

const setMode = (newMode) => {
  mode.value = newMode;
  localForage.setItem('lastMode', newMode);
  factoryNav.value = {};
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

const goToFactory = ({factory, recipe}) => {
  factoryNav.value = {factory, recipe};
  mode.value = 'planner';
  localForage.setItem('lastMode', 'planner');
}
</script>

<template>
  <Dialog v-model:visible="showHelp" modal header="How to use" class="w-11 lg:w-9">
    <Help @checkResetFD="checkResetFD()" />
  </Dialog>
  <div class="w-full">
    <div class="z-5 w-full bg-primary flex align-items-center justify-content-between md:sticky top-0" style="height: 32px;">
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
        <div class="flex justify-content-center align-items-center border-circle cursor-pointer w-1rem h-1rem text-white border-2 border-white text-xs" @click="() => showHelp = true">?</div>
        <a href="https://github.com/mathieugallant/satisfactory-explorer" target="_blank">
          <i class="pi pi-github text-white" />
        </a>
      </div>
    </div>
    <div v-if="mode==='planner'" class="w-full">
      <TabContainer v-if="initialized" :mainData="mainData" :factoryNav="factoryNav" />
    </div>
    <div v-if="mode==='explorer'" class="w-full">
      <RecipeCompare v-if="initialized" :mainData="mainData" @showFactoryMaterial="goToFactory"/>
    </div>
  </div>
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
</style>