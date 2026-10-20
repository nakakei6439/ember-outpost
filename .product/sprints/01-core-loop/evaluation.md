# Sprint 01 Evaluation (attempt 1): PASS

## Summary
| Criterion | Result | Threshold | Verdict |
|---|---|---|---|
| 1 Acceptance criteria (sprint 01: 15 + common: 4) | 19/19 observed. Real-device-only items listed under "Could not evaluate" | 100% | PASS |
| 2 Stability | 0 crashes, 0 console errors or exceptions, main flow completed (about 12 minutes of total play) | 0 | PASS |
| 3 Data integrity | coins = served × 5 every time (45/60/100). Meat stayed conserved through sorting and fainting. Reload resets to the initial state as the spec requires | 100% | PASS |
| 4 Regression | Not applicable: sprint 01 is the first sprint. The common criteria were re-checked instead (see below) | 100% | N/A |
| 5 Usability | 4 | 3 or higher | PASS |

## Test environment
- 2026-10-17, 17:55 to 18:40 JST. Dev server `npm run dev` at http://localhost:5173 (already running). The source did not change during the evaluation (main.ts mtime 17:52:10).
- Local Chrome 155, headless, driven directly over CDP. Viewport 390×844, DPR 3, `mobile:true`, touch emulation enabled, iPhone UA.
- All movement used **real touch events** (`Input.dispatchTouchEvent`), with every drag starting in the lower half of the screen (y=650). Keyboard input was used only for the WASD/arrow-key check.
- State was read from `window.__ember.snapshot()`, plus a 30 ms state recorder injected into the page.
- **Control experiment:** the same swipe and pinch on an unprotected page gave scrollY=788 and scale=2.5, so this method does detect scrolling and zooming.

## Acceptance criteria checked one by one
| # | Criterion | Observation | Verdict |
|---|---|---|---|
| 1 | Title within 3 s, then the game screen | "Tap to start" appeared 29 ms after navigation. One tap showed the snowfield, hunter, fence, campfire, 4 survivors in line, and coins 0 (02-start) | PASS |
| 2 | Stick, 8 directions, stops on release, map bounds, camera follow, keyboard | Stick ring appears at the touch point (03). Displacement in 350 ms: U(1,-89), D(1,87), L(-88,2), R(88,0), diagonals about (±65,±66). Released stick disappears and the hunter stops at 509,774 then stays at 509,774. Map edge clamps at x/y=14. Camera follows. W/A/S/D and the arrow keys each move about 47 px in 300 ms; W+D moves (33,-33) | PASS |
| 3 | Bear HP bar, auto-attack, 2 meat drops, respawn | Each kill adds 2 to `drops`. bears goes 5 to 6 after about 3.5 s. Bears never ran out during about 12 minutes of play | PASS |
| 4 | Meat suction, stacking, count, MAX | Meat flies to the hunter and stacks vertically with a count number. At 10 "MAX" shows. Killing a bear while full leaves drops=2 on the ground (08) | PASS |
| 5 | Input pad, progress, about 1 s each, continues when away | Raw meat moves to the fire one piece at a time (10 to 7 to 3 to 0). "×N" and a progress bar show (09). After walking away, 3 seconds gave raw 7 to 4 and out 3 to 6 | PASS |
| 6 | Output pad pickup, colour difference, mixed sorting | Cooked meat is brown, raw is red (16). With [9 cooked + 1 raw], the input pad took only the raw. With [4 raw + 3 cooked], the counter took only the 3 cooked and the 4 raw stayed | PASS |
| 7 | One at a time to the front survivor, warm look, next person, pile +5 | served goes up 1 every 0.25 s. The survivor shows a check mark and flushed cheeks, then leaves. The next person walks up the snow path from below (12). pile = served × 5 (×15 bills = 3 people) | PASS |
| 8 | Coins at the payment spot = people served × 5 | 9 people gave 45, 12 people gave 60, 20 people gave 100. Every value matched, and the HUD text matched too | PASS |
| 9 | Rifle auto-fire, bullets visible | Yellow bullets and muzzle flash are visible (19, 24). Bear HP bar goes down | PASS |
| 10 | About 0.5 s wind-up (red, "!") before the attack, dodgeable | When standing still, damage arrived 0.49 to 0.72 s after closing in. During the wind-up the bear glows red and shows "!" (19). Fleeing immediately dodged 5 of 5 tries. The only hits came on tries where a screenshot delayed the escape by about 200 ms | PASS |
| 11 | Green HP bar, damage number, screen shake | -22 floats up (18-windup-3). Instrumenting the camera transform showed random ±6 px shake for 0.25 s right after a hit, then back to 0 | PASS |
| 12 | Faint, drop meat in place, respawn at campfire after 2 s, re-pick | "Down..." shows and the 10 carried pieces scatter (20). The stick does not work while down. After about 1.93 to 2.0 s the hunter respawns at (400,615), near the fire, with HP 100 (21). Going back recovered the dropped meat (drops 45 to 38). See bug B1 | PASS (with bug) |
| 13 | HP recovers near the campfire | Near the fire HP rose about 1 per 60 ms (about 14/s), for example 78 to 100 | PASS |
| 14 | A beginner faints only 1 to 2 times | Bot run that walks straight into bears with no dodging (116 s): more than 10 bears killed (20 cooked served), 12 hits taken, **1 faint**, 3 delivery loops, 100 coins. It takes 5 hits to faint (100/22) | PASS (bot stand-in, not a human) |
| 15 | Visual direction | See below | PASS |

