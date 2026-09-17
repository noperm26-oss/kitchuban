import * as THREE from 'three';
import { colliders } from './world.js';

const skinMat = new THREE.MeshStandardMaterial({ color: 0xc9a07a, roughness: 0.8 });
const tunicMats = [0x5a5a6a, 0x6b4a2a, 0x3d5a3a, 0x7a3a3a].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }));
const steelMat = new THREE.MeshStandardMaterial({ color: 0xb8bcc2, metalness: 0.9, roughness: 0.3 });
const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a2e15 });
const bloodMat = new THREE.MeshStandardMaterial({ color: 0x6a0d0d, transparent: true, opacity: 0.9 });

export class Enemy {
  constructor(scene, pos, type = 'rebel') {
    this.scene = scene;
    this.type = type;
    this.position = pos.clone();
    this.position.y = 0;
    this.velocity = new THREE.Vector3();
    this.maxHealth = type === 'brute' ? 120 : 50;
    this.health = this.maxHealth;
    this.speed = type === 'brute' ? 3.2 : 4.6;
    this.damage = type === 'brute' ? 28 : 14;
    this.reach = 2.1;
    this.attackTimer = 0;
    this.attackAnim = 0;
    this.dead = false;
    this.deadT = 0;
    this.hitFlash = 0;
    this.walk = Math.random() * 10;
    this.wander = new THREE.Vector3();
    this.wanderT = 0;
    this.yaw = 0;
    this._build();
  }

  _build() {
    const g = new THREE.Group();
    const s = this.type === 'brute' ? 1.25 : 1;
    const tunic = tunicMats[Math.floor(Math.random() * tunicMats.length)];
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * s, 0.32 * s, 0.75 * s, 10), tunic);
    torso.position.y = 1.15 * s; torso.castShadow = true;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17 * s, 12, 10), skinMat);
    head.position.y = 1.72 * s; head.castShadow = true;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.175 * s, 12, 8, 0, Math.PI * 2, 0, 1.4), new THREE.MeshStandardMaterial({ color: 0x2a1a0e }));
    hair.position.y = 1.74 * s;
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * s, 0.08 * s, 0.75 * s, 8), skinMat);
    legL.position.set(-0.13 * s, 0.4 * s, 0); legL.castShadow = true;
    const legR = legL.clone(); legR.position.x = 0.13 * s;
    const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * s, 0.06 * s, 0.6 * s, 8), skinMat);
    armL.position.set(-0.38 * s, 1.15 * s, 0); armL.castShadow = true;
    const armR = armL.clone(); armR.position.x = 0.38 * s;
    // weapon in right hand: spear for brutes, sword otherwise
    const weapon = new THREE.Group();
    if (this.type === 'brute') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), woodMat);
      const head2 = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35, 6), steelMat); head2.position.y = 1.35;
      weapon.add(shaft, head2);
      weapon.position.set(0.5 * s, 1.0 * s, 0.1);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.7, 0.015), steelMat); blade.position.y = 0.45;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.2, 6), woodMat);
      weapon.add(blade, grip);
      weapon.position.set(0.42 * s, 0.85 * s, 0.05);
    }
    // wooden buckler on left
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.3 * s, 0.04, 14), woodMat);
    shield.rotation.z = Math.PI / 2; shield.position.set(-0.45 * s, 1.1 * s, 0.1);
    g.add(torso, head, hair, legL, legR, armL, armR, weapon, shield);
    this.parts = { legL, legR, armL, armR, weapon, torso, head };
    this.group = g;
    this.scale = s;
    g.position.copy(this.position);
    this.scene.add(g);
  }

  takeDamage(amount, knockDir) {
    if (this.dead) return;
    this.health -= amount;
    this.hitFlash = 0.15;
    if (knockDir) this.velocity.add(knockDir.clone().setY(0).normalize().multiplyScalar(this.type === 'brute' ? 3 : 6));
    if (this.health <= 0) {
      this.dead = true;
      this.deadT = 0;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.7 * this.scale, 12), bloodMat);
      pool.rotation.x = -Math.PI / 2; pool.position.set(this.position.x, 0.02, this.position.z);
      this.scene.add(pool);
      this.pool = pool;
    }
  }

  /** returns damage dealt event {damage, dir} or null */
  update(dt, player, others) {
    if (this.dead) {
      this.deadT += dt;
      this.group.rotation.x = Math.min(Math.PI / 2, this.deadT * 4);
      this.group.position.y = -Math.max(0, this.deadT - 3) * 0.5;
      if (this.deadT > 6) { this.scene.remove(this.group); this.removed = true; }
      return null;
    }
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.group.traverse(o => { if (o.isMesh) o.material.emissive?.setHex(this.hitFlash > 0 ? 0x661111 : 0x000000); });
      if (this.hitFlash <= 0) this.group.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissive.setHex(0); });
    }

    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position).setY(0);
    const dist = toPlayer.length();
    let desire = new THREE.Vector3();
    let result = null;

    if (dist < 45) {
      // chase
      if (dist > this.reach * 0.85) desire.copy(toPlayer).normalize().multiplyScalar(this.speed);
      this.yaw = Math.atan2(toPlayer.x, toPlayer.z);
      // attack
      this.attackTimer -= dt;
      if (dist < this.reach && this.attackTimer <= 0) {
        this.attackTimer = this.type === 'brute' ? 1.8 : 1.2;
        this.attackAnim = 0.001;
        this.pendingHit = true;
      }
    } else {
      // wander
      this.wanderT -= dt;
      if (this.wanderT <= 0) { this.wanderT = 2 + Math.random() * 3; this.wander.set(Math.random() - 0.5, 0, Math.random() - 0.5).normalize().multiplyScalar(this.speed * 0.4 * (Math.random() < 0.6 ? 1 : 0)); }
      desire.copy(this.wander);
      if (desire.lengthSq() > 0) this.yaw = Math.atan2(desire.x, desire.z);
    }

    // separation from other enemies
    for (const o of others) {
      if (o === this || o.dead) continue;
      const d = new THREE.Vector3().subVectors(this.position, o.position).setY(0);
      const l = d.length();
      if (l < 1.2 && l > 0.001) desire.add(d.normalize().multiplyScalar((1.2 - l) * 6));
    }

    this.velocity.x += (desire.x - this.velocity.x) * Math.min(1, dt * 6);
    this.velocity.z += (desire.z - this.velocity.z) * Math.min(1, dt * 6);
    this._moveAxis('x', this.velocity.x * dt);
    this._moveAxis('z', this.velocity.z * dt);
    this.position.x = Math.max(-77, Math.min(77, this.position.x));
    this.position.z = Math.max(-57, Math.min(57, this.position.z));

    // attack animation and hit resolution mid-swing
    if (this.attackAnim > 0) {
      this.attackAnim += dt / 0.45;
      const t = Math.min(1, this.attackAnim);
      const k = Math.sin(t * Math.PI);
      this.parts.armR.rotation.x = -k * 1.8;
      this.parts.weapon.rotation.x = -k * 1.8;
      this.parts.weapon.position.z = 0.05 + k * 0.6 * this.scale;
      if (t > 0.5 && this.pendingHit) {
        this.pendingHit = false;
        const d2 = new THREE.Vector3().subVectors(player.position, this.position).setY(0).length();
        if (d2 < this.reach + 0.4) result = { damage: this.damage, dir: toPlayer.clone().normalize() };
      }
      if (t >= 1) { this.attackAnim = 0; this.parts.armR.rotation.x = 0; this.parts.weapon.rotation.x = 0; this.parts.weapon.position.z = 0.05; }
    }

    // walk animation
    const sp = Math.hypot(this.velocity.x, this.velocity.z);
    this.walk += dt * sp * 2.2;
    const swing = Math.sin(this.walk) * Math.min(1, sp / 3) * 0.6;
    this.parts.legL.rotation.x = swing; this.parts.legR.rotation.x = -swing;
    this.parts.armL.rotation.x = -swing * 0.7;
    if (this.attackAnim === 0) this.parts.armR.rotation.x = swing * 0.7;

    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
    return result;
  }

  _box(pos = this.position) {
    const r = 0.35 * this.scale;
    return new THREE.Box3(new THREE.Vector3(pos.x - r, 0.3, pos.z - r), new THREE.Vector3(pos.x + r, 1.8 * this.scale, pos.z + r));
  }
  _moveAxis(axis, delta) {
    if (delta === 0) return;
    this.position[axis] += delta;
    const box = this._box();
    for (const b of colliders) {
      if (box.intersectsBox(b)) {
        if (b.max.y < 0.6) continue;
        this.position[axis] -= delta;
        this.velocity[axis] *= -0.3;
        // slide: nudge perpendicular so they don't get stuck on corners
        const other = axis === 'x' ? 'z' : 'x';
        this.velocity[other] += (Math.random() - 0.5) * 2;
        return;
      }
    }
  }
}

