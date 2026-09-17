/**
 * Kitchuban Soundscape - EVERYWHERE realistic sounds, nice audio, varied voices
 * Static client-only, Web Audio API procedural synthesis - no external files
 * Earthquake, storm, thunder, rain, wind, fire, water, crowd, voices, combat, building
 */

import * as THREE from 'three';

export const VOICE_PROFILES = {
  child: { base: 320, range: 80, speed: 1.5, formant: 1100, name: 'child', pitchVar: 0.25, desc: 'high fast playful' },
  citizen_f: { base: 220, range: 40, speed: 1.1, formant: 900, name: 'citizen_f', pitchVar: 0.18, desc: 'warm female' },
  citizen_m: { base: 130, range: 30, speed: 1.0, formant: 700, name: 'citizen_m', pitchVar: 0.15, desc: 'calm male' },
  merchant: { base: 145, range: 50, speed: 1.3, formant: 850, name: 'merchant', pitchVar: 0.28, desc: 'fast persuasive haggling' },
  priest: { base: 95, range: 20, speed: 0.7, formant: 600, name: 'priest', pitchVar: 0.08, desc: 'low slow reverent' },
  guard: { base: 105, range: 25, speed: 0.9, formant: 650, name: 'guard', pitchVar: 0.12, desc: 'loud commanding' },
  noble_f: { base: 200, range: 30, speed: 0.95, formant: 950, name: 'noble_f', pitchVar: 0.14, desc: 'clear elegant female' },
  noble_m: { base: 140, range: 25, speed: 0.9, formant: 750, name: 'noble_m', pitchVar: 0.12, desc: 'deep noble male' },
  legionary: { base: 115, range: 20, speed: 0.85, formant: 680, name: 'legionary', pitchVar: 0.10, desc: 'strong military' },
  praetorian: { base: 100, range: 15, speed: 0.8, formant: 620, name: 'praetorian', pitchVar: 0.08, desc: 'authoritative elite' },
  rebel: { base: 160, range: 60, speed: 1.25, formant: 800, name: 'rebel', pitchVar: 0.30, desc: 'rough aggressive' },
  emperor: { base: 85, range: 15, speed: 0.65, formant: 550, name: 'emperor', pitchVar: 0.06, desc: 'very deep echoing imperial' },
  vestal: { base: 240, range: 35, speed: 0.85, formant: 1000, name: 'vestal', pitchVar: 0.12, desc: 'soft reverent female' },
  senate: { base: 110, range: 20, speed: 0.75, formant: 650, name: 'senate', pitchVar: 0.09, desc: 'old wise slow' },
};

export const FACTION_VOICES = {
  legio: { profile: 'legionary', phrases: ['Roma Victor!', 'Ad arma!', 'Pro Roma!', 'Legio!'], color: 0x8a1a1a },
  praetorian: { profile: 'praetorian', phrases: ['Pro Imperatore!', 'Praetoria!', 'Imperator!', 'Custodia!'], color: 0x1a1a2a },
  rebels: { profile: 'rebel', phrases: ['Libertas!', 'Mors tyrannis!', 'Ad libertatem!', 'Rebellio!'], color: 0x7a3a3a },
  senate: { profile: 'senate', phrases: ['Senatus Populusque!', 'Concordia!', 'Res Publica!', 'Cives!'], color: 0xd9a441 },
  merchants: { profile: 'merchant', phrases: ['Emite! Emite!', 'Optima merx!', 'Pretium bonum!', 'Mercatus!'], color: 0x2a5a8a },
  vestals: { profile: 'vestal', phrases: ['Vesta sancta!', 'Ignis aeternus!', 'Pax deorum!', 'Flamma!'], color: 0xffd777 },
  emperor: { profile: 'emperor', phrases: ['Ego Imperator!', 'Silentium!', 'Iussu meo!', 'Roma aeterna!'], color: 0x6a0a8a },
};

export class Soundscape {
  constructor(scene, camera, player) {
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.actx = null;
    this.masterGain = null;
    this.reverb = null;
    this.ambientGain = null;
    this.weatherGain = null;
    this.voiceGain = null;
    this.listener = null;
    this.noiseBuffers = {};
    this.ambientLoops = [];
    this.weather = { state: 'clear', intensity: 0, timer: 30, rainIntensity: 0, windIntensity: 0, stormTimer: 0, thunderTimer: 8 };
    this.earthquake = { active: false, intensity: 0, timer: 0, cooldown: 120 + Math.random()*120 };
    this.voiceCooldowns = new Map();
    this.lastFootstep = 0;
    this.footstepSurface = 'ground';
    this.rainSystem = null;
    this.lightningLight = null;
    this.screenShake = 0;
    this.init();
  }

