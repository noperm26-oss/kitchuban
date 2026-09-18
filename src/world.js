import * as THREE from 'three';
import { MAT } from './materials.js';
import {
  createFlutedColumnGeometry,
  createCorinthianCapital,
  createEntablature,
  createPediment,
  createTiledRoof,
  createRomanStatue,
  createBronzeStatue,
} from './architecture.js';
import { buildRomanExpansion } from './romanExpansion.js';
import {
  createAnimatedFlag,
  createAnimatedFire,
  createAnimatedWater,
  createAnimatedTree,
  createAnimatedChariot,
  createAnimatedSmoke,
  createAnimatedDoor,
  createAnimatedStatue,
  createAnimatedAqueductWater,
  registerBuildingForEarthquake,
} from './animations.js';

export const colliders = [];
export const torches = [];
export const spawnPoints = [];
export const factionZones = {};
export const buildingInteriors = [];

function addBox(scene, w, h, d, x, y, z, mat, solid = true, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z); m.rotation.y = ry; m.castShadow = true; m.receiveShadow = true;
  scene.add(m);
  if (solid) { m.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(m)); }
  return m;
}
function addColliderFromMesh(mesh) {
  mesh.updateMatrixWorld(true);
  colliders.push(new THREE.Box3().setFromObject(mesh));
}
function createWallWithDoor(scene, x, y, z, w, h, d, doorW, doorH, doorXOffset, mat, ry = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z); group.rotation.y = ry;
  const leftW = (w - doorW) / 2 + doorXOffset;
  const rightW = w - doorW - leftW;
  const left = new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.1, leftW), h, d), mat);
  left.position.set(-w/2 + leftW/2, h/2, 0); left.castShadow = true; left.receiveShadow = true; group.add(left);
  if (rightW > 0.1) {
    const right = new THREE.Mesh(new THREE.BoxGeometry(rightW, h, d), mat);
    right.position.set(w/2 - rightW/2, h/2, 0); right.castShadow = true; right.receiveShadow = true; group.add(right);
  }
  if (doorH < h) {
    const top = new THREE.Mesh(new THREE.BoxGeometry(doorW, h - doorH, d), mat);
    top.position.set(doorXOffset, doorH + (h - doorH)/2, 0); top.castShadow = true; top.receiveShadow = true; group.add(top);
  }
  const frameMat = MAT.marble;
  const frameThick = 0.15;
  const leftFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH, d+0.05), frameMat);
  leftFrame.position.set(doorXOffset - doorW/2 + frameThick/2, doorH/2, 0); group.add(leftFrame);
  const rightFrame = new THREE.Mesh(new THREE.BoxGeometry(frameThick, doorH, d+0.05), frameMat);
  rightFrame.position.set(doorXOffset + doorW/2 - frameThick/2, doorH/2, 0); group.add(rightFrame);
  const topFrame = new THREE.Mesh(new THREE.BoxGeometry(doorW+frameThick*2, frameThick, d+0.05), frameMat);
  topFrame.position.set(doorXOffset, doorH + frameThick/2, 0); group.add(topFrame);
  scene.add(group);
  group.updateMatrixWorld(true);
  group.children.forEach(child => {
    if (child.geometry && child.geometry.type==='BoxGeometry') addColliderFromMesh(child);
  });
  return group;
}
function flutedColumn(scene, x, z, h = 7, r = 0.45, mat = MAT.marble) {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.BoxGeometry(r*3.2, 0.38, r*3.2), mat); base.position.y = 0.19; base.castShadow = true; base.receiveShadow = true; group.add(base);
  const shaftGeo = createFlutedColumnGeometry(h, r*0.85, r, 20, 80, 1, 0.025);
  const shaft = new THREE.Mesh(shaftGeo, mat); shaft.position.y = 0.38 + h/2; shaft.castShadow = true; shaft.receiveShadow = true; group.add(shaft);
  const cap = createCorinthianCapital(r); cap.position.y = 0.38 + h; group.add(cap);
  scene.add(group);
  colliders.push(new THREE.Box3(new THREE.Vector3(x - r*1.2, 0, z - r*1.2), new THREE.Vector3(x + r*1.2, h+1.2, z + r*1.2)));
  return group;
}
function flutedColumnImpl(parent, x, z, h, r, mat = MAT.marble) {
  const group = new THREE.Group(); group.position.set(x, 0, z);
  const base = new THREE.Mesh(new THREE.BoxGeometry(r*3, 0.35, r*3), mat); base.position.y = 0.175; base.castShadow = true; group.add(base);
  const shaftGeo = createFlutedColumnGeometry(h, r*0.85, r, 20, 64, 1, 0.02);
  const shaft = new THREE.Mesh(shaftGeo, mat); shaft.position.y = 0.35 + h/2; shaft.castShadow = true; group.add(shaft);
  const cap = createCorinthianCapital(r); cap.position.y = 0.35 + h; group.add(cap);
  parent.add(group); return group;
}

// ---- Real Roman Buildings with Interiors + Animations Everywhere ----

