<script setup>
import { ref } from 'vue';
import jsonata from 'jsonata';

import Button from 'primevue/button';

const emit = defineEmits(['processingCompleted']);

const finput = ref();
const processingData = ref(false);

const getDescriptions = (rawData) => {
  const jsonexp = `$[].Classes[$contains(ClassName, 'Desc_') or $contains(ClassName, 'BP_') or $contains(ClassName, 'Build_')].{
      "class": ClassName,
      "name": mDisplayName,
      "description": mDescription,
      "abbreviated": mAbbreviatedDisplayName,
      "discardable": mCanBeDiscarded,
      "energy": mEnergyValue,
      "decay": mRadioactiveDecay,
      "form": mForm,
      "smallIcon": mSmallIcon,
      "bigIcon": mPersistentBigIcon,
      "resourceSinkPoints": mResourceSinkPoints
  }`;
  return jsonata(jsonexp).evaluate(rawData).then(pDesc => {
    const pData = {};
    [...pDesc].forEach(x => pData[x.class] = x);
    return pData;
  });
}

const getRecipes = (rawData) => {
  const jsonexp = `$[].Classes[$contains(ClassName, 'Recipe_')].
  {
      "class": ClassName,
      "name": mDisplayName,
      "ingredients": [$split($replace($replace($replace(mIngredients, /^\\((.*)\\)$/, '$1'), '(', ''), /\\)$/, ''), '),').{"class": $replace(/.*\\.([A-Za-z0-9_]*)"',.*/, '$1'), "quantity": $replace(/.*=([0-9]*)/, "$1")}],
      "products": [$split($replace($replace($replace(mProduct, /^\\((.*)\\)$/, '$1'), '(', ''), /\\)$/, ''), '),').{"class": $replace(/.*\\.([A-Za-z0-9_]*)"',.*/, '$1'), "quantity": $replace(/.*=([0-9]*)/, "$1")}],
      "produced": [$split($replace(mProducedIn, /\\((.*)\\)/, '$1'), ',').$replace($string(), /.*\\.([A-Za-z0-9_]+)/, '$1')],
      "duration": mManufactoringDuration,
      "consumptionConstant": mVariablePowerConsumptionConstant,
      "consumptionFactor": mVariablePowerConsumptionFactor
  }`;


  return jsonata(jsonexp).evaluate(rawData).then(pDesc => {
    return [...pDesc];
  });  
}

const loadData = (event) => {
    const rawData = JSON.parse(event.target.result);
    const pProcess = [getDescriptions(rawData), getRecipes(rawData)];
    Promise.all(pProcess).then(result => {
      localStorage.setItem('descData', JSON.stringify(result[0]));
      localStorage.setItem('recipeData', JSON.stringify(result[1]));
      emit('processingCompleted');
    })
    .catch(e => {
      console.error(e);
    });
}

const checkData = () => {
    const reader = new FileReader();
    reader.onload = loadData;
    reader.readAsText(finput.value.files[0]);
}


const useDefault = () => {
  import('../Docs.json').then(rawData => {
    loadData({target: {result: JSON.stringify(rawData.default)}});
  });
}
</script>

<template>
    <div class="absolute top-0 w-screen h-screen flex justify-content-center align-items-center" style="background-color: #00000099;">
        <div v-if="processingData" class="w-11 md:w-10 lg:w-8 bg-white border-round p-3 flex flex-column justify-content-center align-items-center">
            <h2 class="mb-4">Processing...</h2>
            <div class="mb-4 h-5rem w-5rem flex justify-content-center align-items-center">
                <div class="bounce border-circle w-2rem h-2rem bg-yellow-500"></div>
            </div>
        </div>
        <div v-else class="w-11 md:w-10 lg:w-8 bg-white border-round p-3 flex flex-column justify-content-center align-items-center">
            <h2 class="mb-4">Upload Current Community Data</h2>
            <div class="mb-3">Upload your Docs.json file located in the `CommunityRessources/Docs` folder.</div>
            <input accept="application/json" ref="finput" class="mb-4" type="file" @change="checkData">
            <div class="w-full flex justify-content-center mb-4">OR</div>
            <Button label="Use Built-In Data" @click="useDefault()"/>
        </div>
    </div>
</template>

<style>
.bounce {
  animation: bounce-in 1s;
  animation-iteration-count: infinite;
}

@keyframes bounce-in {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(1);
  }
}
</style>