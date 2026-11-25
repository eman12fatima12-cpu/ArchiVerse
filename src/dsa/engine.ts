import { BUILDING_SPECS, coordKey, GRID_SIZE } from '../data/presets';
import {
  CityMetrics,
  CityResources,
  DSASnapshot,
  PlacedEntity,
  TimelineNode,
  WorldParameters,
  WorldRecord,
} from '../types/archiverse';
import {
  bfsConnectivity,
  dfsExploration,
  dijkstraShortestPath,
  mergeSort,
  PathResult,
  quickSort,
} from './algorithms';
import {
  CustomAVLTree,
  CustomBST,
  CustomGraph,
  CustomHashTable,
  CustomLinkedList,
  CustomMinHeap,
  CustomQueue,
  CustomStack,
  CustomTree,
} from './structures';

export interface UndoOperation {
  label: string;
  entities: PlacedEntity[];
  resources: CityResources;
}

export interface DSAWorldContext {
  graph: CustomGraph;
  hashTable: CustomHashTable<PlacedEntity>;
  bst: CustomBST<PlacedEntity>;
  avl: CustomAVLTree<PlacedEntity>;
  taskQueue: CustomQueue<string>;
  priorityHeap: CustomMinHeap<string>;
  historyList: CustomLinkedList<string>;
  timelineTree: CustomTree<TimelineNode>;
  snapshot: DSASnapshot;
}

const DIRECTIONS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