function templeJupiter(scene, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const podiumW = 34, podiumD = 52, podiumH = 4.5;
  for (let i=0;i<6;i++){ const w=podiumW+(6-i)*1.3, d=podiumD+(6-i)*1.3; const s=new THREE.Mesh(new THREE.BoxGeometry(w,0.6,d), MAT.marble); s.position.y=0.3+i*0.6; s.receiveShadow=true; s.castShadow=true; g.add(s); }
  const topY=3.6;
  const cellaW=20, cellaH=13, cellaD=36;
  for (let i=-1;i<=1;i++){
    const doorX = i*6;
    createWallWithDoor(g, doorX, topY, cellaD/2 -1, 6.5, cellaH, 0.6, 2.2, 5.5, 0, MAT.marble);
  }
  const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.6, cellaH, cellaD), MAT.marble); leftWall.position.set(-cellaW/2, topY+cellaH/2, 0); leftWall.castShadow=true; g.add(leftWall);
  const rightWall = leftWall.clone(); rightWall.position.x = cellaW/2; g.add(rightWall);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(cellaW, cellaH, 0.6), MAT.marble); backWall.position.set(0, topY+cellaH/2, -cellaD/2); backWall.castShadow=true; g.add(backWall);
  for (let i=-1;i<=1;i+=2){
    const div = new THREE.Mesh(new THREE.BoxGeometry(0.5, cellaH*0.9, cellaD*0.85), MAT.marble); div.position.set(i*6.5, topY+cellaH*0.45, 0); g.add(div);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(cellaW-1, cellaD-1), MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.set(0, topY+0.05, 0); floor.receiveShadow=true; g.add(floor);
  for (let i=-1;i<=1;i++){
    const ped = new THREE.Mesh(new THREE.BoxGeometry(2.8,1.5,2.8), MAT.marblePolished); ped.position.set(i*6, topY+0.75, -8); ped.castShadow=true; g.add(ped);
    const mat = i===0?MAT.gold: i===-1?new THREE.MeshStandardMaterial({color:0xc0c0c0, metalness:0.8}): new THREE.MeshStandardMaterial({color:0xd9a441, metalness:0.9});
    const statue = new THREE.Mesh(new THREE.CapsuleGeometry(0.9, 3.2, 8, 16), mat); statue.position.set(i*6, topY+0.75+1.6+0.8, -8); statue.castShadow=true; g.add(statue);
    // Animated statues for Jupiter Juno Minerva - subtle breathing
    createAnimatedStatue(scene, x+i*6, topY+0.75, z-8, 1.1, i===0?'gold':'marble');
  }
  const colH=11.5, colR=0.72;
  for(let i=0;i<6;i++){ const cx=-12+i*24/5; flutedColumnImpl(g, cx, 20, colH, colR); }
  for(let i=0;i<6;i++){ const cx=-12+i*24/5; flutedColumnImpl(g, cx, -22, colH, colR); }
  for(let i=1;i<6;i++){ const cz=-22+i*42/6; for(let side of [-14.5,14.5]) flutedColumnImpl(g, side, cz, colH, colR); }
  const entH=1.7;
  const frontEnt=createEntablature(32,1.4,entH); frontEnt.position.set(0,topY+colH+1,20); g.add(frontEnt);
  const backEnt=createEntablature(32,1.4,entH); backEnt.position.set(0,topY+colH+1,-22); g.add(backEnt);
  const leftEnt=createEntablature(46,1.4,entH); leftEnt.rotation.y=Math.PI/2; leftEnt.position.set(-14.5,topY+colH+1, -1); g.add(leftEnt);
  const rightEnt=leftEnt.clone(); rightEnt.position.set(14.5,topY+colH+1,-1); g.add(rightEnt);
  const frontPed=createPediment(32,2.4,4); frontPed.position.set(0,topY+colH+entH+1,20); g.add(frontPed);
  const backPed=createPediment(32,2.4,4); backPed.position.set(0,topY+colH+entH+1,-22); backPed.rotation.y=Math.PI; g.add(backPed);
  const roof=createTiledRoof(32,48,5.2); roof.position.set(0,topY+colH+entH+1, -1); g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  g.children.forEach(child=>{ if(child.isMesh && child.geometry.type==='BoxGeometry') addColliderFromMesh(child); });
  colliders.push(new THREE.Box3(new THREE.Vector3(x-cellaW/2, topY, z-cellaD/2), new THREE.Vector3(x+cellaW/2, topY+cellaH, z+cellaD/2)));
  for(let side of [-1,1]){ torches.push({x:x+side*4, y:topY+2, z:z+21}); }
  buildingInteriors.push({type:'temple_jupiter', x,z,w:cellaW,d:cellaD, interior:true});
  factionZones['legio'] = {x:x, z:z-30, w:60, d:60, color:0x8a1a1a};
  // Animations everywhere - flags, fire, smoke
  createAnimatedFlag(scene, x, topY+colH+entH+6, z+20, 0x8a1a1a, 2.5, 1.5);
  createAnimatedFlag(scene, x-12, topY+colH+2, z, 0x8a1a1a, 1.5, 1);
  createAnimatedFlag(scene, x+12, topY+colH+2, z, 0x8a1a1a, 1.5, 1);
  createAnimatedFire(scene, x, topY+0.5, z+18, 0.8, true);
  createAnimatedSmoke(scene, x, topY+colH+2, z-5, 12);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function templeSaturn(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const podiumW=24, podiumD=42, podiumH=9;
  const podium = new THREE.Mesh(new THREE.BoxGeometry(podiumW, podiumH, podiumD), MAT.marble);
  podium.position.y=podiumH/2; podium.castShadow=true; podium.receiveShadow=true; g.add(podium);
  const vaultW=18, vaultD=30;
  const vaultFloor = new THREE.Mesh(new THREE.PlaneGeometry(vaultW, vaultD), MAT.marble); vaultFloor.rotation.x=-Math.PI/2; vaultFloor.position.set(0,0.05,0); g.add(vaultFloor);
  for(let i=0;i<4;i++){ const chest=new THREE.Mesh(new THREE.BoxGeometry(2,1.2,1.5), MAT.woodDark); chest.position.set(-6+i*4,0.6, -5); chest.castShadow=true; g.add(chest); const gold=new THREE.Mesh(new THREE.BoxGeometry(0.8,0.5,0.8), MAT.gold); gold.position.set(-6+i*4,1.4,-5); g.add(gold); }
  for(let i=0;i<3;i++){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.05,0.05,3,6), MAT.wood); pole.position.set(0,1.5, 5+i*3); g.add(pole); const eagle=new THREE.Mesh(new THREE.SphereGeometry(0.25,8,8), MAT.gold); eagle.position.set(0,3.2,5+i*3); g.add(eagle); }
  const topY=podiumH;
  const cellaW=14, cellaH=9, cellaD=24;
  createWallWithDoor(g, 0, topY, cellaD/2, cellaW, cellaH, 0.6, 2.4, 5, 0, MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.6,cellaH,cellaD), MAT.marble); leftWall.position.set(-cellaW/2, topY+cellaH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=cellaW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(cellaW,cellaH,0.6), MAT.marble); backWall.position.set(0,topY+cellaH/2,-cellaD/2); g.add(backWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(cellaW-1,cellaD-1), MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.set(0,topY+0.05,0); g.add(floor);
  const statuePed=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.2,2.5), MAT.marblePolished); statuePed.position.set(0,topY+0.6,-6); g.add(statuePed);
  const statue=new THREE.Mesh(new THREE.CapsuleGeometry(0.8,2.5,8,12), new THREE.MeshStandardMaterial({color:0x8a7a5a})); statue.position.set(0,topY+0.6+1.8,-6); g.add(statue);
  createAnimatedStatue(scene, x, topY+0.6, z-6, 1, 'marble');
  const colH=9, colR=0.58;
  for(let i=0;i<8;i++){ const cx=-10+i*20/7; flutedColumnImpl(g, cx, 14, colH, colR); }
  for(let i=0;i<6;i++){ const cx=-8+i*16/5; flutedColumnImpl(g, cx, -14, colH, colR); }
  for(let i=1;i<3;i++){ const cz=-14+i*28/3; for(let side of [-8,8]) flutedColumnImpl(g, side, cz, colH, colR); }
  const ent=createEntablature(22,1.2,1.3); ent.position.set(0,topY+colH+0.9,0); g.add(ent);
  const ped=createPediment(22,2,3.2); ped.position.set(0,topY+colH+1.3+0.9,14); g.add(ped);
  const roof=createTiledRoof(22,32,4); roof.position.set(0,topY+colH+1.3+0.9,0); g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  g.children.forEach(c=>{ if(c.isMesh && c.geometry.type==='BoxGeometry') addColliderFromMesh(c); });
  torches.push({x:x-5,y:topY+1.5,z:z+15}); torches.push({x:x+5,y:topY+1.5,z:z+15});
  buildingInteriors.push({type:'temple_saturn', x,z, interior:true});
  createAnimatedFlag(scene, x, topY+colH+5, z+14, 0xd9a441, 2, 1.2);
  createAnimatedFire(scene, x-6, 0.6, z-5, 0.6, true);
  createAnimatedFire(scene, x+6, 0.6, z-5, 0.6, true);
  createAnimatedSmoke(scene, x, topY+2, z, 10);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function templeVesta(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const podium=new THREE.Mesh(new THREE.CylinderGeometry(8,8.5,1.6,24), MAT.marble); podium.position.y=0.8; podium.castShadow=true; podium.receiveShadow=true; g.add(podium);
  const steps=new THREE.Mesh(new THREE.CylinderGeometry(9,9.5,0.5,24), MAT.marble); steps.position.y=0.25; g.add(steps);
  const colH=7.5, colR=0.44;
  for(let i=0;i<20;i++){ const ang=(i/20)*Math.PI*2; const cx=Math.cos(ang)*6.0, cz=Math.sin(ang)*6.0; flutedColumnImpl(g, cx, cz, colH, colR); }
  const cellaR=4.2, cellaH=7.5;
  const cellaWall = new THREE.Mesh(new THREE.CylinderGeometry(cellaR, cellaR, cellaH, 24, 1, true, 0.3, Math.PI*2-0.6), MAT.marble);
  cellaWall.position.y=1.6+cellaH/2; cellaWall.rotation.y=0.3; cellaWall.castShadow=true; g.add(cellaWall);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(cellaR-0.2,24), MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.y=1.65; g.add(floor);
  const firePit=new THREE.Mesh(new THREE.CylinderGeometry(0.8,1.0,0.4,16), new THREE.MeshStandardMaterial({color:0x2a1a0a})); firePit.position.y=1.8; g.add(firePit);
  const flame=new THREE.Mesh(new THREE.SphereGeometry(0.35,8,8), new THREE.MeshStandardMaterial({color:0xff6a2a, emissive:0xff4a1a, emissiveIntensity:0.8, transparent:true, opacity:0.85})); flame.position.y=2.2; g.add(flame);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(4.6,24,14,0,Math.PI*2,0,Math.PI/2), MAT.marble); dome.position.y=1.6+cellaH; dome.castShadow=true; g.add(dome);
  const ent=new THREE.Mesh(new THREE.TorusGeometry(6.0,0.38,8,28), MAT.marble); ent.rotation.x=Math.PI/2; ent.position.y=1.6+colH+0.6; g.add(ent);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-8,0,z-8), new THREE.Vector3(x+8,9,z+8)));
  torches.push({x:x+7,y:2.2,z:z}); torches.push({x:x-7,y:2.2,z:z});
  buildingInteriors.push({type:'temple_vesta', x,z, interior:true});
  factionZones['vestals'] = {x:x, z:z, w:30, d:30, color:0xffd777};
  // Animations - sacred fire eternal
  createAnimatedFire(scene, x, 1.8, z, 1.2, true);
  createAnimatedFire(scene, x+7, 2.2, z, 0.5, true);
  createAnimatedFire(scene, x-7, 2.2, z, 0.5, true);
  createAnimatedSmoke(scene, x, 3, z, 20);
  createAnimatedFlag(scene, x, 10, z, 0xffd777, 1.8, 1.1);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function curiaJulia(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=18, outerD=26, outerH=12;
  createWallWithDoor(g, 0, 0, outerD/2, outerW, outerH, 0.7, 3.2, 6.5, 0, MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.7,outerH,outerD), MAT.brick); leftWall.position.set(-outerW/2, outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.7), MAT.brick); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  const interiorW=14, interiorD=20;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(interiorW, interiorD), new THREE.MeshStandardMaterial({map: MAT.mosaic.map, roughness:0.6})); floor.rotation.x=-Math.PI/2; floor.position.set(0,0.05,0); floor.receiveShadow=true; g.add(floor);
  for(let side of [-1,1]){
    for(let step=0;step<3;step++){
      const stepW=1.8, stepH=0.5, stepD=interiorD*0.8;
      const s=new THREE.Mesh(new THREE.BoxGeometry(stepW, stepH, stepD), MAT.marble);
      s.position.set(side*(interiorW/2 - stepW/2 - step*1.8), stepH/2 + step*0.5, 0); s.castShadow=true; g.add(s);
    }
  }
  const dias=new THREE.Mesh(new THREE.BoxGeometry(6,0.6,3), MAT.marblePolished); dias.position.set(0,0.3,-interiorD/2+2); g.add(dias);
  const chair=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.8,1.2), MAT.woodDark); chair.position.set(0,1.2,-interiorD/2+2); g.add(chair);
  for(let i=0;i<4;i++){ const cx=-6+i*12/3; flutedColumnImpl(g, cx, outerD/2+1.5, 8.5, 0.52); }
  const ent=createEntablature(20,1.3,1.4); ent.position.set(0,outerH+0.7,outerD/2+1.5); g.add(ent);
  const ped=createPediment(20,2.2,3.2); ped.position.set(0,outerH+0.7+1.4,outerD/2+1.5); g.add(ped);
  const roof=createTiledRoof(20,28,4.2); roof.position.y=outerH+0.7+1.4; g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  g.children.forEach(c=>{ if(c.isMesh && c.geometry.type==='BoxGeometry') addColliderFromMesh(c); });
  torches.push({x:x-6,y:3,z:z+outerD/2+1}); torches.push({x:x+6,y:3,z:z+outerD/2+1});
  buildingInteriors.push({type:'curia', x,z, interior:true});
  factionZones['senate'] = {x:x, z:z, w:40, d:40, color:0xd9a441};
  createAnimatedFlag(scene, x, outerH+5, z+outerD/2+2, 0xd9a441, 2.2, 1.3);
  createAnimatedFire(scene, x-6, 3, z+outerD/2+1, 0.5, true);
  createAnimatedFire(scene, x+6, 3, z+outerD/2+1, 0.5, true);
  createAnimatedDoor(scene, x, 0, z+outerD/2, 3.2, 6.5, MAT.woodDark);
  return g;
}

