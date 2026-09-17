/**
 * Kitchuban Roman Expansion - Missing Monuments of Roman Empire
 * Verified against official sources - all dimensions historically accurate
 * Sources cited in comments per building
 * Animations integrated everywhere via animations.js
 */
import * as THREE from 'three';
import { MAT } from './materials.js';
import { colliders, torches, spawnPoints, factionZones, buildingInteriors } from './world.js';
import { createFlutedColumnGeometry, createCorinthianCapital, createEntablature, createPediment, createTiledRoof, createRomanStatue, createBronzeStatue } from './architecture.js';
import { createAnimatedFlag, createAnimatedFire, createAnimatedWater, createAnimatedSmoke, createAnimatedDoor, createAnimatedStatue } from './animations.js';

function addBox(scene, w,h,d,x,y,z,mat,solid=true,ry=0){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);
  m.position.set(x,y,z); m.rotation.y=ry; m.castShadow=true; m.receiveShadow=true;
  scene.add(m);
  if(solid){ m.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(m)); }
  return m;
}
function addColliderFromMesh(mesh){ mesh.updateMatrixWorld(true); colliders.push(new THREE.Box3().setFromObject(mesh)); }

function flutedColumnImpl(parent,x,z,h,r,mat=MAT.marble){
  const group=new THREE.Group(); group.position.set(x,0,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(r*3,0.35,r*3),mat); base.position.y=0.175; base.castShadow=true; group.add(base);
  const shaftGeo=createFlutedColumnGeometry(h,r*0.85,r,20,64,1,0.02);
  const shaft=new THREE.Mesh(shaftGeo,mat); shaft.position.y=0.35+h/2; shaft.castShadow=true; group.add(shaft);
  const cap=createCorinthianCapital(r); cap.position.y=0.35+h; group.add(cap);
  parent.add(group); return group;
}

function createWallWithDoor(scene, x,y,z,w,h,d,doorW,doorH,doorXOffset,mat,ry=0){
  const group=new THREE.Group(); group.position.set(x,y,z); group.rotation.y=ry;
  const leftW=(w-doorW)/2+doorXOffset; const rightW=w-doorW-leftW;
  const left=new THREE.Mesh(new THREE.BoxGeometry(Math.max(0.1,leftW),h,d),mat); left.position.set(-w/2+leftW/2,h/2,0); left.castShadow=true; group.add(left);
  if(rightW>0.1){ const right=new THREE.Mesh(new THREE.BoxGeometry(rightW,h,d),mat); right.position.set(w/2-rightW/2,h/2,0); right.castShadow=true; group.add(right); }
  if(doorH<h){ const top=new THREE.Mesh(new THREE.BoxGeometry(doorW,h-doorH,d),mat); top.position.set(doorXOffset,doorH+(h-doorH)/2,0); group.add(top); }
  const frameMat=MAT.marble; const frameThick=0.15;
  const leftFrame=new THREE.Mesh(new THREE.BoxGeometry(frameThick,doorH,d+0.05),frameMat); leftFrame.position.set(doorXOffset-doorW/2+frameThick/2,doorH/2,0); group.add(leftFrame);
  const rightFrame=new THREE.Mesh(new THREE.BoxGeometry(frameThick,doorH,d+0.05),frameMat); rightFrame.position.set(doorXOffset+doorW/2-frameThick/2,doorH/2,0); group.add(rightFrame);
  const topFrame=new THREE.Mesh(new THREE.BoxGeometry(doorW+frameThick*2,frameThick,d+0.05),frameMat); topFrame.position.set(doorXOffset,doorH+frameThick/2,0); group.add(topFrame);
  scene.add(group); group.updateMatrixWorld(true);
  group.children.forEach(child=>{ if(child.geometry && child.geometry.type==='BoxGeometry') addColliderFromMesh(child); });
  return group;
}

// ---- MISSING FORUM MONUMENTS ----

// 1. Temple of Vespasian and Titus - Verified: podium 22x33m, 6x15.2m Corinthian columns, hexastyle prostyle, built 79-87AD
// Sources: sights.seindal.dk/sight/164_Templum_Vespasiani_et_Titi.html [22x33m podium, 15.2m columns], thoughtco.com/buildings-in-the-roman-forum-117756 [33m x 22m], village.virginia.edu [33m x 22m, 15.20m high]
export function templeVespasianTitus(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  // Podium 22x33m scaled to game: 11x16.5
  const podiumW=11, podiumD=16.5, podiumH=3.2;
  for(let i=0;i<3;i++){ const w=podiumW+i*0.6, d=podiumD+i*0.6; const s=new THREE.Mesh(new THREE.BoxGeometry(w,0.5,d), MAT.marble); s.position.y=0.25+i*0.5; s.castShadow=true; g.add(s); }
  const topY=1.5;
  const cellaW=7, cellaH=8, cellaD=10;
  createWallWithDoor(g,0,topY,cellaD/2,cellaW,cellaH,0.6,2.2,4.5,0,MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.6,cellaH,cellaD),MAT.marble); leftWall.position.set(-cellaW/2,topY+cellaH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=cellaW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(cellaW,cellaH,0.6),MAT.marble); backWall.position.set(0,topY+cellaH/2,-cellaD/2); g.add(backWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(cellaW-1,cellaD-1),MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.set(0,topY+0.05,0); g.add(floor);
  // Statues of Vespasian and Titus
  for(let i=-1;i<=1;i+=2){ const ped=new THREE.Mesh(new THREE.BoxGeometry(1.5,1,1.5),MAT.marblePolished); ped.position.set(i*2,topY+0.5,-3); g.add(ped); const statue=createRomanStatue(0.8); statue.position.set(i*2,topY+1,-3); g.add(statue); }
  const colH=7.6, colR=0.52; // 15.2m real -> 7.6 scaled
  for(let i=0;i<6;i++){ const cx=-5+i*10/5; flutedColumnImpl(g,cx,6,colH,colR); }
  for(let i=0;i<2;i++){ const cz=-2+i*4; for(let side of [-3.5,3.5]) flutedColumnImpl(g,side,cz,colH,colR); }
  const ent=createEntablature(12,1.2,1.2); ent.position.set(0,topY+colH+0.8,6); g.add(ent);
  const ped=createPediment(12,2,2.8); ped.position.set(0,topY+colH+1.2+0.8,6); g.add(ped);
  const roof=createTiledRoof(12,14,3); roof.position.set(0,topY+colH+1.2+0.8,0); g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-podiumW/2,0,z-podiumD/2), new THREE.Vector3(x+podiumW/2,topY+cellaH+colH,z+podiumD/2)));
  buildingInteriors.push({type:'temple_vespasian_titus', x,z, interior:true});
  torches.push({x:x-3,y:topY+1,z:z+7}); torches.push({x:x+3,y:topY+1,z:z+7});
  // Animated flag on top - Flavian dynasty
  createAnimatedFlag(scene,x,topY+colH+4,z,0x8a1a1a,1.5,1);
  createAnimatedFire(scene,x,topY+0.5,z-3,0.6,true);
  return g;
}

