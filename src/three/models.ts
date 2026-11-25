import * as THREE from 'three';
import { EraTheme } from '../data/presets';
import { BuildingType, WorldEra } from '../types/archiverse';
import { ProceduralTexturePack } from './textures';

export interface RoadNeighbors {
  north: boolean;
  south: boolean;
  east: boolean;
  west: boolean;
}

export interface AnimatedPartHandles {
  rotors: THREE.Object3D[];
  portalRings: THREE.Object3D[];
  portalCores: THREE.Object3D[];
  swings: THREE.Object3D[];
}

function addContactPad(group: THREE.Group, textures: ProceduralTexturePack, size = 1.9): void {
  const shadowGeo = new THREE.PlaneGeometry(size, size);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: textures.contactShadow,
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.015;
  group.add(shadowMesh);
}

function makeBeveledBlock(w: number, h: number, d: number, bevel = 0.04): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const hw = w / 2 - bevel;
  const hd = d / 2 - bevel;
  shape.moveTo(-hw, -hd);
  shape.lineTo(hw, -hd);
  shape.lineTo(hw, hd);
  shape.lineTo(-hw, hd);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.05, h - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, bevel, 0);
  return geo;
}

export function createRoadMesh(
  neighbors: RoadNeighbors,
  era: EraTheme,
  textures: ProceduralTexturePack,
): THREE.Group {
  const group = new THREE.Group();
  const isCyber = era.id === 'neo_cyber';
  const isOld = era.id === 'prime_classical';

  const baseMat = new THREE.MeshStandardMaterial({
    color: isCyber ? 0x1e293b : isOld ? 0x695b4c : 0x3f4756,
    map: isOld ? textures.brickStone : textures.asphalt,
    roughness: isOld ? 0.92 : 0.86,
    metalness: 0.08,
  });

  const curbMat = new THREE.MeshStandardMaterial({
    color: isCyber ? new THREE.Color(era.buildingStone || '#334155') : isOld ? 0xc2b29b : 0x9ca3af,
    roughness: 0.78,
    metalness: isOld ? 0.05 : 0.15,
  });

  const stripeMat = new THREE.MeshStandardMaterial({
    color: isCyber ? new THREE.Color(era.accentHex) : isOld ? 0xa3927c : 0xd4a72c,
    emissive: isCyber ? new THREE.Color(era.accentHex) : new THREE.Color(0x000000),
    emissiveIntensity: isCyber ? (era.isNight ? 1.15 : 0.35) : 0,
    roughness: isOld ? 0.9 : 0.5,
    metalness: 0.1,
  });

  // Sidewalk base tile
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.05, 1.92), curbMat);
  sidewalk.position.y = 0.025;
  sidewalk.receiveShadow = true;
  group.add(sidewalk);

  // Center road junction pad
  const center = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.065, 1.12), baseMat);
  center.position.y = 0.0325;
  center.receiveShadow = true;
  group.add(center);

  // Arm segments for N (-Z), S (+Z), E (+X), W (-X)
  const addArm = (dx: number, dz: number, horiz: boolean) => {
    const geo = horiz
      ? new THREE.BoxGeometry(0.46, 0.065, 1.12)
      : new THREE.BoxGeometry(1.12, 0.065, 0.46);
    const arm = new THREE.Mesh(geo, baseMat);
    arm.position.set(dx * 0.74, 0.0325, dz * 0.74);
    arm.receiveShadow = true;
    group.add(arm);

    if (!isOld) {
      const stripeGeo = horiz
        ? new THREE.BoxGeometry(0.42, 0.012, 0.07)
        : new THREE.BoxGeometry(0.07, 0.012, 0.42);
      const stripe = new THREE.Mesh(stripeGeo, stripeMat);
      stripe.position.set(dx * 0.68, 0.07, dz * 0.68);
      group.add(stripe);
    }
  };

  if (neighbors.north) addArm(0, -1, false);
  if (neighbors.south) addArm(0, 1, false);
  if (neighbors.east) addArm(1, 0, true);
  if (neighbors.west) addArm(-1, 0, true);

  if (isOld) {
    // Historic cobblestone streetlamp corner bollard
    const postMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.55, metalness: 0.6 });
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: era.isNight ? 1.2 : 0.2,
    });
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.42, 6), postMat);
    post.position.set(0.76, 0.24, 0.76);
    group.add(post);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.09), lanternMat);
    bulb.position.set(0.76, 0.48, 0.76);
    group.add(bulb);
  } else {
    // Center intersection hub dot / cyber node
    const centerCap = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.014, 0.22), stripeMat);
    centerCap.position.y = 0.07;
    group.add(centerCap);
  }

  return group;
}