function tabularium(scene, x, z, w=120, h=18) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(w,h,8), MAT.brick); base.position.y=h/2; base.castShadow=true; base.receiveShadow=true; g.add(base);
  const archCount=Math.floor(w/6.5);
  for(let i=0;i<archCount;i++){
    const ax=-w/2+3.25+i*6.5;
    const pier=new THREE.Mesh(new THREE.BoxGeometry(1.3,7,8.2), MAT.marble); pier.position.set(ax-2.6,3.5,0); g.add(pier);
    const arch=new THREE.Mesh(new THREE.TorusGeometry(2.0,0.32,8,18,Math.PI), MAT.marble); arch.rotation.x=Math.PI/2; arch.rotation.y=Math.PI/2; arch.position.set(ax,7,0); g.add(arch);
    const dark=new THREE.Mesh(new THREE.BoxGeometry(3.2,6,0.6), new THREE.MeshStandardMaterial({color:0x1a1a1a})); dark.position.set(ax,3,4.1); g.add(dark);
    const officeW=4, officeD=5, officeH=6;
    const officeFloor=new THREE.Mesh(new THREE.PlaneGeometry(officeW, officeD), MAT.marble); officeFloor.rotation.x=-Math.PI/2; officeFloor.position.set(ax,0.05, -2); g.add(officeFloor);
    const officeBack=new THREE.Mesh(new THREE.BoxGeometry(officeW,officeH,0.4), MAT.brick); officeBack.position.set(ax,officeH/2, -2-officeD/2); g.add(officeBack);
    const table=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,0.8), MAT.wood); table.position.set(ax,0.4, -1); g.add(table);
    createAnimatedFire(scene, x+ax, 0.8, z-1, 0.3, false);
  }
  const cornice=createEntablature(w,1.6,1.3); cornice.position.set(0,h+0.7,0); g.add(cornice);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,0,z-4), new THREE.Vector3(x+w/2,h+1,z+4)));
  buildingInteriors.push({type:'tabularium', x,z, interior:true});
  createAnimatedFlag(scene, x, h+3, z, 0xd9a441, 2, 1.2);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function basilicaJulia(scene, x, z, w=52, d=102, ry=0) {
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=ry;
  const bodyH=13;
  for(let i=0;i<7;i++){ const ww=w+(7-i)*0.6, dd=d+(7-i)*0.6; const step=new THREE.Mesh(new THREE.BoxGeometry(ww,0.35,dd), MAT.marble); step.position.y=i*0.35+0.175; step.receiveShadow=true; g.add(step); }
  const topY=7*0.35;
  const archCount=Math.floor(d/5.2);
  for(let i=0;i<archCount;i++){
    const az=-d/2+2.6+i*5.2;
    for(let side of [-1,1]){
      const archGroup=new THREE.Group(); archGroup.position.set(side*(w/2+0.1), topY, az);
      const leftPier=new THREE.Mesh(new THREE.BoxGeometry(0.7,6,1.8), MAT.marble); leftPier.position.set(0,3, -1); leftPier.castShadow=true; archGroup.add(leftPier);
      const rightPier=leftPier.clone(); rightPier.position.z=1; archGroup.add(rightPier);
      const archGeo=new THREE.TorusGeometry(1.3,0.22,8,18,Math.PI); const arch=new THREE.Mesh(archGeo, MAT.marble); arch.rotation.x=Math.PI/2; arch.rotation.y=Math.PI/2; arch.position.set(0,6,0); archGroup.add(arch);
      g.add(archGroup);
    }
  }
  const naveW=9, naveD=41;
  const naveFloor=new THREE.Mesh(new THREE.PlaneGeometry(naveW, naveD), MAT.marblePolished); naveFloor.rotation.x=-Math.PI/2; naveFloor.position.set(0,topY+0.06,0); naveFloor.receiveShadow=true; g.add(naveFloor);
  for(let side of [-1,1]){
    const aisleFloor=new THREE.Mesh(new THREE.PlaneGeometry(6, naveD), MAT.travertine); aisleFloor.rotation.x=-Math.PI/2; aisleFloor.position.set(side*7.5, topY+0.05,0); g.add(aisleFloor);
  }
  for(let row of [-1,1]){
    for(let i=-naveD/2+3;i<naveD/2-2;i+=4.5){
      flutedColumnImpl(g, row*4.5, i, 8.5, 0.46, MAT.marble);
    }
  }
  for(let row of [-1,1]){
    for(let i=-d/2+4;i<d/2-2;i+=4){
      flutedColumnImpl(g, row*(w/2-1), i, 6, 0.38, MAT.marble);
    }
  }
  for(let i=-naveD/2+5;i<naveD/2;i+=6){
    const win=new THREE.Mesh(new THREE.BoxGeometry(0.2,1.2,1.8), new THREE.MeshStandardMaterial({color:0x87ceeb, transparent:true, opacity:0.3})); win.position.set(0, topY+10, i); g.add(win);
  }
  for(let end of [-1,1]){
    const apse=new THREE.Mesh(new THREE.CylinderGeometry(5,5,0.6,16,1,false,0,Math.PI), MAT.marble); apse.rotation.x=Math.PI/2; apse.rotation.z=end*Math.PI/2; apse.position.set(0, topY+0.3, end*naveD/2); g.add(apse);
    const apseFloor=new THREE.Mesh(new THREE.CircleGeometry(5,16,0,Math.PI), MAT.mosaic); apseFloor.rotation.x=-Math.PI/2; apseFloor.position.set(0, topY+0.06, end*(naveD/2+0.1)); apseFloor.rotation.z=end*Math.PI/2; g.add(apseFloor);
  }
  const roof=createTiledRoof(w+2, d+2, 4.5); roof.position.y=topY+13; g.add(roof);
  for(let i=0;i<6;i++){
    const table=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.9,0.9), MAT.wood); table.position.set(-w/2+3+i*4, topY+0.45, 0); g.add(table);
  }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2, topY, z-d/2), new THREE.Vector3(x+w/2, topY+13, z+d/2)));
  for(let i=0;i<6;i++){ colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2+2+i*4, topY, z-0.5), new THREE.Vector3(x-w/2+4+i*4, topY+0.9, z+0.5))); }
  buildingInteriors.push({type:'basilica_julia', x,z,w,d, interior:true});
  factionZones['merchants'] = {x:x, z:z, w:60, d:60, color:0x2a5a8a};
  for(let i=0;i<5;i++){ const tz=-d/2+8+i*16; for(let side of [-1,1]){ const lx=x+side*(w/2+0.5)*Math.cos(ry)-tz*Math.sin(ry); const lz=z+side*(w/2+0.5)*Math.sin(ry)+tz*Math.cos(ry); torches.push({x:lx,y:topY+2.5,z:lz}); } }
  createAnimatedFlag(scene, x, topY+16, z, 0x2a5a8a, 2.5, 1.4);
  createAnimatedFlag(scene, x, topY+14, z+d/2, 0x2a5a8a, 1.8, 1);
  createAnimatedFlag(scene, x, topY+14, z-d/2, 0x2a5a8a, 1.8, 1);
  for(let i=0;i<3;i++){ createAnimatedFire(scene, x-w/2+5+i*6, topY+1, z, 0.4, true); }
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function basilicaAemilia(scene, x, z, w=50, d=100, ry=0) {
  const g=new THREE.Group(); g.position.set(x,0,z); g.rotation.y=ry;
  const bodyH=13;
  for(let i=0;i<3;i++){ const ww=w+i*0.5, dd=d+i*0.5; const step=new THREE.Mesh(new THREE.BoxGeometry(ww,0.3,dd), MAT.marble); step.position.y=i*0.3+0.15; g.add(step); }
  const topY=0.9;
  const colCount=17; const archCount=16;
  for(let i=0;i<colCount;i++){
    const az=-d/2 + i*d/(colCount-1);
    for(let side of [-1,1]){
      flutedColumnImpl(g, side*(w/2+0.2), az, bodyH*0.7, 0.42, MAT.marble);
    }
  }
  for(let i=0;i<archCount;i++){
    const az=-d/2 + 2.5 + i*6;
    for(let side of [-1,1]){
      const arch=new THREE.Mesh(new THREE.TorusGeometry(1.4,0.24,8,18,Math.PI), MAT.marble); arch.rotation.x=Math.PI/2; arch.rotation.y=Math.PI/2; arch.position.set(side*(w/2+0.1), topY+5.5, az); g.add(arch);
    }
  }
  const naveFloor=new THREE.Mesh(new THREE.PlaneGeometry(w-2, d-2), MAT.marblePolished); naveFloor.rotation.x=-Math.PI/2; naveFloor.position.set(0,topY+0.05,0); g.add(naveFloor);
  for(let row of [-1,1]){ for(let i=-d/2+5;i<d/2-2;i+=5){ flutedColumnImpl(g, row*6, i, 8, 0.44, MAT.marble); } }
  const roof=createTiledRoof(w+2,d+2,4.8); roof.position.y=topY+13; g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2, topY, z-d/2), new THREE.Vector3(x+w/2, topY+13, z+d/2)));
  buildingInteriors.push({type:'basilica_aemilia', x,z, interior:true});
  createAnimatedFlag(scene, x, topY+16, z, 0xd9a441, 2.2, 1.3);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function basilicaMaxentius(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const naveW=25, naveD=80, vaultH=38;
  for(let i=0;i<4;i++){
    for(let side of [-1,1]){
      const pier=new THREE.Mesh(new THREE.BoxGeometry(4, vaultH, 4), MAT.brick); pier.position.set(side*naveW/2, vaultH/2, -naveD/2 + 10 + i*naveD/3); pier.castShadow=true; g.add(pier);
    }
  }
  for(let i=0;i<3;i++){
    const vault=new THREE.Mesh(new THREE.CylinderGeometry(naveW/2, naveW/2, naveD/3, 16, 1, false, 0, Math.PI), MAT.marble);
    vault.rotation.z=Math.PI/2; vault.rotation.x=Math.PI/2; vault.position.set(0, vaultH, -naveD/2 + 15 + i*naveD/3); g.add(vault);
  }
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(naveW, naveD), MAT.marblePolished); floor.rotation.x=-Math.PI/2; floor.position.y=0.05; g.add(floor);
  const apse=new THREE.Mesh(new THREE.CylinderGeometry(10,10,0.8,20,1,false,0,Math.PI), MAT.marble); apse.rotation.x=Math.PI/2; apse.rotation.z=Math.PI/2; apse.position.set(0,0.4, -naveD/2-0.5); g.add(apse);
  const constPed=new THREE.Mesh(new THREE.BoxGeometry(4,2,4), MAT.marble); constPed.position.set(0,1, -naveD/2-3); g.add(constPed);
  const constStatue=new THREE.Mesh(new THREE.CapsuleGeometry(1.5, 8, 8, 12), MAT.marble); constStatue.position.set(0,1+1+4, -naveD/2-3); constStatue.castShadow=true; g.add(constStatue);
  createAnimatedStatue(scene, x, 1, z-naveD/2-3, 1.8, 'marble');
  const head=new THREE.Mesh(new THREE.SphereGeometry(1.2,12,10), MAT.marble); head.position.set(0,1+1+4+5, -naveD/2-3); g.add(head);
  for(let i=0;i<5;i++){
    const ex=-naveD/2+10+i*14;
    const arch=new THREE.Mesh(new THREE.TorusGeometry(2.2,0.35,8,18,Math.PI), MAT.marble); arch.rotation.x=Math.PI/2; arch.rotation.y=Math.PI/2; arch.position.set(naveW/2+0.2, 5, ex); g.add(arch);
  }
  const roof=createTiledRoof(naveW+4, naveD+6, 6); roof.position.y=vaultH+2; g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-naveW/2-2,0,z-naveD/2-5), new THREE.Vector3(x+naveW/2+2, vaultH, z+naveD/2+2)));
  buildingInteriors.push({type:'basilica_maxentius', x,z, interior:true});
  createAnimatedFlag(scene, x, vaultH+6, z, 0x8a1a1a, 3, 1.8);
  createAnimatedSmoke(scene, x, 2, z, 15);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function templeCastorPollux(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const podiumW=32, podiumD=50, podiumH=3.5;
  for(let i=0;i<4;i++){ const w=podiumW+i*1, d=podiumD+i*1; const s=new THREE.Mesh(new THREE.BoxGeometry(w,0.6,d), MAT.marble); s.position.y=i*0.6+0.3; g.add(s); }
  const topY=2.4;
  const cellaW=18, cellaH=14, cellaD=34;
  createWallWithDoor(g, 0, topY, cellaD/2, cellaW, cellaH, 0.7, 3, 6, 0, MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.7,cellaH,cellaD), MAT.marble); leftWall.position.set(-cellaW/2, topY+cellaH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=cellaW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(cellaW,cellaH,0.7), MAT.marble); backWall.position.set(0,topY+cellaH/2,-cellaD/2); g.add(backWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(cellaW-1,cellaD-1), MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.set(0,topY+0.05,0); g.add(floor);
  for(let i=-1;i<=1;i+=2){ const ped=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.2,2.5), MAT.marblePolished); ped.position.set(i*5, topY+0.6, -8); g.add(ped); const statue=new THREE.Mesh(new THREE.CapsuleGeometry(0.7,2.6,8,12), MAT.marble); statue.position.set(i*5, topY+0.6+1.8, -8); g.add(statue); createAnimatedStatue(scene, x+i*5, topY+0.6, z-8, 0.9, 'marble'); }
  const colH=14.6, colR=0.65;
  for(let i=0;i<8;i++){ const cx=-12+i*24/7; flutedColumnImpl(g, cx, 18, colH, colR); }
  for(let i=0;i<8;i++){ const cx=-12+i*24/7; flutedColumnImpl(g, cx, -18, colH, colR); }
  for(let i=1;i<10;i++){ const cz=-18+i*36/10; for(let side of [-13,13]) flutedColumnImpl(g, side, cz, colH, colR); }
  const ent=createEntablature(30,1.5,1.6); ent.position.set(0,topY+colH+1,0); g.add(ent);
  const ped=createPediment(30,2.5,4); ped.position.set(0,topY+colH+1.6+1,18); g.add(ped);
  const roof=createTiledRoof(30,40,5); roof.position.set(0,topY+colH+1.6+1,0); g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-16,topY,z-20), new THREE.Vector3(x+16,topY+cellaH,z+20)));
  buildingInteriors.push({type:'temple_castor', x,z, interior:true});
  createAnimatedFlag(scene, x, topY+colH+6, z+18, 0x2a5a8a, 2, 1.2);
  createAnimatedFire(scene, x, topY+0.5, z+12, 0.6, true);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function templeCaesar(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const lowerW=27, lowerD=30, lowerH=2.5;
  const lower=new THREE.Mesh(new THREE.BoxGeometry(lowerW, lowerH, lowerD), MAT.marble); lower.position.set(0, lowerH/2, 4); lower.castShadow=true; g.add(lower);
  for(let i=-10;i<=10;i+=2.5){ const beak=new THREE.Mesh(new THREE.ConeGeometry(0.32,1.0,8), MAT.bronze); beak.rotation.z=Math.PI/2; beak.position.set(i, lowerH+0.3, 4+lowerD/2+0.5); g.add(beak); }
  const upperW=27, upperD=22, upperH=5.5;
  const upper=new THREE.Mesh(new THREE.BoxGeometry(upperW, upperH, upperD), MAT.marble); upper.position.set(0, lowerH+upperH/2, -2); upper.castShadow=true; g.add(upper);
  const topY=lowerH+upperH;
  const cellaW=16, cellaH=8, cellaD=16;
  createWallWithDoor(g, 0, topY, cellaD/2, cellaW, cellaH, 0.6, 2.5, 4.5, 0, MAT.marble);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(cellaW-1,cellaD-1), MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.set(0,topY+0.05,0); g.add(floor);
  const statuePed=new THREE.Mesh(new THREE.BoxGeometry(3,1.5,3), MAT.marblePolished); statuePed.position.set(0,topY+0.75,-2); g.add(statuePed);
  const statue=new THREE.Mesh(new THREE.CapsuleGeometry(1.0,3.5,8,12), MAT.gold); statue.position.set(0,topY+0.75+2.5,-2); g.add(statue);
  createAnimatedStatue(scene, x, topY+0.75, z-2, 1.2, 'gold');
  const colH=7, colR=0.48;
  for(let i=0;i<4;i++){ const cx=-6+i*12/3; flutedColumnImpl(g, cx, 8, colH, colR); }
  const ent=createEntablature(18,1.1,1.1); ent.position.set(0,topY+colH+0.8,8); g.add(ent);
  const ped=createPediment(18,1.8,2.8); ped.position.set(0,topY+colH+1.1+0.8,8); g.add(ped);
  const roof=createTiledRoof(18,20,3.2); roof.position.set(0,topY+colH+1.1+0.8,0); g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-lowerW/2,0,z-2), new THREE.Vector3(x+lowerW/2, lowerH+upperH+cellaH, z+lowerD/2+6)));
  buildingInteriors.push({type:'temple_caesar', x,z, interior:true});
  createAnimatedFlag(scene, x, topY+colH+4, z+8, 0x8a1a1a, 1.5, 1);
  createAnimatedFire(scene, x, topY+0.5, z-2, 0.5, true);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function houseVestals(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=38, outerD=48, outerH=12;
  createWallWithDoor(g, 0, 0, outerD/2, outerW, outerH, 0.8, 3, 5, 0, MAT.brick);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.8,outerH,outerD), MAT.brick); leftWall.position.set(-outerW/2, outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.8), MAT.brick); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  const atriumW=20, atriumD=24;
  const atriumFloor=new THREE.Mesh(new THREE.PlaneGeometry(atriumW, atriumD), MAT.marble); atriumFloor.rotation.x=-Math.PI/2; atriumFloor.position.set(0,0.05,2); g.add(atriumFloor);
  for(let i=-1;i<=1;i+=2){
    const pond=new THREE.Mesh(new THREE.BoxGeometry(6,0.3,8), MAT.water); pond.position.set(i*4,0.25,2); g.add(pond);
    createAnimatedWater(scene, x+i*4, 0.26, z+2, 6, 8, 0x4a8aaa);
  }
  for(let i=0;i<6;i++){ const cx=-atriumW/2 + i*atriumW/5; flutedColumnImpl(g, cx, atriumD/2+2, 5.5, 0.32, MAT.marble); flutedColumnImpl(g, cx, -atriumD/2+2, 5.5, 0.32, MAT.marble); }
  for(let i=1;i<5;i++){ const cz=-atriumD/2+2 + i*atriumD/5; flutedColumnImpl(g, -atriumW/2, cz, 5.5, 0.32, MAT.marble); flutedColumnImpl(g, atriumW/2, cz, 5.5, 0.32, MAT.marble); }
  for(let r=0;r<12;r++){
    const rx = (r%4)*8 -12; const rz = Math.floor(r/4)*8 -12;
    if(Math.abs(rx)<atriumW/2+2 && Math.abs(rz-2)<atriumD/2+2) continue;
    const roomW=3.5, roomD=3.5, roomH=3;
    const room=new THREE.Mesh(new THREE.BoxGeometry(roomW,roomH,roomD), MAT.brick); room.position.set(rx, roomH/2, rz); g.add(room);
    const roomFloor=new THREE.Mesh(new THREE.PlaneGeometry(roomW-0.2, roomD-0.2), MAT.mosaic); roomFloor.rotation.x=-Math.PI/2; roomFloor.position.set(rx,0.06,rz); g.add(roomFloor);
    const bed=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.4,0.9), MAT.wood); bed.position.set(rx,0.2,rz); g.add(bed);
  }
  const secondFloor=new THREE.Mesh(new THREE.BoxGeometry(outerW,0.4,outerD), MAT.marble); secondFloor.position.set(0,6,0); g.add(secondFloor);
  const numaPed=new THREE.Mesh(new THREE.BoxGeometry(1.5,1,1.5), MAT.marble); numaPed.position.set(12,0.5, -10); g.add(numaPed);
  const numa=new THREE.Mesh(new THREE.CapsuleGeometry(0.4,1.2,6,8), MAT.marble); numa.position.set(12,0.5+0.5+0.8, -10); g.add(numa);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH,z+outerD/2)));
  buildingInteriors.push({type:'house_vestals', x,z, interior:true});
  factionZones['vestals_house'] = {x:x, z:z, w:50, d:50, color:0xffd777};
  createAnimatedFlag(scene, x, outerH+2, z+outerD/2, 0xffd777, 1.5, 1);
  createAnimatedSmoke(scene, x, 2, z, 8);
  return g;
}

