import descs from "./descData.json";
import recipes from "./recipeData.json"

export const manualBuildClasses = [
    "BP_BuildGun_C",
    "BP_WorkshopComponent_C",
    "BP_WorkBenchComponent_C",
    "FGBuildGun",
    "FGBuildableAutomatedWorkBench",
];

export const getData = (tClass) => {
    if (tClass?.startsWith('Recipe')) {
        return recipes.find(r=>r.class === tClass);
    }
    return descs[tClass];
};

export const computeFactoryConsumption = (factoryConfig) => {
    const consumption = Object.values(factoryConfig).reduce((p, data) => {
        const {maxConsumption, minConsumption} = getConsumption(data)
    
        return {
            maxConsumption: p.maxConsumption + maxConsumption || 0,
            minConsumption: p.minConsumption + minConsumption || 0
        }
    }, {
        maxConsumption: 0,
        minConsumption: 0
    });
    return formatConsumptionString(consumption);
};

export const conputeGlobalConsumption = (factories) => {
    const consumption = factories.filter(f => !f.hidden).flatMap((factory) => Object.values(factory.factoryData)).reduce((p, data) => {
        const {maxConsumption, minConsumption} = getConsumption(data)
    
        return {
            maxConsumption: p.maxConsumption + maxConsumption || 0,
            minConsumption: p.minConsumption + minConsumption || 0
        }
    }, {
        maxConsumption: 0,
        minConsumption: 0
    })
    return formatConsumptionString(consumption);
}

export const computeConsumption = (data) => {
    return formatConsumptionString(getConsumption(data))
};

const formatConsumptionString = (consumption) => {
    if (!consumption.maxConsumption) return "";
    let avgConsumption = 0;
    if (consumption.minConsumption < consumption.maxConsumption) {
        avgConsumption = (consumption.maxConsumption - consumption.minConsumption) / 2 + consumption.minConsumption;
    }
    return (avgConsumption ? roundNumber(consumption.minConsumption) + '-': '') + roundNumber(consumption.maxConsumption) + (avgConsumption ? ' (avg. ' + roundNumber(avgConsumption, 10) + ')': '');
}

const getConsumption = (data) => {
    const prodData = getData(data.class);
    const defaultProducer = {
        ...descs[prodData.produced.filter(x => !manualBuildClasses.includes(x))?.[0]]
    };
    
    let consumption = Number(defaultProducer?.maximumPowerConsumption) || Number(defaultProducer?.powerConsumption);
    
    if(!consumption || !defaultProducer ) {
        return {
            maxConsumption: 0,
            minConsumption: 0
        };
    }
    const sloopMulti = data.sloopNumber && defaultProducer?.productionShardSlots ? Math.pow(1 + (Math.min(data.sloopNumber, defaultProducer.productionShardSlots) / defaultProducer.productionShardSlots), 2) : 1;
    
    const maxConsumption =  Math.round(sloopMulti * consumption * Math.pow(data.overclock,defaultProducer.powerExponent) * data.numMachines *100)/100;
    const minConsumption = Math.round(sloopMulti * prodData?.consumptionConstant * Math.pow(data.overclock,defaultProducer.powerExponent) * data.numMachines*100)/100;
    return {
        maxConsumption,
        minConsumption: defaultProducer?.maximumPowerConsumption ? minConsumption : minConsumption || maxConsumption,
    }
}

export const maxEffectiveOc = (rClass) => {
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

export const getGlobalProductDeficit = (pClass, factories) => {
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
                supply -= computePpm(i.quantity, i.class, r, true);
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

export const roundNumber = (num, precision = 1000) => {
    return Math.round(num * precision) / precision;
};

export const computePpm = (quantity, dClass, data, input = false) => {
    const prodData = getData(data.class);
    if(isManual(prodData)) {
        return quantity / prodData?.products?.[0]?.quantity;
    }

    const sloopMulti = getSloopMulti(data.sloopNumber, data.class, input) 

    let correction = 1;
    if (isExtractor(prodData) && ['Desc_LiquidOil_C'].includes(dClass)) {
        correction = 2;
    }
    return Math.round(
        ( 
            quantity / 
            (["RF_LIQUID", "RF_GAS"].includes(descs[dClass]?.form) ? 1000 : 1)
        ) * 
        (60 / prodData.duration) * 
        data.overclock * 
        data.numMachines * 
        correction *
        (input ? 1 : sloopMulti) *
        100 

    ) / 100;
};

export const getSloopMulti = (numSloops, dClass) => {
    const maxSloops = getMaxSloops(dClass);
    if (!numSloops || !maxSloops) return 1;
    return 1 + Math.min(numSloops, maxSloops) / maxSloops;

}

export const getMaxSloops = (rClass) => {
    const prodData = getData(rClass);
    
    const defaultProducer = descs[prodData.produced.filter(x => !manualBuildClasses.includes(x))?.[0]];
    return Number(defaultProducer?.productionShardSlots || 0);
}

export const getName = (dClass) => {
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
    return ["RF_LIQUID", "RF_GAS"].includes(descs[dClass]?.form) ? 'm³/min' : '/min'
};

export const isExtractor = (data) => {
    return getData(data.class).produced.includes('Build_FrackingExtractor')
};

export const isManual = (data) => {
    return !data?.produced?.filter(x => !manualBuildClasses.includes(x))?.length;
};