export function createBuildingGroup(
  type: BuildingType,
  era: EraTheme,
  textures: ProceduralTexturePack,
  animHandles: AnimatedPartHandles,
): THREE.Group {
  const group = new THREE.Group();
  const isNight = era.isNight;
  const windowTex = isNight ? textures.windowNight : textures.windowDay;

  addContactPad(group, textures, 1.95);

  const stoneMat = new THREE.MeshStandardMaterial({
    color: era.buildingStone
      ? new THREE.Color(era.buildingStone)
      : era.id === 'prime_classical'
        ? 0xd6c4a9
        : era.id === 'solar_frontier'
          ? 0xd49a6a
          : era.id === 'eco_arcology'
            ? 0xdbe6dc
            : 0x334155,
    map: textures.brickStone,
    roughness: 0.82,
    metalness: era.id === 'neo_cyber' ? 0.25 : 0.05,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: era.buildingTrim
      ? new THREE.Color(era.buildingTrim)
      : era.id === 'neo_cyber'
        ? 0x94a3b8
        : 0xb48a52,
    roughness: 0.28,
    metalness: 0.78,
  });

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: era.buildingGlass
      ? new THREE.Color(era.buildingGlass)
      : isNight
        ? 0x38bdf8
        : 0xbae6fd,
    map: windowTex,
    emissive: isNight
      ? new THREE.Color(era.buildingEmissive || era.accentHex)
      : new THREE.Color(0x000000),
    emissiveIntensity: isNight ? 0.52 : 0,
    roughness: 0.18,
    metalness: 0.42,
    clearcoat: 0.9,
    clearcoatRoughness: 0.12,
  });

  const foliageMat = new THREE.MeshStandardMaterial({
    color: era.id === 'solar_frontier' ? 0x627337 : 0x2e5232,
    roughness: 0.88,
    metalness: 0.02,
  });

  const roofAccentMat = new THREE.MeshStandardMaterial({
    color: era.buildingRoof
      ? new THREE.Color(era.buildingRoof)
      : era.id === 'prime_classical'
        ? 0x8f4735
        : era.id === 'eco_arcology'
          ? 0x2e6f57
          : era.id === 'neo_cyber'
            ? 0x3b4859
            : 0x944a31,
    roughness: 0.68,
    metalness: era.id === 'neo_cyber' ? 0.55 : 0.1,
  });

  const isNewEra = era.id === 'neo_cyber';
  const isOldEra = era.id === 'prime_classical';

  const neonCyanMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(era.accentHex),
    emissive: new THREE.Color(era.accentHex),
    emissiveIntensity: isNight ? 1.25 : 0.42,
    roughness: 0.28,
    metalness: 0.55,
  });

  const neonSecondaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(era.portalColorB),
    emissive: new THREE.Color(era.portalColorB),
    emissiveIntensity: isNight ? 1.15 : 0.35,
    roughness: 0.28,
    metalness: 0.5,
  });

  if (type === 'residential') {
    if (isNewEra) {
      // Advanced Tech: Architectural Pearl-Ceramic Habitat Pods + Subtle Window Mullions
      const habBodyMat = new THREE.MeshStandardMaterial({
        color: isNight ? 0xb6c2cf : 0xe4e9ef,
        map: windowTex,
        emissive: new THREE.Color(0xfbbf24),
        emissiveIntensity: isNight ? 0.42 : 0.04,
        roughness: 0.38,
        metalness: 0.28,
      });

      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.94, 0.24, 6), stoneMat);
      base.position.y = 0.12;
      base.castShadow = true;
      base.receiveShadow = true;
      group.add(base);

      const pod1 = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.72, 1.35, 6), habBodyMat);
      pod1.position.set(-0.12, 0.91, -0.08);
      pod1.castShadow = true;
      group.add(pod1);

      const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.04, 8, 6), neonSecondaryMat);
      haloRing.rotation.x = Math.PI / 2;
      haloRing.position.set(-0.12, 1.42, -0.08);
      group.add(haloRing);

      const pod2 = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.5, 1.85, 6), habBodyMat);
      pod2.position.set(0.32, 1.15, 0.28);
      pod2.castShadow = true;
      group.add(pod2);

      const roofCap = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.46, 0.1, 6), neonCyanMat);
      roofCap.position.set(0.32, 2.1, 0.28);
      group.add(roofCap);

      const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.05, 0.52, 6), trimMat);
      antenna.position.set(0.32, 2.38, 0.28);
      group.add(antenna);
      return group;
    }

    if (isOldEra) {
      // Old Era: Mitti ka Ghar (Earthen Mud-Brick Homestead, Courtyard Wall, Wood Rafters & Clay Pots)
      const mudMat = new THREE.MeshStandardMaterial({
        color: 0xb88456,
        map: textures.brickStone,
        roughness: 0.94,
        metalness: 0.02,
      });
      const darkMudMat = new THREE.MeshStandardMaterial({
        color: 0x8f613b,
        roughness: 0.95,
      });
      const thatchMat = new THREE.MeshStandardMaterial({
        color: 0x7d643e,
        roughness: 0.96,
      });
      const woodMat = new THREE.MeshStandardMaterial({
        color: 0x54351e,
        roughness: 0.88,
      });

      // Earthen ground pad & courtyard compound wall (char-diwari)
      const dirtPad = new THREE.Mesh(makeBeveledBlock(1.82, 0.1, 1.82, 0.02), darkMudMat);
      dirtPad.receiveShadow = true;
      group.add(dirtPad);

      const backWall = new THREE.Mesh(new THREE.BoxGeometry(1.76, 0.34, 0.1), mudMat);
      backWall.position.set(0, 0.27, -0.82);
      backWall.castShadow = true;
      group.add(backWall);

      const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 1.66), mudMat);
      leftWall.position.set(-0.82, 0.27, 0);
      leftWall.castShadow = true;
      group.add(leftWall);

      const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.34, 1.66), mudMat);
      rightWall.position.set(0.82, 0.27, 0);
      rightWall.castShadow = true;
      group.add(rightWall);

      // Main Mud House (Kacha Mitti room)
      const mudHouse = new THREE.Mesh(makeBeveledBlock(1.18, 0.92, 0.88, 0.04), mudMat);
      mudHouse.position.set(-0.18, 0.1, -0.24);
      mudHouse.castShadow = true;
      mudHouse.receiveShadow = true;
      group.add(mudHouse);

      // Flat earthen & thatched roof with protruding timber rafters
      const mudRoof = new THREE.Mesh(new THREE.BoxGeometry(1.28, 0.14, 0.98), thatchMat);
      mudRoof.position.set(-0.18, 1.06, -0.24);
      mudRoof.castShadow = true;
      group.add(mudRoof);

      for (let b = -1; b <= 1; b += 1) {
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.12), woodMat);
        beam.position.set(-0.18 + b * 0.36, 0.96, -0.22);
        group.add(beam);
      }

      // Adjacent mud-brick side hut with pitched thatch roof
      const sideHut = new THREE.Mesh(makeBeveledBlock(0.64, 0.72, 0.78, 0.03), mudMat);
      sideHut.position.set(0.46, 0.1, 0.24);
      sideHut.castShadow = true;
      group.add(sideHut);

      const hutRoof = new THREE.Mesh(new THREE.ConeGeometry(0.54, 0.44, 4), thatchMat);
      hutRoof.rotation.y = Math.PI / 4;
      hutRoof.position.set(0.46, 1.04, 0.24);
      hutRoof.castShadow = true;
      group.add(hutRoof);

      // Carved wooden door & warm clay-framed window
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.48, 0.06), woodMat);
      door.position.set(-0.18, 0.34, 0.21);
      group.add(door);

      const warmWin = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.18, 0.06),
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: new THREE.Color(0xf59e0b),
          emissiveIntensity: isNight ? 0.9 : 0.25,
        }),
      );
      warmWin.position.set(-0.54, 0.56, 0.21);
      group.add(warmWin);

      // Terracotta clay water pots (Matka) + Courtyard shade tree
      const potMat = new THREE.MeshStandardMaterial({ color: 0x994a22, roughness: 0.82 });
      const pot1 = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), potMat);
      pot1.position.set(0.14, 0.2, 0.38);
      group.add(pot1);
      const pot2 = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), potMat);
      pot2.position.set(0.02, 0.17, 0.52);
      group.add(pot2);

      const treeTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.45, 6), woodMat);
      treeTrunk.position.set(-0.52, 0.32, 0.48);
      group.add(treeTrunk);
      const canopy = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), foliageMat);
      canopy.position.set(-0.52, 0.64, 0.48);
      canopy.castShadow = true;
      group.add(canopy);
      return group;
    }

    // Eco / Frontier: Plinth + stepped townhomes + gabled roof + courtyard tree
    const plinth = new THREE.Mesh(makeBeveledBlock(1.75, 0.16, 1.75, 0.03), stoneMat);
    plinth.castShadow = true;
    plinth.receiveShadow = true;
    group.add(plinth);

    const wingA = new THREE.Mesh(makeBeveledBlock(1.15, 1.45, 0.85, 0.03), glassMat);
    wingA.position.set(-0.2, 0.16, -0.2);
    wingA.castShadow = true;
    wingA.receiveShadow = true;
    group.add(wingA);

    const wingB = new THREE.Mesh(makeBeveledBlock(0.85, 1.05, 1.15, 0.03), stoneMat);
    wingB.position.set(0.28, 0.16, 0.22);
    wingB.castShadow = true;
    wingB.receiveShadow = true;
    group.add(wingB);

    const roofA = new THREE.Mesh(new THREE.ConeGeometry(0.78, 0.55, 4), roofAccentMat);
    roofA.rotation.y = Math.PI / 4;
    roofA.position.set(-0.2, 1.88, -0.2);
    roofA.castShadow = true;
    group.add(roofA);

    const balcony = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.07, 0.28), trimMat);
    balcony.position.set(0.28, 0.82, 0.82);
    group.add(balcony);

    const gardenPatch = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.22, 7), foliageMat);
    gardenPatch.position.set(-0.48, 0.27, 0.48);
    gardenPatch.castShadow = true;
    group.add(gardenPatch);
    return group;
  }

  if (type === 'commercial') {
    if (isNewEra) {
      // Advanced Tech: Tapered Cyber-Monolith Skyscraper + Diagonal Exo-Fins + Holo Halo
      const podium = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.05, 0.45, 8), stoneMat);
      podium.position.y = 0.225;
      podium.castShadow = true;
      podium.receiveShadow = true;
      group.add(podium);

      const core = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.72, 3.4, 8), glassMat);
      core.position.y = 2.15;
      core.castShadow = true;
      group.add(core);

      for (let i = 0; i < 4; i += 1) {
        const angle = (i * Math.PI) / 2;
        const fin = new THREE.Mesh(new THREE.BoxGeometry(0.09, 3.5, 0.14), neonCyanMat);
        fin.position.set(Math.cos(angle) * 0.62, 2.1, Math.sin(angle) * 0.62);
        fin.lookAt(0, 2.1, 0);
        group.add(fin);
      }

      const holoRing = new THREE.Mesh(new THREE.TorusGeometry(0.54, 0.05, 10, 24), neonCyanMat);
      holoRing.rotation.x = Math.PI / 2;
      holoRing.position.y = 3.95;
      group.add(holoRing);

      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.08, 1.15, 8), trimMat);
      spire.position.y = 4.45;
      group.add(spire);
      return group;
    }

    if (isOldEra) {
      // Old Era: Grand Stone Clocktower Guildhall with Cupola Dome & Clock Dials
      const hall = new THREE.Mesh(makeBeveledBlock(1.82, 1.25, 1.82, 0.04), stoneMat);
      hall.castShadow = true;
      hall.receiveShadow = true;
      group.add(hall);

      const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(1.32, 0.55, 4), roofAccentMat);
      hallRoof.rotation.y = Math.PI / 4;
      hallRoof.position.y = 1.52;
      hallRoof.castShadow = true;
      group.add(hallRoof);

      const belfry = new THREE.Mesh(makeBeveledBlock(0.78, 2.35, 0.78, 0.03), stoneMat);
      belfry.position.y = 1.25;
      belfry.castShadow = true;
      group.add(belfry);

      const clockMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: new THREE.Color(0xfbbf24),
        emissiveIntensity: 0.9,
      });
      for (let f = 0; f < 4; f += 1) {
        const dial = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), clockMat);
        const angle = (f * Math.PI) / 2;
        dial.rotation.z = Math.PI / 2;
        dial.rotation.y = angle;
        dial.position.set(Math.cos(angle) * 0.4, 3.0, Math.sin(angle) * 0.4);
        group.add(dial);
      }

      const cupola = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), trimMat);
      cupola.position.y = 3.6;
      cupola.castShadow = true;
      group.add(cupola);

      const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.06, 0.55, 8), trimMat);
      finial.position.y = 4.18;
      group.add(finial);
      return group;
    }

    // Eco / Frontier Commercial Tower
    const podium = new THREE.Mesh(makeBeveledBlock(1.8, 0.42, 1.8, 0.04), stoneMat);
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    const tower = new THREE.Mesh(makeBeveledBlock(1.22, 2.55, 1.22, 0.04), glassMat);
    tower.position.y = 0.42;
    tower.castShadow = true;
    tower.receiveShadow = true;
    group.add(tower);

    const setback = new THREE.Mesh(makeBeveledBlock(0.82, 0.9, 0.82, 0.03), glassMat);
    setback.position.y = 2.97;
    setback.castShadow = true;
    group.add(setback);

    for (let i = 0; i < 4; i += 1) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.7, 0.12), trimMat);
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      fin.position.set(Math.cos(angle) * 0.74, 1.75, Math.sin(angle) * 0.74);
      fin.castShadow = true;
      group.add(fin);
    }

    const crownGlow = new THREE.Mesh(
      new THREE.TorusGeometry(0.36, 0.05, 10, 24),
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(era.accentHex),
        emissive: new THREE.Color(era.accentHex),
        emissiveIntensity: 0.75,
        roughness: 0.25,
        metalness: 0.7,
      }),
    );
    crownGlow.rotation.x = Math.PI / 2;
    crownGlow.position.y = 3.92;
    group.add(crownGlow);

    const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.07, 0.85, 8), trimMat);
    spire.position.y = 4.3;
    group.add(spire);
    return group;
  }

  if (type === 'industrial') {
    const slab = new THREE.Mesh(makeBeveledBlock(1.86, 0.14, 1.86, 0.03), stoneMat);
    slab.castShadow = true;
    slab.receiveShadow = true;
    group.add(slab);

    if (isNewEra) {
      // Advanced Tech: Nano-Synth Robotics Lab (Warm Copper/Amber Reactor Vats + Brushed Titanium Hex Lab)
      const copperShellMat = new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.35,
        metalness: 0.72,
      });
      const plasmaAmberMat = new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: new THREE.Color(0xf97316),
        emissiveIntensity: 1.35,
        roughness: 0.2,
      });

      const hexLab = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.78, 0.95, 6), copperShellMat);
      hexLab.position.set(-0.22, 0.62, 0);
      hexLab.castShadow = true;
      group.add(hexLab);

      const labCap = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.68, 0.35, 6), trimMat);
      labCap.position.set(-0.22, 1.26, 0);
      group.add(labCap);

      for (let v = 0; v < 2; v += 1) {
        const vat = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 1.35, 12), plasmaAmberMat);
        vat.position.set(0.54, 0.82, v === 0 ? -0.38 : 0.38);
        group.add(vat);
      }

      const gantry = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.08, 1.35), trimMat);
      gantry.position.set(0.15, 1.56, 0);
      group.add(gantry);
      return group;
    }

    if (isOldEra) {
      // Old Era: Medieval Blacksmith Forge & Brick Hearth Chimney
      const smithy = new THREE.Mesh(makeBeveledBlock(1.22, 0.88, 1.15, 0.03), stoneMat);
      smithy.position.set(-0.2, 0.14, -0.18);
      smithy.castShadow = true;
      group.add(smithy);

      const smithyRoof = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.52, 4), roofAccentMat);
      smithyRoof.rotation.y = Math.PI / 4;
      smithyRoof.position.set(-0.2, 1.28, -0.18);
      smithyRoof.castShadow = true;
      group.add(smithyRoof);

      const hearthGlow = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 0.36, 0.12),
        new THREE.MeshStandardMaterial({
          color: 0xfb923c,
          emissive: new THREE.Color(0xea580c),
          emissiveIntensity: 1.4,
        }),
      );
      hearthGlow.position.set(-0.2, 0.38, 0.42);
      group.add(hearthGlow);

      const brickChimney = new THREE.Mesh(new THREE.BoxGeometry(0.34, 1.85, 0.34), roofAccentMat);
      brickChimney.position.set(0.52, 1.06, -0.42);
      brickChimney.castShadow = true;
      group.add(brickChimney);

      const anvil = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.24, 0.18),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.3 }),
      );
      anvil.position.set(0.45, 0.26, 0.42);
      group.add(anvil);
      return group;
    }

    const bayMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.65,
      metalness: 0.45,
    });
    const bay1 = new THREE.Mesh(makeBeveledBlock(1.1, 0.85, 0.72, 0.03), bayMat);
    bay1.position.set(-0.28, 0.14, -0.32);
    bay1.castShadow = true;
    group.add(bay1);

    const bay2 = new THREE.Mesh(makeBeveledBlock(1.1, 0.7, 0.68, 0.03), bayMat);
    bay2.position.set(-0.28, 0.14, 0.4);
    bay2.castShadow = true;
    group.add(bay2);

    const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.25, 16), trimMat);
    silo.position.set(0.54, 0.76, 0.42);
    silo.castShadow = true;
    group.add(silo);

    const stackMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.7,
      metalness: 0.5,
    });
    const warnMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: new THREE.Color(0xe11d48),
      emissiveIntensity: 0.35,
      roughness: 0.4,
    });

    for (let s = 0; s < 2; s += 1) {
      const sx = 0.48;
      const sz = s === 0 ? -0.48 : -0.05;
      const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 1.85, 12), stackMat);
      stack.position.set(sx, 1.06, sz);
      stack.castShadow = true;
      group.add(stack);

      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 12), warnMat);
      collar.position.set(sx, 1.82, sz);
      group.add(collar);
    }
    return group;
  }

  if (type === 'park') {
    const lawn = new THREE.Mesh(
      new THREE.BoxGeometry(1.88, 0.08, 1.88),
      new THREE.MeshStandardMaterial({
        color: isNewEra ? 0x2e4f42 : 0x3a5934,
        map: textures.grassGround,
        roughness: 0.92,
        metalness: 0.02,
      }),
    );
    lawn.position.y = 0.04;
    lawn.receiveShadow = true;
    group.add(lawn);

    if (isNewEra) {
      // Advanced Tech: Holo-Botanical Biodome (back) + Kinetic Neon Swings (front)
      const dome = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.54, 1),
        new THREE.MeshPhysicalMaterial({
          color: 0x67e8f9,
          roughness: 0.12,
          metalness: 0.25,
          transparent: true,
          opacity: 0.44,
          clearcoat: 1,
        }),
      );
      dome.position.set(0, 0.34, -0.26);
      group.add(dome);

      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.04, 8, 24), neonCyanMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.11, -0.26);
      group.add(ring);
    } else {
      const basin = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.42, 0.2, 16), stoneMat);
      basin.position.set(0, 0.16, -0.26);
      basin.castShadow = true;
      group.add(basin);

      const water = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 0.06, 16),
        new THREE.MeshPhysicalMaterial({
          color: 0x38bdf8,
          roughness: 0.1,
          metalness: 0.15,
          clearcoat: 1,
        }),
      );
      water.position.set(0, 0.25, -0.26);
      group.add(water);

      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.36, 12), trimMat);
      spire.position.set(0, 0.38, -0.26);
      group.add(spire);
    }

    // Double Playground Swing Set (Jhoolay) in front promenade (x = -0.14, z = 0.52)
    const frameMat = isNewEra
      ? trimMat
      : new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.85 });
    const barMat = isNewEra
      ? neonCyanMat
      : new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5, metalness: 0.45 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: isNewEra ? 0x38bdf8 : 0xd6d3d1, roughness: 0.5 });
    const seatColors = isNewEra ? [0x38bdf8, 0xf472b6] : [0xdc2626, 0xf59e0b];

    const swingGroup = new THREE.Group();
    swingGroup.position.set(-0.14, 0.08, 0.52);

    // Left & Right A-frame legs
    for (let side = -1; side <= 1; side += 2) {
      const legFront = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.72, 6), frameMat);
      legFront.position.set(side * 0.46, 0.33, 0.14);
      legFront.rotation.x = 0.22;
      legFront.castShadow = true;
      swingGroup.add(legFront);

      const legBack = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.038, 0.72, 6), frameMat);
      legBack.position.set(side * 0.46, 0.33, -0.14);
      legBack.rotation.x = -0.22;
      legBack.castShadow = true;
      swingGroup.add(legBack);
    }

    // Top horizontal crossbar
    const topBar = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 1.02, 8), barMat);
    topBar.rotation.z = Math.PI / 2;
    topBar.position.set(0, 0.66, 0);
    topBar.castShadow = true;
    swingGroup.add(topBar);

    // 2 Animated Hanging Swings
    const seatOffsets = [-0.2, 0.2];
    for (let s = 0; s < seatOffsets.length; s += 1) {
      const pivot = new THREE.Group();
      pivot.position.set(seatOffsets[s], 0.66, 0);

      for (let rx = -1; rx <= 1; rx += 2) {
        const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.44, 5), ropeMat);
        rope.position.set(rx * 0.08, -0.22, 0);
        pivot.add(rope);
      }

      const seat = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 0.035, 0.12),
        new THREE.MeshStandardMaterial({
          color: seatColors[s % seatColors.length],
          emissive: isNewEra ? new THREE.Color(seatColors[s % seatColors.length]) : new THREE.Color(0x000000),
          emissiveIntensity: isNewEra ? 0.55 : 0,
          roughness: 0.45,
        }),
      );
      seat.position.set(0, -0.44, 0);
      seat.castShadow = true;
      pivot.add(seat);

      swingGroup.add(pivot);
      animHandles.swings.push(pivot);
    }
    group.add(swingGroup);

    // Playground Slide / Seesaw beside the swings (x = 0.6, z = 0.5)
    const ladder = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.42, 0.06), frameMat);
    ladder.position.set(0.62, 0.28, 0.34);
    ladder.castShadow = true;
    group.add(ladder);

    const chute = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 0.04, 0.52),
      new THREE.MeshStandardMaterial({
        color: isNewEra ? 0xa855f7 : 0xf59e0b,
        emissive: isNewEra ? new THREE.Color(0xa855f7) : new THREE.Color(0x000000),
        emissiveIntensity: isNewEra ? 0.45 : 0,
        roughness: 0.3,
      }),
    );
    chute.position.set(0.62, 0.27, 0.56);
    chute.rotation.x = 0.62;
    chute.castShadow = true;
    group.add(chute);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4c35, roughness: 0.92 });
    const treeOffsets: Array<[number, number, number]> = [
      [-0.64, -0.62, 0.92],
      [0.64, -0.62, 0.88],
      [-0.68, 0.08, 0.84],
    ];
    for (let t = 0; t < treeOffsets.length; t += 1) {
      const [tx, tz, sc] = treeOffsets[t];
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, 0.35 * sc, 7), trunkMat);
      trunk.position.set(tx, 0.24 * sc, tz);
      trunk.castShadow = true;
      group.add(trunk);

      const canopy1 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24 * sc, 1), foliageMat);
      canopy1.position.set(tx, 0.48 * sc, tz);
      canopy1.castShadow = true;
      group.add(canopy1);

      const canopy2 = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16 * sc, 1), foliageMat);
      canopy2.position.set(tx + 0.05, 0.68 * sc, tz - 0.04);
      canopy2.castShadow = true;
      group.add(canopy2);
    }
    return group;
  }

  if (type === 'power_hub') {
    const pad = new THREE.Mesh(makeBeveledBlock(1.82, 0.12, 1.82, 0.03), stoneMat);
    pad.receiveShadow = true;
    group.add(pad);

    if (isNewEra) {
      // Advanced Tech: Quantum Fusion Tokamak Core with rotating plasma ring
      const baseRing = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.78, 0.26, 12), trimMat);
      baseRing.position.y = 0.25;
      baseRing.castShadow = true;
      group.add(baseRing);

      for (let i = 0; i < 4; i += 1) {
        const angle = (i * Math.PI) / 2;
        const coil = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.45, 0.22), trimMat);
        coil.position.set(Math.cos(angle) * 0.64, 0.92, Math.sin(angle) * 0.64);
        coil.lookAt(0, 0.92, 0);
        coil.castShadow = true;
        group.add(coil);
      }

      const plasmaRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.09, 12, 24), neonCyanMat);
      plasmaRing.rotation.x = Math.PI / 2;
      plasmaRing.position.y = 1.05;
      group.add(plasmaRing);

      const fusionSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 16, 12),
        new THREE.MeshStandardMaterial({
          color: 0xffffff,
          emissive: new THREE.Color(era.portalColorB),
          emissiveIntensity: 1.5,
        }),
      );
      fusionSphere.position.y = 1.05;
      group.add(fusionSphere);
      animHandles.portalCores.push(fusionSphere);
      return group;
    }

    if (isOldEra) {
      // Old Era: Historic Stone Windmill with 4 wide wooden canvas sails
      const millTower = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.56, 2.05, 8), stoneMat);
      millTower.position.y = 1.14;
      millTower.castShadow = true;
      group.add(millTower);

      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.52, 8), roofAccentMat);
      cap.position.y = 2.42;
      cap.castShadow = true;
      group.add(cap);

      const sailMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.85 });
      const rotor = new THREE.Group();
      rotor.position.set(0, 1.92, 0.44);
      for (let b = 0; b < 4; b += 1) {
        const arm = new THREE.Group();
        arm.rotation.z = (b * Math.PI) / 2;
        const spar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.96, 0.04), trimMat);
        spar.position.y = 0.48;
        arm.add(spar);
        const canvas = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.72, 0.02), sailMat);
        canvas.position.set(0.11, 0.54, 0);
        arm.add(canvas);
        rotor.add(arm);
      }
      group.add(rotor);
      animHandles.rotors.push(rotor);
      return group;
    }

    // Eco / Frontier: Solar Panels + Modern Wind Turbine
    const solarMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      roughness: 0.16,
      metalness: 0.72,
      clearcoat: 0.95,
    });
    for (let p = 0; p < 2; p += 1) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.05, 0.95), solarMat);
      panel.position.set(-0.42, 0.32, p === 0 ? -0.44 : 0.48);
      panel.rotation.z = -0.38;
      panel.castShadow = true;
      group.add(panel);
    }

    const mastMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.55 });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.13, 2.35, 12), mastMat);
    mast.position.set(0.42, 1.28, 0);
    mast.castShadow = true;
    group.add(mast);

    const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.42), trimMat);
    nacelle.position.set(0.42, 2.48, 0);
    group.add(nacelle);

    const rotor = new THREE.Group();
    rotor.position.set(0.42, 2.48, 0.23);
    for (let b = 0; b < 3; b += 1) {
      const bladePivot = new THREE.Group();
      bladePivot.rotation.z = (b * Math.PI * 2) / 3;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.82, 0.03), mastMat);
      blade.position.y = 0.41;
      blade.castShadow = true;
      bladePivot.add(blade);
      rotor.add(bladePivot);
    }
    group.add(rotor);
    animHandles.rotors.push(rotor);
    return group;
  }

  if (type === 'transit_hub') {
    const deck = new THREE.Mesh(makeBeveledBlock(1.86, 0.22, 1.86, 0.03), stoneMat);
    deck.receiveShadow = true;
    deck.castShadow = true;
    group.add(deck);

    if (isOldEra) {
      // Old Era: Royal Carriage Stables & Timber Coach House
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
      const stableHall = new THREE.Mesh(makeBeveledBlock(1.48, 0.88, 1.25, 0.03), stoneMat);
      stableHall.position.set(0, 0.22, -0.1);
      stableHall.castShadow = true;
      group.add(stableHall);

      const archDoor = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.58, 0.12), woodMat);
      archDoor.position.set(0, 0.51, 0.53);
      group.add(archDoor);

      const timberRoof = new THREE.Mesh(new THREE.ConeGeometry(1.12, 0.58, 4), roofAccentMat);
      timberRoof.rotation.y = Math.PI / 4;
      timberRoof.position.set(0, 1.38, -0.1);
      timberRoof.castShadow = true;
      group.add(timberRoof);

      const lantern = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.16, 0.14),
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: new THREE.Color(0xf59e0b),
          emissiveIntensity: 1.0,
        }),
      );
      lantern.position.set(0.55, 0.82, 0.62);
      group.add(lantern);

      // Paddock Horse, Water Trough & Golden Hay Bale in Stables Courtyard
      const hayMat = new THREE.MeshStandardMaterial({ color: 0xc99a3b, roughness: 0.94 });
      const hayBale = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.24), hayMat);
      hayBale.position.set(0.54, 0.33, 0.7);
      hayBale.castShadow = true;
      group.add(hayBale);

      const trough = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.14, 0.2), woodMat);
      trough.position.set(-0.56, 0.29, 0.72);
      trough.castShadow = true;
      group.add(trough);
      const troughWater = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.03, 0.14),
        new THREE.MeshPhysicalMaterial({ color: 0x195e7d, roughness: 0.14, clearcoat: 0.85 }),
      );
      troughWater.position.set(-0.56, 0.355, 0.72);
      group.add(troughWater);

      const stableHorse = createHorseGroup(0x6e3d1e);
      stableHorse.scale.setScalar(1.1);
      stableHorse.position.set(-0.34, 0.22, 0.66);
      stableHorse.rotation.y = 0.85;
      group.add(stableHorse);
      return group;
    }

    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: isNewEra ? new THREE.Color(era.buildingGlass || era.accentHex) : 0x93c5fd,
      roughness: 0.14,
      metalness: 0.35,
      transparent: true,
      opacity: 0.78,
      clearcoat: 1,
    });
    const vault = new THREE.Mesh(
      new THREE.CylinderGeometry(0.75, 0.75, 1.56, 16, 1, false, 0, Math.PI),
      canopyMat,
    );
    vault.rotation.z = Math.PI / 2;
    vault.rotation.y = Math.PI / 2;
    vault.position.y = 0.22;
    group.add(vault);

    for (let r = -1; r <= 1; r += 1) {
      const rib = new THREE.Mesh(
        new THREE.TorusGeometry(0.77, 0.055, 8, 18, Math.PI),
        isNewEra ? neonCyanMat : trimMat,
      );
      rib.position.set(0, 0.22, r * 0.65);
      rib.castShadow = true;
      group.add(rib);
    }

    if (isNewEra) {
      const magRail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 1.82), neonCyanMat);
      magRail.position.y = 0.26;
      group.add(magRail);

      const dronePad = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.42, 0.06, 16), trimMat);
      dronePad.position.set(0, 1.02, 0);
      group.add(dronePad);
    } else {
      const tower = new THREE.Mesh(makeBeveledBlock(0.46, 1.65, 0.46, 0.02), stoneMat);
      tower.position.set(-0.56, 0.22, -0.56);
      tower.castShadow = true;
      group.add(tower);

      const clockFace = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16),
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: new THREE.Color(0xfbbf24),
          emissiveIntensity: 0.85,
        }),
      );
      clockFace.rotation.x = Math.PI / 2;
      clockFace.position.set(-0.56, 1.55, -0.31);
      group.add(clockFace);
    }
    return group;
  }

  if (type === 'mall') {
    if (isOldEra) {
      // Old Era Grand Covered Bazaar: Cobblestone Plaza, Enclosed Arched Market Hall + Dome, Grounded Front Gate & Merchant Stalls
      const plaza = new THREE.Mesh(makeBeveledBlock(1.92, 0.14, 1.92, 0.03), stoneMat);
      plaza.castShadow = true;
      plaza.receiveShadow = true;
      group.add(plaza);

      const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b3e1f, roughness: 0.88 });
      const clayMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.88 });
      const warmWinMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: 1.2,
      });

      // Grand Enclosed Rear Market Hall (-Z)
      const backHall = new THREE.Mesh(makeBeveledBlock(1.68, 0.84, 0.7, 0.03), stoneMat);
      backHall.position.set(0, 0.14, -0.48);
      backHall.castShadow = true;
      backHall.receiveShadow = true;
      group.add(backHall);

      const hallRoof = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.12, 0.82), roofAccentMat);
      hallRoof.position.set(0, 1.02, -0.48);
      hallRoof.castShadow = true;
      group.add(hallRoof);

      const domeDrum = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.4, 0.24, 12), stoneMat);
      domeDrum.position.set(0, 1.18, -0.48);
      domeDrum.castShadow = true;
      group.add(domeDrum);

      const domeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.37, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
        roofAccentMat,
      );
      domeCap.position.set(0, 1.3, -0.48);
      domeCap.castShadow = true;
      group.add(domeCap);

      const finial = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.22, 8), trimMat);
      finial.position.set(0, 1.72, -0.48);
      group.add(finial);

      // Glowing arched merchant doorways along back hall facade
      for (let wx = -0.52; wx <= 0.53; wx += 0.52) {
        const shopWin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.44, 0.06), warmWinMat);
        shopWin.position.set(wx, 0.44, -0.11);
        group.add(shopWin);
      }

      // Front Sandstone Bazaar Gateway (Kaman) grounded flush on plaza
      const pillarL = new THREE.Mesh(makeBeveledBlock(0.22, 1.06, 0.22, 0.02), stoneMat);
      pillarL.position.set(-0.44, 0.14, 0.74);
      pillarL.castShadow = true;
      group.add(pillarL);

      const pillarR = new THREE.Mesh(makeBeveledBlock(0.22, 1.06, 0.22, 0.02), stoneMat);
      pillarR.position.set(0.44, 0.14, 0.74);
      pillarR.castShadow = true;
      group.add(pillarR);

      const archLintel = new THREE.Mesh(makeBeveledBlock(1.22, 0.24, 0.26, 0.02), roofAccentMat);
      archLintel.position.set(0, 1.16, 0.74);
      archLintel.castShadow = true;
      group.add(archLintel);

      // Suspended gateway lantern directly attached via bracket rod
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.14, 6), trimMat);
      rod.position.set(0, 1.1, 0.74);
      group.add(rod);

      const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), warmWinMat);
      lantern.position.set(0, 1.0, 0.74);
      group.add(lantern);

      // Twin Covered Side Stalls (Left & Right Courtyard) with 4 grounded corner posts
      const sideSpecs = [
        { x: -0.64, awning: 0x9e342b },
        { x: 0.64, awning: 0x1d635d },
      ];
      for (let s = 0; s < sideSpecs.length; s += 1) {
        const sx = sideSpecs[s].x;
        const counter = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 0.72), woodMat);
        counter.position.set(sx, 0.29, 0.22);
        counter.castShadow = true;
        group.add(counter);

        for (let px = -1; px <= 1; px += 2) {
          for (let pz = -1; pz <= 1; pz += 2) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.68, 6), woodMat);
            pole.position.set(sx + px * 0.19, 0.48, 0.22 + pz * 0.32);
            group.add(pole);
          }
        }

        const canopy = new THREE.Mesh(
          new THREE.BoxGeometry(0.5, 0.06, 0.8),
          new THREE.MeshStandardMaterial({ color: sideSpecs[s].awning, roughness: 0.82 }),
        );
        canopy.position.set(sx, 0.84, 0.22);
        canopy.castShadow = true;
        group.add(canopy);

        const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.045, 0.14, 8), clayMat);
        pot.position.set(sx, 0.51, 0.08);
        group.add(pot);

        const basket = new THREE.Mesh(
          new THREE.CylinderGeometry(0.085, 0.075, 0.1, 8),
          new THREE.MeshStandardMaterial({ color: 0xb88f3d, roughness: 0.88 }),
        );
        basket.position.set(sx, 0.49, 0.35);
        group.add(basket);
      }

      // Central Stone Fountain / Well in Courtyard
      const fountainBase = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.16, 10), stoneMat);
      fountainBase.position.set(0, 0.22, 0.22);
      group.add(fountainBase);
      const waterPool = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.18, 0.04, 10),
        new THREE.MeshStandardMaterial({ color: 0x1e6f8c, roughness: 0.18 }),
      );
      waterPool.position.set(0, 0.29, 0.22);
      group.add(waterPool);

      return group;
    }

    if (isNewEra) {
      // New Era Grand Shopping Mall: Champagne-Silver Facade, Illuminated Amber Retail Windows & Architectural Fascia
      const neonPinkMat = new THREE.MeshStandardMaterial({
        color: 0xbe185d,
        emissive: new THREE.Color(0xdb2777),
        emissiveIntensity: isNight ? 1.1 : 0.32,
        roughness: 0.3,
      });
      const shopGlowMat = new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: new THREE.Color(0xfbbf24),
        emissiveIntensity: isNight ? 0.95 : 0.25,
        roughness: 0.25,
      });
      const mallFacadeMat = new THREE.MeshStandardMaterial({
        color: 0xcfd7e3,
        roughness: 0.45,
        metalness: 0.22,
      });

      const podium = new THREE.Mesh(makeBeveledBlock(1.94, 0.16, 1.94, 0.03), stoneMat);
      podium.castShadow = true;
      podium.receiveShadow = true;
      group.add(podium);

      // Front greenery planter strips beside mall entrance
      for (let px = -1; px <= 1; px += 2) {
        const planter = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.26), foliageMat);
        planter.position.set(px * 0.68, 0.21, 0.72);
        group.add(planter);
      }

      // Main 2-story Mall Complex seated cleanly on podium
      const mainBody = new THREE.Mesh(makeBeveledBlock(1.74, 0.92, 1.32, 0.03), mallFacadeMat);
      mainBody.position.set(0, 0.16, -0.14);
      mainBody.castShadow = true;
      mainBody.receiveShadow = true;
      group.add(mainBody);

      // Illuminated Storefront Window Bays (Lower & Upper Levels)
      const lowerWin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.26, 1.35), shopGlowMat);
      lowerWin.position.set(0, 0.38, -0.14);
      group.add(lowerWin);

      const upperWin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.24, 1.35), glassMat);
      upperWin.position.set(0, 0.78, -0.14);
      group.add(upperWin);

      // Vertical Architectural Frame Pilasters along facade
      for (let vx = -0.78; vx <= 0.79; vx += 0.39) {
        const pilaster = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.92, 1.38), trimMat);
        pilaster.position.set(vx, 0.62, -0.14);
        group.add(pilaster);
      }

      // Front Protruding Glass Entrance Vestibule + Supported Canopy
      const vestibule = new THREE.Mesh(makeBeveledBlock(0.84, 0.56, 0.3, 0.02), glassMat);
      vestibule.position.set(0, 0.16, 0.62);
      vestibule.castShadow = true;
      group.add(vestibule);

      const entranceCanopy = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.07, 0.42), trimMat);
      entranceCanopy.position.set(0, 0.75, 0.68);
      entranceCanopy.castShadow = true;
      group.add(entranceCanopy);

      for (let cx = -1; cx <= 1; cx += 2) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.58, 8), trimMat);
        col.position.set(cx * 0.44, 0.45, 0.84);
        group.add(col);
      }

      // Flush Glowing Mall Facade Marquee Signboard (mounted directly on building front parapet)
      const marqueeBack = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.22, 0.08), trimMat);
      marqueeBack.position.set(0, 0.98, 0.54);
      group.add(marqueeBack);

      const marqueeNeonTop = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.06, 0.09), neonPinkMat);
      marqueeNeonTop.position.set(0, 1.03, 0.55);
      group.add(marqueeNeonTop);

      const marqueeNeonBot = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.05, 0.09), neonCyanMat);
      marqueeNeonBot.position.set(0, 0.93, 0.55);
      group.add(marqueeNeonBot);

      // Flush Rooftop Clerestory + Curved Glass Skylight Barrel Vault
      const roofClerestory = new THREE.Mesh(makeBeveledBlock(1.24, 0.28, 0.92, 0.02), stoneMat);
      roofClerestory.position.set(0, 1.08, -0.14);
      roofClerestory.castShadow = true;
      group.add(roofClerestory);

      const skylightVault = new THREE.Mesh(
        new THREE.CylinderGeometry(0.42, 0.42, 1.12, 14, 1, false, 0, Math.PI),
        glassMat,
      );
      skylightVault.rotation.z = Math.PI / 2;
      skylightVault.position.set(0, 1.36, -0.14);
      group.add(skylightVault);

      for (let rx = -0.45; rx <= 0.46; rx += 0.45) {
        const archRib = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.028, 8, 16, Math.PI), neonCyanMat);
        archRib.rotation.y = Math.PI / 2;
        archRib.position.set(rx, 1.36, -0.14);
        group.add(archRib);
      }

      return group;
    }

    // Eco / Solar Modern Galleria Mall
    const podium = new THREE.Mesh(makeBeveledBlock(1.9, 0.16, 1.9, 0.03), stoneMat);
    podium.castShadow = true;
    podium.receiveShadow = true;
    group.add(podium);

    const hall = new THREE.Mesh(makeBeveledBlock(1.6, 0.9, 1.32, 0.03), glassMat);
    hall.position.set(0, 0.16, -0.1);
    hall.castShadow = true;
    group.add(hall);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.06, 0.34), trimMat);
    canopy.position.set(0, 0.7, 0.66);
    group.add(canopy);

    const roofArch = new THREE.Mesh(
      new THREE.CylinderGeometry(0.54, 0.54, 1.48, 12, 1, false, 0, Math.PI),
      roofAccentMat,
    );
    roofArch.rotation.z = Math.PI / 2;
    roofArch.position.set(0, 1.06, -0.1);
    roofArch.castShadow = true;
    group.add(roofArch);
    return group;
  }

  if (type === 'food_street') {
    // Bustling Culinary Food Street: Grounded Storefronts, Dining Lane & Connected Overhead Lantern Arches
    const deck = new THREE.Mesh(makeBeveledBlock(1.94, 0.12, 1.94, 0.03), stoneMat);
    deck.castShadow = true;
    deck.receiveShadow = true;
    group.add(deck);

    const lanternGlow = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: new THREE.Color(isNewEra ? 0xf97316 : 0xf59e0b),
      emissiveIntensity: isNight ? 1.25 : 0.35,
    });

    if (isOldEra) {
      // Old Era Chai & Tikka Food Street: Cobblestone Center Lane, Twin Terracotta Restaurant Rows & Timber Archway
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c371d, roughness: 0.88 });
      const brickMat = new THREE.MeshStandardMaterial({
        color: 0xa66341,
        map: textures.brickStone,
        roughness: 0.9,
      });
      const emberMat = new THREE.MeshStandardMaterial({
        color: 0xea580c,
        emissive: new THREE.Color(0xd9480f),
        emissiveIntensity: isNight ? 1.35 : 0.6,
      });
      const walkwayMat = new THREE.MeshStandardMaterial({ color: 0x78543d, roughness: 0.9 });

      const walkway = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.025, 1.88), walkwayMat);
      walkway.position.set(0, 0.13, 0);
      walkway.receiveShadow = true;
      group.add(walkway);

      // Left & Right Heritage Restaurant Buildings with Terracotta Roofs + Serving Counters
      const sideConfigs = [
        { x: -0.68, awningA: 0xa64424, awningB: 0x99322b },
        { x: 0.68, awningA: 0xb57a28, awningB: 0x1d635d },
      ];
      for (let s = 0; s < sideConfigs.length; s += 1) {
        const sc = sideConfigs[s];
        const shopBody = new THREE.Mesh(makeBeveledBlock(0.46, 0.68, 1.56, 0.02), brickMat);
        shopBody.position.set(sc.x, 0.12, 0);
        shopBody.castShadow = true;
        group.add(shopBody);

        // Pitched terracotta roof resting cleanly on top of shop walls
        const gableRoof = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.14, 1.64), roofAccentMat);
        gableRoof.position.set(sc.x, 0.86, 0);
        gableRoof.castShadow = true;
        group.add(gableRoof);

        // Dual glowing serving windows & colored awnings facing the central food lane
        const zSplits = [-0.42, 0.42];
        const colors = [sc.awningA, sc.awningB];
        for (let k = 0; k < 2; k += 1) {
          const zPos = zSplits[k];
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.28, 0.48), lanternGlow);
          win.position.set(sc.x > 0 ? sc.x - 0.22 : sc.x + 0.22, 0.52, zPos);
          group.add(win);

          const counter = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.26, 0.56), woodMat);
          counter.position.set(sc.x > 0 ? sc.x - 0.26 : sc.x + 0.26, 0.25, zPos);
          counter.castShadow = true;
          group.add(counter);

          const awning = new THREE.Mesh(
            new THREE.BoxGeometry(0.24, 0.05, 0.58),
            new THREE.MeshStandardMaterial({ color: colors[k], roughness: 0.78 }),
          );
          awning.position.set(sc.x > 0 ? sc.x - 0.28 : sc.x + 0.28, 0.74, zPos);
          awning.rotation.z = sc.x < 0 ? -0.22 : 0.22;
          group.add(awning);

          // Glowing tandoor pot on counter
          const tandoor = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 8), stoneMat);
          tandoor.position.set(sc.x > 0 ? sc.x - 0.27 : sc.x + 0.27, 0.44, zPos);
          group.add(tandoor);
          const ember = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 8), emberMat);
          ember.position.set(sc.x > 0 ? sc.x - 0.27 : sc.x + 0.27, 0.52, zPos);
          group.add(ember);
        }
      }

      // Cozy Wooden Dining Tables & Benches down the center lane
      for (let tz = -0.36; tz <= 0.37; tz += 0.72) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.2, 6), woodMat);
        leg.position.set(0, 0.22, tz);
        group.add(leg);

        const tableTop = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.34), woodMat);
        tableTop.position.set(0, 0.33, tz);
        tableTop.castShadow = true;
        group.add(tableTop);

        const platter = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.03, 8), emberMat);
        platter.position.set(0, 0.36, tz);
        group.add(platter);
      }

      // Grounded Front & Rear Timber Entrance Arches + Attached Hanging Lanterns
      const archZs = [-0.74, 0.74];
      for (let a = 0; a < archZs.length; a += 1) {
        const az = archZs[a];
        for (let px = -1; px <= 1; px += 2) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 1.12, 6), woodMat);
          post.position.set(px * 0.42, 0.68, az);
          group.add(post);
        }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.08, 0.08), woodMat);
        beam.position.set(0, 1.22, az);
        beam.castShadow = true;
        group.add(beam);

        for (let lx = -0.24; lx <= 0.25; lx += 0.24) {
          const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 4), trimMat);
          cord.position.set(lx, 1.15, az);
          group.add(cord);
          const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), lanternGlow);
          bulb.position.set(lx, 1.07, az);
          group.add(bulb);
        }
      }
      return group;
    }

    if (isNewEra) {
      // New Era Modern Neon Food Street Promenade: Sleek Side Kitchen Pavilions, Grounded Bistro Umbrellas & Connected Light Arches
      const neonOrange = new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: new THREE.Color(0xf97316),
        emissiveIntensity: 1.4,
      });
      const neonPink = new THREE.MeshStandardMaterial({
        color: 0xf472b6,
        emissive: new THREE.Color(0xec4899),
        emissiveIntensity: 1.35,
      });

      // Glowing inlaid central promenade stripe
      const walkway = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.02, 1.84), trimMat);
      walkway.position.set(0, 0.13, 0);
      group.add(walkway);

      const centerLine = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.025, 1.8), neonCyanMat);
      centerLine.position.set(0, 0.135, 0);
      group.add(centerLine);

      // Left & Right Sleek Glass-and-Steel Street-Food Kitchen Rows
      const sideRows = [
        { x: -0.68, signA: neonOrange, signB: neonPink },
        { x: 0.68, signA: neonCyanMat, signB: neonOrange },
      ];
      for (let s = 0; s < sideRows.length; s += 1) {
        const sr = sideRows[s];
        const pavilion = new THREE.Mesh(makeBeveledBlock(0.46, 0.7, 1.56, 0.02), stoneMat);
        pavilion.position.set(sr.x, 0.12, 0);
        pavilion.castShadow = true;
        group.add(pavilion);

        const roof = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 1.66), glassMat);
        roof.position.set(sr.x > 0 ? sr.x - 0.04 : sr.x + 0.04, 0.85, 0);
        roof.castShadow = true;
        group.add(roof);

        const signs = [sr.signA, sr.signB];
        const zPosList = [-0.42, 0.42];
        for (let k = 0; k < 2; k += 1) {
          const zp = zPosList[k];
          const counter = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.52), trimMat);
          counter.position.set(sr.x > 0 ? sr.x - 0.26 : sr.x + 0.26, 0.26, zp);
          group.add(counter);

          const windowGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.26, 0.48), lanternGlow);
          windowGlow.position.set(sr.x > 0 ? sr.x - 0.23 : sr.x + 0.23, 0.56, zp);
          group.add(windowGlow);

          // Flush fascia neon signboard attached directly on canopy edge
          const menuSign = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.12, 0.58), signs[k]);
          menuSign.position.set(sr.x > 0 ? sr.x - 0.32 : sr.x + 0.32, 0.86, zp);
          group.add(menuSign);
        }
      }

      // Grounded Bistro Tables & Connected Patio Umbrellas down the center promenade
      for (let uz = -0.35; uz <= 0.36; uz += 0.7) {
        const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.54, 8), trimMat);
        stem.position.set(0, 0.39, uz);
        group.add(stem);

        const table = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.035, 10), glassMat);
        table.position.set(0, 0.34, uz);
        group.add(table);

        const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.11, 8), neonOrange);
        umbrella.position.set(0, 0.68, uz);
        umbrella.castShadow = true;
        group.add(umbrella);
      }

      // Grounded Corner Light Columns + Connected Overhead Beam & Globe Lanterns
      const gantryZs = [-0.72, 0.72];
      for (let g = 0; g < gantryZs.length; g += 1) {
        const gz = gantryZs[g];
        for (let px = -1; px <= 1; px += 2) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 1.12, 8), trimMat);
          post.position.set(px * 0.44, 0.68, gz);
          group.add(post);
        }
        const beam = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.06, 0.07), neonPink);
        beam.position.set(0, 1.24, gz);
        group.add(beam);

        for (let lx = -0.24; lx <= 0.25; lx += 0.24) {
          const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 4), trimMat);
          stem.position.set(lx, 1.18, gz);
          group.add(stem);
          const globe = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), lanternGlow);
          globe.position.set(lx, 1.1, gz);
          group.add(globe);
        }
      }
      return group;
    }

    // Eco / Solar Cafe Food Street
    const timberMat = new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.85 });
    for (let sx = -0.66; sx <= 0.67; sx += 1.32) {
      const kiosk = new THREE.Mesh(makeBeveledBlock(0.46, 0.62, 1.48, 0.02), stoneMat);
      kiosk.position.set(sx, 0.12, 0);
      kiosk.castShadow = true;
      group.add(kiosk);
      const awning = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.06, 1.54), roofAccentMat);
      awning.position.set(sx, 0.76, 0);
      group.add(awning);
    }
    for (let uz = -0.38; uz <= 0.39; uz += 0.76) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 0.48, 6), timberMat);
      stem.position.set(0, 0.36, uz);
      group.add(stem);
      const table = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 8), timberMat);
      table.position.set(0, 0.32, uz);
      group.add(table);
      const umbrella = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.1, 8), roofAccentMat);
      umbrella.position.set(0, 0.62, uz);
      group.add(umbrella);
    }
    return group;
  }

  if (type === 'tree_garden') {
    // Realistic Multi-Species Trees & Flowering Grove (natural forest floor & botanical canopy greens)
    const gardenSoil = new THREE.Mesh(
      makeBeveledBlock(1.88, 0.08, 1.88, 0.025),
      new THREE.MeshStandardMaterial({
        color: 0x3b5932,
        map: textures.grassGround,
        roughness: 0.94,
      }),
    );
    gardenSoil.receiveShadow = true;
    group.add(gardenSoil);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4d321d, roughness: 0.94 });
    const leafDark = new THREE.MeshStandardMaterial({ color: 0x203b23, roughness: 0.86 });
    const leafMid = new THREE.MeshStandardMaterial({ color: 0x2d5230, roughness: 0.84 });
    const leafBright = new THREE.MeshStandardMaterial({ color: 0x3c663d, roughness: 0.82 });

    // 3 lush layered shade trees
    const oakSpecs: Array<[number, number, number]> = [
      [-0.46, -0.42, 1.15],
      [0.48, -0.28, 0.98],
      [-0.18, 0.48, 1.05],
    ];
    for (let t = 0; t < oakSpecs.length; t += 1) {
      const [tx, tz, sc] = oakSpecs[t];
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * sc, 0.09 * sc, 0.52 * sc, 7), trunkMat);
      trunk.position.set(tx, 0.08 + 0.26 * sc, tz);
      trunk.castShadow = true;
      group.add(trunk);

      const cMat = t === 0 ? leafDark : t === 1 ? leafMid : leafBright;
      const puffA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28 * sc, 1), cMat);
      puffA.position.set(tx, 0.08 + 0.62 * sc, tz);
      puffA.castShadow = true;
      group.add(puffA);

      const puffB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.21 * sc, 1), leafBright);
      puffB.position.set(tx + 0.14 * sc, 0.08 + 0.54 * sc, tz + 0.1 * sc);
      puffB.castShadow = true;
      group.add(puffB);

      const puffC = new THREE.Mesh(new THREE.DodecahedronGeometry(0.19 * sc, 1), leafMid);
      puffC.position.set(tx - 0.13 * sc, 0.08 + 0.56 * sc, tz - 0.09 * sc);
      group.add(puffC);
    }

    // Tall Palm Tree for oasis / botanical variety
    const palmTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.075, 0.95, 7), trunkMat);
    palmTrunk.position.set(0.46, 0.55, 0.42);
    palmTrunk.rotation.z = -0.1;
    palmTrunk.castShadow = true;
    group.add(palmTrunk);

    for (let f = 0; f < 6; f += 1) {
      const angle = (f / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.025, 0.44), leafBright);
      frond.position.set(
        0.5 + Math.sin(angle) * 0.2,
        0.99,
        0.42 + Math.cos(angle) * 0.2,
      );
      frond.rotation.y = angle;
      frond.rotation.x = 0.28;
      group.add(frond);
    }

    // Natural Flowering Shrubs
    const flowerPalette = [0xa8384a, 0xc7922e, 0x914b76, 0x3b6e8c, 0xb85e2a];
    const shrubCoords: Array<[number, number]> = [
      [-0.58, 0.24],
      [0.12, -0.62],
      [0.24, 0.18],
      [-0.08, -0.14],
      [0.64, 0.08],
    ];
    for (let b = 0; b < shrubCoords.length; b += 1) {
      const [bx, bz] = shrubCoords[b];
      const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.11, 1), leafMid);
      bush.position.set(bx, 0.14, bz);
      group.add(bush);
      const bloom = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 6, 6),
        new THREE.MeshStandardMaterial({ color: flowerPalette[b % flowerPalette.length], roughness: 0.72 }),
      );
      bloom.position.set(bx, 0.22, bz);
      group.add(bloom);
    }
    return group;
  }

  if (type === 'farm') {
    // Rich Dairy & Wheat Farm with Barn/Bio-Dome, Silo, Crop Rows + 3D Cows & Goats
    const pastureBase = new THREE.Mesh(
      makeBeveledBlock(1.94, 0.1, 1.94, 0.025),
      new THREE.MeshStandardMaterial({
        color: 0x456134,
        map: textures.grassGround,
        roughness: 0.94,
      }),
    );
    pastureBase.receiveShadow = true;
    group.add(pastureBase);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a20, roughness: 0.9 });
    const wheatMat = new THREE.MeshStandardMaterial({ color: 0xb59138, roughness: 0.86 });
    const soilMat = new THREE.MeshStandardMaterial({ color: 0x4d3420, roughness: 0.95 });

    // 4 Ploughed Wheat Crop Rows on left half
    for (let r = 0; r < 4; r += 1) {
      const rx = -0.74 + r * 0.19;
      const soilRow = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.03, 0.86), soilMat);
      soilRow.position.set(rx, 0.115, 0.42);
      group.add(soilRow);

      const cropRow = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.14, 0.8), wheatMat);
      cropRow.position.set(rx, 0.18, 0.42);
      cropRow.castShadow = true;
      group.add(cropRow);
    }

    // Barn (Old Era Weathered Red Timber Barn / New Era Bio-Dairy Dome) + Tall Grain Silo
    if (isNewEra) {
      const bioDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        glassMat,
      );
      bioDome.position.set(-0.42, 0.1, -0.45);
      bioDome.castShadow = true;
      group.add(bioDome);

      const ringBase = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.48, 0.14, 12), stoneMat);
      ringBase.position.set(-0.42, 0.17, -0.45);
      group.add(ringBase);
    } else {
      const barnBody = new THREE.Mesh(
        makeBeveledBlock(0.72, 0.56, 0.62, 0.02),
        new THREE.MeshStandardMaterial({ color: 0x852921, map: textures.brickStone, roughness: 0.86 }),
      );
      barnBody.position.set(-0.44, 0.1, -0.48);
      barnBody.castShadow = true;
      group.add(barnBody);

      const barnRoof = new THREE.Mesh(
        new THREE.ConeGeometry(0.56, 0.36, 4),
        new THREE.MeshStandardMaterial({ color: 0x4f2c19, roughness: 0.88 }),
      );
      barnRoof.rotation.y = Math.PI / 4;
      barnRoof.position.set(-0.44, 0.84, -0.48);
      barnRoof.castShadow = true;
      group.add(barnRoof);

      const barnDoor = new THREE.Mesh(
        new THREE.BoxGeometry(0.26, 0.36, 0.04),
        new THREE.MeshStandardMaterial({ color: 0xd9cdb8, roughness: 0.85 }),
      );
      barnDoor.position.set(-0.44, 0.3, -0.16);
      group.add(barnDoor);
    }

    // Silo next to Barn
    const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.88, 10), stoneMat);
    silo.position.set(-0.02, 0.54, -0.58);
    silo.castShadow = true;
    group.add(silo);
    const siloDome = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), trimMat);
    siloDome.position.set(-0.02, 0.98, -0.58);
    group.add(siloDome);

    // Fenced Pasture Pen on Right Half
    const fenceBars: Array<[number, number, number, number]> = [
      [0.48, -0.82, 0.86, 0.04],
      [0.48, 0.82, 0.86, 0.04],
      [0.89, 0, 0.04, 1.66],
      [0.06, 0.35, 0.04, 0.94],
    ];
    for (let f = 0; f < fenceBars.length; f += 1) {
      const [fx, fz, fw, fd] = fenceBars[f];
      const rail = new THREE.Mesh(new THREE.BoxGeometry(fw, 0.14, fd), woodMat);
      rail.position.set(fx, 0.19, fz);
      group.add(rail);
    }

    // Helper: 3D Spotted Dairy Cow
    const addCow = (cx: number, cz: number, rotY: number) => {
      const cow = new THREE.Group();
      const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.72 });
      const spotMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78 });
      const hornMat = new THREE.MeshStandardMaterial({ color: 0xfde68a, roughness: 0.65 });

      const body = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.28), whiteMat);
      body.position.y = 0.15;
      body.castShadow = true;
      cow.add(body);

      const spot = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.09, 0.11), spotMat);
      spot.position.set(0, 0.17, -0.02);
      cow.add(spot);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.1, 0.12), whiteMat);
      head.position.set(0, 0.21, 0.18);
      cow.add(head);

      const snout = new THREE.Mesh(
        new THREE.BoxGeometry(0.09, 0.055, 0.05),
        new THREE.MeshStandardMaterial({ color: 0xfda4af, roughness: 0.75 }),
      );
      snout.position.set(0, 0.18, 0.25);
      cow.add(snout);

      for (let h = -1; h <= 1; h += 2) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 5), hornMat);
        horn.position.set(h * 0.05, 0.27, 0.17);
        cow.add(horn);
      }
      const legOffsets: Array<[number, number]> = [
        [-0.05, 0.09],
        [0.05, 0.09],
        [-0.05, -0.09],
        [0.05, -0.09],
      ];
      for (let l = 0; l < legOffsets.length; l += 1) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.035), whiteMat);
        leg.position.set(legOffsets[l][0], 0.05, legOffsets[l][1]);
        cow.add(leg);
      }
      cow.position.set(cx, 0.1, cz);
      cow.rotation.y = rotY;
      group.add(cow);
    };

    // Helper: 3D Goat (Cream / Caramel)
    const addGoat = (gx: number, gz: number, rotY: number, coatHex: number) => {
      const goat = new THREE.Group();
      const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.8 });
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.2), coatMat);
      body.position.y = 0.11;
      body.castShadow = true;
      goat.add(body);

      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.06), coatMat);
      neck.position.set(0, 0.16, 0.1);
      neck.rotation.x = 0.25;
      goat.add(neck);

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.09), coatMat);
      head.position.set(0, 0.2, 0.13);
      goat.add(head);

      for (let h = -1; h <= 1; h += 2) {
        const horn = new THREE.Mesh(
          new THREE.ConeGeometry(0.012, 0.06, 5),
          new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.7 }),
        );
        horn.position.set(h * 0.025, 0.25, 0.11);
        horn.rotation.x = -0.35;
        goat.add(horn);
      }
      const legPos: Array<[number, number]> = [
        [-0.03, 0.07],
        [0.03, 0.07],
        [-0.03, -0.07],
        [0.03, -0.07],
      ];
      for (let l = 0; l < legPos.length; l += 1) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.08, 0.025), coatMat);
        leg.position.set(legPos[l][0], 0.04, legPos[l][1]);
        goat.add(leg);
      }
      goat.position.set(gx, 0.1, gz);
      goat.rotation.y = rotY;
      group.add(goat);
    };

    addCow(0.46, -0.36, 0.6);
    addCow(0.54, 0.34, -1.2);
    addGoat(0.32, 0.04, 2.2, 0xfef3c7);
    addGoat(0.68, -0.04, -0.5, 0xd6a676);

    // Watering Trough
    const trough = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.09, 0.14), woodMat);
    trough.position.set(0.48, 0.145, 0.62);
    group.add(trough);
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.02, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.15 }),
    );
    water.position.set(0.48, 0.185, 0.62);
    group.add(water);
    return group;
  }

  if (type === 'milk_shop') {
    // Charming Fresh Milk Shop with Giant Milk Bottle Roof Sign, Silver Milk Cans & Counter
    const patio = new THREE.Mesh(makeBeveledBlock(1.88, 0.12, 1.88, 0.03), stoneMat);
    patio.receiveShadow = true;
    patio.castShadow = true;
    group.add(patio);

    const shopCreamMat = new THREE.MeshStandardMaterial({
      color: isNewEra ? 0xe6ecf2 : 0xebe3d0,
      map: textures.brickStone,
      roughness: 0.72,
    });
    const dairyBlueMat = new THREE.MeshStandardMaterial({
      color: isNewEra ? 0x1d5f8c : 0x2a668a,
      roughness: 0.46,
    });
    const metalCanMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.22,
      metalness: 0.85,
    });

    const shopBody = new THREE.Mesh(makeBeveledBlock(1.28, 0.88, 1.04, 0.03), shopCreamMat);
    shopBody.position.set(0, 0.12, -0.18);
    shopBody.castShadow = true;
    group.add(shopBody);

    // Striped Dairy Roof & Awning
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.14, 1.16), dairyBlueMat);
    roof.position.set(0, 1.06, -0.18);
    roof.castShadow = true;
    group.add(roof);

    const awning = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.07, 0.42), dairyBlueMat);
    awning.position.set(0, 0.78, 0.48);
    awning.rotation.x = 0.24;
    awning.castShadow = true;
    group.add(awning);

    // Glowing Shop Window & Counter
    const windowPanel = new THREE.Mesh(
      new THREE.BoxGeometry(0.84, 0.34, 0.05),
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: new THREE.Color(0xf59e0b),
        emissiveIntensity: isNight ? 0.85 : 0.2,
      }),
    );
    windowPanel.position.set(0, 0.54, 0.34);
    group.add(windowPanel);

    const counter = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.24, 0.24), trimMat);
    counter.position.set(0, 0.24, 0.44);
    counter.castShadow = true;
    group.add(counter);

    // Silver Milk Cans lined up outside shop ready for delivery
    for (let m = -0.42; m <= 0.43; m += 0.28) {
      const can = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 0.22, 10), metalCanMat);
      can.position.set(m, 0.23, 0.68);
      can.castShadow = true;
      group.add(can);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 10), dairyBlueMat);
      lid.position.set(m, 0.35, 0.68);
      group.add(lid);
    }

    // Iconic Giant 3D Milk Bottle Sign mounted cleanly on rooftop
    const bottleMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      roughness: 0.24,
      metalness: 0.08,
    });
    const bottleBody = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.44, 14), bottleMat);
    bottleBody.position.set(0, 1.35, -0.18);
    bottleBody.castShadow = true;
    group.add(bottleBody);

    const bottleNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.16, 0.18, 14), bottleMat);
    bottleNeck.position.set(0, 1.65, -0.18);
    group.add(bottleNeck);

    const bottleCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.07, 12), dairyBlueMat);
    bottleCap.position.set(0, 1.77, -0.18);
    group.add(bottleCap);

    return group;
  }

  if (type === 'zoo') {
    // Wildlife Zoo Park: Natural Sanctuary Turf, Timber Fence, Entrance Archway, Pond & Realistic Animals
    const lawn = new THREE.Mesh(
      makeBeveledBlock(1.94, 0.1, 1.94, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0x3b5933,
        map: textures.grassGround,
        roughness: 0.92,
      }),
    );
    lawn.receiveShadow = true;
    group.add(lawn);

    const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.88 });
    const glassFenceMat = isNewEra ? glassMat : woodMat;

    // Perimeter Safari Fence + Front Entrance Arch
    const walls: Array<[number, number, number, number]> = [
      [0, -0.88, 1.78, 0.05],
      [-0.88, 0, 0.05, 1.78],
      [0.88, 0, 0.05, 1.78],
      [-0.58, 0.88, 0.6, 0.05],
      [0.58, 0.88, 0.6, 0.05],
    ];
    for (let w = 0; w < walls.length; w += 1) {
      const [wx, wz, ww, wd] = walls[w];
      const rail = new THREE.Mesh(new THREE.BoxGeometry(ww, 0.18, wd), glassFenceMat);
      rail.position.set(wx, 0.19, wz);
      group.add(rail);
    }

    // Zoo Archway Pillars & Signbeam
    for (let px = -1; px <= 1; px += 2) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.64, 0.12), stoneMat);
      pillar.position.set(px * 0.28, 0.42, 0.86);
      pillar.castShadow = true;
      group.add(pillar);
    }
    const archBeam = new THREE.Mesh(
      new THREE.BoxGeometry(0.74, 0.14, 0.12),
      isNewEra ? neonCyanMat : new THREE.MeshStandardMaterial({ color: 0xa67732, roughness: 0.62 }),
    );
    archBeam.position.set(0, 0.78, 0.86);
    archBeam.castShadow = true;
    group.add(archBeam);

    // Blue Watering Pond
    const pond = new THREE.Mesh(
      new THREE.CylinderGeometry(0.34, 0.38, 0.03, 14),
      new THREE.MeshPhysicalMaterial({ color: 0x195e7d, roughness: 0.14, clearcoat: 0.85 }),
    );
    pond.position.set(-0.36, 0.115, 0.32);
    group.add(pond);

    // Shade Tree inside Zoo
    const zTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.5, 6), woodMat);
    zTrunk.position.set(0.58, 0.35, -0.58);
    group.add(zTrunk);
    const zCrown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 1), foliageMat);
    zCrown.position.set(0.58, 0.7, -0.58);
    zCrown.castShadow = true;
    group.add(zCrown);

    // 1. Stylized 3D Elephant
    const elephant = new THREE.Group();
    const eleMat = new THREE.MeshStandardMaterial({ color: 0x6f7680, roughness: 0.86 });
    const eleBody = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.36), eleMat);
    eleBody.position.y = 0.22;
    eleBody.castShadow = true;
    elephant.add(eleBody);
    const eleHead = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.18, 0.18), eleMat);
    eleHead.position.set(0, 0.28, 0.22);
    elephant.add(eleHead);
    const eleTrunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.025, 0.24, 8), eleMat);
    eleTrunk.position.set(0, 0.19, 0.34);
    eleTrunk.rotation.x = 0.35;
    elephant.add(eleTrunk);
    for (let s = -1; s <= 1; s += 2) {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.14), eleMat);
      ear.position.set(s * 0.13, 0.29, 0.2);
      ear.rotation.y = s * 0.35;
      elephant.add(ear);
      const tusk = new THREE.Mesh(
        new THREE.ConeGeometry(0.015, 0.12, 6),
        new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.3 }),
      );
      tusk.rotation.x = Math.PI / 2;
      tusk.position.set(s * 0.06, 0.21, 0.33);
      elephant.add(tusk);
    }
    const eleLegs: Array<[number, number]> = [
      [-0.08, 0.12],
      [0.08, 0.12],
      [-0.08, -0.12],
      [0.08, -0.12],
    ];
    for (let l = 0; l < eleLegs.length; l += 1) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.14, 7), eleMat);
      leg.position.set(eleLegs[l][0], 0.07, eleLegs[l][1]);
      elephant.add(leg);
    }
    elephant.scale.setScalar(1.22);
    elephant.position.set(-0.38, 0.1, -0.36);
    elephant.rotation.y = 0.45;
    group.add(elephant);

    // 2. Stylized 3D Tall Giraffe
    const giraffe = new THREE.Group();
    const girMat = new THREE.MeshStandardMaterial({ color: 0xcfa03e, roughness: 0.84 });
    const girSpot = new THREE.MeshStandardMaterial({ color: 0x6b3a19, roughness: 0.9 });
    const girBody = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.24), girMat);
    girBody.position.y = 0.24;
    girBody.castShadow = true;
    giraffe.add(girBody);
    const girNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.38, 7), girMat);
    girNeck.position.set(0, 0.44, 0.1);
    girNeck.rotation.x = 0.18;
    girNeck.castShadow = true;
    giraffe.add(girNeck);
    const girHead = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.12), girMat);
    girHead.position.set(0, 0.62, 0.16);
    giraffe.add(girHead);
    const girPatch = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.07, 0.09), girSpot);
    girPatch.position.set(0, 0.25, 0);
    giraffe.add(girPatch);
    for (let l = 0; l < 4; l += 1) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.2, 0.028), girMat);
      leg.position.set(l % 2 === 0 ? -0.045 : 0.045, 0.1, l < 2 ? 0.09 : -0.09);
      giraffe.add(leg);
    }
    giraffe.scale.setScalar(1.18);
    giraffe.position.set(0.24, 0.1, -0.44);
    giraffe.rotation.y = -0.55;
    group.add(giraffe);

    // 3. Stylized 3D Golden Lion with Mane
    const lion = new THREE.Group();
    const lionFur = new THREE.MeshStandardMaterial({ color: 0xb87b2c, roughness: 0.82 });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x4f2912, roughness: 0.9 });
    const lionBody = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), lionFur);
    lionBody.position.y = 0.11;
    lionBody.castShadow = true;
    lion.add(lionBody);
    const mane = new THREE.Mesh(new THREE.DodecahedronGeometry(0.095, 1), maneMat);
    mane.position.set(0, 0.16, 0.11);
    lion.add(mane);
    const lionHead = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), lionFur);
    lionHead.position.set(0, 0.16, 0.14);
    lion.add(lionHead);
    for (let l = 0; l < 4; l += 1) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.08, 0.028), lionFur);
      leg.position.set(l % 2 === 0 ? -0.04 : 0.04, 0.04, l < 2 ? 0.07 : -0.07);
      lion.add(leg);
    }
    lion.scale.setScalar(1.22);
    lion.position.set(0.42, 0.1, 0.36);
    lion.rotation.y = -0.9;
    group.add(lion);

    // 4. Stylized 3D Striped Zebra
    const zebra = new THREE.Group();
    const zebWhite = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.78 });
    const zebBlack = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.86 });
    const zebBody = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.26), zebWhite);
    zebBody.position.y = 0.19;
    zebBody.castShadow = true;
    zebra.add(zebBody);
    for (let s = -1; s <= 1; s += 1) {
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.138, 0.136, 0.036), zebBlack);
      stripe.position.set(0, 0.19, s * 0.075);
      zebra.add(stripe);
    }
    const zebNeck = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.14, 0.075), zebWhite);
    zebNeck.position.set(0, 0.28, 0.12);
    zebNeck.rotation.x = 0.35;
    zebra.add(zebNeck);
    const zebMane = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.14, 0.03), zebBlack);
    zebMane.position.set(0, 0.30, 0.085);
    zebMane.rotation.x = 0.35;
    zebra.add(zebMane);
    const zebHead = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.065, 0.12), zebWhite);
    zebHead.position.set(0, 0.34, 0.18);
    zebHead.rotation.x = 0.2;
    zebra.add(zebHead);
    const zebMuzzle = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.06, 0.045), zebBlack);
    zebMuzzle.position.set(0, 0.325, 0.235);
    zebra.add(zebMuzzle);
    for (let l = 0; l < 4; l += 1) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.14, 0.032), zebWhite);
      leg.position.set(l % 2 === 0 ? -0.045 : 0.045, 0.07, l < 2 ? 0.09 : -0.09);
      zebra.add(leg);
    }
    zebra.scale.setScalar(1.18);
    zebra.position.set(0.46, 0.1, -0.06);
    zebra.rotation.y = -0.65;
    group.add(zebra);

    return group;
  }

  if (type === 'pyramid') {
    if (isNewEra) {
      // New Era: Iconic Architectural Glass & Brass Pyramid Landmark
      const dais = new THREE.Mesh(makeBeveledBlock(1.94, 0.16, 1.94, 0.03), stoneMat);
      dais.receiveShadow = true;
      dais.castShadow = true;
      group.add(dais);

      const glassPyrMat = new THREE.MeshPhysicalMaterial({
        color: 0x4b87ad,
        emissive: new THREE.Color(era.accentHex),
        emissiveIntensity: isNight ? 0.35 : 0.06,
        roughness: 0.12,
        metalness: 0.48,
        clearcoat: 1,
        transparent: true,
        opacity: 0.92,
      });

      const pyr = new THREE.Mesh(new THREE.ConeGeometry(1.14, 1.85, 4), glassPyrMat);
      pyr.rotation.y = Math.PI / 4;
      pyr.position.y = 1.08;
      pyr.castShadow = true;
      group.add(pyr);

      // Brushed golden solar apex
      const apex = new THREE.Mesh(
        new THREE.ConeGeometry(0.28, 0.46, 4),
        new THREE.MeshStandardMaterial({
          color: 0xd4a437,
          emissive: new THREE.Color(0xd97706),
          emissiveIntensity: isNight ? 0.7 : 0.12,
          metalness: 0.85,
          roughness: 0.24,
        }),
      );
      apex.rotation.y = Math.PI / 4;
      apex.position.y = 1.82;
      group.add(apex);

      const glowRing = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.05, 1.62), neonCyanMat);
      glowRing.position.y = 0.18;
      group.add(glowRing);
      return group;
    }

    // Old Era: Iconic Stepped Limestone & Sandstone Giza Pyramid with Palm Oasis & Obelisks
    const sandDais = new THREE.Mesh(
      makeBeveledBlock(1.94, 0.1, 1.94, 0.03),
      new THREE.MeshStandardMaterial({
        color: 0xcab182,
        map: textures.sandGround,
        roughness: 0.94,
      }),
    );
    sandDais.receiveShadow = true;
    group.add(sandDais);

    const sandstoneMat = new THREE.MeshStandardMaterial({
      color: 0xc2a167,
      map: textures.brickStone,
      roughness: 0.9,
      metalness: 0.03,
    });
    const goldCapMat = new THREE.MeshStandardMaterial({
      color: 0xd4a437,
      roughness: 0.28,
      metalness: 0.82,
    });

    // Stepped pyramid tiers for authentic ancient monument silhouette
    const tierWidths = [1.56, 1.24, 0.92, 0.6];
    for (let t = 0; t < tierWidths.length; t += 1) {
      const w = tierWidths[t];
      const tier = new THREE.Mesh(new THREE.BoxGeometry(w, 0.34, w), sandstoneMat);
      tier.position.y = 0.27 + t * 0.33;
      tier.castShadow = true;
      tier.receiveShadow = true;
      group.add(tier);
    }

    // Golden Pyramidion Cap
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.45, 4), goldCapMat);
    cap.rotation.y = Math.PI / 4;
    cap.position.y = 1.63;
    cap.castShadow = true;
    group.add(cap);

    // Entrance Stone Portal & Twin Obelisks
    const portal = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.32, 0.18),
      new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 }),
    );
    portal.position.set(0, 0.26, 0.78);
    group.add(portal);

    for (let ox = -1; ox <= 1; ox += 2) {
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.07, 0.46, 4), sandstoneMat);
      obelisk.rotation.y = Math.PI / 4;
      obelisk.position.set(ox * 0.46, 0.33, 0.76);
      obelisk.castShadow = true;
      group.add(obelisk);
    }

    // Oasis Palm Trees flanking the Pyramid
    const pTrunkMat = new THREE.MeshStandardMaterial({ color: 0x784b2a, roughness: 0.9 });
    const pCorners: Array<[number, number]> = [
      [-0.78, 0.76],
      [0.78, 0.76],
    ];
    for (let pc = 0; pc < pCorners.length; pc += 1) {
      const [px, pz] = pCorners[pc];
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.055, 0.56, 6), pTrunkMat);
      trunk.position.set(px, 0.38, pz);
      group.add(trunk);
      const fronds = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.18, 6), foliageMat);
      fronds.position.set(px, 0.68, pz);
      group.add(fronds);
    }
    return group;
  }

  // portal_nexus
  if (isOldEra) {
    // Old Era: Grand Royal Castle Keep with 4 Turrets, Battlements, Gatehouse & Flag
    const courtyard = new THREE.Mesh(makeBeveledBlock(1.88, 0.18, 1.88, 0.03), stoneMat);
    courtyard.castShadow = true;
    courtyard.receiveShadow = true;
    group.add(courtyard);

    // 4 stone curtain walls
    const wallNS = new THREE.BoxGeometry(1.52, 0.72, 0.16);
    const wallEW = new THREE.BoxGeometry(0.16, 0.72, 1.52);
    const northWall = new THREE.Mesh(wallNS, stoneMat);
    northWall.position.set(0, 0.52, -0.72);
    northWall.castShadow = true;
    group.add(northWall);

    const southWall = new THREE.Mesh(wallNS, stoneMat);
    southWall.position.set(0, 0.52, 0.72);
    southWall.castShadow = true;
    group.add(southWall);

    const westWall = new THREE.Mesh(wallEW, stoneMat);
    westWall.position.set(-0.72, 0.52, 0);
    westWall.castShadow = true;
    group.add(westWall);

    const eastWall = new THREE.Mesh(wallEW, stoneMat);
    eastWall.position.set(0.72, 0.52, 0);
    eastWall.castShadow = true;
    group.add(eastWall);

    // Oak gatehouse door
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.52, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 }),
    );
    gate.position.set(0, 0.42, 0.74);
    group.add(gate);

    // 4 Corner Round Turrets with Conical Roofs
    const corners: Array<[number, number]> = [
      [-0.74, -0.74],
      [0.74, -0.74],
      [-0.74, 0.74],
      [0.74, 0.74],
    ];
    for (let c = 0; c < corners.length; c += 1) {
      const [cx, cz] = corners[c];
      const turret = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.35, 10), stoneMat);
      turret.position.set(cx, 0.84, cz);
      turret.castShadow = true;
      group.add(turret);

      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.28, 0.46, 10), roofAccentMat);
      cone.position.set(cx, 1.72, cz);
      cone.castShadow = true;
      group.add(cone);
    }

    // Central Grand Keep Tower + Royal Spire & Banner
    const keep = new THREE.Mesh(makeBeveledBlock(0.84, 2.05, 0.84, 0.03), stoneMat);
    keep.position.y = 0.18;
    keep.castShadow = true;
    group.add(keep);

    const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(0.64, 0.72, 4), roofAccentMat);
    keepRoof.rotation.y = Math.PI / 4;
    keepRoof.position.y = 2.58;
    keepRoof.castShadow = true;
    group.add(keepRoof);

    const flagpole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.68, 6), trimMat);
    flagpole.position.y = 3.16;
    group.add(flagpole);

    const banner = new THREE.Mesh(
      new THREE.BoxGeometry(0.36, 0.18, 0.03),
      new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.7 }),
    );
    banner.position.set(0.18, 3.36, 0);
    group.add(banner);
    return group;
  }

  // Modern / New Era Parallel Rift Nexus / Quantum Warp Gate
  const dais = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.96, 0.22, 8), stoneMat);
  dais.position.y = 0.11;
  dais.castShadow = true;
  dais.receiveShadow = true;
  group.add(dais);

  const ringMatA = new THREE.MeshStandardMaterial({
    color: new THREE.Color(era.portalColorA),
    emissive: new THREE.Color(era.portalColorA),
    emissiveIntensity: 0.85,
    roughness: 0.22,
    metalness: 0.85,
  });
  const ringMatB = new THREE.MeshStandardMaterial({
    color: new THREE.Color(era.portalColorB),
    emissive: new THREE.Color(era.portalColorB),
    emissiveIntensity: 0.95,
    roughness: 0.22,
    metalness: 0.85,
  });

  // 4 buttress pylons
  for (let p = 0; p < 4; p += 1) {
    const angle = (p * Math.PI) / 2 + Math.PI / 4;
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.55, 0.18), trimMat);
    pylon.position.set(Math.cos(angle) * 0.7, 0.95, Math.sin(angle) * 0.7);
    pylon.lookAt(0, 0.95, 0);
    pylon.castShadow = true;
    group.add(pylon);
  }

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.055, 12, 32), ringMatA);
  outerRing.position.y = 1.48;
  group.add(outerRing);
  animHandles.portalRings.push(outerRing);

  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 12, 28), ringMatB);
  innerRing.position.y = 1.48;
  innerRing.rotation.y = Math.PI / 2;
  group.add(innerRing);
  animHandles.portalRings.push(innerRing);

  const riftCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 12),
    new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: new THREE.Color(era.portalColorB),
      emissiveIntensity: 1.4,
      roughness: 0.12,
      metalness: 0.2,
    }),
  );
  riftCore.position.y = 1.48;
  group.add(riftCore);
  animHandles.portalCores.push(riftCore);

  return group;
}

