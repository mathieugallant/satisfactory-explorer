<script setup>
import { onMounted, ref, nextTick } from 'vue';
import UploadForm from './components/UploadForm.vue';
import TabContainer  from './components/TabContainer.vue';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useConfirm } from "primevue/useconfirm";

const confirm = useConfirm();

const mainData = {};
const showUploadForm = ref(false);
const showHelp = ref(false);
const initialized = ref(false);

const ressources = [
  "Desc_OreCopper_C",
  "Desc_OreGold_C",
  "Desc_OreIron_C",
  "Desc_OreBauxite_C",
  "Desc_OreUranium_C",
  "Desc_Stone_C",
  "Desc_RawQuartz_C",
  "Desc_Coal_C",
  "Desc_Sulfur_C",
  "Desc_Water_C",
  "Desc_LiquidOil_C",
  "Desc_NitrogenGas_C"
];

const closeUpload = () => {
  showUploadForm.value = false;
  initializeData();
};

const initializeData = () => {
  const tRecipes = localStorage.getItem('recipeData');
  const tDescs = localStorage.getItem('descData');
  try {
    mainData.recipes = JSON.parse(tRecipes);
    mainData.descs = JSON.parse(tDescs);
    if (mainData.recipes && mainData.descs) initialized.value = true;
    else showUploadForm.value = true;
  }
  catch {
    showUploadForm.value = true;
  }
}

onMounted(() => {
  initializeData();
});

const checkResetGD = () => {
  confirm.require({
        message: `Really reset the Game Data?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => {
          localStorage.removeItem('recipeData');
          localStorage.removeItem('descData');
          showUploadForm.value = true;
          showHelp.value = false;
          initialized.value = false;
        }
    });  
}
const checkResetFD = () => {
  confirm.require({
        message: `Really reset the Factory Data?`,
        icon: 'pi pi-exclamation-triangle',
        acceptClass: 'p-button-danger',
        accept: () => {
            localStorage.removeItem('factoryData');
            initialized.value = false;
            nextTick(() => initializeData());
            
        }
    });  
}
</script>

<template>
  <Dialog v-model:visible="showHelp" modal header="Issues loading or outdated data?" class="w-11 lg:w-9">
      <p>If the application does not load and you are not automatically presented with the option to load/reload the game data, you can do so using the button below.</p>
      <div class="flex justify-content-center">
        <Button label="Reset Game Data" severity="alert" @click="checkResetGD"/>
      </div>
      <p>Resetting the game data does not change your factory data. If the factory data is somehow the problem, you can reset that using this button.</p>
      <div class="flex justify-content-center">
        <Button label="Reset Factory Data" severity="warning" @click="checkResetFD"/>
      </div>
  </Dialog>
  <div class="absolute top-0 h-2rem w-full bg-primary flex align-items-center justify-content-between">
    <div class="flex align-items-center">
      <img src="./assets/satisfactory_logo.png" class="h-2rem m-2" />
      <span class="mr-2 text-white">explorer</span>
    </div>
    <div class="flex justify-content-center align-items-center gap-3 pr-3">
      <div class="flex justify-content-center align-items-center border-circle cursor-pointer w-1rem h-1rem text-white border-2 border-white text-xs" @click="() => showHelp = true">?</div>
      <a href="https://github.com/mathieugallant/satisfactory-explorer" target="_blank">
        <i class="pi pi-github text-white" />
      </a>
    </div>
  </div>
  <div>
    <TabContainer v-if="initialized" :mainData="mainData" />
  </div>
  <ConfirmDialog />
  <Toast />
  <UploadForm v-if="showUploadForm" @processing-completed="closeUpload" />
</template>

<style>
body {
  margin: 2rem 0 0;
  padding: 0;
  font-family: var(--font-family);
}

.bg-ficsit-primary {
  background-color: #FA9549;
}
.bg-ficsit-secondary {
  background-color: #5F668C;
}

.text-xxs {
  font-size: 0.5rem;
}
</style>