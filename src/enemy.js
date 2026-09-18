import * as THREE from 'three';
import { colliders, spawnPoints, factionZones } from './world.js';
import { MAT } from './materials.js';
import { raycastColliders, StuckDetector } from './anticheat.js';
import { VOICE_PROFILES } from './soundscape.js';

const skinMat = MAT.skin;
const steelMat = MAT.iron;
const bronzeMat = MAT.bronze;
const woodMat = MAT.woodDark;

function randomTunic() {
  const mats = MAT.tunic;
  return mats[Math.floor(Math.random() * mats.length)].clone();
}

export const ENEMY_ROLES = {
  swordsman: { name: 'Swordsman', hp: 55, speed: 4.8, damage: 14, reach: 2.2 },
  spearman: { name: 'Spearman', hp: 120, speed: 3.3, damage: 28, reach: 3.0 },
  archer: { name: 'Archer', hp: 40, speed: 5.0, damage: 18, reach: 22 },
  shieldbearer: { name: 'Shield-bearer', hp: 95, speed: 3.6, damage: 16, reach: 2.0 },
  centurion: { name: 'Centurion', hp: 260, speed: 4.0, damage: 32, reach: 2.6 },
  rebel: { name: 'Rebel', hp: 50, speed: 5.2, damage: 12, reach: 2.0 },
  praetorian: { name: 'Praetorian', hp: 140, speed: 3.8, damage: 24, reach: 2.3 },
  velite: { name: 'Velite', hp: 45, speed: 5.8, damage: 15, reach: 12 },
};

export const FACTIONS = {
  legio: { name: 'Legio I Italica', color: 0x8a1a1a, enemies: ['rebels'], allies: ['praetorian','senate','emperor','vestals','merchants'], start: {x:0,z:-220} },
  praetorian: { name: 'Praetorian Guard', color: 0x1a1a2a, enemies: ['rebels'], allies: ['legio','emperor','senate'], start: {x:220,z:0} },
  senate: { name: 'Senatus', color: 0xd9a441, enemies: ['rebels'], allies: ['legio','praetorian','emperor'], start: {x:-220,z:-50} },
  rebels: { name: 'Rebels', color: 0x5a2a2a, enemies: ['legio','praetorian','senate','emperor','merchants'], allies: [], start: {x:-220,z:120} },
  merchants: { name: 'Mercatores', color: 0x2a5a8a, enemies: ['rebels'], allies: ['legio','senate','vestals'], start: {x:-140,z:90} },
  vestals: { name: 'Vestals', color: 0xffd777, enemies: ['rebels'], allies: ['legio','merchants','senate'], start: {x:200,z:-140} },
  emperor: { name: 'Imperator', color: 0x6a0a8a, enemies: ['rebels'], allies: ['legio','praetorian','senate'], start: {x:0,z:200} },
};

function lerp(a,b,t){return a+(b-a)*t;}

export class Enemy {
  constructor(scene, pos, type = null, faction = null) {
    this.scene = scene;
    // Unique voice per enemy - not one voice for everyone
    this.voiceId = `enemy-${Math.floor(Math.random()*100000)}`;
    this.voiceProfile = null;
    if (!type) {
      const r = Math.random();
      if (r < 0.28) type = 'swordsman';
      else if (r < 0.48) type = 'spearman';
      else if (r < 0.66) type = 'archer';
      else if (r < 0.82) type = 'shieldbearer';
      else if (r < 0.92) type = 'rebel';
      else type = 'velite';
    }
    this.type = type;
    const role = ENEMY_ROLES[type] || ENEMY_ROLES.swordsman;
    this.role = role;

    // Faction choosing - based on type and position
    if (!faction) {
      if (type === 'rebel') faction = 'rebels';
      else if (type === 'praetorian') faction = 'praetorian';
      else if (Math.random() < 0.5) faction = 'legio';
      else faction = ['legio','senate','merchants','vestals'][Math.floor(Math.random()*4)];
    }
    this.faction = faction;
    this.factionData = FACTIONS[faction] || FACTIONS.legio;
    // Assign unique voice profile per faction + personal variation
    const factionVoiceMap = {
      legio: 'legionary',
      praetorian: 'praetorian',
      senate: 'senate',
      rebels: 'rebel',
      merchants: 'merchant',
      vestals: 'vestal',
      emperor: 'emperor',
    };
    const voiceKey = factionVoiceMap[faction] || 'citizen_m';
    const baseProfile = VOICE_PROFILES[voiceKey] || VOICE_PROFILES.citizen_m;
    this.voiceProfile = {
      ...baseProfile,
      personalPitch: baseProfile.base + (Math.random()-0.5)*baseProfile.range*0.7,
      personalSpeed: baseProfile.speed * (0.85 + Math.random()*0.3),
      id: `${voiceKey}-${Math.floor(Math.random()*10000)}`,
    };

    this.position = pos.clone(); this.position.y = 0;
    this.velocity = new THREE.Vector3();
    this.maxHealth = role.hp; this.health = this.maxHealth;
    this.speed = role.speed; this.damage = role.damage; this.reach = role.reach;
    this.attackTimer = Math.random() * 0.9;
    this.attackAnim = 0; this.attackType = 0; this.reloadT = 0;
    this.blockTimer = 0; this.isBlocking = false; this.hitT = 0;
    this.dead = false; this.deadT = 0; this.hitFlash = 0;
    this.walk = Math.random() * 10;
    this.wander = new THREE.Vector3(); this.wanderT = 0;
    this.yaw = 0; this.strafeDir = Math.random()<0.5?1:-1; this.strafeTimer = 0;
    this.formationId = null;
    this.targetEnemy = null; // for faction vs faction
    this.targetSearchTimer = 0;
    this._build();
  }