export function createVehicleGroup(colorHex: number, eraId: WorldEra = 'eco_arcology'): THREE.Group {
  const g = new THREE.Group();

  if (eraId === 'prime_classical') {
    // Old Era: Horse-Drawn Wooden Carriage (facing +Z forward)
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c4a26, roughness: 0.82 });
    const coachMat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.55, metalness: 0.15 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.88 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x452611, roughness: 0.85 });
    const horseMat = new THREE.MeshStandardMaterial({ color: 0x5c3419, roughness: 0.78 });

    // Carriage body & arched hood
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.34), coachMat);
    box.position.set(0, 0.16, -0.14);
    g.add(box);

    const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.32, 10, 1, false, 0, Math.PI), canopyMat);
    hood.rotation.z = Math.PI / 2;
    hood.rotation.y = Math.PI / 2;
    hood.position.set(0, 0.24, -0.14);
    g.add(hood);

    // 4 spoked-look wooden carriage wheels
    const wheelPos: Array<[number, number, number]> = [
      [-0.14, 0.09, -0.26],
      [0.14, 0.09, -0.26],
      [-0.14, 0.075, -0.02],
      [0.14, 0.075, -0.02],
    ];
    for (let i = 0; i < wheelPos.length; i += 1) {
      const r = i < 2 ? 0.09 : 0.075;
      const w = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.03, 10), wheelMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wheelPos[i][0], wheelPos[i][1], wheelPos[i][2]);
      g.add(w);
    }

    // Wooden shafts connecting to horse
    const shafts = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.22), woodMat);
    shafts.position.set(0, 0.12, 0.12);
    g.add(shafts);

    // Stylized horse pulling ahead (+Z)
    const horseTorso = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 0.26), horseMat);
    horseTorso.position.set(0, 0.18, 0.26);
    g.add(horseTorso);

    const horseNeck = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), horseMat);
    horseNeck.position.set(0, 0.27, 0.37);
    horseNeck.rotation.x = 0.35;
    g.add(horseNeck);

    const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 0.13), horseMat);
    horseHead.position.set(0, 0.33, 0.43);
    g.add(horseHead);

    const legOffsets: Array<[number, number]> = [
      [-0.04, 0.18],
      [0.04, 0.18],
      [-0.04, 0.34],
      [0.04, 0.34],
    ];
    for (let i = 0; i < legOffsets.length; i += 1) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.13, 0.03), horseMat);
      leg.position.set(legOffsets[i][0], 0.065, legOffsets[i][1]);
      g.add(leg);
    }
    return g;
  }

  if (eraId === 'neo_cyber') {
    // New Era: Anti-Grav Hover-Pod Shuttle (gliding over cyber lanes)
    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      roughness: 0.2,
      metalness: 0.85,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      emissive: new THREE.Color(0x0ea5e9),
      emissiveIntensity: 0.45,
      roughness: 0.1,
      metalness: 0.9,
    });
    const neonThrusterMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: new THREE.Color(0x38bdf8),
      emissiveIntensity: 1.5,
    });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.46), hullMat);
    hull.position.y = 0.09;
    g.add(hull);

    const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.24), canopyMat);
    canopy.position.set(0, 0.16, 0.02);
    g.add(canopy);

    // Side anti-gravity thruster pods
    for (let s = -1; s <= 1; s += 2) {
      const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.32, 8), hullMat);
      pod.rotation.x = Math.PI / 2;
      pod.position.set(s * 0.16, 0.08, 0);
      g.add(pod);

      const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.26), neonThrusterMat);
      glowStrip.position.set(s * 0.16, 0.04, 0);
      g.add(glowStrip);
    }
    return g;
  }

  // Modern Eco / Solar Shuttle
  const bodyMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.25,
    metalness: 0.7,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.15,
    metalness: 0.8,
  });
  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.42), bodyMat);
  chassis.position.y = 0.09;
  g.add(chassis);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.24), glassMat);
  cabin.position.set(0, 0.18, -0.02);
  g.add(cabin);

  const wheelOffsets: Array<[number, number]> = [
    [-0.11, 0.13],
    [0.11, 0.13],
    [-0.11, -0.13],
    [0.11, -0.13],
  ];
  for (let i = 0; i < wheelOffsets.length; i += 1) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 8), wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(wheelOffsets[i][0], 0.045, wheelOffsets[i][1]);
    g.add(w);
  }
  return g;
}