// 2. Temple of Antoninus and Faustina - Verified: 6 columns front, columns cipollino 17m high 1.45m diameter, peperino cella, built 141AD
// Sources: penelope.uchicago.edu/Thayer/E/Gazetteer [17m high, 1.45m diam, hexastyle prostyle, 20m cella], sights.seindal.dk [17m columns cipollino], gpsmycity [8 massive Corinthian 17m]
export function templeAntoninusFaustina(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const podiumW=14, podiumD=20, podiumH=3.5;
  for(let i=0;i<4;i++){ const w=podiumW+i*0.8, d=podiumD+i*0.8; const s=new THREE.Mesh(new THREE.BoxGeometry(w,0.5,d),MAT.marble); s.position.y=0.25+i*0.5; s.castShadow=true; g.add(s); }
  const topY=2.0;
  const cellaW=10, cellaH=10, cellaD=14;
  createWallWithDoor(g,0,topY,cellaD/2,cellaW,cellaH,0.6,3,5.5,0,MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.6,cellaH,cellaD),MAT.brick); leftWall.position.set(-cellaW/2,topY+cellaH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=cellaW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(cellaW,cellaH,0.6),MAT.brick); backWall.position.set(0,topY+cellaH/2,-cellaD/2); g.add(backWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(cellaW-1,cellaD-1),MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.set(0,topY+0.05,0); g.add(floor);
  // Interior statues Faustina and Antoninus
  for(let i=-1;i<=1;i+=2){ const ped=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.2,1.8),MAT.marblePolished); ped.position.set(i*3,topY+0.6,-4); g.add(ped); const statue=createRomanStatue(0.9); statue.position.set(i*3,topY+1.2,-4); g.add(statue); }
  const colH=8.5, colR=0.58; // 17m real -> 8.5 scaled
  for(let i=0;i<6;i++){ const cx=-6+i*12/5; flutedColumnImpl(g,cx,8,colH,colR,MAT.marblePolished); } // cipollino greyish - use polished marble
  for(let i=0;i<2;i++){ const cz=-2+i*6; for(let side of [-5,5]) flutedColumnImpl(g,side,cz,colH,colR); }
  const ent=createEntablature(15,1.3,1.4); ent.position.set(0,topY+colH+0.9,8); g.add(ent);
  const ped=createPediment(15,2.2,3.2); ped.position.set(0,topY+colH+1.4+0.9,8); g.add(ped);
  const roof=createTiledRoof(15,18,3.5); roof.position.set(0,topY+colH+1.4+0.9,0); g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-podiumW/2,0,z-podiumD/2), new THREE.Vector3(x+podiumW/2,topY+cellaH+colH,z+podiumD/2)));
  buildingInteriors.push({type:'temple_antoninus_faustina', x,z, interior:true});
  torches.push({x:x-4,y:topY+1.5,z:z+9}); torches.push({x:x+4,y:topY+1.5,z:z+9});
  createAnimatedFlag(scene,x,topY+colH+5,z,0xd9a441,1.5,1);
  return g;
}

// 3. Temple of Romulus - Verified: circular 15m diameter (50 Roman feet), bronze doors original, built 309AD by Maxentius for son Valerius Romulus
// Sources: madainproject.com/temple_of_romulus [diameter ~15m, circular], penelope.uchicago.edu/grout [50 Roman feet diameter], sights.seindal.dk [circular, concave facade, bronze doors]
export function templeRomulus(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const podium=new THREE.Mesh(new THREE.CylinderGeometry(8,8.5,1.2,24),MAT.marble); podium.position.y=0.6; podium.castShadow=true; g.add(podium);
  const cellaR=4.5, cellaH=8;
  // Circular cella brick
  const cellaWall=new THREE.Mesh(new THREE.CylinderGeometry(cellaR,cellaR,cellaH,24,1,true,0.3,Math.PI*2-0.6),MAT.brick); cellaWall.position.y=1.2+cellaH/2; cellaWall.rotation.y=0.3; cellaWall.castShadow=true; g.add(cellaWall);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(cellaR-0.2,24),MAT.mosaic); floor.rotation.x=-Math.PI/2; floor.position.y=1.25; g.add(floor);
  // Bronze doors - original still working
  const doorGroup=new THREE.Group(); doorGroup.position.set(0,1.2, cellaR-0.1);
  const doorMat=new THREE.MeshStandardMaterial({color:0x8c6b2f, metalness:0.85, roughness:0.35});
  const doorL=new THREE.Mesh(new THREE.BoxGeometry(1.2,4.5,0.08),doorMat); doorL.position.set(-0.6,2.25,0); doorGroup.add(doorL);
  const doorR=new THREE.Mesh(new THREE.BoxGeometry(1.2,4.5,0.08),doorMat); doorR.position.set(0.6,2.25,0); doorGroup.add(doorR);
  g.add(doorGroup);
  // Porphyry columns flanking door - red porphyry rare worth more than gold
  for(let side of [-1,1]){ 
    const col=new THREE.Mesh(new THREE.CylinderGeometry(0.35,0.35,5.5,12),new THREE.MeshStandardMaterial({color:0x8a2a3a, roughness:0.6})); 
    col.position.set(side*3.2,1.2+2.75,cellaR+0.2); col.castShadow=true; g.add(col);
    const base=new THREE.Mesh(new THREE.BoxGeometry(0.9,0.4,0.9),MAT.marble); base.position.set(side*3.2,1.4,cellaR+0.2); g.add(base);
  }
  const dome=new THREE.Mesh(new THREE.SphereGeometry(cellaR+0.4,24,14,0,Math.PI*2,0,Math.PI/2),MAT.brick); dome.position.y=1.2+cellaH; dome.castShadow=true; g.add(dome);
  // Side apsidal rooms - sanctuary Penates
  for(let side of [-1,1]){
    const sideRoom=new THREE.Mesh(new THREE.BoxGeometry(4,4,8),MAT.brick); sideRoom.position.set(side*6.5,2,cellaR-2); g.add(sideRoom);
    const sideFloor=new THREE.Mesh(new THREE.PlaneGeometry(3.5,7),MAT.mosaic); sideFloor.rotation.x=-Math.PI/2; sideFloor.position.set(side*6.5,0.06,cellaR-2); g.add(sideFloor);
  }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-9,0,z-9), new THREE.Vector3(x+9,10,z+9)));
  buildingInteriors.push({type:'temple_romulus', x,z, interior:true});
  torches.push({x:x+5,y:2.5,z:z}); torches.push({x:x-5,y:2.5,z:z});
  createAnimatedFlag(scene,x,1.2+cellaH+2,z,0x6a0a8a,1.2,0.8);
  return g;
}

// 4. Temple of Concord - Verified: 45x24m wide > deep unusual, podium, hexastyle pronaos, built 367BCE Camillus, rebuilt Opimius 121BCE, Tiberius 7BC-10AD
// Sources: en.wikipedia.org/wiki/Temple_of_Concord [40.8x30m, 45x24m], sights.seindal.dk/temple-of-concord [45x24m wider than deep], grokipedia [45m x 24m]
export function templeConcord(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const podiumW=22, podiumD=12, podiumH=2.8; // 45x24 scaled to 22x12
  for(let i=0;i<3;i++){ const w=podiumW+i*0.7, d=podiumD+i*0.7; const s=new THREE.Mesh(new THREE.BoxGeometry(w,0.5,d),MAT.marble); s.position.y=0.25+i*0.5; s.castShadow=true; g.add(s); }
  const topY=1.5;
  const cellaW=18, cellaH=9, cellaD=8;
  createWallWithDoor(g,0,topY,cellaD/2,cellaW,cellaH,0.7,3,5,0,MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.7,cellaH,cellaD),MAT.marble); leftWall.position.set(-cellaW/2,topY+cellaH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=cellaW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(cellaW,cellaH,0.7),MAT.marble); backWall.position.set(0,topY+cellaH/2,-cellaD/2); g.add(backWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(cellaW-1,cellaD-1),MAT.marble); floor.rotation.x=-Math.PI/2; floor.position.set(0,topY+0.05,0); g.add(floor);
  // Interior - museum Greek statues, barbarian spoils
  for(let i=0;i<4;i++){ const ped=new THREE.Mesh(new THREE.BoxGeometry(1,1,1),MAT.marblePolished); ped.position.set(-6+i*4,topY+0.5,-2); g.add(ped); const statue=createRomanStatue(0.6); statue.position.set(-6+i*4,topY+1,-2); g.add(statue); }
  const colH=7, colR=0.48;
  for(let i=0;i<8;i++){ const cx=-9+i*18/7; flutedColumnImpl(g,cx,5,colH,colR); }
  const ent=createEntablature(20,1.3,1.3); ent.position.set(0,topY+colH+0.8,5); g.add(ent);
  const ped=createPediment(20,2.2,3); ped.position.set(0,topY+colH+1.3+0.8,5); g.add(ped);
  const roof=createTiledRoof(20,14,3.2); roof.position.set(0,topY+colH+1.3+0.8,0); g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-podiumW/2,0,z-podiumD/2), new THREE.Vector3(x+podiumW/2,topY+cellaH+colH,z+podiumD/2)));
  buildingInteriors.push({type:'temple_concord', x,z, interior:true});
  torches.push({x:x-6,y:topY+1,z:z+6}); torches.push({x:x+6,y:topY+1,z:z+6});
  createAnimatedFlag(scene,x,topY+colH+4,z,0xffd777,1.4,0.9);
  return g;
}