  _build() {
    const g = new THREE.Group();
    const isBoss = this.type === 'centurion';
    const s = isBoss ? 1.38 : (this.type === 'spearman' ? 1.24 : 1);
    const tunicMat = randomTunic();
    if (this.type === 'centurion') tunicMat.color.set(0x8a1a1a);
    if (this.type === 'praetorian') tunicMat.color.set(0x1a1a2a);
    if (this.faction === 'rebels') tunicMat.color.set(0x5a2a2a);
    // Faction color tint on shield
    const factionColor = this.factionData.color;

    const torsoGroup = new THREE.Group();
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.30*s,0.34*s,0.78*s,12), tunicMat);
    torso.position.y = 1.15*s; torso.castShadow = true; torsoGroup.add(torso);
    if (['spearman','shieldbearer','centurion','praetorian'].includes(this.type)) {
      const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.62*s,0.52*s,0.14*s), bronzeMat);
      chestPlate.position.set(0,1.24*s,0.19*s); chestPlate.castShadow = true; torsoGroup.add(chestPlate);
      for (let side of [-1,1]) {
        const pauldron = new THREE.Mesh(new THREE.CylinderGeometry(0.19*s,0.19*s,0.14*s,10), bronzeMat);
        pauldron.rotation.z = Math.PI/2; pauldron.position.set(side*0.39*s,1.36*s,0); torsoGroup.add(pauldron);
      }
    } else {
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.34*s,0.34*s,0.09*s,12), new THREE.MeshStandardMaterial({color:0x4a2a15, roughness:0.9}));
      belt.position.y = 0.86*s; torsoGroup.add(belt);
    }

    const headGroup = new THREE.Group(); headGroup.position.y = 1.72*s;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.18*s,14,12), skinMat); head.castShadow = true; headGroup.add(head);
    if (['spearman','shieldbearer','centurion','praetorian','swordsman'].includes(this.type) || Math.random()<0.65) {
      const helmBase = new THREE.Mesh(new THREE.SphereGeometry(0.21*s,14,12,0,Math.PI*2,0,Math.PI*0.72), bronzeMat);
      helmBase.rotation.x = Math.PI; helmBase.position.y = 0.05*s; helmBase.castShadow = true; headGroup.add(helmBase);
      if (isBoss) {
        const crest = new THREE.Mesh(new THREE.BoxGeometry(0.06*s,0.28*s,0.55*s), new THREE.MeshStandardMaterial({color:0x8a1a1a, roughness:0.9}));
        crest.position.set(0,0.26*s,0); crest.rotation.z = Math.PI/2; headGroup.add(crest);
      }
      for (let side of [-1,1]) {
        const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.045*s,0.19*s,0.17*s), bronzeMat);
        cheek.position.set(side*0.185*s,-0.05*s,0.04*s); cheek.rotation.z = side*0.15; headGroup.add(cheek);
      }
    } else {
      const hair = new THREE.Mesh(new THREE.SphereGeometry(0.19*s,12,8,0,Math.PI*2,0,1.4), new THREE.MeshStandardMaterial({color:0x2a1a0e}));
      hair.position.y = 0.02*s; headGroup.add(hair);
    }

    const legL = new THREE.Group();
    const legUpperL = new THREE.Mesh(new THREE.CylinderGeometry(0.11*s,0.10*s,0.4*s,8), skinMat); legUpperL.position.y = 0.55*s; legL.add(legUpperL);
    const legLowerL = new THREE.Mesh(new THREE.CylinderGeometry(0.09*s,0.08*s,0.38*s,8), skinMat); legLowerL.position.y = 0.18*s; legL.add(legLowerL);
    const sandalL = new THREE.Mesh(new THREE.BoxGeometry(0.14*s,0.06*s,0.26*s), MAT.woodDark); sandalL.position.set(0,0.03*s,0.05*s); legL.add(sandalL);
    legL.position.set(-0.14*s,0,0);
    const legR = legL.clone(); legR.position.x = 0.14*s;

    const armL = new THREE.Group();
    const upperArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.075*s,0.07*s,0.32*s,8), skinMat); upperArmL.position.y = -0.16*s; armL.add(upperArmL);
    const lowerArmL = new THREE.Mesh(new THREE.CylinderGeometry(0.065*s,0.06*s,0.30*s,8), skinMat); lowerArmL.position.y = -0.48*s; armL.add(lowerArmL);
    armL.position.set(-0.40*s,1.30*s,0);
    const armR = armL.clone(); armR.position.x = 0.40*s;

    const weapon = new THREE.Group();
    if (this.type === 'spearman') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,2.7,8), woodMat); shaft.position.y = 0.28;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.070,0.44,8), steelMat); head.position.y = 1.72;
      const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(0.044,0.044,0.14,8), bronzeMat); ferrule.position.y = 1.48;
      weapon.add(shaft,head,ferrule); weapon.position.set(0,-0.3,0); weapon.rotation.z = 0.08;
    } else if (this.type === 'archer') {
      const bowCurve = new THREE.TorusGeometry(0.46*s,0.022*s,6,16,Math.PI);
      const bow = new THREE.Mesh(bowCurve, woodMat); bow.rotation.y = Math.PI/2; bow.position.set(0,-0.2,0);
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005,0.005,0.92*s,4), new THREE.MeshStandardMaterial({color:0xcccccc})); string.position.set(0,-0.2,0);
      weapon.add(bow,string);
      const arrow = new THREE.Group();
      const aShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.72,6), woodMat); arrow.add(aShaft);
      const aHead = new THREE.Mesh(new THREE.ConeGeometry(0.022,0.09,6), steelMat); aHead.position.y = 0.40; arrow.add(aHead);
      arrow.position.set(0,-0.2,0.08); arrow.rotation.x = Math.PI/2; weapon.add(arrow);
      this.bowArrow = arrow; this.bowString = string;
      weapon.position.set(0,-0.35,0.05);
    } else if (this.type === 'velite') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,1.6,8), woodMat); shaft.position.y = 0.22;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.030,0.15,8), steelMat); tip.position.y = 1.05;
      weapon.add(shaft,tip); weapon.position.set(0,-0.3,0);
      const quiver = new THREE.Mesh(new THREE.CylinderGeometry(0.12*s,0.12*s,0.52*s,10), new THREE.MeshStandardMaterial({color:0x4a2e15})); quiver.position.set(-0.25*s,0.22*s,0); armL.add(quiver);
    } else if (this.type === 'shieldbearer') {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05,0.64,0.016), steelMat); blade.position.y = 0.40; blade.castShadow = true;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.026,0.026,0.17,8), woodMat); grip.position.y = -0.04;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.11,0.028,0.045), bronzeMat); guard.position.y = 0.05;
      weapon.add(blade,grip,guard); weapon.position.set(0,-0.35,0.05);
    } else {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.056,0.74,0.018), steelMat); blade.position.y = 0.44; blade.castShadow = true;
      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.01,0.52,0.02), new THREE.MeshStandardMaterial({color:0x6a7a8a})); fuller.position.y = 0.44;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028,0.028,0.19,8), woodMat); grip.position.y = -0.02;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.12,0.03,0.05), bronzeMat); guard.position.y = 0.07;
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.034,8,8), bronzeMat); pommel.position.y = -0.12;
      weapon.add(blade,fuller,grip,guard,pommel); weapon.position.set(0,-0.35,0.05);
      if (isBoss) {
        const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.032,0.032,1.1,8), woodMat); staff.position.set(-0.52,0.22,0); staff.rotation.z = 0.32; armL.add(staff);
      }
    }
    armR.add(weapon);

    const shieldGroup = new THREE.Group();
    let shieldSize = 0.34; let shieldMat;
    if (this.type === 'shieldbearer') { shieldSize = 0.58; shieldMat = new THREE.MeshStandardMaterial({color:factionColor, roughness:0.7}); }
    else if (this.type === 'centurion') { shieldSize = 0.50; shieldMat = MAT.scutum; }
    else if (this.type === 'praetorian') { shieldSize = 0.54; shieldMat = new THREE.MeshStandardMaterial({color:0x1a1a2a, roughness:0.6}); }
    else shieldMat = new THREE.MeshStandardMaterial({color:0x9a7a3a, roughness:0.8});
    const shieldGeo = new THREE.CylinderGeometry(shieldSize*s,shieldSize*s,0.06,18,1,true,-0.55,1.1);
    const shield = new THREE.Mesh(shieldGeo, shieldMat); shield.rotation.z = Math.PI/2; shield.rotation.y = Math.PI/2; shield.scale.set(1.45,1,1); shield.castShadow = true; shieldGroup.add(shield);
    const shieldBoss = new THREE.Mesh(new THREE.SphereGeometry(0.068*s,10,8), bronzeMat); shieldBoss.position.z = -0.048; shieldGroup.add(shieldBoss);
    shieldGroup.position.set(0,-0.45,0.15); shieldGroup.rotation.y = 0.32;
    armL.add(shieldGroup);

    if (this.type === 'archer') {
      const backQuiver = new THREE.Mesh(new THREE.CylinderGeometry(0.14*s,0.14*s,0.58*s,10), new THREE.MeshStandardMaterial({color:0x4a2e15}));
      backQuiver.position.set(0.16*s,0.22*s, -0.16*s); torsoGroup.add(backQuiver);
      for (let i=0;i<5;i++){ const arr = new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.52,6), woodMat); arr.position.set(0.16*s + (Math.random()-0.5)*0.04, 0.48*s + i*0.022, -0.16*s); torsoGroup.add(arr); }
    }

    g.add(torsoGroup, headGroup, legL, legR, armL, armR);
    this.parts = { legL, legR, armL, armR, weapon, torso: torsoGroup, head: headGroup, shield: shieldGroup };
    this.rest = {
      armLPos: armL.position.clone(), armLRot: armL.rotation.clone(),
      armRPos: armR.position.clone(), armRRot: armR.rotation.clone(),
      weaponPos: weapon.position.clone(), weaponRot: weapon.rotation.clone(),
      shieldPos: shieldGroup.position.clone(), shieldRot: shieldGroup.rotation.clone(),
    };
    this.group = g; this.scale = s; g.position.copy(this.position); this.scene.add(g);
  }

  takeDamage(amount, knockDir, fromFront = false) {
    if (this.dead) return false;
    if (fromFront && (this.type === 'shieldbearer' || this.type === 'centurion' || this.type === 'praetorian')) {
      if (Math.random() < 0.65) {
        this.isBlocking = true; this.blockTimer = 0.48; this.hitT = 0.20;
        this.velocity.add(knockDir ? knockDir.clone().setY(0).normalize().multiplyScalar(-1.7) : new THREE.Vector3());
        return 'blocked';
      }
    }
    this.health -= amount; this.hitFlash = 0.24; this.hitT = 0.36;
    if (knockDir) this.velocity.add(knockDir.clone().setY(0).normalize().multiplyScalar(this.type === 'centurion' ? 2.5 : 6.0));
    if (this.health <= 0) {
      this.dead = true; this.deadT = 0;
      const pool = new THREE.Mesh(new THREE.CircleGeometry(0.85*this.scale, 16), MAT.blood);
      pool.rotation.x = -Math.PI/2; pool.position.set(this.position.x,0.02,this.position.z); this.scene.add(pool); this.pool = pool;
      return true;
    }
    return false;
  }

  findFactionEnemy(others, player) {
    // Find nearest enemy faction NPC
    let nearest = null; let nearestDist = 25;
    for (const o of others) {
      if (o === this || o.dead) continue;
      if (o.faction === this.faction) continue;
      const fd = FACTIONS[this.faction];
      if (!fd) continue;
      if (!fd.enemies.includes(o.faction) && !FACTIONS[o.faction]?.enemies.includes(this.faction)) {
        // Check if factions are enemies
        if (this.faction !== 'rebels' && o.faction !== 'rebels') continue; // only rebels attack everyone, legio attacks rebels
      }
      const d = this.position.distanceTo(o.position);
      if (d < nearestDist) { nearestDist = d; nearest = o; }
    }
    // Also consider player if player faction is enemy
    if (player && player.faction) {
      const fd = FACTIONS[this.faction];
      if (fd && fd.enemies.includes(player.faction)) {
        const d = this.position.distanceTo(player.position);
        if (d < nearestDist && d < 30) { nearest = { position: player.position, isPlayer: true, distance: d }; }
      }
    }
    return nearest;
  }

  update(dt, player, others, arrows) {
    if (this.dead) {
      this.deadT += dt;
      this.group.rotation.x = Math.min(Math.PI/2, this.deadT*5.2);
      this.group.position.y = -Math.max(0,this.deadT-3.2)*0.65;
      if (this.deadT > 7.5) { this.scene.remove(this.group); this.removed = true; }
      return null;
    }
    if (this.hitFlash > 0) {
      this.hitFlash -= dt;
      this.group.traverse(o=>{ if(o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(this.hitFlash>0?0x661111:0x000000); });
      if (this.hitFlash <= 0) this.group.traverse(o=>{ if(o.isMesh && o.material && o.material.emissive) o.material.emissive.setHex(0); });
    }
    this.hitT = Math.max(0, this.hitT - dt);
    this.blockTimer -= dt; if (this.blockTimer <= 0) this.isBlocking = false;
    this.reloadT = Math.max(0, this.reloadT - dt);
    this.targetSearchTimer -= dt;

    const toPlayer = new THREE.Vector3().subVectors(player.position, this.position).setY(0);
    const distToPlayer = toPlayer.length();
    let desire = new THREE.Vector3(); let result = null;

    // Faction war - find faction enemy
    if (this.targetSearchTimer <= 0) {
      this.targetSearchTimer = 0.6 + Math.random()*0.8;
      this.targetEnemy = this.findFactionEnemy(others, player);
    }

    let targetPos = null; let targetIsPlayer = false;
    if (this.targetEnemy) {
      targetPos = this.targetEnemy.position;
      targetIsPlayer = !!this.targetEnemy.isPlayer;
    } else if (distToPlayer < 60) {
      targetPos = player.position;
      targetIsPlayer = true;
    }

    if (targetPos) {
      const toTarget = new THREE.Vector3().subVectors(targetPos, this.position).setY(0);
      const dist = toTarget.length();

      if (this.type === 'archer') {
        if (this.reloadT > 0) desire.set(0,0,0);
        else if (dist < 10) desire.copy(toTarget).normalize().negate().multiplyScalar(this.speed);
        else if (dist > 24) desire.copy(toTarget).normalize().multiplyScalar(this.speed*0.75);
        else {
          this.strafeTimer -= dt; if (this.strafeTimer <= 0){ this.strafeTimer = 1+Math.random()*2; this.strafeDir = Math.random()<0.5?1:-1; }
          const perp = new THREE.Vector3(-toTarget.z,0,toTarget.x).normalize();
          desire.copy(perp).multiplyScalar(this.strafeDir*this.speed*0.70);
        }
        this.yaw = Math.atan2(toTarget.x, toTarget.z);
        this.attackTimer -= dt;
        if (this.reloadT <= 0 && dist >= 8 && dist <= 28 && this.attackTimer <= 0) {
          let blocked = false; for (const b of colliders){ const mid = this.position.clone().lerp(targetPos,0.5); if (b.containsPoint(mid)){ blocked = true; break; } }
          if (!blocked){ this.attackTimer = 2.0+Math.random()*1.4; this.attackAnim = 0.001; this.attackType = Math.floor(Math.random()*2); this.pendingShoot = true; }
        }
      } else if (this.type === 'velite') {
        if (this.reloadT > 0) desire.copy(toTarget).normalize().negate().multiplyScalar(this.speed*0.5);
        else if (dist < 7) desire.copy(toTarget).normalize().negate().multiplyScalar(this.speed);
        else if (dist > 15) desire.copy(toTarget).normalize().multiplyScalar(this.speed*0.85);
        else { this.strafeTimer -= dt; if (this.strafeTimer <= 0){ this.strafeTimer = 0.8+Math.random(); this.strafeDir = Math.random()<0.5?1:-1; } const perp = new THREE.Vector3(-toTarget.z,0,toTarget.x).normalize(); desire.copy(perp).multiplyScalar(this.strafeDir*this.speed*0.75); }
        this.yaw = Math.atan2(toTarget.x, toTarget.z);
        this.attackTimer -= dt;
        if (this.reloadT <= 0 && dist >= 6 && dist <= 17 && this.attackTimer <= 0){ this.attackTimer = 2.4+Math.random(); this.attackAnim = 0.001; this.pendingThrow = true; }
        else if (this.reloadT <= 0 && dist < 2.6 && this.attackTimer <= 0){ this.attackTimer = 1.2; this.attackAnim = 0.001; this.attackType = 2; this.pendingHit = true; }
      } else {
        if (dist > this.reach*0.88) {
          let flank = new THREE.Vector3(); let alliesNear=0;
          for (const o of others){ if(o===this||o.dead)continue; if(o.position.distanceTo(this.position)<5.5){ alliesNear++; const away = new THREE.Vector3().subVectors(this.position,o.position).setY(0).normalize().multiplyScalar(0.38); flank.add(away); } }
          desire.copy(toTarget).normalize().multiplyScalar(this.speed).add(flank);
          if(alliesNear>1 && Math.random()<0.03) this.strafeDir*=-1;
          if(alliesNear>1){ const perp = new THREE.Vector3(-toTarget.z,0,toTarget.x).normalize(); desire.add(perp.multiplyScalar(this.strafeDir*this.speed*0.42)); }
        }
        this.yaw = Math.atan2(toTarget.x, toTarget.z);
        this.attackTimer -= dt;
        if (dist < this.reach && this.attackTimer <= 0){
          this.attackTimer = this.type==='centurion'?1.8:(this.type==='spearman'?2.1:1.35);
          this.attackAnim = 0.001; this.attackType = Math.floor(Math.random()*3); this.pendingHit = true;
        }
      }
    } else {
      this.wanderT -= dt;
      if (this.wanderT <= 0){ this.wanderT = 2+Math.random()*3; this.wander.set(Math.random()-0.5,0,Math.random()-0.5).normalize().multiplyScalar(this.speed*0.5*(Math.random()<0.6?1:0)); }
      desire.copy(this.wander); if (desire.lengthSq()>0) this.yaw = Math.atan2(desire.x,desire.z);
    }

    for (const o of others){ if(o===this||o.dead)continue; const d = new THREE.Vector3().subVectors(this.position,o.position).setY(0); const l = d.length(); if(l<1.5 && l>0.001) desire.add(d.normalize().multiplyScalar((1.5-l)*7.5)); }

    this.velocity.x += (desire.x - this.velocity.x)*Math.min(1,dt*6);
    this.velocity.z += (desire.z - this.velocity.z)*Math.min(1,dt*6);
    this._moveAxis('x', this.velocity.x*dt); this._moveAxis('z', this.velocity.z*dt);
    this.position.x = Math.max(-898,Math.min(898,this.position.x)); this.position.z = Math.max(-698,Math.min(698,this.position.z));

    if (this.reloadT > 0) this._updateReloadAnim(dt);
    else if (this.attackAnim > 0) {
      this.attackAnim += dt / (this.type==='archer'?0.78: this.type==='velite'?0.68 : 0.54);
      const t = Math.min(1, this.attackAnim);
      this._updateAttackAnim(t, targetIsPlayer?toPlayer:new THREE.Vector3().subVectors((this.targetEnemy?.position||player.position), this.position).setY(0), player, arrows, targetIsPlayer);
      if (t >= 1){ this.attackAnim = 0; this._resetRest(); }
    } else if (this.isBlocking) {
      this.parts.armL.rotation.x = -0.58; this.parts.shield.position.set(0.08, -0.42, 0.34);
    } else if (this.hitT > 0) {
      const k = Math.sin(this.hitT*18)*0.28;
      this.parts.torso.rotation.x = -k*0.65; this.parts.head.rotation.x = k*0.45;
    } else {
      const sp = Math.hypot(this.velocity.x, this.velocity.z);
      this.walk += dt*sp*2.6;
      const swing = Math.sin(this.walk)*Math.min(1,sp/3.2)*0.72;
      this.parts.legL.rotation.x = swing; this.parts.legR.rotation.x = -swing;
      this.parts.armL.rotation.x = -swing*0.80;
      if (this.attackAnim===0) this.parts.armR.rotation.x = swing*0.80;
      if (sp < 0.3){ this.parts.torso.position.y = Math.sin(this.walk*0.3)*0.022; }
    }

    if (this.isBlocking && this.type==='shieldbearer'){ this.parts.armL.rotation.x = -0.68; this.parts.shield.position.z = 0.30; }

    this.group.position.copy(this.position); this.group.rotation.y = this.yaw;
    if (this._pendingResult){ const r=this._pendingResult; this._pendingResult=null; return r; }
    return null;
  }

  _updateAttackAnim(t, toTarget, player, arrows, targetIsPlayer) {
    const r=this.rest; const s=this.scale; const type=this.type; const atkType=this.attackType; const k=Math.sin(t*Math.PI);
    if (type==='archer'){
      if (t<0.45){ const p=t/0.45; this.parts.armL.position.set(lerp(r.armLPos.x,-0.16,p), lerp(r.armLPos.y,0.16,p), lerp(r.armLPos.z,0.26,p)); this.parts.armL.rotation.set(lerp(r.armLRot.x,0.22,p), lerp(r.armLRot.y,-0.32,p), 0); this.parts.armR.position.set(lerp(r.armRPos.x,0.16,p), lerp(r.armRPos.y,-0.16,p), lerp(r.armRPos.z,-0.16,p)); this.parts.armR.rotation.set(lerp(r.armRRot.x,-0.22,p), lerp(r.armRRot.y,-0.62,p),0); if(this.bowString) this.bowString.position.x=lerp(0,-0.13,p); if(this.bowArrow){ this.bowArrow.position.x=lerp(0,-0.13,p); this.bowArrow.visible=true; } }
      else if(t<0.65){ this.parts.armL.position.set(-0.16,0.16,0.26); this.parts.armR.position.set(0.16,-0.16,-0.16); }
      else if(t<0.76){ const p=(t-0.65)/0.11; this.parts.armR.position.set(lerp(0.16,0.36,p), -0.16, lerp(-0.16,-0.36,p)); if(this.bowString) this.bowString.position.x=lerp(-0.13,0,p); if(this.bowArrow) this.bowArrow.visible=false; if(p>0.5 && this.pendingShoot){ this.pendingShoot=false; const dir=toTarget.clone().normalize(); dir.y=0.07+Math.random()*0.07; dir.normalize(); const origin=this.position.clone().add(new THREE.Vector3(0,1.48,0)).add(dir.clone().multiplyScalar(0.68)); if(arrows) arrows.push(new Arrow(this.scene, origin, dir, this)); this.reloadT=1.2; } }
      else { const p=(t-0.76)/0.24; this.parts.armL.position.x=lerp(-0.16,r.armLPos.x,p); this.parts.armL.position.y=lerp(0.16,r.armLPos.y,p); this.parts.armR.position.x=lerp(0.36,r.armRPos.x,p); }
    } else if(type==='velite'){
      if(this.pendingThrow){
        if(t<0.32){ const p=t/0.32; this.parts.armR.position.set(lerp(r.armRPos.x,0.12,p), lerp(r.armRPos.y,0.28,p), lerp(r.armRPos.z,-0.48,p)); this.parts.armR.rotation.set(lerp(r.armRRot.x,-1.25,p),0,0); }
        else if(t<0.58){ const p=(t-0.32)/0.26; this.parts.armR.position.set(lerp(0.12,0.48,p), lerp(0.28,-0.16,p), lerp(-0.48,-0.58,p)); this.parts.armR.rotation.set(lerp(-1.25,-0.45,p), lerp(0,0.32,p),0); if(p>0.6 && this.pendingThrow){ this.pendingThrow=false; const dir=toTarget.clone().normalize(); dir.y=0.13; dir.normalize(); const origin=this.position.clone().add(new THREE.Vector3(0,1.52,0)).add(dir.clone().multiplyScalar(0.62)); if(arrows) arrows.push(new Pilum(this.scene, origin, dir)); this.reloadT=1.1; } }
        else { const p=(t-0.58)/0.42; this.parts.armR.position.x=lerp(0.48,r.armRPos.x,p); this.parts.armR.position.y=lerp(-0.16,r.armRPos.y,p); }
      } else { this.parts.armR.rotation.x=-k*1.7; this.parts.weapon.rotation.x=-k*1.7; if(t>0.54 && this.pendingHit){ this.pendingHit=false; const d2=toTarget.length(); if(d2<this.reach+0.6) this._pendingResult={damage:this.damage, dir:toTarget.clone().normalize(), type:this.type, faction:this.faction}; } }
    } else if(type==='spearman'){
      if(atkType===0){ this.parts.armR.rotation.x=-k*1.15; this.parts.weapon.position.z=0.05+k*1.4*s; this.parts.weapon.rotation.x=-k*0.75; this.parts.armL.rotation.x=-k*0.45; this.parts.torso.rotation.x=-k*0.28; }
      else if(atkType===1){ this.parts.armR.rotation.y=k*0.95; this.parts.armR.rotation.x=-k*0.65; this.parts.weapon.rotation.y=k*0.95; this.parts.torso.rotation.y=k*0.38; }
      else { this.parts.armR.position.y=k*0.38; this.parts.armR.rotation.x=-k*1.45; this.parts.weapon.position.z=0.05+k*1.15*s; }
      if(t>0.54 && this.pendingHit){ this.pendingHit=false; if(toTarget.length()<this.reach+0.7) this._pendingResult={damage:this.damage, dir:toTarget.clone().normalize(), type:this.type, faction:this.faction}; }
    } else if(type==='shieldbearer'){
      if(atkType===0){ this.parts.armR.rotation.x=-k*1.75; this.parts.weapon.position.z=0.05+k*0.72*s; }
      else { if(t<0.46){ const p=t/0.46; const kb=Math.sin(p*Math.PI); this.parts.armL.position.set(0.08+kb*0.38, -0.42+kb*0.12, 0.14+kb*0.58); this.parts.armL.rotation.x=-kb*0.85; } else { const p=(t-0.46)/0.54; this.parts.armR.rotation.x=-Math.sin(p*Math.PI)*1.7; } }
      if(t>0.54 && this.pendingHit){ this.pendingHit=false; if(toTarget.length()<this.reach+0.6) this._pendingResult={damage:this.damage, dir:toTarget.clone().normalize(), type:this.type, faction:this.faction}; }
    } else if(type==='centurion'){
      if(atkType===0){ if(t<0.36){ const p=t/0.36; this.parts.armR.position.y=p*0.48; this.parts.armR.rotation.x=-p*1.7; } else if(t<0.62){ const p=(t-0.36)/0.26; this.parts.armR.position.y=0.48-p*0.80; this.parts.armR.rotation.x=-1.7+p*2.3; this.parts.weapon.position.z=0.05+Math.sin(p*Math.PI)*0.95*s; } else { const p=(t-0.62)/0.38; this.parts.armR.position.y=-0.32+p*0.32; } }
      else if(atkType===1){ if(t<0.42){ const p=t/0.42; const kb=Math.sin(p*Math.PI); this.parts.armL.position.set(0.08+kb*0.42, -0.42+kb*0.14, 0.14+kb*0.62); } else { const p=(t-0.42)/0.58; this.parts.armR.rotation.x=-Math.sin(p*Math.PI)*2.0; this.parts.weapon.position.z=0.05+Math.sin(p*Math.PI)*0.90*s; } }
      else { this.parts.armR.rotation.y=Math.sin(t*Math.PI*2)*0.75; this.parts.armR.rotation.x=-k*1.9; }
      if(t>0.52 && this.pendingHit){ this.pendingHit=false; if(toTarget.length()<this.reach+0.75) this._pendingResult={damage:this.damage, dir:toTarget.clone().normalize(), type:this.type, faction:this.faction}; }
    } else {
      if(atkType===0){ this.parts.armR.rotation.x=-k*1.95; this.parts.weapon.rotation.x=-k*1.95; this.parts.weapon.position.z=0.05+k*0.68*s; }
      else if(atkType===1){ this.parts.armR.rotation.y=k*0.90; this.parts.armR.rotation.x=-k*0.75; this.parts.weapon.rotation.y=k*0.90; }
      else { this.parts.armR.position.y=k*0.30; this.parts.armR.rotation.x=-k*1.7; this.parts.armR.rotation.z=k*0.55; }
      if(t>0.54 && this.pendingHit){ this.pendingHit=false; if(toTarget.length()<this.reach+0.6) this._pendingResult={damage:this.damage, dir:toTarget.clone().normalize(), type:this.type, faction:this.faction}; }
    }
  }

  _updateReloadAnim(dt){
    const t=1-this.reloadT/(this.type==='archer'?1.2:1.1);
    if(this.type==='archer'){
      if(t<0.42){ const p=t/0.42; this.parts.armR.position.set(lerp(this.rest.armRPos.x,-0.22,p), lerp(this.rest.armRPos.y,0.38,p), lerp(this.rest.armRPos.z,-0.38,p)); this.parts.armR.rotation.set(lerp(this.rest.armRRot.x,0.95,p), lerp(this.rest.armRRot.y,0.75,p),0); }
      else if(t<0.78){ const p=(t-0.42)/0.36; this.parts.armR.position.set(lerp(-0.22,0.12,p), lerp(0.38,-0.12,p), lerp(-0.38,-0.12,p)); if(this.bowArrow) this.bowArrow.visible=p>0.6; }
      else { const p=(t-0.78)/0.22; this.parts.armR.position.x=lerp(0.12,this.rest.armRPos.x,p); }
    } else if(this.type==='velite'){
      if(t<0.48){ const p=t/0.48; this.parts.armR.position.set(lerp(this.rest.armRPos.x,-0.30,p), lerp(this.rest.armRPos.y,0.32,p), lerp(this.rest.armRPos.z,-0.32,p)); }
      else { const p=(t-0.48)/0.52; this.parts.armR.position.x=lerp(-0.30,this.rest.armRPos.x,p); }
    }
  }

  _resetRest(){ const r=this.rest; this.parts.armL.position.copy(r.armLPos); this.parts.armL.rotation.copy(r.armLRot); this.parts.armR.position.copy(r.armRPos); this.parts.armR.rotation.copy(r.armRRot); this.parts.weapon.position.copy(r.weaponPos); this.parts.weapon.rotation.copy(r.weaponRot); this.parts.shield.position.copy(r.shieldPos); this.parts.shield.rotation.copy(r.shieldRot); this.parts.torso.rotation.set(0,0,0); this.parts.head.rotation.set(0,0,0); }

  _box(pos=this.position){ const r=0.44*this.scale; return new THREE.Box3(new THREE.Vector3(pos.x-r,0.3,pos.z-r), new THREE.Vector3(pos.x+r,1.95*this.scale,pos.z+r)); }
  _moveAxis(axis,delta){
    if(delta===0)return;
    const wasOverlapping=this._overlapping();
    this.position[axis]+=delta;
    if(wasOverlapping)return;   // never trap an enemy inside geometry
    const box=this._box();
    for(const b of colliders){
      if(box.intersectsBox(b)){
        if(b.max.y<0.6)continue;
        this.position[axis]-=delta; this.velocity[axis]*=-0.38;
        const other=axis==='x'?'z':'x'; this.velocity[other]+=(Math.random()-0.5)*2.6;
        return;
      }
    }
  }
  _overlapping(){ const box=this._box(); for(const b of colliders){ if(b.max.y<0.6)continue; if(box.intersectsBox(b))return true; } return false; }
}

