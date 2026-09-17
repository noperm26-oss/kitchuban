/**
 * Kitchuban Weather Visuals - Rain, Lightning, Earthquake effects
 * Static client-only, procedural, no external assets
 * Works with Soundscape for audio-visual sync
 */

import * as THREE from 'three';

export class RainSystem {
  constructor(scene, count = 3000) {
    this.scene = scene;
    this.count = count;
    this.intensity = 0;
    this.active = false;

    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i=0;i<count;i++) {
      positions[i*3] = (Math.random()-0.5)*2000;
      positions[i*3+1] = Math.random()*400 + 50;
      positions[i*3+2] = (Math.random()-0.5)*1400;
      velocities[i*3] = (Math.random()-0.5)*2;
      velocities[i*3+1] = -8 - Math.random()*12;
      velocities[i*3+2] = (Math.random()-0.5)*2;
      sizes[i] = 0.05 + Math.random()*0.08;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.velocities = velocities;
    this.geo = geo;

    const mat = new THREE.PointsMaterial({
      color: 0xaaccff,
      size: 0.18,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
      depthWrite: false,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.visible = false;
    scene.add(this.points);

    // Rain streaks - lines for close rain
    const lineCount = 600;
    const lineGeo = new THREE.BufferGeometry();
    const linePos = new Float32Array(lineCount * 6); // 2 points per line
    for (let i=0;i<lineCount;i++) {
      const x = (Math.random()-0.5)*200;
      const y = Math.random()*60 + 5;
      const z = (Math.random()-0.5)*200;
      linePos[i*6] = x;
      linePos[i*6+1] = y;
      linePos[i*6+2] = z;
      linePos[i*6+3] = x + (Math.random()-0.5)*0.5;
      linePos[i*6+4] = y - 2 - Math.random()*1.5;
      linePos[i*6+5] = z + (Math.random()-0.5)*0.5;
    }
    lineGeo.setAttribute('position', new THREE.BufferAttribute(linePos, 3));
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x99bbff,
      transparent: true,
      opacity: 0,
    });
    this.lines = new THREE.LineSegments(lineGeo, lineMat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    scene.add(this.lines);
    this.lineVelocities = new Float32Array(lineCount*3);
    for (let i=0;i<lineCount;i++) {
      this.lineVelocities[i*3] = (Math.random()-0.5)*1.5;
      this.lineVelocities[i*3+1] = -18 - Math.random()*8;
      this.lineVelocities[i*3+2] = (Math.random()-0.5)*1.5;
    }

    console.log('[WEATHER] RainSystem initialized - 3000 drops + 600 streaks');
  }

  setIntensity(intensity, playerPos) {
    this.intensity = intensity;
    this.active = intensity > 0.05;
    // Fixed: when intensity 0, hide completely to avoid visible rain at 0
    this.points.visible = this.active;
    this.lines.visible = this.active && intensity > 0.3;
    
    if (this.active) {
      this.points.material.opacity = Math.min(0.55, intensity * 0.55);
      this.lines.material.opacity = Math.min(0.45, intensity * 0.45);
      
      // Center rain around player
      if (playerPos) {
        this.points.position.set(playerPos.x*0.1, 0, playerPos.z*0.1);
        this.lines.position.set(playerPos.x, 0, playerPos.z);
      }
    } else {
      this.points.visible = false;
      this.lines.visible = false;
      this.points.material.opacity = 0;
      this.lines.material.opacity = 0;
    }
  }

  update(dt, playerPos, windIntensity) {
    if (!this.active) return;

    const pos = this.geo.attributes.position;
    const arr = pos.array;
    const vel = this.velocities;

    for (let i=0;i<this.count;i++) {
      const ix = i*3;
      arr[ix] += (vel[ix] + windIntensity*3) * dt;
      arr[ix+1] += vel[ix+1] * dt * (0.5 + this.intensity*0.8);
      arr[ix+2] += vel[ix+2] * dt;

      // Reset if below ground or too far from player
      if (arr[ix+1] < 0.5) {
        arr[ix] = (playerPos ? playerPos.x : 0) + (Math.random()-0.5)*800;
        arr[ix+1] = 80 + Math.random()*120;
        arr[ix+2] = (playerPos ? playerPos.z : 0) + (Math.random()-0.5)*600;
      }
      // Wrap horizontally
      if (playerPos) {
        const dx = arr[ix] - playerPos.x;
        const dz = arr[ix+2] - playerPos.z;
        if (Math.abs(dx) > 500) arr[ix] = playerPos.x + (Math.random()-0.5)*800;
        if (Math.abs(dz) > 400) arr[ix+2] = playerPos.z + (Math.random()-0.5)*600;
      }
    }
    pos.needsUpdate = true;

    // Update close streaks
    if (this.lines.visible) {
      const lPos = this.lines.geometry.attributes.position;
      const lArr = lPos.array;
      const lVel = this.lineVelocities;
      for (let i=0;i<lVel.length/3;i++) {
        const idx = i*6;
        // Both points of line move together
        lArr[idx] += (lVel[i*3] + windIntensity*2) * dt;
        lArr[idx+1] += lVel[i*3+1] * dt;
        lArr[idx+2] += lVel[i*3+2] * dt;
        lArr[idx+3] = lArr[idx] + (Math.random()-0.5)*0.3;
        lArr[idx+4] = lArr[idx+1] - 1.8;
        lArr[idx+5] = lArr[idx+2] + (Math.random()-0.5)*0.3;

        if (lArr[idx+1] < 0.2) {
          const nx = (Math.random()-0.5)*40;
          const ny = 25 + Math.random()*20;
          const nz = (Math.random()-0.5)*40;
          lArr[idx] = nx;
          lArr[idx+1] = ny;
          lArr[idx+2] = nz;
          lArr[idx+3] = nx;
          lArr[idx+4] = ny - 1.8;
          lArr[idx+5] = nz;
        }
      }
      lPos.needsUpdate = true;
    }
  }
}

export class LightningSystem {
  constructor(scene) {
    this.scene = scene;
    this.activeBolts = [];
    this.flashLight = new THREE.PointLight(0xd0e0ff, 0, 600, 1.8);
    this.flashLight.position.set(0, 200, 0);
    scene.add(this.flashLight);
    this.ambientFlash = new THREE.AmbientLight(0xaaccff, 0);
    scene.add(this.ambientFlash);
  }