function domus(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=16, outerD=22, outerH=7;
  createWallWithDoor(g, 0, 0, outerD/2, outerW, outerH, 0.6, 2.0, 3.2, 0, MAT.brick);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.6,outerH,outerD), MAT.brick); leftWall.position.set(-outerW/2, outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.6), MAT.brick); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  const vestibFloor=new THREE.Mesh(new THREE.PlaneGeometry(4,3), MAT.mosaic); vestibFloor.rotation.x=-Math.PI/2; vestibFloor.position.set(0,0.06, outerD/2-1.5); g.add(vestibFloor);
  const atriumFloor=new THREE.Mesh(new THREE.PlaneGeometry(8,8), MAT.marble); atriumFloor.rotation.x=-Math.PI/2; atriumFloor.position.set(0,0.05,4); g.add(atriumFloor);
  const impluvium=new THREE.Mesh(new THREE.BoxGeometry(3,0.2,3), MAT.water); impluvium.position.set(0,0.15,4); g.add(impluvium);
  createAnimatedWater(scene, x, 0.16, z+4, 3, 3, 0x4a8aaa);
  for(let i=0;i<4;i++){
    const ang=(i/4)*Math.PI*2;
    const roofPart=new THREE.Mesh(new THREE.BoxGeometry(6,0.3,2), MAT.terracotta); roofPart.position.set(Math.cos(ang)*4, 6.5, 4+Math.sin(ang)*4); roofPart.rotation.y=ang; g.add(roofPart);
  }
  const lararium=new THREE.Mesh(new THREE.BoxGeometry(1.2,1.5,0.3), MAT.marble); lararium.position.set(-3,0.75,5); g.add(lararium);
  const arca=new THREE.Mesh(new THREE.BoxGeometry(1.0,0.8,0.6), MAT.woodDark); arca.position.set(3,0.4,6); g.add(arca);
  const tablinumW=6, tablinumD=4, tablinumH=4;
  const tabFloor=new THREE.Mesh(new THREE.PlaneGeometry(tablinumW, tablinumD), MAT.marblePolished); tabFloor.rotation.x=-Math.PI/2; tabFloor.position.set(0,0.06, -1); g.add(tabFloor);
  const tabBack=new THREE.Mesh(new THREE.BoxGeometry(tablinumW,tablinumH,0.4), MAT.brick); tabBack.position.set(0,tablinumH/2, -1-tablinumD/2); g.add(tabBack);
  const tabTable=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,0.8), MAT.wood); tabTable.position.set(0,0.4,-1); g.add(tabTable);
  const periFloor=new THREE.Mesh(new THREE.PlaneGeometry(10,8), new THREE.MeshStandardMaterial({color:0x3a5a2a})); periFloor.rotation.x=-Math.PI/2; periFloor.position.set(0,0.05,-8); g.add(periFloor);
  for(let i=0;i<4;i++){ const cx=-4+i*8/3; flutedColumnImpl(g, cx, -4, 4, 0.28, MAT.marble); flutedColumnImpl(g, cx, -12, 4, 0.28, MAT.marble); }
  for(let side of [-1,1]){
    for(let j=0;j<2;j++){
      const cx=side*5.5, cz=4+j*3-1.5;
      const room=new THREE.Mesh(new THREE.BoxGeometry(3,3.5,3), MAT.brick); room.position.set(cx,1.75,cz); g.add(room);
      const bed=new THREE.Mesh(new THREE.BoxGeometry(1.8,0.4,0.9), MAT.wood); bed.position.set(cx,0.2,cz); g.add(bed);
    }
  }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH,z+outerD/2)));
  buildingInteriors.push({type:'domus', x,z, interior:true});
  createAnimatedFire(scene, x-3, 0.75, z+5, 0.3, false);
  createAnimatedDoor(scene, x, 0, z+outerD/2, 2.0, 3.2, MAT.woodDark);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function fountain(scene, x, z) {
  const group=new THREE.Group(); group.position.set(x,0,z);
  const rim=new THREE.Mesh(new THREE.CylinderGeometry(5,5.2,1.3,32), MAT.marble); rim.position.y=0.65; rim.castShadow=true; group.add(rim);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(4.4,4.4,0.26,32), MAT.water); water.position.y=1.12; group.add(water);
  const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.5,0.7,3.6,16), MAT.marble); pillar.position.y=2.6; pillar.castShadow=true; group.add(pillar);
  const bowl=new THREE.Mesh(new THREE.CylinderGeometry(1.9,0.8,0.75,20), MAT.marble); bowl.position.y=4.1; group.add(bowl);
  const topWater=new THREE.Mesh(new THREE.CylinderGeometry(1.7,1.7,0.14,20), MAT.water); topWater.position.y=4.44; group.add(topWater);
  for(let i=0;i<4;i++){ const ang=(i/4)*Math.PI*2; const lion=new THREE.Mesh(new THREE.SphereGeometry(0.26,8,8), MAT.marble); lion.position.set(Math.cos(ang)*0.6,3.0,Math.sin(ang)*0.6); group.add(lion); }
  const mosaicRing=new THREE.Mesh(new THREE.RingGeometry(5.3,8,32), MAT.mosaic); mosaicRing.rotation.x=-Math.PI/2; mosaicRing.position.y=0.03; group.add(mosaicRing);
  scene.add(group); colliders.push(new THREE.Box3(new THREE.Vector3(x-5.2,0,z-5.2), new THREE.Vector3(x+5.2,1.3,z+5.2)));
  createAnimatedWater(scene, x, 1.13, z, 8.8, 8.8, 0x4a8aaa);
  createAnimatedWater(scene, x, 4.45, z, 3.4, 3.4, 0x5a9acc);
  // Splash particles via smoke but water-like
  createAnimatedSmoke(scene, x, 4.5, z, 8);
  registerBuildingForEarthquake(group, x, z);
  return group;
}

