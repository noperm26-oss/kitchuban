/**
 * Kitchuban Inventory + Trading UI + Dialogue Overlay
 * Static client-only, no admins, everyone equal
 * Inventory shows resources, trading with merchants, dialogue with varied voices
 */

import { MAX_CAPS, saveWithChecksum } from './anticheat.js';

export class InventoryManager {
  constructor(economyManager, craftingManager, dialogueManager, soundscape) {
    this.economy = economyManager;
    this.crafting = craftingManager;
    this.dialogue = dialogueManager;
    this.soundscape = soundscape;
    this.isOpen = false;
    this.activeTab = 'inventory';
    this.selectedDialogue = null;

    this.createUI();
  }

  createUI() {
    // Inventory panel
    let panel = document.getElementById('inventory-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'inventory-panel';
      panel.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
        width: 600px; max-width: 90vw; max-height: 80vh; overflow-y: auto;
        background: linear-gradient(135deg, #2a1a0a 0%, #1a0a00 100%);
        border: 3px solid #d9a441; border-radius: 12px;
        padding: 20px; z-index: 1000; display: none;
        box-shadow: 0 0 30px rgba(217,164,65,0.5);
        color: #ffd777; font-family: serif;
      `;
      document.body.appendChild(panel);
    }
    this.panel = panel;

    // Dialogue overlay
    let dlgPanel = document.getElementById('dialogue-panel');
    if (!dlgPanel) {
      dlgPanel = document.createElement('div');
      dlgPanel.id = 'dialogue-panel';
      dlgPanel.style.cssText = `
        position: fixed; bottom: 20%; left: 50%; transform: translateX(-50%);
        width: 700px; max-width: 90vw;
        background: linear-gradient(135deg, rgba(40,20,10,0.95) 0%, rgba(20,10,0,0.95) 100%);
        border: 2px solid #d9a441; border-radius: 10px;
        padding: 16px; z-index: 900; display: none;
        box-shadow: 0 0 20px rgba(0,0,0,0.8);
        color: #ffd777; font-family: serif; font-size: 15px;
      `;
      document.body.appendChild(dlgPanel);
    }
    this.dialoguePanel = dlgPanel;

    // Trading panel
    let tradePanel = document.getElementById('trading-panel');
    if (!tradePanel) {
      tradePanel = document.createElement('div');
      tradePanel.id = 'trading-panel';
      tradePanel.style.cssText = `
        position: fixed; top: 50%; right: 5%; transform: translateY(-50%);
        width: 350px; max-height: 70vh; overflow-y: auto;
        background: linear-gradient(135deg, #1a2a3a 0%, #0a1a2a 100%);
        border: 2px solid #4a8aaa; border-radius: 10px;
        padding: 16px; z-index: 950; display: none;
        color: #aaccff; font-family: serif;
      `;
      document.body.appendChild(tradePanel);
    }
    this.tradingPanel = tradePanel;

    // Key bindings
    document.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (e.code === 'KeyI') {
        this.toggle();
      }
      if (e.code === 'Escape') {
        if (this.isOpen) this.close();
        this.hideDialogue();
        this.hideTrading();
      }
      if (e.code === 'KeyU') {
        this.toggleTrading();
      }
    });
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(tab = 'inventory') {
    this.isOpen = true;
    this.activeTab = tab;
    this.panel.style.display = 'block';
    this.update();
    if (this.soundscape) {
      this.soundscape.playCombatSound('bash', 0, 0, 0);
    }
  }

  close() {
    this.isOpen = false;
    this.panel.style.display = 'none';
  }

  update() {
    if (!this.isOpen) return;
    const res = this.economy.getResources();
    const craftRecipes = this.crafting ? Object.entries(this.crafting.recipes || {}) : [];

    let html = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
        <h2 style="margin:0; color:#d9a441;">📦 Inventory & Crafting</h2>
        <div>
          <button id="inv-tab-inv" style="margin-right:6px; padding:4px 10px; background:${this.activeTab==='inventory'?'#d9a441':'#3a2a1a'}; color:#ffd777; border:1px solid #d9a441; border-radius:4px; cursor:pointer;">Inventory</button>
          <button id="inv-tab-craft" style="margin-right:6px; padding:4px 10px; background:${this.activeTab==='craft'?'#d9a441':'#3a2a1a'}; color:#ffd777; border:1px solid #d9a441; border-radius:4px; cursor:pointer;">Crafting</button>
          <button id="inv-close" style="padding:4px 10px; background:#8a1a1a; color:#ffd777; border:1px solid #d9a441; border-radius:4px; cursor:pointer;">✕</button>
        </div>
      </div>
      <div style="font-size:12px; color:#a0a0a0; margin-bottom:10px;">Anti-cheat caps: Gold ${MAX_CAPS.gold}, Grain/Wood ${MAX_CAPS.grain}/${MAX_CAPS.wood}, Marble/Oil/Wine/Weapons ${MAX_CAPS.marble}, Damage ${MAX_CAPS.damage_mult}x Shield ${MAX_CAPS.shield_mult}x | No admins, everyone equal!</div>
    `;

    if (this.activeTab === 'inventory') {
      html += `<div style="display:grid; grid-template-columns: repeat(2,1fr); gap:10px;">`;
      for (const [type, amount] of Object.entries(res)) {
        const cap = MAX_CAPS[type] || 999999;
        const pct = Math.min(100, (amount / cap) * 100);
        const icon = type === 'gold' ? '💰' : type === 'grain' ? '🌾' : type === 'wood' ? '🪵' : type === 'marble' ? '🏛️' : type === 'oil' ? '🫒' : type === 'wine' ? '🍷' : type === 'weapons' ? '⚔️' : '📦';
        html += `
          <div style="background:rgba(217,164,65,0.15); border:1px solid #d9a441; border-radius:6px; padding:8px;">
            <div style="display:flex; justify-content:space-between;"><span>${icon} ${type.toUpperCase()}</span><span style="font-weight:bold;">${amount}/${cap}</span></div>
            <div style="height:6px; background:#1a0a00; border-radius:3px; margin-top:4px;"><div style="width:${pct}%; height:100%; background:linear-gradient(90deg,#d9a441,#ffd777); border-radius:3px;"></div></div>
          </div>
        `;
      }
      html += `</div>`;
      html += `<div style="margin-top:16px; font-size:13px; color:#c0c0c0;">Press <b>G</b> for quick resources, <b>C</b> to craft, <b>E</b> near civilian to talk with varied voice, <b>U</b> trading, <b>B</b> build mode, <b>J</b> quests & story, <b>M</b> minimap toggle, <b>T</b> thunder test, <b>Y</b> earthquake test, <b>N/K/L</b> story choices</div>`;
    } else if (this.activeTab === 'craft') {
      html += `<div style="display:grid; gap:10px;">`;
      // Import CRAFT_RECIPES
      try {
        const recipes = [
          { id: 'sharpened_gladius', name: 'Sharpened Gladius', cost: { wood: 3, weapons: 2, gold: 20 }, effect: 'damage +20%' },
          { id: 'reinforced_scutum', name: 'Reinforced Scutum', cost: { wood: 5, marble: 2, gold: 30 }, effect: 'shield +20%' },
          { id: 'legionary_armor', name: 'Legionary Armor', cost: { marble: 5, weapons: 3, gold: 50 }, effect: 'health +25' },
          { id: 'pilum_bundle', name: 'Pilum Bundle x5', cost: { wood: 4, weapons: 2, gold: 15 }, effect: '+5 pila' },
          { id: 'healing_potion', name: 'Healing Potion', cost: { grain: 5, wine: 2, oil: 2, gold: 10 }, effect: 'heal 40' },
        ];
        for (const r of recipes) {
          const can = Object.entries(r.cost).every(([k,v]) => (res[k]||0) >= v);
          html += `
            <div style="background:rgba(100,150,200,0.15); border:1px solid ${can?'#4a8aaa':'#5a3a3a'}; border-radius:6px; padding:10px; display:flex; justify-content:space-between; align-items:center;">
              <div><b>${r.name}</b><br/><span style="font-size:12px; color:#a0c0e0;">${r.effect} | Cost: ${Object.entries(r.cost).map(([k,v])=>`${k}:${v}`).join(' ')}</span></div>
              <button data-craft="${r.id}" style="padding:6px 12px; background:${can?'#2a5a8a':'#3a3a3a'}; color:#ffd777; border:1px solid #4a8aaa; border-radius:4px; cursor:${can?'pointer':'not-allowed'};" ${can?'':'disabled'}>Craft</button>
            </div>
          `;
        }
      } catch(e) {
        html += `<div>Crafting recipes loading...</div>`;
      }
      html += `</div>`;
    }

    this.panel.innerHTML = html;

    // Bind buttons
    const closeBtn = document.getElementById('inv-close');
    if (closeBtn) closeBtn.onclick = () => this.close();
    const invTab = document.getElementById('inv-tab-inv');
    if (invTab) invTab.onclick = () => { this.activeTab = 'inventory'; this.update(); };
    const craftTab = document.getElementById('inv-tab-craft');
    if (craftTab) craftTab.onclick = () => { this.activeTab = 'craft'; this.update(); };

    this.panel.querySelectorAll('[data-craft]').forEach(btn => {
      btn.onclick = () => {
        const rid = btn.getAttribute('data-craft');
        if (this.crafting && this.crafting.canCraft && this.crafting.canCraft(rid)) {
          const res = this.crafting.craft(rid);
          if (res.ok) {
            this.soundscape?.playCombatSound('hit', 0, 0, 0);
            this.update();
          } else {
            alert(res.reason);
          }
        }
      };
    });
  }

  showDialogue(civilian, dialogue) {
    if (!dialogue) return;
    const voice = civilian.voiceProfile;
    this.dialoguePanel.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-size:13px; color:#d9a441; margin-bottom:4px;">${civilian.type.toUpperCase()} - Voice: ${voice.id} | Pitch ${voice.personalPitch.toFixed(0)}Hz Formant ${voice.formant.toFixed(2)} Speed ${voice.speed.toFixed(2)}x ${voice.mood||''} ${voice.vibrato?'~vibrato':''}</div>
          <div style="font-size:16px; line-height:1.4; margin-bottom:8px; font-style:italic;">"${dialogue.text}"</div>
          <div style="font-size:12px; color:#a0a0a0;">Mood: ${dialogue.mood} | Distance: ${dialogue.distance||'near'} | Press E to continue talking, ESC to close</div>
          <div style="margin-top:8px; display:flex; gap:8px;">
            <button id="dlg-trade" style="padding:4px 10px; background:#2a5a8a; color:#aaccff; border:1px solid #4a8aaa; border-radius:4px; cursor:pointer;">Trade [U]</button>
            <button id="dlg-quest" style="padding:4px 10px; background:#3a5a2a; color:#aaffaa; border:1px solid #5a8a3a; border-radius:4px; cursor:pointer;">Quest [J]</button>
            <button id="dlg-close" style="padding:4px 10px; background:#5a2a2a; color:#ffaaaa; border:1px solid #8a3a3a; border-radius:4px; cursor:pointer;">Close [ESC]</button>
          </div>
        </div>
        <div style="width:60px; height:60px; background:radial-gradient(circle,#d9a441,#8a5a3a); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:24px; margin-left:12px;">${civilian.type==='merchant'?'🛒':civilian.type==='priest'?'⛪':civilian.type==='guard'?'🛡️':civilian.type==='noble'?'👑':civilian.type==='child'?'🧒':'👤'}</div>
      </div>
    `;
    this.dialoguePanel.style.display = 'block';
    setTimeout(() => this.hideDialogue(), 6000);

    document.getElementById('dlg-close')?.addEventListener('click', () => this.hideDialogue());
    document.getElementById('dlg-trade')?.addEventListener('click', () => { this.hideDialogue(); this.openTrading(civilian); });
    document.getElementById('dlg-quest')?.addEventListener('click', () => { this.hideDialogue(); /* quest UI handled in main */ });
  }

  hideDialogue() {
    this.dialoguePanel.style.display = 'none';
  }

  openTrading(civilian = null) {
    const res = this.economy.getResources();
    let html = `<h3 style="margin:0 0 10px 0; color:#4a8aaa;">🛒 Trading ${civilian ? `with ${civilian.type}` : ''}</h3>`;
    html += `<div style="font-size:12px; color:#a0c0e0; margin-bottom:10px;">Merchant voice: fast haggling, varied pitch, personal formant. No admins, everyone equal!</div>`;
    html += `<div style="display:grid; gap:8px;">`;
    const trades = [
      { give: { grain: 5 }, get: { gold: 20 }, desc: 'Sell 5 grain for 20 gold' },
      { give: { wood: 5 }, get: { gold: 15 }, desc: 'Sell 5 wood for 15 gold' },
      { give: { marble: 3 }, get: { gold: 45 }, desc: 'Sell 3 marble for 45 gold' },
      { give: { gold: 30 }, get: { grain: 8 }, desc: 'Buy 8 grain for 30 gold' },
      { give: { gold: 25 }, get: { wood: 8 }, desc: 'Buy 8 wood for 25 gold' },
      { give: { gold: 60 }, get: { marble: 4 }, desc: 'Buy 4 marble for 60 gold' },
      { give: { gold: 50 }, get: { oil: 5 }, desc: 'Buy 5 oil for 50 gold' },
      { give: { gold: 40 }, get: { wine: 4 }, desc: 'Buy 4 wine for 40 gold' },
    ];
    for (const t of trades) {
      const can = Object.entries(t.give).every(([k,v]) => (res[k]||0) >= v);
      html += `
        <div style="background:rgba(74,138,170,0.15); border:1px solid ${can?'#4a8aaa':'#3a3a3a'}; border-radius:6px; padding:8px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size:13px;">${t.desc}</span>
          <button data-trade="${t.desc}" style="padding:4px 10px; background:${can?'#2a5a8a':'#3a3a3a'}; color:#aaccff; border:1px solid #4a8aaa; border-radius:4px; cursor:${can?'pointer':'not-allowed'};" ${can?'':'disabled'}>Trade</button>
        </div>
      `;
    }
    html += `</div><div style="margin-top:10px;"><button id="trade-close" style="padding:6px 12px; background:#3a3a5a; color:#aaccff; border:1px solid #4a8aaa; border-radius:4px; cursor:pointer;">Close [ESC]</button></div>`;
    this.tradingPanel.innerHTML = html;
    this.tradingPanel.style.display = 'block';

    this.tradingPanel.querySelectorAll('[data-trade]').forEach(btn => {
      btn.onclick = () => {
        const desc = btn.getAttribute('data-trade');
        const trade = trades.find(tr => tr.desc === desc);
        if (!trade) return;
        const can = Object.entries(trade.give).every(([k,v]) => (res[k]||0) >= v);
        if (!can) return;
        // Execute trade
        if (this.economy.pay(trade.give)) {
          for (const [k,v] of Object.entries(trade.get)) {
            this.economy.resources[k] = (this.economy.resources[k]||0) + v;
            // Cap
            if (MAX_CAPS[k] && this.economy.resources[k] > MAX_CAPS[k]) this.economy.resources[k] = MAX_CAPS[k];
          }
          // Save with checksum
          saveWithChecksum('kitchuban_resources', this.economy.resources);
          localStorage.setItem('kitchuban_gold', this.economy.resources.gold.toString());
          this.soundscape?.playCombatSound('hit', 0, 0, 0);
          this.openTrading(civilian);
          if (this.isOpen) this.update();
        }
      };
    });
    document.getElementById('trade-close')?.addEventListener('click', () => this.hideTrading());
  }

  hideTrading() {
    this.tradingPanel.style.display = 'none';
  }

  toggleTrading() {
    if (this.tradingPanel.style.display === 'none' || !this.tradingPanel.style.display) {
      this.openTrading();
    } else {
      this.hideTrading();
    }
  }
}
