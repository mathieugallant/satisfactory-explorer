<script setup>
import { onMounted, ref, nextTick } from 'vue';
import TabContainer  from './components/TabContainer.vue';
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

onMounted(() => {
  mainData.recipes = Recipies;
  mainData.descs = Descriptions;
  initialized.value = true;
});

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
    <div class="md:fixed md:top-0 md:pt-5 md:h-screen w-full">
      <TabContainer v-if="initialized" :mainData="mainData" />
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

.text-xxs {
  font-size: 0.5rem;
}
</style>