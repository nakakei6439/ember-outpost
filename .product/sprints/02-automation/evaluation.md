# Sprint 02 Evaluation (attempt 1): FAIL

## Summary
| Criterion | Result | Threshold | Verdict |
|---|---|---|---|
| 1 Acceptance criteria (8) | 6/8. #4 (hunter partner) and #6 (30 s idle after clear) failed; #3 (carrier MAX display) partly failed | 100% | FAIL |
| 2 Stability | 0 crashes, 0 console errors. **But the hunter partner gets permanently stuck along the bottom fence, and the idle economy stops.** Reproduced 4 of 4 times | 0 | FAIL |
| 3 Data integrity | Meat conservation (2 × kills = served + all meat in the game) had a final difference of 0 in both playthroughs (transient -3 at most = meat in flight). Coins + remaining build cost was conserved. "Play again" fully resets twice in a row | 100% | PASS |
| 4 Regression (sprint 01 fixes + loop + phone conditions) | 8/8 | 100% | PASS |
| 5 Usability | 3 (the loop up to clear is easy to understand, but after clear the base visibly stops working) | 3 or higher | PASS |

**Clear time (no debug, touch-only human-style run): 2:36 (run 1) / 3:27 (run 2).** Run 2 went over 3 minutes because the hunter partner got stuck right after being hired (bug F1), so I had to earn the expansion's 40 coins myself.

## Test environment
- 2026-10-17 to 18. Dev server http://localhost:5173 (already running). main.ts mtime 20:36:16 (did not change during the evaluation).
- Local Chrome 155 headless, driven over CDP. 390×844, DPR 3, `mobile:true`, touch emulation. Every movement was a real touch drag (`Input.dispatchTouchEvent`) starting at y=650 (lower half).
- The "human-style playthrough" is a touch bot I wrote: hunt nearest bear → raw to input pad → serve or put on counter → collect pay → build when affordable. It does not use debug. It reacts faster than a human but makes no optimal moves. No human played by hand.
- For integrity, I put an rAF-based in-page monitor on `__ember.snapshot()`. It tracks kills (increases of pendingRespawns), meat conservation, and how long each NPC stays not moving.

## Acceptance criteria checked one by one
| # | Criterion | Observation | Verdict |
|---|---|---|---|
| 1 | "Automation n/4" display; spot name + remaining cost; equal decrease; stop/resume; no negative; excess kept | The top bar always shows "自動化 0/4 → 4/4". Spots show a person icon + "レジ係 15", "運搬係 0/3", "狩り仲間 30", "拠点の拡張" + remaining cost (d1-01/04/05). Coins + remaining stays constant (105 → 49+14 = 63 = 105 − 30 − 12). After stepping off, coins stayed 49 / remaining stayed 14 for 1 s. Going back resumed from 14. 49 − 14 = **35 left over**, matching the real value of 35 | PASS |
| 2 | Cashier appears; you only place meat on the counter; count visible; cashier hands out while you are away | Cashier appears right of the counter (p1-built-cashier). Placing 6 cooked shows "×4" on the counter (ctr-count). After walking away, served went 3 → 10 and pile 50 in 4 s | PASS |
| 3 | Carrier 1/3 → 3/3, MAX and no more coins taken; carriers round-trip; more carriers = more delivery | Hiring increases carriers 1 → 3. At 3/3 coins are no longer taken (standing still for 1.5 s kept coins at 105). Carriers take from the output pad to the counter (log: `toPad → toCounter#2 → idle`). **But at 3/3 the spot disappears and "MAX" is never shown** (d1-03; no "MAX" string for the spot exists in the code). Carrier freeze: see F2 | Partial FAIL |
| 4 | Hunter partner hunts bears outside, picks up meat, carries it to the input pad | In a clean state it works (in 66 s it delivered to fire.raw several times and coins went 35 → 125). **However, within 0 to 50 s it starts to oscillate along the outside of the bottom fence (y=1026) and stops picking up meat for good** (F1) | FAIL |
| 5 | Expansion → coins auto-collected → clear screen (message, time, Play again, Keep watching) | "クリア！ 拠点が自分で回り始めた！ タイム 2:36" plus 240×56 buttons for "もう一回" and "このまま眺める" (p1-clear). With hunter healthy, coins went to the wallet automatically without the player going to the pay spot | PASS |
| 6 | Keep watching, 30 s without touching → coins keep rising; Play again stays pressable | **Run 1: coins stayed at 0 for 100 s. debug run: stayed at 35 for 90 s. A third run rose 155 → 245 and then stopped at 245 from 54 s on.** The "もう一回" button (96×48) stays visible and works | FAIL |
| 7 | Play again → full reset; can clear again; reload starts over | Tested twice from the clear screen + once from the watch mini button: coins 0, 0/4, npcs 0, stack 0, fire 0/0, drops 0, served 0, elapsed 0.7, bears 6, spots=[cashier]. Cleared again after each one (0:17, 0:09 with debug). Reload goes back to the title | PASS |
| 8 | Clearable in 2–3 min with touch; +50 button only with ?debug=1 | 2:36 / 3:27 (see above). Without ?debug=1 the button is `display:none`. With it, 116×48, and 3 taps → coins 150 | PASS (with a caveat: run 2 went over 3 minutes because of F1) |

