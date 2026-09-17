/**
 * Kitchuban Animations - Everywhere animations for realistic war game
 * Verified historical buildings + animated environment
 * No admins, everyone equal, static client-only
 */
import * as THREE from 'three';
import { MAT } from './materials.js';

export const animatedFlags = [];
export const animatedFires = [];
export const animatedWaters = [];
export const animatedTrees = [];
export const animatedChariots = [];
export const animatedSmoke = [];
export const animatedDoors = [];
export const animatedStatues = [];
export const animatedLights = [];

let globalTime = 0;

// Flag waving - realistic cloth simulation via vertex displacement + rotation
export function createAnimatedFlag(scene, x, y, z, color = 0x8a1a1a, w = 2, h = 1.2, poleH = 6) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  
  // Pole
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, poleH, 8), MAT.woodDark);
  pole.position.set(0, poleH/2, 0);
  pole.castShadow = true;
  group.add(pole);
  
  // Flag with segmented geometry for waving
  const segW = 12, segH = 6;
  const flagGeo = new THREE.PlaneGeometry(w, h, segW, segH);
  const flagMat = new THREE.MeshStandardMaterial({ 
    color, 
    side: THREE.DoubleSide, 
    roughness: 0.8,
    metalness: 0.1,
  });
  const flag = new THREE.Mesh(flagGeo, flagMat);
  flag.position.set(w/2 + 0.15, poleH - 0.4, 0);
  flag.rotation.y = Math.PI/2;
  flag.castShadow = true;
  group.add(flag);
  
  scene.add(group);
  
  animatedFlags.push({
    mesh: flag,
    basePos: flag.position.clone(),
    geometry: flagGeo,
    originalPositions: flagGeo.attributes.position.array.slice(),
    timeOffset: Math.random()*Math.PI*2,
    speed: 0.8 + Math.random()*0.7,
    amplitude: 0.15 + Math.random()*0.1,
    windStrength: 0.8 + Math.random()*0.6,
  });
  
  return group;
}

// Animated fire - flickering flame + light
export function createAnimatedFire(scene, x, y, z, scale = 1, withLight = true) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  
  // Pit
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.5*scale, 0.6*scale, 0.2*scale, 12), new THREE.MeshStandardMaterial({color: 0x2a1a0a}));
  pit.position.y = 0.1*scale;
  group.add(pit);
  
  // Logs
  for (let i=0;i<3;i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08*scale, 0.08*scale, 1.0*scale, 6), MAT.woodDark);
    log.position.set((Math.random()-0.5)*0.3*scale, 0.3*scale, (Math.random()-0.5)*0.3*scale);
    log.rotation.z = (Math.random()-0.5)*0.8;
    log.rotation.x = (Math.random()-0.5)*0.8;
    group.add(log);
  }
  
  // Flame layers - 3 sprites for realistic fire
  const flames = [];
  const colors = [0xffffaa, 0xffaa44, 0xff4422];
  for (let i=0;i<3;i++) {
    const flameMat = new THREE.SpriteMaterial({
      map: MAT.fire,
      color: colors[i],
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flame = new THREE.Sprite(flameMat);
    flame.position.set(0, (0.5 + i*0.25)*scale, 0);
    flame.scale.set((0.6 - i*0.1)*scale, (1.0 - i*0.15)*scale, 1);
    group.add(flame);
    flames.push(flame);
  }
  
  // Light
  let light = null;
  if (withLight) {
    light = new THREE.PointLight(0xff7a2a, 2.5*scale, 10*scale, 2);
    light.position.set(0, 0.8*scale, 0);
    group.add(light);
  }
  
  scene.add(group);
  
  animatedFires.push({
    group,
    flames,
    light,
    baseIntensity: light ? light.intensity : 1,
    time: Math.random()*10,
    scale,
  });
  
  return group;
}

// Animated water - bobbing + texture offset
export function createAnimatedWater(scene, x, y, z, w, d, color = 0x3a6f8a) {
  const geo = new THREE.PlaneGeometry(w, d, 16, 16);
  const mat = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.82,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  scene.add(mesh);
  
  animatedWaters.push({
    mesh,
    geometry: geo,
    originalPositions: geo.attributes.position.array.slice(),
    timeOffset: Math.random()*Math.PI*2,
    baseY: y,
    w, d,
  });
  
  return mesh;
}

// Animated tree - swaying in wind
export function createAnimatedTree(scene, x, z, type='cypress') {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  
  let trunk, foliageGroup;
  if (type==='cypress') {
    trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.32,0.48,6.5,8), MAT.woodDark);
    trunk.position.y=3.25;
    trunk.castShadow=true;
    group.add(trunk);
    foliageGroup = new THREE.Group();
    const foliageMat = new THREE.MeshStandardMaterial({color:0x2f5a2a, roughness:0.9});
    for(let i=0;i<3;i++){ 
      const h=3.2-i*0.5, r=1.2-i*0.2; 
      const cone=new THREE.Mesh(new THREE.ConeGeometry(r,h,10), foliageMat); 
      cone.position.y=6.5+i*1.6+h/2-0.5; 
      cone.castShadow=true; 
      foliageGroup.add(cone); 
    }
    group.add(foliageGroup);
  } else {
    trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.38,0.55,5,8), MAT.woodDark);
    trunk.position.y=2.5;
    trunk.castShadow=true;
    group.add(trunk);
    foliageGroup = new THREE.Group();
    const foliage=new THREE.Mesh(new THREE.SphereGeometry(2.4,12,10), new THREE.MeshStandardMaterial({color:0x3a6b2a, roughness:0.9}));
    foliage.position.y=5.5;
    foliage.castShadow=true;
    foliageGroup.add(foliage);
    group.add(foliageGroup);
  }
  
  scene.add(group);
  
  animatedTrees.push({
    group,
    foliageGroup,
    trunk,
    timeOffset: Math.random()*Math.PI*2,
    swaySpeed: 0.4 + Math.random()*0.6,
    swayAmount: 0.03 + Math.random()*0.04,
  });
  
  return group;
}

