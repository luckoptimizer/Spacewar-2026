# SPACEWAR! 2026 — Design

## Inheritance from 1962

Kept from the PDP-1 original:

- Two wedge-class ships in a single CRT-like battlespace
- Rotation, thrust, torpedoes, hyperspace
- Central gravity well that will kill you if you hug it
- Newtonian motion (you keep drifting)
- Torpedoes that do not care who fired them once they leave the tube
- Hyperspace as a gamble, not a free escape

Raised to 2026:

- Multi-theater campaign (Earth, Luna, Mars, Belt, Jupiter)
- Guardian drones with independent seekers
- Directed-energy “AEGIS beam” with heat and lock
- Adaptive opponent AI (orbit, intercept, sun-dodge, drone call)
- Cinematic USSF launch and briefing stack
- Vector ships with additive bloom, shock rings, and a living starfield

## Combat loop

1. Briefing names the theater and the win condition.
2. Both hulls spawn opposite the gravity body.
3. Fuel, torpedoes, beam heat, and drone bays are finite.
4. First hull to zero integrity loses the engagement.
5. Sun / planet core is instant death. Hyperspace has a small collapse chance.

## AI weapons

- **AEGIS beam** — short-range coherent energy. Builds heat. AI leads the target.
- **Sentinel drones** — small craft that hunt, rake with light kinetic, and die in one hit.
- **Predictive fire** — opponent lead-computes torpedo intercepts instead of shooting at your nose.

## Theaters

| Code | Theater | Gravity | Extra |
| --- | --- | --- | --- |
| SF-01 | LEO / Gold Dome | moderate Earth-mass analog | tutorial AI |
| SF-02 | Lunar Lagrange | low | drone war |
| SF-03 | Mars Approach | high dust + well | beam unlocked |
| SF-04 | Belt Ambush | clustered rocks | asteroids |
| SF-05 | Jovian Gate | heavy well + storms | boss AI + drones |

## Controls

| Action | Gold Eagle (P1) | Crimson Wedge (P2) |
| --- | --- | --- |
| Rotate | A / D | J / L |
| Thrust | W | I |
| Torpedo | Space or F | K or ; |
| Beam | E | O |
| Drone | Q | U |
| Hyperspace | S | , or M |
