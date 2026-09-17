import * as THREE from 'three';
import { buildWorld } from './world.js';
import { Player } from './player.js';
import { Enemy, Pilum } from './enemy.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.05, 500);
scene.add(camera);

buildWorld(scene);
const player = new Player(camera, renderer.domElement);

// ---------- UI ----------
const ui = {
  wave: document.getElementById('wave'),
  kills: document.getElementById('kills'),
  remaining: document.getElementById('remaining'),
  health: document.getElementById('health'),
  healthtxt: document.getElementById('healthtxt'),
  stamina: document.getElementById('stamina'),
  pila: document.getElementById('pilacount'),
  message: document.getElementById('message'),
  damage: document.getElementById('damage'),
  menu: document.getElementById('menu'),
  play: document.getElementById('play'),
  death: document.getElementById('deathmsg'),
};
let msgTimer = 0;
function showMessage(text, seconds = 2.5) { ui.message.textContent = text; ui.message.style.opacity = 1; msgTimer = seconds; }

// ---------- Audio (procedural, no assets) ----------
let actx;
function sfx(type) {
  try {
    actx ??= new (window.AudioContext || window.webkitAudioContext)();
    const t = actx.currentTime;
    const o = actx.createOscillator(), g = actx.createGain();
    o.connect(g); g.connect(actx.destination);
    if (type === 'swing') { o.type = 'sawtooth'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.15); g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); }
    else if (type === 'hit') { o.type = 'square'; o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.1); g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.15); }
    else if (type === 'block') { o.type = 'triangle'; o.frequency.setValueAtTime(900, t); o.frequency.exponentialRampToValueAtTime(300, t + 0.08); g.gain.setValueAtTime(0.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12); }
    else if (type === 'hurt') { o.type = 'sawtooth'; o.frequency.setValueAtTime(90, t); o.frequency.linearRampToValueAtTime(50, t + 0.25); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3); }
    else if (type === 'horn') { o.type = 'sawtooth'; o.frequency.setValueAtTime(220, t); o.frequency.setValueAtTime(330, t + 0.3); g.gain.setValueAtTime(0.08, t); g.gain.linearRampToValueAtTime(0.08, t + 0.6); g.gain.exponentialRampToValueAtTime(0.001, t + 1.2); }
    o.start(t); o.stop(t + 1.3);
  } catch { /* audio not available */ }
}

// ---------- Game state ----------
let enemies = [];
let pila = [];
let wave = 0, kills = 0;
let running = false;
let waveCooldown = 0;

const spawnPoints = [
  [-70, -50], [70, -50], [-70, 50], [70, 50], [0, -56], [-40, 0], [40, 0], [-72, 0], [72, 0], [0, 56],
];

function spawnWave() {
  wave++;
  const count = 3 + wave * 2;
  for (let i = 0; i < count; i++) {
    const sp = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
    const pos = new THREE.Vector3(sp[0] + (Math.random() - 0.5) * 6, 0, sp[1] + (Math.random() - 0.5) * 6);
    // don't spawn on top of the player
    if (pos.distanceTo(player.position) < 15) pos.multiplyScalar(-1);
    const type = wave >= 3 && Math.random() < 0.15 + wave * 0.04 ? 'brute' : 'rebel';
    enemies.push(new Enemy(scene, pos, type));
  }
  player.pila = Math.min(5, player.pila + 2);
  showMessage(`WAVE ${toRoman(wave)}`);
  sfx('horn');
}

function toRoman(n) {
  const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
  let s = ''; for (const [v, r] of m) while (n >= v) { s += r; n -= v; } return s;
}

function resetGame() {
  enemies.forEach(e => scene.remove(e.group, e.pool ?? new THREE.Object3D()));
  pila.forEach(p => scene.remove(p.mesh));
  enemies = []; pila = []; wave = 0; kills = 0;
  player.health = 100; player.stamina = 100; player.pila = 3;
  player.position.set(0, 1.75, 40); player.velocity.set(0, 0, 0); player.yaw = 0; player.pitch = 0;
  waveCooldown = 1.5;
}

