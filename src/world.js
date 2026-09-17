import * as THREE from 'three';

// Simple procedural textures so there are no external assets.
function makeCanvasTexture(draw, size = 256, repeat = 1) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const stoneTex = makeCanvasTexture((ctx, s) => {
  ctx.fillStyle = '#b9a98a'; ctx.fillRect(0, 0, s, s);
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
    const off = (y % 2) * (s / 8);
    ctx.fillStyle = `hsl(38, ${20 + Math.random() * 10}%, ${60 + Math.random() * 12}%)`;
    ctx.fillRect(x * s / 4 + off + 2, y * s / 4 + 2, s / 4 - 4, s / 4 - 4);
  }
}, 256, 8);

const marbleTex = makeCanvasTexture((ctx, s) => {
  ctx.fillStyle = '#efe9dc'; ctx.fillRect(0, 0, s, s);
  ctx.strokeStyle = 'rgba(120,110,100,0.25)'; ctx.lineWidth = 2;
  for (let i = 0; i < 25; i++) {
    ctx.beginPath(); ctx.moveTo(Math.random() * s, Math.random() * s);
    for (let j = 0; j < 4; j++) ctx.lineTo(Math.random() * s, Math.random() * s);
    ctx.stroke();
  }
}, 256, 2);

const brickTex = makeCanvasTexture((ctx, s) => {
  ctx.fillStyle = '#7d3d2a'; ctx.fillRect(0, 0, s, s);
  const bh = s / 8, bw = s / 4;
  for (let y = 0; y < 8; y++) for (let x = -1; x < 5; x++) {
    const off = (y % 2) * bw / 2;
    ctx.fillStyle = `hsl(12, ${45 + Math.random() * 15}%, ${32 + Math.random() * 12}%)`;
    ctx.fillRect(x * bw + off + 2, y * bh + 2, bw - 4, bh - 4);
  }
}, 256, 4);

export const MAT = {
  stone: new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.9 }),
  marble: new THREE.MeshStandardMaterial({ map: marbleTex, roughness: 0.5 }),
  brick: new THREE.MeshStandardMaterial({ map: brickTex, roughness: 0.95 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x9a3b2a, roughness: 0.9 }),
  gold: new THREE.MeshStandardMaterial({ color: 0xd9a441, metalness: 0.8, roughness: 0.3 }),
  bronze: new THREE.MeshStandardMaterial({ color: 0x8c6b2f, metalness: 0.7, roughness: 0.4 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5a3a1e, roughness: 0.9 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x2a2320, roughness: 1 }),
  water: new THREE.MeshStandardMaterial({ color: 0x3a6f8a, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 }),
};

// Axis-aligned bounding boxes used for player/enemy collision.
export const colliders = [];

function addBox(scene, w, h, d, x, y, z, mat, solid = true, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = m.receiveShadow = true;
  scene.add(m);
  if (solid) {
    m.updateMatrixWorld();
    colliders.push(new THREE.Box3().setFromObject(m));
  }
  return m;
}

function column(scene, x, z, h = 7, r = 0.45) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 14), MAT.marble);
  shaft.position.y = h / 2; shaft.castShadow = shaft.receiveShadow = true;
  const base = new THREE.Mesh(new THREE.BoxGeometry(r * 3, 0.35, r * 3), MAT.marble);
  base.position.y = 0.17;
  const cap = new THREE.Mesh(new THREE.BoxGeometry(r * 3, 0.4, r * 3), MAT.marble);
  cap.position.y = h - 0.2;
  g.add(shaft, base, cap);
  g.position.set(x, 0, z);
  scene.add(g);
  colliders.push(new THREE.Box3(new THREE.Vector3(x - r, 0, z - r), new THREE.Vector3(x + r, h, z + r)));
}