export function createFlyingCarGroup(colorHex: number): THREE.Group {
  const g = new THREE.Group();

  const hullMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    roughness: 0.22,
    metalness: 0.82,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: new THREE.Color(0x38bdf8),
    emissiveIntensity: 0.45,
    roughness: 0.1,
    metalness: 0.9,
  });
  const thrusterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0ea5e9),
    emissiveIntensity: 1.8,
  });
  const headMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: new THREE.Color(0xe0f2fe),
    emissiveIntensity: 1.9,
  });
  const tailMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: new THREE.Color(0xe11d48),
    emissiveIntensity: 1.6,
  });

  // Aerodynamic fuselage (+Z forward)
  const fuselage = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.12, 0.68), hullMat);
  g.add(fuselage);

  // Sleek cockpit dome
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.1, 0.34), glassMat);
  canopy.position.set(0, 0.09, 0.03);
  g.add(canopy);

  // Swept wing-fins + glowing underside hover turbines
  for (let s = -1; s <= 1; s += 2) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.36), hullMat);
    wing.position.set(s * 0.25, -0.01, -0.04);
    g.add(wing);

    const turbine = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.04, 12), thrusterMat);
    turbine.position.set(s * 0.27, -0.045, -0.04);
    g.add(turbine);
  }

  // Twin bright front headlights (+Z) & neon tail-light bar (-Z)
  const headlights = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.04, 0.04), headMat);
  headlights.position.set(0, 0, 0.35);
  g.add(headlights);

  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.04), tailMat);
  tailBar.position.set(0, 0.01, -0.35);
  g.add(tailBar);

  return g;
}

