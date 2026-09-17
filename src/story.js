/**
 * Kitchuban Story - Main narrative arc, historical events, no admins, everyone equal
 * Static client-only serious game with branching story
 */

export const STORY_CHAPTERS = [
  {
    id: 'arrival',
    title: 'Arrival in Rome',
    desc: 'You arrive in Rome as a lowly citizen. The Forum bustles, but shadows gather in Subura.',
    objectives: [
      { type: 'explore', target: 'Forum Romanum', desc: 'Explore the Forum', count: 1 },
      { type: 'talk', target: 'citizen', desc: 'Talk to 3 citizens with unique voices', count: 3 },
      { type: 'gather', target: 'grain', desc: 'Gather grain for survival', count: 3 },
    ],
    reward: { gold: 100, xp: 80, title: 'Citizen of Rome' },
    next: 'shadows',
    voice: { faction: 'senate', line: 'Welcome to Rome, citizen. The Republic needs you.' },
  },
  {
    id: 'shadows',
    title: 'Shadows in Subura',
    desc: 'Rebels plot in the slums of Subura. The Praetorian Guard seeks recruits to crush them.',
    objectives: [
      { type: 'kill', target: 'rebels', desc: 'Defeat 5 rebels in Subura', count: 5 },
      { type: 'patrol', target: 'Subura', desc: 'Patrol Subura slums', count: 1 },
      { type: 'discover', target: 'faction_camp', desc: 'Find rebel camp', count: 1 },
    ],
    reward: { gold: 180, xp: 120, title: 'Defender of Order' },
    next: 'fire',
    voice: { faction: 'praetorian', line: 'Rebels infest Subura. Show us your steel!' },
    weather: 'rain',
  },
  {
    id: 'fire',
    title: 'Sacred Fire Threatened',
    desc: 'The sacred fire of Vesta flickers. Vestals report ominous signs — earthquake tremors, dark omens.',
    objectives: [
      { type: 'protect', target: 'vesta', desc: 'Protect Temple of Vesta for 90s', count: 90 },
      { type: 'gather', target: 'oil', desc: 'Gather oil for sacred lamps', count: 4 },
      { type: 'talk', target: 'vestal', desc: 'Speak with Vestalis Maxima - soft reverent voice', count: 1 },
    ],
    reward: { gold: 250, xp: 180, title: 'Guardian of Vesta' },
    next: 'earthquake',
    voice: { faction: 'vestals', line: 'Vesta sancta! The eternal flame gutters. Help us!' },
    earthquake: true,
  },
  {
    id: 'earthquake',
    title: 'Tellus Trembles',
    desc: 'An earthquake shakes Rome! Buildings sway, dust chokes the Forum, citizens scream with varied voices. The Pontifex Maximus says the gods are angry.',
    objectives: [
      { type: 'survive', target: 'earthquake', desc: 'Survive earthquake - buildings sway, screen shake', count: 1 },
      { type: 'help', target: 'citizen', desc: 'Help 5 citizens after quake - varied voices', count: 5 },
      { type: 'build', target: 'shelter', desc: 'Build shelters for displaced', count: 2 },
    ],
    reward: { gold: 300, xp: 220, title: 'Earthquake Survivor' },
    next: 'storm',
    voice: { faction: 'emperor', line: 'Tellus irata! The earth itself rebels! Stand firm!' },
    earthquake: true,
  },
  {
    id: 'storm',
    title: 'Jupiter Tonans',
    desc: 'A great storm gathers. Jupiter Tonans thunders over Rome. Lightning splits the sky over the Pantheon, rain lashes the Forum, aqueducts overflow.',
    objectives: [
      { type: 'survive', target: 'storm', desc: 'Survive storm with thunder and lightning', count: 1 },
      { type: 'explore', target: 'pantheon', desc: 'Reach Pantheon during storm - oculus beam + echo reverb', count: 1 },
      { type: 'gather', target: 'wood', desc: 'Gather wood for storm repairs', count: 6 },
    ],
    reward: { gold: 320, xp: 250, title: 'Storm Chaser' },
    next: 'games',
    voice: { faction: 'senate', line: 'Jupiter Tonans! The sky itself is angry! Seek shelter!' },
    weather: 'storm',
  },
  {
    id: 'games',
    title: 'Circus and Colosseum',
    desc: 'To appease the people after disasters, the Emperor orders games. Chariots race in Circus Maximus with galloping sounds, gladiators fight in Colosseum with crowd roar varied voices.',
    objectives: [
      { type: 'watch', target: 'circus', desc: 'Watch chariot race - 6 chariots gallop sounds', count: 1 },
      { type: 'fight', target: 'colosseum', desc: 'Win 3 fights in Colosseum - crowd cheer varied', count: 3 },
      { type: 'talk', target: 'merchant', desc: 'Haggle with merchants - fast persuasive voices', count: 3 },
    ],
    reward: { gold: 400, xp: 300, title: 'Champion of Games' },
    next: 'conspiracy',
    voice: { faction: 'emperor', line: 'Ludi! Games for the people! Let them forget their fears!' },
  },
  {
    id: 'conspiracy',
    title: 'Senate Conspiracy',
    desc: 'Whispers in the Curia Julia — senators plot. Is the Emperor safe? The Praetorians are restless. Each senator has old wise voice 110Hz.',
    objectives: [
      { type: 'infiltrate', target: 'curia', desc: 'Infiltrate Curia - no noclip, real interior', count: 1 },
      { type: 'talk', target: 'senate', desc: 'Eavesdrop on 4 senators - varied old wise voices', count: 4 },
      { type: 'choice', target: 'loyalty', desc: 'Choose: Loyal to Emperor or Senate?', count: 1 },
    ],
    reward: { gold: 500, xp: 400, title: 'Senate Insider' },
    next: 'civilwar',
    voice: { faction: 'senate', line: 'Senatus Populusque Romanus... but who truly rules?' },
  },
  {
    id: 'civilwar',
    title: 'Civil War',
    desc: 'Rome erupts! Legio vs Rebels vs Praetorians — faction war with varied war cries. The fate of the Empire in your hands. Every building sways if earthquake, every flag flaps in storm wind.',
    objectives: [
      { type: 'war', target: 'factions', desc: 'Survive faction war - 20 kills, varied war cries', count: 20 },
      { type: 'protect', target: 'emperor', desc: 'Protect Emperor or join Rebels - choice matters', count: 1 },
      { type: 'build', target: 'barricade', desc: 'Build barricades - hammer sounds', count: 3 },
    ],
    reward: { gold: 800, xp: 600, title: 'Hero of Civil War' },
    next: 'augustus',
    voice: { faction: 'legio', line: 'Roma Victor! For Rome! For the Emperor! Or for liberty?' },
    weather: 'storm',
    earthquake: true,
  },
  {
    id: 'augustus',
    title: 'Pax Romana',
    desc: 'Peace returns. You are hailed as savior. Will you be Emperor, Senator, or humble citizen? The Pantheon oculus light shines on you, Baths of Diocletian steam rises, Markets bustle with varied haggling voices, rain washes the blood from Forum stones.',
    objectives: [
      { type: 'explore', target: 'all', desc: 'Visit all 25 missing monuments - verified dimensions', count: 25 },
      { type: 'build', target: 'empire', desc: 'Build your legacy - 5 buildings', count: 5 },
      { type: 'legacy', target: 'rome', desc: 'Achieve Pax Romana - all factions at peace', count: 1 },
    ],
    reward: { gold: 1500, xp: 1000, title: 'Pater Patriae - Father of Fatherland' },
    next: null,
    voice: { faction: 'emperor', line: 'Roma Aeterna! You have saved Rome. What will you do with it?' },
  },
];