function temple(scene, x, z, ry = 0) {
  const g = new THREE.Group();
  // podium
  const steps = 4;
  for (let i = 0; i < steps; i++) {
    const w = 26 - i * 1.2, d = 40 - i * 1.2;
    const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.5, d), MAT.marble);
    s.position.y = 0.25 + i * 0.5; s.receiveShadow = s.castShadow = true;
    g.add(s);
  }
  const top = steps * 0.5;
  // cella
  const cella = new THREE.Mesh(new THREE.BoxGeometry(16, 9, 28), MAT.marble);
  cella.position.set(0, top + 4.5, -2); cella.castShadow = cella.receiveShadow = true;
  g.add(cella);
  // roof
  const roofGeo = new THREE.CylinderGeometry(0, 1, 1, 3, 1);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(24, 0.8, 38), MAT.marble);
  roof.position.y = top + 9.4; g.add(roof);
  const ped = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 4), MAT.roof);
  const gable = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 12.5, 4.5, 4, 1, false, Math.PI / 4), MAT.roof);
  gable.scale.set(1, 1, 1.6); gable.position.y = top + 12; g.add(gable);
  // columns
  const ch = 9;
  for (let i = 0; i < 8; i++) {
    const cz = -17 + i * 34 / 7;
    [-11, 11].forEach(cx => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, ch, 14), MAT.marble);
      c.position.set(cx, top + ch / 2, cz); c.castShadow = true; g.add(c);
    });
  }
  for (let i = 0; i < 6; i++) {
    const cx = -11 + i * 22 / 5;
    [-17, 17].forEach(cz => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, ch, 14), MAT.marble);
      c.position.set(cx, top + ch / 2, cz); c.castShadow = true; g.add(c);
    });
  }
  // golden statue in the cella front
  const statue = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 2.4, 6, 12), MAT.gold);
  statue.position.set(0, top + 2.2, 15); g.add(statue);
  g.position.set(x, 0, z); g.rotation.y = ry;
  scene.add(g);
  g.updateMatrixWorld();
  colliders.push(new THREE.Box3().setFromObject(g));
}

function basilica(scene, x, z, w, d, ry = 0) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, 10, d), MAT.brick);
  body.position.y = 5; body.castShadow = body.receiveShadow = true; g.add(body);
  const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, w * 0.72, 3.5, 4, 1), MAT.roof);
  roof.rotation.y = Math.PI / 4; roof.scale.z = d / w; roof.position.y = 11.7; g.add(roof);
  // arches
  const n = Math.floor(d / 4);
  for (let i = 0; i < n; i++) {
    const az = -d / 2 + 2 + i * 4;
    [-1, 1].forEach(side => {
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.4, 4, 2.2), MAT.dark);
      a.position.set(side * (w / 2 + 0.05), 2.6, az); g.add(a);
      const arc = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.4, 12, 1, false, 0, Math.PI), MAT.dark);
      arc.rotation.z = Math.PI / 2; arc.rotation.y = Math.PI / 2; arc.position.set(side * (w / 2 + 0.05), 4.6, az); g.add(arc);
    });
  }
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  g.updateMatrixWorld();
  colliders.push(new THREE.Box3().setFromObject(g));
}

function arch(scene, x, z, ry = 0) {
  const g = new THREE.Group();
  const w = 12, h = 12, d = 4;
  [-1, 1].forEach(s => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(3, h - 3, d), MAT.marble);
    p.position.set(s * 4.5, (h - 3) / 2, 0); p.castShadow = p.receiveShadow = true; g.add(p);
    g.updateMatrixWorld();
  });
  const topB = new THREE.Mesh(new THREE.BoxGeometry(w, 3.5, d), MAT.marble);
  topB.position.y = h - 1.75; topB.castShadow = true; g.add(topB);
  const inscription = new THREE.Mesh(new THREE.BoxGeometry(8, 1.6, 0.1), MAT.bronze);
  inscription.position.set(0, h - 1.7, d / 2 + 0.05); g.add(inscription);
  const quad = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 2), MAT.gold);
  quad.position.y = h + 0.6; g.add(quad);
  g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
  g.updateMatrixWorld();
  // collide only with the piers so you can walk under
  const piers = new THREE.Box3();
  g.children.slice(0, 2).forEach(p => colliders.push(new THREE.Box3().setFromObject(p)));
  return piers;
}

function fountain(scene, x, z) {
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 4.4, 1, 24), MAT.marble);
  rim.position.set(x, 0.5, z); rim.castShadow = rim.receiveShadow = true; scene.add(rim);
  const water = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 0.2, 24), MAT.water);
  water.position.set(x, 0.95, z); scene.add(water);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.6, 3, 12), MAT.marble);
  pillar.position.set(x, 2.3, z); scene.add(pillar);
  const bowl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 0.6, 0.6, 16), MAT.marble);
  bowl.position.set(x, 3.6, z); scene.add(bowl);
  colliders.push(new THREE.Box3(new THREE.Vector3(x - 4.4, 0, z - 4.4), new THREE.Vector3(x + 4.4, 1, z + 4.4)));
}

