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
        "powerExponent": mPowerConsumptionExponent,
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
    })
    .then((recipes) => {
      // Patch in mising recipes.
      recipes = [...recipes, 
        {
          "class":"Recipe_Water_C",
          "name":"Pumped Water",
          "ingredients": [],
          "products": [
            {
              "class": "Desc_Water_C",
              "quantity": "2000"
            }
          ],
          "produced": ["Build_WaterPump_C"],
          "duration": "1.000000",
          "consumptionConstant": "0.000000",
          "consumptionFactor": "1.000000"
        },
        {
          "class":"Recipe_Pressurerizer_C",
          "name":"Resource Well Pressurizer",
          "ingredients": [],
          "products": [],
          "produced": ["Build_FrackingSmasher_C"],
          "duration": "1.000000",
          "consumptionConstant": "0.000000",
          "consumptionFactor": "1.000000",
          "message": "Required to use ressource Nodes. One per ressource group."
        },
        {
          "class":"Recipe_PressureWater_C",
          "name":"Water Node",
          "ingredients": [],
          "products": [
            {
              "class": "Desc_Water_C",
              "quantity": "0.5"
            }
          ],
          "produced": ["Build_FrackingExtractor_C"],
          "duration": "1.000000",
          "consumptionConstant": "0.000000",
          "consumptionFactor": "0.000000",
          "message": "Requires a Resource Well Pressurizer"
        },
        {
          "class":"Recipe_PressureLiquidOil_C",
          "name":"Oil Node",
          "ingredients": [],
          "products": [
            {
              "class": "Desc_LiquidOil_C",
              "quantity": "0.25"
            }
          ],
          "produced": ["Build_FrackingExtractor_C"],
          "duration": "1.000000",
          "consumptionConstant": "0.000000",
          "consumptionFactor": "1.000000",
          "message": "Requires a Resource Well Pressurizer"
        },
        {
          "class":"Recipe_PressureNitrogen_C",
          "name":"Nitrogen Gas Node",
          "ingredients": [],
          "products": [
            {
              "class": "Desc_NitrogenGas_C",
              "quantity": "500"
            }
          ],
          "produced": ["Build_FrackingExtractor_C"],
          "duration": "1.000000",
          "consumptionConstant": "0.000000",
          "consumptionFactor": "1.000000",
          "message": "Requires a Resource Well Pressurizer"
        }
      ];
      // Create the 3 "purity" specific recipes
      const PurityRecipes = {
        "Recipe_CrudeOil_C": "Build_OilPump_C",
        "Recipe_PressureWater_C": "Build_Converter_C",
        "Recipe_PressureNitrogen_C": "Build_Converter_C",
        "Recipe_PressureLiquidOil_C": "Build_Converter_C",
      };

      const PurityAndMkRecipes = {
        "Recipe_Coal_C": "Build_MinerMk%_C",
        "Recipe_RawQuartz_C": "Build_MinerMk%_C",
        "Recipe_OreUranium_C": "Build_MinerMk%_C",
        "Recipe_OreCaterium_C": "Build_MinerMk%_C",
        "Recipe_OreCopper_C": "Build_MinerMk%_C",
        "Recipe_OreIron_C": "Build_MinerMk%_C",
        "Recipe_OreBauxite_C": "Build_MinerMk%_C",
        "Recipe_Limestone_C": "Build_MinerMk%_C",
        "Recipe_Sulfur_C": "Build_MinerMk%_C",
      };

      Object.keys(PurityRecipes).forEach(p => {
        console.log("Processing ", p)
        const i = recipes.findIndex(r => r.class == p);
        if (i<0) console.error("Can't find ", p)
        for (purity of [{l: 'Normal', f: 2}, {l: 'Pure', f: 4}]) {
          recipes.push({
            ...recipes[i],
            ingredients: [],
            class: recipes[i].class + purity.l,
            name: recipes[i].name + ` (${purity.l})`,
            products: [{...recipes[i].products[0], quantity: recipes[i].products[0].quantity * purity.f * (p === 'Recipe_CrudeOil_C' ? 2000 : 1)}],
            produced: [PurityRecipes[p]]
          })
        }
        recipes[i].class += "Impure";
        recipes[i].name += ` (Impure)`;
        recipes[i].ingredients = [];
        recipes[i].products = recipes[i].products.map(x => {
          return {...x, quantity: x.quantity * (p === 'Recipe_CrudeOil_C' ? 2000 : 1)}
        });
        recipes[i].produced = [PurityRecipes[p]];
      })

      Object.keys(PurityAndMkRecipes).forEach(p => {
        console.log("Processing ", p)
        const i = recipes.findIndex(r => r.class == p);
        if (i<0) console.error("Can't find ", p)
        for ({mk, mkf} of  [{mk: '1', mkf: 1}, {mk: '2', mkf: 2}, {mk: '3', mkf: 4}]) {
          for (purity of [{l: 'Impure', f: 2}, {l: 'Normal', f: 2}, {l: 'Pure', f: 4}]) {
            if (mk === '1' && purity.l === 'Impure') continue;
            recipes.push({
              ...recipes[i],
              ingredients: [],
              class: recipes[i].class + purity.l + 'Mk' + mk,
              name: recipes[i].name + ` Mk${mk} (${purity.l})`,
              products: [{...recipes[i].products[0], quantity: recipes[i].products[0].quantity * purity.f * mkf}],
              produced: [PurityAndMkRecipes[p].replace('%', mk)],
              message: mk === '3' && purity.f === 4 ? "Maximum output is 780 due to belt speed limitations." : null
            })
          }
        }
        recipes[i].class += "ImpureMk1";
        recipes[i].name += ` Mk1 (Impure)`;
        recipes[i].ingredients = [];
        recipes[i].produced = [PurityAndMkRecipes[p].replace('%', '1')];
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