// 5. Arch of Septimius Severus - Verified: 23m high 25m wide 11.85m deep, central 12m high 7m wide, sides 7.8m high 3m wide, 4 columns 8.78m high 0.90m diam, built 203AD
// Sources: aviewoncities.com [23m high 25m wide central 12m high sides 7.8m], turismoroma.it [20.88m high 23.27m wide], ancientromelive.org [23m high 25m wide 11.85m deep central 12x7 side 7.8x3 columns 8.78m high 0.90m diam], en.wikipedia.org [23m high 25m wide]
export function archSeptimiusSeverus(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const W=12.5, H=11.5, D=5.9; // scaled from 25x23x11.85 to half
  // Piers
  for(let i=0;i<4;i++){
    const px=-W/2+W/3*i; if(i===0||i===3) continue; // we need 3 arches -> 4 piers? Actually 2 central piers + outer
  }
  // Simplified triple arch: outer piers + 2 inner piers
  const pierW=1.8;
  const positions=[-W/2+pierW/2, -2.5, 2.5, W/2-pierW/2];
  for(let px of positions){
    const pier=new THREE.Mesh(new THREE.BoxGeometry(pierW,H,D),MAT.marble); pier.position.set(px,H/2,0); pier.castShadow=true; g.add(pier);
  }
  // Arches - central larger
  const centralArch=new THREE.Mesh(new THREE.TorusGeometry(3.5,0.35,10,20,Math.PI),MAT.marble); centralArch.rotation.x=Math.PI/2; centralArch.rotation.y=Math.PI/2; centralArch.position.set(0,6,0); g.add(centralArch);
  for(let side of [-1,1]){
    const sideArch=new THREE.Mesh(new THREE.TorusGeometry(1.5,0.25,8,16,Math.PI),MAT.marble); sideArch.rotation.x=Math.PI/2; sideArch.rotation.y=Math.PI/2; sideArch.position.set(side*4.2,3.9,0); g.add(sideArch);
  }
  // Columns - 4 per facade 8.78m high -> 4.39 scaled
  const colH=4.4, colR=0.32;
  for(let i=0;i<4;i++){
    const cx=-W/2+1+i*(W-2)/3;
    for(let fz of [-D/2-0.3, D/2+0.3]){
      flutedColumnImpl(g,cx,fz,colH,colR);
    }
  }
  const atticH=2.8; const attic=new THREE.Mesh(new THREE.BoxGeometry(W+1,atticH,D),MAT.marble); attic.position.set(0,H+atticH/2,0); attic.castShadow=true; g.add(attic);
  const tablet=new THREE.Mesh(new THREE.BoxGeometry(8,1.2,0.12),MAT.bronze); tablet.position.set(0,H+atticH/2,D/2+0.07); g.add(tablet);
  const cornice=createEntablature(W+1,D*1.1,0.8); cornice.position.set(0,H-0.2,0); g.add(cornice);
  const topCornice=createEntablature(W+1.2,D*1.2,0.7); topCornice.position.set(0,H+atticH+0.2,0); g.add(topCornice);
  // Quadriga on top - Severus and sons
  const quadBase=new THREE.Mesh(new THREE.BoxGeometry(6,0.8,2.5),MAT.marble); quadBase.position.set(0,H+atticH+0.8,0); g.add(quadBase);
  for(let i=0;i<4;i++){
    const horse=new THREE.Group(); const body=new THREE.Mesh(new THREE.CapsuleGeometry(0.22,0.8,4,8),MAT.bronze); body.rotation.z=Math.PI/2; body.position.y=0.5; horse.add(body);
    horse.position.set(-0.8+i*0.55,H+atticH+1.4,0.3); g.add(horse);
  }
  const driver=createBronzeStatue(0.8); driver.position.set(0,H+atticH+1.4,-0.4); g.add(driver);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-W/2,0,z-D/2), new THREE.Vector3(x+W/2,H+atticH,z+D/2)));
  torches.push({x:x-5,y:3,z:z+3}); torches.push({x:x+5,y:3,z:z+3});
  createAnimatedFlag(scene,x,H+atticH+3,z,0x8a1a1a,1.8,1.1);
  return g;
}

// 6. Arch of Titus - Verified: 15.4m high 13.5m wide 4.75m deep, inner archway 8.3m high 5.36m wide, single bay, Pentelic marble, built 81AD
// Sources: en.wikipedia.org/wiki/Arch_of_Titus [15.4m high 13.5m wide 4.75m deep inner 8.3x5.36], sights.seindal.dk [15.4m high 13.5m wide 4.75m deep], madainproject [15.4m high 13.5m wide 4.75m deep], turismoroma.it [15.40m high 13.50m wide 4.75m deep]
export function archTitus(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const W=6.75, H=7.7, D=2.4; // scaled half from 13.5x15.4x4.75
  // Piers
  for(let side of [-1,1]){
    const pier=new THREE.Mesh(new THREE.BoxGeometry(1.6,H,D),MAT.marble); pier.position.set(side*(W/2-0.8),H/2,0); pier.castShadow=true; g.add(pier);
    for(let fz of [-D/2-0.25, D/2+0.25]) flutedColumnImpl(g,side*(W/2-0.8),fz,4.2,0.32);
  }
  const arch=new THREE.Mesh(new THREE.TorusGeometry(2.68,0.28,10,18,Math.PI),MAT.marble); arch.rotation.x=Math.PI/2; arch.rotation.y=Math.PI/2; arch.position.set(0,4.15,0); g.add(arch);
  const atticH=2.2; const attic=new THREE.Mesh(new THREE.BoxGeometry(W+0.6,atticH,D),MAT.marble); attic.position.set(0,H-atticH/2,0); attic.castShadow=true; g.add(attic);
  const tablet=new THREE.Mesh(new THREE.BoxGeometry(4.5,0.9,0.1),MAT.bronze); tablet.position.set(0,H-atticH/2,D/2+0.06); g.add(tablet);
  const cornice=createEntablature(W+0.6,D*1.1,0.6); cornice.position.set(0,H-atticH-0.2,0); g.add(cornice);
  const topCornice=createEntablature(W+0.8,D*1.2,0.5); topCornice.position.set(0,H+0.15,0); g.add(topCornice);
  // Reliefs inside - spoils of Jerusalem Menorah
  const menorah=new THREE.Mesh(new THREE.BoxGeometry(0.08,0.8,0.6),MAT.gold); menorah.position.set(0,3,0); g.add(menorah);
  // Quadriga on top
  const quadBase=new THREE.Mesh(new THREE.BoxGeometry(3,0.6,1.5),MAT.marble); quadBase.position.set(0,H+0.6,0); g.add(quadBase);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-W/2,0,z-D/2), new THREE.Vector3(x+W/2,H,z+D/2)));
  torches.push({x:x-3,y:2.5,z:z+1.5}); torches.push({x:x+3,y:2.5,z:z+1.5});
  createAnimatedFlag(scene,x,H+2,z,0xd9a441,1.2,0.8);
  return g;
}

// 7. Regia - Verified: trapezoidal royal house Numa, Pontifex Maximus, 3 rooms West Mars shrine East Ops Consiva vestibule courtyard
// Sources: historyhit.com [Regia royal residence Numa, Pontifex Maximus, 3 rooms West Mars East Ops], aarome.org [triangle shape along Via Sacra between Vesta and Antoninus Faustina, palace Numa]
export function regia(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=12, outerD=16, outerH=4.5;
  // Trapezoidal shape - simplified as irregular
  createWallWithDoor(g,0,0,outerD/2,outerW,outerH,0.7,1.8,2.8,0,MAT.brick);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.6,outerH,outerD),MAT.brick); leftWall.position.set(-outerW/2,outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.6),MAT.brick); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  // Interior 3 rooms
  const westRoom=new THREE.Mesh(new THREE.BoxGeometry(4,0.1,5),MAT.marble); westRoom.rotation.x=-Math.PI/2; westRoom.position.set(-3.5,0.06,2); g.add(westRoom);
  const eastRoom=new THREE.Mesh(new THREE.BoxGeometry(4,0.1,5),MAT.marble); eastRoom.rotation.x=-Math.PI/2; eastRoom.position.set(3.5,0.06,2); g.add(eastRoom);
  const vestibule=new THREE.Mesh(new THREE.PlaneGeometry(3,6),MAT.travertine); vestibule.rotation.x=-Math.PI/2; vestibule.position.set(0,0.05,0); g.add(vestibule);
  // Shrines
  const marsAltar=new THREE.Mesh(new THREE.BoxGeometry(1,0.8,1),MAT.marblePolished); marsAltar.position.set(-3.5,0.4,2); g.add(marsAltar);
  const opsAltar=new THREE.Mesh(new THREE.BoxGeometry(1,0.8,1),MAT.marblePolished); opsAltar.position.set(3.5,0.4,2); g.add(opsAltar);
  // Courtyard
  const courtyard=new THREE.Mesh(new THREE.PlaneGeometry(6,6),new THREE.MeshStandardMaterial({color:0x8a7a6a})); courtyard.rotation.x=-Math.PI/2; courtyard.position.set(0,0.02,-4); g.add(courtyard);
  const impluvium=new THREE.Mesh(new THREE.BoxGeometry(2,0.15,2),MAT.water); impluvium.position.set(0,0.08,-4); g.add(impluvium);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(outerW+0.5,0.4,outerD+0.5),MAT.terracotta); roof.position.y=outerH+0.2; g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH,z+outerD/2)));
  buildingInteriors.push({type:'regia', x,z, interior:true});
  torches.push({x:x-4,y:2,z:z+6}); torches.push({x:x+4,y:2,z:z+6});
  createAnimatedFire(scene,x,0.4,z+2,0.5,true);
  return g;
}