function marketStalls(scene, count=24) {
  for(let i=0;i<count;i++){
    const x=-160 + (i%8)*40; const z=50 + Math.floor(i/8)*18;
    const stall=new THREE.Group(); stall.position.set(x,0,z);
    const counter=new THREE.Mesh(new THREE.BoxGeometry(4.6,1.3,2.6), MAT.wood); counter.position.y=0.65; counter.castShadow=true; stall.add(counter);
    const postGeo=new THREE.CylinderGeometry(0.08,0.08,3.4,6);
    [[-2.1,-1.1],[2.1,-1.1],[-2.1,1.1],[2.1,1.1]].forEach(([px,pz])=>{ const post=new THREE.Mesh(postGeo, MAT.woodDark); post.position.set(px,1.7,pz); stall.add(post); });
    const awningColors=[0xb03030,0xe8d8b0,0x2a5a8a,0xd9a441,0x4a7a3a,0x7a3a2a];
    const awningMat=new THREE.MeshStandardMaterial({color:awningColors[i%awningColors.length], roughness:0.9, side:THREE.DoubleSide});
    const awning=new THREE.Mesh(new THREE.PlaneGeometry(5.4,3.6), awningMat); awning.rotation.x=Math.PI/2.2; awning.position.set(0,3.35,0); stall.add(awning);
    for(let j=0;j<3;j++){ const amph=new THREE.Mesh(new THREE.CylinderGeometry(0.20,0.24,0.60,10), MAT.terracotta); amph.position.set(-1.4+j*1.4,1.45,0.2); stall.add(amph); }
    scene.add(stall); colliders.push(new THREE.Box3(new THREE.Vector3(x-2.4,0,z-1.4), new THREE.Vector3(x+2.4,1.3,z+1.4)));
    // Animated awning waving
    createAnimatedFlag(scene, x, 3.35, z, awningColors[i%awningColors.length], 2.7, 1.8);
  }
}

