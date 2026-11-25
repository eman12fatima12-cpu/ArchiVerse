import {
  BuildingSpec,
  BuildingType,
  LightingMode,
  PlacedEntity,
  TimelineNode,
  WorldEra,
  WorldRecord,
} from '../types/archiverse';

export interface EraTheme {
  id: WorldEra;
  name: string;
  tagline: string;
  skyTop: string;
  skyHorizon: string;
  fogColor: string;
  fogDensity: number;
  sunColor: string;
  sunIntensity: number;
  hemiSky: string;
  hemiGround: string;
  terrainColor: string;
  terrainAccent: string;
  waterColor: string;
  accentHex: string;
  portalColorA: string;
  portalColorB: string;
  buildingStone?: string;
  buildingTrim?: string;
  buildingGlass?: string;
  buildingEmissive?: string;
  buildingRoof?: string;
  isNight: boolean;
}

export const ERA_THEMES: Record<WorldEra, EraTheme> = {
  prime_classical: {
    id: 'prime_classical',
    name: 'Old Era (Historic)',
    tagline: 'Royal Castles, Golden Pyramids, Farms, Milk Shops, Zoos & Carriages',
    skyTop: '#2f6ea6',
    skyHorizon: '#dbe9f4',
    fogColor: '#d3e3f0',
    fogDensity: 0.0044,
    sunColor: '#fff5de',
    sunIntensity: 2.35,
    hemiSky: '#d4e8f7',
    hemiGround: '#4c573c',
    terrainColor: '#4f6b40',
    terrainAccent: '#566953',
    waterColor: '#175a7d',
    accentHex: '#d97706',
    portalColorA: '#d97706',
    portalColorB: '#0284c7',
    buildingStone: '#dcd0bb',
    buildingTrim: '#9e7d47',
    buildingGlass: '#7fa8c9',
    buildingEmissive: '#f59e0b',
    buildingRoof: '#8f4735',
    isNight: false,
  },
  eco_arcology: {
    id: 'eco_arcology',
    name: 'Eco-Arcology',
    tagline: 'Verdant terraced spires, wind turbines, crisp botanical light',
    skyTop: '#256c85',
    skyHorizon: '#d6ecee',
    fogColor: '#cce6e8',
    fogDensity: 0.0044,
    sunColor: '#fff9e6',
    sunIntensity: 2.3,
    hemiSky: '#d7f0f2',
    hemiGround: '#3d5743',
    terrainColor: '#486b49',
    terrainAccent: '#536e5b',
    waterColor: '#156078',
    accentHex: '#059669',
    portalColorA: '#10b981',
    portalColorB: '#38bdf8',
    buildingStone: '#dde3de',
    buildingTrim: '#87765a',
    buildingGlass: '#7ab8cc',
    buildingEmissive: '#10b981',
    buildingRoof: '#2e6f57',
    isNight: false,
  },
  neo_cyber: {
    id: 'neo_cyber',
    name: 'New Era (Advanced Tech)',
    tagline: 'Flying Cars, Maglev Trains, Glass Pyramids, Bio-Farms & Holo-Towers',
    skyTop: '#1f5b91',
    skyHorizon: '#d9e8f5',
    fogColor: '#d0e2f2',
    fogDensity: 0.0042,
    sunColor: '#ffffff',
    sunIntensity: 2.4,
    hemiSky: '#dae9f5',
    hemiGround: '#3f505c',
    terrainColor: '#496654',
    terrainAccent: '#53686f',
    waterColor: '#12537a',
    accentHex: '#0284c7',
    portalColorA: '#38bdf8',
    portalColorB: '#7c3aed',
    buildingStone: '#d9e0e8',
    buildingTrim: '#526070',
    buildingGlass: '#528eb5',
    buildingEmissive: '#0284c7',
    buildingRoof: '#3b4859',
    isNight: false,
  },
  solar_frontier: {
    id: 'solar_frontier',
    name: 'Solar Frontier',
    tagline: 'Warm sandstone mesas, solar-collector array, sunlit oasis',
    skyTop: '#2b5f9e',
    skyHorizon: '#f2dec0',
    fogColor: '#ebd4b5',
    fogDensity: 0.0048,
    sunColor: '#ffeed1',
    sunIntensity: 2.4,
    hemiSky: '#f5e7cf',
    hemiGround: '#7a583b',
    terrainColor: '#ab8759',
    terrainAccent: '#8c6f52',
    waterColor: '#16646e',
    accentHex: '#c25e28',
    portalColorA: '#ea580c',
    portalColorB: '#d97706',
    buildingStone: '#dbc39e',
    buildingTrim: '#916e3d',
    buildingGlass: '#7fa8c9',
    buildingEmissive: '#d97706',
    buildingRoof: '#944a31',
    isNight: false,
  },
};