// Animated chariot - races around circus
export function createAnimatedChariot(scene, circusX, circusZ, circusLength, circusWidth, laneOffset = 0) {
  const group = new THREE.Group();
  
  // Chariot body
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), MAT.woodDark);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);
  
  // Wheels
  for (let side of [-1,1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 16), MAT.woodDark);
    wheel.rotation.y = Math.PI/2;
    wheel.position.set(side*0.7, 0.35, 0);
    group.add(wheel);
  }
  
  // Horses - 2
  for (let i=0;i<2;i++) {
    const horse = new THREE.Group();
    const horseBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.9, 4, 8), new THREE.MeshStandardMaterial({color: 0x8a5a3a}));
    horseBody.rotation.z = Math.PI/2;
    horseBody.position.y = 0.7;
    horse.add(horseBody);
    const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.5), new THREE.MeshStandardMaterial({color: 0x8a5a3a}));
    horseHead.position.set(0.6,0.85,0);
    horse.add(horseHead);
    // Legs
    const legGeo = new THREE.CylinderGeometry(0.06,0.06,0.6,6);
    for (let lx of [-0.3,0.3]) for (let lz of [-0.12,0.12]) {
      const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({color: 0x5a3a2a}));
      leg.position.set(lx,0.15,lz);
      horse.add(leg);
    }
    horse.position.set(1.5 + i*0.2, 0, (i-0.5)*0.8);
    group.add(horse);
  }
  
  // Driver
  const driver = new THREE.Mesh(new THREE.CapsuleGeometry(0.18,0.5,6,8), MAT.skin);
  driver.position.set(-0.2,1.0,0);
  group.add(driver);
  
  scene.add(group);
  
  animatedChariots.push({
    group,
    circusX, circusZ,
    length: circusLength,
    width: circusWidth,
    lane: laneOffset,
    progress: Math.random()*Math.PI*2,
    speed: 0.3 + Math.random()*0.4, // radians per second around track
    bobTime: Math.random()*10,
  });
  
  return group;
}

