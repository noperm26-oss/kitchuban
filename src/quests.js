/**
 * Kitchuban Quests - No admins, everyone equal
 * Dynamic quests from Emperor, Senate, Factions, random events
 */

export const QUEST_TYPES = {
  kill_rebels: { name: 'Purge Rebels', desc: 'Kill {count} rebels threatening the Forum', reward: { gold: 150, xp: 100 }, icon: '⚔️' },
  kill_legio: { name: 'Defy Legio', desc: 'Defeat {count} legionaries (rebel path)', reward: { gold: 120, xp: 90 }, icon: '🗡️' },
  patrol: { name: 'Patrol Forum', desc: 'Patrol {count} key locations: Temple Saturn, Vesta, Basilicas', reward: { gold: 80, xp: 60 }, icon: '🏛️' },
  gather_grain: { name: 'Gather Grain', desc: 'Collect {count} grain sacks from market', reward: { gold: 100, xp: 70 }, icon: '🌾' },
  protect_vestals: { name: 'Protect Sacred Fire', desc: 'Defend Temple Vesta for {count} seconds without rebels entering', reward: { gold: 200, xp: 150 }, icon: '🔥' },
  treasury: { name: 'Secure Treasury', desc: 'Guard Aerarium in Temple Saturn, kill {count} intruders', reward: { gold: 250, xp: 180 }, icon: '💰' },
  explore: { name: 'Explore Roma', desc: 'Discover {count} buildings interiors (no noclip)', reward: { gold: 90, xp: 80 }, icon: '🗺️' },
  survive: { name: 'Survive Waves', desc: 'Survive {count} waves without dying', reward: { gold: 300, xp: 200 }, icon: '🛡️' },
};

export class QuestManager {
  constructor(player, factionZones, buildingInteriors) {
    this.player = player;
    this.factionZones = factionZones;
    this.buildingInteriors = buildingInteriors;
    this.activeQuests = [];
    this.completedQuests = [];
    this.questIdCounter = 0;
    this.discoveredBuildings = new Set();
    this.patrolLocations = [];
    this.gold = parseInt(localStorage.getItem('kitchuban_gold') || '0');
    this.xp = parseInt(localStorage.getItem('kitchuban_xp') || '0');
    this.level = parseInt(localStorage.getItem('kitchuban_level') || '1');
    
    this.generateInitialQuests();
  }

  generateInitialQuests() {
    // Generate 3 random quests
    for (let i=0;i<3;i++) this.generateQuest();
  }

  generateQuest() {
    const types = Object.keys(QUEST_TYPES);
    const type = types[Math.floor(Math.random()*types.length)];
    const template = QUEST_TYPES[type];
    
    // Adjust based on player faction
    if (this.player.faction === 'rebels' && type === 'kill_rebels') return this.generateQuest(); // rebels don't kill rebels
    if (this.player.faction !== 'rebels' && type === 'kill_legio') {
      if (Math.random() < 0.7) return this.generateQuest(); // mostly rebels get this
    }

    let count = 3 + Math.floor(Math.random()*5);
    if (type === 'patrol') count = 3;
    if (type === 'protect_vestals') count = 60 + Math.floor(Math.random()*60);
    if (type === 'explore') count = 5 + Math.floor(Math.random()*5);
    if (type === 'survive') count = 2 + Math.floor(Math.random()*3);

    const quest = {
      id: ++this.questIdCounter,
      type,
      name: template.name,
      desc: template.desc.replace('{count}', count),
      icon: template.icon,
      targetCount: count,
      currentCount: 0,
      reward: { ...template.reward },
      completed: false,
      from: this.getQuestGiver(type),
    };
    this.activeQuests.push(quest);
    console.log('[QUEST] New quest:', quest);
    return quest;
  }

  getQuestGiver(type) {
    const givers = {
      kill_rebels: 'Legatus Legio I Italica',
      kill_legio: 'Rebel Chief in Subura',
      patrol: 'Praetorian Prefect',
      gather_grain: 'Mercatores Guild',
      protect_vestals: 'Vestalis Maxima',
      treasury: 'Quaestor - Aerarium',
      explore: 'Senatus - Tabularium',
      survive: 'Imperator Caesar',
    };
    return givers[type] || 'Senatus';
  }