export const BUILDING_SPECS: Record<BuildingType, BuildingSpec> = {
  road: {
    type: 'road',
    label: 'Avenue Road',
    shortLabel: 'Road',
    cost: 20,
    energyDelta: 0,
    populationDelta: 0,
    ecoDelta: -0.2,
    creditsPerEpoch: 0,
    color: '#94a3b8',
    description: 'Connects buildings so Milkmen, Carriages & Citizens can travel.',
    hotkey: '1',
    unlockLevel: 1,
  },
  residential: {
    type: 'residential',
    label: 'Residential Quarter',
    shortLabel: 'Housing',
    cost: 110,
    energyDelta: -8,
    populationDelta: 120,
    ecoDelta: -1,
    creditsPerEpoch: 22,
    color: '#38bdf8',
    description: 'Houses citizens and expands your city workforce.',
    hotkey: '2',
    unlockLevel: 1,
  },
  farm: {
    type: 'farm',
    label: 'Dairy & Crop Farm',
    shortLabel: 'Farm',
    cost: 120,
    energyDelta: -3,
    populationDelta: 20,
    ecoDelta: 4,
    creditsPerEpoch: 32,
    color: '#84cc16',
    description: 'Raises Cows & Goats, harvests Crops & produces Fresh Milk for Trade & Milk Shops.',
    hotkey: '3',
    unlockLevel: 1,
  },
  milk_shop: {
    type: 'milk_shop',
    label: 'Fresh Milk Shop',
    shortLabel: 'Milk Shop',
    cost: 105,
    energyDelta: -4,
    populationDelta: 15,
    ecoDelta: 1.5,
    creditsPerEpoch: 42,
    color: '#fef08a',
    description: 'Milkmen deliver fresh milk here! Earns +18 bonus Credits when a Farm is active.',
    hotkey: '4',
    unlockLevel: 1,
  },
  tree_garden: {
    type: 'tree_garden',
    label: 'Trees & Plants',
    shortLabel: 'Trees',
    cost: 35,
    energyDelta: 0,
    populationDelta: 5,
    ecoDelta: 6,
    creditsPerEpoch: 4,
    color: '#22c55e',
    description: 'Lush multi-tree grove & flowering plants to beautify your world & boost Eco.',
    hotkey: '5',
    unlockLevel: 1,
  },
  park: {
    type: 'park',
    label: 'Park & Swings',
    shortLabel: 'Park',
    cost: 90,
    energyDelta: -2,
    populationDelta: 15,
    ecoDelta: 7,
    creditsPerEpoch: 8,
    color: '#10b981',
    description: 'Lush park with moving playground swings, trees & fountain plaza.',
    hotkey: '6',
    unlockLevel: 1,
  },
  commercial: {
    type: 'commercial',
    label: 'Commercial Market',
    shortLabel: 'Commerce',
    cost: 160,
    energyDelta: -14,
    populationDelta: 30,
    ecoDelta: -1.5,
    creditsPerEpoch: 55,
    color: '#f59e0b',
    description: 'Generates strong cycle revenue and drives trade activity.',
    hotkey: '7',
    unlockLevel: 1,
  },
  power_hub: {
    type: 'power_hub',
    label: 'Clean Energy Array',
    shortLabel: 'Power',
    cost: 210,
    energyDelta: 48,
    populationDelta: 5,
    ecoDelta: 3.5,
    creditsPerEpoch: -12,
    color: '#facc15',
    description: 'Supplies wind & solar/fusion power across the city grid.',
    hotkey: '8',
    unlockLevel: 1,
  },
  zoo: {
    type: 'zoo',
    label: 'Wildlife Zoo',
    shortLabel: 'Zoo',
    cost: 220,
    energyDelta: -6,
    populationDelta: 35,
    ecoDelta: 5.5,
    creditsPerEpoch: 54,
    color: '#14b8a6',
    description: '3D animal sanctuary with Elephants, Giraffes, Lions, Zebras & visitor gardens.',
    hotkey: '9',
    unlockLevel: 1,
  },
  food_street: {
    type: 'food_street',
    label: 'Food Street',
    shortLabel: 'Food St.',
    cost: 145,
    energyDelta: -8,
    populationDelta: 35,
    ecoDelta: 1.5,
    creditsPerEpoch: 52,
    color: '#f97316',
    description: 'Bustling culinary lane with street-food stalls, lanterns & dining benches.',
    hotkey: '0',
    unlockLevel: 2,
  },
  industrial: {
    type: 'industrial',
    label: 'Industrial Forge',
    shortLabel: 'Industry',
    cost: 180,
    energyDelta: -22,
    populationDelta: 15,
    ecoDelta: -5,
    creditsPerEpoch: 70,
    color: '#fb7185',
    description: 'Produces Materials for Trade Contracts and high cycle Credits.',
    hotkey: 'I',
    unlockLevel: 2,
  },
  mall: {
    type: 'mall',
    label: 'Shopping Mall',
    shortLabel: 'Mall',
    cost: 190,
    energyDelta: -16,
    populationDelta: 45,
    ecoDelta: -1,
    creditsPerEpoch: 68,
    color: '#ec4899',
    description: 'Bustling retail marketplace attracting citizens and generating steady credits.',
    hotkey: 'M',
    unlockLevel: 3,
  },
  transit_hub: {
    type: 'transit_hub',
    label: 'Transit Exchange',
    shortLabel: 'Transit',
    cost: 240,
    energyDelta: -10,
    populationDelta: 45,
    ecoDelta: 3,
    creditsPerEpoch: 35,
    color: '#818cf8',
    description: 'Accelerates regional mobility and boosts connected district happiness.',
    hotkey: 'T',
    unlockLevel: 3,
  },
  pyramid: {
    type: 'pyramid',
    label: 'Grand Pyramid',
    shortLabel: 'Pyramid',
    cost: 340,
    energyDelta: 12,
    populationDelta: 75,
    ecoDelta: 4.5,
    creditsPerEpoch: 95,
    color: '#eab308',
    description: 'Iconic Golden Giza Pyramid (Old Era) or Solar Glass Pyramid (New Era) landmark.',
    hotkey: 'P',
    unlockLevel: 3,
  },
  portal_nexus: {
    type: 'portal_nexus',
    label: 'Grand Citadel / Nexus',
    shortLabel: 'Citadel',
    cost: 380,
    energyDelta: -18,
    populationDelta: 80,
    ecoDelta: 4,
    creditsPerEpoch: 98,
    color: '#c084fc',
    description: 'Central Royal Castle or Quantum Warp Gate anchoring your world.',
    hotkey: 'N',
    unlockLevel: 4,
  },
};

export const LEVEL_THRESHOLDS = [0, 150, 360, 650, 1000, 1450, 2000];
export const LEVEL_TITLES = [
  'Village & Dairy Starter',
  'Zoo & Food Street Pioneer',
  'Pyramid & Bazaar Architect',
  'Grand Sovereign Builder',
  'Skyline Visionary',
  'Multiverse Master',
  'ArchiVerse Legend',
];

export function computeLevelFromXp(xp: number): number {
  let lvl = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (xp >= LEVEL_THRESHOLDS[i]) {
      lvl = i + 1;
    }
  }
  return lvl;
}