export class Pilum {
  constructor(scene, origin, dir){
    this.scene=scene; this.position=origin.clone(); this.prevPos=origin.clone(); this.velocity=dir.clone().multiplyScalar(33); this.life=0; this.stuck=false;
    const g=new THREE.Group(); const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.022,0.022,1.95,8), woodMat); const shank=new THREE.Mesh(new THREE.CylinderGeometry(0.012,0.012,0.68,8), steelMat); shank.position.y=1.25; const tip=new THREE.Mesh(new THREE.ConeGeometry(0.034,0.17,8), steelMat); tip.position.y=1.64; g.add(shaft,shank,tip); g.rotation.x=Math.PI/2; this.mesh=new THREE.Group(); this.mesh.add(g); this.mesh.position.copy(this.position); scene.add(this.mesh);
  }
  update(dt,enemies){
    this.life+=dt; if(this.stuck){ if(this.life>8){ this.scene.remove(this.mesh); this.removed=true; } return null; }
    this.prevPos.copy(this.position);
    this.velocity.y-=13.5*dt; this.position.addScaledVector(this.velocity,dt); this.mesh.position.copy(this.position); this.mesh.lookAt(this.position.clone().add(this.velocity));
    if(this.position.y<0.13){ this.stuck=true; this.position.y=0.13; return null; }
    // Raycast to prevent tunneling through thin walls
    const hit = raycastColliders(this.prevPos, this.position, colliders);
    if (hit) { this.stuck=true; this.position.copy(hit.point); return null; }
    for(const b of colliders) if(b.containsPoint(this.position)){ this.stuck=true; return null; }
    for(const e of enemies){ if(e.dead)continue; if(e._box().containsPoint(this.position)){ this.scene.remove(this.mesh); this.removed=true; const to=new THREE.Vector3().subVectors(e.position,this.position).setY(0); const fromFront=to.length()>0.1?e.group.getWorldDirection(new THREE.Vector3()).dot(to.normalize())<-0.2:false; const res=e.takeDamage(82,this.velocity,fromFront); if(res==='blocked'){ this.stuck=false; this.velocity.multiplyScalar(-0.32); this.position.addScaledVector(this.velocity,0.12); return null; } return e; } }
    return null;
  }
}

