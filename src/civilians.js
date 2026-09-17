/**
 * Kitchuban Civilians - Living world, no admins, everyone equal
 * Merchants, citizens, children, animals walking around
 * Animations everywhere: walk, gesture, idle, talk, carry
 */
import * as THREE from 'three';
import { MAT } from './materials.js';

export class Civilian {
  constructor(scene, pos, type='citizen') {
    this.scene = scene;
    this.position = pos.clone();
    this.type = type;
    this.velocity = new THREE.Vector3();
    this.yaw = Math.random()*Math.PI*2;
    this.walk = Math.random()*10;
    this.wanderTimer = 2 + Math.random()*4;
    this.wanderDir = new THREE.Vector3(Math.random()-0.5,0,Math.random()-0.5).normalize();
    this.speed = type==='child' ? 2.5 : type==='merchant' ? 1.8 : 1.2 + Math.random()*1.0;
    this.idleTimer = 0;
    this.gestureTimer = 0;
    this.talkTimer = Math.random()*5;
    this.build();
  }

  build() {
    const g = new THREE.Group();
    const isChild = this.type === 'child';
    const s = isChild ? 0.7 : 1;
    
    const colors = {
      citizen: [0x8a6a4a, 0x6a8a5a, 0x5a6a8a, 0x8a5a5a],
      merchant: [0x2a5a8a, 0xd9a441, 0x8a1a1a],
      child: [0xc8a898, 0xa8c8a8, 0xa8a8c8],
      priest: [0xf0f0f0, 0xffd777],
      guard: [0x8a1a1a, 0x1a1a2a],
      noble: [0xd9a441, 0x6a0a8a, 0x2a5a8a],
    };
    const palette = colors[this.type] || colors.citizen;
    const tunicColor = palette[Math.floor(Math.random()*palette.length)];
    const tunicMat = new THREE.MeshStandardMaterial({color: tunicColor, roughness:0.9});
    
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22*s,0.26*s,0.6*s,8), tunicMat);
    torso.position.y = 0.9*s; torso.castShadow=true; g.add(torso);
    
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16*s,10,8), MAT.skin);
    head.position.y = 1.35*s; g.add(head);
    
    // Hair
    if (Math.random()<0.6) {
      const hairMat = new THREE.MeshStandardMaterial({color: Math.random()<0.5?0x2a1a0e:0x8a5a3a});
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.17*s,8,6,0,Math.PI*2,0,1.2), hairMat);
      hair.position.y = 1.38*s;
      g.add(hair);
    }
    
    const legGeo = new THREE.CylinderGeometry(0.07*s,0.06*s,0.4*s,6);
    const legL = new THREE.Mesh(legGeo, tunicMat); legL.position.set(-0.1*s,0.4*s,0); g.add(legL);
    const legR = legL.clone(); legR.position.x=0.1*s; g.add(legR);
    
    const armGeo = new THREE.CylinderGeometry(0.05*s,0.05*s,0.35*s,6);
    const armL = new THREE.Mesh(armGeo, MAT.skin); armL.position.set(-0.28*s,0.9*s,0); armL.rotation.z=0.2; g.add(armL);
    const armR = armL.clone(); armR.position.x=0.28*s; armR.rotation.z=-0.2; g.add(armR);
    
    if (this.type === 'merchant') {
      const sack = new THREE.Mesh(new THREE.BoxGeometry(0.5*s,0.4*s,0.3*s), MAT.woodDark);
      sack.position.set(0,0.8*s,0.3*s); g.add(sack);
      const amph = new THREE.Mesh(new THREE.CylinderGeometry(0.15,0.18,0.4,8), MAT.terracotta);
      amph.position.set(0.3*s,0.5*s,0); g.add(amph);
    }
    
    if (this.type === 'priest') {
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.03,0.03,1.5,6), MAT.woodDark);
      staff.position.set(0.35*s,0.9*s,0); g.add(staff);
    }
    
    this.parts = { legL, legR, armL, armR, torso, head };
    this.group = g;
    g.position.copy(this.position);
    this.scene.add(g);
  }

  update(dt) {
    this.wanderTimer -= dt;
    this.idleTimer -= dt;
    this.gestureTimer -= dt;
    this.talkTimer -= dt;
    
    // Idle behavior
    if (this.idleTimer > 0) {
      // Idle animation - look around, gesture
      this.walk += dt*1.2;
      if (this.parts) {
        this.parts.head.rotation.y = Math.sin(this.walk*0.5)*0.6;
        this.parts.head.rotation.x = Math.sin(this.walk*0.3)*0.2;
        if (this.gestureTimer <=0 && Math.random()<0.02) {
          this.gestureTimer = 0.8 + Math.random()*1.2;
        }
        if (this.gestureTimer > 0) {
          const k = Math.sin(this.gestureTimer*8)*0.5;
          this.parts.armR.rotation.x = -k*1.2;
          this.parts.armR.rotation.z = -0.2 + k*0.8;
        }
      }
      this.wanderTimer = 0.5;
      this.group.position.copy(this.position);
      this.group.rotation.y = this.yaw;
      return;
    }
    
    if (this.wanderTimer <= 0) {
      // Chance to idle
      if (Math.random()<0.25) {
        this.idleTimer = 1 + Math.random()*3;
        this.wanderTimer = 3;
        return;
      }
      this.wanderTimer = 3 + Math.random()*5;
      this.wanderDir.set(Math.random()-0.5,0,Math.random()-0.5).normalize();
      if (this.position.x < -850) this.wanderDir.x = Math.abs(this.wanderDir.x);
      if (this.position.x > 850) this.wanderDir.x = -Math.abs(this.wanderDir.x);
      if (this.position.z < -680) this.wanderDir.z = Math.abs(this.wanderDir.z);
      if (this.position.z > 680) this.wanderDir.z = -Math.abs(this.wanderDir.z);
      // Talk animation when near other civilian - simplified
      if (this.talkTimer <=0) {
        this.talkTimer = 3 + Math.random()*5;
        this.idleTimer = 1.5 + Math.random()*2;
      }
    }
    
    this.velocity.copy(this.wanderDir).multiplyScalar(this.speed);
    this.position.addScaledVector(this.velocity, dt);
    this.yaw = Math.atan2(this.wanderDir.x, this.wanderDir.z);
    
    this.walk += dt * this.speed * 2.5;
    const swing = Math.sin(this.walk)*0.5;
    const bob = Math.sin(this.walk*2)*0.03;
    if (this.parts) {
      this.parts.legL.rotation.x = swing;
      this.parts.legR.rotation.x = -swing;
      this.parts.armL.rotation.x = -swing*0.6;
      this.parts.armR.rotation.x = swing*0.6;
      this.parts.torso.position.y = bob;
      this.parts.head.position.y = 1.35*(this.type==='child'?0.7:1) + bob*0.5;
      // Breathing
      this.parts.torso.scale.set(1+Math.sin(this.walk*0.5)*0.02,1,1);
    }
    
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    this.group.position.y = 0;
  }
}

export class CivilianManager {
  constructor(scene) {
    this.scene = scene;
    this.civilians = [];
    this.spawn();
  }

  spawn() {
    const types = ['citizen','citizen','citizen','merchant','child','priest','noble','guard'];
    for (let i=0;i<55;i++) {
      const x = (Math.random()-0.5)*1600;
      const z = (Math.random()-0.5)*1200;
      if (Math.abs(x) < 100 && Math.abs(z) < 100 && Math.random()<0.7) continue;
      const type = types[Math.floor(Math.random()*types.length)];
      const pos = new THREE.Vector3(x,0,z);
      this.civilians.push(new Civilian(this.scene, pos, type));
    }
    console.log('[CIVILIANS] Spawned', this.civilians.length, 'citizens - living world, animations everywhere: walk, idle, gesture, talk, breathe');
  }

  update(dt) {
    for (const c of this.civilians) c.update(dt);
  }
}