export interface EraThemeVariant {
  id: string;
  name: string;
  era: WorldEra;
  swatchHex: string;
  overrides: Partial<EraTheme>;
}

export const ERA_THEME_VARIANTS: Record<WorldEra, EraThemeVariant[]> = {
  prime_classical: [
    {
      id: 'old_azure',
      name: 'Natural Daylight',
      era: 'prime_classical',
      swatchHex: '#4f86b8',
      overrides: {
        skyTop: '#2f6ea6',
        skyHorizon: '#dbe9f4',
        fogColor: '#d3e3f0',
        fogDensity: 0.0044,
        sunColor: '#fff5de',
        sunIntensity: 2.35,
        hemiSky: '#d4e8f7',
        hemiGround: '#4c573c',
        terrainColor: '#4f6b40',
        terrainAccent: '#566953',
        waterColor: '#175a7d',
        accentHex: '#d97706',
        buildingStone: '#dcd0bb',
        buildingTrim: '#9e7d47',
        buildingRoof: '#8f4735',
        isNight: false,
      },
    },
    {
      id: 'old_oasis',
      name: 'Desert Giza',
      era: 'prime_classical',
      swatchHex: '#d4a359',
      overrides: {
        skyTop: '#2c6b9e',
        skyHorizon: '#efe1c4',
        fogColor: '#e6d6b5',
        fogDensity: 0.0046,
        sunColor: '#ffefc9',
        sunIntensity: 2.45,
        hemiSky: '#f5ebd6',
        hemiGround: '#8c6b42',
        terrainColor: '#b39562',
        terrainAccent: '#997c52',
        waterColor: '#166875',
        accentHex: '#c25e28',
        buildingStone: '#e0cba4',
        buildingTrim: '#9c7238',
        buildingRoof: '#9e4c30',
        isNight: false,
      },
    },
    {
      id: 'old_harvest',
      name: 'Royal Autumn',
      era: 'prime_classical',
      swatchHex: '#b85c4f',
      overrides: {
        skyTop: '#325b8f',
        skyHorizon: '#ebd7cc',
        fogColor: '#e3cec3',
        fogDensity: 0.0046,
        sunColor: '#ffe7c4',
        sunIntensity: 2.3,
        hemiSky: '#f2e4dc',
        hemiGround: '#4f5c3e',
        terrainColor: '#566b41',
        terrainAccent: '#61664d',
        waterColor: '#1b586e',
        accentHex: '#b45309',
        buildingStone: '#ded2c3',
        buildingTrim: '#9c7542',
        buildingRoof: '#7d2f2b',
        isNight: false,
      },
    },
    {
      id: 'old_dusk',
      name: 'Lantern Evening',
      era: 'prime_classical',
      swatchHex: '#6366f1',
      overrides: {
        skyTop: '#0b1426',
        skyHorizon: '#23324d',
        fogColor: '#1b2840',
        fogDensity: 0.0055,
        sunColor: '#b9cff5',
        sunIntensity: 0.72,
        hemiSky: '#566b99',
        hemiGround: '#242921',
        terrainColor: '#263623',
        terrainAccent: '#2b363a',
        waterColor: '#0c2942',
        accentHex: '#f59e0b',
        buildingStone: '#b0a390',
        buildingTrim: '#9e753d',
        buildingGlass: '#f59e0b',
        buildingEmissive: '#d97706',
        buildingRoof: '#6e3429',
        isNight: true,
      },
    },
  ],
  neo_cyber: [
    {
      id: 'new_utopia',
      name: 'Pearl Coastal',
      era: 'neo_cyber',
      swatchHex: '#38bdf8',
      overrides: {
        skyTop: '#1f5b91',
        skyHorizon: '#d9e8f5',
        fogColor: '#d0e2f2',
        fogDensity: 0.0042,
        sunColor: '#ffffff',
        sunIntensity: 2.4,
        hemiSky: '#dae9f5',
        hemiGround: '#3f505c',
        terrainColor: '#496654',
        terrainAccent: '#53686f',
        waterColor: '#12537a',
        accentHex: '#0284c7',
        portalColorA: '#0284c7',
        portalColorB: '#7c3aed',
        buildingStone: '#d9e0e8',
        buildingTrim: '#526070',
        buildingGlass: '#528eb5',
        buildingEmissive: '#0284c7',
        buildingRoof: '#3b4859',
        isNight: false,
      },
    },
    {
      id: 'new_emerald',
      name: 'Nordic Green',
      era: 'neo_cyber',
      swatchHex: '#10b981',
      overrides: {
        skyTop: '#1c6375',
        skyHorizon: '#d3eae6',
        fogColor: '#c9e3de',
        fogDensity: 0.0042,
        sunColor: '#fffdf2',
        sunIntensity: 2.35,
        hemiSky: '#d5ede9',
        hemiGround: '#385445',
        terrainColor: '#456b50',
        terrainAccent: '#4f695b',
        waterColor: '#136073',
        accentHex: '#059669',
        portalColorA: '#059669',
        portalColorB: '#0284c7',
        buildingStone: '#dce5e0',
        buildingTrim: '#475569',
        buildingGlass: '#4c9488',
        buildingEmissive: '#059669',
        buildingRoof: '#334155',
        isNight: false,
      },
    },
    {
      id: 'new_dawn',
      name: 'Steel Skyline',
      era: 'neo_cyber',
      swatchHex: '#64748b',
      overrides: {
        skyTop: '#2d4c7a',
        skyHorizon: '#dfe4ee',
        fogColor: '#d5dce8',
        fogDensity: 0.0044,
        sunColor: '#fff5eb',
        sunIntensity: 2.3,
        hemiSky: '#e2e8f0',
        hemiGround: '#434b5c',
        terrainColor: '#4e6357',
        terrainAccent: '#58646e',
        waterColor: '#19496e',
        accentHex: '#6366f1',
        portalColorA: '#6366f1',
        portalColorB: '#0ea5e9',
        buildingStone: '#d5dbe3',
        buildingTrim: '#475569',
        buildingGlass: '#567ea8',
        buildingEmissive: '#4f46e5',
        buildingRoof: '#2c3545',
        isNight: false,
      },
    },
    {
      id: 'new_neon',
      name: 'Midnight Metro',
      era: 'neo_cyber',
      swatchHex: '#818cf8',
      overrides: {
        skyTop: '#070e1f',
        skyHorizon: '#162442',
        fogColor: '#13203b',
        fogDensity: 0.0054,
        sunColor: '#a8c3f0',
        sunIntensity: 0.72,
        hemiSky: '#4b6296',
        hemiGround: '#1b2433',
        terrainColor: '#22313b',
        terrainAccent: '#253142',
        waterColor: '#09243d',
        accentHex: '#38bdf8',
        portalColorA: '#38bdf8',
        portalColorB: '#a855f7',
        buildingStone: '#2c3747',
        buildingTrim: '#64748b',
        buildingGlass: '#38bdf8',
        buildingEmissive: '#0284c7',
        buildingRoof: '#1a2330',
        isNight: true,
      },
    },
  ],
  eco_arcology: [
    {
      id: 'eco_spring',
      name: 'Emerald Grove',
      era: 'eco_arcology',
      swatchHex: '#10b981',
      overrides: {},
    },
    {
      id: 'eco_sunlit',
      name: 'Sunlit Meadow',
      era: 'eco_arcology',
      swatchHex: '#38bdf8',
      overrides: {
        skyTop: '#24668c',
        skyHorizon: '#d7ecf2',
        fogColor: '#cde5ec',
        terrainColor: '#4c6d45',
        terrainAccent: '#586d57',
        waterColor: '#17627d',
      },
    },
  ],
  solar_frontier: [
    {
      id: 'solar_mesa',
      name: 'Amber Mesa',
      era: 'solar_frontier',
      swatchHex: '#fb923c',
      overrides: {},
    },
    {
      id: 'solar_canyon',
      name: 'Golden Canyon',
      era: 'solar_frontier',
      swatchHex: '#d97706',
      overrides: {
        skyTop: '#2a5f99',
        skyHorizon: '#edd9b9',
        fogColor: '#e4cea9',
        terrainColor: '#a68256',
        terrainAccent: '#8a6d4f',
      },
    },
  ],
};