export class Arrow {
  constructor(scene, origin, dir, owner=null){
    this.scene=scene; this.owner=owner; this.position=origin.clone(); this.prevPos=origin.clone(); this.velocity=dir.clone().multiplyScalar(40); this.life=0; this.stuck=false;
    const g=new THREE.Group(); const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.010,0.010,0.78,6), woodMat); const head=new THREE.Mesh(new THREE.ConeGeometry(0.020,0.08,6), steelMat); head.position.y=0.42; const fletch=new THREE.Mesh(new THREE.BoxGeometry(0.042,0.13,0.022), new THREE.MeshStandardMaterial({color:0xb03030})); fletch.position.y=-0.34; g.add(shaft,head,fletch); g.rotation.x=Math.PI/2; this.mesh=new THREE.Group(); this.mesh.add(g); this.mesh.position.copy(this.position); scene.add(this.mesh);
  }
  update(dt,player,enemies){
    this.life+=dt; if(this.stuck){ if(this.life>6){ this.scene.remove(this.mesh); this.removed=true; } return null; }
    this.prevPos.copy(this.position);
    this.velocity.y-=10.5*dt; this.position.addScaledVector(this.velocity,dt); this.mesh.position.copy(this.position); this.mesh.lookAt(this.position.clone().add(this.velocity));
    if(this.position.y<0.12){ this.stuck=true; this.position.y=0.12; return null; }
    const hit = raycastColliders(this.prevPos, this.position, colliders);
    if (hit) { this.stuck=true; this.position.copy(hit.point); return null; }
    for(const b of colliders) if(b.containsPoint(this.position)){ this.stuck=true; return null; }
    if(player && this.owner!==player){ const toP=new THREE.Vector3().subVectors(player.position,this.position); if(toP.length()<1.1 && this.position.y>0.5 && this.position.y<2.3){ this.scene.remove(this.mesh); this.removed=true; return {target:'player', damage:this.owner?this.owner.damage:19, dir:this.velocity.clone().normalize(), faction:this.owner?.faction}; } }
    for(const e of enemies){ if(e===this.owner||e.dead)continue; if(e._box().containsPoint(this.position)){ this.scene.remove(this.mesh); this.removed=true; const dmg = this.owner?.faction==='rebels'?35:32; const blocked=e.takeDamage(dmg,this.velocity, true); if(blocked==='blocked') return null; return {target:'enemy', enemy:e, faction:this.owner?.faction}; } }
    if(this.life>8.5){ this.scene.remove(this.mesh); this.removed=true; }
    return null;
  }
}

// Global stuck detector for enemies
export const enemyStuckDetector = new StuckDetector();