  createBolt(startX, startZ, intensity=1) {
    const startY = 250 + Math.random()*80;
    const endX = startX + (Math.random()-0.5)*60*intensity;
    const endZ = startZ + (Math.random()-0.5)*60*intensity;
    const endY = 5 + Math.random()*15;

    const segments = 12 + Math.floor(Math.random()*8);
    const points = [];
    for (let i=0;i<=segments;i++) {
      const t = i/segments;
      const x = THREE.MathUtils.lerp(startX, endX, t) + (Math.random()-0.5)*12*(1-t);
      const y = THREE.MathUtils.lerp(startY, endY, t);
      const z = THREE.MathUtils.lerp(startZ, endZ, t) + (Math.random()-0.5)*12*(1-t);
      points.push(new THREE.Vector3(x, y, z));
      // Random branch
      if (i>2 && i<segments-2 && Math.random()<0.3*intensity) {
        const branchPoints = [];
        const branchLen = 3 + Math.floor(Math.random()*4);
        let bx = x, by = y, bz = z;
        for (let j=0;j<branchLen;j++) {
          bx += (Math.random()-0.5)*8;
          by -= 8 + Math.random()*8;
          bz += (Math.random()-0.5)*8;
          branchPoints.push(new THREE.Vector3(bx, by, bz));
        }
        // Create branch line
        const branchGeo = new THREE.BufferGeometry().setFromPoints([points[points.length-1], ...branchPoints]);
        const branchMat = new THREE.LineBasicMaterial({ color: 0xaaccff, transparent: true, opacity: 0.6*intensity });
        const branchLine = new THREE.Line(branchGeo, branchMat);
        this.scene.add(branchLine);
        this.activeBolts.push({ mesh: branchLine, life: 0.15 + Math.random()*0.15, intensity });
      }
    }

    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({ 
      color: 0xffffff, 
      transparent: true, 
      opacity: 0.9*intensity,
      linewidth: 2
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);

    // Glow
    const glowGeo = new THREE.BufferGeometry().setFromPoints(points);
    const glowMat = new THREE.LineBasicMaterial({ color: 0x88aaff, transparent: true, opacity: 0.4*intensity });
    const glowLine = new THREE.Line(glowGeo, glowMat);
    glowLine.scale.set(1.02,1.02,1.02);
    this.scene.add(glowLine);

    this.activeBolts.push({ mesh: line, life: 0.25 + Math.random()*0.2, intensity });
    this.activeBolts.push({ mesh: glowLine, life: 0.25 + Math.random()*0.2, intensity });

    // Flash light
    this.flashLight.position.set(endX, endY+20, endZ);
    this.flashLight.intensity = 15 + intensity*25;
    this.flashLight.distance = 400 + intensity*300;
    this.ambientFlash.intensity = 0.4 + intensity*0.6;

    setTimeout(() => {
      this.flashLight.intensity = 0;
      this.ambientFlash.intensity = 0;
    }, 180 + Math.random()*120);

    console.log(`[LIGHTNING] Bolt from (${startX.toFixed(0)},${startZ.toFixed(0)}) to (${endX.toFixed(0)},${endZ.toFixed(0)}) intensity ${intensity.toFixed(2)}`);
  }

  update(dt) {
    for (let i=this.activeBolts.length-1;i>=0;i--) {
      const bolt = this.activeBolts[i];
      bolt.life -= dt;
      if (bolt.life <=0) {
        this.scene.remove(bolt.mesh);
        this.activeBolts.splice(i,1);
      } else {
        bolt.mesh.material.opacity = bolt.life*2 * bolt.intensity;
      }
    }
    // Fade flash light
    if (this.flashLight.intensity >0) {
      this.flashLight.intensity *= Math.pow(0.85, dt*60);
      this.ambientFlash.intensity *= Math.pow(0.85, dt*60);
      if (this.flashLight.intensity <0.1) {
        this.flashLight.intensity = 0;
        this.ambientFlash.intensity = 0;
      }
    }
  }
}

export class EarthquakeVisuals {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.active = false;
    this.intensity = 0;
    this.timer = 0;
    this._elapsed = 0;
    this.originalFogNear = null;
    this.originalFogFar = null;
  }

