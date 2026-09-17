import * as THREE from 'three';

function makeCanvasTexture(draw, size = 512, repeat = 1, colorSpace = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (colorSpace) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function heightToNormalMap(heightCanvas, strength = 1.2) {
  const w = heightCanvas.width, h = heightCanvas.height;
  const ctx = heightCanvas.getContext('2d');
  const img = ctx.getImageData(0, 0, w, h);
  const data = img.data;
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const octx = out.getContext('2d');
  const oimg = octx.createImageData(w, h);
  const getH = (x, y) => {
    x = (x + w) % w; y = (y + h) % h;
    const i = (y * w + x) * 4;
    return data[i] / 255;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = getH(x + 1, y) - getH(x - 1, y);
      const dy = getH(x, y + 1) - getH(x, y - 1);
      let nx = -dx * strength;
      let ny = -dy * strength;
      let nz = 1;
      const len = Math.hypot(nx, ny, nz) || 1;
      nx /= len; ny /= len; nz /= len;
      const i = (y * w + x) * 4;
      oimg.data[i] = (nx * 0.5 + 0.5) * 255;
      oimg.data[i + 1] = (ny * 0.5 + 0.5) * 255;
      oimg.data[i + 2] = nz * 255;
      oimg.data[i + 3] = 255;
    }
  }
  octx.putImageData(oimg, 0, 0);
  const tex = new THREE.CanvasTexture(out);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeHeightCanvas(draw, size = 512) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  draw(ctx, size);
  return c;
}