export function createTrainCarGroup(role: 'engine' | 'coach', eraId: WorldEra): THREE.Group {
  const g = new THREE.Group();

  if (eraId === 'prime_classical') {
    // Old Era: Vintage Steam Locomotive & Timber Passenger Coaches (+Z forward)
    const ironMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6, metalness: 0.65 });
    const brassMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.85 });
    const coachMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.65 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.82 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      emissive: new THREE.Color(0xfbbf24),
      emissiveIntensity: 1.4,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.1, 1.18), ironMat);
    chassis.position.y = 0.14;
    chassis.castShadow = true;
    g.add(chassis);

    // 6 iron wheels (3 per side)
    const wheelZ = [-0.38, 0, 0.38];
    for (let i = 0; i < wheelZ.length; i += 1) {
      for (let s = -1; s <= 1; s += 2) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 10), ironMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(s * 0.23, 0.1, wheelZ[i]);
        g.add(wheel);
      }
    }

    if (role === 'engine') {
      // Cylindrical steam boiler
      const boiler = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.72, 12), ironMat);
      boiler.rotation.x = Math.PI / 2;
      boiler.position.set(0, 0.36, 0.16);
      boiler.castShadow = true;
      g.add(boiler);

      // Brass boiler bands
      for (let bz = -0.08; bz <= 0.4; bz += 0.24) {
        const band = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.04, 12), brassMat);
        band.rotation.x = Math.PI / 2;
        band.position.set(0, 0.36, bz);
        g.add(band);
      }

      // Tall smokestack chimney at front
      const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.34, 10), ironMat);
      chimney.position.set(0, 0.65, 0.4);
      chimney.castShadow = true;
      g.add(chimney);

      // Bright brass headlamp (+Z)
      const headlamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.08, 10), glowMat);
      headlamp.rotation.x = Math.PI / 2;
      headlamp.position.set(0, 0.42, 0.56);
      g.add(headlamp);

      // Engineer cabin at rear (-Z)
      const cab = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.42, 0.38), coachMat);
      cab.position.set(0, 0.4, -0.34);
      cab.castShadow = true;
      g.add(cab);

      const cabRoof = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.06, 0.44), roofMat);
      cabRoof.position.set(0, 0.64, -0.34);
      g.add(cabRoof);
    } else {
      // Vintage Passenger Express Coach
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 1.08), coachMat);
      body.position.y = 0.38;
      body.castShadow = true;
      g.add(body);

      const clerestoryRoof = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.08, 1.14), roofMat);
      clerestoryRoof.position.y = 0.61;
      g.add(clerestoryRoof);

      // Warm lit window strip on both sides
      const winStrip = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.88), glowMat);
      winStrip.position.y = 0.41;
      g.add(winStrip);
    }
    return g;
  }

  // New Era / Eco / Solar: Sleek Maglev Bullet Train (+Z forward)
  const shellMat = new THREE.MeshStandardMaterial({
    color: 0xf1f5f9,
    roughness: 0.18,
    metalness: 0.78,
  });
  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.12,
    metalness: 0.88,
  });
  const cyanNeonMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: new THREE.Color(0x0ea5e9),
    emissiveIntensity: 1.65,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.3, 1.14), shellMat);
  body.position.y = 0.22;
  body.castShadow = true;
  g.add(body);

  const neonStripe = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.07, 1.06), cyanNeonMat);
  neonStripe.position.y = 0.22;
  g.add(neonStripe);

  if (role === 'engine') {
    // Aerodynamic tapered nose cone (+Z)
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 8), shellMat);
    nose.rotation.x = Math.PI / 2;
    nose.position.set(0, 0.2, 0.78);
    g.add(nose);

    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.1, 0.26), darkGlassMat);
    visor.position.set(0, 0.31, 0.48);
    g.add(visor);

    const headVisor = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.05, 0.06), cyanNeonMat);
    headVisor.position.set(0, 0.18, 0.98);
    g.add(headVisor);
  } else {
    const windowBand = new THREE.Mesh(new THREE.BoxGeometry(0.435, 0.11, 0.94), darkGlassMat);
    windowBand.position.y = 0.28;
    g.add(windowBand);
  }

  return g;
}