export function resolveEraTheme(
  era: WorldEra,
  variantId?: string,
  lightingMode: LightingMode = 'day',
): EraTheme {
  const base = ERA_THEMES[era];
  const variants = ERA_THEME_VARIANTS[era] || [];
  const chosen = variantId ? variants.find((v) => v.id === variantId) : variants[0];
  const merged: EraTheme = chosen ? { ...base, ...chosen.overrides } : { ...base };

  // Realistic Sky & Ground Balance across Day / Dusk / Night (fog strictly matches horizon!)
  if (lightingMode === 'day') {
    if (merged.isNight) {
      merged.skyTop = era === 'neo_cyber' ? '#1f5b91' : '#2f6ea6';
      merged.skyHorizon = '#dbe9f4';
      merged.fogColor = '#d3e3f0';
      merged.fogDensity = 0.0044;
      merged.sunColor = '#fff7e6';
      merged.sunIntensity = 2.35;
      merged.hemiSky = '#d4e8f7';
      merged.terrainColor = era === 'neo_cyber' ? '#496654' : '#4f6b40';
      merged.terrainAccent = '#566953';
      merged.waterColor = '#175a7d';
      merged.isNight = false;
    }
  } else if (lightingMode === 'sunset') {
    merged.skyTop = '#223656';
    merged.skyHorizon = '#e5a475';
    merged.fogColor = '#dba27a';
    merged.fogDensity = 0.0052;
    merged.sunColor = '#ffc48a';
    merged.sunIntensity = 1.95;
    merged.hemiSky = '#e6b89c';
    merged.terrainColor = era === 'solar_frontier' ? '#8c6943' : '#455939';
    merged.terrainAccent = '#4d524c';
    merged.waterColor = '#1b4761';
    merged.isNight = false;
  } else if (lightingMode === 'night') {
    merged.skyTop = '#070d1c';
    merged.skyHorizon = '#15223b';
    merged.fogColor = '#121d33';
    merged.fogDensity = 0.0056;
    merged.sunColor = '#9cb8eb';
    merged.sunIntensity = 0.68;
    merged.hemiSky = '#49608c';
    merged.hemiGround = '#19211d';
    merged.terrainColor = '#212e21';
    merged.terrainAccent = '#242d38';
    merged.waterColor = '#0a2238';
    merged.isNight = true;
  }

  return merged;
}

export const BUILDING_LIST: BuildingSpec[] = Object.values(BUILDING_SPECS);