export function buildDSAWorldContext(
  world: WorldRecord,
  timeline: TimelineNode,
  undoStack: CustomStack<UndoOperation>,
): DSAWorldContext {
  const graph = new CustomGraph();
  const hashTable = new CustomHashTable<PlacedEntity>(128);
  const bst = new CustomBST<PlacedEntity>();
  const avl = new CustomAVLTree<PlacedEntity>();
  const taskQueue = new CustomQueue<string>();
  const priorityHeap = new CustomMinHeap<string>();
  const historyList = new CustomLinkedList<string>();
  const timelineTree = new CustomTree<TimelineNode>();

  // Populate Hash Table, BST, AVL Tree, and Graph nodes
  for (let i = 0; i < timeline.entities.length; i += 1) {
    const entity = timeline.entities[i];
    const key = coordKey(entity.gx, entity.gz);
    hashTable.set(key, entity);
    hashTable.set(entity.id, entity);
    bst.insert(entity.id, entity);
    const numericKey = entity.gz * GRID_SIZE + entity.gx + 1;
    avl.insert(numericKey, entity);
    graph.addNode(key);
  }

  // Connect adjacent nodes in the Adjacency List Graph
  // Roads connect to adjacent roads (weight 1) and adjacent buildings (weight 1.5).
  // Buildings only connect to adjacent roads or transit/nexus hubs.
  for (let i = 0; i < timeline.entities.length; i += 1) {
    const a = timeline.entities[i];
    const keyA = coordKey(a.gx, a.gz);
    for (let d = 0; d < DIRECTIONS.length; d += 1) {
      const nx = a.gx + DIRECTIONS[d][0];
      const nz = a.gz + DIRECTIONS[d][1];
      if (nx < 0 || nz < 0 || nx >= GRID_SIZE || nz >= GRID_SIZE) continue;
      const keyB = coordKey(nx, nz);
      const b = hashTable.get(keyB);
      if (!b) continue;
      if (a.type === 'road' && b.type === 'road') {
        graph.addUndirectedEdge(keyA, keyB, 1);
      } else if (a.type === 'road' || b.type === 'road') {
        graph.addUndirectedEdge(keyA, keyB, 1.5);
      } else if (
        a.type === 'portal_nexus' ||
        b.type === 'portal_nexus' ||
        a.type === 'transit_hub' ||
        b.type === 'transit_hub'
      ) {
        graph.addUndirectedEdge(keyA, keyB, 2);
      }
    }
  }

  // Populate General Tree for Parallel Timelines
  const rootTl = world.timelines[world.rootTimelineId];
  if (rootTl) {
    timelineTree.setRoot(rootTl.id, rootTl);
    const addChildrenRec = (parent: TimelineNode) => {
      for (let i = 0; i < parent.childrenIds.length; i += 1) {
        const cid = parent.childrenIds[i];
        const child = world.timelines[cid];
        if (child) {
          timelineTree.addChild(parent.id, child.id, child);
          addChildrenRec(child);
        }
      }
    };
    addChildrenRec(rootTl);
  }

  // Populate LinkedList from Decisions
  for (let i = 0; i < timeline.decisions.length; i += 1) {
    const dec = timeline.decisions[i];
    historyList.prepend(`[Epoch ${dec.epoch}] ${dec.action}: ${dec.detail}`);
  }

  // Connectivity Analysis via BFS + Component Discovery
  const allNodes = graph.getNodes();
  const visitedOverall: Record<string, boolean> = {};
  let largestComponent: string[] = [];
  let connectedComponents = 0;

  // Prefer starting from portal_nexus or first road if present
  const anchorEntity =
    timeline.entities.find((e) => e.type === 'portal_nexus') ||
    timeline.entities.find((e) => e.type === 'road') ||
    timeline.entities[0];

  for (let i = 0; i < allNodes.length; i += 1) {
    const node = allNodes[i];
    if (!visitedOverall[node]) {
      connectedComponents += 1;
      const res = bfsConnectivity(graph, node);
      for (let j = 0; j < res.visited.length; j += 1) {
        visitedOverall[res.visited[j]] = true;
      }
      if (res.visited.length > largestComponent.length) {
        largestComponent = res.visited;
      }
    }
  }

  const coreSet: Record<string, boolean> = {};
  const coreStart = anchorEntity ? coordKey(anchorEntity.gx, anchorEntity.gz) : '';
  const coreBfs = coreStart ? bfsConnectivity(graph, coreStart) : { visited: [], visitedMap: {} };
  for (let i = 0; i < coreBfs.visited.length; i += 1) {
    coreSet[coreBfs.visited[i]] = true;
  }

  const isolatedCoords: Array<{ gx: number; gz: number; name: string }> = [];
  const buildings = timeline.entities.filter((e) => e.type !== 'road');
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    const k = coordKey(b.gx, b.gz);
    const hasCoreLink = Boolean(coreSet[k]) && graph.getNeighbors(k).length > 0;
    if (!hasCoreLink && buildings.length > 1) {
      isolatedCoords.push({ gx: b.gx, gz: b.gz, name: b.name });
      priorityHeap.insert(1, `Connect isolated ${b.name} at (${b.gx},${b.gz}) to road grid`);
      taskQueue.enqueue(`Road link -> (${b.gx},${b.gz})`);
    }
  }

  // Priority Heap urban alerts
  if (timeline.resources.energyConsumed > timeline.resources.energyProduced) {
    priorityHeap.insert(
      2,
      `Energy deficit (-${timeline.resources.energyConsumed - timeline.resources.energyProduced} MW): Build Clean Energy Array`,
    );
    taskQueue.enqueue('Deploy Power Hub');
  }
  if (timeline.metrics.ecoIndex < 55) {
    priorityHeap.insert(3, `Eco index low (${timeline.metrics.ecoIndex}): Add Botanical Plazas`);
    taskQueue.enqueue('Zone Botanical Plaza');
  }
  if (timeline.resources.credits < 250) {
    priorityHeap.insert(4, 'Treasury low: Expand Commercial Towers');
  }
  if (priorityHeap.isEmpty()) {
    priorityHeap.insert(5, 'Network optimal — ready to branch a parallel timeline');
  }

  // Quick Sort ranking of buildings by composite strategic value
  const rankedRaw = buildings.map((b) => {
    const spec = BUILDING_SPECS[b.type];
    const lvlMult = 1 + (b.level - 1) * 0.45;
    const neighbors = graph.getNeighbors(coordKey(b.gx, b.gz)).length;
    const score = Math.round(
      (spec.creditsPerEpoch * 1.1 +
        spec.populationDelta * 0.4 +
        Math.max(0, spec.ecoDelta) * 5) *
        lvlMult +
        neighbors * 12,
    );
    return { id: b.id, name: b.name, score, type: b.type };
  });
  const topRankedBuildings = quickSort(rankedRaw, (a, b) => b.score - a.score).slice(0, 6);

  const hashStats = hashTable.getStats();
  const topTask = priorityHeap.peek();

  return {
    graph,
    hashTable,
    bst,
    avl,
    taskQueue,
    priorityHeap,
    historyList,
    timelineTree,
    snapshot: {
      graphNodes: allNodes.length,
      graphEdges: graph.getEdgeCount(),
      connectedComponents,
      isolatedCoords,
      reachableFromCore: coreBfs.visited.length,
      avlHeight: avl.height(),
      avlNodeCount: avl.size(),
      avlBalanceFactor: avl.getBalance(avl.root),
      bstNodeCount: bst.size(),
      hashLoadFactor: hashStats.loadFactor,
      hashBucketCount: hashStats.capacity,
      hashCollisions: hashStats.collisions,
      stackDepth: undoStack.size(),
      queueLength: taskQueue.size(),
      heapTopTask: topTask ? { label: topTask.value, priority: topTask.priority } : null,
      linkedListLength: historyList.size(),
      timelineTreeDepth: timelineTree.getDepth(),
      timelineBranchCount: timelineTree.countNodes(),
      topRankedBuildings,
    },
  };
}

