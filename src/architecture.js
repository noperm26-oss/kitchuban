import * as THREE from 'three';
import { MAT } from './materials.js';

export function createFlutedColumnGeometry(height, radiusTop, radiusBottom, flutes = 20, radialSegments = 80, heightSegments = 1, entasis = 0.02) {
  // radialSegments must be multiple of flutes
  radialSegments = Math.ceil(radialSegments / flutes) * flutes;
  const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSegments, heightSegments, true);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const fluteDepth = 0.035; // relative to radius

  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const yNorm = (v.y + height / 2) / height; // 0 bottom, 1 top
    // entasis: slight bulge in middle (max at 0.4 height)
    const ent = Math.sin(yNorm * Math.PI) * entasis;
    const angle = Math.atan2(v.z, v.x);
    // flute shape: semicircular groove, using cos squared
    // phase within flute
    const phase = (angle / (Math.PI * 2) * flutes) % 1;
    // groove: cos from -1 to 1 -> we want groove only on one side? Actually flutes are concave
    // Use smoothstep for fillet vs flute
    const fluteShape = Math.cos(phase * Math.PI * 2); // -1 to 1
    // Convert to groove: when fluteShape near 1, it's ridge, near -1 it's valley? Let's invert
    // We want depth max when fluteShape = -1 (valley)
    const groove = (1 - fluteShape) * 0.5; // 0 ridge, 1 valley
    // sharpen groove with pow
    const sharpGroove = Math.pow(groove, 0.7);
    const r = Math.hypot(v.x, v.z);
    const baseR = THREE.MathUtils.lerp(radiusBottom, radiusTop, yNorm) + ent * radiusBottom;
    const newR = baseR * (1 - sharpGroove * fluteDepth);
    const scale = newR / (r || 1);
    v.x *= scale;
    v.z *= scale;
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createCorinthianCapital(radius) {
  const group = new THREE.Group();
  const h = radius * 1.6;

  // lower ring (astragal)
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.95, radius * 0.07, 8, 20), MAT.marble);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.05;
  ring.castShadow = true;
  group.add(ring);

  // bell / kalathos - inverted slightly tapered
  const bellGeo = new THREE.CylinderGeometry(radius * 1.15, radius * 0.9, h * 0.85, 16);
  const bell = new THREE.Mesh(bellGeo, MAT.marble);
  bell.position.y = h * 0.5;
  bell.castShadow = true;
  group.add(bell);

  // acanthus leaves - 8 leaves around, 2 tiers
  for (let tier = 0; tier < 2; tier++) {
    const tierY = tier === 0 ? h * 0.25 : h * 0.55;
    const tierR = tier === 0 ? radius * 1.0 : radius * 1.08;
    const count = 8;
    for (let i = 0; i < count; i++) {
      const ang = (i / count) * Math.PI * 2 + (tier * Math.PI / count);
      const leafGroup = new THREE.Group();
      // leaf as scaled sphere + cone
      const leafBase = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 8, 6, 0, Math.PI * 2, 0, Math.PI * 0.6), MAT.marble);
      leafBase.scale.set(1, 1.6, 0.5);
      leafBase.rotation.x = -0.3;
      leafBase.position.y = 0.1;
      // small volute curl on top
      const curl = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.12, radius * 0.04, 6, 10, Math.PI), MAT.marble);
      curl.rotation.x = Math.PI / 2;
      curl.position.set(0, radius * 0.35, radius * 0.08);
      curl.rotation.z = Math.PI;
      leafGroup.add(leafBase, curl);
      leafGroup.position.set(Math.cos(ang) * tierR, tierY, Math.sin(ang) * tierR);
      leafGroup.lookAt(0, tierY, 0);
      leafGroup.rotateY(Math.PI);
      leafGroup.castShadow = true;
      group.add(leafGroup);
    }
  }

  // volutes at corners (4)
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const vol = new THREE.Group();
    const spiral = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.18, radius * 0.05, 6, 12, Math.PI * 1.5), MAT.marble);
    spiral.rotation.x = Math.PI / 2;
    spiral.position.y = h * 0.85;
    vol.add(spiral);
    const r = radius * 1.1;
    vol.position.set(Math.cos(ang) * r, 0, Math.sin(ang) * r);
    group.add(vol);
  }

  // abacus - square slab with concave sides
  const abacusSize = radius * 2.8;
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(abacusSize, radius * 0.35, abacusSize), MAT.marble);
  abacus.position.y = h + radius * 0.12;
  abacus.castShadow = true;
  abacus.receiveShadow = true;
  group.add(abacus);

  // flower on abacus center each side
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2;
    const flower = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.12, 8, 6), MAT.marble);
    flower.position.set(Math.cos(ang) * abacusSize * 0.45, h + radius * 0.12, Math.sin(ang) * abacusSize * 0.45);
    group.add(flower);
  }

  return group;
}