const OLD_ERA_DISPLAY: Partial<Record<BuildingType, { label: string; shortLabel: string; description: string }>> = {
  road: { label: 'Cobble & Mud Path', shortLabel: 'Path', description: 'Rustic earthen & cobblestone lane for Carriages, Camels & Milkmen.' },
  residential: { label: 'Mitti ka Ghar (Mud House)', shortLabel: 'Mitti Ghar', description: 'Traditional earthen mud-brick cottages with clay courtyard & timber beams.' },
  farm: { label: 'Village Dairy Farm', shortLabel: 'Farm', description: 'Wheat fields, red barn, Cows, Goats & Sheep producing Crops & Fresh Milk!' },
  milk_shop: { label: 'Fresh Milk & Dairy Shop', shortLabel: 'Milk Shop', description: 'Milkmen deliver fresh milk cans from Farms here for bonus Credits!' },
  tree_garden: { label: 'Trees & Oasis Plants', shortLabel: 'Trees', description: 'Plant lush oak & palm groves with colorful flowering bushes.' },
  commercial: { label: 'Guildhall Market', shortLabel: 'Guildhall', description: 'Clocktower guildhall & merchant market.' },
  industrial: { label: 'Blacksmith Forge', shortLabel: 'Blacksmith', description: 'Stone hearth smithy & materials forge for Trade Contracts.' },
  park: { label: 'Garden & Swings', shortLabel: 'Park', description: 'Walled courtyard garden with moving wooden swings, fountain & trees.' },
  power_hub: { label: 'Stone Windmill', shortLabel: 'Windmill', description: 'Wind-powered grain & mechanical mill.' },
  zoo: { label: 'Royal Wildlife Zoo', shortLabel: 'Zoo', description: 'Fenced safari park with 3D Elephants, Giraffes, Lions, Zebras & shade trees.' },
  pyramid: { label: 'Grand Giza Pyramid', shortLabel: 'Pyramid', description: 'Iconic stepped golden sandstone Pyramid with palm oasis & stone gate.' },
  transit_hub: { label: 'Carriage & Camel Stables', shortLabel: 'Stables', description: 'Royal coach house, paddock Horses, carriages & camel caravan rest stop.' },
  portal_nexus: { label: 'Royal Castle', shortLabel: 'Castle', description: 'Fortified stone castle keep with four turret towers.' },
  mall: { label: 'Old Era Bazaar', shortLabel: 'Bazar', description: 'Colorful covered market bazaar with spice stalls, lanterns & shoppers.' },
  food_street: { label: 'Old Era Food Street', shortLabel: 'Food St.', description: 'Vibrant chai & tikka lane with clay tandoors, benches & fairy lanterns.' },
};

const NEW_ERA_DISPLAY: Partial<Record<BuildingType, { label: string; shortLabel: string; description: string }>> = {
  road: { label: 'Smart Cyber Lane', shortLabel: 'Lane', description: 'Inductive lane with hover-pods, flying cars & courier Milkmen.' },
  residential: { label: 'Holo-Habitat Pod', shortLabel: 'Holo-Pod', description: 'Bright pearl-ceramic sky-residences with rooftop gardens.' },
  farm: { label: 'Bio-Dairy & Hydro Farm', shortLabel: 'Farm', description: 'Clean hydroponic crops & bio-pasture with Cows & Goats supplying Milk.' },
  milk_shop: { label: 'Fresh Synth-Dairy Bar', shortLabel: 'Milk Shop', description: 'Modern dairy cafe stocked by Milkmen from your Farms!' },
  tree_garden: { label: 'Eco Trees & Flora', shortLabel: 'Trees', description: 'Lush clean-air park trees & landscaped floral gardens.' },
  commercial: { label: 'AI Sky-Monolith', shortLabel: 'AI Tower', description: 'Autonomous commerce & trade spire.' },
  industrial: { label: 'Nano-Synth Lab', shortLabel: 'Synth Lab', description: 'Clean fabrication plant producing Materials for Trade Contracts.' },
  park: { label: 'Holo-Park & Swings', shortLabel: 'Park', description: 'Biodome park with kinetic swings & lush green trees.' },
  power_hub: { label: 'Quantum Fusion Core', shortLabel: 'Fusion', description: 'Clean magnetic fusion core supplying abundant city power.' },
  zoo: { label: 'Bio-Dome Wildlife Zoo', shortLabel: 'Zoo', description: 'Modern sanctuary with 3D Elephants, Giraffes, Lions & botanical pond.' },
  pyramid: { label: 'Solar Glass Pyramid', shortLabel: 'Pyramid', description: 'Luminous crystal & titanium pyramid monument boosting tourism & power.' },
  transit_hub: { label: 'Maglev Hyperloop', shortLabel: 'Maglev', description: 'Anti-gravity transit & autonomous drone hub.' },
  portal_nexus: { label: 'Quantum Warp Gate', shortLabel: 'Warp Gate', description: 'Orbital hyper-ring portal linking parallel realities.' },
  mall: { label: 'Holo-Shopping Mall', shortLabel: 'Mall', description: 'Multi-level bright glass atrium mall packed with visitors.' },
  food_street: { label: 'Neon Food Street', shortLabel: 'Food St.', description: 'Modern street-food promenade with bistro umbrellas & glowing stalls.' },
};

export function getBuildingDisplay(
  type: BuildingType,
  era: WorldEra,
): { label: string; shortLabel: string; description: string } {
  if (era === 'prime_classical' && OLD_ERA_DISPLAY[type]) {
    return OLD_ERA_DISPLAY[type]!;
  }
  if (era === 'neo_cyber' && NEW_ERA_DISPLAY[type]) {
    return NEW_ERA_DISPLAY[type]!;
  }
  const spec = BUILDING_SPECS[type];
  return { label: spec.label, shortLabel: spec.shortLabel, description: spec.description };
}

export const GRID_SIZE = 16;

export function coordKey(gx: number, gz: number): string {
  return `${gx},${gz}`;
}

function makeEntity(
  id: string,
  type: BuildingType,
  gx: number,
  gz: number,
  rotation = 0,
  customName?: string,
): PlacedEntity {
  const spec = BUILDING_SPECS[type];
  return {
    id,
    type,
    gx,
    gz,
    rotation,
    level: 1,
    name: customName || `${spec.shortLabel} (${gx},${gz})`,
    createdAt: Date.now(),
    cost: spec.cost,
  };
}