export function evaluateCityState(
  entities: PlacedEntity[],
  params: WorldParameters,
  currentCredits: number,
  currentEpoch: number,
): { resources: CityResources; metrics: CityMetrics; isolatedCoords: Array<{ gx: number; gz: number }> } {
  const hash = new CustomHashTable<PlacedEntity>(128);
  const graph = new CustomGraph();

  for (let i = 0; i < entities.length; i += 1) {
    const e = entities[i];
    const k = coordKey(e.gx, e.gz);
    hash.set(k, e);
    graph.addNode(k);
  }

  for (let i = 0; i < entities.length; i += 1) {
    const a = entities[i];
    const keyA = coordKey(a.gx, a.gz);
    for (let d = 0; d < DIRECTIONS.length; d += 1) {
      const nx = a.gx + DIRECTIONS[d][0];
      const nz = a.gz + DIRECTIONS[d][1];
      if (nx < 0 || nz < 0 || nx >= GRID_SIZE || nz >= GRID_SIZE) continue;
      const keyB = coordKey(nx, nz);
      const b = hash.get(keyB);
      if (!b) continue;
      if (a.type === 'road' && b.type === 'road') {
        graph.addUndirectedEdge(keyA, keyB, 1);
      } else if (a.type === 'road' || b.type === 'road') {
        graph.addUndirectedEdge(keyA, keyB, 1.5);
      } else if (
        a.type === 'portal_nexus' ||
        b.type === 'portal_nexus' ||
        a.type === 'transit_hub' ||
        b.type === 'transit_hub'
      ) {
        graph.addUndirectedEdge(keyA, keyB, 2);
      }
    }
  }

  let energyProduced = 16; // base microgrid
  let energyConsumed = 0;
  let population = 0;
  let ecoAccumulator = 72;
  let materials = 120;
  let transitBonus = 0;
  let farmCount = 0;
  let milkShopCount = 0;

  const buildings = entities.filter((e) => e.type !== 'road');
  const roads = entities.filter((e) => e.type === 'road');

  for (let i = 0; i < entities.length; i += 1) {
    const ent = entities[i];
    const spec = BUILDING_SPECS[ent.type];
    const lvlMult = 1 + (ent.level - 1) * 0.45;
    if (spec.energyDelta >= 0) energyProduced += Math.round(spec.energyDelta * lvlMult);
    else energyConsumed += Math.abs(spec.energyDelta);
    population += Math.round(spec.populationDelta * lvlMult);
    ecoAccumulator += spec.ecoDelta;
    if (ent.type === 'industrial') materials += Math.round(85 * lvlMult);
    if (ent.type === 'transit_hub') transitBonus += 6;
    if (ent.type === 'farm') farmCount += 1;
    if (ent.type === 'milk_shop') milkShopCount += 1;
  }

  if (params.ecoPolicy === 'green_mandate') ecoAccumulator += 10;
  if (params.ecoPolicy === 'deregulated') ecoAccumulator -= 10;

  // Connectivity via BFS
  const anchor =
    entities.find((e) => e.type === 'portal_nexus') ||
    entities.find((e) => e.type === 'road') ||
    entities[0];
  const coreBfs = anchor ? bfsConnectivity(graph, coordKey(anchor.gx, anchor.gz)) : { visitedMap: {} as Record<string, boolean> };

  const isolatedCoords: Array<{ gx: number; gz: number }> = [];
  let connectedBuildings = 0;
  for (let i = 0; i < buildings.length; i += 1) {
    const b = buildings[i];
    const k = coordKey(b.gx, b.gz);
    const connected = Boolean(coreBfs.visitedMap[k]) && (buildings.length <= 1 || graph.getNeighbors(k).length > 0);
    if (connected) connectedBuildings += 1;
    else isolatedCoords.push({ gx: b.gx, gz: b.gz });
  }

  const connectivityPct =
    buildings.length === 0 ? 100 : Math.round((connectedBuildings / buildings.length) * 100);
  const ecoIndex = Math.max(5, Math.min(100, Math.round(ecoAccumulator)));
  const energyRatio = energyProduced >= energyConsumed ? 1 : energyProduced / Math.max(1, energyConsumed);
  const taxPenalty = Math.max(0, (params.taxRate - 12) * 0.9);
  const dairyHappiness = farmCount > 0 && milkShopCount > 0 ? 5 : 0;
  const happiness = Math.max(
    10,
    Math.min(
      100,
      Math.round(
        42 +
          ecoIndex * 0.34 +
          connectivityPct * 0.22 +
          energyRatio * 14 +
          transitBonus +
          dairyHappiness -
          taxPenalty,
      ),
    ),
  );

  const prosperityScore = Math.max(
    10,
    Math.min(
      100,
      Math.round(happiness * 0.35 + ecoIndex * 0.25 + connectivityPct * 0.25 + Math.min(100, population / 10) * 0.15),
    ),
  );

  const greenCount = entities.filter((e) => e.type === 'park' || e.type === 'tree_garden').length;
  const waterSupply = Math.max(25, Math.min(100, Math.round(92 - buildings.length * 0.9 + greenCount * 4)));

  return {
    resources: {
      credits: Math.round(currentCredits),
      energyProduced,
      energyConsumed,
      waterSupply,
      materials,
    },
    metrics: {
      population,
      happiness,
      ecoIndex,
      connectivityPct,
      prosperityScore,
      totalBuildings: buildings.length,
      roadCount: roads.length,
      isolatedCount: isolatedCoords.length,
      epoch: currentEpoch,
    },
    isolatedCoords,
  };
}

