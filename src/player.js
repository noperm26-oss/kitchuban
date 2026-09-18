import * as THREE from 'three';
import { colliders } from './world.js';
import { MAT } from './materials.js';

const PLAYER_RADIUS = 0.5;
const PLAYER_HEIGHT = 1.75;

export const PLAYER_ROLES = {
  legionary: { name: 'Legionary', desc: 'Miles Legionis — Balanced heavy infantry. Gladius + Scutum + 3 Pila.', hp: 100, stamina: 100, pila: 3, speed: 6, sprint: 10, shield: 'scutum', weapon: 'gladius', color: 0xa8281f, faction: 'legio' },
  praetorian: { name: 'Praetorian Guard', desc: 'Praetoriani — Elite guard. 130 HP, ornate armor, 2 Pila, superior block.', hp: 130, stamina: 110, pila: 2, speed: 5.5, sprint: 9, shield: 'praetorian', weapon: 'gladius', color: 0x1a1a2a, faction: 'praetorian' },
  velite: { name: 'Velite', desc: 'Velites — Light skirmisher. 80 HP, 6 Pila, small Parma, very fast.', hp: 80, stamina: 130, pila: 6, speed: 7.2, sprint: 12.5, shield: 'parma', weapon: 'gladius', color: 0x3d5a3a, faction: 'legio' },
  centurion: { name: 'Centurion', desc: 'Centurio — Commander. 150 HP, transverse crest, vine staff, inspires nearby.', hp: 150, stamina: 120, pila: 2, speed: 6.2, sprint: 10.5, shield: 'centurion', weapon: 'gladius', color: 0x8a1a1a, faction: 'emperor' },
  sagittarius: { name: 'Sagittarius', desc: 'Sagittarius — Archer. 70 HP, bow + 20 arrows + gladius, light armor.', hp: 70, stamina: 115, pila: 20, speed: 6.8, sprint: 11.5, shield: 'none', weapon: 'bow', color: 0x5a5a3a, faction: 'legio' },
  rebel: { name: 'Rebel', desc: 'Hostis — Enemy defector. 90 HP, fast attacks, buckler, 1 Pilum.', hp: 90, stamina: 125, pila: 1, speed: 6.8, sprint: 12, shield: 'buckler', weapon: 'gladius', color: 0x7a3a3a, faction: 'rebels' },
};

// Find a standing spot that is not inside any solid collider. Buildings are
// solid boxes, so spawning inside one used to leave the player unable to move.
export function findFreeSpot(x, z, y = PLAYER_HEIGHT, maxRadius = 40, step = 2.5) {
  const probe = (px, pz) => {
    const box = new THREE.Box3(
      new THREE.Vector3(px - PLAYER_RADIUS, y - PLAYER_HEIGHT + 0.35, pz - PLAYER_RADIUS),
      new THREE.Vector3(px + PLAYER_RADIUS, y + 0.1, pz + PLAYER_RADIUS));
    for (const b of colliders) if (box.intersectsBox(b)) return false;
    return true;
  };
  if (probe(x, z)) return new THREE.Vector3(x, y, z);
  for (let r = step; r <= maxRadius; r += step) {
    for (let a = 0; a < 12; a++) {
      const ang = (a / 12) * Math.PI * 2 + r * 0.7;
      const px = x + Math.cos(ang) * r, pz = z + Math.sin(ang) * r;
      if (probe(px, pz)) return new THREE.Vector3(px, y, pz);
    }
  }
  return new THREE.Vector3(x, y, z);
}

function lerp(a, b, t) { return a + (b - a) * t; }
function lerpVec3(v1, v2, t, out) { out.x = lerp(v1.x, v2.x, t); out.y = lerp(v1.y, v2.y, t); out.z = lerp(v1.z, v2.z, t); return out; }
function lerpEuler(e1, e2, t, out) { out.x = lerp(e1.x, e2.x, t); out.y = lerp(e1.y, e2.y, t); out.z = lerp(e1.z, e2.z, t); return out; }

export class Player {
  constructor(camera, domElement) {
    this.camera = camera; this.dom = domElement;
    this.position = findFreeSpot(0, 50);
    this.velocity = new THREE.Vector3();
    this.yaw = 0; this.pitch = 0;
    this.keys = {}; this.onGround = true;
    this.role = 'legionary'; this.applyRole('legionary');
    this.blocking = false; this.locked = false;
    // Mouse-look fallback for windows where pointer lock is not available
    // (for example an iframe without allow="pointer-lock"): the game stays playable.
    this.lookFallback = false;

    // Animation timers
    this.attackT = 0; this.attackCooldown = 0; this.attackDidHit = false;
    this.bob = 0; this.breath = 0;
    this.combo = 0; this.comboTimer = 0;
    this.parryWindow = 0; this.parryActive = false;
    this.dodgeT = 0; this.dodgeDir = new THREE.Vector3();
    this.bashCooldown = 0; this.bashT = 0;
    this.shootCooldown = 0;
    this.reloadT = 0; // for pilum/bow reloading
    this.hitT = 0; // hit reaction
    this.jumpT = 0;
    this.landT = 0;

    this.wantThrow = false; this.wantAttack = false; this.wantBash = false; this.wantDodge = false;

    this._buildViewmodel(); this._bind();
  }

  applyRole(roleId) {
    const r = PLAYER_ROLES[roleId] || PLAYER_ROLES.legionary;
    this.role = roleId; this.roleData = r;
    this.faction = r.faction || 'legio';
    this.maxHealth = r.hp; this.health = r.hp;
    this.maxStamina = r.stamina; this.stamina = r.stamina;
    this.pila = r.pila; this.baseSpeed = r.speed; this.sprintSpeed = r.sprint;
    if (this.rig) this._rebuildViewmodel();
  }