## Reasons for failing (fix these to pass)
### F1 [High] The hunter partner gets permanently stuck along the outside of the bottom fence, and coin growth after clear stops
- **Steps (no debug)**: 1. Play normally up to the expansion and clear (the player shoots bears from inside the fence too). 2. Tap "このまま眺める" and do not touch anything.
- **Steps (debug, short)**: `?debug=1` → +50 ×3 → stand on the spots in order to clear → "このまま眺める".
- **Expected**: Criteria 4 and 6. The hunter keeps cycling bear → meat → input pad, and coins keep rising.
- **Actual**: The hunter stays in `state:"hunt", stack:0` and moves back and forth between x=250 and 612 at **y=1026** (just below the bottom fence) for more than 100 s. Bears are killed (drops 13 → 19) but never picked up. fire, served and coins all stay frozen.
  - Run 1: coins 0 → 0 (100 s)
  - debug run: 35 → 35 (90 s)
  - Third run: 155 → 245 for 54 s while healthy, then stuck and 245 → 245
  - Also in run 2: it went into this state right after being hired at 1:38, and the snapshot at clear (3:27) showed the same `hunt0@360,1026`
  - **Reproduced 4 of 4.** When the player went and picked up meat on the ground, the hunter started moving again.
  - Evidence: w-watch-15.png and d1-07-watch-90s.png (green hunter below the fence, meat left near the fence)
- **Guess (separate from the symptom)**: `updateHunter` never lets go of `n.tgtDrop` once it is set (it is only cleared when the drop disappears). When it targets meat that `navStep` cannot reach, such as meat that fell within 20 px of the fence (the `blocked` margin) or inside the fence, it seems to keep sliding along the fence forever. Possible fixes: give up a target after a time limit or a distance that does not shrink, or exclude meat inside the margin from targets.

### F2 [Medium] Carriers freeze at their waiting spot for 25–37 s in the `toPad` state (not reproducible on demand)
- **Observed**: In both no-debug playthroughs, the monitor logged 11 times (run 2) that carriers 1 and 2 were standing still at their waiting spots (421,672)/(454,674) in `toPad`, stack 0, with fire.out=1. Example log: `STUCK 144515 1carrier 420,673 toPad stack0 fireOut1 player367,635` (longest 37 s in run 1, 26 s in run 2). It started every time the player was at or right below the input pad (around 345–368, 600–689). Meanwhile one cooked meat stayed on the output pad and did not reach the counter.
- **Reproduction attempt**: Standing on the input pad by hand and watching every 0.4 s for 20 s, the carriers moved normally. **I could not reproduce it on demand.** The logs show 3 px of movement or less for 25 s or more.
- **Expected**: Carriers go to collect even if only one meat is on the output pad.

### F3 [Low] The carrier spot disappears at 3/3 and "MAX" is never shown
- Spec: "3/3 で「MAX」になりコインが吸い込まれなくなる" (at 3/3 it shows "MAX" and stops taking coins). The implementation removes the spot at 3/3 (the self-review also says "MAX でマスが消える"). Coins do stop being taken, but there is no "3/3" or "MAX" display. Either keep showing the spot as "MAX", or change the spec.

