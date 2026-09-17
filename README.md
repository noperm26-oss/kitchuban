# kitchuban — *Legio Aeterna*

A browser-based first-person 3D game set in an ancient Roman-style forum. Firearms do not exist in this world — you fight with a **gladius**, a **scutum**, and a handful of **pila**.

Built with plain JavaScript + [three.js](https://threejs.org/) (loaded from CDN). No build step, no dependencies to install.

## Play

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

## Gameplay

Rebels have seized the Forum. Survive escalating waves of swordsmen and, from wave III, spear-wielding brutes. Clearing a wave restores some health. Score is shown in Roman numerals, naturally.

## Structure

```
index.html      HUD + menu markup
style.css       HUD styling
src/main.js     game loop, waves, HUD, procedural sound
src/world.js    procedural forum: temple, basilicas, arch, colonnades, walls
src/player.js   first-person controller, collision, gladius/scutum viewmodel
src/enemy.js    enemy AI, animation, pilum projectile
```
