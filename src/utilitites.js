import descs from "./descData.json";
import recipes from "./recipeData.json"

export const manualBuildClasses = [
    "BP_BuildGun_C",
    "BP_WorkshopComponent_C",
    "BP_WorkBenchComponent_C",
    "FGBuildGun",
    "FGBuildableAutomatedWorkBench",
];

export const extractorFactors = {
    Desc_Coal_C: 1,
    Desc_RawQuartz_C: 1,
    Desc_OreUranium_C: 1, 
    Desc_OreGold_C: 1,
    Desc_OreCopper_C: 1,
    Desc_OreIron_C: 1,
    Desc_OreBauxite_C: 1,
    Desc_Stone_C: 1,
    Desc_Sulfur_C: 1,

    Desc_NitrogenGas_C: 0.001,

    Desc_Water_C: 1,
    Desc_LiquidOil_C: 1,
};

export const getData = (tClass) => {
    if (tClass?.startsWith('Recipe')) {
        return recipes.find(r=>r.class === tClass);
    }
    return descs.find?.(d=>d?.class === tClass);
};

export const computeFactoryConsumption = (factoryConfig) => {
    return Math.round(Object.values(factoryConfig).reduce((p, data) => {
        const prodData = getData(data.class);
        const defaultProducer = descs[prodData.produced.filter(x => !manualBuildClasses.includes(x))?.[0]];
    
        
        let consumption = Number(defaultProducer?.powerConsumption) || Number(prodData?.consumptionFactor);
        
        if(!consumption || !defaultProducer ) {
            return p;
        }
        
        const maxConsumption =  consumption * Math.pow(data.overclock,defaultProducer.powerExponent) * data.numMachines;
    
        return p + maxConsumption;
    }, 0)*100)/100;
};

export const conputeGlobalConsumption = (factories) => {
    let globalPower = 0;
    factories.filter(f => !f.hidden).forEach((factory) => globalPower += Object.values(factory.factoryData).reduce((p, data) => {
        const prodData = getData(data.class);
        const defaultProducer = descs[prodData.produced.filter(x => !manualBuildClasses.includes(x))?.[0]];
    
        
        let consumption = Number(defaultProducer?.powerConsumption) || Number(prodData?.consumptionFactor);
        
        if(!consumption || !defaultProducer ) {
            return p;
        }
        
        const maxConsumption =  consumption * Math.pow(data.overclock,defaultProducer.powerExponent) * data.numMachines;
    
        return p + maxConsumption;
    }, 0))
    return Math.round(globalPower * 100) / 100
}

export const computeConsumption = (data) => {
    const prodData = getData(data.class);
    const defaultProducer = descs[prodData.produced.filter(x => !manualBuildClasses.includes(x))?.[0]];

    
    let consumption = Number(defaultProducer?.powerConsumption) || (Number(prodData?.consumptionFactor) + Number(prodData?.consumptionConstant));
    
    if(!consumption || !defaultProducer ) {
        return '';
    }
    
    const maxConsumption =  Math.round(consumption * Math.pow(data.overclock,defaultProducer.powerExponent) * data.numMachines *100)/100;
    const minConsumption = Math.round(prodData?.consumptionConstant * Math.pow(data.overclock,defaultProducer.powerExponent) * data.numMachines*100)/100;
    const avgConsumption = Math.round(prodData?.consumptionFactor * Math.pow(data.overclock,defaultProducer.powerExponent) * data.numMachines*100)/100;

    return (minConsumption ? minConsumption + '-': '') + maxConsumption + (minConsumption ? ' (avg. ' + avgConsumption + ')': '');
};

export const maxEffectiveOc = (rClass) => {
    if (rClass.endsWith('PureMk3')) {
        return 1.625;
    }
    return 2.5
}

export const getAllNetDefecits = (factoryConfig) => {
    const res = [];
    getFactoryClasses(factoryConfig).forEach(p => {
        const netSupply = computeSupply(p, factoryConfig);
        if (roundNumber(netSupply) < 0) {
            res.push({desc: p, name: getName(p), value: netSupply});
        }
    })
    
    return res.sort((a, b) => {
        const stringA = getName(a.name);
        const stringB = getName(b.name);
        return stringA.localeCompare(stringB);
    });
};

export const getGlobalProductDefecit = (pClass, factories) => {
    const res = {desc: pClass, name: getName(pClass), value: 0};
    factories.filter(f => !f.hidden).forEach(f => {
        if (f.factoryData){
            res.value += computeSupply(pClass, f.factoryData);
        }
    });
    
    res.value = roundNumber(res.value);
    return res;
};

export const getFactoryClasses = (factoryConfig) => {
    const classes = {};
    Object.values(factoryConfig)?.forEach(t => {
        const r = getData(t.class);
        r?.ingredients.forEach(i => classes[i.class] = true);
        r?.products.forEach(i => classes[i.class] = true);
    });
    return Object.keys(classes);
};

export const computeSupply = (dClass, factoryConfig) => {
    let supply = 0;
    Object.values(factoryConfig).forEach(t => {
        const r = {...t,...getData(t.class)};
        r.ingredients.forEach(i => {
            if(i.class === dClass) {
                supply -= computePpm(i.quantity, i.class, r);
            }
        });
        r.products.forEach(i => {
            if(i.class === dClass) {
                supply += computePpm(i.quantity, i.class, r);
            }
        });
    });
    return supply;
};

export const getAllNetProduction = (factoryConfig) => {
    const res = [];
    getFactoryClasses(factoryConfig).forEach(p => {
        const netSupply = computeSupply(p, factoryConfig);
        if (roundNumber(netSupply) > 0) {
            res.push({desc: p, name: getName(p), value: netSupply});
        }
    })

    return res.sort((a, b) => {
        const stringA = getName(a.name);
        const stringB = getName(b.name);
        return stringA.localeCompare(stringB);
    });
};

export const roundNumber = (num) => {
    return Math.round(num * 1000) / 1000;
};

export const computePpm = (quantity, dClass, data) => {
    const prodData = getData(data.class);
    if(isManual(prodData)) {
        return quantity / prodData?.products?.[0]?.quantity;
    }

    const factor = extractorFactors[dClass] || 1;
    let correction = 1;
    if (isExtractor(prodData) && ['Desc_LiquidOil_C'].includes(dClass)) {
        correction = 2;
    }
    return Math.round(
        ( 
            quantity / 
            (descs[dClass].form === "RF_LIQUID" && !isExtractor(data)  ? 1000 : 1)
        ) * 
        (60 / prodData.duration) * 
        data.overclock * 
        data.numMachines * 
        factor * correction *
        100
    ) / 100;
};

export const getName = (dClass) => {
    if (dClass === 'Build_Converter_C') {
        return 'Extrator';
    }
    return descs?.[dClass]?.name || dClass;
};

export const getAutobuildNames = (produced, num = 1) => {
    return produced.filter(x => !manualBuildClasses.includes(x)).map(x=> {
        let tname = getName(x);
        if (num > 1) {
            if (tname.endsWith('y')) {
                tname = tname.slice(0, -1) + 'ies';
            }
            else tname += 's';
        }
        return tname;
    }).join(', ');
}

export const getUom = (dClass, data) => {
    if (isManual(getData(data?.class))) {
        return '';
    }
    return descs[dClass].form === "RF_LIQUID" ? 'm³/min' : '/min'
};

export const isExtractor = (data) => {
    return getData(data.class).produced.includes('Build_Converter_C')
};

export const isManual = (data) => {
    return !data?.produced?.filter(x => !manualBuildClasses.includes(x))?.length;
};