export function createPedestrianGroup(outfitHex: number, isOldEra: boolean): THREE.Group {
  const g = new THREE.Group();

  const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.85 });
  const torsoMat = new THREE.MeshStandardMaterial({ color: outfitHex, roughness: 0.72 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b89c, roughness: 0.75 });

  // Child 0 & 1 are legs so CityViewport can animate walking stride easily
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.05), legMat);
  legL.position.set(-0.035, 0.075, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.15, 0.05), legMat);
  legR.position.set(0.035, 0.075, 0);
  g.add(legR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.16, 0.09), torsoMat);
  torso.position.y = 0.22;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), skinMat);
  head.position.y = 0.35;
  g.add(head);

  if (isOldEra) {
    // Traditional Old Era cap / pagri headgear
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.062, 0.04, 8),
      new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 }),
    );
    cap.position.y = 0.39;
    g.add(cap);
  } else {
    // New Era subtle glowing visor / pack
    const visor = new THREE.Mesh(
      new THREE.BoxGeometry(0.09, 0.025, 0.04),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: new THREE.Color(0x0ea5e9),
        emissiveIntensity: 1.2,
      }),
    );
    visor.position.set(0, 0.355, 0.045);
    g.add(visor);
  }

  return g;
}

export function createCamelGroup(): THREE.Group {
  const g = new THREE.Group();
  const furMat = new THREE.MeshStandardMaterial({ color: 0xd9a05b, roughness: 0.82 });
  const darkFurMat = new THREE.MeshStandardMaterial({ color: 0xa16227, roughness: 0.86 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.72 });
  const trimGold = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.45 });

  // Children [0..3]: 4 articulated legs for walking stride animation
  const legPos: Array<[number, number]> = [
    [-0.07, 0.14],
    [0.07, 0.14],
    [-0.07, -0.14],
    [0.07, -0.14],
  ];
  for (let i = 0; i < legPos.length; i += 1) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.24, 0.045), furMat);
    leg.position.set(legPos[i][0], 0.12, legPos[i][1]);
    leg.castShadow = true;
    g.add(leg);
  }

  // Camel Body + Hump + Woven Saddle Blanket (+Z forward)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.38), furMat);
  torso.position.y = 0.29;
  torso.castShadow = true;
  g.add(torso);

  const hump = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), darkFurMat);
  hump.scale.set(0.85, 1.05, 1.1);
  hump.position.set(0, 0.41, -0.02);
  hump.castShadow = true;
  g.add(hump);

  const blanket = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.06, 0.22), saddleMat);
  blanket.position.set(0, 0.39, -0.02);
  g.add(blanket);

  const packGold = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.1), trimGold);
  packGold.position.set(0, 0.35, -0.02);
  g.add(packGold);

  // Curved Long Camel Neck + Head
  const neckLow = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.09), furMat);
  neckLow.position.set(0, 0.35, 0.21);
  neckLow.rotation.x = 0.55;
  g.add(neckLow);

  const neckUp = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.18, 0.08), furMat);
  neckUp.position.set(0, 0.48, 0.26);
  neckUp.rotation.x = -0.15;
  g.add(neckUp);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.08, 0.15), furMat);
  head.position.set(0, 0.56, 0.32);
  head.castShadow = true;
  g.add(head);

  return g;
}

