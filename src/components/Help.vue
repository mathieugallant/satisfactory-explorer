<script setup>
import InputText from 'primevue/inputtext';
import Slider from 'primevue/slider';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import DataView from 'primevue/dataview';
import FactorySelector from './FactorySelector.vue';
import SupplyDisplay from './SupplyDisplay.vue';
import { ref } from 'vue';
const emit = defineEmits(['checkResetFD']);
const exampleSelection = ref({id: 'Example Factory'});
let helpOCValue = 0.675;
</script>

<template>
    <div>
        <h2>Explorer Mode</h2>
        <p>Select a material from the drop-down list. The adjustable parts-per-minute setting is set to 1 by default.</p>
        <p>Clicking the 🚀 button will show the required settings for each recipe to match the set parts-per-minute with maximum overclock.</p> 
        <p>Clicking the ⚖️ button will show the required settings for each recipe to match the set parts-per-minute with no overclock.</p>
        <hr>
        <h2>Planner Mode</h2>
        <h3>Need to start over?</h3>
        <p>Use the button bellow to clear all factory data.</p>
        <div class="flex justify-content-center">
            <Button label="Reset Factory Data" severity="warning" @click="() => emit('checkResetFD')" />
        </div>
        <p>Manage your "Factories" from the main toolbar. You can copy the current factory data to clipboard to share,
            import exported factory data, delete a factory or edit the factory name (You can click 🏭 to
            generate a random name in those dialog boxes).</p>
        <p class="hidden md:block">
            A global oberview <i class="pi pi-globe" /> is also available which displays the overall material flow across all your factories.
        </p>
        <p>Use the <i class="pi pi-eye" /> button to hide/unhide this factory from the global production setup.</p>
        <FactorySelector 
            :callbacks="{showOverview: ()=>null, factoryToClipboard: ()=>null, pasteFactory: ()=>null, confirmDelete: ()=>null, editFactoryName: ()=>null, createFactory: ()=>null}"
            :factories="[{id: 'Example Factory'}]"
            v-model="exampleSelection"
        />
        <p>With a factory selected, the required inputs and outputs are summarized at the top of the production setup. All
            values are expressed as units per minute of the identified material.</p>
        <div class="flex">
            <div
                class="px-1 bg-ficsit-secondary text-white border-1 border-right-none border-round-left border-400 text-sm">
                Iron Ingot
            </div>
            <div class="px-1 border-1 border-400 text-sm border-round-right mr-2">
                <div class="px-1 text-red-600">-360</div>
            </div>
            <div class="px-1 bg-ficsit-primary text-white border-round-left text-sm">
                Screws
            </div>
            <div class="px-1 border-1 border-400 text-sm border-round-right">
                <div class="px-1 text-green-600">360</div>
            </div>
        </div>
        <p>Right-click a material label to see options. Click on the material labels to scroll
            down to the card which produces the related material. Repeat to go to the next machine setup producing the same material, if any. If no factory produce this material, it will promt you to add a suitable recipe.</p>

        <p>You can add recipes to the production setup using the recipe selector. The total average consumption of the factory is displayed. Clicking "Production Setup" will sort cards alphabetically.</p>
        <div class="border-x-1 border-1 border-100 pb-4">
            <DataView layout="grid">
                <template #header>
                    <div class="flex flex-column md:flex-row md:justify-content-between">
                        <div class="flex flex-row align-items-center gap-2">
                            <h3 class="m-1">Production Setup <i class="pi pi-sort-alpha-down" /></h3>
                            <div class="flex flex-row text-sm mt-1">
                                <div class="border-1 flex align-items-center border-round-left border-400 px-1 ">
                                    Total <i class="pi pi-bolt text-yellow-500" />
                                </div>
                                <div class="border-3 p-1 border-round-right white-space-nowrap border-red-400 px-1 py-0">
                                    254 <span class="text-xxs">MW/h</span>
                                </div>
                            </div>

                        </div>
                        <div class="p-inputgroup md:w-20rem">
                            <Dropdown optionLabel="name" placeholder="Select a Recipe"
                                class="w-full md:w-14rem border-3 border-red-400">
                            </Dropdown>
                            <Button icon="pi pi-plus" class="bg-bluegray-600 hover:bg-bluegray-400 border-bluegray-700" />
                        </div>
                    </div>
                </template>
            </DataView>
        </div>
        <p>
            The total number consumed or produced per minute is displayed. You can click this number to set it to the
            desired value. The number of machine will automatically be adjusted to meet the target without overclock.
        </p>
        <div class="flex">
            <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer border-round-left"
                @click="checkAddRecipe(p.class)">
                Heat Sinks
            </div>
            <div class="border-y-1 border-400 text-sm cursor-pointer">
                <SupplyDisplay :supply="0" />
            </div>
            <div class="px-1 border-3 border-red-400 text-sm cursor-pointer  border-round-right">
                <span>
                    200
                </span>
                <span class="text-xxs">
                    /min
                </span>
            </div>
        </div>
        <p>
            If a checkmark is displayed next to a material, it means the factory produces an equal amount than what it
            consumes.</p>
            <div class="flex">
            <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer border-round-left"
                @click="checkAddRecipe(p.class)">
                Heat Sinks
            </div>
            <div class="border-y-1 border-3 border-red-400 border-400 text-sm cursor-pointer">
                <SupplyDisplay :supply="0" />
            </div>
            <div class="px-1 border-1 border-400 text-sm cursor-pointer  border-round-right">
                <span>
                    200
                </span>
                <span class="text-xxs">
                    /min
                </span>
            </div>
        </div>
        <p>
            If a deficit or surplus is present in the setup, it will be displayed in red or green.
            Clicking on this number will balance the number of machines and overclock setting to eliminate this surplus or defitit.
        </p>
        <div class="flex">
            <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer border-round-left"
                @click="checkAddRecipe(p.class)">
                Heat Sinks
            </div>
            <div class="border-3 border-red-400 text-sm cursor-pointer">
                <div class="px-1 text-red-600">-360</div>
            </div>
            <div class="px-1 border-1 border-400 text-sm cursor-pointer  border-round-right">
                <span>
                    200
                </span>
                <span class="text-xxs">
                    /min
                </span>
            </div>
        </div>
        <p>
            Two balance numbers are shown for outputs. The left number highlighted in blue represents the global deficit or surplus for that material.
            The right number highlighted in green represents the deficit or surplus local to this factory. 
            Clicking on this number will balance the number of machines and overclock setting to eliminate the surplus or deficit at the global or local level according to your selection.
        </p>
        <div class="flex">
            <div class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm cursor-pointer border-round-left"
                @click="checkAddRecipe(p.class)">
                Heat Sinks
            </div>
            <div class="border-3 border-blue-400 text-sm cursor-pointer">
                <div class="px-1 text-red-600">-360</div>
            </div>
            <div class="border-3 border-green-400 text-sm cursor-pointer">
                <div class="px-1 text-green-600">✓</div>
            </div>
            <div class="px-1 border-1 border-400 text-sm cursor-pointer  border-round-right">
                <span>
                    200
                </span>
                <span class="text-xxs">
                    /min
                </span>
            </div>
        </div>
        <p>
            The production cards have manual fields to set the number of machines and desired overclock value.
        </p>
        <div class="col-12 lg:col-6 xl:col-4 mt-2 py-2 pl-3 p-fluid recipe-card">
            <div class="col-12 p-2 shadow-2 grid surface-50">
                <div class="col-12 flex justify-content-between">
                    <div class="flex flex-row align-items-center flex-grow-1">
                        <div class="flex flex-column">
                            <h3 class="m-0">
                                Steel Pipe
                            </h3>
                            <div class="flex flex-row text-sm mt-1">
                                <div class="border-1 flex align-items-center border-round-left border-400 px-1 ">
                                    <i class="pi pi-bolt text-yellow-500" />
                                </div>
                                <div
                                    class="border-y-1 border-right-1 p-1 border-round-right white-space-nowrap border-400 px-1 py-0">
                                    4.76 <span class="text-xxs">MW/h</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div>
                        <Button icon="pi pi-times" severity="danger" size="small" class="w-2rem h-2rem" />
                    </div>
                </div>
                <div class="col-12 material-list">
                    <div class="mats">
                        <div class="flex flex-column border-300 mats-in w-full">
                            <div>Inputs</div>
                            <div class="flex flex-row align-items-center-center mt-1">
                                <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer border-round-left"
                                    @click="checkAddRecipe(p.class)">
                                    Steel Ingot
                                </div>
                                <div class="border-y-1 border-400 text-sm cursor-pointer">
                                    <div class="px-1 text-red-600">-112.5</div>
                                </div>
                                <div class="px-1 border-1 border-400 text-sm cursor-pointer  border-round-right">
                                    <span>
                                        40.5
                                    </span>
                                    <span class="text-xxs">
                                        /min
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div class="w-full">
                            <div>Outputs</div>
                            <div class="flex flex-row align-items-center-center mt-1">
                                <div
                                    class="px-1 bg-ficsit-primary text-white border-1 border-400 text-sm  border-round-left">
                                    Steel Pipe
                                </div>
                                <div class="border-1 border-400 text-sm cursor-pointer">
                                    <div class="px-1 text-green-600">✓</div>
                                </div>
                                <div class="border-y-1 border-400 text-sm cursor-pointer">
                                    <div class="px-1 text-green-600">27</div>
                                </div>
                                <div class="px-1 border-1 border-400 text-sm cursor-pointer border-round-right">
                                    <span>
                                        27
                                    </span>
                                    <span class="text-xxs">
                                        /min
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-12">
                    <div class="w-full">
                        <div class="p-inputgroup flex-1 border-3 border-red-400">
                            <span class="p-inputgroup-addon">
                                🚀
                            </span>
                            <InputText v-model="helpOCValue" class="w-full" />
                            <span title="Balance without overclock" class="p-inputgroup-addon cursor-pointer">
                                ⚖️
                            </span>
                            <span title="Reset to 100% without balancing"
                                class="p-inputgroup-addon cursor-pointer">
                                <i class="pi pi-refresh" />
                            </span>
                        </div>
                        <Slider v-model="helpOCValue" class="w-full" :max="2.5" :step="0.05" style="margin-top: -4px;" />
                    </div>
                    <div class="w-full mt-3">
                        <div class="p-inputgroup flex-1 border-3 border-red-400">
                            <Button icon="pi pi-minus" />
                            <InputText value="2x Constructors" />
                            <Button icon="pi pi-plus" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <p>
            The overclock value is set as a multiplier. For example, a value of 1 is equal to
            100%, 0.5 equals 50% and 2.5 equals 250%.
        </p>
        <p>Clicking the 🚀 button will attempt to match the set output rate with as few machines as possible.</p> 
        <p>Clicking the ⚖️ button will attempt to match the set output rate by adding as many machines as needed to stay at or bellow 100% clock speed.
        </p>
    </div>
</template>