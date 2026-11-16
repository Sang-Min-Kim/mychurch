import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { ActivePilgrim, SanctuaryZoneId } from '../types';

export interface PilgrimRig {
  root: THREE.Group;
  bodyPivot: THREE.Group;
  headGroup: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  lanternGlow: THREE.PointLight;
}

export interface SanctuarySceneHandle {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  pilgrim: PilgrimRig;
  candleFlames: THREE.Mesh[];
  candleLights: THREE.PointLight[];
  sunBeams: THREE.Mesh[];
  syncConcurrentPilgrims: (pilgrims: ActivePilgrim[], excludeId?: string | null) => void;
  dispose: () => void;
}

function createStoneTexture(baseHex: string, veinHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle limestone block seams
    ctx.strokeStyle = veinHex;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = 0.25;
    for (let y = 0; y < 512; y += 64) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
      const offset = (y / 64) % 2 === 0 ? 0 : 64;
      for (let x = offset; x < 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 64);
        ctx.stroke();
      }
    }

    // Organic mineral grain
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#ffffff' : veinHex;
      ctx.globalAlpha = 0.04;
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#6f5238';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = i % 2 === 0 ? '#5b412a' : '#806043';
      ctx.globalAlpha = 0.16;
      const y = (i / 160) * 256;
      ctx.fillRect(0, y, 256, 1.5);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 60);
    grad.addColorStop(0, 'rgba(18, 16, 14, 0.55)');
    grad.addColorStop(0.55, 'rgba(18, 16, 14, 0.22)');
    grad.addColorStop(1, 'rgba(18, 16, 14, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Assemble a 10-part articulated Pilgrim figure (bottom-center pivot y = 0).
 */
export function createPilgrimRig(
  coatColor: number,
  scarfColor: number,
  shadowTex: THREE.Texture
): PilgrimRig {
  const root = new THREE.Group();

  // Grounding contact shadow disc
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.55,
  });
  const shadowDisc = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.012;
  root.add(shadowDisc);

  const coatMat = new THREE.MeshStandardMaterial({
    color: coatColor,
    roughness: 0.88,
    metalness: 0.02,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xe6cbb5,
    roughness: 0.65,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: 0x2a2521,
    roughness: 0.78,
    metalness: 0.05,
  });
  const scarfMat = new THREE.MeshStandardMaterial({
    color: scarfColor,
    roughness: 0.92,
    metalness: 0.0,
  });
  const shoeMat = new THREE.MeshStandardMaterial({
    color: 0x26211d,
    roughness: 0.52,
    metalness: 0.12,
  });

  const bodyPivot = new THREE.Group();
  root.add(bodyPivot);

  // Legs (left / right pivots at hip y = 0.78)
  const makeLeg = (xOffset: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(xOffset, 0.78, 0);
    const trouser = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.068, 0.68, 12), shoeMat);
    trouser.position.y = -0.34;
    trouser.castShadow = true;
    legPivot.add(trouser);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.22), shoeMat);
    foot.position.set(0, -0.74, 0.04);
    foot.castShadow = true;
    legPivot.add(foot);
    return legPivot;
  };

  const leftLeg = makeLeg(-0.11);
  const rightLeg = makeLeg(0.11);
  bodyPivot.add(leftLeg, rightLeg);

  // Primary silhouette: draped contemplative coat & torso
  const skirtLathePts = [
    new THREE.Vector2(0.24, 0.32),
    new THREE.Vector2(0.22, 0.68),
    new THREE.Vector2(0.19, 1.05),
    new THREE.Vector2(0.17, 1.32),
    new THREE.Vector2(0.09, 1.42),
  ];
  const coatGeo = new THREE.LatheGeometry(skirtLathePts, 18);
  const coatMesh = new THREE.Mesh(coatGeo, coatMat);
  coatMesh.castShadow = true;
  coatMesh.receiveShadow = true;
  bodyPivot.add(coatMesh);

  // Secondary accent: woven wool scarf collar
  const scarf = new THREE.Mesh(new THREE.TorusGeometry(0.135, 0.045, 10, 20), scarfMat);
  scarf.rotation.x = Math.PI / 2;
  scarf.position.y = 1.41;
  scarf.castShadow = true;
  bodyPivot.add(scarf);

  // Arms (pivoted at shoulders y = 1.34)
  const makeArm = (xOffset: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(xOffset, 1.34, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.048, 0.46, 10), coatMat);
    sleeve.position.y = -0.22;
    sleeve.castShadow = true;
    armPivot.add(sleeve);

    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 10), skinMat);
    hand.position.y = -0.47;
    armPivot.add(hand);
    return armPivot;
  };

  const leftArm = makeArm(-0.22);
  const rightArm = makeArm(0.22);
  bodyPivot.add(leftArm, rightArm);

  // Head group (neck, head, hair cap)
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.44, 0);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 10), skinMat);
  neck.position.y = 0.04;
  headGroup.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 16), skinMat);
  head.position.y = 0.17;
  head.castShadow = true;
  headGroup.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.132, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hair.position.set(0, 0.185, -0.015);
  hair.rotation.x = -0.22;
  headGroup.add(hair);

  bodyPivot.add(headGroup);

  const lanternGlow = new THREE.PointLight(0xffb85c, 0, 3.2, 2);
  lanternGlow.position.set(0, 1.2, 0.35);
  bodyPivot.add(lanternGlow);

  return {
    root,
    bodyPivot,
    headGroup,
    leftArm,
    rightArm,
    leftLeg,
    rightLeg,
    lanternGlow,
  };
}