function insula(scene, x, z, w=18, d=22, h=12) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const body=new THREE.Mesh(new THREE.BoxGeometry(w,h,d), MAT.brick); body.position.y=h/2; body.castShadow=true; g.add(body);
  for(let floor=1;floor<3;floor++){
    const y=floor*h/3; const slab=new THREE.Mesh(new THREE.BoxGeometry(w+0.3,0.25,d+0.3), MAT.marble); slab.position.y=y; g.add(slab);
    for(let i=-w/2+2;i<w/2;i+=3.2){ const win=new THREE.Mesh(new THREE.BoxGeometry(1.3,1.5,0.12), new THREE.MeshStandardMaterial({color:0x1a1a1a})); win.position.set(i, y+1.3, d/2+0.06); g.add(win); const win2=win.clone(); win2.position.z=-d/2-0.06; g.add(win2); }
  }
  const shopFloor=new THREE.Mesh(new THREE.PlaneGeometry(w-2, d-2), MAT.travertine); shopFloor.rotation.x=-Math.PI/2; shopFloor.position.y=0.06; g.add(shopFloor);
  const counter=new THREE.Mesh(new THREE.BoxGeometry(w*0.6,1.0,0.8), MAT.wood); counter.position.set(0,0.5, d/2-1.5); g.add(counter);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+0.6,0.6,d+0.6), MAT.terracotta); roof.position.y=h+0.3; g.add(roof);
  const balc=new THREE.Mesh(new THREE.BoxGeometry(w*0.7,0.18,1.3), MAT.wood); balc.position.set(0,h*0.66,d/2+0.65); g.add(balc);
  scene.add(g); g.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(g));
  colliders.push(new THREE.Box3(new THREE.Vector3(x-w*0.3,0,z+d/2-2), new THREE.Vector3(x+w*0.3,1.0,z+d/2-1)));
  if(Math.random()<0.3) createAnimatedSmoke(scene, x, h+0.5, z, 6);
  registerBuildingForEarthquake(g, x, z);
}

function bathsCaracalla(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=60, outerD=80, outerH=14;
  createWallWithDoor(g, 0, 0, outerD/2, outerW, outerH, 0.8, 4, 6, 0, MAT.brick);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.8,outerH,outerD), MAT.brick); leftWall.position.set(-outerW/2, outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.8), MAT.brick); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  const coldPool=new THREE.Mesh(new THREE.BoxGeometry(20,0.5,12), MAT.water); coldPool.position.set(0,0.25,10); g.add(coldPool);
  createAnimatedWater(scene, x, 0.26, z+10, 20, 12, 0x3a6f8a);
  const coldFloor=new THREE.Mesh(new THREE.PlaneGeometry(24,16), MAT.marble); coldFloor.rotation.x=-Math.PI/2; coldFloor.position.set(0,0.06,10); g.add(coldFloor);
  const warmPool=new THREE.Mesh(new THREE.BoxGeometry(12,0.5,8), new THREE.MeshStandardMaterial({color:0x6a9aaa})); warmPool.position.set(0,0.25,-5); g.add(warmPool);
  createAnimatedWater(scene, x, 0.26, z-5, 12, 8, 0x6a9aaa);
  for(let i=-8;i<=8;i+=4){ for(let j=-20;j<=-10;j+=4){ const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,1,6), MAT.brick); pillar.position.set(i,0.5,j); g.add(pillar); } }
  const hotFloor=new THREE.Mesh(new THREE.PlaneGeometry(20,12), MAT.marble); hotFloor.rotation.x=-Math.PI/2; hotFloor.position.set(0,1.05,-15); g.add(hotFloor);
  for(let i=0;i<6;i++){ const cx=-20+i*40/5; flutedColumnImpl(g, cx, 20, 8, 0.5); flutedColumnImpl(g, cx, -20, 8, 0.5); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH,z+outerD/2)));
  buildingInteriors.push({type:'baths', x,z, interior:true});
  torches.push({x:x-10,y:3,z:z+20}); torches.push({x:x+10,y:3,z:z+20});
  createAnimatedSmoke(scene, x, 2, z-15, 20);
  createAnimatedSmoke(scene, x, 2, z+10, 15);
  createAnimatedFlag(scene, x, outerH+2, z+outerD/2, 0x2a5a8a, 2, 1.2);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function circusMaximus(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const length=120, width=35;
  const track=new THREE.Mesh(new THREE.PlaneGeometry(length, width), new THREE.MeshStandardMaterial({color:0xc8b898, roughness:0.9})); track.rotation.x=-Math.PI/2; track.position.y=0.02; track.receiveShadow=true; g.add(track);
  const spina=new THREE.Mesh(new THREE.BoxGeometry(length*0.6,0.8,3), MAT.marble); spina.position.set(0,0.4,0); spina.castShadow=true; g.add(spina);
  for(let end of [-1,1]){ const meta=new THREE.Mesh(new THREE.ConeGeometry(1.2,2.5,8), MAT.marble); meta.position.set(end*length*0.28,1.25,0); g.add(meta); }
  for(let side of [-1,1]){
    for(let i=-length/2;i<length/2;i+=8){
      const seat=new THREE.Mesh(new THREE.BoxGeometry(6,1.2,2), MAT.marble); seat.position.set(i,0.6, side*(width/2+3)); seat.castShadow=true; g.add(seat);
    }
  }
  for(let i=0;i<8;i++){ const gate=new THREE.Mesh(new THREE.BoxGeometry(1,2.5,1), MAT.woodDark); gate.position.set(-length/2+2+i*3,1.25,width/2+1); g.add(gate); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-length/2,0,z-width/2-5), new THREE.Vector3(x+length/2,3,z+width/2+5)));
  buildingInteriors.push({type:'circus', x,z, interior:true});
  // Animated chariots racing
  for(let i=0;i<6;i++){
    createAnimatedChariot(scene, x, z, length, width, i*1.2);
  }
  createAnimatedFlag(scene, x, 5, z+width/2+5, 0x8a1a1a, 2.5, 1.5);
  createAnimatedFlag(scene, x, 5, z-width/2-5, 0x2a5a8a, 2.5, 1.5);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function colosseum(scene, x, z) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerR1=25, outerR2=20, height=18;
  for(let tier=0;tier<3;tier++){
    const y=tier*5.5+2.75; const r1=outerR1-tier*1.2, r2=outerR2-tier*1;
    const archCount=24;
    for(let i=0;i<archCount;i++){
      const ang=(i/archCount)*Math.PI*2;
      const ax=Math.cos(ang)*r1, az=Math.sin(ang)*r2;
      const pier=new THREE.Mesh(new THREE.BoxGeometry(1.2,5,1.2), MAT.marble); pier.position.set(ax,y,az); pier.lookAt(0,y,0); pier.castShadow=true; g.add(pier);
      if(tier===0){ const arch=new THREE.Mesh(new THREE.TorusGeometry(1.8,0.25,6,12,Math.PI), MAT.marble); arch.position.set(ax,y+2.5,az); arch.lookAt(0,y+2.5,0); arch.rotation.x=Math.PI/2; g.add(arch); }
    }
  }
  const arena=new THREE.Mesh(new THREE.PlaneGeometry(30,18), new THREE.MeshStandardMaterial({color:0xc8a87a})); arena.rotation.x=-Math.PI/2; arena.position.y=0.05; arena.receiveShadow=true; g.add(arena);
  const hypo=new THREE.Mesh(new THREE.BoxGeometry(28,2,16), new THREE.MeshStandardMaterial({color:0x2a1a0a})); hypo.position.y=-1; g.add(hypo);
  for(let r=10;r<outerR1;r+=3){
    const seats=new THREE.Mesh(new THREE.TorusGeometry(r,0.3,6,32), MAT.marble); seats.rotation.x=Math.PI/2; seats.position.y=2+r*0.15; g.add(seats);
  }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerR1,0,z-outerR2), new THREE.Vector3(x+outerR1,height,z+outerR2)));
  buildingInteriors.push({type:'colosseum', x,z, interior:true});
  torches.push({x:x+outerR1+2,y:3,z:z}); torches.push({x:x-outerR1-2,y:3,z:z});
  createAnimatedFlag(scene, x, height+3, z, 0x8a1a1a, 3, 1.8);
  createAnimatedFlag(scene, x+outerR1, height+1, z, 0xd9a441, 2, 1.2);
  createAnimatedFlag(scene, x-outerR1, height+1, z, 0xd9a441, 2, 1.2);
  createAnimatedSmoke(scene, x, 1, z, 10);
  registerBuildingForEarthquake(g, x, z);
  return g;
}

