<script setup>
import { onMounted, ref } from 'vue';
import UploadForm from './components/UploadForm.vue';
import TabContainer  from './components/TabContainer.vue';
import ConfirmDialog from 'primevue/confirmdialog';
import Toast from 'primevue/toast';

const mainData = {};
const showUploadForm = ref(false);

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

const closeUpload = () => showUploadForm.value = false;



onMounted(() => {
  const tRecipes = localStorage.getItem('recipeData');
  const tDescs = localStorage.getItem('descData');
  if (tRecipes && tDescs) {
    mainData.recipes = JSON.parse(tRecipes);
    mainData.descs = JSON.parse(tDescs);
  }
  else {
    showUploadForm.value = true;
  }
})
</script>

<template>
  <div class="absolute top-0 h-2rem w-full bg-primary flex align-items-center justify-content-between">
    <div class="flex align-items-center">
      <img src="./assets/satisfactory_logo.png" class="h-2rem m-2" />
      <span class="mr-2 text-white">explorer</span>
    </div>
    <a href="https://github.com/mathieugallant/satisfactory-explorer" target="_blank">
      <i class="pi pi-github m-4 text-white" />
    </a>
  </div>
  <div>
    <TabContainer :mainData="mainData" />
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