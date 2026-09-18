# kitchuban — *Legio Aeterna*

A browser-based first-person 3D game set in an ancient Roman-style forum. Firearms do not exist in this world — you fight with a **gladius**, a **scutum**, and a handful of **pila**.

Built with plain JavaScript + [three.js](https://threejs.org/). No build step, no dependencies to install: three.js r160 ships in `vendor/three/` and is wired up with an import map, so the game starts instantly and works offline.

## Play

There is **no loading screen** — the title menu is on screen immediately and **ENTER** drops you straight into the game.

**Online:** enable GitHub Pages (Settings → Pages → Source: *GitHub Actions*) and the site deploys automatically on every push to `main`.

**Locally:** any static file server works, e.g.

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Controls

| Key | Action |
|---|---|
| W A S D | Move |
| Shift | Sprint (uses stamina) |
| Space | Jump |
| Mouse | Look |
| Left click | Strike with gladius |
| Right click (hold) | Raise shield — blocks attacks from the front |
| F | Throw pilum (limited; +2 per wave) |
| Esc | Pause |
| I | Inventory / trading |
| B, 1-6, E | Build mode, pick a structure, place it |
| Q / V | Shield bash / dodge roll |
| C, G, J, M | Craft, resources, quests, minimap |
| T / Y | Thunder test / earthquake test |

## Gameplay

Rebels have seized the Forum. Survive escalating waves of swordsmen and, from wave III, spear-wielding brutes. Clearing a wave restores some health. Score is shown in Roman numerals, naturally.

## Notes

* **Mouse look:** the game asks for pointer lock. If the browser refuses it (for example a preview iframe without `allow="pointer-lock"`), it keeps running with a mouse-look fallback instead of getting stuck on the menu — move the mouse to look around, `Esc` pauses.
* **Performance:** only the nearest dozen torch/fire lights are switched on at a time, the sun's shadow frustum follows the player, and cloth/water vertex animation runs at a fixed 20 Hz near the player. The city has hundreds of lights, so this keeps it smooth.
* **Debug:** `window.__kitchuban` exposes the player, enemies, wave, kills and `startGame`/`pauseGame`/`resetGame` from the browser console.

## Structure

```
index.html      HUD + menu markup
style.css       HUD styling
vendor/three/   vendored three.js r160 (build + the addons the game uses)
src/main.js     game loop, waves, HUD, procedural sound
src/world.js    procedural forum: temple, basilicas, arch, colonnades, walls
src/player.js   first-person controller, collision, gladius/scutum viewmodel
src/enemy.js    enemy AI, animation, pilum projectile
```