// --- Marble Pentelic (white with grey/gold veins) ---
function createMarbleTextures(size = 512) {
  const albedo = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#f7f1e5';
    ctx.fillRect(0, 0, s, s);
    // base mottling
    for (let i = 0; i < 600; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      const r = Math.random() * 18 + 2;
      const v = 235 + Math.random() * 20;
      ctx.fillStyle = `rgba(${v},${v - 2},${v - 8},0.08)`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    // veins
    ctx.lineWidth = 1.2;
    for (let v = 0; v < 14; v++) {
      ctx.beginPath();
      let x = Math.random() * s, y = Math.random() * s;
      ctx.moveTo(x, y);
      const col = Math.random() < 0.7 ? `rgba(120,115,110,${0.18 + Math.random() * 0.18})` : `rgba(180,150,90,${0.12 + Math.random() * 0.12})`;
      ctx.strokeStyle = col;
      for (let k = 0; k < 8; k++) {
        x += (Math.random() - 0.5) * s * 0.5;
        y += (Math.random() - 0.5) * s * 0.5;
        const cx = x + (Math.random() - 0.5) * 40;
        const cy = y + (Math.random() - 0.5) * 40;
        ctx.quadraticCurveTo(cx, cy, x, y);
      }
      ctx.stroke();
    }
  }, size, 1);

  const heightCanvas = makeHeightCanvas((ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.fillStyle = `rgba(${120 + Math.random() * 40},${120 + Math.random() * 40},${120 + Math.random() * 40},0.06)`;
      ctx.beginPath(); ctx.arc(x, y, Math.random() * 12 + 2, 0, Math.PI * 2); ctx.fill();
    }
  }, size);

  const normal = heightToNormalMap(heightCanvas, 0.6);
  const rough = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 500; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.07})`;
      ctx.fillRect(x, y, Math.random() * 3 + 1, Math.random() * 20 + 2);
    }
  }, size, 1, false);

  return { albedo, normal, rough };
}

// Travertine / Forum ground - large slabs with pits and wear
function createTravertineTextures(size = 512) {
  const albedo = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#c9b896';
    ctx.fillRect(0, 0, s, s);
    // slabs
    const cols = 3, rows = 3;
    const cw = s / cols, rh = s / rows;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ox = x * cw, oy = y * rh;
        const shade = 185 + Math.random() * 25;
        ctx.fillStyle = `rgb(${shade + 10},${shade},${shade - 15})`;
        ctx.fillRect(ox + 2, oy + 2, cw - 4, rh - 4);
        // inner noise
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
          ctx.fillRect(ox + Math.random() * cw, oy + Math.random() * rh, 2, 2);
        }
        // pits
        for (let p = 0; p < 18; p++) {
          ctx.fillStyle = `rgba(90,75,55,${0.15 + Math.random() * 0.2})`;
          ctx.beginPath();
          ctx.arc(ox + Math.random() * cw, oy + Math.random() * rh, Math.random() * 3 + 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    // cracks / mortar
    ctx.strokeStyle = 'rgba(80,65,50,0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, s, s);
    for (let y = 1; y < rows; y++) { ctx.beginPath(); ctx.moveTo(0, y * rh); ctx.lineTo(s, y * rh); ctx.stroke(); }
    for (let x = 1; x < cols; x++) { ctx.beginPath(); ctx.moveTo(x * cw, 0); ctx.lineTo(x * cw, s); ctx.stroke(); }
  }, size, 2);

  const heightCanvas = makeHeightCanvas((ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    const cols = 3, rows = 3;
    const cw = s / cols, rh = s / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      ctx.fillStyle = '#707070';
      ctx.fillRect(x * cw, y * rh, cw, 2);
      ctx.fillRect(x * cw, y * rh, 2, rh);
    }
    for (let i = 0; i < 200; i++) {
      ctx.fillStyle = `rgba(0,0,0,${0.2 + Math.random() * 0.3})`;
      ctx.beginPath(); ctx.arc(Math.random() * s, Math.random() * s, Math.random() * 2 + 0.5, 0, Math.PI * 2); ctx.fill();
    }
  }, size);

  const normal = heightToNormalMap(heightCanvas, 1.5);
  const rough = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#8c8c8c';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, Math.random() * 20 + 5, Math.random() * 2 + 1);
    }
  }, size, 2, false);

  return { albedo, normal, rough };
}

// Terracotta roof tiles
function createTerracottaTextures(size = 512) {
  const albedo = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#8a3a28';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const rh = s / rows;
    for (let y = 0; y < rows; y++) {
      const off = (y % 2) * (s / 16);
      for (let x = -1; x < 16; x++) {
        const rx = x * (s / 8) + off;
        const hue = 12 + Math.random() * 8;
        const sat = 55 + Math.random() * 20;
        const light = 38 + Math.random() * 14;
        ctx.fillStyle = `hsl(${hue},${sat}%,${light}%)`;
        // tile shape with overlap
        ctx.beginPath();
        ctx.roundRect(rx + 2, y * rh + 2, s / 8 - 4, rh - 3, [rh * 0.5, rh * 0.5, 2, 2]);
        ctx.fill();
        // highlight top edge
        ctx.fillStyle = `hsla(${hue},${sat}%,${light + 15}%,0.35)`;
        ctx.fillRect(rx + 2, y * rh + 2, s / 8 - 4, 3);
      }
    }
  }, size, 3);

  const heightCanvas = makeHeightCanvas((ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    const rows = 8; const rh = s / rows;
    for (let y = 0; y < rows; y++) {
      ctx.fillStyle = '#606060';
      ctx.fillRect(0, y * rh + rh - 2, s, 2);
      ctx.fillStyle = '#a0a0a0';
      ctx.fillRect(0, y * rh, s, 3);
    }
  }, size);

  const normal = heightToNormalMap(heightCanvas, 2.0);
  const rough = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(0, 0, s, s);
  }, size, 3, false);

  return { albedo, normal, rough };
}

// Roman brick
function createBrickTextures(size = 512) {
  const albedo = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#6b2f1f';
    ctx.fillRect(0, 0, s, s);
    const bh = s / 10, bw = s / 4;
    for (let y = 0; y < 10; y++) {
      const off = (y % 2) * bw / 2;
      for (let x = -1; x < 5; x++) {
        const rx = x * bw + off;
        const hue = 10 + Math.random() * 12;
        const sat = 50 + Math.random() * 20;
        const light = 28 + Math.random() * 16;
        ctx.fillStyle = `hsl(${hue},${sat}%,${light}%)`;
        ctx.fillRect(rx + 3, y * bh + 3, bw - 6, bh - 6);
        // brick irregularity
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.08})`;
        ctx.fillRect(rx + 3, y * bh + 3, bw - 6, bh * 0.15);
      }
    }
  }, size, 3);

  const heightCanvas = makeHeightCanvas((ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    const bh = s / 10, bw = s / 4;
    for (let y = 0; y < 10; y++) {
      for (let x = -1; x < 5; x++) {
        ctx.fillStyle = '#505050';
        ctx.fillRect(x * bw + (y % 2) * bw / 2, y * bh, bw, 2);
        ctx.fillRect(x * bw + (y % 2) * bw / 2, y * bh, 2, bh);
      }
    }
  }, size);

  const normal = heightToNormalMap(heightCanvas, 1.8);
  const rough = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, 0, s, s);
  }, size, 3, false);

  return { albedo, normal, rough };
}