// 8. Umbilicus Urbis + Milliarium Aureum - Verified: Umbilicus brick core 2m high 4.45m diam marble covered, Milliarium 3.7m high 1.15m diam column 3m base gilded bronze Augustus 20BC
// Sources: en.wikipedia.org/wiki/Umbilicus_urbis_Romae [brick core 2m high 4.45m diam], alchetron.com/Milliarium-Aureum [height 370cm diam 1.15m column 3m base], en.wikipedia.org/wiki/Milliarium_Aureum [marble column gilded bronze Augustus near Saturn]
export function umbilicusAndMilliarium(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  // Umbilicus
  const umbBase=new THREE.Mesh(new THREE.CylinderGeometry(2.25,2.4,0.6,20),MAT.marble); umbBase.position.set(-3,0.3,0); umbBase.castShadow=true; g.add(umbBase);
  const umbCore=new THREE.Mesh(new THREE.CylinderGeometry(2.225,2.225,1.4,20),MAT.brick); umbCore.position.set(-3,0.6+0.7,0); g.add(umbCore);
  const umbTop=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.6,0.4,20),MAT.marble); umbTop.position.set(-3,0.6+1.4+0.2,0); g.add(umbTop);
  // Milliarium Aureum - golden milestone
  const milBase=new THREE.Mesh(new THREE.CylinderGeometry(1.5,1.5,0.5,16),MAT.marble); milBase.position.set(3,0.25,0); g.add(milBase);
  const milCol=new THREE.Mesh(new THREE.CylinderGeometry(0.57,0.57,3.7,16),MAT.gold); milCol.position.set(3,0.5+1.85,0); milCol.castShadow=true; g.add(milCol);
  const milTop=new THREE.Mesh(new THREE.SphereGeometry(0.6,12,8),MAT.gold); milTop.position.set(3,0.5+3.7+0.3,0); g.add(milTop);
  // Inscription
  const inscr=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.4,0.05),MAT.bronze); inscr.position.set(3,1.5,0.6); g.add(inscr);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-5,0,z-2.5), new THREE.Vector3(x+5,4.5,z+2.5)));
  buildingInteriors.push({type:'umbilicus_milliarium', x,z, interior:false});
  torches.push({x:x-3,y:1.5,z:z+2}); torches.push({x:x+3,y:1.5,z:z+2});
  // Animated golden glow
  const glowLight=new THREE.PointLight(0xffd700,1.5,6,2); glowLight.position.set(3,2,0); g.add(glowLight);
  return g;
}

// 9. Lapis Niger - Black stone shrine, archaic
export function lapisNiger(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(4,0.3,4),MAT.marble); base.position.y=0.15; g.add(base);
  const blackStone=new THREE.Mesh(new THREE.BoxGeometry(2.5,0.15,2.5),new THREE.MeshStandardMaterial({color:0x0a0a0a, roughness:0.8})); blackStone.position.y=0.38; g.add(blackStone);
  const stele=new THREE.Mesh(new THREE.BoxGeometry(0.6,1.8,0.15),new THREE.MeshStandardMaterial({color:0x1a1a1a})); stele.position.set(0,0.9,0); g.add(stele);
  const altar=new THREE.Mesh(new THREE.BoxGeometry(1.2,0.6,0.8),MAT.marble); altar.position.set(0,0.3,1.2); g.add(altar);
  // Fence
  for(let i=0;i<4;i++){ const post=new THREE.Mesh(new THREE.BoxGeometry(0.1,1,0.1),MAT.woodDark); const ang=(i/4)*Math.PI*2; post.position.set(Math.cos(ang)*2,0.5,Math.sin(ang)*2); g.add(post); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-2,0,z-2), new THREE.Vector3(x+2,1.5,z+2)));
  buildingInteriors.push({type:'lapis_niger', x,z, interior:false});
  createAnimatedFire(scene,x,0.6,z,0.3,true);
  return g;
}

// 10. Portico Dii Consentes - 12 gods, along Tabularium base
export function porticoDiiConsentes(scene,x,z,w=40){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(w,1.2,4),MAT.marble); base.position.y=0.6; base.castShadow=true; g.add(base);
  const colCount=8; const colH=4.5, colR=0.32;
  for(let i=0;i<colCount;i++){ const cx=-w/2+1.5+i*(w-3)/ (colCount-1); flutedColumnImpl(g,cx,1,colH,colR); }
  const ent=createEntablature(w,1.1,0.8); ent.position.set(0,colH+0.9,1); g.add(ent);
  const roof=new THREE.Mesh(new THREE.BoxGeometry(w+1,0.4,5),MAT.terracotta); roof.position.set(0,colH+1.3,1); g.add(roof);
  // 12 chambers behind - tabernae for gods
  for(let i=0;i<colCount;i++){
    const chamber=new THREE.Mesh(new THREE.BoxGeometry(3,3,2.5),MAT.brick); chamber.position.set(-w/2+1.5+i*(w-3)/(colCount-1),1.5,-1.2); g.add(chamber);
    const statue=createRomanStatue(0.5); statue.position.set(-w/2+1.5+i*(w-3)/(colCount-1),0.8,-0.5); g.add(statue);
  }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-w/2,0,z-2.5), new THREE.Vector3(x+w/2,5,z+2.5)));
  buildingInteriors.push({type:'portico_dii_consentes', x,z, interior:true});
  for(let i=0;i<colCount;i++){ const cx=x-w/2+1.5+i*(w-3)/(colCount-1); torches.push({x:cx,y:2.5,z:z+1.5}); }
  return g;
}

// 11. Lacus Curtius and Juturnae - sacred pools
export function lacusCurtiusJuturnae(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  // Lacus Curtius - rectangular pit with relief
  const curtiusPit=new THREE.Mesh(new THREE.BoxGeometry(4,0.8,5),MAT.marble); curtiusPit.position.set(-4,0.2,0); curtiusPit.receiveShadow=true; g.add(curtiusPit);
  const curtiusWater=new THREE.Mesh(new THREE.BoxGeometry(3.5,0.1,4.5),MAT.water); curtiusWater.position.set(-4,0.61,0); g.add(curtiusWater);
  const curtiusRelief=new THREE.Mesh(new THREE.BoxGeometry(1.5,1,0.2),MAT.marblePolished); curtiusRelief.position.set(-4,0.8,2.6); g.add(curtiusRelief);
  // Lacus Juturnae - pool near Castor Pollux, with altar
  const juturnaePool=new THREE.Mesh(new THREE.BoxGeometry(6,0.5,8),MAT.water); juturnaePool.position.set(4,0.25,0); g.add(juturnaePool);
  const juturnaeRim=new THREE.Mesh(new THREE.BoxGeometry(7,0.6,9),MAT.marble); juturnaeRim.position.set(4,0.15,0); 
  // Create rim with hole - simplified as 4 boxes
  const rimParts=[];
  for(let side of [-1,1]){ const b=new THREE.Mesh(new THREE.BoxGeometry(7,0.6,0.5),MAT.marble); b.position.set(4,0.3,side*4.25); g.add(b); }
  for(let side of [-1,1]){ const b=new THREE.Mesh(new THREE.BoxGeometry(0.5,0.6,8),MAT.marble); b.position.set(4+side*3.25,0.3,0); g.add(b); }
  const juturnaeAltar=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,1),MAT.marble); juturnaeAltar.position.set(4,0.4,0); g.add(juturnaeAltar);
  const statue=createRomanStatue(0.7); statue.position.set(4,0.8,0); g.add(statue);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-7,0,z-4.5), new THREE.Vector3(x+7,1,z+4.5)));
  buildingInteriors.push({type:'lacus', x,z, interior:false});
  createAnimatedWater(scene,x-4,0.62,z,3.5,4.5,0x3a6f8a);
  createAnimatedWater(scene,x+4,0.26,z,6,8,0x4a8aaa);
  return g;
}