function buildPrimeCityEntities(): PlacedEntity[] {
  const list: PlacedEntity[] = [];
  let seq = 1;
  const add = (type: BuildingType, gx: number, gz: number, rot = 0, name?: string) => {
    list.push(makeEntity(`ent_p_${seq++}`, type, gx, gz, rot, name));
  };

  // Structured Boulevard Network (Inner Civic Loop x=5..10, z=5..10 + Outer District Avenues)
  for (let x = 3; x <= 12; x += 1) {
    add('road', x, 6);
    add('road', x, 10);
  }
  for (let z = 4; z <= 12; z += 1) {
    if (z !== 6 && z !== 10) {
      add('road', 5, z);
      add('road', 10, z);
    }
  }

  // 1. CENTRAL CIVIC CITADEL PLAZA (x=6..9, z=7..9)
  add('portal_nexus', 7, 8, 0, 'Grand Royal Castle');
  add('park', 8, 8, 0, 'Royal Courtyard Garden');
  add('commercial', 7, 7, 0, 'Clocktower Guildhall');
  add('transit_hub', 8, 7, 0, 'Royal Carriage Stables');
  add('commercial', 7, 9, 2, 'Crown Treasury Hall');
  add('park', 8, 9, 0, 'Swings Promenade');

  // 2. EAST MARKET, BAZAAR & FOOD QUARTER (x=11..12, z=7..9)
  add('mall', 11, 7, 3, 'Grand Old Bazaar');
  add('food_street', 11, 8, 3, 'Royal Chai & Food Street');
  add('milk_shop', 11, 9, 3, 'Fresh Village Milk Shop');

  // 3. NORTH RESIDENTIAL & SAFARI ZOO DISTRICT (z=4..5)
  add('residential', 6, 5, 0, 'Mitti ka Ghar North I');
  add('residential', 7, 5, 0, 'Mitti ka Ghar North II');
  add('zoo', 8, 5, 0, 'Royal Wildlife Zoo');
  add('tree_garden', 9, 5, 0, 'Northern Cedar Grove');

  // 4. WEST COUNTRYSIDE DAIRY FARM & MILL VALLEY (x=3..4, z=5..9)
  add('farm', 4, 7, 1, 'Aurelia Dairy & Wheat Farm');
  add('farm', 4, 8, 1, 'Green Meadow Goat & Cow Farm');
  add('power_hub', 4, 5, 0, 'West Stone Windmill');
  add('industrial', 4, 9, 1, 'Village Blacksmith Forge');

  // 5. SOUTH MONUMENTAL PYRAMID & SOUTH VILLAGE (z=11..12)
  add('pyramid', 4, 11, 0, 'Grand Golden Giza Pyramid');
  add('tree_garden', 3, 11, 0, 'Giza Oasis Palms');
  add('residential', 6, 11, 2, 'South Courtyard Cottage');
  add('residential', 7, 11, 2, 'Clay Manor Homestead');
  add('park', 8, 11, 0, 'South Village Park');
  add('power_hub', 11, 11, 0, 'East Windmill');

  return list;
}

function buildEcoArcologyEntities(): PlacedEntity[] {
  const list: PlacedEntity[] = [];
  let seq = 1;
  const add = (type: BuildingType, gx: number, gz: number, rot = 0, name?: string) => {
    list.push(makeEntity(`ent_e_${seq++}`, type, gx, gz, rot, name));
  };

  for (let x = 3; x <= 12; x += 1) {
    add('road', x, 8);
  }
  for (let z = 4; z <= 12; z += 1) {
    if (z !== 8) {
      add('road', 5, z);
      add('road', 10, z);
    }
  }

  add('portal_nexus', 7, 7, 0, 'Gaia Convergence Nexus');
  add('park', 8, 7, 0, 'Canopy Sanctuary');
  add('park', 7, 9, 0, 'Hydroponic Gardens');
  add('power_hub', 4, 7, 0, 'Aero-Turbine North');
  add('power_hub', 11, 7, 2, 'Aero-Turbine East');
  add('transit_hub', 8, 9, 0, 'SkyRail Eco Hub');
  add('residential', 4, 9, 0, 'Moss Terrace Suites');
  add('residential', 6, 9, 1, 'Solaris Commons');
  add('residential', 9, 9, 2, 'Verdant Towers');
  add('commercial', 6, 6, 0, 'BioTech Pavilion');
  add('commercial', 9, 6, 1, 'CleanTrade Center');
  add('farm', 4, 6, 0, 'Green Pasture Dairy Farm');
  add('milk_shop', 6, 7, 0, 'Organic Milk Bar');
  add('tree_garden', 11, 9, 0, 'Cedar & Blossom Grove');

  return list;
}

function buildNeoCyberEntities(): PlacedEntity[] {
  const list: PlacedEntity[] = [];
  let seq = 1;
  const add = (type: BuildingType, gx: number, gz: number, rot = 0, name?: string) => {
    list.push(makeEntity(`ent_c_${seq++}`, type, gx, gz, rot, name));
  };

  // Clean Symmetric High-Tech Boulevard Grid (x=5 & 10, z=6 & 10)
  for (let i = 3; i <= 12; i += 1) {
    add('road', i, 6);
    add('road', i, 10);
    if (i !== 6 && i !== 10) {
      add('road', 5, i);
      add('road', 10, i);
    }
  }

  // 1. CENTRAL QUANTUM FINANCIAL & NEXUS CORE (x=7..8, z=7..9)
  add('portal_nexus', 7, 8, 0, 'Quantum Warp Gate');
  add('commercial', 8, 8, 0, 'AI Sky-Monolith');
  add('commercial', 7, 7, 0, 'Holo-Exchange Spire');
  add('commercial', 8, 7, 2, 'Neural Data Tower');
  add('transit_hub', 7, 9, 0, 'Maglev Hyperloop Bay');
  add('park', 8, 9, 0, 'Crystal Biodome & Swings');

  // 2. EAST RETAIL, FOOD STREET & DAIRY BAR (x=11, z=7..9)
  add('mall', 11, 7, 3, 'Aether Mega Mall');
  add('food_street', 11, 8, 3, 'Neon Food Street');
  add('milk_shop', 11, 9, 3, 'PureSynth Milk Bar');

  // 3. NORTH LANDMARK PYRAMID & WILDLIFE ZOO (z=5)
  add('pyramid', 7, 5, 0, 'Solar Glass Pyramid');
  add('zoo', 8, 5, 0, 'Bio-Dome Wildlife Zoo');
  add('tree_garden', 6, 5, 0, 'Skyline Eco Trees');
  add('tree_garden', 9, 5, 0, 'Botanical Park Grove');

  // 4. WEST BIO-FARMING & FUSION ENERGY BELT (x=4, z=5..11)
  add('farm', 4, 7, 1, 'Aero-Hydro & Dairy Farm');
  add('farm', 4, 8, 1, 'Precision Pasture Hub');
  add('power_hub', 4, 5, 0, 'Fusion Tokamak Alpha');
  add('power_hub', 11, 5, 0, 'Fusion Tokamak Beta');
  add('power_hub', 4, 11, 0, 'Fusion Tokamak Gamma');

  // 5. SOUTH RESIDENTIAL & TECH FOUNDRY SECTOR (z=11)
  add('residential', 6, 11, 2, 'Holo-Habitat Pod A');
  add('residential', 7, 11, 2, 'Holo-Habitat Pod B');
  add('residential', 8, 11, 2, 'Skyline Cyber Pods');
  add('industrial', 11, 11, 0, 'Nano-Synth Robotics Lab');

  return list;
}