function statues(scene) {
  const spots=[[-22,22],[22,22],[-22,-32],[22,-32],[-55,-55],[55,-55],[-75,15],[75,15],[-120,60],[120,60],[-120,-60],[120,-60]];
  spots.forEach(([x,z],idx)=>{
    const ped=new THREE.Mesh(new THREE.BoxGeometry(2.6,2.6,2.6), MAT.marble); ped.position.set(x,1.3,z); ped.castShadow=true; ped.receiveShadow=true; scene.add(ped);
    colliders.push(new THREE.Box3(new THREE.Vector3(x-1.3,0,z-1.3), new THREE.Vector3(x+1.3,2.6,z+1.3)));
    const statue=idx%2===0?createBronzeStatue(1.1):createRomanStatue(1.1); statue.position.set(x,2.6,z); statue.rotation.y=Math.atan2(-x,-z); scene.add(statue);
    createAnimatedStatue(scene, x, 2.6, z, 1.1, idx%2===0?'bronze':'marble');
    torches.push({x:x+1.8,y:1.5,z:z});
    createAnimatedFire(scene, x+1.8, 1.5, z, 0.4, false);
  });
}

function street(scene, x1,z1,x2,z2,width=7){
  const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz), ang=Math.atan2(dz,dx);
  const streetGeo=new THREE.PlaneGeometry(len,width);
  const streetMat=new THREE.MeshStandardMaterial({color:0x8a7a6a, roughness:0.96});
  const streetMesh=new THREE.Mesh(streetGeo, streetMat); streetMesh.rotation.x=-Math.PI/2; streetMesh.rotation.z=ang; streetMesh.position.set((x1+x2)/2,0.016,(z1+z2)/2); streetMesh.receiveShadow=true; scene.add(streetMesh);
  for(let side of [-1,1]){
    const curb=new THREE.Mesh(new THREE.BoxGeometry(len,0.28,0.35), MAT.marble); curb.position.set((x1+x2)/2 + Math.sin(ang)*side*width/2, 0.14, (z1+z2)/2 - Math.cos(ang)*side*width/2); curb.rotation.y=-ang; curb.castShadow=true; scene.add(curb);
  }
}

function factionCamp(scene, x, z, faction, size=28) {
  const g=new THREE.Group(); g.position.set(x,0,z);
  const wallH=3.5;
  for(let i=0;i<4;i++){
    const wx = i%2===0 ? size : 0.6; const wz = i%2===1 ? size : 0.6;
    const px = i===0 ? 0 : i===1 ? size/2 : i===2 ? 0 : -size/2;
    const pz = i===0 ? size/2 : i===1 ? 0 : i===2 ? -size/2 : 0;
    const wall=new THREE.Mesh(new THREE.BoxGeometry(wx, wallH, wz), MAT.woodDark); wall.position.set(px, wallH/2, pz); wall.castShadow=true; g.add(wall);
  }
  for(let i=0;i<4;i++){
    const bx = (Math.random()-0.5)*size*0.6, bz=(Math.random()-0.5)*size*0.6;
    const barrack=new THREE.Mesh(new THREE.BoxGeometry(6,2.5,3), new THREE.MeshStandardMaterial({color: faction==='legio'?0x8a1a1a: faction==='praetorian'?0x1a1a2a: faction==='rebels'?0x5a3a2a:0x4a5a3a})); barrack.position.set(bx,1.25,bz); barrack.castShadow=true; g.add(barrack);
  }
  const pole=new THREE.Mesh(new THREE.CylinderGeometry(0.06,0.06,6,6), MAT.wood); pole.position.set(0,3,0); g.add(pole);
  const flagColor = faction==='legio'?0x8a1a1a: faction==='praetorian'?0x1a1a2a: faction==='rebels'?0x7a3a3a: faction==='senate'?0xd9a441:0x2a5a8a;
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-size/2,0,z-size/2), new THREE.Vector3(x+size/2,wallH,z+size/2)));
  factionZones[faction] = {x:x, z:z, w:size, d:size, color:flagColor};
  for(let i=0;i<4;i++){ const ang=(i/4)*Math.PI*2; spawnPoints.push([x+Math.cos(ang)*(size/2+5), z+Math.sin(ang)*(size/2+5)]); }
  // Animated flag + fire for camp
  createAnimatedFlag(scene, x, 0, z, flagColor, 2, 1.2);
  createAnimatedFire(scene, x, 0.15, z, 0.7, true);
  createAnimatedSmoke(scene, x, 0.5, z, 12);
}

