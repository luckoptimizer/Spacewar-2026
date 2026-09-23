# SPACEWAR! 2026 — United States Space Force Edition

A 2026 remake of **Spacewar!**, the 1962 PDP-1 game widely treated as the first true video game.

Play it by opening `index.html` in a modern browser. No build step. No server required.

**Repository:** https://github.com/luckoptimizer/SPACEWAR-2026

---

## Required original credit

Spacewar! was conceived in 1961 by Martin Graetz, Stephen Russell, and Wayne
Wiitanen. It was first realized on the PDP-1 in 1962 by Stephen Russell,
Peter Samson, Dan Edwards, and Martin Graetz, together with Alan Kotok,
Steve Piner, and Robert A Saunders.

Spacewar! is in the public domain, but this credit paragraph must accompany
all distributed versions of the program.

Sources and museums: [Computer History Museum](https://www.computerhistory.org/pdp-1/playspacewar/), [masswerk.at sources](https://www.masswerk.at/spacewar/sources/), [Internet Archive (PDM 1.0)](https://archive.org/details/spacewar_1962).

---

## What this remake keeps

- Two wedge ships in one battlespace
- Rotate, thrust, torpedoes, hyperspace
- A central gravity well that will kill you
- Newtonian drift — you do not stop unless you burn
- Hyperspace as a gamble (small collapse chance)

## What 2026 adds

- Cinematic Space Force launch / briefing stack
- **Operation HIGH GROUND** — five theaters (LEO, Luna, Mars, Belt, Jupiter)
- Guardian **Sentinel drones**
- **AEGIS** directed-energy beam with heat
- Adaptive opponent AI (orbit, intercept, sun-dodge, drone call, lead computation)
- Asteroid terrain, Jovian storm ring, living starfield, synthesized audio

This is fiction and homage. It is **not** a U.S. government or Space Force product.

Thematic historical anchors (public record):

- Space Policy Directive-4, 19 February 2019
- U.S. Space Command re-established 29 August 2019
- United States Space Force established 20 December 2019 (FY2020 NDAA)

---

## Controls

| Action | Gold Eagle (P1) | Crimson Wedge (P2) |
| --- | --- | --- |
| Rotate | A / D | J / L |
| Thrust | W | I |
| Torpedo | Space or F | K |
| AEGIS beam | E | O |
| Launch drone | Q | U |
| Hyperspace | S | M or `,` |

---

## Modes

1. **Operation HIGH GROUND** — five-mission campaign vs Guardian AI
2. **Duel vs Guardian AI** — classic well, machine opponent
3. **Local two-pilot duel** — same keyboard, 1962 social contract

---

## Run locally

```bash
git clone https://github.com/luckoptimizer/SPACEWAR-2026.git
cd SPACEWAR-2026
# then open index.html
# or:
python3 -m http.server 8080
```

Enable GitHub Pages on `main` / root to host the launch.

---

## Layout

```
index.html          playable game shell
css/app.css         flag-deck chrome
js/game.js          physics, AI, weapons, campaign
docs/DESIGN.md      systems
docs/CAMPAIGN.md    Operation HIGH GROUND
CREDITS.md          1962 + 2026
LICENSE             CC0 remake + required 1962 paragraph
```

## License

Remake dedicated under CC0 **plus** the original Spacewar! credit paragraph, which must travel with every copy. See `LICENSE` and `CREDITS.md`.