export function computeRouteBetweenTiles(
  entities: PlacedEntity[],
  start: { gx: number; gz: number },
  end: { gx: number; gz: number },
): PathResult {
  const hash = new CustomHashTable<PlacedEntity>(128);
  const graph = new CustomGraph();

  for (let i = 0; i < entities.length; i += 1) {
    const e = entities[i];
    const k = coordKey(e.gx, e.gz);
    hash.set(k, e);
    graph.addNode(k);
  }

  for (let i = 0; i < entities.length; i += 1) {
    const a = entities[i];
    const keyA = coordKey(a.gx, a.gz);
    for (let d = 0; d < DIRECTIONS.length; d += 1) {
      const nx = a.gx + DIRECTIONS[d][0];
      const nz = a.gz + DIRECTIONS[d][1];
      if (nx < 0 || nz < 0 || nx >= GRID_SIZE || nz >= GRID_SIZE) continue;
      const keyB = coordKey(nx, nz);
      const b = hash.get(keyB);
      if (!b) continue;
      if (a.type === 'road' && b.type === 'road') {
        graph.addUndirectedEdge(keyA, keyB, 1);
      } else if (a.type === 'road' || b.type === 'road') {
        graph.addUndirectedEdge(keyA, keyB, 1.5);
      }
    }
  }

  return dijkstraShortestPath(graph, coordKey(start.gx, start.gz), coordKey(end.gx, end.gz));
}

export function rankWorldsWithMergeSort(worlds: WorldRecord[]): WorldRecord[] {
  return mergeSort(worlds, (a, b) => {
    const ma = a.timelines[a.activeTimelineId]?.metrics.prosperityScore ?? 0;
    const mb = b.timelines[b.activeTimelineId]?.metrics.prosperityScore ?? 0;
    return mb - ma;
  });
}

export function computeProjectedEpochCredits(
  entities: PlacedEntity[],
  taxRate: number,
): number {
  let raw = 0;
  let farms = 0;
  let milkShops = 0;
  for (let i = 0; i < entities.length; i += 1) {
    const ent = entities[i];
    const spec = BUILDING_SPECS[ent.type];
    const lvlMult = 1 + (ent.level - 1) * 0.45;
    raw += spec.creditsPerEpoch * lvlMult;
    if (ent.type === 'farm') farms += 1;
    if (ent.type === 'milk_shop') milkShops += 1;
  }
  // Farm -> Milk Shop fresh dairy supply synergy (+18 cr per shop when farm exists)
  if (farms > 0 && milkShops > 0) {
    raw += milkShops * 18;
  }
  const taxMultiplier = taxRate / 12;
  return Math.round(raw * taxMultiplier);
}

export { dfsExploration };