function createPew(woodMat: THREE.Material, darkIronMat: THREE.Material): THREE.Group {
  const pew = new THREE.Group();
  // Seat plank
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.06, 0.44), woodMat);
  seat.position.set(0, 0.44, 0);
  seat.castShadow = true;
  seat.receiveShadow = true;
  pew.add(seat);

  // Backrest angled slightly
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.52, 0.055), woodMat);
  back.position.set(0, 0.72, 0.2);
  back.rotation.x = 0.08;
  back.castShadow = true;
  pew.add(back);

  // Kneeler rail
  const kneeler = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.045, 0.16), woodMat);
  kneeler.position.set(0, 0.14, 0.34);
  pew.add(kneeler);

  // Left & Right carved end supports
  [-1.22, 1.22].forEach((x) => {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.92, 0.52), woodMat);
    leg.position.set(x, 0.46, 0.04);
    leg.castShadow = true;
    pew.add(leg);

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.04, 0.56), darkIronMat);
    foot.position.set(x, 0.02, 0.04);
    pew.add(foot);
  });

  return pew;
}

function createTreeGroup(
  trunkMat: THREE.Material,
  foliageMat: THREE.Material,
  scale = 1
): THREE.Group {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.18, 2.4, 8), trunkMat);
  trunk.position.y = 1.2;
  trunk.castShadow = true;
  tree.add(trunk);

  const tier1 = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.8, 9), foliageMat);
  tier1.position.y = 2.6;
  tier1.castShadow = true;
  tree.add(tier1);

  const tier2 = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.6, 9), foliageMat);
  tier2.position.y = 3.5;
  tier2.castShadow = true;
  tree.add(tier2);

  tree.scale.setScalar(scale);
  return tree;
}

export const SEAT_POSITIONS: Record<SanctuaryZoneId, { x: number; z: number; yaw: number }[]> = {
  nave: [
    // Left pews (rows 1..3, 2 seats each, facing -Z toward altar)
    { x: -2.4, z: -2.5, yaw: Math.PI },
    { x: -1.5, z: -2.5, yaw: Math.PI },
    { x: -2.4, z: -0.6, yaw: Math.PI },
    { x: -1.5, z: -0.6, yaw: Math.PI },
    { x: -2.4, z: 1.3, yaw: Math.PI },
    { x: -1.5, z: 1.3, yaw: Math.PI },
    // Right pews
    { x: 1.5, z: -2.5, yaw: Math.PI },
    { x: 2.4, z: -2.5, yaw: Math.PI },
    { x: 1.5, z: -0.6, yaw: Math.PI },
    { x: 2.4, z: -0.6, yaw: Math.PI },
    { x: 1.5, z: 1.3, yaw: Math.PI },
    { x: 2.4, z: 1.3, yaw: Math.PI },
  ],
  adoration: [
    { x: -4.8, z: -4.2, yaw: -Math.PI * 0.65 },
    { x: -4.8, z: -3.2, yaw: -Math.PI * 0.65 },
    { x: -4.8, z: -2.2, yaw: -Math.PI * 0.65 },
    { x: -4.8, z: -1.2, yaw: -Math.PI * 0.65 },
  ],
  candles: [
    { x: 4.1, z: -4.4, yaw: Math.PI * 0.5 },
    { x: 4.5, z: -3.6, yaw: Math.PI * 0.5 },
    { x: 4.1, z: -2.8, yaw: Math.PI * 0.5 },
    { x: 4.5, z: -2.0, yaw: Math.PI * 0.5 },
  ],
  cloister: [
    { x: -3.8, z: 9.2, yaw: Math.PI },
    { x: -1.8, z: 11.4, yaw: Math.PI },
    { x: 2.1, z: 11.4, yaw: Math.PI },
    { x: 3.8, z: 9.2, yaw: Math.PI },
  ],
};

