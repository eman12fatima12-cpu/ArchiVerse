/**
 * ArchiVerse AI — Custom Data Structures Engine
 * All compulsory PRD structures implemented manually from scratch
 * without relying on built-in JS Map/Set/Array.sort abstractions.
 */

// 1. Custom Stack (Undo / Redo operations)
export class CustomStack<T> {
  private items: T[] = [];
  private topIndex = -1;

  push(item: T): void {
    this.topIndex += 1;
    this.items[this.topIndex] = item;
  }

  pop(): T | undefined {
    if (this.topIndex < 0) return undefined;
    const item = this.items[this.topIndex];
    this.items.length = this.topIndex;
    this.topIndex -= 1;
    return item;
  }

  peek(): T | undefined {
    if (this.topIndex < 0) return undefined;
    return this.items[this.topIndex];
  }

  isEmpty(): boolean {
    return this.topIndex < 0;
  }

  size(): number {
    return this.topIndex + 1;
  }

  toArray(): T[] {
    const out: T[] = [];
    for (let i = this.topIndex; i >= 0; i -= 1) {
      out.push(this.items[i]);
    }
    return out;
  }

  clear(): void {
    this.items.length = 0;
    this.topIndex = -1;
  }
}

// 2. Custom Queue (Construction & Simulation Task Queue)
export class CustomQueue<T> {
  private storage: T[] = [];
  private head = 0;
  private tail = 0;

  enqueue(item: T): void {
    this.storage[this.tail] = item;
    this.tail += 1;
  }

  dequeue(): T | undefined {
    if (this.isEmpty()) return undefined;
    const item = this.storage[this.head];
    this.head += 1;
    if (this.head > 32 && this.head * 2 >= this.tail) {
      const compact: T[] = [];
      for (let i = this.head; i < this.tail; i += 1) {
        compact.push(this.storage[i]);
      }
      this.storage = compact;
      this.tail = compact.length;
      this.head = 0;
    }
    return item;
  }

  peek(): T | undefined {
    return this.isEmpty() ? undefined : this.storage[this.head];
  }

  isEmpty(): boolean {
    return this.tail - this.head <= 0;
  }

  size(): number {
    return this.tail - this.head;
  }

  toArray(): T[] {
    const out: T[] = [];
    for (let i = this.head; i < this.tail; i += 1) {
      out.push(this.storage[i]);
    }
    return out;
  }
}

// 3. Custom Min-Heap (Binary Heap for Task & Alert Prioritization)
export interface HeapNode<T> {
  priority: number;
  value: T;
}

export class CustomMinHeap<T> {
  private heap: HeapNode<T>[] = [];

  size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  peek(): HeapNode<T> | undefined {
    return this.heap[0];
  }

  insert(priority: number, value: T): void {
    this.heap.push({ priority, value });
    this.bubbleUp(this.heap.length - 1);
  }

  extractMin(): HeapNode<T> | undefined {
    if (this.heap.length === 0) return undefined;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.sinkDown(0);
    }
    return min;
  }

  private bubbleUp(index: number): void {
    let idx = index;
    while (idx > 0) {
      const parentIdx = Math.floor((idx - 1) / 2);
      if (this.heap[idx].priority >= this.heap[parentIdx].priority) break;
      const tmp = this.heap[idx];
      this.heap[idx] = this.heap[parentIdx];
      this.heap[parentIdx] = tmp;
      idx = parentIdx;
    }
  }

  private sinkDown(index: number): void {
    let idx = index;
    const n = this.heap.length;
    while (true) {
      const left = 2 * idx + 1;
      const right = 2 * idx + 2;
      let smallest = idx;
      if (left < n && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < n && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }
      if (smallest === idx) break;
      const tmp = this.heap[idx];
      this.heap[idx] = this.heap[smallest];
      this.heap[smallest] = tmp;
      idx = smallest;
    }
  }

  toArray(): HeapNode<T>[] {
    return this.heap.slice();
  }
}

// 4. Custom Singly Linked List (Chronological Activity History)
export class LinkedListNode<T> {
  value: T;
  next: LinkedListNode<T> | null = null;
  constructor(value: T) {
    this.value = value;
  }
}

export class CustomLinkedList<T> {
  private head: LinkedListNode<T> | null = null;
  private tail: LinkedListNode<T> | null = null;
  private count = 0;

  prepend(value: T): void {
    const node = new LinkedListNode(value);
    node.next = this.head;
    this.head = node;
    if (!this.tail) this.tail = node;
    this.count += 1;
  }

  append(value: T): void {
    const node = new LinkedListNode(value);
    if (!this.tail) {
      this.head = node;
      this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node;
    }
    this.count += 1;
  }

  size(): number {
    return this.count;
  }