// Animated smoke - rising particles
export function createAnimatedSmoke(scene, x, y, z, count = 20) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  scene.add(group);
  
  const particles = [];
  for (let i=0;i<count;i++) {
    const mat = new THREE.SpriteMaterial({
      color: 0x888888,
      transparent: true,
      opacity: 0.3 + Math.random()*0.3,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set((Math.random()-0.5)*0.5, Math.random()*2, (Math.random()-0.5)*0.5);
    sprite.scale.set(0.3+Math.random()*0.4, 0.3+Math.random()*0.4, 1);
    group.add(sprite);
    particles.push({
      sprite,
      vel: new THREE.Vector3((Math.random()-0.5)*0.3, 0.5+Math.random()*0.8, (Math.random()-0.5)*0.3),
      life: Math.random()*5,
      baseScale: sprite.scale.x,
    });
  }
  
  animatedSmoke.push({
    group,
    particles,
    time: Math.random()*10,
  });
  
  return group;
}

// Animated door - opens when player near
export function createAnimatedDoor(scene, x, y, z, w, h, mat = MAT.woodDark) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  
  const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), mat);
  door.position.set(w/2, h/2, 0);
  door.castShadow = true;
  group.add(door);
  
  // Handle
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.08,8,6), MAT.bronze);
  handle.position.set(w-0.3, h/2, 0.08);
  group.add(handle);
  
  scene.add(group);
  
  animatedDoors.push({
    group,
    door,
    baseRotation: 0,
    targetRotation: 0,
    currentRotation: 0,
    x, z,
    w, h,
    open: false,
    playerNear: false,
  });
  
  return group;
}

// Animated statue - subtle breathing, eyes glow, etc
export function createAnimatedStatue(scene, x, y, z, scale = 1, type='marble') {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  
  const mat = type==='bronze' ? MAT.bronze : MAT.marble;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35*scale, 1.4*scale, 6, 10), mat);
  body.position.y = 1.1*scale;
  body.castShadow = true;
  group.add(body);
  
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28*scale,12,10), mat);
  head.position.y = 2.15*scale;
  group.add(head);
  
  // Eyes that glow occasionally
  const eyeMat = new THREE.MeshStandardMaterial({color: 0xffaa44, emissive: 0xff6a1a, emissiveIntensity: 0});
  const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.04*scale,6,6), eyeMat);
  eyeL.position.set(-0.08*scale, 2.18*scale, 0.22*scale);
  group.add(eyeL);
  const eyeR = eyeL.clone();
  eyeR.position.x = 0.08*scale;
  group.add(eyeR);
  
  scene.add(group);
  
  animatedStatues.push({
    group,
    head,
    eyes: [eyeL, eyeR],
    eyeMat,
    time: Math.random()*10,
    scale,
  });
  
  return group;
}

