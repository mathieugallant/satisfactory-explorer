<script setup>
import InputText from 'primevue/inputtext';
import Slider from 'primevue/slider';
import Button from 'primevue/button';
import Dropdown from 'primevue/dropdown';
import DataView from 'primevue/dataview';
const emit = defineEmits(['checkResetFD']);
let helpOCValue = 0.675;
</script>

<template>
    <div>
        <h3>Need to start over?</h3>
        <p>Use the button bellow to clear all factory data.</p>
        <div class="flex justify-content-center">
            <Button label="Reset Factory Data" severity="warning" @click="() => emit('checkResetFD')" />
        </div>
        <h3>How to use</h3>
        <p>Manage your "Factories" from the main toolbar. You can copy the current factory data to clipboard to share,
            import exported factory data, delete a factory of edit the factory name (You can click on the factory icon to
            generate a random name).</p>
        <div class="p-inputgroup w-full md:w-8 lg:w-6 xl:w-4 border-3 border-red-400 border-round">
            <Button icon="pi pi-copy" severity="info" />
            <Button icon="pi pi-cloud-download" severity="warning" />
            <Button icon="pi pi-trash" severity="danger" />
            <Button icon="pi pi-pencil" severity="success" />
            <Dropdown placeholder="Select a factory" />
            <Button icon="pi pi-plus" />
        </div>
        <p>With a factory selected, the required inputs and outputs are summarized at the top of the production setup. All
            values are expressed as units per minute of the identified material. You can click on the material labels to scroll
            down to the card which produces the related material. If there is another card which produces the same meterial, you 
            can "chain-click" on the material label to move down the list. If there's nothing configured in the current factory
            to produce this material, clicking on a material label will promt you to select a relevant recipe.</p>
        <div class="flex">
            <div
                class="px-1 bg-ficsit-secondary text-white border-1 border-right-none border-round-left border-400 text-sm">
                Iron Ingot
            </div>
            <div class="px-1 border-1 border-400 text-sm border-round-right mr-2">
                <div class="px-1 text-red-600">-360</div>
            </div>
            <div class="px-1 bg-ficsit-primary text-white border-3 border-round-left border-red-600 text-sm">
                Screws
            </div>
            <div class="px-1 border-1 border-400 text-sm border-round-right">
                <div class="px-1 text-green-600">360</div>
            </div>
        </div>
        <p>You can add recipes to the production setup using the recipe selector. All recipes in the game should be
            available, including those which are built manually. The total average consumption of the factory is displayed
            as well.</p>
        <div class="border-x-1 border-1 border-100 pb-4">
            <DataView layout="grid">
                <template #header>
                    <div class="flex flex-column md:flex-row md:justify-content-between">
                        <div class="flex flex-row align-items-center gap-2">
                            <h3 class="m-1">Production Setup</h3>
                            <div class="flex flex-row text-sm mt-1">
                                <div class="border-1 flex align-items-center border-round-left border-400 px-1 ">
                                    Total <i class="pi pi-bolt text-yellow-500" />
                                </div>
                                <div class="border-3 p-1 border-round-right white-space-nowrap border-red-400 px-1 py-0">
                                    254 <span class="text-xxs">MW/h</span>
                                </div>
                            </div>

                        </div>
                        <div class="p-inputgroup w-20rem">
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
            For each recipe added to the production setup, you can click on any material to navigate to the card which produces this material, or as a shortcut to pick a relevant recipe
            if nothing in the factory produces this material.
        </p>
        <div class="flex">
            <div class="px-1 bg-ficsit-secondary text-white border-3 border-red-400 text-sm cursor-pointer border-round-left"
                @click="checkAddRecipe(p.class)">
                Heat Sinks
            </div>
            <div class="border-y-1 border-400 text-sm cursor-pointer">
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
            The total number consumed or produced per minute is displayed. You can click this number to set it to the
            desired value. The number of machine will automatically be adjusted to meet the target without overclock.
        </p>
        <div class="flex">
            <div class="px-1 bg-ficsit-secondary text-white border-1 border-400 text-sm cursor-pointer border-round-left"
                @click="checkAddRecipe(p.class)">
                Heat Sinks
            </div>
            <div class="border-y-1 border-400 text-sm cursor-pointer">
                <div class="px-1 text-red-600">-360</div>
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
            consumes.
            If a deficit or surplus is present in the setup, it will be displayed in red or green.
            Clicking on the red or green number will adjust the overclock setting of the production setup to equalize it.
            Note that the required overclock value may be outside of what is possible in the game. You can click the total
            number as shown above to fix this.
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
            You can manually set the overclock value as a multiplier. This means, for example, the value of 1 is equal to
            100%, 0.5 equals 50% or 2.5 equals 250%. Note that setting a multiplier higher than 1.625 for Mk3 miners has no 
            effect as there is no belt in the game which can exceed 780ppm. 
        </p>
        <p>
            You can also adjust the number of machines contributing to the production. The power consumption of all machines
            adjusted for the defined overclock value is displayed at the top of the card.
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
                        <div class="p-inputgroup flex-1">
                            <span class="p-inputgroup-addon">
                                🚀
                            </span>
                            <InputText v-model="helpOCValue" class="w-full border-3 border-red-400" />
                            <Button icon="pi pi-refresh" />
                        </div>
                        <Slider v-model="helpOCValue" class="w-full" :max="2.5" :step="0.05" style="margin-top: -4px;" />
                    </div>
                    <div class="w-full mt-3">
                        <div class="p-inputgroup flex-1">
                            <Button icon="pi pi-minus" />
                            <InputText value="2x Constructors" class=" border-3 border-red-400" />
                            <Button icon="pi pi-plus" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>