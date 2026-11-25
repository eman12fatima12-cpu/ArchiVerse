import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { coordKey, GRID_SIZE, resolveEraTheme } from '../data/presets';
import { CameraPreset, LightingMode, PlacedEntity, ToolMode, WorldEra } from '../types/archiverse';
import {
  AnimatedPartHandles,
  createBirdGroup,
  createBuildingGroup,
  createCamelGroup,
  createCloudClusterGroup,
  createCowGroup,
  createDeerGroup,
  createFlyingCarGroup,
  createGoatGroup,
  createHorseGroup,
  createMilkmanGroup,
  createPedestrianGroup,
  createRoadMesh,
  createSailboatGroup,
  createSheepGroup,
  createTrainCarGroup,
  createVehicleGroup,
  RoadNeighbors,
} from './models';
import { createProceduralTextures, ProceduralTexturePack } from './textures';

export interface CityViewportProps {
  entities: PlacedEntity[];
  era: WorldEra;
  themeVariant?: string;
  lightingMode: LightingMode;
  toolMode: ToolMode;
  placementRotation: number;
  selectedCoord: { gx: number; gz: number } | null;
  routePathKeys: string[];
  isolatedCoords: Array<{ gx: number; gz: number }>;
  cameraPreset: CameraPreset;
  cameraPresetVersion: number;
  titleMode: boolean;
  showTrains?: boolean;
  showFlyingCars?: boolean;
  onTileClick: (gx: number, gz: number) => void;
  onTileHover: (coord: { gx: number; gz: number } | null) => void;
}

const TILE_SIZE = 2;
const HALF_WORLD = (GRID_SIZE * TILE_SIZE) / 2;

export function gridToWorld(gx: number, gz: number): [number, number] {
  const wx = (gx - GRID_SIZE / 2 + 0.5) * TILE_SIZE;
  const wz = (gz - GRID_SIZE / 2 + 0.5) * TILE_SIZE;
  return [wx, wz];
}

function worldToGrid(wx: number, wz: number): { gx: number; gz: number } | null {
  const gx = Math.floor(wx / TILE_SIZE + GRID_SIZE / 2);
  const gz = Math.floor(wz / TILE_SIZE + GRID_SIZE / 2);
  if (gx < 0 || gz < 0 || gx >= GRID_SIZE || gz >= GRID_SIZE) return null;
  return { gx, gz };
}

interface VehicleAgent {
  mesh: THREE.Group;
  from: { gx: number; gz: number };
  to: { gx: number; gz: number };
  progress: number;
  speed: number;
}

interface DropAnim {
  group: THREE.Object3D;
  t: number;
  targetY: number;
}

interface FlyingCarAgent {
  mesh: THREE.Group;
  radiusX: number;
  radiusZ: number;
  altitude: number;
  angle: number;
  speed: number;
  centerX: number;
  centerZ: number;
}

interface TrainCarAgent {
  mesh: THREE.Group;
  offset: number;
}

interface PedestrianAgent {
  mesh: THREE.Group;
  from: { gx: number; gz: number };
  to: { gx: number; gz: number };
  progress: number;
  speed: number;
  lateralOffset: number;
  phase: number;
}

interface CloudAgent {
  mesh: THREE.Group;
  angle: number;
  radius: number;
  height: number;
  speed: number;
}

interface BoatAgent {
  mesh: THREE.Group;
  angle: number;
  radius: number;
  speed: number;
  phase: number;
}

interface WildlifeAgent {
  mesh: THREE.Group;
  centerX: number;
  centerZ: number;
  radiusX: number;
  radiusZ: number;
  angle: number;
  speed: number;
  phase: number;
  bobAmp: number;
}

interface BirdAgent {
  mesh: THREE.Group;
  radius: number;
  altitude: number;
  angle: number;
  speed: number;
  phase: number;
}

// Reusable math objects (zero GC in render loop)
const _vec3A = new THREE.Vector3();
const _vec3B = new THREE.Vector3();

export class CityViewportController {
  private container: HTMLElement;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private textures: ProceduralTexturePack;
  private isSoftwareGl: boolean;

  private sunLight: THREE.DirectionalLight;
  private hemiLight: THREE.HemisphereLight;
  private rimLight: THREE.DirectionalLight;

  private plateauMesh: THREE.Mesh;
  private beachMesh: THREE.Mesh;
  private cliffMesh: THREE.Mesh;
  private waterMesh: THREE.Mesh;
  private hillGroup: THREE.Group;
  private treeTrunks: THREE.InstancedMesh;
  private treeCrowns: THREE.InstancedMesh;
  private treeCrownsTop: THREE.InstancedMesh;
  private gridOverlay: THREE.GridHelper;

  private cityGroup: THREE.Group;
  private routeGroup: THREE.Group;
  private beaconGroup: THREE.Group;
  private vehicleGroup: THREE.Group;
  private flyingCarGroup: THREE.Group;
  private trackGroup: THREE.Group;
  private trainGroup: THREE.Group;
  private pedestrianGroup: THREE.Group;
  private camelGroup: THREE.Group;
  private milkmanGroup: THREE.Group;
  private cloudGroup: THREE.Group;
  private boatGroup: THREE.Group;
  private wildlifeGroup: THREE.Group;
  private birdGroup: THREE.Group;
  private hoverHighlight: THREE.Mesh;
  private selectHighlight: THREE.Mesh;

  private animHandles: AnimatedPartHandles = { rotors: [], portalRings: [], portalCores: [], swings: [] };
  private dropAnims: DropAnim[] = [];
  private vehicles: VehicleAgent[] = [];
  private flyingCars: FlyingCarAgent[] = [];
  private trainCurve: THREE.CatmullRomCurve3 | null = null;
  private trainCars: TrainCarAgent[] = [];
  private trainProgress = 0;
  private trainTrackY = 0.06;
  private pedestrians: PedestrianAgent[] = [];
  private camels: PedestrianAgent[] = [];
  private milkmen: PedestrianAgent[] = [];
  private clouds: CloudAgent[] = [];
  private boats: BoatAgent[] = [];
  private wildlife: WildlifeAgent[] = [];
  private birds: BirdAgent[] = [];
  private knownEntityIds = new Set<string>();
  private entityCache = new Map<
    string,
    { sig: string; group: THREE.Group; handles: AnimatedPartHandles }
  >();
  private lastRoadSig = '';
  private lastDairyCount = -1;
  private roadMap: Record<string, PlacedEntity> = {};
  private isConstrainedDevice = false;
  private slowFrameCount = 0;
  private minDprApplied = false;
  private pageHidden = typeof document !== 'undefined' ? document.hidden : false;

  private raycaster = new THREE.Raycaster();
  private mouseNDC = new THREE.Vector2();
  private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private lastHoverCheck = 0;
  private pointerDownPos = { x: 0, y: 0 };

  private targetCamPos = new THREE.Vector3(24, 22, 24);
  private targetCamLook = new THREE.Vector3(0, 0, 0);
  private camTransitionActive = false;

  private frameId = 0;
  private disposed = false;
  private clock = new THREE.Clock();
  private titleMode = true;
  private currentEra: WorldEra = 'prime_classical';
  private currentThemeVariant: string | undefined = undefined;
  private currentLightingMode: LightingMode = 'day';
  private currentToolMode: ToolMode = 'select';
  private currentEntities: PlacedEntity[] = [];
  private showTrains = true;
  private showFlyingCars = false;

  private onTileClickCb: (gx: number, gz: number) => void;
  private onTileHoverCb: (coord: { gx: number; gz: number } | null) => void;

  private skyUniforms = {
    topColor: { value: new THREE.Color('#243b5e') },
    bottomColor: { value: new THREE.Color('#e9b87c') },
  };