export class Pilum {
  constructor(scene, origin, dir) {
    this.scene = scene;
    this.position = origin.clone();
    this.velocity = dir.clone().multiplyScalar(28);
    this.life = 0;
    this.stuck = false;
    const g = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 1.9, 6), woodMat);
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.6, 6), steelMat); shank.position.y = 1.2;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.15, 6), steelMat); tip.position.y = 1.55;
    g.add(shaft, shank, tip);
    g.rotation.x = Math.PI / 2; // align +y to +z
    this.inner = g;
    this.mesh = new THREE.Group(); this.mesh.add(g);
    this.mesh.position.copy(this.position);
    scene.add(this.mesh);
  }
  update(dt, enemies) {
    this.life += dt;
    if (this.stuck) { if (this.life > 8) { this.scene.remove(this.mesh); this.removed = true; } return null; }
    this.velocity.y -= 12 * dt;
    this.position.addScaledVector(this.velocity, dt);
    this.mesh.position.copy(this.position);
    this.mesh.lookAt(this.position.clone().add(this.velocity));
    if (this.position.y < 0.1) { this.stuck = true; this.position.y = 0.1; return null; }
    for (const b of colliders) if (b.containsPoint(this.position)) { this.stuck = true; return null; }
    for (const e of enemies) {
      if (e.dead) continue;
      if (e._box().containsPoint(this.position)) {
        this.scene.remove(this.mesh); this.removed = true;
        return e;
      }
    }
    return null;
  }
}