export class StoryManager {
  constructor(player, factionZones, buildingInteriors, soundscape) {
    this.player = player;
    this.factionZones = factionZones;
    this.buildingInteriors = buildingInteriors;
    this.soundscape = soundscape;
    this.currentChapterId = localStorage.getItem('kitchuban_story_chapter') || 'arrival';
    this.completedChapters = JSON.parse(localStorage.getItem('kitchuban_story_completed') || '[]');
    this.objectiveProgress = JSON.parse(localStorage.getItem('kitchuban_story_progress') || '{}');
    this.choice = localStorage.getItem('kitchuban_story_choice') || null; // emperor or senate or rebels
    this.chapterStartTime = Date.now();
    this.talkedCitizens = new Set();
    this.discoveredMonuments = new Set();
  }

  getCurrentChapter() {
    return STORY_CHAPTERS.find(c => c.id === this.currentChapterId) || STORY_CHAPTERS[0];
  }

  getProgress() {
    const chapter = this.getCurrentChapter();
    const prog = [];
    for (const obj of chapter.objectives) {
      const key = `${chapter.id}_${obj.type}_${obj.target}`;
      const current = this.objectiveProgress[key] || 0;
      prog.push({ ...obj, current, key });
    }
    return { chapter, objectives: prog, completedChapters: this.completedChapters.length, choice: this.choice };
  }

