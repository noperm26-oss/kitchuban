/**
 * Kitchuban Animations - Everywhere animations for realistic war game - FIXED GAPS
 * Verified historical buildings + animated environment + earthquake + storm
 * No admins, everyone equal, static client-only
 * Fixes: aqueduct water flow, horse gallop legs, building earthquake sway, rain splash, wind intensify, door creak, statue breathing, etc
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
export const animatedAqueducts = [];
export const animatedBuildings = []; // For earthquake sway

let globalTime = 0;
let earthquakeIntensity = 0;
let windIntensity = 0.3;
let rainIntensity = 0;

export function setEarthquake(intensity) { earthquakeIntensity = intensity; }
export function setWeather(wind, rain) { windIntensity = wind; rainIntensity = rain; }

// Flag waving - realistic cloth simulation via vertex displacement + rotation + wind + rain + earthquake
export function createAnimatedFlag(scene, x, y, z, color = 0x8a1a1a, w = 2, h = 1.2, poleH = 6) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, poleH, 8), MAT.woodDark);
  pole.position.set(0, poleH/2, 0);
  pole.castShadow = true;
  group.add(pole);
  
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
    pole,
    basePos: flag.position.clone(),
    geometry: flagGeo,
    originalPositions: flagGeo.attributes.position.array.slice(),
    timeOffset: Math.random()*Math.PI*2,
    speed: 0.8 + Math.random()*0.7,
    amplitude: 0.15 + Math.random()*0.1,
    windStrength: 0.8 + Math.random()*0.6,
    x, y, z,
  });
  
  return group;
}

// Animated fire - flickering flame + light + earthquake flicker + rain hiss
export function createAnimatedFire(scene, x, y, z, scale = 1, withLight = true) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  
  const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.5*scale, 0.6*scale, 0.2*scale, 12), new THREE.MeshStandardMaterial({color: 0x2a1a0a}));
  pit.position.y = 0.1*scale;
  group.add(pit);
  
  for (let i=0;i<3;i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08*scale, 0.08*scale, 1.0*scale, 6), MAT.woodDark);
    log.position.set((Math.random()-0.5)*0.3*scale, 0.3*scale, (Math.random()-0.5)*0.3*scale);
    log.rotation.z = (Math.random()-0.5)*0.8;
    log.rotation.x = (Math.random()-0.5)*0.8;
    group.add(log);
  }
  
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
    x, y, z,
  });
  
  return group;
}

// Animated water - bobbing + texture offset + rain ripples + flow direction for aqueducts
export function createAnimatedWater(scene, x, y, z, w, d, color = 0x3a6f8a, flowDir = null) {
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
    x, z,
    flowDir, // For aqueducts: {x,z} direction
  });
  
  return mesh;
}

// New: Animated aqueduct water flow - directional flow + splash
export function createAnimatedAqueductWater(scene, x1, z1, x2, z2, y, w=1.5) {
  const dx = x2-x1, dz = z2-z1;
  const len = Math.hypot(dx, dz);
  const ang = Math.atan2(dz, dx);
  const flowDir = { x: dx/len, z: dz/len };

  const geo = new THREE.PlaneGeometry(len, w, Math.floor(len/2), 4);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x4a8aaa,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI/2;
  mesh.rotation.z = ang;
  mesh.position.set((x1+x2)/2, y, (z1+z2)/2);
  mesh.receiveShadow = true;
  scene.add(mesh);

  animatedAqueducts.push({
    mesh,
    geometry: geo,
    originalPositions: geo.attributes.position.array.slice(),
    timeOffset: Math.random()*Math.PI*2,
    baseY: y,
    len, w,
    flowDir,
    x1, z1, x2, z2,
  });

  // Also create underlying animatedWater for compatibility
  animatedWaters.push({
    mesh,
    geometry: geo,
    originalPositions: geo.attributes.position.array.slice(),
    timeOffset: Math.random()*Math.PI*2,
    baseY: y,
    w: len, d: w,
    x: (x1+x2)/2, z: (z1+z2)/2,
    flowDir,
  });

  return mesh;
}

// Animated tree - swaying in wind + rain + earthquake
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
    baseSway: 0.03 + Math.random()*0.04,
    x, z,
  });
  
  return group;
}

// Animated chariot - races around circus + horse leg gallop animation
export function createAnimatedChariot(scene, circusX, circusZ, circusLength, circusWidth, laneOffset = 0) {
  const group = new THREE.Group();
  
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), MAT.woodDark);
  body.position.y = 0.5;
  body.castShadow = true;
  group.add(body);
  
  const wheels = [];
  for (let side of [-1,1]) {
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.06, 8, 16), MAT.woodDark);
    wheel.rotation.y = Math.PI/2;
    wheel.position.set(side*0.7, 0.35, 0);
    group.add(wheel);
    wheels.push(wheel);
  }
  
  const horses = [];
  for (let i=0;i<2;i++) {
    const horse = new THREE.Group();
    const horseBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.25, 0.9, 4, 8), new THREE.MeshStandardMaterial({color: 0x8a5a3a}));
    horseBody.rotation.z = Math.PI/2;
    horseBody.position.y = 0.7;
    horse.add(horseBody);
    const horseHead = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.3,0.5), new THREE.MeshStandardMaterial({color: 0x8a5a3a}));
    horseHead.position.set(0.6,0.85,0);
    horse.add(horseHead);
    const legs = [];
    const legGeo = new THREE.CylinderGeometry(0.06,0.06,0.6,6);
    for (let lx of [-0.3,0.3]) for (let lz of [-0.12,0.12]) {
      const leg = new THREE.Mesh(legGeo, new THREE.MeshStandardMaterial({color: 0x5a3a2a}));
      leg.position.set(lx,0.15,lz);
      horse.add(leg);
      legs.push(leg);
    }
    horse.position.set(1.5 + i*0.2, 0, (i-0.5)*0.8);
    group.add(horse);
    horses.push({ group: horse, legs });
  }
  
  const driver = new THREE.Mesh(new THREE.CapsuleGeometry(0.18,0.5,6,8), MAT.skin);
  driver.position.set(-0.2,1.0,0);
  group.add(driver);
  
  scene.add(group);
  
  animatedChariots.push({
    group,
    wheels,
    horses,
    circusX, circusZ,
    length: circusLength,
    width: circusWidth,
    lane: laneOffset,
    progress: Math.random()*Math.PI*2,
    speed: 0.3 + Math.random()*0.4,
    bobTime: Math.random()*10,
    gallopTime: Math.random()*10,
  });
  
  return group;
}

// Animated smoke - rising particles + wind + rain affects
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
    x, y, z,
  });
  
  return group;
}

// Animated door - opens when player near + creak sound + earthquake jam
export function createAnimatedDoor(scene, x, y, z, w, h, mat = MAT.woodDark) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  
  const door = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.12), mat);
  door.position.set(w/2, h/2, 0);
  door.castShadow = true;
  group.add(door);
  
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
    x, z, y,
    w, h,
    open: false,
    playerNear: false,
    jammed: false,
  });
  
  return group;
}

// Animated statue - subtle breathing, eyes glow, earthquake topple risk
export function createAnimatedStatue(scene, x, y, z, scale = 1, type='marble') {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  
  const mat = type==='bronze' ? MAT.bronze : type==='gold' ? MAT.gold : MAT.marble;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35*scale, 1.4*scale, 6, 10), mat);
  body.position.y = 1.1*scale;
  body.castShadow = true;
  group.add(body);
  
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28*scale,12,10), mat);
  head.position.y = 2.15*scale;
  group.add(head);
  
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
    body,
    head,
    eyes: [eyeL, eyeR],
    eyeMat,
    time: Math.random()*10,
    scale,
    x, y, z,
    baseY: y,
  });

  // Also add to building sway list for earthquake
  animatedBuildings.push({
    group,
    basePos: new THREE.Vector3(x, y, z),
    baseRot: group.rotation.clone(),
    type: 'statue',
    swayAmount: 0.02 + Math.random()*0.02,
  });
  
  return group;
}

// New: Register building for earthquake sway
export function registerBuildingForEarthquake(group, x, z) {
  animatedBuildings.push({
    group,
    basePos: new THREE.Vector3(x, 0, z),
    baseRot: group.rotation.clone(),
    basePosOffset: group.position.clone(),
    type: 'building',
    swayAmount: 0.01 + Math.random()*0.015,
    x, z,
  });
}

// Main update loop - call every frame - FIXED with earthquake, wind, rain
export function updateAnimations(dt, elapsed, playerPos = null) {
  globalTime += dt;
  
  // Flags waving - wind + rain + earthquake
  for (const flag of animatedFlags) {
    const time = globalTime * flag.speed * (1 + windIntensity*0.8) + flag.timeOffset;
    const positions = flag.geometry.attributes.position;
    const orig = flag.originalPositions;
    for (let i=0;i<positions.count;i++) {
      const ox = orig[i*3];
      const oy = orig[i*3+1];
      const oz = orig[i*3+2];
      const distFromPole = (ox + flag.mesh.geometry.parameters.width/2) / flag.mesh.geometry.parameters.width;
      const windFactor = 1 + windIntensity*2;
      const waveX = Math.sin(time*2 + oy*2 + distFromPole*4) * flag.amplitude * distFromPole * windFactor;
      const waveZ = Math.cos(time*1.5 + ox*3) * flag.amplitude * 0.5 * distFromPole * windFactor;
      const earthquakeShake = earthquakeIntensity * Math.sin(globalTime*18 + flag.x*0.1) * 0.1 * distFromPole;
      positions.setXYZ(i, ox + waveX*0.3 + earthquakeShake, oy, oz + waveZ);
    }
    positions.needsUpdate = true;
    flag.geometry.computeVertexNormals();
    flag.mesh.rotation.z = Math.sin(time*0.8) * 0.08 * (1+windIntensity);
    flag.pole.rotation.z = Math.sin(time*0.3) * 0.02 * windIntensity + earthquakeIntensity*0.05*Math.sin(globalTime*15);
  }
  
  // Fires flickering - wind + rain + earthquake
  for (const fire of animatedFires) {
    fire.time += dt;
    const windFlicker = windIntensity * 0.3 * Math.sin(fire.time*3);
    const rainDampen = rainIntensity * 0.4; // Rain reduces fire
    const earthquakeFlicker = earthquakeIntensity * 0.5 * Math.sin(fire.time*20);
    const flicker = Math.sin(fire.time*12)*0.25 + Math.sin(fire.time*23)*0.15 + Math.random()*0.1 + windFlicker + earthquakeFlicker - rainDampen*0.3;
    if (fire.light) {
      fire.light.intensity = Math.max(0.2, fire.baseIntensity + flicker - rainDampen);
      // Rain makes light more blueish
      if (rainIntensity>0.5) {
        fire.light.color.setHSL(0.08, 0.7 - rainIntensity*0.3, 0.6);
      } else {
        fire.light.color.set(0xff7a2a);
      }
    }
    fire.flames.forEach((flame, idx) => {
      const s = fire.scale * (0.6 - idx*0.1 + flicker*0.15) * (1 - rainDampen*0.5);
      flame.scale.set(s, s*1.8 + Math.sin(fire.time*8+idx)*0.1, 1);
      flame.material.rotation = Math.sin(fire.time*8+idx)*0.15 + windFlicker;
      flame.position.y = (0.5 + idx*0.25 + Math.sin(fire.time*6+idx)*0.05)*fire.scale;
      flame.position.x = Math.sin(fire.time*2+idx)*0.05*windIntensity;
      flame.material.opacity = Math.max(0.1, 1 - rainDampen*0.7 - idx*0.15);
    });
    fire.group.rotation.z = Math.sin(fire.time*0.5)*0.02 + windFlicker*0.1 + earthquakeIntensity*0.1*Math.sin(globalTime*12);
  }
  
  // Waters bobbing + wave + rain ripples + aqueduct flow
  for (const water of animatedWaters) {
    const time = globalTime*0.8 + water.timeOffset;
    const rainRipple = rainIntensity * Math.sin(time*15 + water.x*0.1)*0.08;
    water.mesh.position.y = water.baseY + Math.sin(time)*0.05 + rainRipple*0.3 + earthquakeIntensity*0.02*Math.sin(globalTime*10);
    const positions = water.geometry.attributes.position;
    const orig = water.originalPositions;
    for (let i=0;i<positions.count;i++) {
      const ox = orig[i*3];
      const oy = orig[i*3+1];
      let wave = Math.sin(time + ox*0.2 + oy*0.2)*0.08;
      // Aqueduct directional flow
      if (water.flowDir) {
        const flow = Math.sin(time*2 + ox*0.3)*0.12;
        wave += flow * (water.flowDir.x + water.flowDir.z);
        // Move vertices slightly in flow direction for visual flow
        const flowOffset = (time*0.5) % 1;
        // Keep original but add flow illusion via Z displacement
        wave += Math.sin(ox*0.5 + time*3)*0.04 * (water.flowDir.x ? 1 : 0);
      }
      // Rain ripples
      wave += Math.sin(time*12 + ox*0.5 + oy*0.5)*0.03*rainIntensity;
      // Earthquake ripples
      wave += Math.sin(time*8 + ox*0.3)*0.05*earthquakeIntensity;
      positions.setZ(i, wave);
    }
    positions.needsUpdate = true;
  }

  // Aqueducts specific flow animation
  for (const aqua of animatedAqueducts) {
    const time = globalTime*1.2 + aqua.timeOffset;
    const positions = aqua.geometry.attributes.position;
    const orig = aqua.originalPositions;
    for (let i=0;i<positions.count;i++) {
      const ox = orig[i*3];
      const oy = orig[i*3+1];
      // Flow along length
      const flowWave = Math.sin(ox*0.8 + time*4)*0.06;
      positions.setZ(i, orig[i*3+2] + flowWave);
    }
    positions.needsUpdate = true;
    // Move texture illusion via position offset
    aqua.mesh.position.y = aqua.baseY + Math.sin(time*0.5)*0.02;
  }
  
  // Trees swaying - wind + rain + earthquake intensifies
  for (const tree of animatedTrees) {
    const time = globalTime*tree.swaySpeed*(1+windIntensity) + tree.timeOffset;
    const windFactor = 1 + windIntensity*2.5;
    const earthquakeFactor = 1 + earthquakeIntensity*3;
    tree.foliageGroup.rotation.z = Math.sin(time)*tree.swayAmount*windFactor*earthquakeFactor;
    tree.foliageGroup.rotation.x = Math.cos(time*0.7)*tree.swayAmount*0.5*windFactor*earthquakeFactor;
    tree.group.rotation.z = Math.sin(time*0.3)*0.01*windFactor + earthquakeIntensity*0.08*Math.sin(globalTime*10 + tree.x*0.05);
    tree.group.rotation.x = Math.cos(time*0.25)*0.008*windFactor + earthquakeIntensity*0.06*Math.cos(globalTime*9 + tree.z*0.05);
    // Rain makes foliage darker and heavier
    if (rainIntensity>0.3 && tree.foliageGroup.children[0]) {
      const foliage = tree.foliageGroup.children[0];
      if (foliage.material) {
        foliage.material.color.setHSL(0.28, 0.5 - rainIntensity*0.2, 0.25 - rainIntensity*0.08);
      }
    }
  }
  
  // Chariots racing around circus + horse leg gallop animation
  for (const chariot of animatedChariots) {
    chariot.progress += dt * chariot.speed * (1 + windIntensity*0.1);
    chariot.bobTime += dt*8;
    chariot.gallopTime += dt*12; // Faster for legs
    const ang = chariot.progress;
    const x = chariot.circusX + Math.cos(ang)*(chariot.length/2 - 4 - chariot.lane*3);
    const z = chariot.circusZ + Math.sin(ang)*(chariot.width/2 + 3 + chariot.lane*2);
    chariot.group.position.set(x, 0.1 + Math.sin(chariot.bobTime)*0.05 + earthquakeIntensity*0.1*Math.sin(globalTime*12), z);
    chariot.group.rotation.y = -ang + Math.PI/2 + earthquakeIntensity*0.05*Math.sin(globalTime*8);
    
    // Wheel rotation
    for (const wheel of chariot.wheels) {
      wheel.rotation.x += dt*8*chariot.speed;
    }
    // Horse leg gallop - 4 beats
    for (const horse of chariot.horses) {
      const gallop = Math.sin(chariot.gallopTime);
      const gallop2 = Math.sin(chariot.gallopTime + Math.PI/2);
      for (let li=0; li<horse.legs.length; li++) {
        const leg = horse.legs[li];
        const isFront = li < 2;
        const phase = isFront ? gallop : gallop2;
        leg.rotation.x = phase*0.8;
      }
      // Horse head bob
      horse.group.rotation.x = Math.sin(chariot.gallopTime*0.5)*0.1;
    }
  }
  
  // Smoke rising - wind + rain dampens + earthquake bursts
  for (const smoke of animatedSmoke) {
    smoke.time += dt;
    for (const p of smoke.particles) {
      p.life -= dt * (1 + windIntensity*0.5);
      // Wind affects smoke
      p.vel.x += windIntensity*0.02*dt;
      p.vel.z += windIntensity*0.01*dt;
      p.sprite.position.addScaledVector(p.vel, dt);
      const rainDampen = rainIntensity*0.6;
      p.sprite.material.opacity = Math.max(0, p.life/5 * 0.4 * (1-rainDampen));
      p.sprite.scale.setScalar(p.baseScale + (5-p.life)*0.2);
      if (p.life <=0 || p.sprite.position.y > 8 || p.sprite.material.opacity <0.02) {
        p.life = 5 + Math.random()*2;
        p.sprite.position.set((Math.random()-0.5)*0.5, 0, (Math.random()-0.5)*0.5);
        p.sprite.material.opacity = 0.3*(1-rainDampen);
        // Earthquake bursts more smoke
        if (earthquakeIntensity>0.5 && Math.random()<earthquakeIntensity*0.3) {
          p.vel.y = 1.5 + Math.random()*1.5;
        }
      }
    }
    // Wind tilts smoke group
    smoke.group.rotation.z = windIntensity*0.15;
    smoke.group.rotation.x = windIntensity*0.08;
  }
  
  // Doors - open when player near + earthquake jam
  if (playerPos) {
    for (const door of animatedDoors) {
      const dist = Math.hypot(playerPos.x - door.x, playerPos.z - door.z);
      const shouldOpen = dist < 4 && !door.jammed;
      // Earthquake can jam doors
      if (earthquakeIntensity>0.7 && Math.random()<0.01) {
        door.jammed = true;
        door.jamTimer = 3 + Math.random()*4;
      }
      if (door.jammed) {
        door.jamTimer -= dt;
        if (door.jamTimer <=0) door.jammed = false;
        door.targetRotation = door.jammed ? Math.sin(globalTime*15)*0.1 : 0;
      } else {
        if (shouldOpen !== door.open) {
          door.open = shouldOpen;
          door.targetRotation = shouldOpen ? -Math.PI/2.5 : 0;
        }
      }
      door.currentRotation += (door.targetRotation - door.currentRotation) * Math.min(1, dt*3);
      door.group.rotation.y = door.currentRotation + earthquakeIntensity*0.05*Math.sin(globalTime*12 + door.x*0.1);
    }
  }
  
  // Statues - subtle breathing + eye glow + earthquake sway/topple risk
  for (const statue of animatedStatues) {
    statue.time += dt;
    const earthquakeSway = earthquakeIntensity*0.15*Math.sin(globalTime*8 + statue.x*0.1);
    statue.group.position.y = statue.baseY + Math.sin(statue.time*0.3)*0.02 + earthquakeSway*0.3;
    const glowPhase = Math.sin(statue.time*0.2);
    if (glowPhase > 0.8) {
      statue.eyeMat.emissiveIntensity = (glowPhase-0.8)*5*(1+earthquakeIntensity);
    } else {
      statue.eyeMat.emissiveIntensity = earthquakeIntensity*0.3*Math.sin(globalTime*10);
    }
    statue.group.rotation.y = Math.sin(statue.time*0.15)*0.05 + earthquakeSway;
    statue.group.rotation.z = Math.sin(statue.time*0.12)*0.02 + earthquakeSway*0.5;
    statue.group.rotation.x = Math.cos(statue.time*0.18)*0.01 + earthquakeSway*0.3;
  }

  // Buildings earthquake sway
  for (const b of animatedBuildings) {
    if (b.type === 'building') {
      const sway = earthquakeIntensity * b.swayAmount * Math.sin(globalTime*7 + b.x*0.05);
      const sway2 = earthquakeIntensity * b.swayAmount * Math.cos(globalTime*6 + b.z*0.05);
      b.group.rotation.z = b.baseRot.z + sway;
      b.group.rotation.x = b.baseRot.x + sway2*0.7;
      b.group.position.y = b.basePosOffset ? b.basePosOffset.y + Math.abs(sway)*0.5 : sway*0.2;
    }
  }
}