  onKill(faction) {
    for (const q of this.activeQuests) {
      if (q.completed) continue;
      if (q.type === 'kill_rebels' && faction === 'rebels') q.currentCount++;
      if (q.type === 'kill_legio' && (faction === 'legio' || faction === 'praetorian')) q.currentCount++;
      if (q.type === 'treasury' && this.isNearTempleSaturn()) q.currentCount++;
      this.checkCompletion(q);
    }
  }

  onPatrol(x, z) {
    // Check if near key locations
    const keyLocs = [
      { name: 'Temple Saturn', x: -140, z: -160, r: 30 },
      { name: 'Temple Vesta', x: 140, z: -160, r: 30 },
      { name: 'Basilica Julia', x: -140, z: 10, r: 40 },
      { name: 'Basilica Aemilia', x: 140, z: 10, r: 40 },
      { name: 'Curia Julia', x: -200, z: -50, r: 30 },
    ];
    for (const loc of keyLocs) {
      const dist = Math.hypot(x - loc.x, z - loc.z);
      if (dist < loc.r) {
        if (!this.patrolLocations.includes(loc.name)) {
          this.patrolLocations.push(loc.name);
          for (const q of this.activeQuests) {
            if (q.type === 'patrol' && !q.completed) {
              q.currentCount = this.patrolLocations.length;
              this.checkCompletion(q);
            }
          }
        }
      }
    }
  }

  onDiscoverBuilding(type, x, z) {
    const key = `${type}_${Math.round(x)}_${Math.round(z)}`;
    if (!this.discoveredBuildings.has(key)) {
      this.discoveredBuildings.add(key);
      for (const q of this.activeQuests) {
        if (q.type === 'explore' && !q.completed) {
          q.currentCount++;
          this.checkCompletion(q);
        }
      }
    }
  }

  onGather(resource) {
    for (const q of this.activeQuests) {
      if (q.type === 'gather_grain' && resource === 'grain' && !q.completed) {
        q.currentCount++;
        this.checkCompletion(q);
      }
    }
  }

  onSurviveWave() {
    for (const q of this.activeQuests) {
      if (q.type === 'survive' && !q.completed) {
        q.currentCount++;
        this.checkCompletion(q);
      }
    }
  }

  isNearTempleSaturn() {
    if (!this.player) return false;
    return Math.hypot(this.player.position.x + 140, this.player.position.z + 160) < 35;
  }

  checkCompletion(quest) {
    if (quest.currentCount >= quest.targetCount && !quest.completed) {
      quest.completed = true;
      quest.currentCount = quest.targetCount;
      this.gold += quest.reward.gold;
      this.xp += quest.reward.xp;
      // Level up check
      const xpNeeded = this.level * 250;
      if (this.xp >= xpNeeded) {
        this.level++;
        this.xp -= xpNeeded;
        this.gold += this.level * 50;
        console.log(`[QUEST] LEVEL UP! Level ${this.level}`);
      }
      this.save();
      this.completedQuests.push(quest);
      console.log(`[QUEST] Completed: ${quest.name} +${quest.reward.gold} gold +${quest.reward.xp} xp`);
      
      // Remove completed and generate new
      setTimeout(() => {
        this.activeQuests = this.activeQuests.filter(q => q.id !== quest.id);
        this.generateQuest();
      }, 2000);
      
      return true;
    }
    return false;
  }

  save() {
    localStorage.setItem('kitchuban_gold', this.gold.toString());
    localStorage.setItem('kitchuban_xp', this.xp.toString());
    localStorage.setItem('kitchuban_level', this.level.toString());
  }

  getActiveQuests() {
    return this.activeQuests;
  }

  getProgress() {
    return {
      gold: this.gold,
      xp: this.xp,
      level: this.level,
      active: this.activeQuests.length,
      completed: this.completedQuests.length,
      discovered: this.discoveredBuildings.size,
      patrol: this.patrolLocations.length,
    };
  }
}