  constructor(
    container: HTMLElement,
    initialProps: CityViewportProps,
  ) {
    this.container = container;
    this.onTileClickCb = initialProps.onTileClick;
    this.onTileHoverCb = initialProps.onTileHover;
    this.titleMode = initialProps.titleMode;
    this.showTrains = initialProps.showTrains ?? true;
    this.showFlyingCars = initialProps.showFlyingCars ?? (initialProps.era === 'neo_cyber');

    // Software WebGL guard
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    const nav = navigator as Navigator & { deviceMemory?: number };
    const isTouchOrSmall =
      window.matchMedia('(pointer: coarse)').matches ||
      Math.min(window.innerWidth, window.innerHeight) < 768;
    const isLowSpec =
      this.isSoftwareGl ||
      (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 4) ||
      (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 4);
    this.isConstrainedDevice = isTouchOrSmall || isLowSpec;

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && !this.isConstrainedDevice,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    const targetDpr = this.isSoftwareGl
      ? 1
      : Math.min(window.devicePixelRatio || 1, this.isConstrainedDevice ? 1.25 : 1.75);
    this.renderer.setPixelRatio(targetDpr);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = this.isConstrainedDevice
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.domElement.style.touchAction = 'none';

    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    const aspect = (container.clientWidth || window.innerWidth) / Math.max(1, container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.5, 280);
    this.camera.position.set(25, 21, 25);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.06;
    this.controls.rotateSpeed = this.isConstrainedDevice ? 0.78 : 0.9;
    this.controls.zoomSpeed = 0.9;
    this.controls.panSpeed = 0.85;
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.maxPolarAngle = Math.PI / 2.22;
    this.controls.minPolarAngle = 0.2;
    this.controls.minDistance = 10;
    this.controls.maxDistance = 68;
    this.controls.target.set(0, 0, 0);
    this.controls.addEventListener('start', () => {
      this.camTransitionActive = false;
    });

    this.textures = createProceduralTextures(
      this.renderer.capabilities.getMaxAnisotropy(),
      this.isConstrainedDevice,
    );

    // Sky Dome
    const skyGeo = new THREE.SphereGeometry(180, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.skyUniforms,
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + vec3(0.0, 12.0, 0.0)).y;
          float t = pow(max(h, 0.0), 0.6);
          gl_FragColor = vec4(mix(bottomColor, topColor, t), 1.0);
        }
      `,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.scene.add(new THREE.Mesh(skyGeo, skyMat));

    // Lighting Rig (Key + Hemisphere Fill + Rim)
    this.hemiLight = new THREE.HemisphereLight(0xa8c6eb, 0x6b533b, 0.85);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xffe0a8, 2.35);
    this.sunLight.position.set(28, 38, 22);
    this.sunLight.castShadow = !this.isSoftwareGl;
    const shadowRes = this.isConstrainedDevice ? 1024 : 2048;
    this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
    this.sunLight.shadow.camera.near = 5;
    this.sunLight.shadow.camera.far = 110;
    this.sunLight.shadow.camera.left = -26;
    this.sunLight.shadow.camera.right = 26;
    this.sunLight.shadow.camera.top = 26;
    this.sunLight.shadow.camera.bottom = -26;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.55);
    this.rimLight.position.set(-24, 16, -26);
    this.scene.add(this.rimLight);

    // Continuous Realistic Terrain: Ocean, Coastal Harbor Seawall, Beach, Natural Grass Island, Sculpted Mountain Ridges & Conifer Forest
    const waterGeo = new THREE.PlaneGeometry(380, 380);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x175a7d,
      map: this.textures.waterRipple,
      roughness: 0.14,
      metalness: 0.12,
      clearcoat: 0.9,
      clearcoatRoughness: 0.12,
    });
    this.waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this.waterMesh.rotation.x = -Math.PI / 2;
    this.waterMesh.position.y = -0.82;
    this.waterMesh.receiveShadow = true;
    this.scene.add(this.waterMesh);

    // Stone Harbor Retaining Seawall & Rocky Cliff Apron
    const cliffGeo = new THREE.CylinderGeometry(26.6, 30.8, 1.55, 64);
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x6b6761,
      map: this.textures.brickStone,
      roughness: 0.94,
      metalness: 0.04,
    });
    this.cliffMesh = new THREE.Mesh(cliffGeo, cliffMat);
    this.cliffMesh.position.y = -0.86;
    this.cliffMesh.receiveShadow = true;
    this.scene.add(this.cliffMesh);

    const beachGeo = new THREE.CylinderGeometry(25.6, 27.6, 0.36, 64);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xd4be94,
      map: this.textures.sandGround,
      roughness: 0.92,
      metalness: 0.01,
    });
    this.beachMesh = new THREE.Mesh(beachGeo, beachMat);
    this.beachMesh.position.y = -0.22;
    this.beachMesh.receiveShadow = true;
    this.scene.add(this.beachMesh);

    const plateauGeo = new THREE.CylinderGeometry(24.6, 25.4, 0.38, 64);
    const plateauMat = new THREE.MeshStandardMaterial({
      color: 0x526f43,
      map: this.textures.grassGround,
      roughness: 0.92,
      metalness: 0.01,
    });
    this.plateauMesh = new THREE.Mesh(plateauGeo, plateauMat);
    this.plateauMesh.position.y = -0.19;
    this.plateauMesh.receiveShadow = true;
    this.scene.add(this.plateauMesh);

    // Distant Realistic Granite & Forested Mountain Range (organic multi-faceted rock formations instead of smooth toy cones)
    this.hillGroup = new THREE.Group();
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x59625e,
      roughness: 0.95,
      metalness: 0.03,
      flatShading: true,
    });
    const ridgeBaseMat = new THREE.MeshStandardMaterial({
      color: 0x445944,
      roughness: 0.94,
      metalness: 0.02,
      flatShading: true,
    });
    for (let i = 0; i < 24; i += 1) {
      const angle = (i / 24) * Math.PI * 2 + (i % 2) * 0.06;
      const dist = 54 + (i % 4) * 14;
      const baseRadius = 11 + (i % 5) * 3.5;
      const height = 8 + ((i * 7) % 11);

      const massif = new THREE.Group();
      const baseRock = new THREE.Mesh(new THREE.DodecahedronGeometry(baseRadius, 1), ridgeBaseMat);
      baseRock.scale.set(1.35, (height * 0.42) / baseRadius, 1.05);
      baseRock.rotation.y = i * 0.9;
      massif.add(baseRock);

      const upperPeak = new THREE.Mesh(new THREE.DodecahedronGeometry(baseRadius * 0.65, 1), rockMat);
      upperPeak.scale.set(1.0, (height * 0.72) / (baseRadius * 0.65), 0.9);
      upperPeak.position.set(1.4, height * 0.32, -1.0);
      upperPeak.rotation.y = i * 1.4;
      massif.add(upperPeak);

      massif.position.set(Math.cos(angle) * dist, -0.8, Math.sin(angle) * dist);
      massif.rotation.y = angle;
      this.hillGroup.add(massif);
    }
    this.scene.add(this.hillGroup);

    // Realistic Multi-Tier Layered Pine & Cedar Forest around Island Coastline (muted natural greens, non-cartoon silhouette)
    const treeCount = 86;
    const trunkGeo = new THREE.CylinderGeometry(0.065, 0.11, 0.56, 6);
    trunkGeo.translate(0, 0.28, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d3524, roughness: 0.94 });
    this.treeTrunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treeCount);
    this.treeTrunks.castShadow = !this.isSoftwareGl;

    const crownGeo = new THREE.ConeGeometry(0.46, 0.98, 7);
    crownGeo.translate(0, 0.88, 0);
    const crownMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88, flatShading: true });
    this.treeCrowns = new THREE.InstancedMesh(crownGeo, crownMat, treeCount);
    this.treeCrowns.castShadow = !this.isSoftwareGl;

    const crownTopGeo = new THREE.ConeGeometry(0.32, 0.82, 7);
    crownTopGeo.translate(0, 1.38, 0);
    const crownTopMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.86, flatShading: true });
    this.treeCrownsTop = new THREE.InstancedMesh(crownTopGeo, crownTopMat, treeCount);
    this.treeCrownsTop.castShadow = !this.isSoftwareGl;

    const dummy = new THREE.Object3D();
    const tintA = new THREE.Color();
    const tintB = new THREE.Color();
    for (let i = 0; i < treeCount; i += 1) {
      const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.045;
      const rad = 21.3 + ((i * 7) % 3) * 1.15;
      const scale = 0.85 + ((i * 17) % 45) / 100;
      dummy.position.set(Math.cos(angle) * rad, 0, Math.sin(angle) * rad);
      dummy.rotation.y = angle * 2.3;
      dummy.scale.set(scale * 0.95, scale * 1.15, scale * 0.95);
      dummy.updateMatrix();
      this.treeTrunks.setMatrixAt(i, dummy.matrix);
      this.treeCrowns.setMatrixAt(i, dummy.matrix);
      this.treeCrownsTop.setMatrixAt(i, dummy.matrix);
      // Deep realistic forest pine & spruce tones (no neon pastel)
      tintA.setHSL(0.31 + ((i % 5) - 2) * 0.015, 0.34, 0.22 + (i % 3) * 0.03);
      tintB.setHSL(0.30 + ((i % 4) - 1) * 0.015, 0.36, 0.27 + (i % 3) * 0.03);
      this.treeCrowns.setColorAt(i, tintA);
      this.treeCrownsTop.setColorAt(i, tintB);
    }
    this.treeTrunks.instanceMatrix.needsUpdate = true;
    this.treeCrowns.instanceMatrix.needsUpdate = true;
    this.treeCrownsTop.instanceMatrix.needsUpdate = true;
    if (this.treeCrowns.instanceColor) this.treeCrowns.instanceColor.needsUpdate = true;
    if (this.treeCrownsTop.instanceColor) this.treeCrownsTop.instanceColor.needsUpdate = true;
    this.treeTrunks.computeBoundingSphere();
    this.treeCrowns.computeBoundingSphere();
    this.treeCrownsTop.computeBoundingSphere();
    this.scene.add(this.treeTrunks);
    this.scene.add(this.treeCrowns);
    this.scene.add(this.treeCrownsTop);

    // Subtle Architectural Lot Grid (near-invisible during inspect/title; gentle guide only when building)
    this.gridOverlay = new THREE.GridHelper(GRID_SIZE * TILE_SIZE, GRID_SIZE, 0x64748b, 0x475569);
    this.gridOverlay.position.y = 0.008;
    const gridMats = Array.isArray(this.gridOverlay.material)
      ? this.gridOverlay.material
      : [this.gridOverlay.material];
    for (let i = 0; i < gridMats.length; i += 1) {
      gridMats[i].transparent = true;
      gridMats[i].opacity = 0.08;
    }
    this.scene.add(this.gridOverlay);

    // Hover & Selection tile highlights (polygonOffset prevents Z-fighting)
    const hlGeo = new THREE.PlaneGeometry(TILE_SIZE * 0.94, TILE_SIZE * 0.94);
    this.hoverHighlight = new THREE.Mesh(
      hlGeo,
      new THREE.MeshBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.38,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    );
    this.hoverHighlight.rotation.x = -Math.PI / 2;
    this.hoverHighlight.position.y = 0.03;
    this.hoverHighlight.visible = false;
    this.scene.add(this.hoverHighlight);

    this.selectHighlight = new THREE.Mesh(
      new THREE.RingGeometry(0.78, 0.96, 4),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    this.selectHighlight.rotation.x = -Math.PI / 2;
    this.selectHighlight.rotation.z = Math.PI / 4;
    this.selectHighlight.position.y = 0.045;
    this.selectHighlight.visible = false;
    this.scene.add(this.selectHighlight);

    this.cityGroup = new THREE.Group();
    this.routeGroup = new THREE.Group();
    this.beaconGroup = new THREE.Group();
    this.vehicleGroup = new THREE.Group();
    this.flyingCarGroup = new THREE.Group();
    this.trackGroup = new THREE.Group();
    this.trainGroup = new THREE.Group();
    this.pedestrianGroup = new THREE.Group();
    this.camelGroup = new THREE.Group();
    this.milkmanGroup = new THREE.Group();
    this.cloudGroup = new THREE.Group();
    this.boatGroup = new THREE.Group();
    this.wildlifeGroup = new THREE.Group();
    this.birdGroup = new THREE.Group();
    this.scene.add(this.cityGroup);
    this.scene.add(this.routeGroup);
    this.scene.add(this.beaconGroup);
    this.scene.add(this.vehicleGroup);
    this.scene.add(this.flyingCarGroup);
    this.scene.add(this.trackGroup);
    this.scene.add(this.trainGroup);
    this.scene.add(this.pedestrianGroup);
    this.scene.add(this.camelGroup);
    this.scene.add(this.milkmanGroup);
    this.scene.add(this.cloudGroup);
    this.scene.add(this.boatGroup);
    this.scene.add(this.wildlifeGroup);
    this.scene.add(this.birdGroup);

    this.rebuildClouds();
    this.applyEra(initialProps.era, initialProps.themeVariant, initialProps.lightingMode);
    this.syncEntities(initialProps.entities, true);
    this.syncRoute(initialProps.routePathKeys);
    this.syncIsolatedBeacons(initialProps.isolatedCoords);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.bindEvents();
    this.startLoop();
  }

  private bindEvents(): void {
    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.handlePointerDown);
    dom.addEventListener('pointerup', this.handlePointerUp);
    dom.addEventListener('pointermove', this.handlePointerMove);
    dom.addEventListener('pointerleave', this.handlePointerLeave);
    window.addEventListener('resize', this.handleResize);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  private handleVisibilityChange = (): void => {
    this.pageHidden = document.hidden;
    if (!this.pageHidden) {
      this.clock.getDelta();
    }
  };

  private handleResize = (): void => {
    if (this.disposed) return;
    const w = this.container.clientWidth || window.innerWidth;
    const h = Math.max(1, this.container.clientHeight || window.innerHeight);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  private updateNDC(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickGridCoord(e: PointerEvent): { gx: number; gz: number } | null {
    this.updateNDC(e);
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);
    const hit = this.raycaster.ray.intersectPlane(this.groundPlane, _vec3A);
    if (!hit) return null;
    if (Math.abs(hit.x) > HALF_WORLD || Math.abs(hit.z) > HALF_WORLD) return null;
    return worldToGrid(hit.x, hit.z);
  }

  private handlePointerDown = (e: PointerEvent): void => {
    this.pointerDownPos.x = e.clientX;
    this.pointerDownPos.y = e.clientY;
  };

  private handlePointerUp = (e: PointerEvent): void => {
    if (this.titleMode) return;
    if (e.button !== 0 && e.pointerType !== 'touch') return;
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const tapRadiusSq = e.pointerType === 'touch' ? 120 : 36;
    if (dx * dx + dy * dy > tapRadiusSq) return; // Dragged camera

    const coord = this.pickGridCoord(e);
    if (coord) {
      this.onTileClickCb(coord.gx, coord.gz);
    }
  };

  private handlePointerMove = (e: PointerEvent): void => {
    if (this.titleMode || e.pointerType === 'touch') {
      this.hoverHighlight.visible = false;
      return;
    }
    const now = performance.now();
    if (now - this.lastHoverCheck < 35) return;
    this.lastHoverCheck = now;

    const coord = this.pickGridCoord(e);
    if (!coord) {
      this.hoverHighlight.visible = false;
      this.onTileHoverCb(null);
      return;
    }

    const [wx, wz] = gridToWorld(coord.gx, coord.gz);
    this.hoverHighlight.position.set(wx, 0.03, wz);
    const occupied = this.currentEntities.some((ent) => ent.gx === coord.gx && ent.gz === coord.gz);
    const mat = this.hoverHighlight.material as THREE.MeshBasicMaterial;
    if (this.currentToolMode === 'demolish') {
      mat.color.setHex(occupied ? 0xf43f5e : 0x64748b);
    } else if (this.currentToolMode === 'select' || this.currentToolMode === 'route') {
      mat.color.setHex(0x38bdf8);
    } else {
      mat.color.setHex(occupied ? 0xf59e0b : 0x10b981);
    }
    this.hoverHighlight.visible = true;
    this.onTileHoverCb(coord);
  };

  private handlePointerLeave = (): void => {
    this.hoverHighlight.visible = false;
    this.onTileHoverCb(null);
  };

  public updateProps(props: CityViewportProps): void {
    this.onTileClickCb = props.onTileClick;
    this.onTileHoverCb = props.onTileHover;
    this.titleMode = props.titleMode;
    this.currentToolMode = props.toolMode;

    const nextShowTrains = props.showTrains ?? true;
    if (nextShowTrains !== this.showTrains) {
      this.showTrains = nextShowTrains;
      this.trainGroup.visible = this.showTrains;
    }

    const nextShowFlyingCars = props.showFlyingCars ?? (props.era === 'neo_cyber');
    if (nextShowFlyingCars !== this.showFlyingCars) {
      this.showFlyingCars = nextShowFlyingCars;
      this.rebuildFlyingCars();
    }

    // Gentle grid lines when placing buildings, almost invisible during clean scenic viewing
    const showPlacementGrid =
      !this.titleMode &&
      props.toolMode !== 'select' &&
      props.toolMode !== 'route';
    const gridMats = Array.isArray(this.gridOverlay.material)
      ? this.gridOverlay.material
      : [this.gridOverlay.material];
    for (let i = 0; i < gridMats.length; i += 1) {
      gridMats[i].opacity = showPlacementGrid ? 0.2 : 0.06;
    }

    if (
      props.era !== this.currentEra ||
      props.themeVariant !== this.currentThemeVariant ||
      props.lightingMode !== this.currentLightingMode
    ) {
      this.applyEra(props.era, props.themeVariant, props.lightingMode);
      this.syncEntities(props.entities, true);
    } else if (props.entities !== this.currentEntities) {
      this.syncEntities(props.entities, false);
    }

    this.syncSelection(props.selectedCoord);
    this.syncRoute(props.routePathKeys);
    this.syncIsolatedBeacons(props.isolatedCoords);
  }

  public applyCameraPreset(preset: CameraPreset): void {
    if (preset === 'isometric') {
      this.targetCamPos.set(25, 21, 25);
      this.targetCamLook.set(0, 0, 0);
    } else if (preset === 'street') {
      this.targetCamPos.set(12, 6.5, 16);
      this.targetCamLook.set(0, 1.5, 0);
    } else if (preset === 'topdown') {
      this.targetCamPos.set(0.01, 36, 0.01);
      this.targetCamLook.set(0, 0, 0);
    }
    this.camTransitionActive = true;
  }

  private applyEra(eraId: WorldEra, themeVariant?: string, lightingMode: LightingMode = 'day'): void {
    this.currentEra = eraId;
    this.currentThemeVariant = themeVariant;
    this.currentLightingMode = lightingMode;
    const theme = resolveEraTheme(eraId, themeVariant, lightingMode);
    this.skyUniforms.topColor.value.set(theme.skyTop);
    this.skyUniforms.bottomColor.value.set(theme.skyHorizon);
    this.scene.fog = new THREE.FogExp2(theme.fogColor, theme.fogDensity);
    this.sunLight.color.set(theme.sunColor);
    this.sunLight.intensity = theme.sunIntensity;
    this.hemiLight.color.set(theme.hemiSky);
    this.hemiLight.groundColor.set(theme.hemiGround);
    this.hemiLight.intensity = theme.isNight ? 0.42 : 0.88;
    this.rimLight.color.set(theme.accentHex);
    this.rimLight.intensity = theme.isNight ? 0.48 : 0.42;
    // Key fix: Keep RoomEnvironment IBL soft at Night so mountains/grass never glow bright green against dark sky!
    this.scene.environmentIntensity = theme.isNight ? 0.22 : lightingMode === 'sunset' ? 0.65 : 0.78;
    this.renderer.toneMappingExposure = theme.isNight ? 0.96 : lightingMode === 'sunset' ? 1.04 : 1.06;

    (this.plateauMesh.material as THREE.MeshStandardMaterial).color.set(theme.terrainColor);
    (this.waterMesh.material as THREE.MeshPhysicalMaterial).color.set(theme.waterColor);
    this.cloudGroup.visible = !theme.isNight;
    this.birdGroup.visible = !theme.isNight;
    this.hillGroup.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        ((obj as THREE.Mesh).material as THREE.MeshStandardMaterial).color.set(theme.terrainAccent);
      }
    });
    this.rebuildBoats();
    this.rebuildFlyingCars();
    this.rebuildTrackAndTrain();
    this.rebuildOldEraWildlife();
  }

  private disposeObject(root: THREE.Object3D): void {
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
      }
    });
  }

  private syncEntities(entities: PlacedEntity[], forceFullRebuild: boolean): void {
    this.currentEntities = entities;
    const theme = resolveEraTheme(this.currentEra, this.currentThemeVariant, this.currentLightingMode);

    if (forceFullRebuild) {
      while (this.cityGroup.children.length > 0) {
        const child = this.cityGroup.children[0];
        this.cityGroup.remove(child);
        this.disposeObject(child);
      }
      this.entityCache.clear();
      this.dropAnims = [];
    }

    const entityByCoord: Record<string, PlacedEntity> = {};
    this.roadMap = {};
    const roadKeys: string[] = [];
    let dairyCount = 0;

    for (let i = 0; i < entities.length; i += 1) {
      const e = entities[i];
      const k = coordKey(e.gx, e.gz);
      entityByCoord[k] = e;
      if (e.type === 'road') {
        this.roadMap[k] = e;
        roadKeys.push(k);
      } else if (e.type === 'farm' || e.type === 'milk_shop') {
        dairyCount += 1;
      }
    }

    const nextIds = new Set<string>();
    const activeCache = new Map<
      string,
      { sig: string; group: THREE.Group; handles: AnimatedPartHandles }
    >();

    // Dispose removed entities incrementally
    if (!forceFullRebuild) {
      const keepSet = new Set(entities.map((e) => e.id));
      for (const [id, entry] of this.entityCache.entries()) {
        if (!keepSet.has(id)) {
          this.cityGroup.remove(entry.group);
          this.disposeObject(entry.group);
          this.entityCache.delete(id);
        }
      }
    }

    const rebuiltHandles: AnimatedPartHandles = {
      rotors: [],
      portalRings: [],
      portalCores: [],
      swings: [],
    };

    for (let i = 0; i < entities.length; i += 1) {
      const e = entities[i];
      nextIds.add(e.id);
      const [wx, wz] = gridToWorld(e.gx, e.gz);

      let neighborMask = 0;
      if (e.type === 'road') {
        if (entityByCoord[coordKey(e.gx, e.gz - 1)]) neighborMask |= 1;
        if (entityByCoord[coordKey(e.gx, e.gz + 1)]) neighborMask |= 2;
        if (entityByCoord[coordKey(e.gx + 1, e.gz)]) neighborMask |= 4;
        if (entityByCoord[coordKey(e.gx - 1, e.gz)]) neighborMask |= 8;
      }
      const sig = `${e.type}:${e.level}:${e.rotation}:${neighborMask}`;
      const existingCached = !forceFullRebuild ? this.entityCache.get(e.id) : undefined;

      if (existingCached && existingCached.sig === sig) {
        activeCache.set(e.id, existingCached);
        rebuiltHandles.rotors.push(...existingCached.handles.rotors);
        rebuiltHandles.portalRings.push(...existingCached.handles.portalRings);
        rebuiltHandles.portalCores.push(...existingCached.handles.portalCores);
        rebuiltHandles.swings.push(...existingCached.handles.swings);
        continue;
      }

      if (existingCached) {
        this.cityGroup.remove(existingCached.group);
        this.disposeObject(existingCached.group);
      }

      const localHandles: AnimatedPartHandles = {
        rotors: [],
        portalRings: [],
        portalCores: [],
        swings: [],
      };
      let meshGroup: THREE.Group;
      if (e.type === 'road') {
        const neighbors: RoadNeighbors = {
          north: (neighborMask & 1) !== 0,
          south: (neighborMask & 2) !== 0,
          east: (neighborMask & 4) !== 0,
          west: (neighborMask & 8) !== 0,
        };
        meshGroup = createRoadMesh(neighbors, theme, this.textures);
      } else {
        meshGroup = createBuildingGroup(e.type, theme, this.textures, localHandles);
        meshGroup.rotation.y = (e.rotation * Math.PI) / 2;
      }

      const targetY = e.type === 'road' ? 1 : 1 + (e.level - 1) * 0.22;
      meshGroup.position.set(wx, 0, wz);
      if (!forceFullRebuild && !this.knownEntityIds.has(e.id)) {
        meshGroup.scale.set(1, 0.08, 1);
        this.dropAnims.push({ group: meshGroup, t: 0, targetY });
      } else {
        meshGroup.scale.set(1, targetY, 1);
      }

      this.cityGroup.add(meshGroup);
      activeCache.set(e.id, { sig, group: meshGroup, handles: localHandles });
      rebuiltHandles.rotors.push(...localHandles.rotors);
      rebuiltHandles.portalRings.push(...localHandles.portalRings);
      rebuiltHandles.portalCores.push(...localHandles.portalCores);
      rebuiltHandles.swings.push(...localHandles.swings);
    }

    this.entityCache = activeCache;
    this.animHandles = rebuiltHandles;
    this.knownEntityIds = nextIds;

    roadKeys.sort();
    const roadSig = roadKeys.join('|');
    if (forceFullRebuild || roadSig !== this.lastRoadSig) {
      this.lastRoadSig = roadSig;
      this.lastDairyCount = dairyCount;
      this.rebuildVehicles();
      this.rebuildPedestrians();
      this.rebuildCamels();
      this.rebuildMilkmen();
    } else if (dairyCount !== this.lastDairyCount) {
      this.lastDairyCount = dairyCount;
      this.rebuildMilkmen();
    }
  }

  private rebuildVehicles(): void {
    while (this.vehicleGroup.children.length > 0) {
      const c = this.vehicleGroup.children[0];
      this.vehicleGroup.remove(c);
      this.disposeObject(c);
    }
    this.vehicles = [];

    const roadList = Object.values(this.roadMap);
    if (roadList.length < 2) return;

    const maxCars = Math.min(7, Math.floor(roadList.length / 3));
    const colors =
      this.currentEra === 'prime_classical'
        ? [0x991b1b, 0x166534, 0x1e3a8a, 0x92400e, 0x78350f, 0xb45309]
        : [0x38bdf8, 0xf59e0b, 0x10b981, 0xf43f5e, 0xe2e8f0, 0xa855f7];

    for (let i = 0; i < maxCars; i += 1) {
      const startRoad = roadList[(i * 5) % roadList.length];
      const next = this.pickNextRoadNeighbor(startRoad.gx, startRoad.gz, null);
      if (!next) continue;
      const car = createVehicleGroup(colors[i % colors.length], this.currentEra);
      this.vehicleGroup.add(car);
      this.vehicles.push({
        mesh: car,
        from: { gx: startRoad.gx, gz: startRoad.gz },
        to: next,
        progress: (i * 0.27) % 1,
        speed: this.currentEra === 'prime_classical' ? 0.42 + (i % 3) * 0.08 : 0.72 + (i % 3) * 0.18,
      });
    }
  }

  private rebuildFlyingCars(): void {
    while (this.flyingCarGroup.children.length > 0) {
      const c = this.flyingCarGroup.children[0];
      this.flyingCarGroup.remove(c);
      this.disposeObject(c);
    }
    this.flyingCars = [];

    if (!this.showFlyingCars) return;

    const colors = [0x38bdf8, 0xe2e8f0, 0xa855f7, 0x22d3ee, 0xf59e0b, 0x818cf8];
    const laneConfigs = [
      { rx: 10.5, rz: 7.5, alt: 4.8, speed: 0.48, cx: 0, cz: 0 },
      { rx: 12.5, rz: 12.0, alt: 6.2, speed: -0.36, cx: 0.5, cz: -0.5 },
      { rx: 7.2, rz: 11.5, alt: 7.5, speed: 0.52, cx: -1, cz: 1 },
      { rx: 14.0, rz: 9.0, alt: 5.4, speed: -0.44, cx: 0, cz: 0 },
      { rx: 8.5, rz: 8.5, alt: 8.4, speed: 0.39, cx: 1.5, cz: -1 },
    ];

    for (let i = 0; i < 10; i += 1) {
      const lane = laneConfigs[i % laneConfigs.length];
      const car = createFlyingCarGroup(colors[i % colors.length]);
      this.flyingCarGroup.add(car);
      this.flyingCars.push({
        mesh: car,
        radiusX: lane.rx + (i % 2) * 1.1,
        radiusZ: lane.rz + ((i + 1) % 2) * 1.1,
        altitude: lane.alt + (i % 3) * 0.45,
        angle: (i / 10) * Math.PI * 2,
        speed: lane.speed,
        centerX: lane.cx,
        centerZ: lane.cz,
      });
    }
  }

  private rebuildTrackAndTrain(): void {
    while (this.trackGroup.children.length > 0) {
      const c = this.trackGroup.children[0];
      this.trackGroup.remove(c);
      this.disposeObject(c);
    }
    while (this.trainGroup.children.length > 0) {
      const c = this.trainGroup.children[0];
      this.trainGroup.remove(c);
      this.disposeObject(c);
    }
    this.trainCars = [];

    const isOld = this.currentEra === 'prime_classical';
    const trackY = isOld ? 0.06 : 0.72;
    this.trainTrackY = trackY;

    // Rounded-square scenic perimeter track cleanly outside the 16x16 grid (x, z in [-16, 16])
    const half = 17.2;
    const rad = 3.2;
    const loopPts: THREE.Vector3[] = [];
    const corners: Array<{ cx: number; cz: number; startAngle: number }> = [
      { cx: half - rad, cz: half - rad, startAngle: 0 },
      { cx: -half + rad, cz: half - rad, startAngle: Math.PI / 2 },
      { cx: -half + rad, cz: -half + rad, startAngle: Math.PI },
      { cx: half - rad, cz: -half + rad, startAngle: (3 * Math.PI) / 2 },
    ];
    for (let c = 0; c < corners.length; c += 1) {
      const { cx, cz, startAngle } = corners[c];
      for (let s = 0; s <= 5; s += 1) {
        const a = startAngle + (s / 5) * (Math.PI / 2);
        loopPts.push(new THREE.Vector3(cx + Math.cos(a) * rad, trackY, cz + Math.sin(a) * rad));
      }
    }

    this.trainCurve = new THREE.CatmullRomCurve3(loopPts, true, 'catmullrom', 0.15);

    if (isOld) {
      // Gravel ballast bed + Twin Iron Rails + Instanced Wooden Ties
      const bedMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.95 });
      const bedMesh = new THREE.Mesh(
        new THREE.TubeGeometry(this.trainCurve, 128, 0.32, 6, true),
        bedMat,
      );
      bedMesh.scale.y = 0.25;
      bedMesh.position.y = -0.02;
      bedMesh.receiveShadow = true;
      this.trackGroup.add(bedMesh);

      const leftPts: THREE.Vector3[] = [];
      const rightPts: THREE.Vector3[] = [];
      const steps = 96;
      for (let i = 0; i < steps; i += 1) {
        const u = i / steps;
        const pt = this.trainCurve.getPointAt(u);
        const tan = this.trainCurve.getTangentAt(u).normalize();
        const nx = -tan.z;
        const nz = tan.x;
        leftPts.push(new THREE.Vector3(pt.x + nx * 0.19, trackY + 0.03, pt.z + nz * 0.19));
        rightPts.push(new THREE.Vector3(pt.x - nx * 0.19, trackY + 0.03, pt.z - nz * 0.19));
      }
      const railMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.38, metalness: 0.8 });
      const leftRail = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(leftPts, true), 120, 0.032, 5, true),
        railMat,
      );
      const rightRail = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rightPts, true), 120, 0.032, 5, true),
        railMat,
      );
      this.trackGroup.add(leftRail, rightRail);

      // Wooden rail ties
      const tieCount = 132;
      const tieGeo = new THREE.BoxGeometry(0.62, 0.04, 0.12);
      const tieMat = new THREE.MeshStandardMaterial({ color: 0x5c3419, roughness: 0.9 });
      const ties = new THREE.InstancedMesh(tieGeo, tieMat, tieCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < tieCount; i += 1) {
        const u = i / tieCount;
        const pt = this.trainCurve.getPointAt(u);
        const tan = this.trainCurve.getTangentAt(u);
        dummy.position.set(pt.x, trackY + 0.005, pt.z);
        dummy.rotation.set(0, Math.atan2(tan.x, tan.z), 0);
        dummy.updateMatrix();
        ties.setMatrixAt(i, dummy.matrix);
      }
      ties.instanceMatrix.needsUpdate = true;
      this.trackGroup.add(ties);
    } else {
      // Sleek Elevated Maglev / Monorail Beam & Glowing Energy Track + Pillars
      const beamMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.35,
        metalness: 0.78,
      });
      const beam = new THREE.Mesh(
        new THREE.TubeGeometry(this.trainCurve, 128, 0.24, 6, true),
        beamMat,
      );
      beam.scale.y = 0.52;
      beam.castShadow = true;
      this.trackGroup.add(beam);

      const guidePts: THREE.Vector3[] = [];
      for (let i = 0; i < 80; i += 1) {
        const p = this.trainCurve.getPointAt(i / 80);
        guidePts.push(new THREE.Vector3(p.x, trackY + 0.12, p.z));
      }
      const glowMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x0ea5e9),
        emissiveIntensity: 1.5,
      });
      const guideStrip = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(guidePts, true), 120, 0.055, 5, true),
        glowMat,
      );
      this.trackGroup.add(guideStrip);

      // 28 Elevated Guideway Support Pillars
      const pillarCount = 28;
      const pillarGeo = new THREE.CylinderGeometry(0.11, 0.16, trackY, 8);
      const pillars = new THREE.InstancedMesh(pillarGeo, beamMat, pillarCount);
      const dummy = new THREE.Object3D();
      for (let i = 0; i < pillarCount; i += 1) {
        const pt = this.trainCurve.getPointAt(i / pillarCount);
        dummy.position.set(pt.x, trackY / 2, pt.z);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        pillars.setMatrixAt(i, dummy.matrix);
      }
      pillars.instanceMatrix.needsUpdate = true;
      this.trackGroup.add(pillars);
    }

    // Build 4-car consist (1 Engine + 3 Coaches)
    const roles: Array<'engine' | 'coach'> = ['engine', 'coach', 'coach', 'coach'];
    for (let i = 0; i < roles.length; i += 1) {
      const car = createTrainCarGroup(roles[i], this.currentEra);
      this.trainGroup.add(car);
      this.trainCars.push({
        mesh: car,
        offset: -i * 0.0112,
      });
    }
    this.trainGroup.visible = this.showTrains;
  }

  private rebuildPedestrians(): void {
    while (this.pedestrianGroup.children.length > 0) {
      const c = this.pedestrianGroup.children[0];
      this.pedestrianGroup.remove(c);
      this.disposeObject(c);
    }
    this.pedestrians = [];

    const roadList = Object.values(this.roadMap);
    if (roadList.length < 2) return;

    const isOld = this.currentEra === 'prime_classical';
    const outfitPalette = isOld
      ? [0xd97706, 0x991b1b, 0x0f766e, 0x7c2d12, 0x4338ca, 0x15803d]
      : [0x38bdf8, 0xec4899, 0xa855f7, 0x22c55e, 0xf59e0b, 0xe2e8f0];

    const count = Math.min(22, Math.max(8, roadList.length));
    for (let i = 0; i < count; i += 1) {
      const startRoad = roadList[(i * 3) % roadList.length];
      const next = this.pickNextRoadNeighbor(startRoad.gx, startRoad.gz, null);
      if (!next) continue;

      const person = createPedestrianGroup(outfitPalette[i % outfitPalette.length], isOld);
      this.pedestrianGroup.add(person);
      this.pedestrians.push({
        mesh: person,
        from: { gx: startRoad.gx, gz: startRoad.gz },
        to: next,
        progress: (i * 0.19) % 1,
        speed: 0.24 + (i % 4) * 0.045,
        lateralOffset: i % 2 === 0 ? 0.56 : -0.56,
        phase: i * 1.1,
      });
    }
  }

  private rebuildCamels(): void {
    while (this.camelGroup.children.length > 0) {
      const c = this.camelGroup.children[0];
      this.camelGroup.remove(c);
      this.disposeObject(c);
    }
    this.camels = [];

    const roadList = Object.values(this.roadMap);
    if (roadList.length < 2) return;

    const isHistoricOrDesert = this.currentEra === 'prime_classical' || this.currentEra === 'solar_frontier';
    if (!isHistoricOrDesert) return;

    const count =
      this.currentEra === 'prime_classical'
        ? Math.min(7, Math.max(4, Math.floor(roadList.length / 4)))
        : Math.min(5, Math.max(2, Math.floor(roadList.length / 6)));
    for (let i = 0; i < count; i += 1) {
      const startRoad = roadList[(i * 7 + 1) % roadList.length];
      const next = this.pickNextRoadNeighbor(startRoad.gx, startRoad.gz, null);
      if (!next) continue;
      const camel = createCamelGroup();
      this.camelGroup.add(camel);
      this.camels.push({
        mesh: camel,
        from: { gx: startRoad.gx, gz: startRoad.gz },
        to: next,
        progress: (i * 0.31) % 1,
        speed: 0.22 + (i % 2) * 0.04,
        lateralOffset: i % 2 === 0 ? 0.34 : -0.34,
        phase: i * 1.7,
      });
    }
  }

  private rebuildMilkmen(): void {
    while (this.milkmanGroup.children.length > 0) {
      const c = this.milkmanGroup.children[0];
      this.milkmanGroup.remove(c);
      this.disposeObject(c);
    }
    this.milkmen = [];

    const roadList = Object.values(this.roadMap);
    if (roadList.length < 2) return;
    const dairyCount = this.currentEntities.filter((e) => e.type === 'farm' || e.type === 'milk_shop').length;
    if (dairyCount === 0) return;

    const count = Math.min(6, Math.max(2, dairyCount * 2));
    for (let i = 0; i < count; i += 1) {
      const startRoad = roadList[(i * 4 + 2) % roadList.length];
      const next = this.pickNextRoadNeighbor(startRoad.gx, startRoad.gz, null);
      if (!next) continue;
      const milkman = createMilkmanGroup();
      this.milkmanGroup.add(milkman);
      this.milkmen.push({
        mesh: milkman,
        from: { gx: startRoad.gx, gz: startRoad.gz },
        to: next,
        progress: (i * 0.23) % 1,
        speed: 0.31 + (i % 3) * 0.04,
        lateralOffset: i % 2 === 0 ? -0.48 : 0.48,
        phase: i * 0.9,
      });
    }
  }

  private rebuildClouds(): void {
    while (this.cloudGroup.children.length > 0) {
      const c = this.cloudGroup.children[0];
      this.cloudGroup.remove(c);
      this.disposeObject(c);
    }
    this.clouds = [];
    for (let i = 0; i < 8; i += 1) {
      const cluster = createCloudClusterGroup();
      const scale = 0.8 + (i % 3) * 0.35;
      cluster.scale.setScalar(scale);
      this.cloudGroup.add(cluster);
      this.clouds.push({
        mesh: cluster,
        angle: (i / 8) * Math.PI * 2,
        radius: 30 + (i % 3) * 10,
        height: 16 + (i % 4) * 2.2,
        speed: 0.015 + (i % 3) * 0.006,
      });
    }
  }

  private rebuildBoats(): void {
    while (this.boatGroup.children.length > 0) {
      const c = this.boatGroup.children[0];
      this.boatGroup.remove(c);
      this.disposeObject(c);
    }
    this.boats = [];
    const isOld = this.currentEra === 'prime_classical' || this.currentEra === 'solar_frontier';
    for (let i = 0; i < 5; i += 1) {
      const boat = createSailboatGroup(isOld);
      this.boatGroup.add(boat);
      this.boats.push({
        mesh: boat,
        angle: (i / 5) * Math.PI * 2,
        radius: 34 + (i % 2) * 5.5,
        speed: (i % 2 === 0 ? 1 : -1) * (0.045 + (i % 3) * 0.012),
        phase: i * 1.4,
      });
    }
  }

  private rebuildOldEraWildlife(): void {
    while (this.wildlifeGroup.children.length > 0) {
      const c = this.wildlifeGroup.children[0];
      this.wildlifeGroup.remove(c);
      this.disposeObject(c);
    }
    while (this.birdGroup.children.length > 0) {
      const c = this.birdGroup.children[0];
      this.birdGroup.remove(c);
      this.disposeObject(c);
    }
    this.wildlife = [];
    this.birds = [];

    if (this.currentEra === 'prime_classical') {
      // 4 Lush Cardinal Meadow Pastures cleanly outside train track (half=17.2) & inside island cliff (rad=24.6)
      const meadows: Array<{ cx: number; cz: number; rx: number; rz: number }> = [
        { cx: 0, cz: 20.1, rx: 7.4, rz: 1.55 },
        { cx: 20.1, cz: 0, rx: 1.55, rz: 7.4 },
        { cx: 0, cz: -20.1, rx: 7.4, rz: 1.55 },
        { cx: -20.1, cz: 0, rx: 1.55, rz: 7.4 },
      ];

      type HerdSpec = {
        kind: 'cow' | 'sheep' | 'goat' | 'horse' | 'deer';
        meadowIdx: number;
        angle: number;
        speed: number;
        scale: number;
        tint?: number;
      };

      const herd: HerdSpec[] = [
        // Grazing Dairy Cows
        { kind: 'cow', meadowIdx: 0, angle: 0.35, speed: 0.085, scale: 1.32, tint: 0x1e293b },
        { kind: 'cow', meadowIdx: 0, angle: 1.85, speed: 0.078, scale: 1.24, tint: 0x5c3419 },
        { kind: 'cow', meadowIdx: 3, angle: 0.9, speed: -0.08, scale: 1.30, tint: 0x1e293b },
        { kind: 'cow', meadowIdx: 3, angle: 3.1, speed: 0.082, scale: 1.22, tint: 0x78350f },
        { kind: 'cow', meadowIdx: 1, angle: 2.2, speed: -0.075, scale: 1.28, tint: 0x1e293b },
        // Woolly Sheep Flocks
        { kind: 'sheep', meadowIdx: 1, angle: 0.4, speed: 0.105, scale: 1.22 },
        { kind: 'sheep', meadowIdx: 1, angle: 0.95, speed: 0.098, scale: 1.15 },
        { kind: 'sheep', meadowIdx: 1, angle: 4.1, speed: -0.10, scale: 1.20 },
        { kind: 'sheep', meadowIdx: 0, angle: 3.7, speed: -0.102, scale: 1.18 },
        { kind: 'sheep', meadowIdx: 2, angle: 1.2, speed: 0.095, scale: 1.24 },
        { kind: 'sheep', meadowIdx: 2, angle: 1.75, speed: 0.09, scale: 1.14 },
        // Nimble Country Goats
        { kind: 'goat', meadowIdx: 0, angle: 5.1, speed: 0.135, scale: 1.20, tint: 0xd6b07c },
        { kind: 'goat', meadowIdx: 1, angle: 5.4, speed: -0.13, scale: 1.16, tint: 0xf1f5f9 },
        { kind: 'goat', meadowIdx: 3, angle: 4.6, speed: 0.128, scale: 1.22, tint: 0x8c6239 },
        { kind: 'goat', meadowIdx: 2, angle: 4.9, speed: -0.132, scale: 1.18, tint: 0xd6b07c },
        // Trotting Wild & Riding Horses
        { kind: 'horse', meadowIdx: 2, angle: 0.25, speed: 0.175, scale: 1.36, tint: 0x6e3d1e },
        { kind: 'horse', meadowIdx: 2, angle: 3.4, speed: -0.165, scale: 1.30, tint: 0x2b211b },
        { kind: 'horse', meadowIdx: 3, angle: 2.0, speed: 0.168, scale: 1.34, tint: 0x9c6434 },
        { kind: 'horse', meadowIdx: 0, angle: 2.8, speed: -0.16, scale: 1.32, tint: 0x4a2c18 },
        // Graceful Forest Deer & Stags
        { kind: 'deer', meadowIdx: 2, angle: 5.8, speed: 0.15, scale: 1.32, tint: 1 },
        { kind: 'deer', meadowIdx: 1, angle: 3.1, speed: 0.145, scale: 1.22, tint: 0 },
        { kind: 'deer', meadowIdx: 3, angle: 5.5, speed: -0.148, scale: 1.30, tint: 1 },
      ];

      for (let i = 0; i < herd.length; i += 1) {
        const spec = herd[i];
        const m = meadows[spec.meadowIdx];
        let mesh: THREE.Group;
        if (spec.kind === 'cow') mesh = createCowGroup(spec.tint ?? 0x1e293b);
        else if (spec.kind === 'sheep') mesh = createSheepGroup();
        else if (spec.kind === 'goat') mesh = createGoatGroup(spec.tint ?? 0xd6b07c);
        else if (spec.kind === 'horse') mesh = createHorseGroup(spec.tint ?? 0x6e3d1e);
        else mesh = createDeerGroup((spec.tint ?? 1) > 0);

        mesh.scale.setScalar(spec.scale);
        this.wildlifeGroup.add(mesh);
        this.wildlife.push({
          mesh,
          centerX: m.cx,
          centerZ: m.cz,
          radiusX: m.rx,
          radiusZ: m.rz,
          angle: spec.angle,
          speed: spec.speed,
          phase: i * 1.15,
          bobAmp: spec.kind === 'horse' || spec.kind === 'deer' ? 0.025 : 0.01,
        });
      }

      // 8 Soaring Old Era Birds wheeling gracefully across the kingdom sky
      const birdColors = [0xf1f5f9, 0xd6d3d1, 0xe2e8f0, 0xcbd5e1];
      for (let i = 0; i < 8; i += 1) {
        const bird = createBirdGroup(birdColors[i % birdColors.length]);
        const bScale = 1.0 + (i % 3) * 0.18;
        bird.scale.setScalar(bScale);
        this.birdGroup.add(bird);
        this.birds.push({
          mesh: bird,
          radius: 11.5 + (i % 4) * 3.4,
          altitude: 9.8 + (i % 4) * 1.35,
          angle: (i / 8) * Math.PI * 2,
          speed: (i % 2 === 0 ? 1 : -1) * (0.24 + (i % 3) * 0.045),
          phase: i * 1.6,
        });
      }
    } else if (this.currentEra === 'eco_arcology') {
      // Gentle Eco-Park Birds above Verdant Arcologies
      for (let i = 0; i < 4; i += 1) {
        const bird = createBirdGroup(0xf1f5f9);
        this.birdGroup.add(bird);
        this.birds.push({
          mesh: bird,
          radius: 13 + (i % 2) * 4,
          altitude: 11 + (i % 3) * 1.2,
          angle: (i / 4) * Math.PI * 2,
          speed: 0.22 + i * 0.03,
          phase: i * 1.9,
        });
      }
    }
  }

  private pickNextRoadNeighbor(
    gx: number,
    gz: number,
    avoid: { gx: number; gz: number } | null,
  ): { gx: number; gz: number } | null {
    const dirs: Array<[number, number]> = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    const candidates: Array<{ gx: number; gz: number }> = [];
    for (let i = 0; i < dirs.length; i += 1) {
      const nx = gx + dirs[i][0];
      const nz = gz + dirs[i][1];
      if (this.roadMap[coordKey(nx, nz)]) {
        candidates.push({ gx: nx, gz: nz });
      }
    }
    if (candidates.length === 0) return null;
    if (candidates.length > 1 && avoid) {
      const filtered = candidates.filter((c) => c.gx !== avoid.gx || c.gz !== avoid.gz);
      if (filtered.length > 0) {
        return filtered[Math.floor(Math.random() * filtered.length)];
      }
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  private syncSelection(selected: { gx: number; gz: number } | null): void {
    if (!selected) {
      this.selectHighlight.visible = false;
      return;
    }
    const [wx, wz] = gridToWorld(selected.gx, selected.gz);
    this.selectHighlight.position.set(wx, 0.05, wz);
    this.selectHighlight.visible = true;
  }

  private syncRoute(pathKeys: string[]): void {
    while (this.routeGroup.children.length > 0) {
      const c = this.routeGroup.children[0];
      this.routeGroup.remove(c);
      this.disposeObject(c);
    }
    if (pathKeys.length < 2) return;

    const points: THREE.Vector3[] = [];
    for (let i = 0; i < pathKeys.length; i += 1) {
      const [gxStr, gzStr] = pathKeys[i].split(',');
      const [wx, wz] = gridToWorld(Number(gxStr), Number(gzStr));
      points.push(new THREE.Vector3(wx, 0.28, wz));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const tubeGeo = new THREE.TubeGeometry(curve, Math.max(12, pathKeys.length * 6), 0.14, 8, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x0ea5e9),
      emissiveIntensity: 1.5,
      roughness: 0.2,
    });
    this.routeGroup.add(new THREE.Mesh(tubeGeo, tubeMat));
  }

  private syncIsolatedBeacons(_coords: Array<{ gx: number; gz: number }>): void {
    while (this.beaconGroup.children.length > 0) {
      const c = this.beaconGroup.children[0];
      this.beaconGroup.remove(c);
      this.disposeObject(c);
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (!gl || typeof gl.fenceSync !== 'function') {
      this.frameId = window.setTimeout(cb, 80);
      return;
    }
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private startLoop(): void {
    const tick = () => {
      if (this.disposed) return;

      if (this.pageHidden) {
        this.frameId = requestAnimationFrame(tick);
        return;
      }

      const rawDt = this.clock.getDelta();
      const dt = Math.min(rawDt, 0.05);
      const elapsed = this.clock.elapsedTime;

      // Adaptive resolution governor: if mobile/device sustains < 28fps, gently step DPR down to 1.0
      if (!this.isSoftwareGl && !this.minDprApplied) {
        if (rawDt > 0.036 && rawDt < 0.25) {
          this.slowFrameCount += 1;
          if (this.slowFrameCount > 45 && this.renderer.getPixelRatio() > 1) {
            this.renderer.setPixelRatio(1);
            this.renderer.setSize(
              this.container.clientWidth || window.innerWidth,
              Math.max(1, this.container.clientHeight || window.innerHeight),
            );
            this.minDprApplied = true;
          }
        } else {
          this.slowFrameCount = Math.max(0, this.slowFrameCount - 1);
        }
      }

      // Title screen slow cinematic orbit
      if (this.titleMode) {
        const angle = elapsed * 0.14;
        this.camera.position.set(Math.cos(angle) * 28, 18.5, Math.sin(angle) * 28);
        this.camera.lookAt(0, 1.2, 0);
      } else {
        if (this.camTransitionActive) {
          this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.targetCamPos.x, 5.5, dt);
          this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.targetCamPos.y, 5.5, dt);
          this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.targetCamPos.z, 5.5, dt);
          this.controls.target.x = THREE.MathUtils.damp(this.controls.target.x, this.targetCamLook.x, 5.5, dt);
          this.controls.target.y = THREE.MathUtils.damp(this.controls.target.y, this.targetCamLook.y, 5.5, dt);
          this.controls.target.z = THREE.MathUtils.damp(this.controls.target.z, this.targetCamLook.z, 5.5, dt);
          if (this.camera.position.distanceTo(this.targetCamPos) < 0.08) {
            this.camTransitionActive = false;
          }
        }
        this.controls.update();
      }

      // Wind turbines & Portal Nexus animation
      for (let i = 0; i < this.animHandles.rotors.length; i += 1) {
        this.animHandles.rotors[i].rotation.z -= dt * 2.4;
      }
      for (let i = 0; i < this.animHandles.portalRings.length; i += 1) {
        const dir = i % 2 === 0 ? 1 : -1;
        this.animHandles.portalRings[i].rotation.y += dt * 0.9 * dir;
      }
      for (let i = 0; i < this.animHandles.portalCores.length; i += 1) {
        this.animHandles.portalCores[i].rotation.y += dt * 1.4;
      }
      for (let i = 0; i < this.animHandles.swings.length; i += 1) {
        this.animHandles.swings[i].rotation.x = Math.sin(elapsed * 2.5 + i * 1.15) * 0.38;
      }

      // Isolated warning beacons gentle bob
      for (let i = 0; i < this.beaconGroup.children.length; i += 1) {
        const b = this.beaconGroup.children[i];
        b.rotation.y += dt * 1.6;
        b.position.y = 3.55 + Math.sin(elapsed * 3.0 + i) * 0.16;
      }

      // Building placement spring pop-in
      for (let i = this.dropAnims.length - 1; i >= 0; i -= 1) {
        const anim = this.dropAnims[i];
        anim.t = Math.min(1, anim.t + dt * 4.5);
        const s = (1 - Math.pow(1 - anim.t, 3)) * anim.targetY;
        anim.group.scale.set(1, Math.max(0.08, s), 1);
        if (anim.t >= 1) {
          anim.group.scale.set(1, anim.targetY, 1);
          this.dropAnims.splice(i, 1);
        }
      }

      // Road traffic vehicles (Carriages in Old Era, Hover-Pods in New Era)
      for (let i = 0; i < this.vehicles.length; i += 1) {
        const v = this.vehicles[i];
        v.progress += dt * v.speed;
        if (v.progress >= 1) {
          v.progress = 0;
          const prevFrom = v.from;
          v.from = v.to;
          const next = this.pickNextRoadNeighbor(v.from.gx, v.from.gz, prevFrom);
          v.to = next || prevFrom;
        }
        const [fx, fz] = gridToWorld(v.from.gx, v.from.gz);
        const [tx, tz] = gridToWorld(v.to.gx, v.to.gz);
        const yOff =
          this.currentEra === 'neo_cyber'
            ? 0.14 + Math.sin(elapsed * 3.5 + i) * 0.03
            : this.currentEra === 'prime_classical'
              ? 0.065 + Math.abs(Math.sin(elapsed * 7 + i)) * 0.02
              : 0.07;
        _vec3A.set(fx, yOff, fz);
        _vec3B.set(tx, yOff, tz);
        v.mesh.position.lerpVectors(_vec3A, _vec3B, v.progress);
        v.mesh.lookAt(_vec3B);
      }

      // Aerial Flying Cars cruising along sky corridors
      for (let i = 0; i < this.flyingCars.length; i += 1) {
        const fc = this.flyingCars[i];
        fc.angle += dt * fc.speed;
        const nx = fc.centerX + Math.cos(fc.angle) * fc.radiusX;
        const nz = fc.centerZ + Math.sin(fc.angle) * fc.radiusZ;
        const ny = fc.altitude + Math.sin(elapsed * 2.2 + i) * 0.22;

        const lookAngle = fc.angle + (fc.speed >= 0 ? 0.08 : -0.08);
        const lx = fc.centerX + Math.cos(lookAngle) * fc.radiusX;
        const lz = fc.centerZ + Math.sin(lookAngle) * fc.radiusZ;

        fc.mesh.position.set(nx, ny, nz);
        _vec3B.set(lx, ny, lz);
        fc.mesh.lookAt(_vec3B);
      }

      // Perimeter Train Loop (Steam Locomotive in Old Era, Maglev Bullet Train in New Era)
      if (this.showTrains && this.trainCurve && this.trainCars.length > 0) {
        const trainSpeed = this.currentEra === 'neo_cyber' ? 0.036 : 0.022;
        this.trainProgress = (this.trainProgress + dt * trainSpeed) % 1;
        const trainY = this.trainTrackY + 0.03;
        for (let i = 0; i < this.trainCars.length; i += 1) {
          const tc = this.trainCars[i];
          const u = ((this.trainProgress + tc.offset) % 1 + 1) % 1;
          const lookU = (u + 0.006) % 1;
          const pt = this.trainCurve.getPointAt(u);
          const lookPt = this.trainCurve.getPointAt(lookU);
          tc.mesh.position.set(pt.x, trainY, pt.z);
          _vec3B.set(lookPt.x, trainY, lookPt.z);
          tc.mesh.lookAt(_vec3B);
        }
      }

      // Walking Citizens ("Log") strolling along sidewalks in both worlds
      for (let i = 0; i < this.pedestrians.length; i += 1) {
        const p = this.pedestrians[i];
        p.progress += dt * p.speed;
        if (p.progress >= 1) {
          p.progress = 0;
          const prevFrom = p.from;
          p.from = p.to;
          const next = this.pickNextRoadNeighbor(p.from.gx, p.from.gz, prevFrom);
          p.to = next || prevFrom;
        }
        const [fx, fz] = gridToWorld(p.from.gx, p.from.gz);
        const [tx, tz] = gridToWorld(p.to.gx, p.to.gz);
        const dx = tx - fx;
        const dz = tz - fz;
        const len = Math.hypot(dx, dz) || 1;
        const nx = (-dz / len) * p.lateralOffset;
        const nz = (dx / len) * p.lateralOffset;

        _vec3A.set(fx + nx, 0.04, fz + nz);
        _vec3B.set(tx + nx, 0.04, tz + nz);
        p.mesh.position.lerpVectors(_vec3A, _vec3B, p.progress);
        p.mesh.lookAt(_vec3B);

        const stride = Math.sin(elapsed * 8.5 + p.phase) * 0.45;
        if (p.mesh.children[0]) p.mesh.children[0].rotation.x = stride;
        if (p.mesh.children[1]) p.mesh.children[1].rotation.x = -stride;
      }

      // Walking Camels strolling along Old Era & Oasis roads (4 articulated legs)
      for (let i = 0; i < this.camels.length; i += 1) {
        const cm = this.camels[i];
        cm.progress += dt * cm.speed;
        if (cm.progress >= 1) {
          cm.progress = 0;
          const prevFrom = cm.from;
          cm.from = cm.to;
          const next = this.pickNextRoadNeighbor(cm.from.gx, cm.from.gz, prevFrom);
          cm.to = next || prevFrom;
        }
        const [fx, fz] = gridToWorld(cm.from.gx, cm.from.gz);
        const [tx, tz] = gridToWorld(cm.to.gx, cm.to.gz);
        const dx = tx - fx;
        const dz = tz - fz;
        const len = Math.hypot(dx, dz) || 1;
        const nx = (-dz / len) * cm.lateralOffset;
        const nz = (dx / len) * cm.lateralOffset;

        _vec3A.set(fx + nx, 0.04, fz + nz);
        _vec3B.set(tx + nx, 0.04, tz + nz);
        cm.mesh.position.lerpVectors(_vec3A, _vec3B, cm.progress);
        cm.mesh.lookAt(_vec3B);

        const stride = Math.sin(elapsed * 6.5 + cm.phase) * 0.35;
        if (cm.mesh.children[0]) cm.mesh.children[0].rotation.x = stride;
        if (cm.mesh.children[1]) cm.mesh.children[1].rotation.x = -stride;
        if (cm.mesh.children[2]) cm.mesh.children[2].rotation.x = -stride;
        if (cm.mesh.children[3]) cm.mesh.children[3].rotation.x = stride;
      }

      // Walking Milkmen carrying silver Milk Cans from Farms to Milk Shops
      for (let i = 0; i < this.milkmen.length; i += 1) {
        const mm = this.milkmen[i];
        mm.progress += dt * mm.speed;
        if (mm.progress >= 1) {
          mm.progress = 0;
          const prevFrom = mm.from;
          mm.from = mm.to;
          const next = this.pickNextRoadNeighbor(mm.from.gx, mm.from.gz, prevFrom);
          mm.to = next || prevFrom;
        }
        const [fx, fz] = gridToWorld(mm.from.gx, mm.from.gz);
        const [tx, tz] = gridToWorld(mm.to.gx, mm.to.gz);
        const dx = tx - fx;
        const dz = tz - fz;
        const len = Math.hypot(dx, dz) || 1;
        const nx = (-dz / len) * mm.lateralOffset;
        const nz = (dx / len) * mm.lateralOffset;

        _vec3A.set(fx + nx, 0.04, fz + nz);
        _vec3B.set(tx + nx, 0.04, tz + nz);
        mm.mesh.position.lerpVectors(_vec3A, _vec3B, mm.progress);
        mm.mesh.lookAt(_vec3B);

        const stride = Math.sin(elapsed * 9.5 + mm.phase) * 0.48;
        if (mm.mesh.children[0]) mm.mesh.children[0].rotation.x = stride;
        if (mm.mesh.children[1]) mm.mesh.children[1].rotation.x = -stride;
      }

      // Animate Ocean Water Ripples + Drifting Clouds + Gliding Sailboats
      this.textures.waterRipple.offset.x = (elapsed * 0.014) % 1;
      this.textures.waterRipple.offset.y = (elapsed * 0.009) % 1;

      for (let i = 0; i < this.clouds.length; i += 1) {
        const cl = this.clouds[i];
        cl.angle += dt * cl.speed;
        cl.mesh.position.set(
          Math.cos(cl.angle) * cl.radius,
          cl.height + Math.sin(elapsed * 0.6 + i) * 0.25,
          Math.sin(cl.angle) * cl.radius,
        );
        cl.mesh.rotation.y = -cl.angle;
      }

      for (let i = 0; i < this.boats.length; i += 1) {
        const bt = this.boats[i];
        bt.angle += dt * bt.speed;
        const bx = Math.cos(bt.angle) * bt.radius;
        const bz = Math.sin(bt.angle) * bt.radius;
        const lookA = bt.angle + (bt.speed >= 0 ? 0.05 : -0.05);
        bt.mesh.position.set(bx, -0.78 + Math.sin(elapsed * 2 + bt.phase) * 0.04, bz);
        _vec3B.set(Math.cos(lookA) * bt.radius, -0.78, Math.sin(lookA) * bt.radius);
        bt.mesh.lookAt(_vec3B);
      }

      // Old Era Meadow Wildlife Herds (Cows, Sheep, Goats, Horses, Deer)
      for (let i = 0; i < this.wildlife.length; i += 1) {
        const w = this.wildlife[i];
        w.angle += dt * w.speed;
        const wx = w.centerX + Math.cos(w.angle) * w.radiusX;
        const wz = w.centerZ + Math.sin(w.angle) * w.radiusZ;
        const wy = 0.005 + Math.abs(Math.sin(elapsed * 5.2 + w.phase)) * w.bobAmp;
        const lookAngle = w.angle + (w.speed >= 0 ? 0.08 : -0.08);
        const lx = w.centerX + Math.cos(lookAngle) * w.radiusX;
        const lz = w.centerZ + Math.sin(lookAngle) * w.radiusZ;

        w.mesh.position.set(wx, wy, wz);
        _vec3B.set(lx, wy, lz);
        w.mesh.lookAt(_vec3B);

        const stride = Math.sin(elapsed * 6.5 + w.phase) * 0.34;
        if (w.mesh.children[0]) w.mesh.children[0].rotation.x = stride;
        if (w.mesh.children[1]) w.mesh.children[1].rotation.x = -stride;
        if (w.mesh.children[2]) w.mesh.children[2].rotation.x = -stride;
        if (w.mesh.children[3]) w.mesh.children[3].rotation.x = stride;
      }

      // Soaring Kingdom Sky Birds
      if (this.birdGroup.visible) {
        for (let i = 0; i < this.birds.length; i += 1) {
          const bd = this.birds[i];
          bd.angle += dt * bd.speed;
          const bx = Math.cos(bd.angle) * bd.radius;
          const bz = Math.sin(bd.angle) * bd.radius;
          const by = bd.altitude + Math.sin(elapsed * 1.4 + bd.phase) * 0.45;
          const lookAngle = bd.angle + (bd.speed >= 0 ? 0.08 : -0.08);

          bd.mesh.position.set(bx, by, bz);
          _vec3B.set(Math.cos(lookAngle) * bd.radius, by, Math.sin(lookAngle) * bd.radius);
          bd.mesh.lookAt(_vec3B);

          const flap = Math.sin(elapsed * 8.5 + bd.phase) * 0.52;
          if (bd.mesh.children[0]) bd.mesh.children[0].rotation.z = flap;
          if (bd.mesh.children[1]) bd.mesh.children[1].rotation.z = -flap;
        }
      }

      this.renderer.render(this.scene, this.camera);
      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.frameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.handlePointerDown);
    dom.removeEventListener('pointerup', this.handlePointerUp);
    dom.removeEventListener('pointermove', this.handlePointerMove);
    dom.removeEventListener('pointerleave', this.handlePointerLeave);
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);

    this.controls.dispose();
    this.textures.dispose();
    this.scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) {
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
      }
    });
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