// Main update loop - call every frame
export function updateAnimations(dt, elapsed, playerPos = null) {
  globalTime += dt;
  
  // Flags waving
  for (const flag of animatedFlags) {
    const time = globalTime * flag.speed + flag.timeOffset;
    // Vertex displacement for cloth wave
    const positions = flag.geometry.attributes.position;
    const orig = flag.originalPositions;
    for (let i=0;i<positions.count;i++) {
      const ox = orig[i*3];
      const oy = orig[i*3+1];
      const oz = orig[i*3+2];
      // Wave based on distance from pole (x)
      const distFromPole = (ox + flag.mesh.geometry.parameters.width/2) / flag.mesh.geometry.parameters.width;
      const waveX = Math.sin(time*2 + oy*2 + distFromPole*4) * flag.amplitude * distFromPole;
      const waveZ = Math.cos(time*1.5 + ox*3) * flag.amplitude * 0.5 * distFromPole;
      positions.setXYZ(i, ox + waveX*0.3, oy, oz + waveZ);
    }
    positions.needsUpdate = true;
    flag.geometry.computeVertexNormals();
    
    // Also slight rotation of whole flag
    flag.mesh.rotation.z = Math.sin(time*0.8) * 0.08;
  }
  
  // Fires flickering
  for (const fire of animatedFires) {
    fire.time += dt;
    const flicker = Math.sin(fire.time*12)*0.25 + Math.sin(fire.time*23)*0.15 + Math.random()*0.1;
    if (fire.light) {
      fire.light.intensity = fire.baseIntensity + flicker;
    }
    fire.flames.forEach((flame, idx) => {
      const s = fire.scale * (0.6 - idx*0.1 + flicker*0.15);
      flame.scale.set(s, s*1.8 + Math.sin(fire.time*8+idx)*0.1, 1);
      flame.material.rotation = Math.sin(fire.time*8+idx)*0.15;
      flame.position.y = (0.5 + idx*0.25 + Math.sin(fire.time*6+idx)*0.05)*fire.scale;
    });
    // Slight group sway
    fire.group.rotation.z = Math.sin(fire.time*0.5)*0.02;
  }
  
  // Waters bobbing + wave
  for (const water of animatedWaters) {
    const time = globalTime*0.8 + water.timeOffset;
    water.mesh.position.y = water.baseY + Math.sin(time)*0.05;
    const positions = water.geometry.attributes.position;
    const orig = water.originalPositions;
    for (let i=0;i<positions.count;i++) {
      const ox = orig[i*3];
      const oy = orig[i*3+1];
      const wave = Math.sin(time + ox*0.2 + oy*0.2)*0.08;
      positions.setZ(i, wave);
    }
    positions.needsUpdate = true;
  }
  
  // Trees swaying
  for (const tree of animatedTrees) {
    const time = globalTime*tree.swaySpeed + tree.timeOffset;
    tree.foliageGroup.rotation.z = Math.sin(time)*tree.swayAmount;
    tree.foliageGroup.rotation.x = Math.cos(time*0.7)*tree.swayAmount*0.5;
    tree.group.rotation.z = Math.sin(time*0.3)*0.01;
  }
  
  // Chariots racing around circus
  for (const chariot of animatedChariots) {
    chariot.progress += dt * chariot.speed;
    chariot.bobTime += dt*8;
    // Oval track: x = cos(progress)*length/2, z = sin(progress)*width/2
    const ang = chariot.progress;
    const x = chariot.circusX + Math.cos(ang)*(chariot.length/2 - 4 - chariot.lane*3);
    const z = chariot.circusZ + Math.sin(ang)*(chariot.width/2 + 3 + chariot.lane*2);
    chariot.group.position.set(x, 0.1 + Math.sin(chariot.bobTime)*0.05, z);
    chariot.group.rotation.y = -ang + Math.PI/2;
  }
  
  // Smoke rising
  for (const smoke of animatedSmoke) {
    smoke.time += dt;
    for (const p of smoke.particles) {
      p.life -= dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      p.sprite.material.opacity = Math.max(0, p.life/5 * 0.4);
      p.sprite.scale.setScalar(p.baseScale + (5-p.life)*0.2);
      if (p.life <=0 || p.sprite.position.y > 8) {
        p.life = 5 + Math.random()*2;
        p.sprite.position.set((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5);
        p.sprite.material.opacity = 0.3;
      }
    }
  }
  
  // Doors - open when player near
  if (playerPos) {
    for (const door of animatedDoors) {
      const dist = Math.hypot(playerPos.x - door.x, playerPos.z - door.z);
      const shouldOpen = dist < 4;
      if (shouldOpen !== door.open) {
        door.open = shouldOpen;
        door.targetRotation = shouldOpen ? -Math.PI/2.5 : 0;
      }
      // Smooth lerp rotation
      door.currentRotation += (door.targetRotation - door.currentRotation) * Math.min(1, dt*3);
      door.group.rotation.y = door.currentRotation;
    }
  }
  
  // Statues - subtle breathing + eye glow
  for (const statue of animatedStatues) {
    statue.time += dt;
    statue.group.position.y = Math.sin(statue.time*0.3)*0.02;
    // Eyes glow occasionally
    const glowPhase = Math.sin(statue.time*0.2);
    if (glowPhase > 0.8) {
      statue.eyeMat.emissiveIntensity = (glowPhase-0.8)*5;
    } else {
      statue.eyeMat.emissiveIntensity = 0;
    }
    statue.group.rotation.y = Math.sin(statue.time*0.15)*0.05;
  }
}