// Mosaic
function createMosaicTexture(size = 512) {
  const albedo = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#e8dcc0';
    ctx.fillRect(0, 0, s, s);
    const tile = 16;
    const colors = ['#b03030', '#2a4a8a', '#d9a441', '#2f5a2a', '#1a1a1a', '#e8e0c8', '#8a6d3b'];
    for (let y = 0; y < s; y += tile) {
      for (let x = 0; x < s; x += tile) {
        const c = colors[Math.floor(Math.random() * colors.length)];
        // slight random offset for handmade look
        const ox = (Math.random() - 0.5) * 2, oy = (Math.random() - 0.5) * 2;
        ctx.fillStyle = c;
        ctx.fillRect(x + 1 + ox, y + 1 + oy, tile - 3, tile - 3);
        // highlight
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.fillRect(x + 1 + ox, y + 1 + oy, tile - 3, 2);
      }
    }
    // geometric pattern in center (e.g., meander)
    ctx.strokeStyle = 'rgba(0,0,0,0.25)';
    ctx.lineWidth = 1;
    for (let i = 0; i < s; i += tile) {
      ctx.strokeRect(i + 0.5, 0.5, tile - 1, tile - 1);
    }
  }, size, 1);

  const normal = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#8080ff';
    ctx.fillRect(0, 0, s, s);
  }, size, 1, false);
  normal.colorSpace = THREE.NoColorSpace;

  return { albedo, normal, rough: null };
}

