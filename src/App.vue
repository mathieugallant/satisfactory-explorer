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
const mode = ref();

onMounted(() => {
  mainData.recipes = Recipies;
  mainData.descs = Descriptions;
  initialized.value = true;
  localForage.getItem('lastMode').then(newMode => mode.value = newMode || "explorer");
});

const setMode = (newMode) => {
  mode.value = newMode;
  localForage.setItem('lastMode', newMode)
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
  <Dialog v-model:visible="showHelp" modal header="Help" class="w-11 lg:w-9">
    <Help @checkResetFD="checkResetFD()" />
  </Dialog>
    <div class="md:fixed z-5 top-0 h-2rem w-full bg-primary flex align-items-center justify-content-between">
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
    <div v-if="mode==='planner'" class="md:fixed md:top-0 md:pt-5 md:h-screen w-full">
      <TabContainer v-if="initialized" :mainData="mainData" />
    </div>
    <div v-if="mode==='explorer'" class="md:fixed md:top-0 md:pt-5 md:h-screen w-full">
      <RecipeCompare v-if="initialized" :mainData="mainData" />
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

.flex-center {
  display: flex;
  justify-content: center;
  align-items: center;
}
.text-xxs {
  font-size: 0.5rem;
}
</style>