export function createSeededWorlds(): WorldRecord[] {
  const now = Date.now();

  const primeEntities = buildPrimeCityEntities();
  const primeRootId = 'tl_prime_root';
  const primeBranchId = 'tl_prime_eco_reform';

  const primeEcoEntities = primeEntities
    .filter((e) => e.type !== 'industrial')
    .concat([
      makeEntity('ent_p_b1', 'park', 11, 11, 0, 'Reclaimed Smithy Biodome'),
      makeEntity('ent_p_b2', 'power_hub', 11, 8, 0, 'Fusion Modernization Core'),
    ]);

  const world1: WorldRecord = {
    id: 'world_old_era_aurelia',
    name: 'Old Era: Grand Aurelia',
    description:
      'Sunlit historic kingdom with Royal Castle, Golden Giza Pyramid, Dairy Farms with Cows & Goats, Milk Shop, Wildlife Zoo, Bazaar, Food Street, Carriages & Camels.',
    era: 'prime_classical',
    seed: 1884,
    createdAt: now - 86400000 * 3,
    updatedAt: now - 3600000,
    parameters: {
      gridSize: GRID_SIZE,
      taxRate: 12,
      ecoPolicy: 'balanced',
      startingCredits: 3200,
    },
    rootTimelineId: primeRootId,
    activeTimelineId: primeRootId,
    timelines: {
      [primeRootId]: {
        id: primeRootId,
        parentId: null,
        name: 'Royal Castle Era',
        decisionTitle: 'Royal Castle, Farm & Trade Charter',
        era: 'prime_classical',
        createdAt: now - 86400000 * 3,
        entities: primeEntities,
        resources: {
          credits: 3200,
          energyProduced: 108,
          energyConsumed: 84,
          waterSupply: 94,
          materials: 340,
          milkStock: 18,
          cropsStock: 24,
          tradeCompletedCount: 0,
        },
        metrics: {
          population: 810,
          happiness: 84,
          ecoIndex: 82,
          connectivityPct: 100,
          prosperityScore: 86,
          totalBuildings: primeEntities.filter((e) => e.type !== 'road').length,
          roadCount: primeEntities.filter((e) => e.type === 'road').length,
          isolatedCount: 0,
          epoch: 4,
        },
        decisions: [
          {
            id: 'dec_p1',
            timestamp: now - 7200000,
            epoch: 1,
            action: 'Crown Kingdom & Open Dairy Trade',
            detail: 'Built Royal Castle, Golden Pyramid, Dairy Farm, Milk Shop, Wildlife Zoo & Carriages.',
            impactSummary: '+24 MW Surplus · Camels & Milkman Active',
          },
        ],
        snapshots: [
          { epoch: 1, population: 290, credits: 2600, energyNet: 16, ecoIndex: 76, connectivityPct: 88, happiness: 74, buildingCount: 8 },
          { epoch: 2, population: 470, credits: 2800, energyNet: 18, ecoIndex: 78, connectivityPct: 92, happiness: 78, buildingCount: 12 },
          { epoch: 3, population: 640, credits: 3000, energyNet: 22, ecoIndex: 80, connectivityPct: 96, happiness: 81, buildingCount: 16 },
          { epoch: 4, population: 810, credits: 3200, energyNet: 24, ecoIndex: 82, connectivityPct: 100, happiness: 84, buildingCount: 21 },
        ],
        childrenIds: [primeBranchId],
      },
      [primeBranchId]: {
        id: primeBranchId,
        parentId: primeRootId,
        name: 'Future Evolution Branch',
        decisionTitle: 'Tech Modernization Leap',
        era: 'neo_cyber',
        createdAt: now - 3200000,
        entities: primeEcoEntities,
        resources: {
          credits: 3500,
          energyProduced: 156,
          energyConsumed: 62,
          waterSupply: 95,
          materials: 290,
          milkStock: 20,
          cropsStock: 26,
          tradeCompletedCount: 0,
        },
        metrics: {
          population: 855,
          happiness: 87,
          ecoIndex: 88,
          connectivityPct: 100,
          prosperityScore: 90,
          totalBuildings: primeEcoEntities.filter((e) => e.type !== 'road').length,
          roadCount: primeEcoEntities.filter((e) => e.type === 'road').length,
          isolatedCount: 0,
          epoch: 5,
        },
        decisions: [
          {
            id: 'dec_pb1',
            timestamp: now - 3200000,
            epoch: 5,
            action: 'Upgrade Kingdom to Quantum Tech',
            detail: 'Replaced old smithy with Fusion Core & Holo-Biodome.',
            impactSummary: '+94 Net MW · Zero Carbon',
          },
        ],
        snapshots: [
          { epoch: 1, population: 290, credits: 2600, energyNet: 16, ecoIndex: 76, connectivityPct: 88, happiness: 74, buildingCount: 8 },
          { epoch: 2, population: 470, credits: 2800, energyNet: 18, ecoIndex: 78, connectivityPct: 92, happiness: 78, buildingCount: 12 },
          { epoch: 3, population: 640, credits: 3000, energyNet: 22, ecoIndex: 80, connectivityPct: 96, happiness: 81, buildingCount: 16 },
          { epoch: 4, population: 810, credits: 3200, energyNet: 24, ecoIndex: 82, connectivityPct: 100, happiness: 84, buildingCount: 21 },
          { epoch: 5, population: 855, credits: 3500, energyNet: 94, ecoIndex: 88, connectivityPct: 100, happiness: 87, buildingCount: 22 },
        ],
        childrenIds: [],
      },
    },
    recommendations: [],
  };

  const cyberEntities = buildNeoCyberEntities();
  const cyberRootId = 'tl_cyber_root';
  const world2: WorldRecord = {
    id: 'world_new_era_aether',
    name: 'New Era: Neo-Aether 2190',
    description:
      'High-tech sunlit utopia with Flying Cars, Maglev Trains, Solar Glass Pyramid, Bio-Dome Zoo, Aero-Dairy Farm, Milk Shop & Pearl Sky-Towers.',
    era: 'neo_cyber',
    seed: 2190,
    createdAt: now - 86400000 * 2,
    updatedAt: now - 900000,
    parameters: {
      gridSize: GRID_SIZE,
      taxRate: 14,
      ecoPolicy: 'balanced',
      startingCredits: 3800,
    },
    rootTimelineId: cyberRootId,
    activeTimelineId: cyberRootId,
    timelines: {
      [cyberRootId]: {
        id: cyberRootId,
        parentId: null,
        name: 'Pearl Tech Horizon',
        decisionTitle: 'Solar Pyramid, Maglev & Bio-Dairy Hub',
        era: 'neo_cyber',
        createdAt: now - 86400000 * 2,
        entities: cyberEntities,
        resources: {
          credits: 3800,
          energyProduced: 156,
          energyConsumed: 120,
          waterSupply: 94,
          materials: 540,
          milkStock: 18,
          cropsStock: 22,
          tradeCompletedCount: 0,
        },
        metrics: {
          population: 925,
          happiness: 86,
          ecoIndex: 84,
          connectivityPct: 100,
          prosperityScore: 91,
          totalBuildings: cyberEntities.filter((e) => e.type !== 'road').length,
          roadCount: cyberEntities.filter((e) => e.type === 'road').length,
          isolatedCount: 0,
          epoch: 4,
        },
        decisions: [
          {
            id: 'dec_c1',
            timestamp: now - 4000000,
            epoch: 2,
            action: 'Activate Sky-Lanes & Bio-Dairy',
            detail: 'Powered Flying Cars, Maglev Hyperloop, Solar Glass Pyramid, Wildlife Zoo & Farm.',
            impactSummary: '+36 MW Surplus · Sky Traffic & Dairy Active',
          },
        ],
        snapshots: [
          { epoch: 1, population: 310, credits: 3100, energyNet: 18, ecoIndex: 76, connectivityPct: 88, happiness: 76, buildingCount: 8 },
          { epoch: 2, population: 520, credits: 3350, energyNet: 24, ecoIndex: 79, connectivityPct: 94, happiness: 80, buildingCount: 12 },
          { epoch: 3, population: 730, credits: 3580, energyNet: 30, ecoIndex: 82, connectivityPct: 98, happiness: 83, buildingCount: 16 },
          { epoch: 4, population: 925, credits: 3800, energyNet: 36, ecoIndex: 84, connectivityPct: 100, happiness: 86, buildingCount: 20 },
        ],
        childrenIds: [],
      },
    },
    recommendations: [],
  };

  const ecoEntities = buildEcoArcologyEntities();
  const ecoRootId = 'tl_eco_root';
  const world3: WorldRecord = {
    id: 'world_verdant_helios',
    name: 'Verdant Helios',
    description:
      'Zero-carbon Eco-Arcology reality with green farms, botanical gardens, wind turbines and organic trade.',
    era: 'eco_arcology',
    seed: 2088,
    createdAt: now - 86400000,
    updatedAt: now - 1800000,
    parameters: {
      gridSize: GRID_SIZE,
      taxRate: 10,
      ecoPolicy: 'green_mandate',
      startingCredits: 2600,
    },
    rootTimelineId: ecoRootId,
    activeTimelineId: ecoRootId,
    timelines: {
      [ecoRootId]: {
        id: ecoRootId,
        parentId: null,
        name: 'Solar Arcology Prime',
        decisionTitle: 'Zero-Emission Mandate',
        era: 'eco_arcology',
        createdAt: now - 86400000,
        entities: ecoEntities,
        resources: {
          credits: 2340,
          energyProduced: 96,
          energyConsumed: 82,
          waterSupply: 96,
          materials: 280,
          milkStock: 14,
          cropsStock: 18,
          tradeCompletedCount: 0,
        },
        metrics: {
          population: 615,
          happiness: 90,
          ecoIndex: 94,
          connectivityPct: 100,
          prosperityScore: 88,
          totalBuildings: ecoEntities.filter((e) => e.type !== 'road').length,
          roadCount: ecoEntities.filter((e) => e.type === 'road').length,
          isolatedCount: 0,
          epoch: 4,
        },
        decisions: [
          {
            id: 'dec_e1',
            timestamp: now - 5400000,
            epoch: 1,
            action: 'Approve Zero-Emission Mandate',
            detail: 'Prioritized Botanical Plazas, Organic Dairy Farm and dual Aero-Turbines.',
            impactSummary: '+25 Eco Index · +19 Happiness',
          },
        ],
        snapshots: [
          { epoch: 1, population: 210, credits: 2600, energyNet: 32, ecoIndex: 86, connectivityPct: 90, happiness: 80, buildingCount: 6 },
          { epoch: 2, population: 360, credits: 2410, energyNet: 28, ecoIndex: 89, connectivityPct: 95, happiness: 85, buildingCount: 9 },
          { epoch: 3, population: 490, credits: 2260, energyNet: 20, ecoIndex: 92, connectivityPct: 100, happiness: 88, buildingCount: 12 },
          { epoch: 4, population: 615, credits: 2340, energyNet: 14, ecoIndex: 94, connectivityPct: 100, happiness: 90, buildingCount: 14 },
        ],
        childrenIds: [],
      },
    },
    recommendations: [],
  };

  return [world1, world2, world3];
}