// Wood aged
function createWoodTexture(size = 512) {
  const albedo = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#5a3a1e';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      const n = Math.sin(y * 0.05) * 20 + Math.sin(y * 0.01) * 30;
      const shade = 50 + n + Math.random() * 10;
      ctx.fillStyle = `rgba(${shade + 20},${shade},${shade - 10},0.15)`;
      ctx.fillRect(0, y, s, 1);
    }
    for (let i = 0; i < 12; i++) {
      const x = Math.random() * s;
      ctx.strokeStyle = `rgba(30,20,10,${0.1 + Math.random() * 0.2})`;
      ctx.lineWidth = 1 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + (Math.random() - 0.5) * 40, s * 0.33, x + (Math.random() - 0.5) * 40, s * 0.66, x, s);
      ctx.stroke();
    }
  }, size, 2);

  const heightCanvas = makeHeightCanvas((ctx, s) => {
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.sin(y * 0.05) * 0.05 + 0.05})`;
      ctx.fillRect(0, y, s, 1);
    }
  }, size);

  const normal = heightToNormalMap(heightCanvas, 1.0);
  const rough = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(0, 0, s, s);
  }, size, 2, false);

  return { albedo, normal, rough };
}

// Shield painted texture - red with golden eagle
function createScutumTexture(size = 512) {
  const albedo = makeCanvasTexture((ctx, s) => {
    ctx.fillStyle = '#9a1a1a';
    ctx.fillRect(0, 0, s, s);
    // wood planks vertical
    for (let x = 0; x < s; x += s / 6) {
      ctx.fillStyle = `rgba(0,0,0,${0.08})`;
      ctx.fillRect(x, 0, 2, s);
    }
    // golden border
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, s - 16, s - 16);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#8c6b2f';
    ctx.strokeRect(18, 18, s - 36, s - 36);

    // Eagle (simplified)
    ctx.save();
    ctx.translate(s / 2, s / 2);
    ctx.fillStyle = '#d9a441';
    // wings
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.15);
    ctx.quadraticCurveTo(-s * 0.28, -s * 0.05, -s * 0.38, s * 0.08);
    ctx.quadraticCurveTo(-s * 0.15, s * 0.05, 0, s * 0.12);
    ctx.quadraticCurveTo(s * 0.15, s * 0.05, s * 0.38, s * 0.08);
    ctx.quadraticCurveTo(s * 0.28, -s * 0.05, 0, -s * 0.15);
    ctx.fill();
    // head
    ctx.beginPath();
    ctx.arc(s * 0.02, -s * 0.18, s * 0.06, 0, Math.PI * 2);
    ctx.fill();
    // SPQR
    ctx.fillStyle = '#ffd777';
    ctx.font = `bold ${s * 0.08}px Georgia`;
    ctx.textAlign = 'center';
    ctx.fillText('SPQR', 0, s * 0.32);
    ctx.restore();

    // wear
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * s, Math.random() * s, Math.random() * 3 + 1, Math.random() * 12 + 1);
    }
  }, size, 1);

  return albedo;
}

// Blood splatter
function createBloodTexture(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  // central blob
  ctx.fillStyle = 'rgba(90,10,10,0.95)';
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  // splatter rays
  for (let i = 0; i < 24; i++) {
    const ang = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const len = size * (0.25 + Math.random() * 0.35);
    const w = 2 + Math.random() * 6;
    ctx.strokeStyle = `rgba(110,15,15,${0.5 + Math.random() * 0.5})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(size / 2 + Math.cos(ang) * size * 0.18, size / 2 + Math.sin(ang) * size * 0.18);
    ctx.lineTo(size / 2 + Math.cos(ang) * len, size / 2 + Math.sin(ang) * len);
    ctx.stroke();
    // droplets
    ctx.fillStyle = `rgba(90,10,10,${0.6 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(size / 2 + Math.cos(ang) * len, size / 2 + Math.sin(ang) * len, Math.random() * 4 + 1, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createFireTexture(size = 128) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const grad = ctx.createRadialGradient(size / 2, size * 0.7, 0, size / 2, size * 0.7, size / 2);
  grad.addColorStop(0, 'rgba(255,240,180,1)');
  grad.addColorStop(0.2, 'rgba(255,180,40,0.9)');
  grad.addColorStop(0.45, 'rgba(255,80,10,0.6)');
  grad.addColorStop(0.7, 'rgba(120,10,0,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Build materials
const marbleTex = createMarbleTextures(512);
const travertineTex = createTravertineTextures(512);
const terracottaTex = createTerracottaTextures(512);
const brickTex = createBrickTextures(512);
const mosaicTex = createMosaicTexture(512);
const woodTex = createWoodTexture(512);

export const MAT = {
  marble: new THREE.MeshStandardMaterial({
    map: marbleTex.albedo,
    normalMap: marbleTex.normal,
    normalScale: new THREE.Vector2(0.6, 0.6),
    roughnessMap: marbleTex.rough,
    roughness: 0.45,
    metalness: 0.05,
  }),
  marblePolished: new THREE.MeshStandardMaterial({
    map: marbleTex.albedo,
    normalMap: marbleTex.normal,
    roughness: 0.25,
    metalness: 0.02,
    envMapIntensity: 0.6,
  }),
  travertine: new THREE.MeshStandardMaterial({
    map: travertineTex.albedo,
    normalMap: travertineTex.normal,
    normalScale: new THREE.Vector2(1.0, 1.0),
    roughnessMap: travertineTex.rough,
    roughness: 0.85,
    metalness: 0,
  }),
  ground: new THREE.MeshStandardMaterial({
    map: travertineTex.albedo,
    normalMap: travertineTex.normal,
    roughnessMap: travertineTex.rough,
    roughness: 0.9,
    metalness: 0,
  }),
  terracotta: new THREE.MeshStandardMaterial({
    map: terracottaTex.albedo,
    normalMap: terracottaTex.normal,
    roughness: 0.9,
    metalness: 0,
  }),
  brick: new THREE.MeshStandardMaterial({
    map: brickTex.albedo,
    normalMap: brickTex.normal,
    roughness: 0.95,
    metalness: 0,
  }),
  mosaic: new THREE.MeshStandardMaterial({
    map: mosaicTex.albedo,
    roughness: 0.6,
    metalness: 0.05,
  }),
  wood: new THREE.MeshStandardMaterial({
    map: woodTex.albedo,
    normalMap: woodTex.normal,
    roughness: 0.8,
    metalness: 0,
  }),
  woodDark: new THREE.MeshStandardMaterial({
    map: woodTex.albedo,
    color: 0x4a2e15,
    roughness: 0.85,
  }),
  bronze: new THREE.MeshStandardMaterial({
    color: 0x8c6b2f,
    metalness: 0.85,
    roughness: 0.35,
  }),
  gold: new THREE.MeshStandardMaterial({
    color: 0xd9a441,
    metalness: 0.95,
    roughness: 0.25,
    emissive: 0x221100,
    emissiveIntensity: 0.08,
  }),
  iron: new THREE.MeshStandardMaterial({
    color: 0xb8bcc2,
    metalness: 0.9,
    roughness: 0.3,
  }),
  ironDark: new THREE.MeshStandardMaterial({
    color: 0x5a5a5a,
    metalness: 0.8,
    roughness: 0.6,
  }),
  skin: new THREE.MeshStandardMaterial({ color: 0xc9a07a, roughness: 0.7 }),
  tunic: [
    new THREE.MeshStandardMaterial({ color: 0x5a5a6a, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x6b4a2a, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x3d5a3a, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x7a3a3a, roughness: 0.9 }),
  ],
  blood: new THREE.MeshStandardMaterial({
    map: createBloodTexture(256),
    transparent: true,
    roughness: 0.3,
    metalness: 0,
    depthWrite: false,
  }),
  water: new THREE.MeshStandardMaterial({
    color: 0x3a6f8a,
    roughness: 0.1,
    metalness: 0.2,
    transparent: true,
    opacity: 0.82,
  }),
  scutum: new THREE.MeshStandardMaterial({
    map: createScutumTexture(512),
    roughness: 0.7,
    metalness: 0.15,
  }),
  fire: createFireTexture(128),
};

MAT.travertine.map.repeat.set(8, 8);
MAT.ground.map.repeat.set(12, 12);
if (MAT.ground.normalMap) MAT.ground.normalMap.repeat.set(12, 12);
if (MAT.ground.roughnessMap) MAT.ground.roughnessMap.repeat.set(12, 12);
MAT.brick.map.repeat.set(4, 2);
if (MAT.brick.normalMap) MAT.brick.normalMap.repeat.set(4, 2);
MAT.terracotta.map.repeat.set(4, 2);
MAT.wood.map.repeat.set(2, 1);
MAT.marble.map.repeat.set(2, 2);

// Ensure all textures have anisotropy
Object.values(MAT).forEach(m => {
  if (Array.isArray(m)) return;
  if (m.isMaterial) {
    ['map', 'normalMap', 'roughnessMap'].forEach(k => {
      if (m[k]) m[k].anisotropy = 8;
    });
  }
});