  _buildViewmodel() {
    if (this.rig) this.camera.remove(this.rig);
    this.rig = new THREE.Group(); this.camera.add(this.rig);
    this._rebuildViewmodel();
  }

  _rebuildViewmodel() {
    while (this.rig.children.length) this.rig.remove(this.rig.children[0]);
    const role = this.roleData || PLAYER_ROLES.legionary;
    const skinMat = MAT.skin;
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x5a2e15, roughness: 0.85 });
    const steelMat = MAT.iron; const bronzeMat = MAT.bronze; const goldMat = MAT.gold;

    // Right arm
    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, -0.32, -0.55); rightArm.rotation.set(-0.25, -0.1, -0.35);
    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.32, 6, 12), skinMat); forearm.position.set(0, -0.18, 0.02); forearm.castShadow = true; rightArm.add(forearm);
    const bracer = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.22, 10), leatherMat); bracer.position.set(0, -0.18, 0.02); rightArm.add(bracer);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), skinMat); hand.position.set(0, -0.38, 0.04); hand.scale.set(1, 0.8, 1.2); rightArm.add(hand);
    for (let i = 0; i < 4; i++) { const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.07, 4, 6), skinMat); finger.position.set(0.02 + i * 0.015 - 0.022, -0.38, 0.08 + i * 0.005); finger.rotation.x = 0.6; finger.rotation.z = -0.2; rightArm.add(finger); }

    const weaponGroup = new THREE.Group(); weaponGroup.position.set(0, 0.08, 0.08);
    if (role.weapon === 'bow') {
      // Detailed bow
      const bowGroup = new THREE.Group();
      const topLimb = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.022, 0.75, 8), MAT.woodDark); topLimb.position.set(0, 0.38, 0); topLimb.rotation.z = 0.12; topLimb.castShadow = true; bowGroup.add(topLimb);
      const bottomLimb = topLimb.clone(); bottomLimb.position.y = -0.38; bottomLimb.rotation.z = -0.12; bowGroup.add(bottomLimb);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, 0.20, 10), leatherMat); bowGroup.add(grip);
      // string - two segments
      const stringTop = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.82, 4), new THREE.MeshStandardMaterial({ color: 0xeeeeee })); stringTop.position.set(0.10, 0.38, 0); stringTop.rotation.z = -0.12; bowGroup.add(stringTop);
      const stringBottom = stringTop.clone(); stringBottom.position.y = -0.38; stringBottom.rotation.z = 0.12; bowGroup.add(stringBottom);
      const stringMid = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.12, 4), new THREE.MeshStandardMaterial({ color: 0xffffff })); stringMid.position.set(0.14, 0, 0); bowGroup.add(stringMid);
      this.bowStringTop = stringTop; this.bowStringBottom = stringBottom; this.bowStringMid = stringMid;
      // arrow nocked
      const arrow = new THREE.Group();
      const aShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.78, 6), MAT.woodDark); arrow.add(aShaft);
      const aHead = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 6), steelMat); aHead.position.y = 0.42; arrow.add(aHead);
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.14, 0.02), new THREE.MeshStandardMaterial({ color: 0xb03030 })); fletch.position.y = -0.32; arrow.add(fletch);
      arrow.position.set(0.14, 0, 0.04); arrow.rotation.x = Math.PI / 2; bowGroup.add(arrow);
      this.bowArrow = arrow;
      weaponGroup.add(bowGroup);
      this.bowGroup = bowGroup;
      // side gladius for archer (on hip)
      const hipGladius = new THREE.Group(); hipGladius.position.set(-0.25, -0.55, -0.2); hipGladius.rotation.set(0.2, 0, -0.5);
      const hgBlade = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 0.01), steelMat); hgBlade.position.y = 0.25; hipGladius.add(hgBlade);
      rightArm.add(hipGladius);
    } else {
      // Gladius detailed
      const bladeShape = new THREE.Shape();
      bladeShape.moveTo(-0.025, 0); bladeShape.lineTo(0.025, 0); bladeShape.lineTo(0.022, 0.52); bladeShape.lineTo(0, 0.64); bladeShape.lineTo(-0.022, 0.52); bladeShape.lineTo(-0.025, 0);
      const bladeExtrude = new THREE.ExtrudeGeometry(bladeShape, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.001, bevelSegments: 2 });
      const blade = new THREE.Mesh(bladeExtrude, steelMat); blade.position.z = -0.003; blade.castShadow = true; weaponGroup.add(blade);
      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.45, 0.007), new THREE.MeshStandardMaterial({ color: 0x7a8a9a, metalness: 0.8, roughness: 0.4 })); fuller.position.set(0, 0.28, 0.004); weaponGroup.add(fuller);
      const edgeMat = new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 0.95, roughness: 0.15 });
      const leftEdge = new THREE.Mesh(new THREE.BoxGeometry(0.003, 0.62, 0.003), edgeMat); leftEdge.position.set(-0.024, 0.31, 0); weaponGroup.add(leftEdge);
      const rightEdge = leftEdge.clone(); rightEdge.position.x = 0.024; weaponGroup.add(rightEdge);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.07), bronzeMat); guard.position.y = 0.02; guard.castShadow = true; weaponGroup.add(guard);
      for (let s of [-1, 1]) { const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 6), goldMat); rivet.position.set(s * 0.05, 0.02, 0.02); weaponGroup.add(rivet); }
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.18, 12), leatherMat); grip.position.y = -0.07; weaponGroup.add(grip);
      for (let i = 0; i < 6; i++) { const wire = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.003, 4, 12), bronzeMat); wire.rotation.x = Math.PI / 2; wire.position.y = -0.13 + i * 0.022; weaponGroup.add(wire); }
      const pommelBase = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), bronzeMat); pommelBase.position.y = -0.18; weaponGroup.add(pommelBase);
      const pommelTop = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), goldMat); pommelTop.position.y = -0.20; weaponGroup.add(pommelTop);
    }
    rightArm.add(weaponGroup);
    this.weaponGroup = weaponGroup; this.rightArm = rightArm; this.rig.add(rightArm);

    // Left arm + shield
    const leftArm = new THREE.Group(); leftArm.position.set(-0.42, -0.35, -0.7); leftArm.rotation.set(0, 0.35, 0);
    const leftForearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.32, 6, 12), skinMat); leftForearm.position.set(0.08, -0.12, 0.12); leftForearm.rotation.set(0.2, -0.4, -0.15); leftArm.add(leftForearm);
    const leftBracer = new THREE.Mesh(new THREE.CylinderGeometry(0.076, 0.081, 0.24, 10), leatherMat); leftBracer.position.copy(leftForearm.position); leftBracer.rotation.copy(leftForearm.rotation); leftArm.add(leftBracer);
    const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), skinMat); leftHand.position.set(0.18, -0.18, 0.22); leftHand.scale.set(1, 0.85, 1.1); leftArm.add(leftHand);

    const shieldGroup = new THREE.Group(); shieldGroup.position.set(0.22, -0.05, 0.15);
    if (role.shield !== 'none') {
      let shieldGeo, shieldMat, shieldScale = 1.35;
      if (role.shield === 'parma') {
        shieldGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.04, 20); shieldMat = new THREE.MeshStandardMaterial({ color: 0x8a7a5a, roughness: 0.7 }); shieldScale = 1;
        const m = new THREE.Mesh(shieldGeo, shieldMat); m.rotation.x = Math.PI / 2; m.castShadow = true; shieldGroup.add(m);
      } else if (role.shield === 'buckler') {
        shieldGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 16); shieldMat = MAT.woodDark; const m = new THREE.Mesh(shieldGeo, shieldMat); m.rotation.x = Math.PI / 2; m.castShadow = true; shieldGroup.add(m);
      } else {
        shieldGeo = new THREE.CylinderGeometry(0.72, 0.72, 0.95, 24, 1, true, -0.6, 1.2);
        if (role.shield === 'praetorian') shieldMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2a, roughness: 0.6, metalness: 0.2 });
        else shieldMat = MAT.scutum;
        const scutumMesh = new THREE.Mesh(shieldGeo, shieldMat); scutumMesh.rotation.z = Math.PI / 2; scutumMesh.rotation.y = Math.PI / 2; scutumMesh.scale.set(shieldScale, 1, 1); scutumMesh.castShadow = true; shieldGroup.add(scutumMesh);
        for (let i = -2; i <= 2; i++) { const plank = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.92, 0.14), MAT.wood); plank.position.set(0.02, i * 0.18, 0); plank.rotation.y = i * 0.05; shieldGroup.add(plank); }
        const edgeTop = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.1), bronzeMat); edgeTop.position.set(0, 0.48, 0); shieldGroup.add(edgeTop);
        const edgeBottom = edgeTop.clone(); edgeBottom.position.y = -0.48; shieldGroup.add(edgeBottom);
      }
      const bossBase = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 0.04, 16), bronzeMat); bossBase.rotation.x = Math.PI / 2; bossBase.position.set(0, 0, -0.06); shieldGroup.add(bossBase);
      const bossDome = new THREE.Mesh(new THREE.SphereGeometry(0.095, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), goldMat); bossDome.rotation.x = Math.PI; bossDome.position.set(0, 0, -0.08); shieldGroup.add(bossDome);
      const wingGeo = new THREE.BoxGeometry(0.18, 0.06, 0.015);
      const wingL = new THREE.Mesh(wingGeo, bronzeMat); wingL.position.set(-0.16, 0.12, -0.04); wingL.rotation.z = 0.55; shieldGroup.add(wingL);
      const wingR = wingL.clone(); wingR.position.x = 0.16; wingR.rotation.z = -0.55; shieldGroup.add(wingR);
      const handle = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.015, 6, 12, Math.PI), MAT.woodDark); handle.rotation.x = Math.PI / 2; handle.position.set(0.08, 0, 0.12); shieldGroup.add(handle);
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.7, 0.008), leatherMat); strap.position.set(0.08, 0, 0.1); shieldGroup.add(strap);
    }
    leftArm.add(shieldGroup);
    this.shieldGroup = shieldGroup; this.leftArm = leftArm; this.scutum = leftArm;
    this.scutumRest = leftArm.position.clone(); this.scutumBlock = new THREE.Vector3(-0.05, -0.15, -0.55);
    this.scutumRestRot = leftArm.rotation.clone(); this.scutumBlockRot = new THREE.Euler(0, 0.05, 0);
    this.rig.add(leftArm);

    // Back equipment for reloading animation
    const backEquip = new THREE.Group(); backEquip.position.set(-0.55, -0.6, -0.9); backEquip.rotation.set(0.2, 0, -0.3);
    if (role.weapon === 'bow') {
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.6, 12), leatherMat); quiver.position.y = 0.1; backEquip.add(quiver);
      for (let i = 0; i < 6; i++) { const arr = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), MAT.woodDark); arr.position.set((Math.random() - 0.5) * 0.08, 0.4 + i * 0.02, (Math.random() - 0.5) * 0.08); backEquip.add(arr); }
    } else {
      for (let i = 0; i < 3; i++) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 1.5, 8), MAT.woodDark); shaft.position.set(i * 0.04, 0.2 + i * 0.02, i * 0.02);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.14, 8), MAT.iron); tip.position.set(i * 0.04, 1.0 + i * 0.02, i * 0.02); backEquip.add(shaft, tip);
      }
    }
    this.backEquip = backEquip; this.rig.add(backEquip);

    // Save rest transforms for animation
    this.rightRestPos = rightArm.position.clone(); this.rightRestRot = rightArm.rotation.clone();
    this.leftRestPos = leftArm.position.clone(); this.leftRestRot = leftArm.rotation.clone();
  }

  _bind() {
    document.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.code === 'KeyF') this.wantThrow = true;
      if (e.code === 'KeyQ') this.wantBash = true;
      if (e.code === 'KeyV' || e.code === 'ControlLeft') this.wantDodge = true;
      if (e.code === 'KeyR') this.wantReload = true;
    });
    document.addEventListener('keyup', e => { this.keys[e.code] = false; });
    document.addEventListener('mousemove', e => {
      if (!this.canLook) return;
      this.yaw -= e.movementX * 0.0022; this.pitch -= e.movementY * 0.0022;
      this.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, this.pitch));
    });
    document.addEventListener('mousedown', e => {
      if (!this.canLook) return;
      if (e.button === 0) this.wantAttack = true;
      if (e.button === 2) this.blocking = true;
    });
    document.addEventListener('mouseup', e => { if (e.button === 2) { this.blocking = false; this.parryWindow = 0; } });
    document.addEventListener('contextmenu', e => e.preventDefault());
  }

  // Input only counts while the game is actually in control of the mouse: either
  // pointer-locked, or running with the mouse-look fallback.
  get canLook() { return this.locked || this.lookFallback; }
  setActive(active) {
    this.locked = active;
    if (!active) { this.lookFallback = false; this.blocking = false; this.parryWindow = 0; this.parryActive = false; }
  }
  setLookFallback(on) { this.lookFallback = on; }
  get forward() { return new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw)); }

  update(dt) {
    const role = this.roleData;
    const sprinting = this.keys['ShiftLeft'] && this.stamina > 0 && !this.blocking && this.dodgeT <= 0 && this.bashT <= 0 && this.reloadT <= 0 && this.attackT <= 0;
    let speed = sprinting ? role.sprint : (this.blocking ? 3.2 : role.speed);
    if (this.dodgeT > 0) speed = 12; if (this.bashT > 0) speed = 2; if (this.reloadT > 0) speed = 3.5;

    const fwd = this.forward; const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const move = new THREE.Vector3();
    if (this.keys['KeyW']) move.add(fwd); if (this.keys['KeyS']) move.sub(fwd);
    if (this.keys['KeyD']) move.add(right); if (this.keys['KeyA']) move.sub(right);
    const moving = move.lengthSq() > 0;
    if (moving) move.normalize().multiplyScalar(speed);

    if (this.dodgeT > 0) { move.copy(this.dodgeDir).multiplyScalar(11); this.dodgeT -= dt; if (this.dodgeT <= 0) { this.dodgeT = 0; this.velocity.set(0, 0, 0); } }

    this.velocity.x += (move.x - this.velocity.x) * Math.min(1, dt * (this.dodgeT > 0 ? 4 : 12));
    this.velocity.z += (move.z - this.velocity.z) * Math.min(1, dt * (this.dodgeT > 0 ? 4 : 12));

    if (sprinting && moving && this.dodgeT <= 0) this.stamina = Math.max(0, this.stamina - 20 * dt);
    else this.stamina = Math.min(this.maxStamina, this.stamina + 16 * dt);

    if (this.keys['Space'] && this.onGround && this.dodgeT <= 0 && this.bashT <= 0) {
      this.velocity.y = 6.8; this.onGround = false; this.jumpT = 0.35;
    }
    this.velocity.y -= 19 * dt;
    this._moveAxis('x', this.velocity.x * dt); this._moveAxis('z', this.velocity.z * dt);
    this.position.y += this.velocity.y * dt;
    if (this.position.y <= PLAYER_HEIGHT) {
      if (!this.onGround && this.velocity.y < -4) this.landT = 0.25;
      this.position.y = PLAYER_HEIGHT; this.velocity.y = 0; this.onGround = true;
    }
    const feet = this._feetBox();
    for (const b of colliders) {
      if (feet.intersectsBox(b) && this.velocity.y <= 0) {
        const topY = b.max.y + PLAYER_HEIGHT;
        if (this.position.y - topY < 0.65 && this.position.y - topY > -0.45 && b.max.y < 2.5) { this.position.y = topY; this.velocity.y = 0; this.onGround = true; }
      }
    }
    this.position.x = Math.max(-898, Math.min(898, this.position.x));
    this.position.z = Math.max(-698, Math.min(698, this.position.z));

    this.camera.position.copy(this.position);
    this.camera.rotation.set(0, 0, 0, 'YXZ'); this.camera.rotation.y = this.yaw; this.camera.rotation.x = this.pitch;

    // Bob & breath
    if (moving && this.onGround) this.bob += dt * (sprinting ? 14 : 9.5);
    this.breath += dt * 1.25;
    this.jumpT = Math.max(0, this.jumpT - dt);
    this.landT = Math.max(0, this.landT - dt);
    this.hitT = Math.max(0, this.hitT - dt);

    let bobY = Math.sin(this.bob) * 0.024 * (moving ? 1 : 0) + Math.sin(this.breath) * 0.007;
    let bobX = Math.cos(this.bob * 0.5) * 0.018 * (moving ? 1 : 0) + Math.cos(this.breath * 0.7) * 0.005;
    let bobZ = Math.sin(this.bob * 0.7) * 0.012 * (moving ? 1 : 0);
    if (this.jumpT > 0) bobY += this.jumpT * 0.3;
    if (this.landT > 0) bobY -= this.landT * 0.5;
    if (this.hitT > 0) { bobX += (Math.random() - 0.5) * this.hitT * 0.08; bobY += (Math.random() - 0.5) * this.hitT * 0.08; }
    if (this.dodgeT > 0) {
      const d = this.dodgeDir;
      const isForward = fwd.dot(d) > 0.5; const isBack = fwd.dot(d) < -0.5; const isRight = right.dot(d) > 0.5;
      bobY -= Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI) * 0.18;
      if (isRight) bobX += Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI) * 0.22; else if (!isForward && !isBack) bobX -= Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI) * 0.22;
      this.rig.rotation.z = isRight ? -0.35 * Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI) : 0.35 * Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI);
      this.rig.rotation.x = isForward ? -0.25 * Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI) : isBack ? 0.25 * Math.sin((0.32 - this.dodgeT) / 0.32 * Math.PI) : 0;
    } else { this.rig.rotation.z *= 0.9; this.rig.rotation.x *= 0.9; }
    this.rig.position.set(bobX, bobY, bobZ);

    // Shield animation
    if (this.bashT <= 0 && this.reloadT <= 0) {
      const targetPos = this.blocking ? this.scutumBlock : this.scutumRest;
      const targetRot = this.blocking ? this.scutumBlockRot : this.scutumRestRot;
      this.leftArm.position.lerp(targetPos, Math.min(1, dt * (this.blocking ? 18 : 12)));
      this.leftArm.rotation.x += (targetRot.x - this.leftArm.rotation.x) * Math.min(1, dt * 14);
      this.leftArm.rotation.y += (targetRot.y - this.leftArm.rotation.y) * Math.min(1, dt * 14);
      this.leftArm.rotation.z += (targetRot.z - this.leftArm.rotation.z) * Math.min(1, dt * 14);
    }

    if (!this.blocking && this.attackT <= 0 && this.bashT <= 0 && this.reloadT <= 0 && this.dodgeT <= 0) {
      this.rightArm.rotation.z = -0.35 + Math.sin(this.bob) * 0.06 * (moving ? 1 : 0);
    }

    // Parry window
    if (this.blocking) { this.parryWindow += dt; this.parryActive = this.parryWindow < 0.25; } else { this.parryWindow = 0; this.parryActive = false; }

    // Timers
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.comboTimer = Math.max(0, this.comboTimer - dt);
    if (this.comboTimer === 0) this.combo = 0;
    this.bashCooldown = Math.max(0, this.bashCooldown - dt);
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.reloadT = Math.max(0, this.reloadT - dt);
    if (this.bashT > 0) this._updateBashAnim(dt);
    if (this.reloadT > 0) this._updateReloadAnim(dt);
    if (this.wantBash && this.bashCooldown === 0 && this.stamina > 18 && !this.blocking && this.attackT <= 0 && this.reloadT <= 0) {
      this.bashT = 0.48; this.bashCooldown = 1.2; this.stamina -= 18; this.wantBash = false;
    }
    if (this.wantDodge && this.dodgeT <= 0 && this.stamina > 22 && this.attackT <= 0) {
      const dir = new THREE.Vector3(); if (this.keys['KeyW']) dir.add(fwd); if (this.keys['KeyS']) dir.sub(fwd); if (this.keys['KeyD']) dir.add(right); if (this.keys['KeyA']) dir.sub(right);
      if (dir.lengthSq() === 0) dir.copy(fwd).negate(); dir.normalize(); this.dodgeDir.copy(dir); this.dodgeT = 0.38; this.stamina -= 22; this.wantDodge = false;
    }
    this.wantBash = false; this.wantDodge = false;

    // Attack start
    if (this.wantAttack && this.attackCooldown === 0 && !this.blocking && this.bashT <= 0 && this.dodgeT <= 0 && this.reloadT <= 0 && this.stamina > 7) {
      this.attackT = 0.001; this.attackCooldown = role.weapon === 'bow' ? 0.75 : 0.55; this.attackDidHit = false; this.stamina -= role.weapon === 'bow' ? 6 : 8;
      this.combo = (this.combo % 3) + 1; this.comboTimer = 2.5;
    }
    this.wantAttack = false;
    if (this.attackT > 0) this._updateAttackAnim(dt);

    // Throw / shoot
    if (this.wantThrow && this.pila > 0 && this.shootCooldown === 0 && this.attackT <= 0 && this.bashT <= 0 && this.dodgeT <= 0 && this.reloadT <= 0) {
      // start throw/shoot anim, actual projectile spawned at mid anim via consumeThrow
      if (role.weapon === 'bow') this.attackT = 0.001; // bow uses attackT for draw
      else { this.attackT = 0.001; this.combo = 0; } // pilum throw uses attackT too, but separate
      this.wantThrow = false; this._pendingThrow = true;
    } else this.wantThrow = false;

    this.backEquip.visible = this.pila > 0;
    this.backEquip.rotation.z = -0.3 + Math.sin(this.bob) * 0.08 * (moving ? 1 : 0);
  }

  _updateAttackAnim(dt) {
    const role = this.roleData;
    this.attackT += dt / (role.weapon === 'bow' ? 0.65 : 0.48);
    const t = Math.min(1, this.attackT);
    const restPos = this.rightRestPos; const restRot = this.rightRestRot;

    if (role.weapon === 'bow') {
      // Bow draw and release - detailed
      if (t < 0.35) {
        // draw: left forward, right back to cheek
        const p = t / 0.35;
        const leftTargetPos = new THREE.Vector3(-0.15, -0.25, -0.95);
        const leftTargetRot = new THREE.Euler(0.1, -0.4, 0.1);
        const rightTargetPos = new THREE.Vector3(0.12, -0.18, -0.25);
        const rightTargetRot = new THREE.Euler(-0.1, -0.6, -0.2);
        lerpVec3(restPos, rightTargetPos, p, this.rightArm.position);
        lerpEuler(restRot, rightTargetRot, p, this.rightArm.rotation);
        lerpVec3(this.scutumRest, leftTargetPos, p, this.leftArm.position);
        lerpEuler(this.scutumRestRot, leftTargetRot, p, this.leftArm.rotation);
        // bow string stretch
        if (this.bowStringMid) {
          this.bowStringMid.position.x = lerp(0.14, 0.02, p);
          this.bowArrow.position.x = lerp(0.14, 0.02, p);
          this.bowArrow.visible = true;
        }
      } else if (t < 0.55) {
        // hold full draw
        this.rightArm.position.set(0.12, -0.18, -0.25); this.rightArm.rotation.set(-0.1, -0.6, -0.2);
        this.leftArm.position.set(-0.15, -0.25, -0.95); this.leftArm.rotation.set(0.1, -0.4, 0.1);
      } else if (t < 0.65) {
        // release snap
        const p = (t - 0.55) / 0.10;
        this.rightArm.position.set(lerp(0.12, 0.28, p), -0.18, lerp(-0.25, -0.45, p));
        if (this.bowStringMid) { this.bowStringMid.position.x = lerp(0.02, 0.14, p); }
        this.bowArrow.visible = p > 0.5 ? false : true;
      } else {
        // recover + start reload
        const p = (t - 0.65) / 0.35;
        lerpVec3(new THREE.Vector3(0.28, -0.18, -0.45), restPos, p, this.rightArm.position);
        lerpEuler(new THREE.Euler(-0.1, -0.3, -0.1), restRot, p, this.rightArm.rotation);
        lerpVec3(new THREE.Vector3(-0.15, -0.25, -0.95), this.scutumRest, p, this.leftArm.position);
        lerpEuler(new THREE.Euler(0.1, -0.4, 0.1), this.scutumRestRot, p, this.leftArm.rotation);
        if (p > 0.5 && this.pila > 0 && this.reloadT === 0) { this.reloadT = 0.85; } // start reload after shot
      }
    } else {
      // Gladius / Pilum
      const isThrow = this._pendingThrow && role.weapon !== 'bow';
      if (isThrow) {
        // Pilum throw animation - overhand
        if (t < 0.22) {
          const p = t / 0.22;
          // windup back high
          const pos = new THREE.Vector3(0.15, -0.05, -0.85); const rot = new THREE.Euler(-1.1, -0.3, -0.6);
          lerpVec3(restPos, pos, p, this.rightArm.position); lerpEuler(restRot, rot, p, this.rightArm.rotation);
          // left arm back for balance
          this.leftArm.position.set(lerp(this.scutumRest.x, -0.55, p), lerp(this.scutumRest.y, -0.25, p), lerp(this.scutumRest.z, -0.5, p));
        } else if (t < 0.50) {
          const p = (t - 0.22) / 0.28;
          // throw forward
          const pos = new THREE.Vector3(0.42, -0.38, -1.15); const rot = new THREE.Euler(-0.6, 0.2, 0.3);
          lerpVec3(new THREE.Vector3(0.15, -0.05, -0.85), pos, p, this.rightArm.position);
          lerpEuler(new THREE.Euler(-1.1, -0.3, -0.6), rot, p, this.rightArm.rotation);
        } else {
          const p = (t - 0.50) / 0.50;
          lerpVec3(new THREE.Vector3(0.42, -0.38, -1.15), restPos, p, this.rightArm.position);
          lerpEuler(new THREE.Euler(-0.6, 0.2, 0.3), restRot, p, this.rightArm.rotation);
          lerpVec3(new THREE.Vector3(-0.55, -0.25, -0.5), this.scutumRest, p, this.leftArm.position);
          if (p > 0.6 && this.pila > 0 && this.reloadT === 0) this.reloadT = 0.75;
        }
      } else {
        // Gladius combos - each combo has unique animation
        if (this.combo === 1) {
          // Stab - quick thrust
          if (t < 0.18) { const p = t / 0.18; const pos = new THREE.Vector3(0.18, -0.22, -0.75); const rot = new THREE.Euler(0.2, -0.2, -0.25); lerpVec3(restPos, pos, p, this.rightArm.position); lerpEuler(restRot, rot, p, this.rightArm.rotation); }
          else if (t < 0.52) { const p = (t - 0.18) / 0.34; const pos = new THREE.Vector3(0.28, -0.30, -1.35); const rot = new THREE.Euler(-1.6, -0.15, -0.45); lerpVec3(new THREE.Vector3(0.18, -0.22, -0.75), pos, p, this.rightArm.position); lerpEuler(new THREE.Euler(0.2, -0.2, -0.25), rot, p, this.rightArm.rotation); }
          else { const p = (t - 0.52) / 0.48; lerpVec3(new THREE.Vector3(0.28, -0.30, -1.35), restPos, p, this.rightArm.position); lerpEuler(new THREE.Euler(-1.6, -0.15, -0.45), restRot, p, this.rightArm.rotation); }
        } else if (this.combo === 2) {
          // Horizontal slash left to right
          if (t < 0.20) { const p = t / 0.20; const pos = new THREE.Vector3(0.05, -0.10, -0.70); const rot = new THREE.Euler(-0.3, 0.7, -0.85); lerpVec3(restPos, pos, p, this.rightArm.position); lerpEuler(restRot, rot, p, this.rightArm.rotation); }
          else if (t < 0.55) { const p = (t - 0.20) / 0.35; const pos = new THREE.Vector3(0.58, -0.38, -0.85); const rot = new THREE.Euler(-0.5, -0.9, 0.75); lerpVec3(new THREE.Vector3(0.05, -0.10, -0.70), pos, p, this.rightArm.position); lerpEuler(new THREE.Euler(-0.3, 0.7, -0.85), rot, p, this.rightArm.rotation); }
          else { const p = (t - 0.55) / 0.45; lerpVec3(new THREE.Vector3(0.58, -0.38, -0.85), restPos, p, this.rightArm.position); lerpEuler(new THREE.Euler(-0.5, -0.9, 0.75), restRot, p, this.rightArm.rotation); }
        } else {
          // Combo 3 - Overhead chop + thrust
          if (t < 0.22) { const p = t / 0.22; const pos = new THREE.Vector3(0.32, 0.10, -0.65); const rot = new THREE.Euler(-1.4, -0.1, -0.2); lerpVec3(restPos, pos, p, this.rightArm.position); lerpEuler(restRot, rot, p, this.rightArm.rotation); }
          else if (t < 0.45) { const p = (t - 0.22) / 0.23; const pos = new THREE.Vector3(0.38, -0.62, -0.85); const rot = new THREE.Euler(0.6, -0.2, -0.3); lerpVec3(new THREE.Vector3(0.32, 0.10, -0.65), pos, p, this.rightArm.position); lerpEuler(new THREE.Euler(-1.4, -0.1, -0.2), rot, p, this.rightArm.rotation); }
          else if (t < 0.68) { const p = (t - 0.45) / 0.23; const pos = new THREE.Vector3(0.30, -0.32, -1.45); const rot = new THREE.Euler(-1.8, -0.1, -0.5); lerpVec3(new THREE.Vector3(0.38, -0.62, -0.85), pos, p, this.rightArm.position); lerpEuler(new THREE.Euler(0.6, -0.2, -0.3), rot, p, this.rightArm.rotation); }
          else { const p = (t - 0.68) / 0.32; lerpVec3(new THREE.Vector3(0.30, -0.32, -1.45), restPos, p, this.rightArm.position); lerpEuler(new THREE.Euler(-1.8, -0.1, -0.5), restRot, p, this.rightArm.rotation); }
        }
      }
    }
    if (t >= 1) {
      this.attackT = 0; this._pendingThrow = false;
      this.rightArm.position.copy(restPos); this.rightArm.rotation.copy(restRot);
      this.leftArm.position.copy(this.scutumRest); this.leftArm.rotation.copy(this.scutumRestRot);
      if (this.bowArrow) this.bowArrow.visible = true;
    }
  }

  _updateBashAnim(dt) {
    this.bashT -= dt;
    const t = 1 - this.bashT / 0.48;
    const k = Math.sin(t * Math.PI);
    // Left arm thrust forward with body lunge, right arm back
    this.leftArm.position.set(-0.05 - k * 0.45, -0.15 + k * 0.12, -0.55 - k * 0.75);
    this.leftArm.rotation.set(k * -0.9, 0.05 - k * 0.35, k * 0.25);
    this.rightArm.position.set(0.22 - k * 0.15, -0.28 - k * 0.08, -0.45 + k * 0.15);
    this.rightArm.rotation.set(-0.15 + k * 0.3, -0.1 + k * 0.2, -0.25 + k * 0.15);
    if (this.bashT <= 0) {
      this.leftArm.position.copy(this.scutumRest); this.leftArm.rotation.copy(this.scutumRestRot);
      this.rightArm.position.copy(this.rightRestPos); this.rightArm.rotation.copy(this.rightRestRot);
    }
  }

  _updateReloadAnim(dt) {
    const role = this.roleData;
    const t = 1 - this.reloadT / (role.weapon === 'bow' ? 0.85 : 0.75);
    if (role.weapon === 'bow') {
      // Reload bow: right hand to quiver at back, grab arrow, bring to bow
      if (t < 0.35) {
        const p = t / 0.35;
        // reach back to quiver
        const pos = new THREE.Vector3(-0.25, -0.55, -0.85); const rot = new THREE.Euler(0.6, 0.8, 0.6);
        lerpVec3(this.rightRestPos, pos, p, this.rightArm.position);
        lerpEuler(this.rightRestRot, rot, p, this.rightArm.rotation);
      } else if (t < 0.70) {
        const p = (t - 0.35) / 0.35;
        // bring arrow to bow
        const startPos = new THREE.Vector3(-0.25, -0.55, -0.85); const endPos = new THREE.Vector3(0.12, -0.18, -0.25);
        const startRot = new THREE.Euler(0.6, 0.8, 0.6); const endRot = new THREE.Euler(-0.1, -0.6, -0.2);
        lerpVec3(startPos, endPos, p, this.rightArm.position);
        lerpEuler(startRot, endRot, p, this.rightArm.rotation);
        if (this.bowArrow) this.bowArrow.visible = p > 0.5;
      } else {
        const p = (t - 0.70) / 0.30;
        lerpVec3(new THREE.Vector3(0.12, -0.18, -0.25), this.rightRestPos, p, this.rightArm.position);
        lerpEuler(new THREE.Euler(-0.1, -0.6, -0.2), this.rightRestRot, p, this.rightArm.rotation);
      }
    } else {
      // Pilum reload: grab from back
      if (t < 0.40) {
        const p = t / 0.40;
        const pos = new THREE.Vector3(-0.35, -0.45, -0.95); const rot = new THREE.Euler(0.5, 0.7, 0.5);
        lerpVec3(this.rightRestPos, pos, p, this.rightArm.position);
        lerpEuler(this.rightRestRot, rot, p, this.rightArm.rotation);
      } else if (t < 0.75) {
        const p = (t - 0.40) / 0.35;
        const startPos = new THREE.Vector3(-0.35, -0.45, -0.95); const endPos = new THREE.Vector3(0.32, -0.22, -0.60);
        const startRot = new THREE.Euler(0.5, 0.7, 0.5); const endRot = new THREE.Euler(-0.2, -0.1, -0.2);
        lerpVec3(startPos, endPos, p, this.rightArm.position);
        lerpEuler(startRot, endRot, p, this.rightArm.rotation);
      } else {
        const p = (t - 0.75) / 0.25;
        lerpVec3(new THREE.Vector3(0.32, -0.22, -0.60), this.rightRestPos, p, this.rightArm.position);
        lerpEuler(new THREE.Euler(-0.2, -0.1, -0.2), this.rightRestRot, p, this.rightArm.rotation);
      }
    }
    if (this.reloadT <= 0) {
      this.rightArm.position.copy(this.rightRestPos); this.rightArm.rotation.copy(this.rightRestRot);
    }
  }

  consumeHitWindow() {
    const ws = this.roleData.weapon === 'bow' ? 0.38 : (this.combo === 1 ? 0.32 : this.combo === 2 ? 0.35 : 0.40);
    const we = this.roleData.weapon === 'bow' ? 0.62 : (this.combo === 1 ? 0.58 : this.combo === 2 ? 0.62 : 0.70);
    if (this.attackT > ws && this.attackT < we && !this.attackDidHit) { this.attackDidHit = true; return { combo: this.combo, damageMult: this.combo === 2 ? 1.3 : this.combo === 3 ? 1.75 : 1 }; }
    return null;
  }

  consumeThrow() {
    if (this._pendingThrow && this.attackT > 0.45 && this.attackT < 0.55) {
      const wasPending = this._pendingThrow;
      this._pendingThrow = false;
      if (this.pila >= 0 && this.shootCooldown === 0) {
        this.pila = Math.max(0, this.pila - (wasPending ? 0 : 1)); // already decremented earlier? we handle in main
        this.shootCooldown = this.roleData.weapon === 'bow' ? 0.6 : 0.8;
        return true;
      }
    }
    // For pilum throw, actual throw happens at 0.45-0.55 window
    if (this._pendingThrow && this.roleData.weapon !== 'bow' && this.attackT > 0.45 && this.attackT < 0.55) {
      return true;
    }
    // For bow, arrow released at 0.55-0.65
    if (this.roleData.weapon === 'bow' && this.attackT > 0.55 && this.attackT < 0.65 && this._pendingThrow) {
      this._pendingThrow = false;
      return true;
    }
    return false;
  }

  // New method for throw that is called from main - we need to handle pila decrement there
  consumeThrowRequest() {
    if (this.wantThrow && this.pila > 0 && this.shootCooldown === 0 && this.attackT <= 0 && this.bashT <= 0 && this.dodgeT <= 0 && this.reloadT <= 0) {
      this.wantThrow = false;
      this._pendingThrow = true;
      this.attackT = 0.001;
      this.pila--;
      return true;
    }
    this.wantThrow = false;
    return false;
  }

  consumeBash() { if (this.bashT > 0.18 && this.bashT < 0.38) { const t = this.bashT; this.bashT = 0.16; return true; } return false; }
  isParrying() { return this.parryActive; }
  isDodging() { return this.dodgeT > 0.10; }

  takeDamage(amount, fromDir) {
    if (this.isDodging()) return 'dodged';
    if (this.blocking && fromDir) {
      const dot = this.forward.dot(fromDir.clone().negate().setY(0).normalize());
      if (dot > 0.30) {
        if (this.isParrying()) { this.stamina = Math.min(this.maxStamina, this.stamina + 18); this.hitT = 0.12; return 'parried'; }
        this.stamina = Math.max(0, this.stamina - 14); this.hitT = 0.18; return 'blocked';
      }
    }
    this.health = Math.max(0, this.health - amount); this.hitT = 0.35; return 'hit';
  }

  _box(pos = this.position) { return new THREE.Box3(new THREE.Vector3(pos.x - PLAYER_RADIUS, pos.y - PLAYER_HEIGHT + 0.35, pos.z - PLAYER_RADIUS), new THREE.Vector3(pos.x + PLAYER_RADIUS, pos.y + 0.1, pos.z + PLAYER_RADIUS)); }
  _feetBox() { return new THREE.Box3(new THREE.Vector3(this.position.x - PLAYER_RADIUS, this.position.y - PLAYER_HEIGHT - 0.1, this.position.z - PLAYER_RADIUS), new THREE.Vector3(this.position.x + PLAYER_RADIUS, this.position.y - PLAYER_HEIGHT + 0.3, this.position.z + PLAYER_RADIUS)); }
  _overlapping() {
    const box = this._box();
    for (const b of colliders) {
      if (b.max.y < this.position.y - PLAYER_HEIGHT + 0.65) continue;
      if (box.intersectsBox(b)) return true;
    }
    return false;
  }
  _moveAxis(axis, delta) {
    if (delta === 0) return;
    // If we are already overlapping something (bad spawn, moving geometry) do not
    // block the move - otherwise the player could never walk free again.
    const wasOverlapping = this._overlapping();
    this.position[axis] += delta;
    if (wasOverlapping) return;
    const box = this._box();
    for (const b of colliders) {
      if (b.max.y < this.position.y - PLAYER_HEIGHT + 0.65) continue;
      if (box.intersectsBox(b)) { this.position[axis] -= delta; this.velocity[axis] = 0; return; }
    }
  }
}