export function buildSanctuaryScene(
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): SanctuarySceneHandle {
  const scene = new THREE.Scene();
  const skyColor = new THREE.Color(0xe6e2d8);
  scene.background = skyColor;
  scene.fog = new THREE.FogExp2(0xe6e2d8, 0.022);

  const camera = new THREE.PerspectiveCamera(52, 16 / 9, 0.1, 120);
  camera.position.set(0, 2.2, 14);

  // Procedural studio environment for PBR brass, stone & timber
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  pmremGenerator.dispose();

  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const limestoneTex = createStoneTexture('#e6e1d6', '#b7afa1');
  limestoneTex.repeat.set(4, 3);
  limestoneTex.anisotropy = maxAniso;

  const floorTex = createStoneTexture('#d8d2c5', '#9e978b');
  floorTex.repeat.set(6, 10);
  floorTex.anisotropy = maxAniso;

  const woodTex = createWoodTexture();
  woodTex.repeat.set(2, 2);
  woodTex.anisotropy = maxAniso;

  const shadowTex = createContactShadowTexture();

  // Materials with varied roughness/metalness
  const wallMat = new THREE.MeshStandardMaterial({
    map: limestoneTex,
    roughness: 0.86,
    metalness: 0.02,
  });
  const floorMat = new THREE.MeshStandardMaterial({
    map: floorTex,
    roughness: 0.62,
    metalness: 0.04,
  });
  const exteriorGroundMat = new THREE.MeshStandardMaterial({
    color: 0xbcb6a9,
    roughness: 0.94,
    metalness: 0.0,
  });
  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x3b4d4a,
    roughness: 0.08,
    metalness: 0.15,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const woodMat = new THREE.MeshStandardMaterial({
    map: woodTex,
    roughness: 0.64,
    metalness: 0.04,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xc29b48,
    roughness: 0.24,
    metalness: 0.88,
  });
  const darkIronMat = new THREE.MeshStandardMaterial({
    color: 0x262422,
    roughness: 0.45,
    metalness: 0.72,
  });
  const altarStoneMat = new THREE.MeshStandardMaterial({
    color: 0xf1ede4,
    roughness: 0.55,
    metalness: 0.02,
  });

  // ------------------------------------------------------------------
  // 1. Lighting Rig (Warm Sun Key + Cool Hemisphere Fill + Candle Glow)
  // ------------------------------------------------------------------
  const hemiLight = new THREE.HemisphereLight(0xdbe6f0, 0x706556, 0.72);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xfff0d6, 1.85);
  sunLight.position.set(11, 14, 7);
  sunLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 40;
    const d = 14;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
  }
  scene.add(sunLight);

  const sanctuarySoftFill = new THREE.PointLight(0xffdfad, 1.15, 22, 1.6);
  sanctuarySoftFill.position.set(0, 5.2, -3.5);
  scene.add(sanctuarySoftFill);

  // ------------------------------------------------------------------
  // 2. Exterior Ground, Pine Forest Perimeter & Stone Atrium Water Basin
  // ------------------------------------------------------------------
  const outerGround = new THREE.Mesh(new THREE.CircleGeometry(70, 48), exteriorGroundMat);
  outerGround.rotation.x = -Math.PI / 2;
  outerGround.position.y = -0.02;
  outerGround.receiveShadow = true;
  scene.add(outerGround);

  // Stone Courtyard Walkway from z=18 to entrance z=4.5
  const walkway = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.04, 14.5), floorMat);
  walkway.position.set(0, 0.0, 11.7);
  walkway.receiveShadow = true;
  scene.add(walkway);

  // Atrium Stone Water Basin (left side of courtyard)
  const basinGroup = new THREE.Group();
  basinGroup.position.set(-3.2, 0, 10.0);
  const basinRim = new THREE.Mesh(new THREE.BoxGeometry(2.8, 0.34, 2.2), wallMat);
  basinRim.position.y = 0.17;
  basinRim.castShadow = true;
  basinRim.receiveShadow = true;
  basinGroup.add(basinRim);
  const basinWater = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.8), waterMat);
  basinWater.rotation.x = -Math.PI / 2;
  basinWater.position.y = 0.35;
  basinGroup.add(basinWater);
  scene.add(basinGroup);

  // Low stone courtyard garden walls
  const courtyardWallL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 10), wallMat);
  courtyardWallL.position.set(-5.8, 0.55, 9.5);
  courtyardWallL.castShadow = true;
  scene.add(courtyardWallL);
  const courtyardWallR = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.1, 10), wallMat);
  courtyardWallR.position.set(5.8, 0.55, 9.5);
  courtyardWallR.castShadow = true;
  scene.add(courtyardWallR);

  // Natural Pine & Cedar Perimeter Trees
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4b3b2d, roughness: 0.9 });
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3b4d3e, roughness: 0.85 });
  const treeCoords: [number, number, number][] = [
    [-9, 13, 1.15],
    [-11, 7, 1.3],
    [-10, 1, 1.05],
    [-9.5, -6, 1.2],
    [9, 12.5, 1.1],
    [10.5, 6.5, 1.25],
    [10, -2, 1.15],
    [9.5, -8, 1.3],
    [-5, 18, 1.0],
    [5.5, 17.5, 1.1],
  ];
  treeCoords.forEach(([x, z, sc]) => {
    const t = createTreeGroup(trunkMat, foliageMat, sc);
    t.position.set(x, 0, z);
    scene.add(t);
  });

  // ------------------------------------------------------------------
  // 3. Main Church Interior (z = -8.5 to +4.5, x = -6.2 to +6.2)
  // ------------------------------------------------------------------
  const naveFloor = new THREE.Mesh(new THREE.BoxGeometry(12.4, 0.06, 13.2), floorMat);
  naveFloor.position.set(0, 0.0, -2.1);
  naveFloor.receiveShadow = true;
  scene.add(naveFloor);

  // Sanctuary Altar Platform (raised 2 limestone steps)
  const step1 = new THREE.Mesh(new THREE.BoxGeometry(8.2, 0.14, 3.8), altarStoneMat);
  step1.position.set(0, 0.07, -6.5);
  step1.receiveShadow = true;
  scene.add(step1);

  // Main Limestone Altar
  const altarGroup = new THREE.Group();
  altarGroup.position.set(0, 0.14, -6.2);
  const altarBase = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.88, 0.78), altarStoneMat);
  altarBase.position.y = 0.44;
  altarBase.castShadow = true;
  altarBase.receiveShadow = true;
  altarGroup.add(altarBase);
  const altarTop = new THREE.Mesh(new THREE.BoxGeometry(2.15, 0.1, 1.0), altarStoneMat);
  altarTop.position.y = 0.93;
  altarTop.castShadow = true;
  altarGroup.add(altarTop);

  // Two brass altar candlesticks
  [-0.75, 0.75].forEach((cx) => {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.055, 0.24, 12), brassMat);
    stick.position.set(cx, 1.1, 0);
    altarGroup.add(stick);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 10), altarStoneMat);
    wax.position.set(cx, 1.29, 0);
    altarGroup.add(wax);
  });
  scene.add(altarGroup);

  // Suspended Cedar Cross behind altar
  const crossGroup = new THREE.Group();
  crossGroup.position.set(0, 3.6, -7.85);
  const vBeam = new THREE.Mesh(new THREE.BoxGeometry(0.14, 2.35, 0.1), woodMat);
  vBeam.castShadow = true;
  const hBeam = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.14, 0.1), woodMat);
  hBeam.position.y = 0.42;
  hBeam.castShadow = true;
  crossGroup.add(vBeam, hBeam);
  scene.add(crossGroup);

  // Rear Altar Wall + Side Clerestory Light Slots
  const altarWall = new THREE.Mesh(new THREE.BoxGeometry(8.8, 7.6, 0.45), wallMat);
  altarWall.position.set(0, 3.8, -8.5);
  altarWall.receiveShadow = true;
  scene.add(altarWall);

  // Left Wall (with Adoration Chapel recess feel)
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.6, 13.2), wallMat);
  leftWall.position.set(-6.1, 3.8, -2.1);
  leftWall.receiveShadow = true;
  scene.add(leftWall);

  // Right Wall with Clerestory Window Openings (segmented pillars)
  for (let i = 0; i < 4; i++) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.45, 7.6, 1.6), wallMat);
    pillar.position.set(6.1, 3.8, -7.4 + i * 3.5);
    pillar.castShadow = true;
    pillar.receiveShadow = true;
    scene.add(pillar);
  }
  const rightLowWall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 2.3, 13.2), wallMat);
  rightLowWall.position.set(6.1, 1.15, -2.1);
  scene.add(rightLowWall);

  // Front Entrance Portal Wall (left & right of wide double sanctuary doorway at z = 4.5)
  const portalLeft = new THREE.Mesh(new THREE.BoxGeometry(4.6, 7.6, 0.45), wallMat);
  portalLeft.position.set(-3.9, 3.8, 4.5);
  portalLeft.castShadow = true;
  portalLeft.receiveShadow = true;
  scene.add(portalLeft);

  const portalRight = new THREE.Mesh(new THREE.BoxGeometry(4.6, 7.6, 0.45), wallMat);
  portalRight.position.set(3.9, 3.8, 4.5);
  portalRight.castShadow = true;
  portalRight.receiveShadow = true;
  scene.add(portalRight);

  const portalLintel = new THREE.Mesh(new THREE.BoxGeometry(3.4, 3.8, 0.45), wallMat);
  portalLintel.position.set(0, 5.7, 4.5);
  scene.add(portalLintel);

  // Open Oak Sanctuary Doors swung gently inward
  const doorGeo = new THREE.BoxGeometry(1.45, 3.65, 0.1);
  const doorLeft = new THREE.Mesh(doorGeo, woodMat);
  doorLeft.position.set(-1.6, 1.825, 3.85);
  doorLeft.rotation.y = Math.PI * 0.42;
  doorLeft.castShadow = true;
  scene.add(doorLeft);

  const doorRight = new THREE.Mesh(doorGeo, woodMat);
  doorRight.position.set(1.6, 1.825, 3.85);
  doorRight.rotation.y = -Math.PI * 0.42;
  doorRight.castShadow = true;
  scene.add(doorRight);

  // Roof & Timber Trusses
  const roof = new THREE.Mesh(new THREE.BoxGeometry(12.8, 0.25, 13.6), woodMat);
  roof.position.set(0, 7.65, -2.1);
  scene.add(roof);

  for (let z = -6.8; z <= 3.2; z += 2.5) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(12.0, 0.28, 0.24), woodMat);
    beam.position.set(0, 6.75, z);
    beam.castShadow = true;
    scene.add(beam);
  }

  // Translucent Clerestory Morning Light Shafts
  const sunBeams: THREE.Mesh[] = [];
  const beamMat = new THREE.MeshBasicMaterial({
    color: 0xfff3d4,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  [-5.6, -2.1, 1.4].forEach((zPos) => {
    const beam = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 8.2), beamMat);
    beam.position.set(2.8, 3.4, zPos);
    beam.rotation.y = Math.PI / 2;
    beam.rotation.x = 0.42;
    scene.add(beam);
    sunBeams.push(beam);
  });

  // Oak Pews (3 rows left, 3 rows right)
  [-2.5, -0.6, 1.3].forEach((zPos) => {
    const leftPew = createPew(woodMat, darkIronMat);
    leftPew.position.set(-2.25, 0, zPos);
    scene.add(leftPew);

    const rightPew = createPew(woodMat, darkIronMat);
    rightPew.position.set(2.25, 0, zPos);
    scene.add(rightPew);
  });

  // ------------------------------------------------------------------
  // 4. Votive Candle Alcove Stand (Right Sanctuary Alcove x = 4.9, z = -3.4)
  // ------------------------------------------------------------------
  const candleStand = new THREE.Group();
  candleStand.position.set(4.95, 0, -3.4);
  candleStand.rotation.y = -Math.PI / 2;

  const standFrame = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.92, 0.52), darkIronMat);
  standFrame.position.y = 0.46;
  standFrame.castShadow = true;
  candleStand.add(standFrame);

  const standTray = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.05, 0.58), brassMat);
  standTray.position.y = 0.94;
  candleStand.add(standTray);

  const candleFlames: THREE.Mesh[] = [];
  const candleLights: THREE.PointLight[] = [];
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffc663 });

  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = -0.72 + col * 0.28;
      const cy = 1.02 + row * 0.07;
      const cz = -0.1 + row * 0.2;

      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.03, 0.09, 10), altarStoneMat);
      cup.position.set(cx, cy, cz);
      candleStand.add(cup);

      const flame = new THREE.Mesh(new THREE.ConeGeometry(0.016, 0.055, 8), flameMat);
      flame.position.set(cx, cy + 0.075, cz);
      candleStand.add(flame);
      candleFlames.push(flame);
    }
  }

  const candleWarmGlow = new THREE.PointLight(0xffa947, 1.5, 5.5, 1.8);
  candleWarmGlow.position.set(0, 1.55, 0.25);
  candleStand.add(candleWarmGlow);
  candleLights.push(candleWarmGlow);
  scene.add(candleStand);

  // ------------------------------------------------------------------
  // 5. Hero Virtual Pilgrim + Live Concurrent Pilgrims Layer
  // ------------------------------------------------------------------
  const pilgrim = createPilgrimRig(0x3a434c, 0xa88f6a, shadowTex);
  pilgrim.root.position.set(0, 0, 16.5);
  scene.add(pilgrim.root);

  const concurrentGroup = new THREE.Group();
  scene.add(concurrentGroup);
  const concurrentCache = new Map<string, PilgrimRig>();

  const syncConcurrentPilgrims = (pilgrims: ActivePilgrim[], excludeId?: string | null) => {
    const activeIds = new Set<string>();
    const coatPalette = [0x4c5147, 0x544b43, 0x3b444f, 0x5c5349];

    pilgrims.forEach((p, idx) => {
      if (excludeId && p.id === excludeId) return;
      activeIds.add(p.id);
      let rig = concurrentCache.get(p.id);
      if (!rig) {
        rig = createPilgrimRig(coatPalette[idx % coatPalette.length], 0xc5b8a2, shadowTex);
        concurrentCache.set(p.id, rig);
        concurrentGroup.add(rig.root);
      }

      const spots = SEAT_POSITIONS[p.zone] || SEAT_POSITIONS.nave;
      const spot = spots[p.seatIndex % spots.length];
      rig.root.position.set(spot.x, 0, spot.z);
      rig.root.rotation.y = spot.yaw;

      // Quiet seated/praying posture
      rig.bodyPivot.position.y = p.zone === 'nave' || p.zone === 'adoration' ? -0.34 : 0;
      rig.leftLeg.rotation.x = p.zone === 'nave' || p.zone === 'adoration' ? -1.1 : 0;
      rig.rightLeg.rotation.x = p.zone === 'nave' || p.zone === 'adoration' ? -1.1 : 0;
      rig.leftArm.rotation.set(-0.85, 0, 0.28);
      rig.rightArm.rotation.set(-0.85, 0, -0.28);
      rig.headGroup.rotation.x = 0.22;
    });

    for (const [id, rig] of concurrentCache.entries()) {
      if (!activeIds.has(id)) {
        concurrentGroup.remove(rig.root);
        concurrentCache.delete(id);
      }
    }
  };

  const dispose = () => {
    scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
    limestoneTex.dispose();
    floorTex.dispose();
    woodTex.dispose();
    shadowTex.dispose();
    envTex.dispose();
  };

  return {
    scene,
    camera,
    pilgrim,
    candleFlames,
    candleLights,
    sunBeams,
    syncConcurrentPilgrims,
    dispose,
  };
}