  init() {
    try {
      this.actx = new (window.AudioContext || window.webkitAudioContext)();
      this.masterGain = this.actx.createGain();
      this.masterGain.gain.value = 0.35;
      this.masterGain.connect(this.actx.destination);

      this.ambientGain = this.actx.createGain();
      this.ambientGain.gain.value = 0.18;
      this.ambientGain.connect(this.masterGain);

      this.weatherGain = this.actx.createGain();
      this.weatherGain.gain.value = 0;
      this.weatherGain.connect(this.masterGain);

      this.voiceGain = this.actx.createGain();
      this.voiceGain.gain.value = 0.32;
      this.voiceGain.connect(this.masterGain);

      // Reverb for Pantheon, Basilicas
      this.reverb = this.actx.createConvolver();
      const reverbGain = this.actx.createGain();
      reverbGain.gain.value = 0.25;
      // Generate impulse response - large hall
      const rate = this.actx.sampleRate;
      const length = rate * 2.5; // 2.5 sec reverb
      const impulse = this.actx.createBuffer(2, length, rate);
      for (let ch=0; ch<2; ch++) {
        const data = impulse.getChannelData(ch);
        for (let i=0; i<length; i++) {
          data[i] = (Math.random()*2-1) * Math.pow(1 - i/length, 2.2) * 0.6;
        }
      }
      this.reverb.buffer = impulse;
      this.reverb.connect(reverbGain);
      reverbGain.connect(this.masterGain);

      // Noise buffers
      this.noiseBuffers.white = this.createNoiseBuffer(2);
      this.noiseBuffers.pink = this.createPinkNoiseBuffer(2);
      this.noiseBuffers.brown = this.createBrownNoiseBuffer(2);

      // Lightning light
      this.lightningLight = new THREE.PointLight(0xccddff, 0, 800, 1.5);
      this.lightningLight.position.set(0, 300, 0);
      this.scene.add(this.lightningLight);

      console.log('[SOUNDSCAPE] Initialized - nice sounds everywhere, varied voices, weather, earthquake');
    } catch (e) {
      console.warn('[SOUNDSCAPE] AudioContext failed', e);
    }
  }

  ensureAudio() {
    if (!this.actx) this.init();
    if (this.actx && this.actx.state === 'suspended') this.actx.resume();
  }

  createNoiseBuffer(seconds) {
    if (!this.actx) return null;
    const rate = this.actx.sampleRate;
    const len = rate * seconds;
    const buf = this.actx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    for (let i=0;i<len;i++) data[i] = Math.random()*2-1;
    return buf;
  }

  createPinkNoiseBuffer(seconds) {
    if (!this.actx) return null;
    const rate = this.actx.sampleRate;
    const len = rate * seconds;
    const buf = this.actx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let b0,b1,b2,b3,b4,b5,b6;
    b0=b1=b2=b3=b4=b5=b6=0;
    for (let i=0;i<len;i++) {
      const white = Math.random()*2-1;
      b0 = 0.99886*b0 + white*0.0555179;
      b1 = 0.99332*b1 + white*0.0750759;
      b2 = 0.96900*b2 + white*0.1538520;
      b3 = 0.86650*b3 + white*0.3104856;
      b4 = 0.55000*b4 + white*0.5329522;
      b5 = -0.7616*b5 - white*0.0168980;
      data[i] = (b0+b1+b2+b3+b4+b5+b6+white*0.5362)*0.11;
      b6 = white*0.115926;
    }
    return buf;
  }

  createBrownNoiseBuffer(seconds) {
    if (!this.actx) return null;
    const rate = this.actx.sampleRate;
    const len = rate * seconds;
    const buf = this.actx.createBuffer(1, len, rate);
    const data = buf.getChannelData(0);
    let last = 0;
    for (let i=0;i<len;i++) {
      const white = Math.random()*2-1;
      last = (last + 0.02*white) / 1.02;
      data[i] = last*3.5;
    }
    return buf;
  }

  // --- Positional audio helper ---
  createPanner(x, y, z) {
    if (!this.actx) return null;
    const panner = this.actx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 8;
    panner.maxDistance = 120;
    panner.rolloffFactor = 1.2;
    panner.coneInnerAngle = 360;
    panner.positionX.value = x;
    panner.positionY.value = y;
    panner.positionZ.value = z;
    return panner;
  }

  // --- NICE SOUNDS EVERYWHERE ---

  playThunder(intensity = 1, pos = null) {
    this.ensureAudio();
    if (!this.actx) return;
    const t = this.actx.currentTime;
    const master = pos ? this.createPanner(pos.x, pos.y||20, pos.z) : null;
    const dest = master ? master : this.weatherGain;
    if (master) master.connect(this.weatherGain);

    // Low rumble - brown noise filtered 20-120Hz
    const noise = this.actx.createBufferSource();
    noise.buffer = this.noiseBuffers.brown || this.noiseBuffers.white;
    noise.loop = true;
    const lowFilter = this.actx.createBiquadFilter();
    lowFilter.type = 'lowpass';
    lowFilter.frequency.value = 120 + intensity*80;
    lowFilter.Q.value = 1;
    const lowGain = this.actx.createGain();
    lowGain.gain.setValueAtTime(0, t);
    lowGain.gain.linearRampToValueAtTime(0.6*intensity, t+0.15);
    lowGain.gain.exponentialRampToValueAtTime(0.01, t+2.5+intensity*1.5);
    noise.connect(lowFilter);
    lowFilter.connect(lowGain);
    lowGain.connect(dest);
    noise.start(t);
    noise.stop(t+3+intensity);

    // Mid crack - pink noise high-pass
    const crackNoise = this.actx.createBufferSource();
    crackNoise.buffer = this.noiseBuffers.white;
    const highFilter = this.actx.createBiquadFilter();
    highFilter.type = 'bandpass';
    highFilter.frequency.value = 800 + Math.random()*600;
    highFilter.Q.value = 0.8;
    const crackGain = this.actx.createGain();
    crackGain.gain.setValueAtTime(0, t+0.05);
    crackGain.gain.linearRampToValueAtTime(0.5*intensity, t+0.12);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t+0.6);
    crackNoise.connect(highFilter);
    highFilter.connect(crackGain);
    crackGain.connect(dest);
    crackNoise.start(t+0.05);
    crackNoise.stop(t+0.7);