export function createEntablature(length, depth, height = 1.2) {
  const group = new THREE.Group();
  const architraveH = height * 0.35;
  const friezeH = height * 0.35;
  const corniceH = height * 0.3;

  // architrave - 3 fasciae
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(length, architraveH / 3, depth), MAT.marble);
    f.position.set(0, i * architraveH / 3 + architraveH / 6, i * 0.02);
    f.castShadow = true; f.receiveShadow = true;
    group.add(f);
  }

  // frieze with triglyphs / relief
  const frieze = new THREE.Mesh(new THREE.BoxGeometry(length, friezeH, depth * 1.05), MAT.marble);
  frieze.position.y = architraveH + friezeH / 2;
  frieze.castShadow = true; frieze.receiveShadow = true;
  group.add(frieze);

  // add triglyphs
  const trigCount = Math.floor(length / 1.2);
  for (let i = 0; i < trigCount; i++) {
    if (i % 2 === 0) {
      const trig = new THREE.Mesh(new THREE.BoxGeometry(0.25, friezeH * 0.9, depth * 1.08), MAT.marblePolished);
      trig.position.set(-length / 2 + 0.6 + i * (length / trigCount), architraveH + friezeH / 2, 0);
      // grooves
      for (let g = 0; g < 2; g++) {
        const groove = new THREE.Mesh(new THREE.BoxGeometry(0.04, friezeH * 0.85, depth * 1.09), new THREE.MeshStandardMaterial({ color: 0x2a2a2a }));
        groove.position.set(trig.position.x + (g - 0.5) * 0.12, trig.position.y, 0);
        group.add(groove);
      }
      group.add(trig);
    } else {
      // metope relief - small rosette
      const rosette = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.05, 8), MAT.gold);
      rosette.rotation.x = Math.PI / 2;
      rosette.position.set(-length / 2 + 0.6 + i * (length / trigCount), architraveH + friezeH / 2, depth * 0.55);
      group.add(rosette);
    }
  }

  // cornice - overhang with dentils
  const corniceBase = new THREE.Mesh(new THREE.BoxGeometry(length * 1.05, corniceH * 0.5, depth * 1.4), MAT.marble);
  corniceBase.position.set(0, architraveH + friezeH + corniceH * 0.25, depth * 0.1);
  corniceBase.castShadow = true;
  group.add(corniceBase);

  const corniceTop = new THREE.Mesh(new THREE.BoxGeometry(length * 1.08, corniceH * 0.3, depth * 1.5), MAT.marble);
  corniceTop.position.set(0, architraveH + friezeH + corniceH * 0.75, depth * 0.12);
  corniceTop.castShadow = true;
  group.add(corniceTop);

  // dentils
  const dentCount = Math.floor(length / 0.35);
  for (let i = 0; i < dentCount; i++) {
    const dent = new THREE.Mesh(new THREE.BoxGeometry(0.18, corniceH * 0.35, 0.18), MAT.marble);
    dent.position.set(-length / 2 + 0.2 + i * (length / dentCount), architraveH + friezeH + corniceH * 0.15, depth * 0.7);
    group.add(dent);
  }

  return group;
}

export function createPediment(width, depth, height) {
  const group = new THREE.Group();

  // triangular prism via Extrude
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, height);
  shape.lineTo(-width / 2, 0);

  const extrudeSettings = { depth: depth, bevelEnabled: false };
  const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const mesh = new THREE.Mesh(geom, MAT.marble);
  mesh.position.set(0, 0, -depth / 2);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  // cornice around pediment
  const corniceShape = new THREE.Shape();
  corniceShape.moveTo(-width / 2 - 0.3, -0.2);
  corniceShape.lineTo(width / 2 + 0.3, -0.2);
  corniceShape.lineTo(width / 2 + 0.3, 0);
  corniceShape.lineTo(-width / 2 - 0.3, 0);
  const corniceGeom = new THREE.ExtrudeGeometry(corniceShape, { depth: depth + 0.6, bevelEnabled: false });
  const cornice = new THREE.Mesh(corniceGeom, MAT.marble);
  cornice.position.set(0, 0, -depth / 2 - 0.3);
  group.add(cornice);

  // relief sculptures inside pediment
  // central figure
  const central = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), MAT.marble);
  torso.position.y = height * 0.45;
  central.add(torso);
  // side figures
  for (let side of [-1, 1]) {
    const fig = new THREE.Group();
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 4, 8), MAT.marble);
    t.position.y = height * 0.3;
    fig.add(t);
    fig.position.set(side * width * 0.28, 0, depth * 0.15);
    fig.rotation.z = side * -0.25;
    central.add(fig);
  }
  central.position.z = depth * 0.15;
  group.add(central);

  // antefixa along top edge
  for (let i = -width / 2 + 0.8; i < width / 2; i += 1.2) {
    const ante = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 8), MAT.terracotta);
    ante.rotation.x = Math.PI / 2;
    const y = Math.abs(i) / (width / 2) * height * 0.1 + height * (1 - Math.abs(i) / (width / 2) * 0.9);
    // actually along slope: y = height * (1 - |x|/(width/2))
    const slopeY = height * (1 - Math.abs(i) / (width / 2));
    ante.position.set(i, slopeY, depth / 2 + 0.1);
    group.add(ante);
  }

  return group;
}