export function createMilkmanGroup(): THREE.Group {
  const g = new THREE.Group();
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.8 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.65 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xe6b89c, roughness: 0.72 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x0ea5e9, roughness: 0.5 });
  const canMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.18, metalness: 0.88 });

  // Children [0..1] are legs for stride animation
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.055), pantsMat);
  legL.position.set(-0.04, 0.08, 0);
  g.add(legL);

  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.16, 0.055), pantsMat);
  legR.position.set(0.04, 0.08, 0);
  g.add(legR);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.18, 0.1), shirtMat);
  torso.position.y = 0.24;
  torso.castShadow = true;
  g.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
  head.position.y = 0.38;
  g.add(head);

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.068, 0.045, 8), capMat);
  cap.position.y = 0.425;
  g.add(cap);

  // Two shiny Silver Milk Cans carried in left & right hands!
  for (let s = -1; s <= 1; s += 2) {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.052, 0.14, 10), canMat);
    can.position.set(s * 0.125, 0.16, 0.04);
    can.castShadow = true;
    g.add(can);

    const milkCap = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.025, 8), capMat);
    milkCap.position.set(s * 0.125, 0.24, 0.04);
    g.add(milkCap);
  }

  return g;
}

export function createSailboatGroup(isOldEra: boolean): THREE.Group {
  const g = new THREE.Group();
  if (isOldEra) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
    const sailMat = new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.72, side: THREE.DoubleSide });

    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 1.35), woodMat);
    hull.position.y = 0.1;
    hull.castShadow = true;
    g.add(hull);

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 1.25, 6), woodMat);
    mast.position.y = 0.72;
    g.add(mast);

    const sail = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.95, 3), sailMat);
    sail.scale.set(0.15, 1, 1.2);
    sail.position.set(0, 0.8, 0.12);
    sail.castShadow = true;
    g.add(sail);
  } else {
    const whiteHull = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.2, metalness: 0.6 });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      emissive: new THREE.Color(0x0284c7),
      emissiveIntensity: 0.4,
      roughness: 0.12,
      metalness: 0.85,
    });
    const hull = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.2, 1.45), whiteHull);
    hull.position.y = 0.1;
    hull.castShadow = true;
    g.add(hull);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.22, 0.7), glassMat);
    cabin.position.set(0, 0.28, -0.08);
    g.add(cabin);
  }
  return g;
}