  onEvent(type, target, data = {}) {
    const chapter = this.getCurrentChapter();
    let changed = false;
    for (const obj of chapter.objectives) {
      if (obj.type !== type) continue;
      if (obj.target !== target && obj.target !== 'all' && target !== 'all') {
        // Allow partial matching for explore
        if (type === 'explore' && obj.target === 'all') {
          // Count any monument
        } else if (type === 'talk' && obj.target === 'citizen' && ['citizen','merchant','child','priest','noble','guard'].includes(target)) {
          // citizen includes all citizen types
        } else {
          continue;
        }
      }
      const key = `${chapter.id}_${obj.type}_${obj.target}`;
      const current = this.objectiveProgress[key] || 0;
      if (current < obj.count) {
        this.objectiveProgress[key] = current + 1;
        changed = true;
        console.log(`[STORY] Progress ${chapter.id} ${type} ${target}: ${this.objectiveProgress[key]}/${obj.count}`);
        if (this.soundscape) {
          this.soundscape.onQuestComplete(data.x||0, data.y||0, data.z||0);
        }
      }
    }
    if (changed) {
      localStorage.setItem('kitchuban_story_progress', JSON.stringify(this.objectiveProgress));
      this.checkChapterCompletion();
    }
  }

  onTalk(civilianType, x, z) {
    const key = `${civilianType}_${Math.floor(x)}_${Math.floor(z)}`;
    if (!this.talkedCitizens.has(key)) {
      this.talkedCitizens.add(key);
      this.onEvent('talk', civilianType, { x, z });
      this.onEvent('talk', 'citizen', { x, z });
    }
  }

  onDiscoverMonument(type, x, z) {
    const key = `${type}_${Math.floor(x)}_${Math.floor(z)}`;
    if (!this.discoveredMonuments.has(key)) {
      this.discoveredMonuments.add(key);
      this.onEvent('explore', type, { x, z });
      this.onEvent('explore', 'all', { x, z });
    }
  }

  onKill(faction) {
    this.onEvent('kill', faction);
    this.onEvent('war', 'factions');
    this.onEvent('fight', 'colosseum');
  }

  onBuild(type) {
    this.onEvent('build', type);
    this.onEvent('build', 'empire');
    this.onEvent('build', 'shelter');
    this.onEvent('build', 'barricade');
  }

  onSurvive(eventType) {
    this.onEvent('survive', eventType);
  }

  setChoice(choice) {
    this.choice = choice;
    localStorage.setItem('kitchuban_story_choice', choice);
    console.log(`[STORY] Choice made: ${choice}`);
  }

  checkChapterCompletion() {
    const chapter = this.getCurrentChapter();
    let allDone = true;
    for (const obj of chapter.objectives) {
      const key = `${chapter.id}_${obj.type}_${obj.target}`;
      const current = this.objectiveProgress[key] || 0;
      if (current < obj.count) {
        allDone = false;
        break;
      }
    }
    if (allDone) {
      this.completeChapter(chapter);
    }
  }

  completeChapter(chapter) {
    if (this.completedChapters.includes(chapter.id)) return;
    this.completedChapters.push(chapter.id);
    localStorage.setItem('kitchuban_story_completed', JSON.stringify(this.completedChapters));
    console.log(`[STORY] Chapter completed: ${chapter.title} - Reward: ${chapter.reward.gold} gold, ${chapter.reward.xp} xp, Title: ${chapter.reward.title}`);

    // Trigger voice line with varied voice
    if (this.soundscape && chapter.voice) {
      setTimeout(() => {
        this.soundscape.playFactionShout(chapter.voice.faction, 0, 2, 0);
      }, 800);
    }

    // Trigger weather/earthquake if chapter has them
    if (chapter.earthquake && this.soundscape) {
      setTimeout(() => {
        this.soundscape.playEarthquake(0.6+Math.random()*0.4, 4+Math.random()*2);
      }, 2000);
    }
    if (chapter.weather === 'storm' && this.soundscape) {
      this.soundscape.weather.state = 'storm';
      this.soundscape.weather.timer = 50;
      this.soundscape.weather.intensity = 0.8;
      this.soundscape.weather.rainIntensity = 0.8;
      this.soundscape.weather.windIntensity = 0.9;
    } else if (chapter.weather === 'rain' && this.soundscape) {
      this.soundscape.weather.state = 'rain';
      this.soundscape.weather.timer = 40;
      this.soundscape.weather.intensity = 0.5;
      this.soundscape.weather.rainIntensity = 0.5;
      this.soundscape.weather.windIntensity = 0.5;
    }

    if (chapter.next) {
      this.currentChapterId = chapter.next;
      localStorage.setItem('kitchuban_story_chapter', this.currentChapterId);
      console.log(`[STORY] Next chapter: ${chapter.next}`);
    } else {
      console.log('[STORY] Game completed! Pax Romana achieved!');
      this.currentChapterId = 'completed';
      localStorage.setItem('kitchuban_story_chapter', 'completed');
    }
  }

  reset() {
    this.currentChapterId = 'arrival';
    this.completedChapters = [];
    this.objectiveProgress = {};
    this.choice = null;
    this.talkedCitizens.clear();
    this.discoveredMonuments.clear();
    localStorage.removeItem('kitchuban_story_chapter');
    localStorage.removeItem('kitchuban_story_completed');
    localStorage.removeItem('kitchuban_story_progress');
    localStorage.removeItem('kitchuban_story_choice');
  }
}