export function createTiledRoof(width, depth, roofHeight) {
  const group = new THREE.Group();

  // two sloped planes
  const slopeLen = Math.hypot(width / 2, roofHeight);
  const angle = Math.atan2(roofHeight, width / 2);

  for (let side of [-1, 1]) {
    const roofSide = new THREE.Group();
    // base plane with terracotta material
    const planeGeo = new THREE.PlaneGeometry(slopeLen + 0.4, depth + 0.8, 1, 1);
    const plane = new THREE.Mesh(planeGeo, MAT.terracotta);
    plane.rotation.y = side * angle;
    // Actually need to rotate correctly: we want slope
    // Simpler: create box for roof half
    // We'll build tile rows as instanced meshes for detail
    const base = new THREE.Mesh(new THREE.BoxGeometry(slopeLen, 0.15, depth + 0.4), MAT.terracotta);
    base.position.set(side * (width / 4), roofHeight / 2, 0);
    base.rotation.z = side * angle;
    base.castShadow = true;
    base.receiveShadow = true;
    roofSide.add(base);

    // tile rows
    const rows = Math.floor(slopeLen / 0.35);
    const tileGeo = new THREE.BoxGeometry(0.32, 0.06, 0.42);
    const tileMat = MAT.terracotta;
    const instCount = rows * Math.floor(depth / 0.45);
    // For performance, use simple meshes for first few rows near edge, otherwise rely on texture
    // We'll just add ridge tiles as detail
    roofSide.add(base);
    group.add(roofSide);
  }

  // ridge beam
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, depth + 0.6), MAT.terracotta);
  ridge.position.y = roofHeight + 0.1;
  ridge.castShadow = true;
  group.add(ridge);

  // ridge tiles (semi-circular)
  const ridgeTileCount = Math.floor(depth / 0.5);
  for (let i = 0; i < ridgeTileCount; i++) {
    const rt = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.5, 8, 1, false, 0, Math.PI), MAT.terracotta);
    rt.rotation.z = Math.PI / 2;
    rt.rotation.x = Math.PI / 2;
    rt.position.set(0, roofHeight + 0.28, -depth / 2 + 0.25 + i * 0.5);
    group.add(rt);
  }

  // antefixes along eaves
  for (let side of [-1, 1]) {
    const eaveX = side * (width / 2 + 0.15);
    for (let z = -depth / 2 + 0.3; z < depth / 2; z += 0.6) {
      const ante = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.28, 0.32), MAT.terracotta);
      ante.position.set(eaveX, 0.12, z);
      group.add(ante);
    }
  }

  return group;
}

export function createRomanStatue(scale = 1) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.35 * scale, 1.4 * scale, 6, 10), MAT.marble);
  body.position.y = 1.1 * scale;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28 * scale, 12, 10), MAT.marble);
  head.position.y = 2.15 * scale;
  head.castShadow = true;
  g.add(head);
  // toga drapery
  const toga = new THREE.Mesh(new THREE.CylinderGeometry(0.38 * scale, 0.45 * scale, 1.2 * scale, 10, 1, true), MAT.marble);
  toga.position.set(0.05 * scale, 1.0 * scale, 0);
  toga.rotation.z = -0.15;
  g.add(toga);
  // arm
  const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08 * scale, 0.6 * scale, 4, 8), MAT.marble);
  arm.position.set(0.35 * scale, 1.3 * scale, 0);
  arm.rotation.z = -0.6;
  g.add(arm);

  return g;
}

export function createBronzeStatue(scale = 1) {
  const g = createRomanStatue(scale);
  g.traverse(o => { if (o.isMesh) o.material = MAT.bronze; });
  return g;
}