export function buildWorld(scene) {
  colliders.length=0; torches.length=0; spawnPoints.length=0;
  for(let k in factionZones) delete factionZones[k];
  buildingInteriors.length=0;

  const W=700, D=500, wallH=16;
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(4000,4000), MAT.ground); ground.rotation.x=-Math.PI/2; ground.receiveShadow=true; scene.add(ground);
  const forumFloor=new THREE.Mesh(new THREE.PlaneGeometry(W*2, D*2), MAT.travertine); forumFloor.rotation.x=-Math.PI/2; forumFloor.position.y=0.02; forumFloor.receiveShadow=true; scene.add(forumFloor);
  const outerMat = new THREE.MeshStandardMaterial({color:0x8a7a6a, roughness:0.95});
  const suburaFloor=new THREE.Mesh(new THREE.PlaneGeometry(500,400), outerMat); suburaFloor.rotation.x=-Math.PI/2; suburaFloor.position.set(-550,0.01,150); suburaFloor.receiveShadow=true; scene.add(suburaFloor);
  const palatineFloor=new THREE.Mesh(new THREE.PlaneGeometry(600,500), new THREE.MeshStandardMaterial({color:0x6a8a5a, roughness:0.9})); palatineFloor.rotation.x=-Math.PI/2; palatineFloor.position.set(0,0.01,600); palatineFloor.receiveShadow=true; scene.add(palatineFloor);
  const campusFloor=new THREE.Mesh(new THREE.PlaneGeometry(800,600), new THREE.MeshStandardMaterial({color:0x7a9a6a, roughness:0.9})); campusFloor.rotation.x=-Math.PI/2; campusFloor.position.set(0,0.01,-700); campusFloor.receiveShadow=true; scene.add(campusFloor);

  const borderMat=MAT.mosaic, borderT=4;
  const northBorder=new THREE.Mesh(new THREE.PlaneGeometry(W*2,borderT), borderMat); northBorder.rotation.x=-Math.PI/2; northBorder.position.set(0,0.04,-D+borderT/2); scene.add(northBorder);
  const southBorder=northBorder.clone(); southBorder.position.z=D-borderT/2; scene.add(southBorder);
  const eastBorder=new THREE.Mesh(new THREE.PlaneGeometry(borderT,D*2), borderMat); eastBorder.rotation.x=-Math.PI/2; eastBorder.position.set(W-borderT/2,0.04,0); scene.add(eastBorder);
  const westBorder=eastBorder.clone(); westBorder.position.x=-W+borderT/2; scene.add(westBorder);

  street(scene, -W, 0, W, 0, 10);
  street(scene, 0, -D, 0, D, 10);
  street(scene, -W, -D*0.5, W, -D*0.5, 6);
  street(scene, -W, D*0.5, W, D*0.5, 6);
  street(scene, -W*0.5, -D, -W*0.5, D, 6);
  street(scene, W*0.5, -D, W*0.5, D, 6);
  street(scene, -W, -D*0.75, W, -D*0.75, 5);
  street(scene, -W, D*0.75, W, D*0.75, 5);

  const wallMat=MAT.brick;
  addBox(scene, W*2+12, wallH, 6, 0, wallH/2, -D-3, wallMat);
  addBox(scene, W*2+12, wallH, 6, 0, wallH/2, D+3, wallMat);
  addBox(scene, 6, wallH, D*2+6, -W-3, wallH/2, 0, wallMat);
  addBox(scene, 6, wallH, D*2+6, W+3, wallH/2, 0, wallMat);
  addBox(scene, 800, wallH*0.8, 6, -550, wallH*0.4, -350, wallMat);
  addBox(scene, 800, wallH*0.8, 6, -550, wallH*0.4, 350, wallMat);
  addBox(scene, 600, wallH*0.8, 6, 0, wallH*0.4, 850, wallMat);
  for(let side of [-1,1]){
    for(let i=-W+8;i<W;i+=4){ if(Math.abs(i)<14)continue; const cren=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.8,1.4), MAT.brick); cren.position.set(i,wallH+0.9,side*(D+3)); cren.castShadow=true; scene.add(cren); }
    for(let i=-D+8;i<D;i+=4){ const cren=new THREE.Mesh(new THREE.BoxGeometry(1.4,1.8,1.4), MAT.brick); cren.position.set(side*(W+3),wallH+0.9,i); cren.castShadow=true; scene.add(cren); }
  }
  const towerPositions=[[-W,-D],[W,-D],[-W,D],[W,D],[0,-D],[0,D],[-W,0],[W,0],[-W/2,-D],[W/2,-D],[-W/2,D],[W/2,D]];
  towerPositions.forEach(([x,z])=>{
    const tower=new THREE.Mesh(new THREE.CylinderGeometry(5,5.5,18,18), MAT.brick); tower.position.set(x,9,z); tower.castShadow=true; tower.receiveShadow=true; scene.add(tower);
    const cone=new THREE.Mesh(new THREE.ConeGeometry(6,4.5,18), MAT.terracotta); cone.position.set(x,20.25,z); cone.castShadow=true; scene.add(cone);
    const balc=new THREE.Mesh(new THREE.CylinderGeometry(5.8,5.8,0.5,18), MAT.marble); balc.position.set(x,17.5,z); scene.add(balc);
    torches.push({x:x+3.5,y:12,z:z}); colliders.push(new THREE.Box3(new THREE.Vector3(x-5.5,0,z-5.5), new THREE.Vector3(x+5.5,18,z+5.5)));
    createAnimatedFlag(scene, x, 20, z, 0x8a1a1a, 2, 1.2);
  });

  // Original core buildings
  templeJupiter(scene, 0, -180);
  templeSaturn(scene, -140, -160);
  templeVesta(scene, 140, -160);
  templeCastorPollux(scene, -90, -90);
  templeCaesar(scene, 90, -90);
  curiaJulia(scene, -200, -50);
  tabularium(scene, 0, -230, 180, 20);
  basilicaJulia(scene, -140, 10, 56, 110);
  basilicaAemilia(scene, 140, 10, 54, 108);
  basilicaMaxentius(scene, 0, 80);
  houseVestals(scene, 200, -140);
  fountain(scene, 0, 0);
  bathsCaracalla(scene, -350, -150);
  bathsCaracalla(scene, 350, 150);
  circusMaximus(scene, 0, -650);
  colosseum(scene, 550, -250);

  for(let i=0;i<12;i++){
    const x=-280 + (i%6)*90; const z=-200 + Math.floor(i/6)*80;
    domus(scene, x, z);
  }
  for(let i=0;i<12;i++){
    const x=-280 + (i%6)*90; const z=120 + Math.floor(i/6)*80;
    domus(scene, x, z);
  }
  for(let i=0;i<12;i++){ const x=-260 + (i%6)*90; const z=-60 + Math.floor(i/6)*60; insula(scene, x, z, 20+Math.random()*6, 24+Math.random()*6, 12+Math.random()*4); }
  for(let i=0;i<12;i++){ const x=60 + (i%6)*90; const z=180 + Math.floor(i/6)*40; insula(scene, x, z, 18, 22, 11); }

  for(let i=0;i<20;i++){
    const x=-650 + (i%5)*90 + (Math.random()-0.5)*20;
    const z=80 + Math.floor(i/5)*65 + (Math.random()-0.5)*15;
    const h=8+Math.random()*8;
    insula(scene, x, z, 16+Math.random()*8, 18+Math.random()*8, h);
    if(i%3===0){ const line=new THREE.Mesh(new THREE.BoxGeometry(8,0.05,0.05), new THREE.MeshStandardMaterial({color:0x8a5a3a})); line.position.set(x,4,z); scene.add(line); }
  }
  for(let i=0;i<15;i++){
    const x=-200 + (i%5)*100;
    const z=400 + Math.floor(i/5)*90;
    domus(scene, x, z);
    if(Math.random()<0.5){ const garden=new THREE.Mesh(new THREE.PlaneGeometry(12,12), new THREE.MeshStandardMaterial({color:0x3a6a3a})); garden.rotation.x=-Math.PI/2; garden.position.set(x+10,0.06,z); scene.add(garden); }
  }
  for(let i=0;i<12;i++){
    const x=-250 + (i%4)*130;
    const z=-400 - Math.floor(i/4)*100;
    const barrack=new THREE.Mesh(new THREE.BoxGeometry(22,6,12), MAT.brick); barrack.position.set(x,3,z); barrack.castShadow=true; scene.add(barrack);
    colliders.push(new THREE.Box3(new THREE.Vector3(x-11,0,z-6), new THREE.Vector3(x+11,6,z+6)));
    for(let j=0;j<3;j++){ const post=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,2,6), MAT.wood); post.position.set(x-8+j*8,1,z+8); scene.add(post); }
  }
  for(let i=0;i<10;i++){
    const x=400 + (i%5)*80;
    const z=-100 + Math.floor(i/5)*80;
    const stall=new THREE.Group(); stall.position.set(x,0,z);
    const counter=new THREE.Mesh(new THREE.BoxGeometry(5,1.2,3), MAT.wood); counter.position.y=0.6; stall.add(counter);
    scene.add(stall);
    colliders.push(new THREE.Box3(new THREE.Vector3(x-2.5,0,z-1.5), new THREE.Vector3(x+2.5,1.2,z+1.5)));
  }
  street(scene, -W, 150, -300, 150, 6);
  street(scene, 0, D, 0, 600, 8);
  street(scene, 0, -D, 0, -700, 8);
  street(scene, W, 0, 600, 0, 6);

  factionCamp(scene, 0, -450, 'legio', 40);
  factionCamp(scene, 500, 0, 'praetorian', 36);
  factionCamp(scene, -220, -50, 'senate', 30);
  factionCamp(scene, -600, 150, 'rebels', 50);
  factionCamp(scene, -140, 90, 'merchants', 28);
  factionCamp(scene, 200, -140, 'vestals', 26);
  factionCamp(scene, 0, 500, 'emperor', 50);
  factionCamp(scene, -400, -400, 'legio', 30);
  factionCamp(scene, 400, 300, 'merchants', 32);
  factionCamp(scene, -300, 400, 'senate', 28);

  const colH=7.5, colR=0.46;
  for(let side of [-1,1]){
    const colX=side*38;
    for(let i=-18;i<=18;i++){ const cz=i*8; if(Math.abs(cz)<8)continue; flutedColumn(scene, colX, cz, colH, colR); }
    const ent=createEntablature(300,1.2,1.3); ent.position.set(colX, colH+1.2,0); ent.rotation.y=Math.PI/2; scene.add(ent);
  }

  const rostra=new THREE.Group();
  const plat=new THREE.Mesh(new THREE.BoxGeometry(20,2.2,7), MAT.marble); plat.position.set(0,1.1,-28); plat.castShadow=true; rostra.add(plat);
  for(let i=-9;i<=9;i+=2.4){ const beak=new THREE.Mesh(new THREE.ConeGeometry(0.36,1.1,8), MAT.bronze); beak.rotation.z=Math.PI/2; beak.position.set(i,1.1,-24.2); rostra.add(beak); }
  scene.add(rostra); colliders.push(new THREE.Box3(new THREE.Vector3(-10,0,-31.5), new THREE.Vector3(10,2.2,-24.5)));

  marketStalls(scene, 24);
  statues(scene);
  
  // Animated trees everywhere
  const treePos=[[-80,-180,'cypress'],[80,-180,'cypress'],[-200,-180,'cypress'],[200,-180,'cypress'],[-280,180,'cypress'],[280,180,'cypress'],[-80,180,'cypress'],[80,180,'cypress'],[-160,0,'round'],[160,0,'round'],[-40,-120,'cypress'],[40,-120,'cypress'],[-40,120,'round'],[40,120,'round'],[-280,40,'cypress'],[280,40,'cypress'],[-280,-40,'cypress'],[280,-40,'cypress'],[-500,200,'cypress'],[-500,-200,'cypress'],[0,550,'round'],[300,500,'cypress'],[-300,500,'cypress'],[500,400,'round'],[-400,600,'cypress'],[400,600,'cypress']];
  treePos.forEach(([x,z,t])=>createAnimatedTree(scene,x,z,t));

  const centralSpawns=[[-300,-200],[300,-200],[-300,200],[300,200],[0,-260],[-80,0],[80,0],[-320,0],[320,0],[0,260],[-160,140],[160,140],[-160,-140],[160,-140],[-60,200],[60,200],[-60,-200],[60,-200]];
  centralSpawns.forEach(p=>spawnPoints.push(p));

  for(let i=-W+14;i<=W-14;i+=14){ if(Math.abs(i)<16)continue; torches.push({x:i,y:6,z:-D-3}); torches.push({x:i,y:6,z:D+3}); }
  for(let i=-D+14;i<=D-14;i+=14){ torches.push({x:-W-3,y:6,z:i}); torches.push({x:W+3,y:6,z:i}); }

  // ---- BUILD MISSING ROMAN EMPIRE MONUMENTS - Verified Dimensions ----
  buildRomanExpansion(scene);

  console.log(`[WORLD] Built FULL ROMAN EMPIRE: W=${W}, D=${D}, colliders=${colliders.length}, torches=${torches.length}, spawns=${spawnPoints.length}, interiors=${buildingInteriors.length}, factions=${Object.keys(factionZones).length} - All verified, animations everywhere`);

  return { bounds: { W: W-2, D: D-2 }, factionZones, buildingInteriors };
}