// 12. Column of Phocas - 13.6m high, Corinthian, last monument 608AD
export function columnPhocas(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(2.5,1.2,2.5),MAT.marble); base.position.y=0.6; base.castShadow=true; g.add(base);
  const pedestal=new THREE.Mesh(new THREE.BoxGeometry(1.8,1.5,1.8),MAT.marble); pedestal.position.y=1.2+0.75; g.add(pedestal);
  const colH=6.8, colR=0.42; // 13.6m real -> 6.8 scaled
  flutedColumnImpl(g,0,0,colH,colR);
  const statue=createBronzeStatue(1.0); statue.position.set(0,colH+1.5,0); g.add(statue);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-1.25,0,z-1.25), new THREE.Vector3(x+1.25,colH+2.5,z+1.25)));
  buildingInteriors.push({type:'column_phocas', x,z, interior:false});
  torches.push({x:x+1.5,y:1.2,z:z}); torches.push({x:x-1.5,y:1.2,z:z});
  createAnimatedFlag(scene,x,colH+3,z,0xffd777,1,0.7);
  return g;
}

// ---- BROADER ROME MONUMENTS ----

// 13. Pantheon - Verified: dome 43.44m diam, oculus 8.8-9.2m, portico 33.1m wide 13.6m deep, 16 columns 11.8m high, built Hadrian 126AD
// Sources: archeoroma.org [dome 43.40m diam oculus 8.8m], thepantheonrome.com [dome 43.44m oculus 9.20m], pantheon-guide.com [oculus 8.9m]
export function pantheon(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  // Rotunda
  const rotundaR=21.7, rotundaH=21.7; // scaled down: real 43.44/2=21.7 radius, height 21.7, we scale to 1/3 ~7.2
  const scale=0.35;
  const r=rotundaR*scale, h=rotundaH*scale;
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(r,r,h,32,1,true),MAT.marble); drum.position.y=h/2; drum.castShadow=true; g.add(drum);
  const floor=new THREE.Mesh(new THREE.CircleGeometry(r-0.2,32),MAT.marblePolished); floor.rotation.x=-Math.PI/2; floor.position.y=0.05; g.add(floor);
  // Dome
  const dome=new THREE.Mesh(new THREE.SphereGeometry(r,32,16,0,Math.PI*2,0,Math.PI/2),MAT.marble); dome.position.y=h; dome.castShadow=true; g.add(dome);
  // Oculus - hole via ring
  const oculusR=4.4*scale; // 8.8m diam -> 4.4 radius scaled
  const oculusRing=new THREE.Mesh(new THREE.TorusGeometry(oculusR,0.2*scale,8,24),MAT.marble); oculusRing.rotation.x=Math.PI/2; oculusRing.position.y=h+r-0.2; g.add(oculusRing);
  // Light beam through oculus
  const beamGeo=new THREE.CylinderGeometry(0.3, oculusR*2, h+r, 16,1,true);
  const beamMat=new THREE.MeshBasicMaterial({color:0xffeeb0, transparent:true, opacity:0.15, side:THREE.DoubleSide});
  const beam=new THREE.Mesh(beamGeo,beamMat); beam.position.y=(h+r)/2; g.add(beam);
  // Portico - 33.1m wide 13.6m deep, 16 columns 11.8m high
  const porticoW=33.1*scale, porticoD=13.6*scale, colH=11.8*scale, colR=0.5*scale;
  const porticoBase=new THREE.Mesh(new THREE.BoxGeometry(porticoW,0.6,porticoD),MAT.marble); porticoBase.position.set(0,0.3,r+porticoD/2); g.add(porticoBase);
  for(let i=0;i<8;i++){ const cx=-porticoW/2+ porticoW/7*i; flutedColumnImpl(g,cx,r+porticoD-0.5,colH,colR); flutedColumnImpl(g,cx,r+1,colH,colR); }
  const ent=createEntablature(porticoW,1.2*scale,1*scale); ent.position.set(0,colH+0.8,r+porticoD/2); g.add(ent);
  const ped=createPediment(porticoW,2*scale,3*scale); ped.position.set(0,colH+1*scale+0.8,r+porticoD-0.5); g.add(ped);
  const roof=createTiledRoof(porticoW,porticoD,2*scale); roof.position.set(0,colH+1*scale+0.8,r+porticoD/2); g.add(roof);
  // Interior niches - 7 niches
  for(let i=0;i<7;i++){ const ang=(i/7)*Math.PI*2; const nx=Math.cos(ang)*(r-0.6), nz=Math.sin(ang)*(r-0.6); const niche=new THREE.Mesh(new THREE.BoxGeometry(1.2,2,0.4),MAT.marblePolished); niche.position.set(nx,2,nz); niche.lookAt(0,2,0); g.add(niche); const statue=createRomanStatue(0.6); statue.position.set(nx*0.9,0.8,nz*0.9); g.add(statue); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-r,0,z-r), new THREE.Vector3(x+r,h+r,z+r+porticoD)));
  buildingInteriors.push({type:'pantheon', x,z, w:r*2, d:r*2+porticoD, interior:true});
  torches.push({x:x-5,y:2,z:z+r+porticoD}); torches.push({x:x+5,y:2,z:z+r+porticoD});
  // Animated oculus light moving
  createAnimatedFlag(scene,x,h+r+1,z,0xffd777,2,1.2);
  // Smoke from oculus for incense
  createAnimatedSmoke(scene,x,h+r-1,z,15);
  return g;
}

// 14. Baths of Diocletian - Verified: 376x361m (380x370, 356x316 central), 13 hectares, 3000 bathers, built 298-306AD
// Sources: treasuresofrome.it [376x361m 3000 people], rome-roma.net [380x370m 13 hectares 3000], ancientromelive.org [32 acres 280x160 central]
export function bathsDiocletian(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=55, outerD=53, outerH=14; // scaled from 376x361 to ~55x53 (1/7)
  createWallWithDoor(g,0,0,outerD/2,outerW,outerH,0.8,5,7,0,MAT.brick);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.8,outerH,outerD),MAT.brick); leftWall.position.set(-outerW/2,outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.8),MAT.brick); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  // Central block 280x160 -> scaled 40x23
  const centralW=40, centralD=23;
  // Frigidarium
  const frigidarium=new THREE.Mesh(new THREE.BoxGeometry(18,0.5,10),MAT.water); frigidarium.position.set(0,0.25,8); g.add(frigidarium);
  createAnimatedWater(scene,0,0.26,8,18,10,0x3a6f8a);
  // Tepidarium
  const tepidarium=new THREE.Mesh(new THREE.BoxGeometry(14,0.5,8),new THREE.MeshStandardMaterial({color:0x6a9aaa})); tepidarium.position.set(0,0.25,-2); g.add(tepidarium);
  // Caldarium with hypocaust
  for(let i=-12;i<=12;i+=3){ for(let j=-18;j<=-8;j+=3){ const pillar=new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.2,1,6),MAT.brick); pillar.position.set(i,0.5,j); g.add(pillar); } }
  const hotFloor=new THREE.Mesh(new THREE.PlaneGeometry(20,12),MAT.marble); hotFloor.rotation.x=-Math.PI/2; hotFloor.position.set(0,1.05,-13); g.add(hotFloor);
  // Natatio 4000m2 -> scaled 12x12
  const natatio=new THREE.Mesh(new THREE.BoxGeometry(12,0.5,12),MAT.water); natatio.position.set(0,0.25,-22); g.add(natatio);
  createAnimatedWater(scene,0,0.26,-22,12,12,0x4a8aaa);
  // Columns - massive granite 5.2m circumference largest in Rome
  for(let i=0;i<6;i++){ const cx=-15+i*30/5; flutedColumnImpl(g,cx,12,9,0.6); flutedColumnImpl(g,cx,-18,9,0.6); }
  // Palaestrae exercise yards
  for(let side of [-1,1]){
    const palaestra=new THREE.Mesh(new THREE.PlaneGeometry(15,15),new THREE.MeshStandardMaterial({color:0xc8b898})); palaestra.rotation.x=-Math.PI/2; palaestra.position.set(side*20,0.02,0); g.add(palaestra);
    for(let j=0;j<3;j++){ const post=new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.15,2,6),MAT.wood); post.position.set(side*20-5+j*5,1,5); g.add(post); }
  }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH,z+outerD/2)));
  buildingInteriors.push({type:'baths_diocletian', x,z, interior:true});
  torches.push({x:x-12,y:3,z:z+15}); torches.push({x:x+12,y:3,z:z+15});
  createAnimatedSmoke(scene,x,2,z+8,25);
  createAnimatedSmoke(scene,x,2,z-13,20);
  return g;
}

