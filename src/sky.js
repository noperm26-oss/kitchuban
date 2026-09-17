import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';

export class SkySystem {
  constructor(scene, renderer) {
    this.scene = scene;
    this.renderer = renderer;

    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    scene.add(this.sky);

    this.sun = new THREE.Vector3();
    this.skyUniforms = this.sky.material.uniforms;

    this.skyUniforms['turbidity'].value = 6.5;
    this.skyUniforms['rayleigh'].value = 1.2;
    this.skyUniforms['mieCoefficient'].value = 0.003;
    this.skyUniforms['mieDirectionalG'].value = 0.78;

    // sun mesh with bloom
    const sunGeo = new THREE.SphereGeometry(6, 24, 24);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff0c0 });
    this.sunMesh = new THREE.Mesh(sunGeo, sunMat);
    scene.add(this.sunMesh);

    // moon
    const moonGeo = new THREE.SphereGeometry(2.5, 16, 16);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xd0d8e8, transparent: true, opacity: 0 });
    this.moonMesh = new THREE.Mesh(moonGeo, moonMat);
    scene.add(this.moonMesh);

    // stars
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 400;
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, transparent: true, opacity: 0, sizeAttenuation: false });
    this.stars = new THREE.Points(starGeo, starMat);
    scene.add(this.stars);

    // atmosphere fog color will be driven by sky
    this.timeOfDay = 0.32; // 0-1, 0.25 sunrise, 0.5 noon, 0.75 sunset, 0 night
    this.timeScale = 0.00008; // slow movement, ~ 3.5 hours per full day if real time, but we accelerate slightly
    this.dayNightCycle = true;

    this.update(0);
  }

  setTime(t) {
    this.timeOfDay = ((t % 1) + 1) % 1;
    this.update(0);
  }

  update(dt) {
    if (this.dayNightCycle) {
      this.timeOfDay += dt * this.timeScale;
      if (this.timeOfDay > 1) this.timeOfDay -= 1;
    }

    // sun position: spherical, timeOfDay 0 = midnight, 0.25 sunrise east, 0.5 noon south high, 0.75 sunset west
    const phi = THREE.MathUtils.mapLinear(this.timeOfDay, 0, 1, 0, 360); // degrees
    const theta = 88 - Math.sin(this.timeOfDay * Math.PI * 2) * 65; // elevation varies
    // Convert to spherical
    const phiRad = THREE.MathUtils.degToRad(phi);
    const thetaRad = THREE.MathUtils.degToRad(theta);
    // Sky model expects sun position in world coords
    this.sun.setFromSphericalCoords(1, thetaRad, phiRad);
    this.skyUniforms['sunPosition'].value.copy(this.sun);

    // sun mesh position far
    this.sunMesh.position.copy(this.sun).multiplyScalar(350);
    // moon opposite
    this.moonMesh.position.copy(this.sun).negate().multiplyScalar(350);

    // adjust exposure and fog based on sun elevation
    const sunHeight = this.sun.y; // -1 to 1
    const dayFactor = THREE.MathUtils.clamp((sunHeight + 0.1) / 0.3, 0, 1); // 0 night, 1 day
    const sunsetFactor = 1 - Math.abs(sunHeight - 0.15) * 4; // peak at low sun

    // fog color lerp between day and sunset/night
    let fogColor;
    let skyTurbidity;
    if (sunHeight > 0.2) {
      fogColor = new THREE.Color(0xe8c9a0);
      skyTurbidity = 6.5;
    } else if (sunHeight > 0) {
      // sunset
      const t = THREE.MathUtils.clamp(1 - sunHeight / 0.2, 0, 1);
      fogColor = new THREE.Color().lerpColors(new THREE.Color(0xe8c9a0), new THREE.Color(0xff6a3a), t);
      fogColor.lerp(new THREE.Color(0x8a3a5a), t * 0.5);
      skyTurbidity = THREE.MathUtils.lerp(6.5, 10, t);
    } else {
      // night
      const t = THREE.MathUtils.clamp(-sunHeight / 0.3, 0, 1);
      fogColor = new THREE.Color().lerpColors(new THREE.Color(0x8a5a3a), new THREE.Color(0x0a1020), t);
      skyTurbidity = 2;
    }

    this.scene.fog.color.copy(fogColor);
    this.scene.background = fogColor.clone();
    this.skyUniforms['turbidity'].value = skyTurbidity;

    // sun intensity
    const sunIntensity = THREE.MathUtils.clamp(sunHeight * 3 + 0.2, 0, 1.8);
    if (this.directionalLight) {
      this.directionalLight.intensity = sunIntensity * 2.2;
      this.directionalLight.position.copy(this.sun).multiplyScalar(80);
      this.directionalLight.position.y = Math.max(5, this.directionalLight.position.y);
    }

    // stars opacity at night
    this.stars.material.opacity = THREE.MathUtils.clamp(-sunHeight * 2, 0, 0.9);
    this.moonMesh.material.opacity = THREE.MathUtils.clamp(-sunHeight * 1.5, 0, 0.7);

    // sun color
    if (sunHeight < 0.15) {
      this.sunMesh.material.color.setHSL(0.08 + sunHeight * 0.2, 1, 0.65);
    } else {
      this.sunMesh.material.color.set(0xfff0c0);
    }

    return { dayFactor, sunHeight, fogColor, sunIntensity };
  }

  attachDirectionalLight(light) {
    this.directionalLight = light;
  }
}
