# Sprint 03 Evaluation (attempt 1): PASS

## Summary
| Criterion | Result | Threshold | Verdict |
|---|---|---|---|
| 1 Acceptance criteria (8) | 8/8 observed. Actual sound playback and real-device fps are under "Could not evaluate" | 100% | PASS |
| 2 Stability | 0 crashes, 0 console errors (2 playthroughs + many partial tests) | 0 | PASS |
| 3 Data integrity | Meat conservation difference 0 / -1 (only meat in flight) in both playthroughs. Mute setting saved in localStorage and kept across reload and Play again. Play again fully reset 3 times | 100% | PASS |
| 4 Regression | 13/13 (sprint 01 and 02 conditions, fixes, phone conditions) | 100% | PASS |
| 5 Usability | 4 | 3 or higher | PASS |

**Clear time (no debug, touch only, the same human-style bot as sprint 02): 2:12 / 2:16.** A human playing by hand would probably take longer.

## Test environment
- 2026-10-18. main.ts mtime 08:00:58 and audio.ts 08:00:01 (no changes during the evaluation). Chrome 155 headless, CDP, 390×844, DPR 3, touch emulation. All movement by real touch drags (lower half).
- **Sound**: I ran a hook before the page loads that wraps the `AudioContext` constructor and `createOscillator`. It records context creation and state changes, plus the first frequency of each oscillator (each sound is told apart by its frequency, e.g. 760 Hz = shoot, 1250 Hz = build tick). **I cannot hear the actual audio** (headless).
- **Effects**: an in-page monitor watches for hits, kills, coin gains, hires and so on, then saves the canvas at 3 and 12 frames after each event with `toDataURL`. Hooks on `ctx.scale` and `ctx.rotate` measure the pop-in scale and the arrow angle numerically.
- **fps**: `Emulation.setCPUThrottlingRate(4)`. Throttling is effective: a busy loop takes 15 ms normally and 59 ms throttled. Measured with rAF counts.

## Acceptance criteria checked one by one
| # | Criterion | Observation | Verdict |
|---|---|---|---|
| 1 | Damage number on each hit, bear flashes white; snow burst on kill | 3 frames after a hit, a yellow "-10" floats above the bear and the bear is lit white (cap-hit-0). 3 frames after a kill, white/light-blue particles spread at the spot and the meat drops (cap-kill-0). The player's damage "-22" is red, so the two can be told apart | PASS |
| 2 | Meat, cooked meat and coins fly in an arc; the receiver swells; "+5" style number | Payment bills fly in an arc to the pay spot (cap-pile-1). Meat flies to the back (cap-meat-0). The HUD coin box got the `bump` class **70 times in 40 s** (MutationObserver). Coin gains are shown merged as "+9" next to the HUD (p6-clear) | PASS |
| 3 | Coins fly continuously into a build spot, remaining cost goes down with them | A stream of bills is visible flying into the "拠点の拡張 40" spot (pop-0). The tick sound fires 61–63 times per playthrough, matching the number of build coins | PASS |
| 4 | Hire pops in + light + "○○が来た！"; expansion makes the base bounce; confetti on clear | `ctx.scale` right after hiring the cashier: 0 → 0.706 → 1.098 (overshoot) → 1, so it pops in with easeOutBack. "レジ係が来た！" / "狩り仲間が来た！" (cap-hire-0, pop-2). Confetti on the clear screen (p6-built-expand, p6-clear). I could not single out the base bounce on expansion as a number (it overlaps the confetti), so I judged it from screenshots only | PASS |
| 5 | Teammates bounce while walking, meat stacks on their backs, cashier's coin flies, after expansion coins fly to the HUD and "+N" appears | 412 non-uniform `ctx.scale` calls (y/x up to 1.05) in 8 s of watching = walking stretch. Bills fly in an arc to the pay spot on serving. After expansion, pile 277 → 0 and coins 53 → 355 into the HUD with "+N" | PASS |
| 6 | Sounds at each moment; sound after the start tap on iPhone; mute button 44px+ kept after Play again | **AudioContext is not created before the tap** (ctxCount 0). On the start tap it is created and goes `running`. Calls in one playthrough: shoot 68, hit 68, kill 17, meat 21, coin 93, tick 63, hurt 6, hire 5 hires (4 notes each), clear 1. Mute button **48×48**. Tapping it gives 🔇, `localStorage.ember_muted=1`, and **0 oscillator calls during 4 s of fighting**. After reload it is still 🔇 and still 0 calls after start. **Still 🔇 after Play again.** Unmuting brings the calls back | PASS (actual sound not checked) |
| 7 | Arrow to the next destination | Measured the `rotate` angle vs the expected direction (error under 0.01 rad in every case): ① nothing carried → nearest bear ② raw meat → raw-meat pad ③ cooked meat waiting with no carriers → cooked-meat pad ④ cooked meat → counter ⑤ pay ≥ 5 → pay spot ⑥ enough coins → build spot. Within 75 px of the target: hidden (no candidates) | PASS (7/7) |
| 8 | 30 fps or more with 4x CPU throttle | 5 teammates working + bears killed in a row + coins collected (25 s): **min 60 / avg 60.1, worst frame 17 ms**. Hiring → clear → confetti (19 s): **min 59, worst frame 33 ms** | PASS (headless) |