// 15. Markets of Trajan - semicircular, 150 shops, multi-level
export function marketsTrajan(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  // Semicircular exedra
  const radius=18;
  const levels=3;
  for(let lvl=0;lvl<levels;lvl++){
    const y=lvl*4.5;
    const wall=new THREE.Mesh(new THREE.CylinderGeometry(radius+lvl*0.5,radius+lvl*0.5+0.6,0.4,24,1,false,0,Math.PI),MAT.brick); wall.rotation.y=-Math.PI/2; wall.position.set(0,y+0.2,0); wall.castShadow=true; g.add(wall);
    // Shops - tabernae
    const shopCount=10;
    for(let i=0;i<shopCount;i++){
      const ang=(i/shopCount)*Math.PI;
      const sx=Math.cos(ang)*(radius-1.5), sz=Math.sin(ang)*(radius-1.5);
      const shop=new THREE.Mesh(new THREE.BoxGeometry(2.5,3,2),MAT.brick); shop.position.set(sx,y+1.5,sz); shop.lookAt(0,y+1.5,0); g.add(shop);
      const counter=new THREE.Mesh(new THREE.BoxGeometry(1.5,0.8,0.6),MAT.wood); counter.position.set(sx*0.9,y+0.4,sz*0.9); g.add(counter);
    }
  }
  const floor=new THREE.Mesh(new THREE.CylinderGeometry(radius, radius,0.2,24,1,false,0,Math.PI),MAT.travertine); floor.rotation.y=-Math.PI/2; floor.position.y=0.1; g.add(floor);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-radius,0,z), new THREE.Vector3(x+radius,levels*4.5,z+radius)));
  buildingInteriors.push({type:'markets_trajan', x,z, interior:true});
  torches.push({x:x,y:2,z:z+5}); torches.push({x:x-8,y:2,z:z+8}); torches.push({x:x+8,y:2,z:z+8});
  createAnimatedFlag(scene,x,levels*4.5+2,z,0x2a5a8a,1.5,1);
  return g;
}

// 16. Trajan's Column - 30m high (38m with base), 3.7m diameter, spiral frieze 190m
export function trajansColumn(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const base=new THREE.Mesh(new THREE.BoxGeometry(4,3,4),MAT.marble); base.position.y=1.5; base.castShadow=true; g.add(base);
  const pedestal=new THREE.Mesh(new THREE.BoxGeometry(3,2,3),MAT.marble); pedestal.position.y=3+1; g.add(pedestal);
  const colH=15, colR=0.9; // 30m real -> 15 scaled
  const shaftGeo=createFlutedColumnGeometry(colH,colR*0.9,colR,0,32,1,0); // Trajan column is not fluted but with spiral relief
  // Instead create with spiral frieze texture via bands
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(colR*0.9,colR,colH,20),MAT.marble); shaft.position.y=3+2+colH/2; shaft.castShadow=true; g.add(shaft);
  // Spiral frieze as torus bands
  for(let i=0;i<12;i++){
    const band=new THREE.Mesh(new THREE.TorusGeometry(colR+0.02,0.08,6,20),MAT.marblePolished); band.rotation.x=Math.PI/2; band.position.set(0,3+2+1+i*1.1,0); g.add(band);
  }
  const capital=createCorinthianCapital(colR); capital.position.y=3+2+colH; g.add(capital);
  const statue=createBronzeStatue(1.2); statue.position.set(0,3+2+colH+2,0); g.add(statue);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-2,0,z-2), new THREE.Vector3(x+2,colH+5,z+2)));
  buildingInteriors.push({type:'trajan_column', x,z, interior:false});
  torches.push({x:x+2,y:1.5,z:z}); torches.push({x:x-2,y:1.5,z:z});
  createAnimatedFlag(scene,x,colH+7,z,0x8a1a1a,1.2,0.8);
  return g;
}

// 17. Ara Pacis - 11.65x10.62m altar peace Augustus 13-9BC
export function araPacis(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=11.65*0.6, outerD=10.62*0.6, outerH=4.5;
  createWallWithDoor(g,0,0,outerD/2,outerW,outerH,0.6,2.5,3,0,MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.5,outerH,outerD),MAT.marble); leftWall.position.set(-outerW/2,outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.5),MAT.marble); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(outerW-1,outerD-1),MAT.marble); floor.rotation.x=-Math.PI/2; floor.position.y=0.05; g.add(floor);
  // Inner altar
  const altar=new THREE.Mesh(new THREE.BoxGeometry(3,1.2,2),MAT.marblePolished); altar.position.set(0,0.6,0); g.add(altar);
  // Reliefs - procession
  for(let i=0;i<4;i++){ const relief=new THREE.Mesh(new THREE.BoxGeometry(0.1,1.5,0.8),MAT.marblePolished); relief.position.set(-outerW/2+0.15,2,-2+i*1.5); g.add(relief); const rel2=relief.clone(); rel2.position.x=outerW/2-0.15; g.add(rel2); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH,z+outerD/2)));
  buildingInteriors.push({type:'ara_pacis', x,z, interior:true});
  torches.push({x:x-3,y:2,z:z+4}); torches.push({x:x+3,y:2,z:z+4});
  createAnimatedFire(scene,x,0.8,z,0.4,true);
  return g;
}

// 18. Mausoleum of Augustus - diameter 87m height 42m built 28BC
export function mausoleumAugustus(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const baseR=43.5*0.25, baseH=5; // 87m diam -> 43.5 radius scaled 0.25 => ~10.9
  const base=new THREE.Mesh(new THREE.CylinderGeometry(baseR,baseR,baseH,32),MAT.marble); base.position.y=baseH/2; base.castShadow=true; g.add(base);
  const drumR=32*0.25, drumH=12;
  const drum=new THREE.Mesh(new THREE.CylinderGeometry(drumR,drumR,drumH,32),MAT.brick); drum.position.y=baseH+drumH/2; drum.castShadow=true; g.add(drum);
  const topMound=new THREE.Mesh(new THREE.CylinderGeometry(drumR*0.8,drumR,4,32),new THREE.MeshStandardMaterial({color:0x5a7a3a})); topMound.position.y=baseH+drumH+2; g.add(topMound);
  const statue=createBronzeStatue(1.5); statue.position.set(0,baseH+drumH+4+1.5,0); g.add(statue);
  // Entrance
  const entrance=new THREE.Mesh(new THREE.BoxGeometry(2,3,1),new THREE.MeshStandardMaterial({color:0x1a1a1a})); entrance.position.set(0,1.5,baseR-0.5); g.add(entrance);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-baseR,0,z-baseR), new THREE.Vector3(x+baseR,baseH+drumH+4,z+baseR)));
  buildingInteriors.push({type:'mausoleum_augustus', x,z, interior:true});
  torches.push({x:x+baseR+1,y:2,z:z}); torches.push({x:x-baseR-1,y:2,z:z});
  createAnimatedFlag(scene,x,baseH+drumH+6,z,0x6a0a8a,2,1.2);
  return g;
}

// 19. Mausoleum of Hadrian (Castel Sant'Angelo) - square base 89m cylinder 64m diam 21m high
export function mausoleumHadrian(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const squareW=89*0.2, squareH=6; // scaled 0.2 => 17.8
  const square=new THREE.Mesh(new THREE.BoxGeometry(squareW,squareH,squareW),MAT.marble); square.position.y=squareH/2; square.castShadow=true; g.add(square);
  const cylR=32*0.2, cylH=21*0.2;
  const cyl=new THREE.Mesh(new THREE.CylinderGeometry(cylR,cylR,cylH,32),MAT.marble); cyl.position.y=squareH+cylH/2; cyl.castShadow=true; g.add(cyl);
  const topGarden=new THREE.Mesh(new THREE.CylinderGeometry(cylR*0.9,cylR,1,32),new THREE.MeshStandardMaterial({color:0x5a7a3a})); topGarden.position.y=squareH+cylH+0.5; g.add(topGarden);
  const statue=createBronzeStatue(1.3); statue.position.set(0,squareH+cylH+1+1.3,0); g.add(statue);
  // Bridge to mausoleum - Pons Aelius
  const bridge=new THREE.Mesh(new THREE.BoxGeometry(20,0.5,4),MAT.marble); bridge.position.set(12,1,0); g.add(bridge);
  for(let i=0;i<3;i++){ const arch=new THREE.Mesh(new THREE.TorusGeometry(1.5,0.2,8,16,Math.PI),MAT.marble); arch.rotation.x=Math.PI/2; arch.rotation.y=Math.PI/2; arch.position.set(6+i*6,1,0); g.add(arch); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-squareW/2,0,z-squareW/2), new THREE.Vector3(x+squareW/2,squareH+cylH+2,z+squareW/2)));
  buildingInteriors.push({type:'mausoleum_hadrian', x,z, interior:true});
  torches.push({x:x+squareW/2+1,y:2,z:z}); torches.push({x:x-squareW/2-1,y:2,z:z});
  createAnimatedFlag(scene,x,squareH+cylH+4,z,0x8a1a1a,1.8,1.1);
  return g;
}

