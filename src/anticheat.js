/**
 * Kitchuban Anti-Cheat & Bug Fixes - Prevent abuses, no admins, everyone equal
 * Static client-only validation
 */

export const MAX_CAPS = {
  gold: 100000,
  grain: 5000,
  wood: 5000,
  marble: 2000,
  oil: 2000,
  wine: 2000,
  weapons: 2000,
  damage_mult: 3.0,
  shield_mult: 2.5,
  level: 100,
  xp: 1000000,
  pila: 100,
};

export function validateResources(resources) {
  const cleaned = {};
  let cheated = false;
  for (const [key, cap] of Object.entries(MAX_CAPS)) {
    if (key === 'damage_mult' || key === 'shield_mult' || key === 'level' || key === 'xp' || key === 'pila') continue;
    let val = parseInt(resources[key] || 0);
    if (isNaN(val) || val < 0) {
      val = 0;
      cheated = true;
    }
    if (val > cap) {
      console.warn(`[ANTICHEAT] Capped ${key} from ${val} to ${cap} - possible cheat`);
      val = cap;
      cheated = true;
    }
    cleaned[key] = val;
  }
  // Gold special
  let gold = parseInt(resources.gold || 0);
  if (isNaN(gold) || gold < 0) gold = 0;
  if (gold > MAX_CAPS.gold) {
    console.warn(`[ANTICHEAT] Capped gold from ${gold} to ${MAX_CAPS.gold}`);
    gold = MAX_CAPS.gold;
    cheated = true;
  }
  cleaned.gold = gold;
  return { cleaned, cheated };
}

export function validateDamageMult() {
  let mult = parseFloat(localStorage.getItem('kitchuban_damage_mult') || '1');
  if (isNaN(mult) || mult < 1) mult = 1;
  if (mult > MAX_CAPS.damage_mult) {
    console.warn(`[ANTICHEAT] Capped damage_mult from ${mult} to ${MAX_CAPS.damage_mult}`);
    mult = MAX_CAPS.damage_mult;
    localStorage.setItem('kitchuban_damage_mult', mult.toString());
  }
  return mult;
}

export function validateShieldMult() {
  let mult = parseFloat(localStorage.getItem('kitchuban_shield_mult') || '1');
  if (isNaN(mult) || mult < 1) mult = 1;
  if (mult > MAX_CAPS.shield_mult) {
    console.warn(`[ANTICHEAT] Capped shield_mult from ${mult} to ${MAX_CAPS.shield_mult}`);
    mult = MAX_CAPS.shield_mult;
    localStorage.setItem('kitchuban_shield_mult', mult.toString());
  }
  return mult;
}

export function validateBuildings(buildings) {
  // Check each building is within bounds and not inside colliders (basic bounds check)
  const valid = [];
  let removed = 0;
  for (const b of buildings) {
    if (!b.type || typeof b.x !== 'number' || typeof b.z !== 'number') {
      removed++;
      continue;
    }
    if (Math.abs(b.x) > 900 || Math.abs(b.z) > 700) {
      console.warn(`[ANTICHEAT] Removed building out of bounds at ${b.x},${b.z}`);
      removed++;
      continue;
    }
    // Type must be known
    const knownTypes = ['wall','tower','shelter','chest','fire','barricade'];
    if (!knownTypes.includes(b.type)) {
      removed++;
      continue;
    }
    valid.push(b);
  }
  if (removed>0) console.log(`[ANTICHEAT] Removed ${removed} invalid buildings`);
  return valid;
}

export function createChecksum(data) {
  // Simple checksum for localStorage - not cryptographic, just to detect manual edits
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i=0;i<str.length;i++) {
    const char = str.charCodeAt(i);
    hash = ((hash<<5)-hash)+char;
    hash = hash & hash; // 32bit
  }
  return hash.toString(36);
}

export function saveWithChecksum(key, data) {
  const checksum = createChecksum(data);
  localStorage.setItem(key, JSON.stringify(data));
  localStorage.setItem(key+'_checksum', checksum);
}

export function loadWithChecksum(key, defaultVal) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultVal;
    const data = JSON.parse(raw);
    const storedChecksum = localStorage.getItem(key+'_checksum');
    const calcChecksum = createChecksum(data);
    if (storedChecksum && storedChecksum !== calcChecksum) {
      console.warn(`[ANTICHEAT] Checksum mismatch for ${key} - possible manual edit, resetting to default`);
      return defaultVal;
    }
    return data;
  } catch {
    return defaultVal;
  }
}

// Fix projectile tunneling - use raycast
export function raycastColliders(start, end, colliders) {
  // Simple ray-box intersection to prevent tunneling
  const dir = { x: end.x-start.x, y: end.y-start.y, z: end.z-start.z };
  const len = Math.sqrt(dir.x*dir.x + dir.y*dir.y + dir.z*dir.z);
  if (len < 0.001) return null;
  const invDir = { x: 1/dir.x, y: 1/dir.y, z: 1/dir.z };
  const steps = Math.ceil(len / 0.5); // Check every 0.5 units
  for (let i=0;i<=steps;i++) {
    const t = i/steps;
    const p = {
      x: start.x + dir.x*t,
      y: start.y + dir.y*t,
      z: start.z + dir.z*t,
    };
    for (const box of colliders) {
      if (p.x >= box.min.x && p.x <= box.max.x &&
          p.y >= box.min.y && p.y <= box.max.y &&
          p.z >= box.min.z && p.z <= box.max.z) {
        return { point: p, box, t };
      }
    }
  }
  return null;
}

// Fix enemy stuck - detect if velocity near zero for long time and unstuck
export class StuckDetector {
  constructor() {
    this.positions = new Map(); // enemyId -> {pos, timer}
  }

  check(enemy, dt) {
    const id = enemy.voiceId || enemy.type;
    const last = this.positions.get(id);
    if (!last) {
      this.positions.set(id, { pos: enemy.position.clone(), timer: 0 });
      return false;
    }
    const dist = enemy.position.distanceTo(last.pos);
    if (dist < 0.2) {
      last.timer += dt;
      if (last.timer > 3.0) {
        // Stuck for 3 seconds - unstuck
        console.log(`[ANTICHEAT] Unstuck enemy ${id} at ${enemy.position.x.toFixed(1)},${enemy.position.z.toFixed(1)}`);
        // Teleport slightly and give random wander
        enemy.position.x += (Math.random()-0.5)*4;
        enemy.position.z += (Math.random()-0.5)*4;
        enemy.wander.set(Math.random()-0.5,0,Math.random()-0.5).normalize().multiplyScalar(enemy.speed);
        enemy.wanderT = 2+Math.random()*2;
        last.timer = 0;
        last.pos.copy(enemy.position);
        return true;
      }
    } else {
      last.timer = 0;
      last.pos.copy(enemy.position);
    }
    return false;
  }
}
