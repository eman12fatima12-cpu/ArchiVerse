import * as THREE from 'three';

export interface ProceduralTexturePack {
  windowDay: THREE.CanvasTexture;
  windowNight: THREE.CanvasTexture;
  brickStone: THREE.CanvasTexture;
  asphalt: THREE.CanvasTexture;
  grassGround: THREE.CanvasTexture;
  sandGround: THREE.CanvasTexture;
  waterRipple: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function createProceduralTextures(
  maxAnisotropy: number,
  compact = false,
): ProceduralTexturePack {
  const aniso = compact ? Math.min(2, maxAnisotropy) : Math.min(4, maxAnisotropy);
  // 1. Realistic Architectural Curtain Wall / Mullion Window Texture (Day)
  const [winDayCanvas, winDayCtx] = makeCanvas(256, 256);
  winDayCtx.fillStyle = '#334155';
  winDayCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const lit = (row * 7 + col * 3) % 7 === 0;
      const grad = winDayCtx.createLinearGradient(col * 32, row * 32, col * 32 + 24, row * 32 + 24);
      if (lit) {
        grad.addColorStop(0, '#fde68a');
        grad.addColorStop(1, '#d97706');
      } else {
        grad.addColorStop(0, '#bae6fd');
        grad.addColorStop(0.55, '#6495b8');
        grad.addColorStop(1, '#2d4a66');
      }
      winDayCtx.fillStyle = grad;
      winDayCtx.fillRect(col * 32 + 4, row * 32 + 5, 24, 22);
      winDayCtx.strokeStyle = '#1e293b';
      winDayCtx.lineWidth = 2;
      winDayCtx.strokeRect(col * 32 + 4, row * 32 + 5, 24, 22);
    }
  }
  const windowDay = new THREE.CanvasTexture(winDayCanvas);
  windowDay.colorSpace = THREE.SRGBColorSpace;
  windowDay.wrapS = THREE.RepeatWrapping;
  windowDay.wrapT = THREE.RepeatWrapping;
  windowDay.anisotropy = aniso;

  // 2. Realistic Warm-Lit Night Window Texture
  const [winNightCanvas, winNightCtx] = makeCanvas(256, 256);
  winNightCtx.fillStyle = '#0f172a';
  winNightCtx.fillRect(0, 0, 256, 256);
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const seed = (row * 13 + col * 19) % 9;
      if (seed < 2) winNightCtx.fillStyle = '#60a5fa';
      else if (seed < 5) winNightCtx.fillStyle = '#f59e0b';
      else winNightCtx.fillStyle = '#182235';
      winNightCtx.fillRect(col * 32 + 5, row * 32 + 6, 22, 19);
    }
  }
  const windowNight = new THREE.CanvasTexture(winNightCanvas);
  windowNight.colorSpace = THREE.SRGBColorSpace;
  windowNight.wrapS = THREE.RepeatWrapping;
  windowNight.wrapT = THREE.RepeatWrapping;
  windowNight.anisotropy = aniso;

  // 3. Weathered Natural Limestone / Masonry Texture
  const [brickCanvas, brickCtx] = makeCanvas(256, 256);
  brickCtx.fillStyle = '#cfc3ae';
  brickCtx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    const offset = (y / 16) % 2 === 0 ? 0 : 16;
    for (let x = -16; x < 256; x += 32) {
      const shade = 198 + ((x * 7 + y * 11) % 24);
      brickCtx.fillStyle = `rgb(${shade}, ${shade - 8}, ${shade - 18})`;
      brickCtx.fillRect(x + offset + 1, y + 1, 30, 14);
      brickCtx.fillStyle = 'rgba(0,0,0,0.08)';
      brickCtx.fillRect(x + offset + 1, y + 13, 30, 2);
      brickCtx.fillStyle = 'rgba(255,255,255,0.12)';
      brickCtx.fillRect(x + offset + 1, y + 1, 30, 1);
    }
  }
  const brickStone = new THREE.CanvasTexture(brickCanvas);
  brickStone.colorSpace = THREE.SRGBColorSpace;
  brickStone.wrapS = THREE.RepeatWrapping;
  brickStone.wrapT = THREE.RepeatWrapping;
  brickStone.anisotropy = aniso;

  // 4. Fine Asphalt / Cobblestone Road Texture
  const [roadCanvas, roadCtx] = makeCanvas(256, 256);
  roadCtx.fillStyle = '#333d4b';
  roadCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 950; i += 1) {
    const rx = (i * 73) % 256;
    const ry = (i * 137) % 256;
    roadCtx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)';
    roadCtx.fillRect(rx, ry, 2, 2);
  }
  const asphalt = new THREE.CanvasTexture(roadCanvas);
  asphalt.colorSpace = THREE.SRGBColorSpace;
  asphalt.anisotropy = aniso;

  // 5. Realistic Natural Turf, Soil & Meadow Ground Texture (256px on mobile, 512px on desktop)
  const grassSize = compact ? 256 : 512;
  const grassSamples = compact ? 1600 : 4200;
  const [grassCanvas, grassCtx] = makeCanvas(grassSize, grassSize);
  grassCtx.fillStyle = '#e8ebe3';
  grassCtx.fillRect(0, 0, grassSize, grassSize);
  for (let i = 0; i < grassSamples; i += 1) {
    const gx = (i * 97) % grassSize;
    const gy = (i * 193) % grassSize;
    const mod = i % 5;
    if (mod === 0) grassCtx.fillStyle = 'rgba(85, 110, 62, 0.14)';
    else if (mod === 1) grassCtx.fillStyle = 'rgba(115, 130, 82, 0.12)';
    else if (mod === 2) grassCtx.fillStyle = 'rgba(60, 78, 44, 0.11)';
    else if (mod === 3) grassCtx.fillStyle = 'rgba(130, 118, 86, 0.08)';
    else grassCtx.fillStyle = 'rgba(255, 255, 255, 0.07)';
    grassCtx.fillRect(gx, gy, mod === 3 ? 5 : 3, mod === 1 ? 4 : 3);
  }
  const grassGround = new THREE.CanvasTexture(grassCanvas);
  grassGround.colorSpace = THREE.SRGBColorSpace;
  grassGround.wrapS = THREE.RepeatWrapping;
  grassGround.wrapT = THREE.RepeatWrapping;
  grassGround.repeat.set(14, 14);
  grassGround.anisotropy = aniso;

  // 6. Natural Coastal Sand & Pebbles Texture
  const [sandCanvas, sandCtx] = makeCanvas(256, 256);
  sandCtx.fillStyle = '#dfcaa0';
  sandCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 1200; i += 1) {
    const sx = (i * 67) % 256;
    const sy = (i * 149) % 256;
    sandCtx.fillStyle = i % 3 === 0 ? 'rgba(255,248,232,0.18)' : 'rgba(130,96,58,0.14)';
    sandCtx.fillRect(sx, sy, 2, 2);
  }
  const sandGround = new THREE.CanvasTexture(sandCanvas);
  sandGround.colorSpace = THREE.SRGBColorSpace;
  sandGround.wrapS = THREE.RepeatWrapping;
  sandGround.wrapT = THREE.RepeatWrapping;
  sandGround.repeat.set(14, 14);
  sandGround.anisotropy = aniso;

  // 7. Realistic Ocean Wave Specular Texture
  const waterSize = compact ? 256 : 512;
  const [waterCanvas, waterCtx] = makeCanvas(waterSize, waterSize);
  waterCtx.fillStyle = '#d4e2ea';
  waterCtx.fillRect(0, 0, waterSize, waterSize);
  waterCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  waterCtx.lineWidth = 1.5;
  for (let y = 12; y < waterSize; y += 20) {
    waterCtx.beginPath();
    for (let x = 0; x <= waterSize; x += 16) {
      const wy = y + Math.sin((x / waterSize) * Math.PI * 6 + y) * 3.5;
      if (x === 0) waterCtx.moveTo(x, wy);
      else waterCtx.lineTo(x, wy);
    }
    waterCtx.stroke();
  }
  const waterRipple = new THREE.CanvasTexture(waterCanvas);
  waterRipple.colorSpace = THREE.SRGBColorSpace;
  waterRipple.wrapS = THREE.RepeatWrapping;
  waterRipple.wrapT = THREE.RepeatWrapping;
  waterRipple.repeat.set(18, 18);
  waterRipple.anisotropy = aniso;

  // 8. Soft Ground Contact Shadow Texture
  const [shadowCanvas, shadowCtx] = makeCanvas(128, 128);
  const grad = shadowCtx.createRadialGradient(64, 64, 12, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.46)');
  grad.addColorStop(0.6, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  shadowCtx.fillStyle = grad;
  shadowCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  return {
    windowDay,
    windowNight,
    brickStone,
    asphalt,
    grassGround,
    sandGround,
    waterRipple,
    contactShadow,
    dispose: () => {
      windowDay.dispose();
      windowNight.dispose();
      brickStone.dispose();
      asphalt.dispose();
      grassGround.dispose();
      sandGround.dispose();
      waterRipple.dispose();
      contactShadow.dispose();
    },
  };
}
