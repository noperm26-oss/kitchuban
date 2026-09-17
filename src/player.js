import * as THREE from 'three';
import { colliders } from './world.js';

const PLAYER_RADIUS = 0.5;
const PLAYER_HEIGHT = 1.75;

export class Player {
  constructor(camera, domElement) {
    this.camera = camera;
    this.dom = domElement;
    this.position = new THREE.Vector3(0, PLAYER_HEIGHT, 40);
    this.velocity = new THREE.Vector3();
    this.yaw = 0; // facing north (-z, toward the temple)
    this.pitch = 0;
    this.keys = {};
    this.onGround = true;
    this.health = 100;
    this.maxHealth = 100;
    this.stamina = 100;
    this.blocking = false;
    this.pila = 3;
    this.locked = false;

    // attack state
    this.attackT = 0;       // >0 while swinging
    this.attackCooldown = 0;
    this.attackDidHit = false;
    this.bob = 0;

    this._buildViewmodel();
    this._bind();
  }

  _buildViewmodel() {
    this.rig = new THREE.Group();
    this.camera.add(this.rig);

    // Gladius: blade + guard + grip
    const gladius = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.62, 0.012), new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 0.9, roughness: 0.25 }));
    blade.position.y = 0.42;
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.12, 4), blade.material);
    tip.position.y = 0.79; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.4;
    const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.06), new THREE.MeshStandardMaterial({ color: 0x8c6b2f, metalness: 0.7 }));
    guard.position.y = 0.11;
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.16, 8), new THREE.MeshStandardMaterial({ color: 0x4a2e15 }));
    grip.position.y = 0.02;
    const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 8), guard.material);
    pommel.position.y = -0.07;
    gladius.add(blade, tip, guard, grip, pommel);
    gladius.position.set(0.32, -0.32, -0.55);
    gladius.rotation.set(-0.25, -0.1, -0.35);
    this.gladius = gladius;
    this.rig.add(gladius);

    // Scutum (shield) held on the left
    const scutum = new THREE.Group();
    const face = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.42, 20, 1, true, -0.55, 1.1), new THREE.MeshStandardMaterial({ color: 0xa8281f, side: THREE.DoubleSide, roughness: 0.7 }));
    face.rotation.z = Math.PI / 2; face.rotation.y = Math.PI / 2;
    face.scale.set(1.6, 1, 1);
    const boss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 12), new THREE.MeshStandardMaterial({ color: 0xc9a54a, metalness: 0.8 }));
    boss.position.z = -0.03;
    const wing1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.01), boss.material); wing1.position.set(0.14, 0.15, -0.02); wing1.rotation.z = 0.5;
    const wing2 = wing1.clone(); wing2.position.x = -0.14; wing2.rotation.z = -0.5;
    scutum.add(face, boss, wing1, wing2);
    scutum.position.set(-0.42, -0.35, -0.7);
    scutum.rotation.set(0, 0.35, 0);
    this.scutum = scutum;
    this.scutumRest = scutum.position.clone();
    this.scutumBlock = new THREE.Vector3(-0.05, -0.15, -0.55);
    this.rig.add(scutum);
  }

  _bind() {
    document.addEventListener('keydown', e => { this.keys[e.code] = true; if (e.code === 'KeyF') this.wantThrow = true; });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', e => {
      if (!this.locked) return;
      this.yaw -= e.movementX * 0.0022;
      this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
    });
    document.addEventListener('mousedown', e => {
      if (!this.locked) return;
      if (e.button === 0) this.wantAttack = true;
      if (e.button === 2) this.blocking = true;
    });
    document.addEventListener('mouseup', e => { if (e.button === 2) this.blocking = false; });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  get forward() {
    return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
  }

  update(dt) {
    const speedBase = 6;
    const sprinting = this.keys['ShiftLeft'] && this.stamina > 0 && !this.blocking;
    const speed = sprinting ? 10 : (this.blocking ? 3.5 : speedBase);

    const fwd = this.forward;
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(fwd);
    if (this.keys['KeyS']) move.sub(fwd);
    if (this.keys['KeyD']) move.add(right);
    if (this.keys['KeyA']) move.sub(right);
    const moving = move.lengthSq() > 0;
    if (moving) move.normalize().multiplyScalar(speed);

    // smooth accel
    this.velocity.x += (move.x - this.velocity.x) * Math.min(1, dt * 12);
    this.velocity.z += (move.z - this.velocity.z) * Math.min(1, dt * 12);

    // stamina
    if (sprinting && moving) this.stamina = Math.max(0, this.stamina - 22 * dt);
    else this.stamina = Math.min(100, this.stamina + 15 * dt);

    // jump / gravity
    if (this.keys['Space'] && this.onGround) { this.velocity.y = 6.5; this.onGround = false; }
    this.velocity.y -= 18 * dt;

    // Move with axis-separated collision
    this._moveAxis('x', this.velocity.x * dt);
    this._moveAxis('z', this.velocity.z * dt);
    this.position.y += this.velocity.y * dt;
    if (this.position.y <= PLAYER_HEIGHT) { this.position.y = PLAYER_HEIGHT; this.velocity.y = 0; this.onGround = true; }
    // standing on low objects
    const feet = this._feetBox();
    for (const b of colliders) {
      if (feet.intersectsBox(b) && this.velocity.y <= 0) {
        const topY = b.max.y + PLAYER_HEIGHT;
        if (this.position.y - topY < 0.6 && this.position.y - topY > -0.4 && b.max.y < 2.2) {
          this.position.y = topY; this.velocity.y = 0; this.onGround = true;
        }
      }
    }

    // world bounds
    this.position.x = Math.max(-78, Math.min(78, this.position.x));
    this.position.z = Math.max(-58, Math.min(58, this.position.z));

    // camera
    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0, 'YXZ');
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;

    // head bob + view model animation
    if (moving && this.onGround) this.bob += dt * (sprinting ? 13 : 9);
    const bobY = Math.sin(this.bob) * 0.02 * (moving ? 1 : 0);
    const bobX = Math.cos(this.bob * 0.5) * 0.015 * (moving ? 1 : 0);
    this.rig.position.set(bobX, bobY, 0);

    // shield
    const target = this.blocking ? this.scutumBlock : this.scutumRest;
    this.scutum.position.lerp(target, Math.min(1, dt * 14));
    this.scutum.rotation.y += ((this.blocking ? 0.05 : 0.35) - this.scutum.rotation.y) * Math.min(1, dt * 14);

    // attack animation
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    if (this.wantAttack && this.attackCooldown === 0 && !this.blocking && this.stamina > 8) {
      this.attackT = 0.001; this.attackCooldown = 0.55; this.attackDidHit = false; this.stamina -= 8;
    }
    this.wantAttack = false;
    if (this.attackT > 0) {
      this.attackT += dt / 0.4;
      const t = Math.min(1, this.attackT);
      // wind up then thrust forward (Roman style stab)
      const k = t < 0.3 ? -t / 0.3 * 0.15 : Math.sin((t - 0.3) / 0.7 * Math.PI) * 0.55;
      this.gladius.position.set(0.32 - k * 0.3, -0.32 + k * 0.1, -0.55 - k);
      this.gladius.rotation.set(-0.25 - k * 1.6, -0.1, -0.35 + k * 0.4);
      if (t >= 1) { this.attackT = 0; this.gladius.position.set(0.32, -0.32, -0.55); this.gladius.rotation.set(-0.25, -0.1, -0.35); }
    }
  }

  /** returns true once, during the active hit-window of a swing */
  consumeHitWindow() {
    if (this.attackT > 0.45 && this.attackT < 0.8 && !this.attackDidHit) { this.attackDidHit = true; return true; }
    return false;
  }

  consumeThrow() {
    if (this.wantThrow) { this.wantThrow = false; if (this.pila > 0) { this.pila--; return true; } }
    return false;
  }

  takeDamage(amount, fromDir) {
    // block if facing the attacker
    if (this.blocking && fromDir) {
      const dot = this.forward.dot(fromDir.clone().negate().setY(0).normalize());
      if (dot > 0.35) { this.stamina = Math.max(0, this.stamina - 12); return 'blocked'; }
    }
    this.health = Math.max(0, this.health - amount);
    return 'hit';
  }

  _box(pos = this.position) {
    return new THREE.Box3(
      new THREE.Vector3(pos.x - PLAYER_RADIUS, pos.y - PLAYER_HEIGHT + 0.35, pos.z - PLAYER_RADIUS),
      new THREE.Vector3(pos.x + PLAYER_RADIUS, pos.y + 0.1, pos.z + PLAYER_RADIUS));
  }
  _feetBox() {
    return new THREE.Box3(
      new THREE.Vector3(this.position.x - PLAYER_RADIUS, this.position.y - PLAYER_HEIGHT - 0.1, this.position.z - PLAYER_RADIUS),
      new THREE.Vector3(this.position.x + PLAYER_RADIUS, this.position.y - PLAYER_HEIGHT + 0.3, this.position.z + PLAYER_RADIUS));
  }
  _moveAxis(axis, delta) {
    if (delta === 0) return;
    this.position[axis] += delta;
    const box = this._box();
    for (const b of colliders) {
      if (box.intersectsBox(b)) {
        // allow stepping onto low things
        if (b.max.y < this.position.y - PLAYER_HEIGHT + 0.6) continue;
        this.position[axis] -= delta;
        this.velocity[axis] = 0;
        return;
      }
    }
  }
}
