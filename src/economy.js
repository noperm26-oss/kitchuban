/**
 * Kitchuban Economy - No admins, everyone equal, trading, building, gathering
 * x10000 better: persistent economy via Node backend, resource nodes, market
 */
import * as THREE from 'three';
import { MAT } from './materials.js';

export const RESOURCES = {
  grain: { name: 'Grain', color: 0xe8d8a0, value: 12, icon: '🌾' },
  wine: { name: 'Wine', color: 0x8a1a3a, value: 25, icon: '🍷' },
  oil: { name: 'Oil', color: 0x6a8a2a, value: 18, icon: '🫒' },
  weapons: { name: 'Weapons', color: 0x4a4a4a, value: 45, icon: '⚔️' },
  marble: { name: 'Marble', color: 0xf0f0f0, value: 60, icon: '🏛️' },
  gold: { name: 'Gold', color: 0xffd700, value: 100, icon: '💰' },
  wood: { name: 'Wood', color: 0x8a5a3a, value: 8, icon: '🪵' },
};

export class EconomyManager {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.resources = {}; // resource -> count
    for (const r of Object.keys(RESOURCES)) this.resources[r] = 0;
    this.resources.gold = parseInt(localStorage.getItem('kitchuban_gold') || '0');
    
    this.resourceNodes = []; // {mesh, type, x,z, amount, respawnTimer}
    this.buildings = []; // player built buildings
    this.marketPrices = { grain: 12, wine: 25, oil: 18, weapons: 45, marble: 60, gold: 100 };
    