  trigger(intensity, duration) {
    this.active = true;
    this.intensity = intensity;
    this.timer = duration;
    if (this.scene.fog && this.originalFogNear===null) {
      this.originalFogNear = this.scene.fog.near;
      this.originalFogFar = this.scene.fog.far;
    }
    console.log(`[EARTHQUAKE VISUAL] intensity ${intensity.toFixed(2)} duration ${duration.toFixed(1)}s`);
  }

  update(dt, player, buildingGroups, dustSystem) {
    if (!this.active) return;

    this._elapsed += dt;
    this.timer -= dt;
    const shake = this.intensity * (0.5 + Math.sin(this._elapsed*20)*0.5);

    // Camera shake - directly modify camera if player locked
    if (player && player.locked) {
      if (this.camera) {
        this.camera.fov = 75 + Math.sin(this._elapsed*30)*shake*1.5;
        this.camera.updateProjectionMatrix();
      }
    }

    // Dust intensify
    if (dustSystem && dustSystem.points) {
      dustSystem.points.material.opacity = 0.35 + this.intensity*0.5 + Math.random()*0.2;
      const wind = new THREE.Vector3((Math.random()-0.5)*shake*2, 0, (Math.random()-0.5)*shake*2);
      dustSystem.update(dt, wind);
    }

    // Building sway - subtle rotation for nearby buildings
    if (buildingGroups) {
      for (const g of buildingGroups) {
        if (!g.userData.originalRot) {
          g.userData.originalRot = g.rotation.clone();
        }
        g.rotation.z = g.userData.originalRot.z + Math.sin(this._elapsed*15 + g.position.x*0.01)*shake*0.02;
        g.rotation.x = g.userData.originalRot.x + Math.cos(this._elapsed*12 + g.position.z*0.01)*shake*0.015;
      }
    }

    // Fog dust - reduce visibility
    if (this.scene.fog) {
      this.scene.fog.near = 30 + (1-this.intensity)*80;
      this.scene.fog.far = 200 + (1-this.intensity)*500;
      this.scene.fog.color.setRGB(0.6, 0.5, 0.4);
    }

    if (this.timer <=0) {
      this.active = false;
      // Restore
      if (this.camera) {
        this.camera.fov = 75;
        this.camera.updateProjectionMatrix();
      }
      if (this.scene.fog && this.originalFogNear!==null) {
        this.scene.fog.near = this.originalFogNear;
        this.scene.fog.far = this.originalFogFar;
        this.scene.fog.color.set(0xe8c9a0);
      }
      if (dustSystem && dustSystem.points) {
        dustSystem.points.material.opacity = 0.35;
      }
      if (buildingGroups) {
        for (const g of buildingGroups) {
          if (g.userData.originalRot) {
            g.rotation.copy(g.userData.originalRot);
          }
        }
      }
      console.log('[EARTHQUAKE VISUAL] Ended, restored');
    }
  }
}