function tree(scene, x, z) {
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.35, 5, 8), MAT.wood);
  trunk.position.set(x, 2.5, z); trunk.castShadow = true; scene.add(trunk);
  // cypress
  const crown = new THREE.Mesh(new THREE.ConeGeometry(1.1, 7, 8), new THREE.MeshStandardMaterial({ color: 0x2f5a2a, roughness: 1 }));
  crown.position.set(x, 7.5, z); crown.castShadow = true; scene.add(crown);
  colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.35, 0, z - 0.35), new THREE.Vector3(x + 0.35, 5, z + 0.35)));
}

export function buildWorld(scene) {
  // Sky & light
  scene.background = new THREE.Color(0xe8c9a0);
  scene.fog = new THREE.Fog(0xe8c9a0, 60, 220);
  const hemi = new THREE.HemisphereLight(0xfff1d6, 0x6b5a3e, 0.7);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe2b0, 2.0);
  sun.position.set(60, 80, -40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -110;
  sun.shadow.camera.right = sun.shadow.camera.top = 110;
  sun.shadow.camera.far = 300;
  sun.shadow.bias = -0.0005;
  scene.add(sun);

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), MAT.stone);
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  // Forum bounds: 160 x 120, city wall around it
  const W = 80, D = 60, wallH = 8;
  addBox(scene, W * 2 + 4, wallH, 4, 0, wallH / 2, -D - 2, MAT.brick);
  addBox(scene, W * 2 + 4, wallH, 4, 0, wallH / 2, D + 2, MAT.brick);
  addBox(scene, 4, wallH, D * 2, -W - 2, wallH / 2, 0, MAT.brick);
  addBox(scene, 4, wallH, D * 2, W + 2, wallH / 2, 0, MAT.brick);
  // towers
  [[-W, -D], [W, -D], [-W, D], [W, D]].forEach(([x, z]) => {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, 12, 12), MAT.brick);
    t.position.set(x, 6, z); t.castShadow = true; scene.add(t);
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4.6, 3, 12), MAT.roof);
    cone.position.set(x, 13.5, z); scene.add(cone);
  });

  // Landmarks
  temple(scene, 0, -38);                                // Temple of Jupiter at north
  basilica(scene, -52, 0, 18, 60);                      // Basilica Julia west
  basilica(scene, 52, 0, 18, 60);                       // Basilica Aemilia east
  arch(scene, 0, 45);                                   // Triumphal arch at south entrance
  fountain(scene, 0, 0);

  // Colonnades lining the central square
  for (let i = -5; i <= 5; i++) {
    column(scene, -28, i * 8);
    column(scene, 28, i * 8);
  }
  // rostra / speaker platform
  addBox(scene, 10, 1.6, 4, 0, 0.8, -14, MAT.marble);
  // Market stalls
  for (let i = 0; i < 4; i++) {
    const x = -20 + i * 13, z = 30;
    addBox(scene, 4, 1.2, 2, x, 0.6, z, MAT.wood);
    addBox(scene, 0.2, 3, 0.2, x - 1.8, 1.5, z - 0.9, MAT.wood, false);
    addBox(scene, 0.2, 3, 0.2, x + 1.8, 1.5, z - 0.9, MAT.wood, false);
    addBox(scene, 0.2, 3, 0.2, x - 1.8, 1.5, z + 0.9, MAT.wood, false);
    addBox(scene, 0.2, 3, 0.2, x + 1.8, 1.5, z + 0.9, MAT.wood, false);
    const awning = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.1, 2.8), new THREE.MeshStandardMaterial({ color: i % 2 ? 0xb03030 : 0xe8d8b0 }));
    awning.position.set(x, 3, z); awning.castShadow = true; scene.add(awning);
  }
  // Trees
  [[-40, -50], [40, -50], [-40, 50], [40, 50], [-65, 40], [65, 40], [-65, -40], [65, -40]].forEach(([x, z]) => tree(scene, x, z));
  // Statues on pedestals
  [[-14, 14], [14, 14], [-14, -26], [14, -26]].forEach(([x, z]) => {
    addBox(scene, 2, 2, 2, x, 1, z, MAT.marble);
    const st = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 1.6, 6, 10), MAT.bronze);
    st.position.set(x, 3.3, z); st.castShadow = true; scene.add(st);
  });

  return { bounds: { W: W - 1, D: D - 1 } };
}