    this.createResourceNodes();
  }

  createResourceNodes() {
    // Create resource nodes around FULL EMPIRE map - grain fields, quarries, etc - animations everywhere bobbing
    const nodeSpots = [
      // Grain fields - Campus Martius area north
      { type: 'grain', x: -200, z: -280, amount: 10 },
      { type: 'grain', x: 0, z: -280, amount: 10 },
      { type: 'grain', x: 200, z: -280, amount: 10 },
      { type: 'grain', x: -100, z: 280, amount: 10 },
      { type: 'grain', x: 100, z: 280, amount: 10 },
      { type: 'grain', x: -500, z: 100, amount: 10 },
      { type: 'grain', x: 400, z: 200, amount: 10 },
      { type: 'grain', x: -600, z: -400, amount: 12 },
      { type: 'grain', x: 600, z: -300, amount: 12 },
      { type: 'grain', x: 0, z: -600, amount: 12 },
      { type: 'grain', x: -300, z: 600, amount: 12 },
      // Wood - forests
      { type: 'wood', x: -300, z: -400, amount: 12 },
      { type: 'wood', x: 300, z: -400, amount: 12 },
      { type: 'wood', x: -400, z: 300, amount: 12 },
      { type: 'wood', x: 400, z: -200, amount: 12 },
      { type: 'wood', x: 0, z: 600, amount: 15 },
      { type: 'wood', x: -700, z: 0, amount: 12 },
      { type: 'wood', x: 700, z: 100, amount: 12 },
      { type: 'wood', x: -150, z: -500, amount: 14 },
      { type: 'wood', x: 350, z: -500, amount: 14 },
      { type: 'wood', x: 0, z: 800, amount: 16 },
      // Marble quarry - east and near new monuments
      { type: 'marble', x: 300, z: -100, amount: 8 },
      { type: 'marble', x: 300, z: 100, amount: 8 },
      { type: 'marble', x: -300, z: 0, amount: 8 },
      { type: 'marble', x: 550, z: -250, amount: 8 },
      { type: 'marble', x: 320, z: -380, amount: 10 }, // Baths Diocletian
      { type: 'marble', x: -150, z: -380, amount: 10 }, // Pantheon
      { type: 'marble', x: 400, z: -180, amount: 9 }, // Domus Aurea
      { type: 'marble', x: 0, z: 450, amount: 9 }, // Palatine Palace
      // Wine - south and new areas
      { type: 'wine', x: -150, z: 250, amount: 6 },
      { type: 'wine', x: 150, z: 250, amount: 6 },
      { type: 'wine', x: 400, z: 300, amount: 6 },
      { type: 'wine', x: -350, z: -500, amount: 7 },
      { type: 'wine', x: 100, z: -420, amount: 7 }, // Ara Pacis
      // Oil
      { type: 'oil', x: -250, z: 150, amount: 6 },
      { type: 'oil', x: 250, z: -150, amount: 6 },
      { type: 'oil', x: -350, z: -150, amount: 6 },
      { type: 'oil', x: 120, z: -260, amount: 7 }, // Markets Trajan
      { type: 'oil', x: -600, z: -350, amount: 7 }, // Mausoleum Hadrian
      // Weapons - near faction camps and new monuments
      { type: 'weapons', x: 0, z: -450, amount: 5 },
      { type: 'weapons', x: 500, z: 0, amount: 5 },
      { type: 'weapons', x: -600, z: 150, amount: 5 },
      { type: 'weapons', x: 0, z: 500, amount: 5 },
      { type: 'weapons', x: -80, z: -200, amount: 6 }, // Arch Septimius
      { type: 'weapons', x: 180, z: 60, amount: 6 }, // Arch Titus
      { type: 'weapons', x: 0, z: -650, amount: 6 }, // Circus Maximus
      { type: 'weapons', x: 550, z: -250, amount: 6 }, // Colosseum
      { type: 'weapons', x: -350, z: -500, amount: 6 }, // Mausoleum Augustus
    ];

    for (const spot of nodeSpots) {
      this.createNode(spot.type, spot.x, spot.z, spot.amount);
    }
  }

  createNode(type, x, z, amount) {
    const group = new THREE.Group();
    group.position.set(x, 0, z);
    
    const resData = RESOURCES[type];
    let mesh;
    
    if (type === 'grain') {
      // Wheat field - small golden boxes
      for (let i=0;i<5;i++) {
        const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.2 + Math.random()*0.5, 0.3), new THREE.MeshStandardMaterial({color: resData.color}));
        stalk.position.set((Math.random()-0.5)*3, 0.6, (Math.random()-0.5)*3);
        group.add(stalk);
      }
      mesh = new THREE.Mesh(new THREE.BoxGeometry(4, 0.2, 4), new THREE.MeshStandardMaterial({color: 0x5a4a2a}));
      mesh.position.y = 0.1;
      group.add(mesh);
    } else if (type === 'marble') {
      mesh = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.8, 2.5), new THREE.MeshStandardMaterial({color: resData.color, roughness: 0.4}));
      mesh.position.y = 0.9;
      mesh.castShadow = true;
      group.add(mesh);
      // smaller rocks
      for (let i=0;i<3;i++) {
        const rock = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.5,0.6), new THREE.MeshStandardMaterial({color: 0xcccccc}));
        rock.position.set((Math.random()-0.5)*2, 0.25, (Math.random()-0.5)*2);
        group.add(rock);
      }
    } else {
      // Generic crate/barrel
      mesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.2, 1.5), new THREE.MeshStandardMaterial({color: resData.color}));
      mesh.position.y = 0.6;
      mesh.castShadow = true;
      group.add(mesh);
      const top = new THREE.Mesh(new THREE.BoxGeometry(1.6,0.2,1.6), MAT.woodDark);
      top.position.y = 1.3;
      group.add(top);
    }

    // Floating icon
    const canvas = document.createElement('canvas'); canvas.width=128; canvas.height=128;
    const ctx = canvas.getContext('2d'); ctx.font='64px serif'; ctx.textAlign='center'; ctx.fillText(resData.icon, 64, 80);
    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({map: tex, transparent: true});
    const sprite = new THREE.Sprite(spriteMat); sprite.position.y=3.2; sprite.scale.set(2,2,1); group.add(sprite);

    this.scene.add(group);
    
    this.resourceNodes.push({
      type, x, z, amount, maxAmount: amount,
      mesh: group,
      sprite,
      respawnTimer: 0,
      collected: false,
    });
  }

  update(dt) {
    for (const node of this.resourceNodes) {
      if (node.collected) {
        node.respawnTimer -= dt;
        node.mesh.visible = false;
        if (node.respawnTimer <= 0) {
          node.collected = false;
          node.amount = node.maxAmount;
          node.mesh.visible = true;
        }
      } else {
        // Bobbing animation
        node.mesh.position.y = Math.sin(Date.now()*0.003 + node.x) * 0.1;
        // Check if player near (2.5m)
        const dist = Math.hypot(this.player.position.x - node.x, this.player.position.z - node.z);
        if (dist < 2.8) {
          // Auto collect
          this.collect(node);
        }
      }
    }
  }

  collect(node) {
    if (node.collected) return;
    const resData = RESOURCES[node.type];
    const amount = 1 + Math.floor(Math.random()*2);
    this.resources[node.type] = (this.resources[node.type]||0) + amount;
    this.resources.gold += Math.floor(resData.value * amount * 0.3); // bonus gold
    node.amount -= amount;
    
    console.log(`[ECONOMY] Collected ${amount} ${node.type}, total ${this.resources[node.type]}`);
    
    // Visual feedback - floating text would be nice, but we log and save
    localStorage.setItem('kitchuban_resources', JSON.stringify(this.resources));
    localStorage.setItem('kitchuban_gold', this.resources.gold.toString());
    
    if (node.amount <= 0) {
      node.collected = true;
      node.respawnTimer = 30 + Math.random()*20; // respawn in 30-50 sec
      console.log(`[ECONOMY] Node ${node.type} depleted, respawning in ${node.respawnTimer.toFixed(0)}s`);
    }
    
    return { type: node.type, amount, gold: Math.floor(resData.value * amount * 0.3) };
  }

  canAfford(cost) {
    // cost = { gold: 100, marble: 5, etc }
    for (const [res, amt] of Object.entries(cost)) {
      if ((this.resources[res]||0) < amt) return false;
    }
    return true;
  }

  pay(cost) {
    if (!this.canAfford(cost)) return false;
    for (const [res, amt] of Object.entries(cost)) {
      this.resources[res] -= amt;
    }
    localStorage.setItem('kitchuban_resources', JSON.stringify(this.resources));
    localStorage.setItem('kitchuban_gold', this.resources.gold.toString());
    return true;
  }

  getResources() {
    return { ...this.resources };
  }

  updateMarketPrices(serverPrices) {
    if (serverPrices) {
      this.marketPrices = { ...this.marketPrices, ...serverPrices };
    }
  }
}
