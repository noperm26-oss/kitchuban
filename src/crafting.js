/**
 * Kitchuban Crafting - EVERYONE CAN CRAFT, NO ADMINS, NO MODS, EQUAL
 * Gather resources and craft weapons, tools, armor
 */

export const CRAFT_RECIPES = {
  pilum: { name: 'Pilum', cost: { wood: 2, weapons: 1, gold: 15 }, result: { pila: 1 }, icon: '🪓' },
  gladius: { name: 'Gladius Upgrade', cost: { weapons: 3, marble: 1, gold: 40 }, result: { damage: 1.2 }, icon: '⚔️' },
  scutum: { name: 'Scutum Reinforce', cost: { wood: 4, marble: 2, gold: 35 }, result: { shield: 1.3 }, icon: '🛡️' },
  bandage: { name: 'Bandage', cost: { grain: 2, oil: 1, gold: 10 }, result: { heal: 30 }, icon: '🩹' },
  torch: { name: 'Torch', cost: { wood: 1, oil: 1, gold: 5 }, result: { light: 1 }, icon: '🔦' },
  bread: { name: 'Bread', cost: { grain: 3, gold: 8 }, result: { stamina: 40 }, icon: '🍞' },
};

export class CraftingManager {
  constructor(economy, player) {
    this.economy = economy;
    this.player = player;
    this.craftedCounts = JSON.parse(localStorage.getItem('kitchuban_crafted') || '{}');
  }

  canCraft(recipeId) {
    const recipe = CRAFT_RECIPES[recipeId];
    if (!recipe) return false;
    return this.economy.canAfford(recipe.cost);
  }

  craft(recipeId) {
    const recipe = CRAFT_RECIPES[recipeId];
    if (!recipe) return { ok: false, reason: 'Unknown recipe' };
    if (!this.economy.canAfford(recipe.cost)) return { ok: false, reason: 'Not enough resources' };
    
    this.economy.pay(recipe.cost);
    this.craftedCounts[recipeId] = (this.craftedCounts[recipeId]||0)+1;
    localStorage.setItem('kitchuban_crafted', JSON.stringify(this.craftedCounts));
    
    // Apply result
    let resultMsg = '';
    if (recipe.result.pila) {
      this.player.pila += recipe.result.pila;
      resultMsg = `+${recipe.result.pila} Pilum! Total: ${this.player.pila}`;
    } else if (recipe.result.heal) {
      this.player.health = Math.min(this.player.maxHealth, this.player.health + recipe.result.heal);
      resultMsg = `Healed +${recipe.result.heal} HP!`;
    } else if (recipe.result.stamina) {
      this.player.stamina = Math.min(this.player.maxStamina, this.player.stamina + recipe.result.stamina);
      resultMsg = `+${recipe.result.stamina} Stamina!`;
    } else if (recipe.result.damage) {
      resultMsg = `Gladius damage +20%! (permanent)`;
      // Could store upgrade
      const current = parseFloat(localStorage.getItem('kitchuban_damage_mult')||'1');
      localStorage.setItem('kitchuban_damage_mult', (current * recipe.result.damage).toString());
    } else if (recipe.result.shield) {
      resultMsg = `Shield stronger!`;
      const current = parseFloat(localStorage.getItem('kitchuban_shield_mult')||'1');
      localStorage.setItem('kitchuban_shield_mult', (current * recipe.result.shield).toString());
    }
    
    console.log(`[CRAFT] Crafted ${recipe.name}: ${resultMsg}`);
    return { ok: true, recipe, message: resultMsg };
  }

  getRecipes() {
    return CRAFT_RECIPES;
  }
}