## Regression (sprint 01 fixes + loop + phone conditions)
| Item | Observation | Verdict |
|---|---|---|
| No pickups while fainted | Fainting while carrying 10 with meat on the ground nearby: during the faint stack=0, incoming=0, drops 10 → 20 (conserved); still 0 carried after respawn 1.97 s later (f-fainted, f-respawned) | PASS |
| Display overlaps | HUD is now its own top bar, so it no longer covers bear HP bars. Hunter HP bar is at the feet. Cooking progress is under the fire. At the top edge y=48, the head is fully visible (e-top-edge) | PASS |
| Healing only inside the fence | Standing just outside the top gate (400,431): HP 78 → 78 (2.5 s). Inside near the fire: 93 → 100 | PASS |
| PC title width | 1280×800: #title/#hint are inside #app, at x=440, 400 px wide (pc-title) | PASS |
| Sprint 01 loop | In both playthroughs, before any hiring, everything worked: hunt → cook → serve → collect (7 served → 35 coins before the cashier). Meat conservation difference ended at 0 | PASS |
| Phone: scroll/zoom/selection/menu | Swipes, 2 pinches, double-taps, rapid taps, long-presses: scrollY 0, scale 1, no selection. The long-press menu reaches window as `defaultPrevented=true` (also on the new top bar) | PASS |
| Button sizes | Debug 116×48, mini Play again 96×48, clear-screen buttons 240×56 | PASS |
| Console | 0 errors/warnings in every run | PASS |

## Improvement suggestions (do not affect the verdict)
1. [Medium] Cashier and carrier use the same spot (SPOT1). If you keep standing right after hiring the cashier, payment for the carrier starts automatically. The bot lost 5 coins it had not meant to spend within 0.9 s. A human will also do this without noticing. Add a short pause after completion, or require stepping off once.
2. [Low] The 3 idle carriers stand right on the "焼き肉" (cooked meat) label of the output pad and hide it (p1-clear, w-watch-15). Move their waiting spot a little.
3. [Low] `#clear` still has the `hidden` attribute while it is on screen (it is shown because of the CSS `display:flex`). It works, but the code is misleading.

## Could not evaluate
- **Clear time from a human playing by hand**: both runs were a touch bot. A human would probably be slower than 2:36 (as the self-review also expects).
- Real iOS Safari / Android Chrome (pinch on iOS, pull-to-refresh on Android, notch).
- How to reproduce F2 on demand.

## Screenshots
`.product/sprints/02-automation/screenshots/`:
- p1-built-cashier, p1-built-carrier3, p2-built-hunter
- p1-clear (2:36), p2-clear (3:27)
- w-watch-15, d1-07-watch-90s (hunter stuck: F1)
- d1-01-spot-cashier, d1-04-hunter-spot, d1-05-expand-spot, d1-03-carrier-max (F3)
- ctr-count, r-after-retry
- f-fainted, f-respawned, e-top-edge, pc-title

---

# Sprint 02 Evaluation (attempt 2): PASS

## Summary
| Criterion | Result | Threshold | Verdict |
|---|---|---|---|
| 1 Acceptance criteria (8) | 8/8 | 100% | PASS |
| 2 Stability | 0 crashes, 0 console errors. The hunter did not get stuck in 4 runs (12.5 minutes of idle "Keep watching" in total) | 0 | PASS |
| 3 Data integrity | Meat-conservation difference at the end of each run was 0 (in-flight transient at most -3). Coins + remaining cost conserved. "Play again" fully reset 3 times in a row | 100% | PASS |
| 4 Regression | 12/12 (everything that passed in attempt 1 + sprint 01 fixes + phone conditions) | 100% | PASS |
| 5 Usability | 4 | 3 or higher | PASS |

**Clear time (no debug, touch only, the same human-style bot as attempt 1): 2:10 / 1:57 / 1:59.** All 3 runs are within the 1:30 to 4:00 reporting range. They are 30 to 90 seconds faster than attempt 1 (2:36 / 3:27) because of the hunter rebalance (carries 4, shoots faster, moves faster) and the F1 fix. A human playing by hand would probably take somewhat longer, so this is likely around 2 to 3 minutes.

## Test environment
- 2026-10-18. main.ts mtime 07:19:37 (did not change during the evaluation). Same as attempt 1: Chrome 155 headless, CDP, 390×844, DPR 3, touch emulation, all movement by real touch drags (lower half).
- The same touch bot as attempt 1 (`play.mjs`) for the playthroughs, then "このまま眺める" (Keep watching) followed by **200 s untouched**.

## Re-checking the fixes
### F1 (hunter stuck): fixed
| Run | How cleared | Coins during Keep watching | Hunter |
|---|---|---|---|
| p3 | No debug, 2:10 | 200 s: 25 → 285 (rose every 20 s) | Cycled hunt → deliver4 normally |
| p4 | No debug, 1:57 | 200 s: 25 → 315 | Same |
| p5 | No debug, 1:59 | 200 s: 15 → 299 | Same |
| d2 | Same steps as attempt 1's d1 (debug fast hire, pile left uncollected before expansion) | 180 s: 53 → 605 | Same |
- The oscillation at y=1026 along the outside of the bottom fence never appeared even once (it reproduced 4/4 in attempt 1).
- The longest the hunter stood still was 1.9 s.
- Meat left on the ground stayed at 0 to 2 pieces and was always picked up.

