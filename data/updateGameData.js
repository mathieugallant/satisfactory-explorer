const jsonata = require('jsonata');
const fs = require('fs');

const getDescriptions = (rawData) => {
  const jsonexp = `$[].Classes[$contains(ClassName, 'Desc_') or $contains(ClassName, 'BP_') or $contains(ClassName, 'Build_')].{
        "class": ClassName,
        "name": mDisplayName,
        "description": mDescription,
        "abbreviated": mAbbreviatedDisplayName,
        "discardable": mCanBeDiscarded,
        "powerConsumption": mPowerConsumption,
        "maximumPowerConsumption": mEstimatedMaximumPowerConsumption,
        "powerExponent": mPowerConsumptionExponent,
        "productionBoostPowerExponent": mProductionBoostPowerConsumptionExponent,
        "productionShardSlots": mProductionShardSlotSize,
        "productionShardBoostMultiplier": mProductionShardBoostMultiplier,
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
    Object.keys(pData).forEach(x => {
      if (!pData[x].name) {
        pData[x].name = pData[x.replace('Desc_', 'Build_')]?.name;
        pData[x].description = pData[x.replace('Desc_', 'Build_')]?.description;
      }
    })
    return pData;
  });
}


const makeRBasicecipe = (rClass, name, product_class, product_quantity, produced, message = null) => {
  return {
    "class": rClass,
    name,
    "ingredients": [],
    "products": product_class ? [
      {
        "class": product_class,
        "quantity": product_quantity
      }
    ] : [],
    "produced": [produced],
    "duration": "1.000000",
    "consumptionConstant": "0.000000",
    "consumptionFactor": "1.000000",
    message,
  }
}

const getRecipes = (rawData) => {
  const jsonexp = `$[].Classes[$contains(ClassName, 'Recipe_')].
    {
        "class": ClassName,
        "name": mDisplayName,
        "ingredients": [$filter([$split($replace($replace($replace(mIngredients, /^\\((.*)\\)$/, '$1'), '(', ''), /\\)$/, ''), '),').{"class": $replace(/.*'.*\\.(.*)'.*/, '$1'), "quantity": $replace(/.*=([0-9]*)/, "$1")}], function($v) {$v.class != ""})],
        "products": [$filter([$split($replace($replace($replace(mProduct, /^\\((.*)\\)$/, '$1'), '(', ''), /\\)$/, ''), '),').{"class": $replace(/.*'.*\\.(.*)'.*/, '$1'), "quantity": $replace(/.*=([0-9]*)/, "$1")}], function($v) {$v.class != ""})],
        "produced": [$split($replace(mProducedIn, /\\((.*)\\)/, '$1'), ',').$replace($string(), /.*\\.([A-Za-z0-9_]+)\\"/, '$1')],
        "duration": mManufactoringDuration,
        "consumptionConstant": mVariablePowerConsumptionConstant,
        "consumptionFactor": mVariablePowerConsumptionFactor
    }`;

  return jsonata(jsonexp).evaluate(rawData).then(pRecip => {
    return [...pRecip];
  })
    .then((recipes) => {
      // Patch in mising recipes.
      recipes = [...recipes,
        makeRBasicecipe("Recipe_Water_C", "Pumped Water", "Desc_Water_C", "2000", "Build_WaterPump_C"),
        makeRBasicecipe("Recipe_Pressurerizer_C", "Resource Well Pressurizer", null, null, "Build_FrackingSmasher_C", "Required to use ressource Nodes. One per ressource group."),
        makeRBasicecipe("Recipe_PressureWater_C", "Water Node", "Desc_Water_C", "500", "Build_FrackingExtractor_C", "Requires a Resource Well Pressurizer."),
        makeRBasicecipe("Recipe_CrudeOil_C", "Pumped Oil", "Desc_LiquidOil_C", "0.5", "Build_OilPump_C"),
        makeRBasicecipe("Recipe_PressureLiquidOil_C", "Oil Node", "Desc_LiquidOil_C", "500", "Build_FrackingExtractor_C", "Requires a Resource Well Pressurizer."),
        makeRBasicecipe("Recipe_PressureNitrogen_C", "Nitrogen Gas Node", "Desc_NitrogenGas_C", "500", "Build_FrackingExtractor_C", "Requires a Resource Well Pressurizer."),
      ];
      // Create the 3 "purity" specific recipes
      const PurityRecipes = {
        "Recipe_CrudeOil_C": "Build_OilPump_C",
        "Recipe_PressureWater_C": "Build_FrackingExtractor_C",
        "Recipe_PressureNitrogen_C": "Build_FrackingExtractor_C",
        "Recipe_PressureLiquidOil_C": "Build_FrackingExtractor_C",
      };

      const PurityAndMkRecipes = {
        "Coal": "Coal",
        "RawQuartz": "Raw Quartz",
        "OreUranium": "Uranium Ore",
        "OreGold": "Caterium Ore",
        "OreCopper": "Copper Ore",
        "OreIron": "Iron Ore",
        "OreBauxite": "Bauxite",
        "Stone": "Limestone",
        "Sulfur": "Sulfur",
      };

      Object.keys(PurityRecipes).forEach(p => {
        console.log("Processing ", p)
        const i = recipes.findIndex(r => r.class == p);
        if (i < 0) console.error("Can't find ", p)
        for (purity of [{ l: 'Normal', f: 2 }, { l: 'Pure', f: 4 }]) {
          recipes.push({
            ...recipes[i],
            ingredients: [],
            class: recipes[i].class + purity.l,
            name: recipes[i].name + ` (${purity.l})`,
            products: [{ ...recipes[i].products[0], quantity: recipes[i].products[0].quantity * purity.f * (p === 'Recipe_CrudeOil_C' ? 2000 : 1) }],
            produced: [PurityRecipes[p]]
          })
        }
        recipes[i].class += "Impure";
        recipes[i].name += ` (Impure)`;
        recipes[i].ingredients = [];
        recipes[i].products = recipes[i].products.map(x => {
          return { ...x, quantity: x.quantity * (p === 'Recipe_CrudeOil_C' ? 2000 : 1) }
        });
        recipes[i].produced = [PurityRecipes[p]];
      })

      Object.keys(PurityAndMkRecipes).forEach(p => {
        console.log("Processing ", p)
        for ({ mk, mkf } of [{ mk: '1', mkf: 1 }, { mk: '2', mkf: 2 }, { mk: '3', mkf: 4 }]) {
          for (purity of [{ l: 'Impure', f: 1 }, { l: 'Normal', f: 2 }, { l: 'Pure', f: 4 }]) {
            recipes.push({
              ...makeRBasicecipe(
                `Recipe_${p}_C${purity.l}Mk${mk}`, 
                `${PurityAndMkRecipes[p]} Mk${mk} (${purity.l})`,
                `Desc_${p}_C`,
                0.5 * purity.f * mkf,
                `Build_MinerMk${mk}_C`,
                null
              ),
            })
          }
        }
      })



      return recipes;
    });
}

const loadData = (rawData) => {
  const pProcess = [getDescriptions(rawData), getRecipes(rawData)];
  Promise.all(pProcess).then(result => {
    fs.writeFileSync('./src/descData.json', JSON.stringify(result[0]))
    fs.writeFileSync('./src/recipeData.json', JSON.stringify(result[1]))
    console.log("Update Complete!")
  })
    .catch(e => {
      console.error(e);
    });
}



const rawData = require('./Docs.json')
loadData(rawData);
