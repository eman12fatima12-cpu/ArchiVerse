export type WorldEra =
  | 'prime_classical'
  | 'eco_arcology'
  | 'neo_cyber'
  | 'solar_frontier';

export type BuildingType =
  | 'road'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'park'
  | 'power_hub'
  | 'transit_hub'
  | 'portal_nexus'
  | 'mall'
  | 'food_street'
  | 'farm'
  | 'milk_shop'
  | 'zoo'
  | 'pyramid'
  | 'tree_garden';

export type LightingMode = 'day' | 'sunset' | 'night';

export type ToolMode =
  | BuildingType
  | 'select'
  | 'route'
  | 'demolish';

export type CameraPreset = 'isometric' | 'street' | 'topdown';

export interface PlacedEntity {
  id: string;
  type: BuildingType;
  gx: number;
  gz: number;
  rotation: number; // 0, 1, 2, 3 (multiples of 90 deg)
  level: number;
  name: string;
  createdAt: number;
  cost: number;
}

export interface CityResources {
  credits: number;
  energyProduced: number;
  energyConsumed: number;
  waterSupply: number;
  materials: number;
  milkStock?: number;
  cropsStock?: number;
  tradeCompletedCount?: number;
}

export interface CityMetrics {
  population: number;
  happiness: number; // 0..100
  ecoIndex: number; // 0..100
  connectivityPct: number; // 0..100
  prosperityScore: number; // 0..100
  totalBuildings: number;
  roadCount: number;
  isolatedCount: number;
  epoch: number;
}

export interface DecisionEntry {
  id: string;
  timestamp: number;
  epoch: number;
  action: string;
  detail: string;
  impactSummary: string;
}

export interface TimelineSnapshot {
  epoch: number;
  population: number;
  credits: number;
  energyNet: number;
  ecoIndex: number;
  connectivityPct: number;
  happiness: number;
  buildingCount: number;
}

export interface TimelineNode {
  id: string;
  parentId: string | null;
  name: string;
  decisionTitle: string;
  era: WorldEra;
  themeVariant?: string;
  createdAt: number;
  entities: PlacedEntity[];
  resources: CityResources;
  metrics: CityMetrics;
  decisions: DecisionEntry[];
  snapshots: TimelineSnapshot[];
  childrenIds: string[];
}

export interface WorldParameters {
  gridSize: number; // 16
  taxRate: number; // 5..25%
  ecoPolicy: 'balanced' | 'green_mandate' | 'deregulated';
  startingCredits: number;
}

export interface AIRecommendation {
  id: string;
  title: string;
  category: 'connectivity' | 'zoning' | 'energy' | 'sustainability' | 'strategy';
  priority: 'high' | 'medium' | 'low';
  summary: string;
  suggestedAction: string;
  targetCoord?: { gx: number; gz: number };
  createdAt: number;
}

export interface WorldRecord {
  id: string;
  name: string;
  description: string;
  era: WorldEra;
  seed: number;
  createdAt: number;
  updatedAt: number;
  parameters: WorldParameters;
  rootTimelineId: string;
  activeTimelineId: string;
  timelines: Record<string, TimelineNode>;
  recommendations: AIRecommendation[];
}

export interface BuildingSpec {
  type: BuildingType;
  label: string;
  shortLabel: string;
  cost: number;
  energyDelta: number; // positive produces, negative consumes
  populationDelta: number;
  ecoDelta: number;
  creditsPerEpoch: number;
  color: string;
  description: string;
  hotkey: string;
  unlockLevel: number;
}

export interface PlayerProgression {
  xp: number;
  level: number;
  completedGoalIds: string[];
}

export interface MLPredictionPoint {
  epochOffset: number;
  predictedPopulation: number;
  predictedCredits: number;
  predictedEnergyDemand: number;
  predictedEcoIndex: number;
  predictedHappiness: number;
}

export interface MLValidationMetrics {
  r2Score: number;
  maePopulation: number;
  rmseCredits: number;
  sampleCount: number;
  dominantDriver: string;
}

export interface MLPredictionReport {
  forecast: MLPredictionPoint[];
  validation: MLValidationMetrics;
  patternSummary: string;
}

export interface DSASnapshot {
  graphNodes: number;
  graphEdges: number;
  connectedComponents: number;
  isolatedCoords: Array<{ gx: number; gz: number; name: string }>;
  reachableFromCore: number;
  avlHeight: number;
  avlNodeCount: number;
  avlBalanceFactor: number;
  bstNodeCount: number;
  hashLoadFactor: number;
  hashBucketCount: number;
  hashCollisions: number;
  stackDepth: number;
  queueLength: number;
  heapTopTask: { label: string; priority: number } | null;
  linkedListLength: number;
  timelineTreeDepth: number;
  timelineBranchCount: number;
  topRankedBuildings: Array<{ id: string; name: string; score: number; type: BuildingType }>;
}