## Fixes carried over
| Item | Observation | Verdict |
|---|---|---|
| No automatic payment into a shared build spot | Keeping on standing for 2.7 s after the cashier was done: coins 35 → 35, carriers 0. Stepping off once and back on starts the payment (2 carriers hired). In the playthroughs nothing was paid without intent | PASS |
| Label hiding | Idle carriers moved to (505+28i, 650), so the "焼き肉" label is visible. Build-spot text is drawn above the player (cap-hire-0, pop-0) | PASS |

## Regression
| Item | Result |
|---|---|
| Coins keep rising after clear | Keep watching 120 s: 20 → 160 (p7). Rose every 30 s |
| Clear screen / Play again | Message, time, buttons. 3 Play again resets (mini once + clear-screen twice): coins 0, 0/4, npcs 0, stack 0, drops 0, spots=[cashier]. Re-cleared each time |
| ?debug=1 only | Not shown without it (`display:none`) |
| Sprint 02 hunter / carriers | No stuck hunter or carrier delays in either playthrough (hunter delivered 4 at a time) |
| Sprint 01 loop | Hunt → cook → serve → collect before hiring, in both playthroughs |
| No pickups while fainted | stack 0 and incoming 0 while down, drops 2 → 12, 0 carried after respawn 2.0 s later |
| Healing only inside the fence | Outside the top gate 78 → 78; inside near the fire 93 → 100 |
| Top edge y=48 / PC title 400 px | PASS |
| Phone: scroll/zoom/selection/menu | After swipes, pinches, double-taps and long-presses: scrollY 0, scale 1, no selection. Long-press menu reaches window with defaultPrevented=true |
| Console | 0 errors/warnings |

## Bugs
None that affect the verdict.

## Improvement suggestions (do not affect the verdict)
1. [Low] The arrow points in a straight line, so when you are inside the fence and the target is a bear outside, it points into the fence rather than the gate (the self-review notes this too). Beginners may walk into the fence.
2. [Low] The player's "-22" and the hit "-10" can overlap and be hard to read during dense fights (cap-kill-0). Not a big problem.
3. [Low] The hire message ("狩り仲間が来た！") can overlap the damage number "-10" (pop-2).

## Could not evaluate (stated plainly)
- **Actual audio**: headless cannot play sound. I only confirmed that the AudioContext starts after the tap, that each sound is triggered, and that muting stops them. Volume, distortion when sounds overlap, and how it sounds on iPhone Safari after the first tap need a real device.
- **fps on a real device**: the 60 fps above is headless Chrome on a Mac (GPU differs) with 4x CPU throttle. Not measured on a real iPhone/Android.
- **Human clear time**: the bot gave 2:12 / 2:16. No human played by hand.
- Real iOS/Android gestures (pinch on iOS, pull-to-refresh on Android).

## Screenshots
`.product/sprints/03-juice/screenshots/`:
- Hits, kills, arcs: cap-hit-0.jpg, cap-kill-0.jpg, cap-meat-0.jpg, cap-pile-1.jpg
- Hiring and build spots: cap-hire-0.jpg, pop-0.jpg, pop-2.jpg
- Clear: p6-built-expand.png and p6-clear.png (confetti, +9), p7-clear.png, fps-confetti.png
- Arrow: arrow-1-empty-bear … arrow-7-near-spot-hidden
- Mute: mute-on.png
