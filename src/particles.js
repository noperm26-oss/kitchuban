import * as THREE from 'three';
import { MAT } from './materials.js';

export class DustSystem {
  constructor(scene, count = 400, bounds = { x: 80, z: 60, y: 20 }) {
    this.scene = scene;
    this.bounds = bounds;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * bounds.x * 2;
      positions[i * 3 + 1] = Math.random() * bounds.y + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * bounds.z * 2;
      velocities[i * 3] = (Math.random() - 0.5) * 0.3;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.15;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
      sizes[i] = Math.random() * 0.08 + 0.02;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.velocities = velocities;
    this.geo = geo;

    const mat = new THREE.PointsMaterial({
      color: 0xe8dcc0,
      size: 0.12,
      transparent: true,
      opacity: 0.35,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
  }

  update(dt, windDir = new THREE.Vector3(0.2, 0, 0.1)) {
    const pos = this.geo.attributes.position;
    const arr = pos.array;
    const vel = this.velocities;
    for (let i = 0; i < arr.length / 3; i++) {
      const ix = i * 3;
      arr[ix] += (vel[ix] + windDir.x * 0.3) * dt;
      arr[ix + 1] += vel[ix + 1] * dt;
      arr[ix + 2] += (vel[ix + 2] + windDir.z * 0.3) * dt;

      // wrap
      if (arr[ix] > this.bounds.x) arr[ix] = -this.bounds.x;
      if (arr[ix] < -this.bounds.x) arr[ix] = this.bounds.x;
      if (arr[ix + 2] > this.bounds.z) arr[ix + 2] = -this.bounds.z;
      if (arr[ix + 2] < -this.bounds.z) arr[ix + 2] = this.bounds.z;
      if (arr[ix + 1] > this.bounds.y) arr[ix + 1] = 0.5;
      if (arr[ix + 1] < 0.3) arr[ix + 1] = this.bounds.y * Math.random();
    }
    pos.needsUpdate = true;
  }
}

export class Torch {
  constructor(scene, x, y, z, withLight = true) {
    this.scene = scene;
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // bracket
    const bracket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), MAT.ironDark);
    bracket.rotation.z = Math.PI / 2;
    bracket.position.set(0.15, 0.6, 0);
    group.add(bracket);

    const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.1, 0.35, 8), MAT.ironDark);
    holder.position.set(0.4, 0.6, 0);
    group.add(holder);

    // wood stick
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 6), MAT.woodDark);
    stick.position.set(0.4, 0.9, 0);
    group.add(stick);

    // flame sprites
    const flameMat = new THREE.SpriteMaterial({
      map: MAT.fire,
      color: 0xffaa44,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const flame = new THREE.Sprite(flameMat);
    flame.position.set(0.4, 1.25, 0);
    flame.scale.set(0.5, 0.9, 1);
    group.add(flame);
    this.flame = flame;

    // glow light
    if (withLight) {
      const light = new THREE.PointLight(0xff7a2a, 2.5, 12, 2);
      light.position.set(0.4, 1.2, 0);
      group.add(light);
      this.light = light;
    }

    scene.add(group);
    this.group = group;
    this.baseIntensity = withLight ? this.light.intensity : 1;
    this.time = Math.random() * 10;
  }

  update(dt) {
    this.time += dt;
    const flicker = Math.sin(this.time * 12) * 0.25 + Math.sin(this.time * 23) * 0.15 + Math.random() * 0.1;
    if (this.light) {
      this.light.intensity = this.baseIntensity + flicker;
    }
    const s = 0.5 + flicker * 0.15;
    this.flame.scale.set(s, s * 1.8, 1);
    this.flame.material.rotation = Math.sin(this.time * 8) * 0.1;
  }
}

export class SparkSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = [];
  }

  emit(pos, dir, count = 18) {
    for (let i = 0; i < count; i++) {
      const geo = new THREE.SphereGeometry(0.015 + Math.random() * 0.02, 4, 4);
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd777, transparent: true });
      const m = new THREE.Mesh(geo, mat);
      m.position.copy(pos);
      const vel = dir.clone()
        .add(new THREE.Vector3((Math.random() - 0.5) * 1.5, Math.random() * 1.2, (Math.random() - 0.5) * 1.5))
        .multiplyScalar(3 + Math.random() * 6);
      this.scene.add(m);
      this.particles.push({ mesh: m, vel, life: 0.4 + Math.random() * 0.4 });
    }
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.scene.remove(p.mesh);
        this.particles.splice(i, 1);
        continue;
      }
      p.vel.y -= 9 * dt;
      p.mesh.position.addScaledVector(p.vel, dt);
      p.mesh.material.opacity = p.life / 0.6;
      p.mesh.scale.setScalar(1 + (0.6 - p.life) * 0.5);
    }
  }
}

export class BloodDecalSystem {
  constructor(scene) {
    this.scene = scene;
    this.decals = [];
    // generate a few blood textures variants
    this.textures = [];
    for (let i = 0; i < 3; i++) {
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      const ctx = c.getContext('2d');
      ctx.clearRect(0, 0, 256, 256);
      ctx.fillStyle = `rgba(${80 + Math.random() * 30},${8 + Math.random() * 12},${8 + Math.random() * 12},0.92)`;
      ctx.beginPath();
      const r = 30 + Math.random() * 25;
      ctx.arc(128, 128, r, 0, Math.PI * 2);
      ctx.fill();
      for (let j = 0; j < 12; j++) {
        const ang = Math.random() * Math.PI * 2;
        const len = 20 + Math.random() * 70;
        ctx.strokeStyle = `rgba(90,10,10,${0.5 + Math.random() * 0.5})`;
        ctx.lineWidth = 1 + Math.random() * 5;
        ctx.beginPath();
        ctx.moveTo(128 + Math.cos(ang) * r * 0.7, 128 + Math.sin(ang) * r * 0.7);
        ctx.lineTo(128 + Math.cos(ang) * (r + len), 128 + Math.sin(ang) * (r + len));
        ctx.stroke();
      }
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(tex);
    }
  }

  add(pos, scale = 1) {
    const tex = this.textures[Math.floor(Math.random() * this.textures.length)];
    const mat = new THREE.MeshStandardMaterial({
      map: tex,
      transparent: true,
      roughness: 0.4,
      metalness: 0,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -1,
    });
    const geo = new THREE.CircleGeometry((0.5 + Math.random() * 0.4) * scale, 12);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(pos.x + (Math.random() - 0.5) * 0.3, 0.02 + Math.random() * 0.02, pos.z + (Math.random() - 0.5) * 0.3);
    mesh.rotation.z = Math.random() * Math.PI * 2;
    this.scene.add(mesh);
    this.decals.push({ mesh, life: 0 });
    // fade after long time
    if (this.decals.length > 80) {
      const old = this.decals.shift();
      this.scene.remove(old.mesh);
    }
  }

  update(dt) {
    // could fade over very long time, but keep for now
  }
}