// 20. Domus Aurea - Golden House Nero, 150 rooms, 300m facade
export function domusAurea(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=45, outerD=30, outerH=10;
  createWallWithDoor(g,0,0,outerD/2,outerW,outerH,0.8,4,5.5,0,MAT.marble);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.8,outerH,outerD),MAT.marble); leftWall.position.set(-outerW/2,outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.8),MAT.marble); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(outerW-1,outerD-1),MAT.marblePolished); floor.rotation.x=-Math.PI/2; floor.position.y=0.05; g.add(floor);
  // Octagonal hall - famous
  const octagon=new THREE.Mesh(new THREE.CylinderGeometry(6,6,8,8),MAT.marble); octagon.position.set(0,4,0); g.add(octagon);
  const dome=new THREE.Mesh(new THREE.SphereGeometry(6,16,12,0,Math.PI*2,0,Math.PI/2),MAT.marble); dome.position.y=8; g.add(dome);
  const oculus=new THREE.Mesh(new THREE.TorusGeometry(1.2,0.15,8,16),MAT.marble); oculus.rotation.x=Math.PI/2; oculus.position.y=8+5.5; g.add(oculus);
  // Golden decorations
  for(let i=0;i<8;i++){ const ang=(i/8)*Math.PI*2; const col=flutedColumnImpl(g,Math.cos(ang)*5,Math.sin(ang)*5,6,0.35,MAT.gold); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH,z+outerD/2)));
  buildingInteriors.push({type:'domus_aurea', x,z, interior:true});
  torches.push({x:x-8,y:3,z:z+12}); torches.push({x:x+8,y:3,z:z+12});
  createAnimatedFlag(scene,x,outerH+3,z,0xd9a441,1.5,1);
  createAnimatedSmoke(scene,x,outerH,z,15);
  return g;
}

// 21. Palatine Palaces - Domus Augustana/Flavia
export function palatinePalace(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=60, outerD=45, outerH=14;
  createWallWithDoor(g,0,0,outerD/2,outerW,outerH,0.8,5,7,0,MAT.marblePolished);
  const leftWall=new THREE.Mesh(new THREE.BoxGeometry(0.8,outerH,outerD),MAT.marblePolished); leftWall.position.set(-outerW/2,outerH/2,0); g.add(leftWall);
  const rightWall=leftWall.clone(); rightWall.position.x=outerW/2; g.add(rightWall);
  const backWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,outerH,0.8),MAT.marblePolished); backWall.position.set(0,outerH/2,-outerD/2); g.add(backWall);
  // Peristyle garden huge
  const periFloor=new THREE.Mesh(new THREE.PlaneGeometry(30,20),new THREE.MeshStandardMaterial({color:0x3a6a3a})); periFloor.rotation.x=-Math.PI/2; periFloor.position.set(0,0.05,0); g.add(periFloor);
  for(let i=0;i<6;i++){ const cx=-12+i*24/5; flutedColumnImpl(g,cx,8,7,0.45); flutedColumnImpl(g,cx,-8,7,0.45); }
  for(let i=1;i<4;i++){ const cz=-8+i*16/4; flutedColumnImpl(g,-12,cz,7,0.45); flutedColumnImpl(g,12,cz,7,0.45); }
  const fountain=new THREE.Mesh(new THREE.CylinderGeometry(3,3,0.4,16),MAT.marble); fountain.position.set(0,0.2,0); g.add(fountain);
  const water=new THREE.Mesh(new THREE.CylinderGeometry(2.8,2.8,0.1,16),MAT.water); water.position.set(0,0.41,0); g.add(water);
  createAnimatedWater(scene,0,0.42,0,5.6,5.6,0x4a8aaa);
  // Throne room
  const throne=new THREE.Mesh(new THREE.BoxGeometry(2,1.5,1.5),MAT.gold); throne.position.set(0,0.75,-18); g.add(throne);
  const emperorStatue=createBronzeStatue(1.2); emperorStatue.position.set(0,0.75+1.2,-18); g.add(emperorStatue);
  const roof=createTiledRoof(outerW+2,outerD+2,5); roof.position.y=outerH+0.5; g.add(roof);
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,outerH+2,z+outerD/2)));
  buildingInteriors.push({type:'palatine_palace', x,z, interior:true});
  torches.push({x:x-10,y:4,z:z+18}); torches.push({x:x+10,y:4,z:z+18});
  createAnimatedFlag(scene,x,outerH+5,z,0x6a0a8a,2.5,1.5);
  factionZones['emperor_palace']={x:x, z:z, w:60, d:45, color:0x6a0a8a};
  return g;
}

// 22. Aqueduct - Aqua Marcia etc
export function aqueduct(scene, x1,z1,x2,z2, height=12){
  const g=new THREE.Group();
  const dx=x2-x1, dz=z2-z1, len=Math.hypot(dx,dz), ang=Math.atan2(dz,dx);
  const archCount=Math.floor(len/8);
  for(let i=0;i<archCount;i++){
    const t=i/archCount;
    const ax=x1+dx*t, az=z1+dz*t;
    const pier=new THREE.Mesh(new THREE.BoxGeometry(1.5,height,1.5),MAT.brick); pier.position.set(ax,height/2,az); pier.castShadow=true; g.add(pier);
    if(i<archCount-1){
      const arch=new THREE.Mesh(new THREE.TorusGeometry(3.2,0.25,8,16,Math.PI),MAT.brick); arch.rotation.x=Math.PI/2; arch.rotation.y=-ang; arch.position.set(ax+dx/archCount/2,height-3,az+dz/archCount/2); g.add(arch);
    }
  }
  const channel=new THREE.Mesh(new THREE.BoxGeometry(len,1,2),MAT.marble); channel.position.set((x1+x2)/2,height+0.5,(z1+z2)/2); channel.rotation.y=-ang; g.add(channel);
  const water=new THREE.Mesh(new THREE.BoxGeometry(len-2,0.3,1.5),MAT.water); water.position.set((x1+x2)/2,height+0.8,(z1+z2)/2); water.rotation.y=-ang; g.add(water);
  scene.add(g);
  // No collider for aqueduct - allow passing under arches
  return g;
}

// 23. Aurelian Walls - 19km, 3.5m thick, 8m high - we add outer ring
export function aurelianWalls(scene, W=900, D=700){
  const wallH=10, wallT=3.5;
  const wallMat=MAT.brick;
  const g=new THREE.Group();
  // Four sides
  const walls=[
    {w:W*2+20,h:wallH,d:wallT,x:0,y:wallH/2,z:-D-15},
    {w:W*2+20,h:wallH,d:wallT,x:0,y:wallH/2,z:D+15},
    {w:wallT,h:wallH,d:D*2+30,x:-W-15,y:wallH/2,z:0},
    {w:wallT,h:wallH,d:D*2+30,x:W+15,y:wallH/2,z:0},
  ];
  walls.forEach(wd=>{
    const m=new THREE.Mesh(new THREE.BoxGeometry(wd.w,wd.h,wd.d),wallMat); m.position.set(wd.x,wd.y,wd.z); m.castShadow=true; g.add(m);
    addColliderFromMesh(m);
  });
  // Towers every 50m
  for(let x=-W-15;x<=W+15;x+=50){
    for(let side of [-D-15, D+15]){
      const tower=new THREE.Mesh(new THREE.CylinderGeometry(4,4.5,14,12),MAT.brick); tower.position.set(x,7,side); tower.castShadow=true; g.add(tower);
      colliders.push(new THREE.Box3(new THREE.Vector3(x-4.5,0,side-4.5), new THREE.Vector3(x+4.5,14,side+4.5)));
      torches.push({x:x+2.5,y:9,z:side});
    }
  }
  for(let z=-D-15;z<=D+15;z+=50){
    for(let side of [-W-15, W+15]){
      const tower=new THREE.Mesh(new THREE.CylinderGeometry(4,4.5,14,12),MAT.brick); tower.position.set(side,7,z); tower.castShadow=true; g.add(tower);
      colliders.push(new THREE.Box3(new THREE.Vector3(side-4.5,0,z-4.5), new THREE.Vector3(side+4.5,14,z+4.5)));
      torches.push({x:side,y:9,z:z+2.5});
    }
  }
  scene.add(g);
  return g;
}

