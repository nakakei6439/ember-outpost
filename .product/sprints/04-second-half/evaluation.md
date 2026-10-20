# Sprint 04 Evaluation (attempt 1): FAIL

Target: the latest build (main.ts mtime 2026-10-19 06:14:32: carry limit 30, cannon Lv1–5, "Automation n/7"). It did not change during the evaluation. My earlier measurements on the 10/18 build were thrown away; everything below is from the latest build.

## Summary
| Criterion | Result | Threshold | Verdict |
|---|---|---|---|
| 1 Acceptance criteria (10) | 8/10 met. Failed: **"+X/sec" accuracy (condition 3)** and **first clear 2–3 min (conditions 1 and 9)** | 100% | FAIL |
| 2 Stability | 0 crashes, 0 console errors (only a Chrome autoplay warning before the AudioContext starts, which is harmless) | 0 | PASS |
| 3 Data integrity | Controlled run: placed 30 meat → picked up 30 → served 30 → coins +150, exact match. Play again resets everything from both clear screens | 100% | PASS |
| 4 Regression | 12/12 (sprint 01–03 conditions + phone conditions) | 100% | PASS |
| 5 Usability | 3 (see F3: walking past an optional spot spends coins without you meaning to) | 3 or higher | PASS |

**Clear times (no debug, touch only, the same human-style bot as before):**
| Run | First clear | "Grow more" → second clear | Total |
|---|---|---|---|
| q2 | **3:05** | 2:25 | 5:30 |
| q3 | **3:00** | 3:06 | 6:06 |
The second half is inside 2–4 min. The first half is **at or just over** the 3 min upper limit even for the bot (a human would probably be slower). The generator's bot reported 2:14.

## Test environment
- 2026-10-19. Dev server http://localhost:5173. Chrome 155 headless + CDP, 390×844, DPR 3, touch emulation. Movement by real touch drags.
- Setup and placement used `?test=1` (teleport/bear/drop/moveNpc/expand) and `?debug=1`. **I did not use `__ember.audit()` for the verdict.** I wrote my own checks: within 10 px of the new fence lines = buried, bears inside the new rectangle, real touch movement in 4 directions, and how far each NPC moved.