### F2 (carrier freeze): no freeze under the same conditions. **Correction: the attempt 1 finding was most likely a measurement error on my side**
- **Direct measurement**: in the same condition as before (player standing on the raw-meat drop-off pad at 345,600), I measured how long cooked meat waits on the pickup pad from when it appears until a carrier takes it, every 50 ms for 90 s. 21 times, **max 1.05 s** (f2-player-on-inpad).
- During the playthroughs p3/p4/p5 the max wait was **2.0 s** every time. After clear and in the d2 run it was 1.85 s.
- **Correction**: my attempt 1 monitor measured "time since the last movement". So the idle time a carrier spent at its spot was counted in the moment it switched to `toPad`. That gave false "frozen 25–37 s" reports. In attempt 2 the same monitor reported similar numbers, but a 50 ms state trace showed the carriers start moving within 50 ms of switching to `toPad`. The attempt 1 F2 report was therefore most likely an artifact of how I measured. The generator's safeguards (6 s reservation expiry, watchdog) cause no problems.

### F3 (MAX at 3/3): fixed
- At 3/3 the spot stays and shows "運搬係 3/3" plus a gold "MAX" (f3-carrier-max).
- Standing on it for 1.5 s kept coins at 105 (no coins taken). `spots[].max=true`.

## Acceptance criteria (re-check)
| # | Observation | Verdict |
|---|---|---|
| 1 | "自動化 n/4", spot labels, equal decrease (105 → hunter 30 + expansion 17 = 58), stepping off pauses at 48/13 for 1 s, no negative, excess kept | PASS |
| 2 | Cashier serves (in the playthroughs, served rose by 1 at a time after the counter drop) | PASS |
| 3 | Carriers 1 → 3, 3/3 MAX, no coins taken, round trips (`toPad → toCounter#2 → idle`) | PASS |
| 4 | Hunter hunts → picks up → takes meat to the drop-off pad, and does not get stuck | PASS |
| 5 | Clear screen (message, time 2:10 etc., two 240×56 buttons). Pay is collected automatically | PASS |
| 6 | Keep watching for 200 s × 3 + 180 s: coins keep rising. The "もう一回" mini button (96×48) is visible and works | PASS |
| 7 | Play again (mini once, clear screen twice): coins 0, 0/4, npcs 0, stack 0, drops 0, elapsed 0.7, spots=[cashier]. Re-cleared after each one | PASS |
| 8 | 2:10 / 1:57 / 1:59. The +50 button only shows with ?debug=1 | PASS |

## Regression
| Item | Result |
|---|---|
| Everything that passed in attempt 1 (criteria 1, 2, 5, 7, 8, meat conservation, coin conservation) | PASS (see above) |
| No pickups while fainted | Fainting while carrying 10: stack=0, incoming=0 while down, drops 12 → 22, still 0 carried after respawn 1.92 s later |
| Healing only inside the fence | Just outside the top gate (400,432): 78 → 56 (no healing, hit by a bear). Inside near the fire: 71 → 92 in 1.5 s |
| Display overlaps / top edge | Head fully visible at y=48 (e-top-edge). HUD is its own top bar |
| PC title width | #title/#hint inside #app at x=440, 400 px wide |
| Sprint 01 loop | Hunt → cook → serve → collect works in all 3 playthroughs before hiring |
| Phone: scroll/zoom/selection/menu | scrollY 0, scale 1, no selection after the gestures. Long-press menu has defaultPrevented=true |
| Console | 0 errors/warnings in every run |

## Bugs (none affect the verdict)
None found in attempt 2.

## Improvement suggestions (carried over, do not affect the verdict)
1. [Medium] Cashier and carrier share a spot, so if you keep standing after hiring the cashier, payment for the carrier starts automatically (5 to 6 coins went in within 0.8 s in all runs).
2. [Low] Idle carriers hide the "焼き肉" label on the output pad.
3. [Low] The player's body hides the label on a spot while standing on it (d2-03). Expected behaviour, but the remaining cost can be hard to read.

## Could not evaluate
- Clear time from a human playing by hand (bot only).
- Real iOS / Android devices.

## Screenshots (attempt 2)
`.product/sprints/02-automation/screenshots/attempt2/`:
- p3-clear, p4-clear, p5-clear
- p3-watch-end, p4-watch-end, p5-watch-end, d2-watch-end
- f3-carrier-max, f2-player-on-inpad
- r-after-retry, f-fainted, f-respawned, e-top-edge, pc-title