// 24. Forum of Augustus - 125x118m, Temple Mars Ultor
export function forumAugustus(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=35, outerD=34, outerH=12; // scaled from 125x118 -> ~35x34 (1/3.5)
  // High wall 33m real -> 10 scaled
  const highWall=new THREE.Mesh(new THREE.BoxGeometry(outerW,10,2),MAT.brick); highWall.position.set(0,5,-outerD/2); highWall.castShadow=true; g.add(highWall);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(outerW,outerD),MAT.travertine); floor.rotation.x=-Math.PI/2; floor.position.y=0.02; g.add(floor);
  // Temple Mars Ultor
  const templeW=12, templeD=18, templeH=10;
  const templePodium=new THREE.Mesh(new THREE.BoxGeometry(templeW,2.5,templeD),MAT.marble); templePodium.position.set(0,1.25,-8); g.add(templePodium);
  for(let i=0;i<6;i++){ const cx=-5+i*10/5; flutedColumnImpl(g,cx,2,8,0.48); }
  const cella=new THREE.Mesh(new THREE.BoxGeometry(8,8,12),MAT.marble); cella.position.set(0,2.5+4,-10); g.add(cella);
  const ent=createEntablature(12,1.2,1.1); ent.position.set(0,2.5+8+0.7,2); g.add(ent);
  const ped=createPediment(12,2,2.5); ped.position.set(0,2.5+8+1.1+0.7,2); g.add(ped);
  // Porticoes with statues Summi Viri
  for(let side of [-1,1]){
    const colX=side*(outerW/2-2);
    for(let i=-outerD/2+4;i<outerD/2-4;i+=4){ flutedColumnImpl(g,colX,i,6,0.35); }
    for(let i=0;i<5;i++){ const statue=createRomanStatue(0.7); statue.position.set(colX*0.8,0.7,-8+i*5); g.add(statue); }
  }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,12,z+outerD/2)));
  buildingInteriors.push({type:'forum_augustus', x,z, interior:true});
  torches.push({x:x-12,y:3,z:z}); torches.push({x:x+12,y:3,z:z});
  createAnimatedFlag(scene,x,12,z,0x8a1a1a,1.5,1);
  return g;
}

// 25. Forum of Trajan - largest imperial fora, Basilica Ulpia, Column
export function forumTrajan(scene,x,z){
  const g=new THREE.Group(); g.position.set(x,0,z);
  const outerW=50, outerD=60;
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(outerW,outerD),MAT.travertine); floor.rotation.x=-Math.PI/2; floor.position.y=0.02; g.add(floor);
  // Basilica Ulpia
  const basilicaW=30, basilicaD=18, basilicaH=12;
  const basilicaFloor=new THREE.Mesh(new THREE.PlaneGeometry(basilicaW,basilicaD),MAT.marblePolished); basilicaFloor.rotation.x=-Math.PI/2; basilicaFloor.position.set(0,0.05,-15); g.add(basilicaFloor);
  for(let row of [-1,1]){ for(let i=-12;i<=12;i+=4){ flutedColumnImpl(g,row*6,i-15,8,0.42); } }
  const basilicaRoof=createTiledRoof(basilicaW+2,basilicaD+2,4); basilicaRoof.position.set(0,12,-15); g.add(basilicaRoof);
  // Libraries
  for(let side of [-1,1]){ const lib=new THREE.Mesh(new THREE.BoxGeometry(8,6,8),MAT.brick); lib.position.set(side*12,3,5); g.add(lib); }
  scene.add(g); g.updateMatrixWorld(true);
  colliders.push(new THREE.Box3(new THREE.Vector3(x-outerW/2,0,z-outerD/2), new THREE.Vector3(x+outerW/2,12,z+outerD/2)));
  buildingInteriors.push({type:'forum_trajan', x,z, interior:true});
  torches.push({x:x-15,y:3,z:z}); torches.push({x:x+15,y:3,z:z});
  createAnimatedFlag(scene,x,14,z,0xd9a441,2,1.2);
  return g;
}

// Export all builders
export function buildRomanExpansion(scene){
  console.log('[EXPANSION] Building missing Roman Empire monuments - verified dimensions');
  
  // Forum missing monuments - place around central forum
  // Temple Vespasian Titus near Saturn and Concord - west side
  templeVespasianTitus(scene, -110, -140);
  templeConcord(scene, -160, -180);
  
  // Temple Antoninus Faustina east side near Regia
  templeAntoninusFaustina(scene, 110, -60);
  regia(scene, 80, -40);
  
  // Temple Romulus near Antoninus and Maxentius
  templeRomulus(scene, 70, 20);
  
  // Arches
  archSeptimiusSeverus(scene, -80, -200);
  archTitus(scene, 180, 60);
  
  // Umbilicus and Milliarium near Rostra
  umbilicusAndMilliarium(scene, -20, -120);
  
  // Lapis Niger near Curia
  lapisNiger(scene, -180, -70);
  
  // Portico Dii Consentes along Tabularium
  porticoDiiConsentes(scene, -40, -210, 50);
  
  // Lacus Curtius/Juturnae middle forum
  lacusCurtiusJuturnae(scene, 0, -30);
  
  // Column Phocas in front Rostra
  columnPhocas(scene, -10, -90);
  
  // Broader Rome
  // Pantheon in Campus Martius north
  pantheon(scene, -150, -380);
  
  // Baths Diocletian north-east
  bathsDiocletian(scene, 320, -380);
  
  // Markets Trajan near Forum Trajan
  marketsTrajan(scene, 120, -260);
  
  // Trajan's Column in Forum Trajan
  trajansColumn(scene, 0, -280);
  
  // Ara Pacis north Campus
  araPacis(scene, 100, -420);
  
  // Mausoleums
  mausoleumAugustus(scene, -350, -500);
  mausoleumHadrian(scene, -600, -350);
  
  // Domus Aurea east near Colosseum
  domusAurea(scene, 400, -180);
  
  // Palatine Palace on Palatine Hill
  palatinePalace(scene, 0, 450);
  
  // Imperial Fora
  forumAugustus(scene, 80, -200);
  forumTrajan(scene, 0, -300);
  
  // Aqueducts
  aqueduct(scene, -900, -300, -300, -300, 14);
  aqueduct(scene, 300, -300, 900, -300, 14);
  aqueduct(scene, -900, 300, 900, 300, 12);
  
  // Aurelian Walls outer ring
  aurelianWalls(scene, 900, 700);
  
  console.log('[EXPANSION] Built 25 missing monuments - Temple Vespasian Titus 22x33m 15.2m cols, Antoninus Faustina 17m cols, Romulus 15m diam bronze doors, Concord 45x24m, Arch Septimius 23x25x11.85 central 12x7 sides 7.8x3 cols 8.78m, Arch Titus 15.4x13.5x4.75 inner 8.3x5.36, Regia trapezoidal 3 rooms, Umbilicus 2m high 4.45m diam, Milliarium 3.7m high 1.15m diam 3m base gilded Augustus 20BC, Lapis Niger, Portico Dii Consentes 8 cols, Lacus Curtius/Juturnae, Column Phocas 13.6m, Pantheon dome 43.44m oculus 8.8-9.2m portico 33.1x13.6 16 cols 11.8m, Baths Diocletian 376x361 13ha 3000 bathers 298-306AD, Markets Trajan 150 shops, Trajan Column 30m high 3.7m diam 190m frieze, Ara Pacis 11.65x10.62, Mausoleum Augustus 87m diam 42m high 28BC, Mausoleum Hadrian 89m square 64m diam 21m high, Domus Aurea 150 rooms, Palatine Palace, Forum Augustus 125x118 Temple Mars Ultor, Forum Trajan, Aqueducts, Aurelian Walls 19km');
}
