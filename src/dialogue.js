/**
 * Kitchuban Dialogue - Varied voices conversation system, story integration
 * Each civilian has unique voice, dialogue varies by type, faction, story
 */

import { VOICE_PROFILES, FACTION_VOICES } from './soundscape.js';

export const DIALOGUES = {
  citizen: [
    { text: 'Salve! How is the Forum today?', mood: 'greet', voice: 'citizen_m' },
    { text: 'Have you heard? Earthquake in the Subura!', mood: 'worried', voice: 'citizen_f' },
    { text: 'The markets are expensive these days...', mood: 'complain', voice: 'citizen_m' },
    { text: 'Jupiter protects us, but for how long?', mood: 'pray', voice: 'citizen_f' },
    { text: 'My son wants to join the Legio. I worry.', mood: 'worried', voice: 'citizen_m' },
    { text: 'Rain again! My roof leaks!', mood: 'complain', voice: 'citizen_f' },
  ],
  merchant: [
    { text: 'Emite! Emite! Best grain in Rome!', mood: 'haggle', voice: 'merchant' },
    { text: 'For you, special price! Only 20 gold!', mood: 'haggle', voice: 'merchant' },
    { text: 'These amphorae from Hispania! Very rare!', mood: 'haggle', voice: 'merchant' },
    { text: 'Rebels stole my last shipment! Help!', mood: 'worried', voice: 'merchant' },
    { text: 'The storm ruined my goods...', mood: 'complain', voice: 'merchant' },
  ],
  child: [
    { text: 'Ludi! Games! Circus!', mood: 'play', voice: 'child' },
    { text: 'Mama says thunder is Jupiter bowling!', mood: 'laugh', voice: 'child' },
    { text: 'I saw a gladiator! He was so big!', mood: 'excited', voice: 'child' },
    { text: 'Will you buy me a honey cake?', mood: 'beg', voice: 'child' },
  ],
  priest: [
    { text: 'Pax deorum... peace of the gods...', mood: 'pray', voice: 'priest' },
    { text: 'The haruspex saw ill omens in the liver.', mood: 'worried', voice: 'priest' },
    { text: 'Vesta\'s fire must not die. Never.', mood: 'pray', voice: 'priest' },
    { text: 'Earthquake is Tellus Mater speaking.', mood: 'pray', voice: 'priest' },
  ],
  guard: [
    { text: 'Halt! State your business!', mood: 'command', voice: 'guard' },
    { text: 'Subura is dangerous after dark.', mood: 'warn', voice: 'guard' },
    { text: 'Legio I Italica keeps order here.', mood: 'proud', voice: 'guard' },
    { text: 'Rebels near Temple Saturn! Be careful!', mood: 'warn', voice: 'guard' },
  ],
  noble: [
    { text: 'The Senate debates grain dole again.', mood: 'talk', voice: 'noble_m' },
    { text: 'My villa on Palatine has the best view.', mood: 'proud', voice: 'noble_f' },
    { text: 'These games are vulgar, but necessary.', mood: 'talk', voice: 'noble_m' },
    { text: 'Do you know who my father is?', mood: 'arrogant', voice: 'noble_f' },
  ],
  legio: [
    { text: 'Roma Victor! For the Eagle!', mood: 'shout', voice: 'legionary' },
    { text: 'Keep your shield up, recruit!', mood: 'command', voice: 'legionary' },
    { text: 'We march at dawn for Subura.', mood: 'talk', voice: 'legionary' },
  ],
  rebels: [
    { text: 'Libertas! Down with the Emperor!', mood: 'shout', voice: 'rebel' },
    { text: 'The rich eat while we starve!', mood: 'angry', voice: 'rebel' },
    { text: 'Join us! Freedom!', mood: 'persuade', voice: 'rebel' },
  ],
};

export class DialogueManager {
  constructor(soundscape) {
    this.soundscape = soundscape;
    this.activeDialogues = new Map(); // civilianId -> dialogue
    this.dialogueCooldown = new Map();
  }

  getRandomDialogue(type) {
    const list = DIALOGUES[type] || DIALOGUES.citizen;
    return list[Math.floor(Math.random()*list.length)];
  }

  triggerDialogue(civilian, playerPos) {
    const id = civilian.voiceId;
    const now = Date.now();
    if (this.dialogueCooldown.has(id) && now - this.dialogueCooldown.get(id) < 8000) return null;

    const dist = civilian.position.distanceTo(playerPos);
    if (dist > 8) return null; // Too far to talk

    const dialogue = this.getRandomDialogue(civilian.type);
    this.activeDialogues.set(id, { ...dialogue, time: now, pos: civilian.position.clone() });
    this.dialogueCooldown.set(id, now);

    // Play varied voice
    if (this.soundscape) {
      this.soundscape.playCivilianVoice(dialogue.voice, civilian.position.x, 1.5, civilian.position.z, dialogue.mood);
    }

    console.log(`[DIALOGUE] ${civilian.type} (${civilian.voiceProfile.id}): "${dialogue.text}" [${dialogue.mood}]`);
    return dialogue;
  }

  update(dt) {
    const now = Date.now();
    for (const [id, dlg] of this.activeDialogues.entries()) {
      if (now - dlg.time > 4000) {
        this.activeDialogues.delete(id);
      }
    }
  }

  getNearbyDialogues(playerPos, radius=15) {
    const nearby = [];
    for (const dlg of this.activeDialogues.values()) {
      if (dlg.pos.distanceTo(playerPos) < radius) {
        nearby.push(dlg);
      }
    }
    return nearby;
  }
}