  toArray(): T[] {
    const out: T[] = [];
    let curr = this.head;
    while (curr) {
      out.push(curr.value);
      curr = curr.next;
    }
    return out;
  }
}

// 5. Custom Hash Table with Separate Chaining (Fast World & Building Lookup)
interface HashEntry<V> {
  key: string;
  value: V;
  next: HashEntry<V> | null;
}

export class CustomHashTable<V> {
  private buckets: Array<HashEntry<V> | null>;
  private capacity: number;
  private count = 0;
  private collisionCount = 0;

  constructor(capacity = 64) {
    this.capacity = capacity;
    this.buckets = new Array<HashEntry<V> | null>(capacity).fill(null);
  }

  private hash(key: string): number {
    let h = 2166136261;
    for (let i = 0; i < key.length; i += 1) {
      h ^= key.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return Math.abs(h) % this.capacity;
  }

  set(key: string, value: V): void {
    const idx = this.hash(key);
    let curr = this.buckets[idx];
    if (curr !== null) {
      let existing = false;
      let scan: HashEntry<V> | null = curr;
      while (scan) {
        if (scan.key === key) {
          scan.value = value;
          existing = true;
          break;
        }
        scan = scan.next;
      }
      if (!existing) {
        this.collisionCount += 1;
        this.buckets[idx] = { key, value, next: curr };
        this.count += 1;
      }
    } else {
      this.buckets[idx] = { key, value, next: null };
      this.count += 1;
    }
  }

  get(key: string): V | undefined {
    const idx = this.hash(key);
    let curr = this.buckets[idx];
    while (curr) {
      if (curr.key === key) return curr.value;
      curr = curr.next;
    }
    return undefined;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  delete(key: string): boolean {
    const idx = this.hash(key);
    let curr = this.buckets[idx];
    let prev: HashEntry<V> | null = null;
    while (curr) {
      if (curr.key === key) {
        if (prev) prev.next = curr.next;
        else this.buckets[idx] = curr.next;
        this.count -= 1;
        return true;
      }
      prev = curr;
      curr = curr.next;
    }
    return false;
  }

  getStats(): { size: number; capacity: number; loadFactor: number; collisions: number } {
    return {
      size: this.count,
      capacity: this.capacity,
      loadFactor: Number((this.count / this.capacity).toFixed(3)),
      collisions: this.collisionCount,
    };
  }
}

// 6. Custom Binary Search Tree (Building Records)
export class BSTNode<T> {
  key: string;
  value: T;
  left: BSTNode<T> | null = null;
  right: BSTNode<T> | null = null;

  constructor(key: string, value: T) {
    this.key = key;
    this.value = value;
  }
}

export class CustomBST<T> {
  root: BSTNode<T> | null = null;
  private count = 0;

  insert(key: string, value: T): void {
    const insertRec = (node: BSTNode<T> | null): BSTNode<T> => {
      if (!node) {
        this.count += 1;
        return new BSTNode(key, value);
      }
      if (key < node.key) node.left = insertRec(node.left);
      else if (key > node.key) node.right = insertRec(node.right);
      else node.value = value;
      return node;
    };
    this.root = insertRec(this.root);
  }

  search(key: string): T | undefined {
    let curr = this.root;
    while (curr) {
      if (key === curr.key) return curr.value;
      curr = key < curr.key ? curr.left : curr.right;
    }
    return undefined;
  }

  inOrder(): T[] {
    const out: T[] = [];
    const traverse = (node: BSTNode<T> | null) => {
      if (!node) return;
      traverse(node.left);
      out.push(node.value);
      traverse(node.right);
    };
    traverse(this.root);
    return out;
  }

  size(): number {
    return this.count;
  }
}

// 7. Custom Self-Balancing AVL Tree (Efficient Building Indexing)
export class AVLNode<T> {
  key: number;
  value: T;
  height = 1;
  left: AVLNode<T> | null = null;
  right: AVLNode<T> | null = null;

  constructor(key: number, value: T) {
    this.key = key;
    this.value = value;
  }
}

export class CustomAVLTree<T> {
  root: AVLNode<T> | null = null;
  private count = 0;
  public rotationCount = 0;

  private getHeight(node: AVLNode<T> | null): number {
    return node ? node.height : 0;
  }

  getBalance(node: AVLNode<T> | null): number {
    return node ? this.getHeight(node.left) - this.getHeight(node.right) : 0;
  }

  private rightRotate(y: AVLNode<T>): AVLNode<T> {
    this.rotationCount += 1;
    const x = y.left!;
    const t2 = x.right;
    x.right = y;
    y.left = t2;
    y.height = Math.max(this.getHeight(y.left), this.getHeight(y.right)) + 1;
    x.height = Math.max(this.getHeight(x.left), this.getHeight(x.right)) + 1;
    return x;
  }

  private leftRotate(x: AVLNode<T>): AVLNode<T> {
    this.rotationCount += 1;
    const y = x.right!;
    const t2 = y.left;
    y.left = x;
    x.right = t2;
    x.height = Math.max(this.getHeight(x.left), this.getHeight(x.right)) + 1;
    y.height = Math.max(this.getHeight(y.left), this.getHeight(y.right)) + 1;
    return y;
  }

  insert(key: number, value: T): void {
    const insertRec = (node: AVLNode<T> | null): AVLNode<T> => {
      if (!node) {
        this.count += 1;
        return new AVLNode(key, value);
      }
      if (key < node.key) node.left = insertRec(node.left);
      else if (key > node.key) node.right = insertRec(node.right);
      else {
        node.value = value;
        return node;
      }

      node.height = 1 + Math.max(this.getHeight(node.left), this.getHeight(node.right));
      const balance = this.getBalance(node);

      if (balance > 1 && key < node.left!.key) return this.rightRotate(node);
      if (balance < -1 && key > node.right!.key) return this.leftRotate(node);
      if (balance > 1 && key > node.left!.key) {
        node.left = this.leftRotate(node.left!);
        return this.rightRotate(node);
      }
      if (balance < -1 && key < node.right!.key) {
        node.right = this.rightRotate(node.right!);
        return this.leftRotate(node);
      }
      return node;
    };

    this.root = insertRec(this.root);
  }

  height(): number {
    return this.getHeight(this.root);
  }

  size(): number {
    return this.count;
  }

  inOrder(): T[] {
    const out: T[] = [];
    const walk = (n: AVLNode<T> | null) => {
      if (!n) return;
      walk(n.left);
      out.push(n.value);
      walk(n.right);
    };
    walk(this.root);
    return out;
  }
}

// 8. Custom Graph using Adjacency List (Road & Building Network)
export interface GraphEdge {
  to: string;
  weight: number;
}

export class CustomGraph {
  private adjacency: Record<string, GraphEdge[]> = {};
  private nodeList: string[] = [];

  addNode(id: string): void {
    if (!this.adjacency[id]) {
      this.adjacency[id] = [];
      this.nodeList.push(id);
    }
  }

  addUndirectedEdge(a: string, b: string, weight = 1): void {
    this.addNode(a);
    this.addNode(b);
    const existsA = this.adjacency[a].some((e) => e.to === b);
    if (!existsA) this.adjacency[a].push({ to: b, weight });
    const existsB = this.adjacency[b].some((e) => e.to === a);
    if (!existsB) this.adjacency[b].push({ to: a, weight });
  }

  getNeighbors(id: string): GraphEdge[] {
    return this.adjacency[id] || [];
  }

  getNodes(): string[] {
    return this.nodeList.slice();
  }

  getEdgeCount(): number {
    let sum = 0;
    for (let i = 0; i < this.nodeList.length; i += 1) {
      sum += this.adjacency[this.nodeList[i]].length;
    }
    return Math.floor(sum / 2);
  }
}

// 9. Custom General Tree (Parallel Timelines Hierarchy)
export class GeneralTreeNode<T> {
  id: string;
  data: T;
  children: GeneralTreeNode<T>[] = [];

  constructor(id: string, data: T) {
    this.id = id;
    this.data = data;
  }
}

export class CustomTree<T> {
  root: GeneralTreeNode<T> | null = null;

  setRoot(id: string, data: T): GeneralTreeNode<T> {
    this.root = new GeneralTreeNode(id, data);
    return this.root;
  }

  findNode(id: string, node: GeneralTreeNode<T> | null = this.root): GeneralTreeNode<T> | null {
    if (!node) return null;
    if (node.id === id) return node;
    for (let i = 0; i < node.children.length; i += 1) {
      const found = this.findNode(id, node.children[i]);
      if (found) return found;
    }
    return null;
  }

  addChild(parentId: string, id: string, data: T): GeneralTreeNode<T> | null {
    const parent = this.findNode(parentId);
    if (!parent) return null;
    const child = new GeneralTreeNode(id, data);
    parent.children.push(child);
    return child;
  }

  getDepth(node: GeneralTreeNode<T> | null = this.root): number {
    if (!node) return 0;
    let maxChild = 0;
    for (let i = 0; i < node.children.length; i += 1) {
      const d = this.getDepth(node.children[i]);
      if (d > maxChild) maxChild = d;
    }
    return 1 + maxChild;
  }

  countNodes(node: GeneralTreeNode<T> | null = this.root): number {
    if (!node) return 0;
    let total = 1;
    for (let i = 0; i < node.children.length; i += 1) {
      total += this.countNodes(node.children[i]);
    }
    return total;
  }
}