    // Sub bass oscillator 35Hz for chest feel
    const osc = this.actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(35 + Math.random()*15, t);
    osc.frequency.exponentialRampToValueAtTime(22, t+1.5);
    const oscGain = this.actx.createGain();
    oscGain.gain.setValueAtTime(0, t);
    oscGain.gain.linearRampToValueAtTime(0.4*intensity, t+0.2);
    oscGain.gain.exponentialRampToValueAtTime(0.001, t+2.0);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(t);
    osc.stop(t+2.2);

    // Lightning flash visual
    this.triggerLightningFlash(intensity);

    console.log(`[THUNDER] intensity ${intensity.toFixed(2)} at ${pos?`${pos.x.toFixed(0)},${pos.z.toFixed(0)}`:'sky'}`);
  }

  triggerLightningFlash(intensity) {
    if (!this.lightningLight) return;
    this.lightningLight.intensity = 8 + intensity*12;
    this.lightningLight.distance = 600 + intensity*400;
    // Random position high
    this.lightningLight.position.set((Math.random()-0.5)*800, 250+Math.random()*100, (Math.random()-0.5)*600);
    // Flash sequence
    let flashes = 1 + Math.floor(Math.random()*2);
    let delay = 0;
    const flash = () => {
      if (flashes-- <=0) {
        this.lightningLight.intensity = 0;
        return;
      }
      this.lightningLight.intensity = 6 + Math.random()*10;
      setTimeout(() => {
        this.lightningLight.intensity = 0.5;
        setTimeout(() => {
          this.lightningLight.intensity = 8 + Math.random()*8;
          setTimeout(() => {
            this.lightningLight.intensity = 0;
            if (flashes>0) setTimeout(flash, 80+Math.random()*120);
          }, 40+Math.random()*60);
        }, 30+Math.random()*40);
      }, 50+Math.random()*80);
    };
    flash();

    // Screen flash via fog
    if (this.scene.fog) {
      const orig = this.scene.fog.color.clone();
      this.scene.fog.color.set(0xccddff);
      setTimeout(() => {
        this.scene.fog.color.copy(orig);
      }, 120);
    }
  }

  playRain(intensity) {
    this.ensureAudio();
    if (!this.actx) return;
    // Continuous rain handled in update loop via noise
    // This is for droplet accents
    if (Math.random() < intensity*0.3) {
      const t = this.actx.currentTime;
      const osc = this.actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + Math.random()*1200, t);
      const gain = this.actx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.06*intensity, t+0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, t+0.12);
      osc.connect(gain);
      gain.connect(this.weatherGain);
      osc.start(t);
      osc.stop(t+0.13);
    }
  }

  startWeatherLoop() {
    this.ensureAudio();
    if (!this.actx || this.weatherLoop) return;
    // Create continuous wind + rain loops
    const t = this.actx.currentTime;

    // Wind loop - pink noise low-pass with LFO
    const windNoise = this.actx.createBufferSource();
    windNoise.buffer = this.noiseBuffers.pink;
    windNoise.loop = true;
    const windFilter = this.actx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.value = 600;
    const windLFO = this.actx.createOscillator();
    windLFO.type = 'sine';
    windLFO.frequency.value = 0.12;
    const windLFOGain = this.actx.createGain();
    windLFOGain.gain.value = 300;
    windLFO.connect(windLFOGain);
    windLFOGain.connect(windFilter.frequency);
    const windGain = this.actx.createGain();
    windGain.gain.value = 0;
    windNoise.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.weatherGain);
    windNoise.start(t);
    windLFO.start(t);

    // Rain loop - white noise bandpass 1-4kHz
    const rainNoise = this.actx.createBufferSource();
    rainNoise.buffer = this.noiseBuffers.white;
    rainNoise.loop = true;
    const rainFilter = this.actx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 2200;
    rainFilter.Q.value = 0.6;
    const rainGain = this.actx.createGain();
    rainGain.gain.value = 0;
    rainNoise.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.weatherGain);
    rainNoise.start(t);

    this.weatherLoop = { windNoise, windFilter, windGain, windLFO, rainNoise, rainFilter, rainGain };
  }

  playEarthquake(intensity, duration) {
    this.ensureAudio();
    if (!this.actx) return;
    const t = this.actx.currentTime;

    // Deep rumble 18-35Hz
    const osc1 = this.actx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(22, t);
    osc1.frequency.linearRampToValueAtTime(28 + Math.random()*8, t+duration*0.5);
    osc1.frequency.linearRampToValueAtTime(18, t+duration);
    const gain1 = this.actx.createGain();
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(0.7*intensity, t+0.5);
    gain1.gain.setValueAtTime(0.6*intensity, t+duration-0.5);
    gain1.gain.linearRampToValueAtTime(0, t+duration);
    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t+duration+0.1);

    // Brown noise rumble
    const noise = this.actx.createBufferSource();
    noise.buffer = this.noiseBuffers.brown;
    noise.loop = true;
    const lowPass = this.actx.createBiquadFilter();
    lowPass.type = 'lowpass';
    lowPass.frequency.value = 90;
    const noiseGain = this.actx.createGain();
    noiseGain.gain.setValueAtTime(0, t);
    noiseGain.gain.linearRampToValueAtTime(0.5*intensity, t+0.3);
    noiseGain.gain.linearRampToValueAtTime(0, t+duration);
    noise.connect(lowPass);
    lowPass.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);
    noise.stop(t+duration);

    // Cracks - random short bursts
    for (let i=0; i<8+intensity*6; i++) {
      const ct = t + Math.random()*duration;
      const crack = this.actx.createBufferSource();
      crack.buffer = this.noiseBuffers.white;
      const bf = this.actx.createBiquadFilter();
      bf.type = 'highpass';
      bf.frequency.value = 800 + Math.random()*1200;
      const cg = this.actx.createGain();
      cg.gain.setValueAtTime(0, ct);
      cg.gain.linearRampToValueAtTime(0.3*intensity*Math.random(), ct+0.01);
      cg.gain.exponentialRampToValueAtTime(0.001, ct+0.15+Math.random()*0.2);
      crack.connect(bf);
      bf.connect(cg);
      cg.connect(this.masterGain);
      crack.start(ct);
      crack.stop(ct+0.3);
    }

    this.screenShake = intensity*2.5;
    this.earthquake.active = true;
    this.earthquake.intensity = intensity;
    this.earthquake.timer = duration;

    console.log(`[EARTHQUAKE] intensity ${intensity.toFixed(2)} duration ${duration.toFixed(1)}s - nearby buildings swaying, dust burst`);
  }

  playFireCrackle(x, y, z, intensity=1) {
    this.ensureAudio();
    if (!this.actx || Math.random()>0.15) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y, z);
    const noise = this.actx.createBufferSource();
    noise.buffer = this.noiseBuffers.white;
    const hp = this.actx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2000 + Math.random()*2000;
    const gain = this.actx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.12*intensity*Math.random(), t+0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, t+0.08+Math.random()*0.12);
    noise.connect(hp);
    hp.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.ambientGain);
    } else {
      gain.connect(this.ambientGain);
    }
    noise.start(t);
    noise.stop(t+0.2);
  }

  playWaterFlow(x, y, z, intensity=1) {
    this.ensureAudio();
    if (!this.actx || Math.random()>0.08) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y, z);
    // Bubbling
    const osc = this.actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300 + Math.random()*400, t);
    osc.frequency.exponentialRampToValueAtTime(600 + Math.random()*300, t+0.2);
    const gain = this.actx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.08*intensity, t+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t+0.35);
    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.ambientGain);
    } else {
      gain.connect(this.ambientGain);
    }
    osc.start(t);
    osc.stop(t+0.4);
  }

  playFlagFlap(x, y, z, windIntensity) {
    this.ensureAudio();
    if (!this.actx || Math.random()>windIntensity*0.12) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y, z);
    const noise = this.actx.createBufferSource();
    noise.buffer = this.noiseBuffers.white;
    const bp = this.actx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 400 + Math.random()*300;
    bp.Q.value = 1.2;
    const gain = this.actx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15*windIntensity, t+0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t+0.18);
    noise.connect(bp);
    bp.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.ambientGain);
    } else {
      gain.connect(this.ambientGain);
    }
    noise.start(t);
    noise.stop(t+0.2);
  }

  playChariotGallop(x, y, z, speed) {
    this.ensureAudio();
    if (!this.actx || Math.random()>0.2) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y, z);
    // 4 hoof beats
    for (let i=0;i<4;i++) {
      const ct = t + i*0.12/speed;
      const osc = this.actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80 + Math.random()*20, ct);
      const gain = this.actx.createGain();
      gain.gain.setValueAtTime(0, ct);
      gain.gain.linearRampToValueAtTime(0.18, ct+0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, ct+0.12);
      osc.connect(gain);
      if (panner && i===0) {
        gain.connect(panner);
        panner.connect(this.ambientGain);
      } else if (panner) {
        // reuse panner already connected
        gain.connect(panner);
      } else {
        gain.connect(this.ambientGain);
      }
      osc.start(ct);
      osc.stop(ct+0.13);
    }
    // Wheel rumble
    const noise = this.actx.createBufferSource();
    noise.buffer = this.noiseBuffers.brown;
    const lp = this.actx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 250;
    const ng = this.actx.createGain();
    ng.gain.setValueAtTime(0.08*speed, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t+0.5);
    noise.connect(lp);
    lp.connect(ng);
    if (panner) {
      ng.connect(panner);
    } else {
      ng.connect(this.ambientGain);
    }
    noise.start(t);
    noise.stop(t+0.55);
  }

  // --- VARIED VOICES ---

  playCivilianVoice(type, x, y, z, mood='talk') {
    this.ensureAudio();
    if (!this.actx) return;
    const profile = VOICE_PROFILES[type] || VOICE_PROFILES.citizen_m;
    const key = `${type}-${Math.floor(x)}-${Math.floor(z)}`;
    const now = this.actx.currentTime;
    if (this.voiceCooldowns.has(key) && now - this.voiceCooldowns.get(key) < 4 + Math.random()*6) return;
    this.voiceCooldowns.set(key, now);

    const t = now;
    const panner = this.createPanner(x, y||1.5, z);
    const syllables = 2 + Math.floor(Math.random()*4);
    const baseFreq = profile.base + (Math.random()-0.5)*profile.range;

    for (let i=0;i<syllables;i++) {
      const st = t + i*0.22/profile.speed + Math.random()*0.08;
      // Each syllable = formant filtered oscillator with pitch envelope
      const osc = this.actx.createOscillator();
      osc.type = i%2===0 ? 'sawtooth' : 'triangle';
      const startFreq = baseFreq * (1 + (Math.random()-0.5)*profile.pitchVar);
      const endFreq = startFreq * (1 + (Math.random()-0.5)*0.15);
      osc.frequency.setValueAtTime(startFreq, st);
      osc.frequency.linearRampToValueAtTime(endFreq, st+0.18);

      const formantFilter = this.actx.createBiquadFilter();
      formantFilter.type = 'bandpass';
      formantFilter.frequency.value = profile.formant + (Math.random()-0.5)*200;
      formantFilter.Q.value = 1.5 + Math.random();

      const gain = this.actx.createGain();
      gain.gain.setValueAtTime(0, st);
      gain.gain.linearRampToValueAtTime(0.12 + Math.random()*0.08, st+0.02);
      gain.gain.linearRampToValueAtTime(0.08, st+0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, st+0.22);

      // Add slight vibrato for realism
      const vibrato = this.actx.createOscillator();
      vibrato.type = 'sine';
      vibrato.frequency.value = 5 + Math.random()*2;
      const vibGain = this.actx.createGain();
      vibGain.gain.value = 8 + Math.random()*6;
      vibrato.connect(vibGain);
      vibGain.connect(osc.frequency);

      osc.connect(formantFilter);
      formantFilter.connect(gain);
      if (panner) {
        gain.connect(panner);
        if (i===0) panner.connect(this.voiceGain);
      } else {
        gain.connect(this.voiceGain);
      }

      osc.start(st);
      vibrato.start(st);
      osc.stop(st+0.25);
      vibrato.stop(st+0.25);
    }

    // Mood variations
    if (mood==='haggle' && type==='merchant') {
      // Fast excited haggling - extra syllables
      setTimeout(() => this.playCivilianVoice(type, x, y, z, 'talk'), 600);
    }
  }

  playFactionShout(faction, x, y, z) {
    this.ensureAudio();
    if (!this.actx) return;
    const fData = FACTION_VOICES[faction];
    if (!fData) return;
    const profile = VOICE_PROFILES[fData.profile];
    const phrase = fData.phrases[Math.floor(Math.random()*fData.phrases.length)];
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y||1.8, z);

    // Shout = louder, more projection, slight distortion
    const osc = this.actx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(profile.base*0.9, t);
    osc.frequency.linearRampToValueAtTime(profile.base*1.1, t+0.4);

    const filter = this.actx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = profile.formant;
    filter.Q.value = 2;

    const gain = this.actx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.35, t+0.05);
    gain.gain.linearRampToValueAtTime(0.28, t+0.35);
    gain.gain.exponentialRampToValueAtTime(0.001, t+0.8);

    // Add reverb for imperial
    let dest = this.voiceGain;
    if (faction==='emperor' || faction==='priest') {
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.reverb);
      // Also dry
      const dryGain = this.actx.createGain();
      dryGain.gain.value = 0.6;
      gain.connect(dryGain);
      if (panner) {
        dryGain.connect(panner);
        panner.connect(this.voiceGain);
      } else {
        dryGain.connect(this.voiceGain);
      }
    } else {
      osc.connect(filter);
      filter.connect(gain);
      if (panner) {
        gain.connect(panner);
        panner.connect(this.voiceGain);
      } else {
        gain.connect(this.voiceGain);
      }
    }

    osc.start(t);
    osc.stop(t+0.85);

    console.log(`[VOICE] ${faction} shouts "${phrase}" at ${x.toFixed(0)},${z.toFixed(0)} with ${profile.name} voice`);
    return phrase;
  }

  playCombatSound(type, x, y, z, combo=1) {
    this.ensureAudio();
    if (!this.actx) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y||1.2, z);
    const destGain = this.actx.createGain();
    destGain.gain.value = 0.22;
    if (panner) {
      destGain.connect(panner);
      panner.connect(this.masterGain);
    } else {
      destGain.connect(this.masterGain);
    }

    if (type==='swing') {
      const osc = this.actx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190 + combo*30, t);
      osc.frequency.exponentialRampToValueAtTime(55, t+0.16+combo*0.02);
      const f = this.actx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1200 + combo*200;
      const g = this.actx.createGain();
      g.gain.setValueAtTime(0.09+combo*0.02, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.20);
      osc.connect(f);
      f.connect(g);
      g.connect(destGain);
      osc.start(t);
      osc.stop(t+0.24);
    } else if (type==='hit') {
      const osc = this.actx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(30, t+0.12);
      const g = this.actx.createGain();
      g.gain.setValueAtTime(0.16, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.18);
      osc.connect(g);
      g.connect(destGain);
      osc.start(t);
      osc.stop(t+0.20);

      const osc2 = this.actx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(620, t);
      osc2.frequency.exponentialRampToValueAtTime(80, t+0.08);
      const g2 = this.actx.createGain();
      g2.gain.setValueAtTime(0.08, t);
      g2.gain.exponentialRampToValueAtTime(0.001, t+0.10);
      osc2.connect(g2);
      g2.connect(destGain);
      osc2.start(t);
      osc2.stop(t+0.12);
    } else if (type==='parry') {
      const osc = this.actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.exponentialRampToValueAtTime(1400, t+0.14);
      const g = this.actx.createGain();
      g.gain.setValueAtTime(0.20, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.38);
      osc.connect(g);
      g.connect(destGain);
      osc.start(t);
      osc.stop(t+0.42);
    } else if (type==='hurt') {
      // Different hurt sounds per role - varied voices
      const profiles = [VOICE_PROFILES.citizen_m, VOICE_PROFILES.guard, VOICE_PROFILES.rebel];
      const prof = profiles[Math.floor(Math.random()*profiles.length)];
      const osc = this.actx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(prof.base*0.8, t);
      osc.frequency.linearRampToValueAtTime(prof.base*0.4, t+0.28);
      const f = this.actx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 700;
      const g = this.actx.createGain();
      g.gain.setValueAtTime(0.20, t);
      g.gain.exponentialRampToValueAtTime(0.001, t+0.35);
      osc.connect(f);
      f.connect(g);
      g.connect(destGain);
      osc.start(t);
      osc.stop(t+0.42);
    }
  }

  // --- WEATHER & EARTHQUAKE UPDATE LOOP ---

  update(dt, playerPos, skySystem, dustSystem, animatedTrees, buildingMeshes) {
    if (!this.actx) return;

    // Update listener position
    if (this.actx.listener && playerPos) {
      const listener = this.actx.listener;
      if (listener.positionX) {
        listener.positionX.value = playerPos.x;
        listener.positionY.value = playerPos.y || 1.75;
        listener.positionZ.value = playerPos.z;
      } else {
        listener.setPosition(playerPos.x, playerPos.y||1.75, playerPos.z);
      }
      // Orientation from camera
      if (this.camera) {
        const orientation = new THREE.Vector3();
        this.camera.getWorldDirection(orientation);
        if (listener.forwardX) {
          listener.forwardX.value = orientation.x;
          listener.forwardY.value = orientation.y;
          listener.forwardZ.value = orientation.z;
          listener.upX.value = 0;
          listener.upY.value = 1;
          listener.upZ.value = 0;
        } else {
          listener.setOrientation(orientation.x, orientation.y, orientation.z, 0,1,0);
        }
      }
    }

    // Weather state machine
    this.weather.timer -= dt;
    this.weather.thunderTimer -= dt;
    this.weather.stormTimer -= dt;

    if (this.weather.timer <=0) {
      // Change weather
      const states = ['clear', 'cloudy', 'rain', 'storm'];
      const weights = this.weather.state==='clear' ? [0.4,0.3,0.2,0.1] :
                      this.weather.state==='cloudy' ? [0.2,0.3,0.3,0.2] :
                      this.weather.state==='rain' ? [0.15,0.25,0.35,0.25] :
                      [0.25,0.25,0.2,0.3];
      let r = Math.random();
      let accum=0;
      let next='clear';
      for (let i=0;i<states.length;i++) {
        accum+=weights[i];
        if (r<accum) { next=states[i]; break; }
      }
      this.weather.state = next;
      this.weather.timer = 40 + Math.random()*80;
      this.weather.intensity = next==='clear'?0 : next==='cloudy'?0.2 : next==='rain'?0.5+Math.random()*0.3 : 0.8+Math.random()*0.4;
      this.weather.rainIntensity = next==='rain'?0.4+Math.random()*0.4 : next==='storm'?0.7+Math.random()*0.3 : 0;
      this.weather.windIntensity = next==='clear'?0.1+Math.random()*0.2 : next==='cloudy'?0.3+Math.random()*0.3 : next==='rain'?0.5+Math.random()*0.3 : 0.8+Math.random()*0.4;
      console.log(`[WEATHER] Changed to ${next} intensity ${this.weather.intensity.toFixed(2)} rain ${this.weather.rainIntensity.toFixed(2)} wind ${this.weather.windIntensity.toFixed(2)}`);

      if (next==='storm' || next==='rain') {
        this.startWeatherLoop();
      }
    }

    // Update weather audio gains
    if (this.weatherLoop) {
      const targetWind = this.weather.windIntensity*0.18;
      const targetRain = this.weather.rainIntensity*0.22;
      this.weatherLoop.windGain.gain.linearRampToValueAtTime(targetWind, this.actx.currentTime+0.5);
      this.weatherLoop.rainGain.gain.linearRampToValueAtTime(targetRain, this.actx.currentTime+0.5);
      // Wind filter frequency varies with intensity
      this.weatherLoop.windFilter.frequency.linearRampToValueAtTime(400 + this.weather.windIntensity*600, this.actx.currentTime+1);
      this.weatherGain.gain.linearRampToValueAtTime(this.weather.intensity*0.6, this.actx.currentTime+1);
    }

    // Rain droplets
    if (this.weather.rainIntensity>0) {
      this.playRain(this.weather.rainIntensity);
      // Visual rain handled by weather.js RainSystem
    }

    // Thunder during storm
    if (this.weather.state==='storm' && this.weather.thunderTimer<=0) {
      this.weather.thunderTimer = 4 + Math.random()*10;
      const intensity = 0.6 + Math.random()*0.8;
      const thunderPos = {
        x: playerPos ? playerPos.x + (Math.random()-0.5)*600 : (Math.random()-0.5)*800,
        y: 200,
        z: playerPos ? playerPos.z + (Math.random()-0.5)*600 : (Math.random()-0.5)*600
      };
      this.playThunder(intensity, thunderPos);
    }

    // Earthquake cooldown
    this.earthquake.cooldown -= dt;
    if (!this.earthquake.active && this.earthquake.cooldown<=0 && Math.random()<0.008) {
      // Trigger earthquake
      const intensity = 0.4 + Math.random()*0.8;
      const duration = 3 + Math.random()*5;
      this.playEarthquake(intensity, duration);
      this.earthquake.cooldown = 90 + Math.random()*150;
    }

    // Earthquake update
    if (this.earthquake.active) {
      this.earthquake.timer -= dt;
      this.screenShake = this.earthquake.intensity * (1 + Math.sin(this.actx.currentTime*18)*0.5);
      // Shake camera
      if (this.camera && this.player) {
        const shakeX = (Math.random()-0.5)*this.screenShake;
        const shakeY = (Math.random()-0.5)*this.screenShake*0.5;
        const shakeZ = (Math.random()-0.5)*this.screenShake;
        this.camera.position.x += shakeX*0.1;
        this.camera.position.y += shakeY*0.1;
        this.camera.position.z += shakeZ*0.1;
      }
      // Dust burst
      if (dustSystem && Math.random()<0.3) {
        // Increase dust opacity temporarily
        if (dustSystem.points) {
          dustSystem.points.material.opacity = 0.35 + this.earthquake.intensity*0.4;
        }
      }
      // Building sway - animate nearby buildings
      if (buildingMeshes && this.earthquake.intensity>0.6) {
        // Sway handled via animatedTrees intensified
      }
      if (this.earthquake.timer<=0) {
        this.earthquake.active = false;
        this.screenShake = 0;
        if (dustSystem && dustSystem.points) {
          dustSystem.points.material.opacity = 0.35;
        }
        console.log('[EARTHQUAKE] Ended');
      }
    } else {
      this.screenShake *= 0.92;
    }

    // Sky adjustments for weather
    if (skySystem) {
      if (this.weather.state==='storm') {
        skySystem.skyUniforms['turbidity'].value = 10 + this.weather.intensity*4;
        if (this.scene.fog) {
          this.scene.fog.color.setRGB(0.4+this.weather.intensity*0.1, 0.42+this.weather.intensity*0.08, 0.45+this.weather.intensity*0.1);
          this.scene.fog.near = 80;
          this.scene.fog.far = 400 + (1-this.weather.intensity)*300;
        }
      } else if (this.weather.state==='rain') {
        skySystem.skyUniforms['turbidity'].value = 8 + this.weather.intensity*2;
        if (this.scene.fog) {
          this.scene.fog.near = 100;
          this.scene.fog.far = 600;
        }
      } else if (this.weather.state==='cloudy') {
        skySystem.skyUniforms['turbidity'].value = 7;
        if (this.scene.fog) {
          this.scene.fog.near = 130;
          this.scene.fog.far = 800;
        }
      } else {
        // clear - restore
        if (this.scene.fog) {
          this.scene.fog.near = 150;
          this.scene.fog.far = 900;
        }
      }
    }
  }

  // --- AMBIENT LOOPS AT LOCATIONS ---

  createLocationAmbience() {
    // Called once to setup ambient sounds at key locations
    // Forum crowd
    this.createAmbientAt(0, 1.5, 0, 'forum_crowd', 0.12);
    // Market
    this.createAmbientAt(-160, 1.5, 50, 'market', 0.14);
    this.createAmbientAt(400, 1.5, -100, 'market', 0.12);
    // Baths
    this.createAmbientAt(-350, 1.5, -150, 'baths', 0.15);
    this.createAmbientAt(320, 1.5, -380, 'baths', 0.15);
    this.createAmbientAt(350, 1.5, 150, 'baths', 0.12);
    // Circus
    this.createAmbientAt(0, 1.5, -650, 'circus', 0.18);
    // Colosseum
    this.createAmbientAt(550, 1.5, -250, 'colosseum', 0.20);
    // Pantheon
    this.createAmbientAt(-150, 1.5, -380, 'pantheon', 0.10);
    // Fountain
    this.createAmbientAt(0, 0.5, 0, 'fountain', 0.10);
    // Aqueduct
    this.createAmbientAt(0, 6, -300, 'aqueduct', 0.08);
    // Subura
    this.createAmbientAt(-600, 1.5, 150, 'subura', 0.13);
    // Palatine
    this.createAmbientAt(0, 1.5, 450, 'palatine', 0.09);
  }

  createAmbientAt(x, y, z, type, baseVol) {
    // Store for periodic triggering
    this.ambientLoops.push({ x, y, z, type, baseVol, timer: Math.random()*5 });
  }

  updateAmbientLoops(dt, playerPos) {
    for (const amb of this.ambientLoops) {
      amb.timer -= dt;
      if (amb.timer<=0) {
        amb.timer = 3 + Math.random()*6;
        const dist = playerPos ? Math.hypot(playerPos.x-amb.x, playerPos.z-amb.z) : 100;
        if (dist>150) continue; // too far
        const vol = amb.baseVol * Math.max(0, 1 - dist/150);
        if (vol<0.01) continue;

        switch(amb.type) {
          case 'forum_crowd':
            // Murmur of many voices with varied profiles
            for (let i=0;i<3;i++) {
              const t = ['citizen_m','citizen_f','merchant','noble_m'][Math.floor(Math.random()*4)];
              this.playCivilianVoice(t, amb.x+(Math.random()-0.5)*20, amb.y, amb.z+(Math.random()-0.5)*20, 'talk');
            }
            break;
          case 'market':
            for (let i=0;i<2;i++) {
              this.playCivilianVoice('merchant', amb.x+(Math.random()-0.5)*10, amb.y, amb.z+(Math.random()-0.5)*10, 'haggle');
            }
            this.playCivilianVoice('citizen_f', amb.x, amb.y, amb.z, 'talk');
            break;
          case 'baths':
            this.playWaterFlow(amb.x+(Math.random()-0.5)*8, amb.y, amb.z+(Math.random()-0.5)*8, vol*2);
            if (Math.random()<0.3) this.playCivilianVoice('citizen_m', amb.x, amb.y, amb.z, 'talk');
            break;
          case 'circus':
            this.playChariotGallop(amb.x+(Math.random()-0.5)*30, amb.y, amb.z+(Math.random()-0.5)*10, 1.2);
            if (Math.random()<0.4) {
              // Crowd cheer
              for (let i=0;i<4;i++) {
                const t = ['citizen_m','citizen_f','child'][Math.floor(Math.random()*3)];
                this.playCivilianVoice(t, amb.x+(Math.random()-0.5)*40, amb.y, amb.z+(Math.random()-0.5)*15, 'cheer');
              }
            }
            break;
          case 'colosseum':
            if (Math.random()<0.5) {
              for (let i=0;i<5;i++) {
                const t = ['guard','legionary','citizen_m','citizen_f','child'][Math.floor(Math.random()*5)];
                this.playCivilianVoice(t, amb.x+(Math.random()-0.5)*30, amb.y, amb.z+(Math.random()-0.5)*30, 'cheer');
              }
            }
            break;
          case 'pantheon':
            this.playWaterFlow(amb.x, amb.y, amb.z, 0.5);
            if (Math.random()<0.2) this.playCivilianVoice('priest', amb.x, amb.y, amb.z, 'talk');
            break;
          case 'fountain':
            this.playWaterFlow(amb.x, amb.y, amb.z, 1.2);
            break;
          case 'aqueduct':
            this.playWaterFlow(amb.x, amb.y, amb.z, 0.8);
            break;
          case 'subura':
            for (let i=0;i<2;i++) {
              const t = ['rebel','citizen_m','child'][Math.floor(Math.random()*3)];
              this.playCivilianVoice(t, amb.x+(Math.random()-0.5)*20, amb.y, amb.z+(Math.random()-0.5)*20, 'talk');
            }
            break;
          case 'palatine':
            this.playCivilianVoice('noble_f', amb.x, amb.y, amb.z, 'talk');
            this.playCivilianVoice('guard', amb.x+5, amb.y, amb.z, 'talk');
            break;
        }
      }
    }
  }

  // --- PUBLIC API FOR GAME EVENTS ---

  onFootstep(surface, x, y, z, sprint=false) {
    const now = this.actx ? this.actx.currentTime : Date.now()/1000;
    if (now - this.lastFootstep < (sprint?0.30:0.45)) return;
    this.lastFootstep = now;
    this.ensureAudio();
    if (!this.actx) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y, z);
    const freq = surface==='marble'? 180 : surface==='wood'? 140 : surface==='water'? 90 : 110;
    const osc = this.actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq + Math.random()*24, t);
    const gain = this.actx.createGain();
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t+0.13);
    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.ambientGain);
    } else {
      gain.connect(this.ambientGain);
    }
    osc.start(t);
    osc.stop(t+0.15);
  }

  onDoorOpen(x, y, z) {
    this.ensureAudio();
    if (!this.actx) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y, z);
    const osc = this.actx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, t);
    osc.frequency.linearRampToValueAtTime(80, t+0.4);
    const gain = this.actx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t+0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, t+0.6);
    osc.connect(gain);
    if (panner) {
      gain.connect(panner);
      panner.connect(this.ambientGain);
    } else {
      gain.connect(this.ambientGain);
    }
    osc.start(t);
    osc.stop(t+0.65);
  }

  onBuildingPlace(x, y, z) {
    this.ensureAudio();
    if (!this.actx) return;
    const t = this.actx.currentTime;
    const panner = this.createPanner(x, y, z);
    for (let i=0;i<3;i++) {
      const ct = t + i*0.12;
      const osc = this.actx.createOscillator();
      osc.type = 'square';
      osc.frequency.setValueAtTime(200 - i*30, ct);
      const gain = this.actx.createGain();
      gain.gain.setValueAtTime(0.12, ct);
      gain.gain.exponentialRampToValueAtTime(0.001, ct+0.25);
      osc.connect(gain);
      if (panner && i===0) {
        gain.connect(panner);
        panner.connect(this.masterGain);
      } else if (panner) {
        gain.connect(panner);
      } else {
        gain.connect(this.masterGain);
      }
      osc.start(ct);
      osc.stop(ct+0.3);
    }
  }

  onQuestComplete(x, y, z) {
    this.ensureAudio();
    if (!this.actx) return;
    const t = this.actx.currentTime;
    const notes = [261.63, 329.63, 392.00, 523.25]; // C E G C
    notes.forEach((freq, i) => {
      const ct = t + i*0.12;
      const osc = this.actx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ct);
      const gain = this.actx.createGain();
      gain.gain.setValueAtTime(0, ct);
      gain.gain.linearRampToValueAtTime(0.18, ct+0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ct+0.6);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(ct);
      osc.stop(ct+0.65);
    });
  }
}