## Top priority: nothing buried or trapped when the fence expands
I placed things myself in 6 setups (not the generator's arrangement) and expanded. Each was checked at t+0.25 s, 2.2 s, 10 s and 20 s.
| # | Setup | Result |
|---|---|---|
| S1 | Player on the new top fence (250,380), hunter on the new right fence, carrier at the new bottom-left corner, 6 bears on the fence/gate/inner ring/corners, 6 meat on the fence band | 0 in fence, 0 bears inside, 0 meat on fence. Player moves ±121–130 px in all 4 directions |
| S2 | Player on the new bottom fence (500,1140) with a bear 30 px away; NPCs on the old left/right fences; 1 bear in each of the 4 inner corners | Same, all 0. Moves in 4 directions |
| S3 | **Real completion** by paying on the expand spot (hunter on new left fence, carrier on new bottom fence, bears just inside) | All 0. The NPCs kept working (hunter moved 364 px) |
| S4 | Player in the old top gate, hunter in the old bottom gate, bears on the new top and bottom gates | All 0 (in the 10/18 build one sample briefly counted 1 bear inside, but the latest build gave 0) |
| S5 | Player carrying meat on the new right fence + bear winding up next to them; **40 meat** spread over all 4 new fence lines | All 0. 0 meat on the fence, and the meat was moved off the fence band |
| S6 | Real completion + 6 bears inside the future ring (old outside, new inside) + Grow more | All 0. Moves in 4 directions, carriers/hunter moving |
- Also: putting a bear right at the gate while the player stands inside the gate, 4 times, the bear never came more than 5 px past the fence line.
- Hunter for 60 s after expansion: kept cycling hunt → deliver normally (not stuck).
- Ground grows 340×520 → 500×760 (1.47× wide, 1.46× tall).

## Acceptance criteria checked one by one
| # | Criterion | Observation | Verdict |
|---|---|---|---|
| 1 | Fence pops outward / nothing buried / first-half flow and prices / 2–3 min | Fence: PASS (above). Prices: cashier 15, cannon 20, carrier 12, Lv2 35, hunter 50, Lv3 55, expansion 80 (as specified). **First clear 3:05 / 3:00** | **FAIL (time)** |
| 2 | Clear screen 1: "Grow more" / "Play again" → Construction 0/5, stove 70, carriers 3/5 30 | Buttons are "もっと育てる" and "もう一回", no "このまま眺める". After Grow more: overlay closes, "拠点完成 0/5", spots = carrier, stove (+ optional). Time continues (14.9 → 15.7 → …). The clock pauses while the clear screen is shown | PASS |
| 3 | "+X/sec" within 20% of 10 s of idle income; 3× or more after everything | See the "+X/sec" section below. **3.84× achieved. But at the start of the second half and in the low-income stages, many windows are off by more than 20%** | **FAIL** |
| 4 | Big stove (cook interval ≤ half, more capacity) / 2nd counter (2 queues, 2nd cashier, carriers deliver to both) | cookTime 1.0 → 0.4, fireCap 40 → 80, message "大かまど完成！". After the 2nd counter, a 50 ms trace showed meat delivered to both counters and both piles growing at the same time (mont-p2) | PASS |
| 5 | Cashier upgrade / 2nd hunter / carriers up to 5/5 MAX | coinsPer 5 → 10, hand-over 0.5 → 0.22 s. Over 60 s the two hunters were within 60 px of each other only 10/120 samples, and both delivered (9 and 5 times). Carriers 5/5: spot max=true | PASS |
| 6 | Warehouse → "拠点完成！", total time, Keep watching / Play again; coins rise after 30 s idle; full reset from both screens | "拠点完成！大倉庫が完成！…", time 8:12 (debug run), two buttons. Keep watching 30 s: 2435 → 2579. **Play again from both clear screens**: phase 1, old fence, coins 0, rate 0, npcs 0, cannon 0, maxCarry 30, fireCap 40, coinsPer 5, 1 counter, "自動化 0/7" | PASS |
| 7 | Second half 2–4 min, 1–3 spots, ~10 teammates at 30 fps with 4x throttle, +50 in the second half | Second half 2:25 / 3:06. Always 2–3 spots. 9 teammates + cannon + bear fights + 120 meat on the ground, 4x throttle: **min 60 / avg 60** (throttle confirmed: busy loop 15 → 59 ms). +50 works in the second half | PASS |
| 8 | Arrow goes through gates / numbers do not overlap | The arrow angle matched exactly (error 0.00 rad) in 5 situations: inside → bear outside goes via the top/bottom gate; outside west/southeast → raw-meat pad goes via the nearest gate; after expansion the new gate is used (arrow4-*). In fights, the player's "-22" and the bears' "-10" are shown at separate heights and are readable (mont-overlap) | PASS |
| 9 | Cannon Lv1–3 in the first half, gradual strengthening, looks change per level, visuals, first clear 2–3 min | See the cannon table below. Strengthening and looks: PASS. Visuals: smoke, recoil, shell and explosion confirmed in captured frames. **First clear 3:00–3:05 (same issue as #1)** | **FAIL (time)** |
| 10 | Lv4/Lv5 (twin barrels) / carry 30 → 50 → 80, columns / stove takes all at once / towers / bears drop 2–3 / pickup 92 | Lv5 twin barrels and 1 s/440. Carry: fresh = 30, pack1 = 50 (pack2 untested). Collected 50 in 3.3 s, back shows "MAX" in 5 columns. Raw meat pad took 40 in 2.4 s (the rest go in as cooking frees space). Towers drawn ("×22" etc.) | PASS |

### Cannon by level (idle 45 s, cannon kills only)
| Lv | Stats | Kills/45 s | Shots needed | Look |
|---|---|---|---|---|
| 1 | 3.5 s / 170 / 14 | **1** (gate area only. Player has to shoot) | 3 bears placed in range took 2 hits of 14, died on the 3rd (= 3 shots) | Grey barrel "Lv1" |
| 2 | 3.0 / 220 / 18 | 4–5 | Mostly 2–3 | Copper band |
| 3 | 2.4 / 280 / 24 | 10 | Mostly 1–2 | Blue steel + 2 bands |
| 4 | 1.5 / 380 / 34 | 20 | Mostly 1 | Gold barrel + 3 bands |
| 5 | 1.0 / 440 / 40 | **50** | 43/50 in one shot | Gold twin barrels |
Gets stronger step by step (1 → 4 → 10 → 20 → 50). Comparison image: mont-cannon-levels.png.

### "+X/sec" accuracy (debug-built, touch-free, 10 s windows; actual = increase of gainedTotal)
| Stage | Windows within 20% | Mean shown / mean actual |
|---|---|---|
| Second-half start (right after Grow more) | **3/6** (first window: shown 0 vs actual 2.4) | 1.42 / 2.10 (**-32%**) |
| After big stove | 5/6 | 1.75 / 1.48 |
| After 2nd counter | **2/6** (e.g. shown 1.5 vs actual 0.6) | 1.27 / 1.18 |
| After cashier upgrade | 4/6 | 2.76 / 3.33 |
| After 2nd hunter | 5/6 | 7.00 / 7.35 |
| After warehouse (all 5), watching | 6/6 | 7.68 / 8.07 |
| **Ratio all/start** | | **3.84×** (≥3×: met) |
- Re-measured right after Grow more (5 s windows): shown 2.2/2.2/2.0 vs **actual 7.0/5.0/4.0** in the first 15 s (the pay pile from the expansion pours in), then matching after 20 s.
- Overall **13/36 windows are more than 20% off**. Most of them are in the low-income stages (about 1–3 coins/sec) and at the start of the second half.

## Reasons for failing (fix these to pass)
### F1 [Medium] "+X/sec" does not match actual income at the start of the second half and in low-income stages
- **Steps**: `?debug=1&test=1` → buy everything in the first half → expansion → "もっと育てる" → do not touch, and compare the HUD "+X/秒" every 10 s with the coin increase.
- **Expected**: Condition 3: within 20% of 10 s of idle income, measured at the second-half start, after each building, and after everything.
- **Actual**: Second-half start: first window shows +0 vs actual +2.4/s, mean -32%. In the second run the first 15 s show +2.2 vs actual 4–7/s. After the 2nd counter only 2/6 windows are within 20%. After everything is built, 6/6 match.
- **Guess (separate)**: the 30 s rolling average lags behind. It is reset or the pile flush at expansion is not counted, and when income is low, one payment (5–10 coins) is a large share of a 10 s window. Possible fixes: carry over the rate at the start of the second half, or include the flowing pay pile in the prediction.

### F2 [Medium] First clear (expansion) takes 3:00–3:05 even with the bot (target 2–3 min)
- **Steps**: no debug, touch only, the same bot as sprints 02/03 (hunts the nearest bear / brings raw meat / builds as soon as affordable / hires 3 carriers).
- **Actual**: q2 3:05, q3 3:00. Breakdown (q3): cashier 18 s → cannon Lv1 44 s → carrier 76 s → Lv2 114 s → hunter 128 s → Lv3 153 s → expansion 180 s. With the weak Lv1 cannon, collecting the 20 and 35 coins takes a long time.
- **Expected**: Conditions 1 and 9: first clear in 2–3 min. A human is slower than the bot, so this is likely to go over 3 min.

## Bugs (do not affect the verdict on their own)
### F3 [Medium] Walking across a second-half optional spot spends coins without you meaning to
- The optional spot (265,450) is inside the fence just left of the top gate, so routes towards the top gate cross it. In q3 the bot only passed by and **cannon Lv4 (90) was bought**. In the meat test, 13 coins went into "リュック→80" and it was left half-paid.
- The sprint 03 fix (step off once) only applies after a completion, not when you first walk onto a spot. Moving the spot off the path, or requiring a short stand before payment starts, would help.

### F4 [Low] The cooked-meat tower count overlaps the cannon spot label
- First half, before the cannon is built: the cooked-meat count on the pickup pad (e.g. "29") overlaps the cannon spot text "大砲 Lv1 20", so it reads as "29 大砲 Lv1" (out-tower.png).

### F5 [Low] The fence's outward bounce happens behind the clear screen
- The first clear screen appears at the same moment the expansion completes, so the 0.9 s fence bounce is mostly hidden under the dimmed overlay.

## Improvement suggestions
1. Paying 280 for the warehouse at about 22 coins/sec means standing for 11–13 s. Speeding up payment for large amounts would feel better.
2. When the cannon keeps killing bears, up to 120 meat piles up on the north snowfield (hard to see the bears).
3. The clock pauses while the clear screen is shown. That is fine for "total time", but say so explicitly.

## Regression (sprints 01–03 + phone)
| Item | Result |
|---|---|
| No pickups while fainted | stack 0, incoming 0 while down, drops 0 → 15, 0 carried after respawn 2.0 s later |
| Healing only inside the fence | Outside the gate 78 → 78; inside near the fire 93 → 100 |
| Top edge y=48 / PC title 400 px | PASS |
| Phone: scroll/zoom/selection/menu | scrollY 0, scale 1, no selection, long-press menu defaultPrevented |
| Sound | AudioContext suspended → running on the start tap, 14 sound calls in 4 s (the actual sound was not heard) |
| Sprint 02/03: hunter/carriers not stuck, Play again reset, debug-only | PASS |
| Arrow, damage numbers, coin bounce (sprint 03) | PASS |

## Could not evaluate
- A human playing by hand (all times are from the bot). Second "でかリュック" (→80). Real devices (sound, fps, iOS/Android gestures).

## Screenshots
`.product/sprints/04-second-half/screenshots/`:
- Fence: fence-S1-0, fence-S1-1, fence-S5-1, fence-S6-1
- Cannon: mont-cannon-levels (Lv1–5 compared), cannon-lv1, cannon-lv5
- Meat amounts: meat-back-full (30/50 "MAX"), meat-fire-towers, out-tower (F4), counter-tower
- Second half: mont-p2 (stove, 2nd counter, upgrade message), q2-clear1, q2-clear2, q3-clear1, q3-clear2, reset-after-clear2
- Arrow: arrow4-1 … arrow4-5. Numbers: mont-overlap

---

# Sprint 04 Evaluation (attempt 2): FAIL (only 1 condition remains: the literal reading of the "+X/sec" accuracy. Everything else passes)

Target: main.ts mtime 2026-10-19 21:21:15 (did not change during the evaluation). Measured 2026-10-20.

## Summary
| Criterion | Result | Threshold | Verdict |
|---|---|---|---|
| 1 Acceptance criteria (10) | 9/10. **Condition 3 ("+X/sec" within 20% of a 10 s wait) is still met only by the stage averages, not window by window** | 100% | FAIL |
| 2 Stability | 0 crashes, 0 console errors | 0 | PASS |
| 3 Data integrity | 30 meat → 30 served → +150 coins, exact match. Play again fully resets from both clear screens | 100% | PASS |
| 4 Regression | All PASS (fence, cannon tiers, large meat amounts, fps, phone conditions, etc.) | 100% | PASS |
| 5 Usability | 4 | 3 or higher | PASS |

**Clear times (no debug, touch only, the same bot as attempt 1):**
| Run | First clear | "Grow more" → second clear | Total |
|---|---|---|---|
| q4 | **2:31** | **2:33** | 5:03 |
| q5 | **2:35** | **2:40** | 5:15 |
Down from 3:00–3:05 in attempt 1 to about 2:30, inside 2–3 min. The second half is inside 2–4 min. With a human it would be a bit longer, but there is now margin before 3 min.

## Re-checking the fixes
### F1 "+X/sec": improved. 28/36 windows within 20%. Stage averages within 20% everywhere
Same procedure as attempt 1 (debug build, then for each stage 6 idle windows of 10 s, actual = increase of gainedTotal):
| Stage | Windows within 20% | Mean shown / actual | Off-by-more-than-20% windows (shown/actual) |
|---|---|---|---|
| Second-half start | 5/6 | 1.17 / 1.42 (-18%) | **First window 0.46 / 1.6** |
| After big stove | 4/6 | 2.16 / 2.32 (-7%) | 1.76/2.2, 1.85/2.5 |
| After 2nd counter | 6/6 | 1.74 / 1.60 (+9%) | — |
| After cashier upgrade | **2/6** | 2.85 / 3.57 (-20%) | 1.56/2.1, 2.06/2.6, 3.01/5.2, 4.47/6.2 (shown lags behind a rising income) |
| After 2nd hunter | 6/6 | 6.99 / 7.33 (-5%) | — |
| After all 5 (watching) | 5/6 | 7.27 / 7.32 (-1%) | 6.93/8.5 |
| **Ratio all/start** | | **5.16×** (≥3×) | |
- **Against the acceptance criterion**: read as "within 20% of a single 10 s wait", **8 of 36 windows (22%) are still out**, so it is not met as written. Read as the stage average or the trend, everything is within 20% (the cashier-upgrade stage sits right at -20%).
- **Would a human notice?** Mostly no. The differences are in the 0.x–1/sec range and hard to spot on the HUD. Two moments are noticeable: (1) **about the first 10 s after Grow more show "+0.5/sec" while coins come in at 1.6/sec**; (2) right after the cashier upgrade, coins visibly speed up while the display catches up a few seconds late. At 1–2/sec, one payment (5–10 coins) is 30–60% of a 10 s window, so a per-window ±20% is close to impossible by nature (I agree with the generator here).
- **For the user to decide**: whether to read the criterion as the stage average (then it is met) or per window (then it is not, and is hard to meet at low income). **I am not loosening the threshold on my own, so the verdict stays FAIL.** If the average reading is accepted, this sprint passes.

### F2 first clear: fixed (2:31 / 2:35)
Prices: cashier 12, cannon Lv1 20, carrier 10, Lv2 25, hunter 35, Lv3 35, expansion 55 (matches the spec). The cannon is still weak at Lv1.

### F3 walking past spots: much better, but crossing straight through a spot still pays a little
- **Normal routes: 0 accidental purchases** in both playthroughs (no cannon Lv4 at the end, as intended). The optional spot moved to (585,860), right side middle.
- **Intentional payment** is not slower: walking onto the cashier spot (12) and stopping → hired 0.76 s after stepping on.
- **However**, crossing a spot at full speed takes about 0.6 s, longer than the 0.4 s threshold, so a little is still paid.
  | Crossing | Coins spent |
  |---|---|
  | Cashier spot, horizontal | 5 (remaining 12 → 7) |
  | Cashier spot, vertical | 5 (7 → 2) |
  | Cannon Lv1 spot, on the way to the gate | 7 |
  | **Optional spot (cannon Lv4 90), horizontal** | **20** (double speed for large amounts) |
  | From the pay area straight to the top gate (clips the optional spot) | 6 |
  Coins are not lost (they stay in the spot's progress), but they are spent without intent. **Low** severity (see bug G1).

### F4 label overlap: fixed
The cooked-meat count "×29" is now to the right of the pad, clear of the cannon spot text (attempt2/out-tower).

### F5 clear screen timing: fixed
The clear screen appears **1.25 s** after the expansion. 0.5 s after completion, the widened fence and "拠点が拡張された！" are fully visible (attempt2/f5-expand-0.5s).

## Regression
| Item | Result |
|---|---|
| Fence expansion (S1: on fences/corners/gates, S5: 40 meat on all 4 fence lines, S6: real completion + 6 bears in the ring) | 0 buried, 0 bears inside, 0 meat on the fence. Player moves ±121–130 px in all 4 directions. NPCs keep working |
| Cannon tiers (idle 45 s) | Lv1 2 (3 shots per bear, player needed) → Lv2 5 → Lv3 12 → Lv4 21 → Lv5 46. Step by step |
| Large meat amounts | Controlled run: 30 → 30 served, coins exact. Counter tower "×22". Campfire takes 40 at once |
| fps (4x throttle, teammates working) | min 60 / avg 60.1 |
| Play again | Full reset from both clear screens (old fence, 0/7, coins 0, rate 0, 1 counter, fireCap 40, coinsPer 5) |
| Sprint 01–03 | No pickups while fainted (stack 0 while down, respawn 1.98 s) / healing only inside the fence (outside 78 → 78, inside 92 → 100) / PC title 400 px |
| Phone | After swipes, pinches, double-taps and long-presses: scrollY 0, scale 1, no selection, long-press menu prevented |

## Bugs
### G1 [Low] Crossing a build spot in a straight line at full speed still pays 5–20 coins
- **Steps**: `?debug=1` → +50 → walk horizontally across the cashier spot (505,885) by touch without stopping.
- **Expected**: The aim of F3, "walking past pays nothing".
- **Actual**: coins 50 → 45 (one crossing). Optional spot: 88 → 68.
- **Guess (separate)**: time on the spot accumulates while moving, and full-speed crossing takes about 0.6 s (> 0.4 s). Possible fixes: require the stick to be released / speed near zero, or raise the threshold.

## Could not evaluate
- A human playing by hand (all times are from the bot). Real devices (sound, fps, gestures).

## Screenshots (attempt 2)
`.product/sprints/04-second-half/screenshots/attempt2/`:
- Clear times: q4-clear1, q4-clear2, q5-clear1, q5-clear2
- F5: f5-expand-0.5s, f5-clear1 / F4: out-tower / counter-tower
- Fence: fence-S1-1, fence-S5-1, fence-S6-1 / cannon-lv1, cannon-lv5

---

# Sprint 04 Evaluation (attempt 3, light re-check): FAIL (only the catch-up of "+X/sec" right after the 2nd hunter remains)

Target: main.ts mtime 2026-10-20 15:32:34. Measured 2026-10-21. Judged against the revised spec.md criterion (stage averages within 20% + catch-up within about 5 s right after a change). **Note: this criterion change was approved by the orchestrator. I have not confirmed it with the user.**

## Summary
| Criterion | Result | Verdict |
|---|---|---|
| G1 (do not pay when crossing at full speed) | 3 straight crossings at full speed: 0 coins. Crossing the cashier/cannon spots on the way to the gate: 0 coins. Intentional: release on the spot → cashier (12) hired 1.06 s later | PASS |
| "+X/sec" stage averages within 20% | 12/12 stages (2 runs × 6 stages) within 20% (worst: after 2nd hunter, -19.9%). All/start 4.83× / 6.46× | PASS |
| "+X/sec" catches up within ~5 s after a change | **After 2nd hunter: not caught up in 2/2 runs.** Second-half start and big stove: not caught up in 1 of 2 runs | **FAIL** |
| Regression (clear times, fence, cannon tiers, phone) | All PASS | PASS |

**Clear time (no debug, touch only, same bot): first 2:34 / "Grow more" → second clear 3:01 / total 5:35** (q6). Accidental purchase of the optional spot: 0.

## "+X/sec" details (debug build, idle, actual = increase of gainedTotal)
Value shown 6 s after the change vs actual over the next 10 s, and the stage average:
| Stage | Run A: shown@+6s / next 10 s actual | A stage mean shown/actual | Run B: shown@+6s / next 10 s | B stage mean |
|---|---|---|---|---|
| Second-half start | 1.36 / 2.3 (-41%) | 1.54/1.55 (-1%) | 1.42 / 1.0 (+42%) | 1.25/1.37 (-9%) |
| After big stove | 1.29 / 1.7 (-24%) | 2.19/2.43 (-10%) | 2.90 / 3.1 (-7%) | 2.50/2.18 (+15%) |
| After 2nd counter | 3.27 / 3.3 (-1%) | 2.64/2.22 (+19%) | 1.49 / 1.2 (+24%) | 1.30/1.28 (+2%) |
| After cashier upgrade | 2.39 / 2.3 (+4%) | 2.43/2.47 (-2%) | 2.85 / 2.0 (+43%) | 2.55/2.42 (+5%) |
| **After 2nd hunter** | **2.70 / 3.6 (-25%)** | 4.58/5.37 (-15%) | **2.86 / 1.9 → then 2.66/5.1, 4.28/6.3** | **5.50/6.87 (-19.9%)** |
| After all 5 | 9.42 / 9.5 (-1%) | 8.49/7.48 (+13%) | 11.29 / 10.7 (+5%) | 9.84/8.83 (+11%) |
- Many of the off-by-more-than-20% catch-up values come from short spikes in actual income (pile flushes, etc.) and look like noise. **After the 2nd hunter is the exception**: the actual income ramps up over 40–60 s (A: 3.6 → 7.8/s, B: 1.9 → 11.3/s), and the display **stays 15–47% below the actual the whole time**. A human sees coins pouring in faster while the display reads "+4/秒" (it lags about 20–30 s).

## Reasons for failing
### H1 [Medium] "+X/sec" does not catch up with the rising income after the 2nd hunter is built
- **Steps**: `?debug=1&test=1` → buy everything in the first half → Grow more → stove → 2nd counter → cashier upgrade → **2nd hunter**, then idle, comparing the HUD with coin growth every 10 s.
- **Expected**: Revised condition 3: "right after a building completes, the display catches up with the new income within about 5 s".
- **Actual**: Run B windows (shown/actual): 2.86/1.9 → 2.66/5.1 → 4.28/6.3 → 6.51/8.0 → 7.47/8.6 → 9.24/11.3. Run A was also behind the whole time, 2.70/3.6 → 5.93/7.8.
- **Guess (separate)**: the "average since the stage change" keeps including the low income from just after the change, so it cannot follow a ramping income. A window over only the most recent part, or putting more weight on the prediction, might fix it.

## Regression (light)
| Item | Result |
|---|---|
| Clear times | First 2:34 / second half 3:01 (in target) |
| Fence expansion S1 (on fences, corners, gates) / S6 (real completion + 6 bears in the ring) | 0 buried, 0 bears inside, 0 meat on the fence, player moves in 4 directions |
| Cannon tiers (idle 45 s) | Lv1 3 → Lv2 6 → Lv3 10 → Lv4 18 → Lv5 49 |
| Phone | After swipes, pinches, double-taps and long-presses: scrollY 0, scale 1, no selection, long-press menu prevented |
| Console | 0 errors |

## Could not evaluate
- A human playing by hand, real devices.