### Visual direction (from screenshots)
Brown dirt base with a wooden stake fence and wooden gates at the top and bottom. Snowfield outside with falling snow, trees and rocks. White bears live outside the gate. Blue-coated hunter with a rifle, green HP bar overhead and a light-blue ring at the feet. Red slab meat stacks tall on the back. Wooden pallet for cooked meat. Long counter with grill and cutting board. Red-parka survivors walk in from the bottom and show a meat speech bubble or a check mark. Green bill stacks pile up high. Dark rounded cash HUD at the top right. Everything matches the direction (02, 12, 14).

### Common criteria (smartphone)
| Item | Observation | Verdict |
|---|---|---|
| Full screen, no scroll bar or gaps | scrollHeight = clientHeight = 844. `viewport-fit=cover` plus safe-area padding on the HUD and hint | PASS (real notch not checked) |
| No scroll, zoom, selection, long-press menu or pull-to-refresh | Over 10 up/down swipes from the top and bottom edges, 2 pinch gestures (synthetic and manual 2-finger), 3 double-taps, 20 rapid taps, 1.2 s long-presses on canvas, HUD and hint, and synthetic scroll gestures: scrollY stayed 0, visualViewport.scale stayed 1, selection stayed empty, 0 contextmenu events, 0 scroll events | PASS (Chrome emulation) |
| Button 44 px or larger, numbers 16 px or larger | Start button 252×60. Coin HUD 44 px tall, 28px font | PASS |
| Playable one-handed (lower-half drags only) | Every touch operation in this evaluation started at y=650 | PASS |

## Bugs found (none affect the verdict)
### B1 [Low] Fainting next to meat on the ground picks up 1 more piece, which is carried to the respawn point
- **Steps**: 1. Kill bears and leave meat on the ground near the hunter (for example, kill while at MAX). 2. Stay close to that meat and keep taking bear hits until HP reaches 0.
- **Expected**: Per criterion 12, everything carried drops in place and the hunter respawns empty-handed.
- **Actual**: Recorder log: `431011 [[],incoming:1,...,down:true]` then `431221 [["raw"],...,down:true]`. A meat flies to the downed hunter, the stack shows "1" on the faint screen, and the hunter respawns at the campfire still carrying 1 raw meat (20, 21). Meat is not duplicated (the total is conserved).
- **Likely cause (separate from the symptom)**: `update()` computes `downed` at the start of the frame. In the same frame where `hurtPlayer` faints the hunter, the meat pickup check still sees `!downed` as true.

### B2 [Low, cosmetic] Extra `</div>` in index.html puts `#title` and `#hint` outside `#app`
- `<div id="coin-box">…</div></div>` closes `#hud` early.
- DOM check: the parent of `#title`/`#hint` is BODY. On PC (1280×800) the title overlay covers the full 1280 px width, not the 400 px play area (26). It does not show on the phone.

### B3 [Low, cosmetic] Overlapping elements
- The top-right HUD covers the HP bars of bears at the top of the screen (02).
- The hunter's HP bar cuts across the middle of the carried meat stack (08).
- The campfire progress bar and "×N" overlap the top gate (09).
- At the top map edge (y=14), the hunter's head goes off the top of the screen (24).

## Improvement suggestions (do not affect the verdict)
1. **[Medium] Healing at the gate is too strong.** The heal radius of 140 reaches outside the top gate (y≈431). Standing in the gate, HP comes back from 78 to 100 between bear attacks, so bears can be hunted with almost no risk. Shrink the radius to inside the fence, or stop healing while a bear is attacking.
2. [Low] The blue counter pad's "配給" (serving) label is hidden behind the counter drawing. First-time players may not know where to stand. Show the label above the pad.
3. [Low] Meat on the ground is capped at 60 and the oldest pieces disappear silently. This fits the spec, but a beginner who hunts while at MAX can lose meat without noticing.
4. [For the spec author] spec.md contradicts itself. Assumption 5 ("bears do not counterattack") and the out-of-scope line ("bears do not attack the player") conflict with F16. The ID F16 is also used twice. Fix this before sprint 02.

## Could not evaluate (stated plainly)
- **Real iOS Safari and Android Chrome**: iOS Safari ignores `user-scalable=no`, so pinch blocking there relies only on `gesturestart` preventDefault and `touch-action:none`. **Pull-to-refresh** exists only on real Android Chrome, so I could only confirm indirectly that no scroll happened. Real notch and home-bar placement were also not checked. All of these need one manual check on a real device.
- **A human beginner's faint count**: criterion 14 was checked with a "walk straight into the bear" bot, which fainted once. Nobody played it by hand.
- One more bot run stalled because of my CDP test harness (the page itself was still `playing` at 61 fps), so the faint-count sample is n=1.
- Once during a map-edge drag, the hunter stopped partway. Three 4-second long drags right after that never dropped out, so I could not reproduce it (probably a collision with a tree or bear).

## Screenshots
`.product/sprints/01-core-loop/screenshots/`: 01-title, 02-start, 03-stick-drag, 08-max-drops-ground, 09-in-pad-cooking, 12-serving, 14-collect-coins, 16-mixed-raw-cooked, 18-windup-3, 19-flee-start, 20-fainted, 21-respawned, 24-map-top-right, 26-pc-title