// ---------- Pointer lock / menu ----------
ui.play.addEventListener('click', () => {
  if (player.health <= 0 || wave === 0) resetGame();
  renderer.domElement.requestPointerLock();
});
document.addEventListener('pointerlockchange', () => {
  player.locked = document.pointerLockElement === renderer.domElement;
  running = player.locked;
  ui.menu.style.display = running ? 'none' : 'flex';
  if (!running && player.health > 0 && wave > 0) { ui.play.textContent = 'RESUME'; ui.death.textContent = ''; }
});

// ---------- Combat helpers ----------
function meleeHit() {
  // Sweep: enemies within 2.6m and inside a ~50° cone in front of the player
  const fwd = player.forward;
  const hits = [];
  for (const e of enemies) {
    if (e.dead) continue;
    const to = new THREE.Vector3().subVectors(e.position, player.position).setY(0);
    const d = to.length();
    if (d > 2.8 * e.scale) continue;
    to.normalize();
    if (fwd.dot(to) > 0.65) hits.push({ e, d });
  }
  hits.sort((a, b) => a.d - b.d);
  return hits.slice(0, 2).map(h => h.e);
}

// ---------- Loop ----------
const clock = new THREE.Clock();
let dmgFlash = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(0.05, clock.getDelta());
  if (running && player.health > 0) {
    player.update(dt);

    // melee
    if (player.attackT > 0 && player.attackT < 0.05) sfx('swing');
    if (player.consumeHitWindow()) {
      const targets = meleeHit();
      if (targets.length) sfx('hit');
      for (const e of targets) {
        e.takeDamage(35, new THREE.Vector3().subVectors(e.position, player.position));
        if (e.dead) { kills++; }
      }
    }
    // pilum throw
    if (player.consumeThrow()) {
      const dir = new THREE.Vector3(); camera.getWorldDirection(dir);
      const origin = player.position.clone().add(dir.clone().multiplyScalar(0.8)).add(new THREE.Vector3(0, -0.15, 0));
      pila.push(new Pilum(scene, origin, dir));
      sfx('swing');
    }
    for (const p of pila) {
      const hit = p.update(dt, enemies);
      if (hit) { hit.takeDamage(70, p.velocity); sfx('hit'); if (hit.dead) kills++; }
    }
    pila = pila.filter(p => !p.removed);

    // enemies
    for (const e of enemies) {
      const ev = e.update(dt, player, enemies);
      if (ev) {
        const r = player.takeDamage(ev.damage, ev.dir);
        if (r === 'blocked') { sfx('block'); e.velocity.add(ev.dir.clone().negate().multiplyScalar(4)); }
        else { sfx('hurt'); dmgFlash = 1; player.velocity.add(ev.dir.clone().multiplyScalar(3)); }
      }
    }
    enemies = enemies.filter(e => !e.removed);

    // wave management
    const alive = enemies.filter(e => !e.dead).length;
    if (alive === 0) {
      waveCooldown -= dt;
      if (waveCooldown <= 0) { spawnWave(); waveCooldown = 4; if (wave > 1) player.health = Math.min(100, player.health + 25); }
    }

    // passive regen when out of combat
    if (alive === 0 && player.health < 100) player.health = Math.min(100, player.health + 3 * dt);

    // death
    if (player.health <= 0) {
      document.exitPointerLock();
      ui.play.textContent = 'FIGHT AGAIN';
      ui.death.textContent = `You fell in the Forum on wave ${toRoman(wave)} with ${kills} enemies slain. Ave atque vale.`;
      sfx('hurt');
    }

    // HUD
    ui.wave.textContent = toRoman(Math.max(1, wave));
    ui.kills.textContent = kills;
    ui.remaining.textContent = alive;
    ui.health.style.width = player.health + '%';
    ui.healthtxt.textContent = Math.ceil(player.health);
    ui.stamina.style.width = player.stamina + '%';
    ui.pila.textContent = player.pila;
  }
  if (msgTimer > 0) { msgTimer -= dt; if (msgTimer <= 0) ui.message.style.opacity = 0; }
  dmgFlash = Math.max(0, dmgFlash - dt * 2);
  ui.damage.style.opacity = dmgFlash * 0.9 + (player.health < 30 ? (1 - player.health / 30) * 0.5 : 0);

  renderer.render(scene, camera);
}
tick();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
