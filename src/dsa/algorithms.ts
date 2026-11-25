/**
 * ArchiVerse AI — Custom Algorithms Suite
 * Manual implementations of BFS, DFS, Dijkstra, Merge Sort, Quick Sort,
 * Bubble Sort, Binary Search, and Linear Search.
 */
import { CustomGraph, CustomMinHeap, CustomQueue } from './structures';

export interface PathResult {
  found: boolean;
  path: string[];
  totalCost: number;
  visitedOrder: string[];
}

// 1. BFS — Graph Traversal for Connectivity Analysis
export function bfsConnectivity(
  graph: CustomGraph,
  startId: string,
): { visited: string[]; visitedMap: Record<string, boolean> } {
  const visitedMap: Record<string, boolean> = {};
  const visited: string[] = [];
  const queue = new CustomQueue<string>();

  visitedMap[startId] = true;
  queue.enqueue(startId);

  while (!queue.isEmpty()) {
    const current = queue.dequeue()!;
    visited.push(current);
    const neighbors = graph.getNeighbors(current);
    for (let i = 0; i < neighbors.length; i += 1) {
      const nextId = neighbors[i].to;
      if (!visitedMap[nextId]) {
        visitedMap[nextId] = true;
        queue.enqueue(nextId);
      }
    }
  }

  return { visited, visitedMap };
}

// 2. DFS — Graph Traversal for Network Exploration
export function dfsExploration(graph: CustomGraph, startId: string): string[] {
  const visited: Record<string, boolean> = {};
  const order: string[] = [];

  const explore = (nodeId: string) => {
    visited[nodeId] = true;
    order.push(nodeId);
    const neighbors = graph.getNeighbors(nodeId);
    for (let i = 0; i < neighbors.length; i += 1) {
      const next = neighbors[i].to;
      if (!visited[next]) {
        explore(next);
      }
    }
  };

  explore(startId);
  return order;
}

// 3. Dijkstra's Shortest Path — Road Route Calculation
export function dijkstraShortestPath(
  graph: CustomGraph,
  startId: string,
  targetId: string,
): PathResult {
  const nodes = graph.getNodes();
  const dist: Record<string, number> = {};
  const prev: Record<string, string | null> = {};
  const visited: Record<string, boolean> = {};
  const visitedOrder: string[] = [];

  for (let i = 0; i < nodes.length; i += 1) {
    dist[nodes[i]] = Infinity;
    prev[nodes[i]] = null;
  }

  if (dist[startId] === undefined || dist[targetId] === undefined) {
    return { found: false, path: [], totalCost: Infinity, visitedOrder };
  }

  dist[startId] = 0;
  const pq = new CustomMinHeap<string>();
  pq.insert(0, startId);

  while (!pq.isEmpty()) {
    const minNode = pq.extractMin()!;
    const u = minNode.value;
    if (visited[u]) continue;
    visited[u] = true;
    visitedOrder.push(u);

    if (u === targetId) break;

    const neighbors = graph.getNeighbors(u);
    for (let i = 0; i < neighbors.length; i += 1) {
      const edge = neighbors[i];
      if (visited[edge.to]) continue;
      const alt = dist[u] + edge.weight;
      if (alt < dist[edge.to]) {
        dist[edge.to] = alt;
        prev[edge.to] = u;
        pq.insert(alt, edge.to);
      }
    }
  }

  if (!Number.isFinite(dist[targetId])) {
    return { found: false, path: [], totalCost: Infinity, visitedOrder };
  }

  const path: string[] = [];
  let curr: string | null = targetId;
  while (curr !== null) {
    path.unshift(curr);
    curr = prev[curr];
  }

  return {
    found: true,
    path,
    totalCost: dist[targetId],
    visitedOrder,
  };
}

// 4. Merge Sort — Divide and Conquer (World Ranking)
export function mergeSort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
  if (arr.length <= 1) return arr.slice();
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compare);
  const right = mergeSort(arr.slice(mid), compare);

  const merged: T[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      merged.push(left[i]);
      i += 1;
    } else {
      merged.push(right[j]);
      j += 1;
    }
  }
  while (i < left.length) {
    merged.push(left[i]);
    i += 1;
  }
  while (j < right.length) {
    merged.push(right[j]);
    j += 1;
  }
  return merged;
}

// 5. Quick Sort — Partitioning (Building Ranking)
export function quickSort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
  const copy = arr.slice();
  const partition = (low: number, high: number): number => {
    const pivot = copy[high];
    let i = low - 1;
    for (let j = low; j < high; j += 1) {
      if (compare(copy[j], pivot) <= 0) {
        i += 1;
        const tmp = copy[i];
        copy[i] = copy[j];
        copy[j] = tmp;
      }
    }
    const tmp = copy[i + 1];
    copy[i + 1] = copy[high];
    copy[high] = tmp;
    return i + 1;
  };

  const sortRec = (low: number, high: number) => {
    if (low < high) {
      const pi = partition(low, high);
      sortRec(low, pi - 1);
      sortRec(pi + 1, high);
    }
  };

  sortRec(0, copy.length - 1);
  return copy;
}

// 6. Bubble Sort — Small Record Sorting
export function bubbleSort<T>(arr: T[], compare: (a: T, b: T) => number): T[] {
  const copy = arr.slice();
  const n = copy.length;
  for (let i = 0; i < n - 1; i += 1) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j += 1) {
      if (compare(copy[j], copy[j + 1]) > 0) {
        const tmp = copy[j];
        copy[j] = copy[j + 1];
        copy[j + 1] = tmp;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return copy;
}

// 7. Binary Search — Sorted Building Lookup
export function binarySearch<T>(
  sortedArr: T[],
  targetKey: string,
  getKey: (item: T) => string,
): number {
  let low = 0;
  let high = sortedArr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midKey = getKey(sortedArr[mid]);
    if (midKey === targetKey) return mid;
    if (midKey < targetKey) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}

// 8. Linear Search — Sequential General Record Lookup
export function linearSearch<T>(arr: T[], predicate: (item: T) => boolean): T | undefined {
  for (let i = 0; i < arr.length; i += 1) {
    if (predicate(arr[i])) return arr[i];
  }
  return undefined;
}
