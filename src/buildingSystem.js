/**
 * Kitchuban Building System - EVERYONE CAN BUILD, NO ADMINS, NO MODS
 * All players equal: gather resources and build shelters, walls, towers
 */
import * as THREE from 'three';
import { MAT } from './materials.js';
import { colliders } from './world.js';

export const BUILD_RECIPES = {
  wall: { name: 'Wooden Palisade', cost: { wood: 5, gold: 10 }, hp: 100, size: {w:3,h:2.5,d:0.5}, icon: '🪵' },
  tower: { name: 'Watch Tower', cost: { wood: 15, marble: 5, gold: 50 }, hp: 250, size: {w:3,h:6,d:3}, icon: '🗼' },
  shelter: { name: 'Shelter Tent', cost: { wood: 8, grain: 3, gold: 20 }, hp: 80, size: {w:4,h:2.2,d:4}, icon: '⛺' },
  chest: { name: 'Storage Chest', cost: { wood: 4, gold: 15 }, hp: 60, size: {w:1.2,h:0.8,d:0.8}, icon: '📦' },
  fire: { name: 'Camp Fire', cost: { wood: 3, oil: 1, gold: 5 }, hp: 40, size: {w:1,d:0.3,d2:1}, icon: '🔥' },
  barricade: { name: 'Barricade', cost: { wood: 6, weapons: 2, gold: 25 }, hp: 120, size: {w:2.5,h:1.5,d:1}, icon: '🚧' },
};

export class BuildingSystem {
  constructor(scene, player, economy) {
    this.scene = scene;
    this.player = player;
    this.economy = economy;
    this.placedBuildings = []; // {mesh, type, x,z, hp, collider}
    this.ghostMesh = null;
    this.selectedBuild = 'wall';
    this.buildMode = false;
    this.load();
  }

  load() {
    try {
      const saved = JSON.parse(localStorage.getItem('kitchuban_buildings') || '[]');
      for (const b of saved) {
        this.placeBuilding(b.type, b.x, b.z, b.ry||0, false); // false = don't pay again
      }
    } catch {}
  }

  save() {
    const data = this.placedBuildings.map(b => ({type:b.type, x:b.x, z:b.z, ry:b.ry}));
    localStorage.setItem('kitchuban_buildings', JSON.stringify(data));
  }

  setBuildType(type) {
    if (BUILD_RECIPES[type]) {
      this.selectedBuild = type;
      this.updateGhost();
      console.log('[BUILD] Selected', type, BUILD_RECIPES[type]);
    }
  }

  toggleBuildMode() {
    this.buildMode = !this.buildMode;
    if (this.buildMode) this.updateGhost();
    else this.removeGhost();
    console.log('[BUILD] Build mode', this.buildMode, 'type', this.selectedBuild);
    return this.buildMode;
  }

  updateGhost() {
    this.removeGhost();
    if (!this.buildMode) return;
    const recipe = BUILD_RECIPES[this.selectedBuild];
    if (!recipe) return;
    
    const size = recipe.size;
    const geo = new THREE.BoxGeometry(size.w, size.h, size.d||size.w);
    const mat = new THREE.MeshStandardMaterial({color: 0x4aff4a, transparent:true, opacity:0.4, wireframe: false});
    this.ghostMesh = new THREE.Mesh(geo, mat);
    this.ghostMesh.position.set(0, size.h/2, 0);
    this.scene.add(this.ghostMesh);
  }

  removeGhost() {
    if (this.ghostMesh) { this.scene.remove(this.ghostMesh); this.ghostMesh=null; }
  }

  updateGhostPosition() {
    if (!this.ghostMesh || !this.buildMode) return;
    const forward = this.player.forward.clone().multiplyScalar(5);
    const pos = this.player.position.clone().add(forward);
    pos.y = 0;
    this.ghostMesh.position.set(pos.x, this.ghostMesh.geometry.parameters.height/2, pos.z);
    this.ghostMesh.rotation.y = this.player.yaw;
    
    // Check if can place (not colliding, affordable)
    const canAfford = this.economy ? this.economy.canAfford(BUILD_RECIPES[this.selectedBuild].cost) : true;
    const colliding = this.checkCollision(pos.x, pos.z, this.selectedBuild);
    const color = canAfford && !colliding ? 0x4aff4a : 0xff4a4a;
    this.ghostMesh.material.color.setHex(color);
  }

  checkCollision(x, z, type) {
    const recipe = BUILD_RECIPES[type];
    const w = recipe.size.w, d = recipe.size.d||recipe.size.w;
    const box = new THREE.Box3(new THREE.Vector3(x-w/2,0,z-d/2), new THREE.Vector3(x+w/2, recipe.size.h, z+d/2));
    for (const c of colliders) if (box.intersectsBox(c)) return true;
    for (const b of this.placedBuildings) {
      const bw = BUILD_RECIPES[b.type].size.w, bd = BUILD_RECIPES[b.type].size.d||bw;
      const bBox = new THREE.Box3(new THREE.Vector3(b.x-bw/2,0,b.z-bd/2), new THREE.Vector3(b.x+bw/2, BUILD_RECIPES[b.type].size.h, b.z+bd/2));
      if (box.intersectsBox(bBox)) return true;
    }
    return false;
  }