export function createCloudClusterGroup(): THREE.Group {
  const g = new THREE.Group();
  const cloudMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.95,
    metalness: 0.0,
  });
  const puffs: Array<[number, number, number, number]> = [
    [0, 0, 0, 1.4],
    [1.1, -0.15, 0.2, 1.05],
    [-1.15, -0.12, -0.15, 1.1],
    [0.45, 0.35, -0.25, 0.95],
    [-0.5, 0.28, 0.25, 0.9],
  ];
  for (let i = 0; i < puffs.length; i += 1) {
    const [px, py, pz, r] = puffs[i];
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), cloudMat);
    puff.position.set(px, py, pz);
    g.add(puff);
  }
  return g;
}

export function createHorseGroup(coatHex = 0x6e3d1e): THREE.Group {
  const g = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.82 });
  const maneMat = new THREE.MeshStandardMaterial({ color: 0x1c1410, roughness: 0.9 });
  const hoofMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 });
  const saddleMat = new THREE.MeshStandardMaterial({ color: 0x8f3428, roughness: 0.78 });

  // Children [0..3]: 4 articulated legs (y=0 ground contact)
  const legPos: Array<[number, number]> = [
    [-0.06, 0.15],
    [0.06, 0.15],
    [-0.06, -0.15],
    [0.06, -0.15],
  ];
  for (let i = 0; i < legPos.length; i += 1) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.24, 0.048), coatMat);
    leg.position.set(legPos[i][0], 0.12, legPos[i][1]);
    leg.castShadow = true;
    g.add(leg);
  }

  // Barrel Torso (+Z forward)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.42), coatMat);
  torso.position.set(0, 0.3, 0);
  torso.castShadow = true;
  g.add(torso);

  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.195, 0.04, 0.18), saddleMat);
  saddle.position.set(0, 0.39, -0.02);
  g.add(saddle);

  // Flowing Tail
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.18, 0.042), maneMat);
  tail.position.set(0, 0.27, -0.23);
  tail.rotation.x = 0.28;
  g.add(tail);

  // Arched Neck + Dark Mane + Head + Ears
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.2, 0.1), coatMat);
  neck.position.set(0, 0.42, 0.18);
  neck.rotation.x = 0.42;
  neck.castShadow = true;
  g.add(neck);

  const mane = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.21, 0.05), maneMat);
  mane.position.set(0, 0.44, 0.13);
  mane.rotation.x = 0.42;
  g.add(mane);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.088, 0.18), coatMat);
  head.position.set(0, 0.51, 0.27);
  head.rotation.x = 0.24;
  head.castShadow = true;
  g.add(head);

  const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.07, 0.06), hoofMat);
  muzzle.position.set(0, 0.48, 0.35);
  muzzle.rotation.x = 0.24;
  g.add(muzzle);

  for (let s = -1; s <= 1; s += 2) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.06, 4), coatMat);
    ear.position.set(s * 0.032, 0.58, 0.21);
    g.add(ear);
  }

  return g;
}

export function createCowGroup(spotHex = 0x1e293b): THREE.Group {
  const g = new THREE.Group();
  const hideMat = new THREE.MeshStandardMaterial({ color: 0xf1efe7, roughness: 0.86 });
  const spotMat = new THREE.MeshStandardMaterial({ color: spotHex, roughness: 0.88 });
  const pinkMat = new THREE.MeshStandardMaterial({ color: 0xe6a6a6, roughness: 0.78 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0xd6c7a9, roughness: 0.65 });

  // Children [0..3]: 4 articulated legs
  const legPos: Array<[number, number]> = [
    [-0.07, 0.12],
    [0.07, 0.12],
    [-0.07, -0.12],
    [0.07, -0.12],
  ];
  for (let i = 0; i < legPos.length; i += 1) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.16, 0.052), hideMat);
    leg.position.set(legPos[i][0], 0.08, legPos[i][1]);
    leg.castShadow = true;
    g.add(leg);
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.19, 0.36), hideMat);
  body.position.set(0, 0.245, 0);
  body.castShadow = true;
  g.add(body);

  const patchMain = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.11, 0.14), spotMat);
  patchMain.position.set(0, 0.26, 0.02);
  g.add(patchMain);

  const patchRump = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.1), spotMat);
  patchRump.position.set(0.048, 0.25, -0.12);
  g.add(patchRump);

  const udder = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 6), pinkMat);
  udder.position.set(0, 0.145, -0.05);
  g.add(udder);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.13, 0.14), spotMat);
  head.position.set(0, 0.295, 0.22);
  head.castShadow = true;
  g.add(head);

  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.072, 0.065), pinkMat);
  snout.position.set(0, 0.255, 0.295);
  g.add(snout);

  for (let s = -1; s <= 1; s += 2) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.065, 5), hornMat);
    horn.position.set(s * 0.055, 0.38, 0.2);
    horn.rotation.z = -s * 0.45;
    g.add(horn);
  }

  return g;
}

export function createSheepGroup(): THREE.Group {
  const g = new THREE.Group();
  const woolMat = new THREE.MeshStandardMaterial({ color: 0xf4f1e6, roughness: 0.94 });
  const faceMat = new THREE.MeshStandardMaterial({ color: 0x3f3a36, roughness: 0.88 });

  // Children [0..3]: 4 nimble dark legs
  const legPos: Array<[number, number]> = [
    [-0.052, 0.08],
    [0.052, 0.08],
    [-0.052, -0.08],
    [0.052, -0.08],
  ];
  for (let i = 0; i < legPos.length; i += 1) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.12, 0.036), faceMat);
    leg.position.set(legPos[i][0], 0.06, legPos[i][1]);
    leg.castShadow = true;
    g.add(leg);
  }

  // Soft Rounded Wool Fleece
  const fleeceMain = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 1), woolMat);
  fleeceMain.scale.set(1.05, 0.92, 1.32);
  fleeceMain.position.set(0, 0.2, 0);
  fleeceMain.castShadow = true;
  g.add(fleeceMain);

  const fleeceShoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.105, 1), woolMat);
  fleeceShoulder.position.set(0, 0.22, 0.09);
  g.add(fleeceShoulder);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.088, 0.085, 0.11), faceMat);
  head.position.set(0, 0.23, 0.20);
  head.castShadow = true;
  g.add(head);

  const woolCap = new THREE.Mesh(new THREE.DodecahedronGeometry(0.052, 0), woolMat);
  woolCap.position.set(0, 0.285, 0.18);
  g.add(woolCap);

  for (let s = -1; s <= 1; s += 2) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.024, 0.028), faceMat);
    ear.position.set(s * 0.062, 0.245, 0.18);
    ear.rotation.z = -s * 0.35;
    g.add(ear);
  }

  return g;
}

export function createGoatGroup(coatHex = 0xd6b07c): THREE.Group {
  const g = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: coatHex, roughness: 0.86 });
  const hornMat = new THREE.MeshStandardMaterial({ color: 0x4b4238, roughness: 0.72 });

  // Children [0..3]: 4 articulated legs
  const legPos: Array<[number, number]> = [
    [-0.045, 0.085],
    [0.045, 0.085],
    [-0.045, -0.085],
    [0.045, -0.085],
  ];
  for (let i = 0; i < legPos.length; i += 1) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.14, 0.034), coatMat);
    leg.position.set(legPos[i][0], 0.07, legPos[i][1]);
    leg.castShadow = true;
    g.add(leg);
  }

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.13, 0.26), coatMat);
  body.position.set(0, 0.195, 0);
  body.castShadow = true;
  g.add(body);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.11, 0.08), coatMat);
  neck.position.set(0, 0.26, 0.11);
  neck.rotation.x = 0.28;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.085, 0.13), coatMat);
  head.position.set(0, 0.31, 0.17);
  head.castShadow = true;
  g.add(head);

  const beard = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.055, 5), hornMat);
  beard.position.set(0, 0.245, 0.21);
  beard.rotation.x = Math.PI;
  g.add(beard);

  for (let s = -1; s <= 1; s += 2) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.085, 5), hornMat);
    horn.position.set(s * 0.032, 0.375, 0.14);
    horn.rotation.x = -0.55;
    horn.rotation.z = -s * 0.22;
    g.add(horn);
  }

  return g;
}

export function createDeerGroup(withAntlers = true): THREE.Group {
  const g = new THREE.Group();
  const coatMat = new THREE.MeshStandardMaterial({ color: 0x9c6238, roughness: 0.84 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xeadbc5, roughness: 0.88 });
  const antlerMat = new THREE.MeshStandardMaterial({ color: 0xc2a984, roughness: 0.72 });

  // Children [0..3]: 4 slender legs
  const legPos: Array<[number, number]> = [
    [-0.048, 0.11],
    [0.048, 0.11],
    [-0.048, -0.11],
    [0.048, -0.11],
  ];
  for (let i = 0; i < legPos.length; i += 1) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.22, 0.034), coatMat);
    leg.position.set(legPos[i][0], 0.11, legPos[i][1]);
    leg.castShadow = true;
    g.add(leg);
  }

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 0.32), coatMat);
  torso.position.set(0, 0.275, 0);
  torso.castShadow = true;
  g.add(torso);

  const tailPatch = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.075, 0.035), creamMat);
  tailPatch.position.set(0, 0.29, -0.165);
  g.add(tailPatch);

  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.18, 0.075), coatMat);
  neck.position.set(0, 0.39, 0.14);
  neck.rotation.x = 0.25;
  neck.castShadow = true;
  g.add(neck);

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.074, 0.072, 0.14), coatMat);
  head.position.set(0, 0.48, 0.21);
  head.rotation.x = 0.12;
  head.castShadow = true;
  g.add(head);

  for (let s = -1; s <= 1; s += 2) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.065, 4), coatMat);
    ear.position.set(s * 0.045, 0.53, 0.17);
    ear.rotation.z = -s * 0.55;
    g.add(ear);

    if (withAntlers) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.15, 5), antlerMat);
      beam.position.set(s * 0.042, 0.57, 0.18);
      beam.rotation.z = -s * 0.35;
      beam.rotation.x = -0.2;
      g.add(beam);

      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.08, 5), antlerMat);
      tine.position.set(s * 0.062, 0.60, 0.21);
      tine.rotation.x = 0.5;
      g.add(tine);
    }
  }

  return g;
}

export function createBirdGroup(plumageHex = 0xe2e8f0): THREE.Group {
  const g = new THREE.Group();
  const wingMat = new THREE.MeshStandardMaterial({ color: plumageHex, roughness: 0.72 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.75 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.55 });

  // Children [0..1]: Left & Right wing pivots for soaring flap animation
  const leftWing = new THREE.Group();
  leftWing.position.set(-0.04, 0, 0);
  const leftFeather = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.12), wingMat);
  leftFeather.position.set(-0.16, 0, -0.02);
  leftFeather.rotation.y = 0.18;
  leftWing.add(leftFeather);
  g.add(leftWing);

  const rightWing = new THREE.Group();
  rightWing.position.set(0.04, 0, 0);
  const rightFeather = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.018, 0.12), wingMat);
  rightFeather.position.set(0.16, 0, -0.02);
  rightFeather.rotation.y = -0.18;
  rightWing.add(rightFeather);
  g.add(rightWing);

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.055, 0.24), bodyMat);
  body.castShadow = true;
  g.add(body);

  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 4), beakMat);
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0, 0.15);
  g.add(beak);

  return g;
}