  tryPlace() {
    if (!this.buildMode || !this.ghostMesh) return false;
    const recipe = BUILD_RECIPES[this.selectedBuild];
    if (!recipe) return false;
    
    const x = this.ghostMesh.position.x;
    const z = this.ghostMesh.position.z;
    const ry = this.ghostMesh.rotation.y;
    
    if (this.checkCollision(x,z,this.selectedBuild)) {
      console.log('[BUILD] Cannot place - colliding');
      return false;
    }
    if (this.economy && !this.economy.canAfford(recipe.cost)) {
      console.log('[BUILD] Cannot afford', recipe.cost, 'have', this.economy.getResources());
      return false;
    }
    
    if (this.economy) this.economy.pay(recipe.cost);
    this.placeBuilding(this.selectedBuild, x, z, ry, true);
    return true;
  }

  placeBuilding(type, x, z, ry=0, save=true) {
    const recipe = BUILD_RECIPES[type];
    const size = recipe.size;
    let mesh;
    
    if (type === 'wall') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.d), MAT.woodDark);
      mesh.position.set(x, size.h/2, z); mesh.rotation.y=ry; mesh.castShadow=true;
    } else if (type === 'tower') {
      const group = new THREE.Group(); group.position.set(x,0,z); group.rotation.y=ry;
      const base = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.d), MAT.brick); base.position.y=size.h/2; base.castShadow=true; group.add(base);
      const top = new THREE.Mesh(new THREE.BoxGeometry(size.w+0.5,0.5,size.d+0.5), MAT.wood); top.position.y=size.h+0.25; group.add(top);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2,1.5,8), MAT.terracotta); roof.position.y=size.h+1; group.add(roof);
      this.scene.add(group); mesh = group;
      // collider
      const box = new THREE.Box3(new THREE.Vector3(x-size.w/2,0,z-size.d/2), new THREE.Vector3(x+size.w/2,size.h,z+size.d/2));
      colliders.push(box);
      this.placedBuildings.push({mesh:group, type, x,z, ry, hp:recipe.hp, box});
      if (save) this.save();
      return group;
    } else if (type === 'shelter') {
      const group = new THREE.Group(); group.position.set(x,0,z); group.rotation.y=ry;
      const floor = new THREE.Mesh(new THREE.PlaneGeometry(size.w, size.d), MAT.wood); floor.rotation.x=-Math.PI/2; floor.position.y=0.05; group.add(floor);
      const tentGeo = new THREE.ConeGeometry(size.w*0.6, size.h, 4); const tent = new THREE.Mesh(tentGeo, new THREE.MeshStandardMaterial({color:0xc8b898})); tent.position.y=size.h/2; tent.rotation.y=Math.PI/4; tent.castShadow=true; group.add(tent);
      this.scene.add(group); mesh=group;
      const box = new THREE.Box3(new THREE.Vector3(x-size.w/2,0,z-size.d/2), new THREE.Vector3(x+size.w/2,size.h,z+size.d/2));
      colliders.push(box);
      this.placedBuildings.push({mesh:group, type, x,z, ry, hp:recipe.hp, box});
      if (save) this.save();
      return group;
    } else if (type === 'fire') {
      const group = new THREE.Group(); group.position.set(x,0,z);
      const pit = new THREE.Mesh(new THREE.CylinderGeometry(0.6,0.7,0.2,10), new THREE.MeshStandardMaterial({color:0x2a1a0a})); pit.position.y=0.1; group.add(pit);
      const flame = new THREE.Mesh(new THREE.SphereGeometry(0.3,6,6), new THREE.MeshStandardMaterial({color:0xff6a2a, emissive:0xff4a1a, emissiveIntensity:0.6})); flame.position.y=0.5; group.add(flame);
      this.scene.add(group); mesh=group;
      this.placedBuildings.push({mesh:group, type, x,z, ry, hp:recipe.hp});
      if (save) this.save();
      return group;
    } else {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(size.w, size.h, size.d||size.w), MAT.wood);
      mesh.position.set(x, size.h/2, z); mesh.rotation.y=ry; mesh.castShadow=true;
    }
    
    this.scene.add(mesh);
    const box = new THREE.Box3(new THREE.Vector3(x-size.w/2,0,z-(size.d||size.w)/2), new THREE.Vector3(x+size.w/2,size.h,z+(size.d||size.w)/2));
    colliders.push(box);
    this.placedBuildings.push({mesh, type, x,z, ry, hp:recipe.hp, box});
    if (save) this.save();
    console.log('[BUILD] Placed', type, 'at', x.toFixed(1), z.toFixed(1), 'total', this.placedBuildings.length);
    return mesh;
  }

  update(dt) {
    if (this.buildMode) this.updateGhostPosition();
  }
}
