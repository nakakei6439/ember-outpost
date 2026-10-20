// Ember Outpost
import { sfx, unlockAudio, isMuted, setMuted } from './audio';

const W = 800;
const H = 1300;
const VIEW_W = 390;

const MAX_CARRY0 = 30;
let maxCarry = MAX_CARRY0;
const PLAYER_SPEED = 160;
const PLAYER_R = 14;
const BEAR_HP = 40;
const SHOOT_RANGE = 150;
const BULLET_SPEED = 620;
const BEAR_R = 24;
const ATTACK_DAMAGE = 10;
const ATTACK_INTERVAL = 0.45;
const ATTACK_RANGE = 64;
const PICKUP_RANGE = 92;
const COIN_RANGE = 70;
const BEAR_COUNT = 6;
const BEAR_RESPAWN = 3.5;
let COOK_TIME = 1.0;
const PLAYER_MAX_HP = 100;
const BEAR_DAMAGE = 22; // ~5 hits to go down
const BEAR_AGGRO = 190;
const BEAR_CHASE_SPEED = 75;
const BEAR_STRIKE_START = 56;
const BEAR_STRIKE_HIT = 68;
const BEAR_WINDUP = 0.5;
const BEAR_RECOVER = 1.3;
const INVULN = 0.6;
const HEAL_RANGE = 120;
const HEAL_PER_SEC = 14;
const DOWN_TIME = 2;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
const OLD_BASE: Rect = { x: 250, y: 470, w: 340, h: 520 };
const NEW_BASE: Rect = { x: 150, y: 380, w: 500, h: 760 };
const BASE_RECT: Rect = { ...OLD_BASE }; // the physical fence (bears keep out)
const baseVis: Rect = { ...OLD_BASE }; // the fence as drawn (animates outward on expansion)
let baseAnim = -1;
const FIRE = { x: 400, y: 540 };
const FENCE_T = 7;
const GATE_X0 = 365;
const GATE_X1 = 435;
let walls: Rect[] = [];
function rebuildWalls() {
  const R = BASE_RECT;
  const b = R.y + R.h;
  walls = [
    { x: R.x - FENCE_T, y: R.y - FENCE_T, w: GATE_X0 - R.x + FENCE_T, h: FENCE_T * 2 },
    { x: GATE_X1, y: R.y - FENCE_T, w: R.x + R.w - GATE_X1 + FENCE_T, h: FENCE_T * 2 },
    { x: R.x - FENCE_T, y: b - FENCE_T, w: GATE_X0 - R.x + FENCE_T, h: FENCE_T * 2 },
    { x: GATE_X1, y: b - FENCE_T, w: R.x + R.w - GATE_X1 + FENCE_T, h: FENCE_T * 2 },
    { x: R.x - FENCE_T, y: R.y - FENCE_T, w: FENCE_T * 2, h: R.h + FENCE_T * 2 },
    { x: R.x + R.w - FENCE_T, y: R.y - FENCE_T, w: FENCE_T * 2, h: R.h + FENCE_T * 2 },
  ];
}
rebuildWalls();
// the gate on the top (true) or bottom (false) side: just inside / just outside the fence line
const gateInner = (top: boolean) => ({ x: 400, y: top ? BASE_RECT.y + 35 : BASE_RECT.y + BASE_RECT.h - 35 });
const gateOuter = (top: boolean) => ({ x: 400, y: top ? BASE_RECT.y - 35 : BASE_RECT.y + BASE_RECT.h + 35 });
const gateTopFor = (y: number) => y < BASE_RECT.y + BASE_RECT.h / 2;
function pushOut(o: { x: number; y: number }, r: number) {
  for (const w of walls) {
    const cx = clamp(o.x, w.x, w.x + w.w);
    const cy = clamp(o.y, w.y, w.y + w.h);
    const dx = o.x - cx;
    const dy = o.y - cy;
    const d = Math.hypot(dx, dy);
    if (d < r) {
      if (d > 0.001) {
        o.x += (dx / d) * (r - d);
        o.y += (dy / d) * (r - d);
      } else {
        // centre is inside the wall: leave through the nearest side
        const dl = o.x - w.x;
        const dr = w.x + w.w - o.x;
        const dt = o.y - w.y;
        const db = w.y + w.h - o.y;
        const m = Math.min(dl, dr, dt, db);
        if (m === dl) o.x = w.x - r;
        else if (m === dr) o.x = w.x + w.w + r;
        else if (m === dt) o.y = w.y - r;
        else o.y = w.y + w.h + r;
      }
    }
  }
}
const COSTS = { cashier: 12, carrier: 10, hunter: 35, expand: 55, stove: 70, counter2: 120, cashierUp: 140, hunter2: 170, warehouse: 280, cannon: 20, cannon2: 25, cannon3: 35, cannon4: 90, cannon5: 140, pack1: 70, pack2: 110 };
type SpotKey = keyof typeof COSTS;
const CARRIER_COST2 = 30;
const SEQ2: SpotKey[] = ['stove', 'counter2', 'cashierUp', 'hunter2', 'warehouse'];
const OPT2: SpotKey[] = ['cannon4', 'pack1', 'cannon5', 'pack2'];
// level 1..5: fire interval (s), range, direct damage, splash radius, splash damage
const CANNON_LV = [
  { cd: 3.5, range: 170, dmg: 14, sr: 0, sd: 0 },
  { cd: 3.0, range: 220, dmg: 18, sr: 40, sd: 8 },
  { cd: 2.4, range: 280, dmg: 24, sr: 50, sd: 12 },
  { cd: 1.5, range: 380, dmg: 34, sr: 56, sd: 20 },
  { cd: 1.0, range: 440, dmg: 40, sr: 62, sd: 25 },
];
const isCannonKey = (k: SpotKey) => k === 'cannon' || k === 'cannon2' || k === 'cannon3' || k === 'cannon4' || k === 'cannon5';
const cannonKeyLv = (k: SpotKey) => (k === 'cannon' ? 1 : Number(k.slice(6)));
const CANNON_SPOT = { x: 505, y: 525 };
const CANNON_POS = { x: 505, y: 515 };
const P2_OPT_SPOT = { x: 585, y: 860 };
const SPOT_SIZE = 100;
const SPOT1 = { x: 505, y: 885 };
const SPOT2 = { x: 320, y: 895 };
const P2_CARRIER_SPOT = { x: 525, y: 1062 };
const P2_SEQ_SPOT = { x: 275, y: 1062 };
const CARRIER_CAP = 4;
const HUNTER_CAP = 3;
const IN_PAD: Rect = { x: 305, y: 575, w: 80, h: 70 };
const OUT_PAD: Rect = { x: 415, y: 575, w: 80, h: 70 };
const QUEUE_Y0 = 840;
const QUEUE_GAP = 44;
const FIRE_CAP0 = 40;
const FIRE_CAP2 = 80;
const WAREHOUSE = { x: 560, y: 440 };

interface Counter {
  pad: Rect;
  boxX: number;
  meatPos: { x: number; y: number };
  dropPos: { x: number; y: number };
  cashierPos: { x: number; y: number };
  qx: number;
  pay: { x: number; y: number };
  meat: number;
  pile: number;
  bump: number;
  born: number;
}
function makeCounter(i: number): Counter {
  if (i === 0) {
    return { pad: { x: 335, y: 710, w: 130, h: 60 }, boxX: 330, meatPos: { x: 400, y: 778 }, dropPos: { x: 445, y: 758 }, cashierPos: { x: 488, y: 774 }, qx: 400, pay: { x: 540, y: 740 }, meat: 0, pile: 0, bump: 0, born: -9 };
  }
  return { pad: { x: 170, y: 710, w: 130, h: 60 }, boxX: 165, meatPos: { x: 235, y: 778 }, dropPos: { x: 280, y: 758 }, cashierPos: { x: 323, y: 774 }, qx: 235, pay: { x: 208, y: 612 }, meat: 0, pile: 0, bump: 0, born: T };
}
let counters: Counter[] = [];
const totalPile = () => counters.reduce((a, c) => a + c.pile, 0);
const totalCounterMeat = () => counters.reduce((a, c) => a + c.meat, 0);

type Meat = 'raw' | 'cooked';

interface Bear {
  x: number;
  y: number;
  hp: number;
  tx: number;
  ty: number;
  wait: number;
  flash: number;
  mode: 'wander' | 'chase' | 'wind' | 'recover';
  t: number;
  fx: number;
  fy: number;
  lunge: number;
}
interface Npc {
  kind: 'cashier' | 'carrier' | 'hunter';
  x: number;
  y: number;
  vx: number;
  face: number;
  stack: Meat[];
  state: string;
  t: number;
  atk: number;
  idx: number;
  dest: number;
  tgtBear: Bear | null;
  up: boolean;
  moving: boolean;
  via: { x: number; y: number } | null;
  born: number;
  tgtDrop: Drop | null;
  skip: Map<Drop, number>;
  chkT: number;
  chkX: number;
  chkY: number;
  stuck: number;
  chkS: string;
}
interface Floater {
  x: number;
  y: number;
  text: string;
  t: number;
  color: string;
  size?: number;
  life?: number;
}
interface Part {
  x: number;
  y: number;
  vx: number;
  vy: number;
  t: number;
  max: number;
  color: string;
  size: number;
}
interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  color: string;
  w: number;
  h: number;
}
interface Drop {
  kind: Meat;
  x: number;
  y: number;
  sx: number;
  sy: number;
  t: number;
}
interface Fly {
  toPlayer?: boolean;
  kind: Meat | 'coin';
  x0: number;
  y0: number;
  t: number;
  dur: number;
  arc: number;
  to: () => { x: number; y: number };
  arrive: () => void;
  delay?: number;
}
interface Survivor {
  x: number;
  y: number;
  state: 'wait' | 'warm' | 'leave';
  incoming: boolean;
  phase: number;
  alpha: number;
  t: number;
  c: number;
  gate: boolean;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const inRect = (x: number, y: number, r: Rect, pad = 0) =>
  x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad;
const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

// ---------- DOM / canvas ----------
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const app = document.getElementById('app') as HTMLElement;
const coinsEl = document.getElementById('coins') as HTMLElement;
const coinBox = document.getElementById('coin-box') as HTMLElement;
const autoLabel = document.getElementById('auto-label') as HTMLElement;
const clearEl = document.getElementById('clear') as HTMLElement;
const clearTimeEl = document.getElementById('clear-time') as HTMLElement;
const retryMini = document.getElementById('retry-mini') as HTMLButtonElement;
const debugBtn = document.getElementById('debug-coins') as HTMLButtonElement;
const confettiCv = document.getElementById('confetti') as HTMLCanvasElement;
const confettiCtx = confettiCv.getContext('2d')!;
const plusEl = document.getElementById('plus') as HTMLElement;
const muteBtn = document.getElementById('mute') as HTMLButtonElement;
const rateEl = document.getElementById('rate') as HTMLElement;
const moreBtn = document.getElementById('more') as HTMLButtonElement;
const watchBtn = document.getElementById('watch') as HTMLButtonElement;
const clearTitleEl = document.getElementById('clear-title') as HTMLElement;
const clearMsgEl = document.getElementById('clear-msg') as HTMLElement;
const hintEl = document.getElementById('hint') as HTMLElement;
const titleEl = document.getElementById('title') as HTMLElement;
const startBtn = document.getElementById('start') as HTMLButtonElement;

let cw = VIEW_W;
let ch = 844;
let dpr = 1;
let scale = 1;
let viewH = 844;

function resize() {
  cw = canvas.clientWidth || VIEW_W;
  ch = canvas.clientHeight || 782;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(cw * dpr);
  canvas.height = Math.round(ch * dpr);
  scale = cw / VIEW_W;
  viewH = ch / scale;
  confettiCv.width = Math.round(app.clientWidth * dpr);
  confettiCv.height = Math.round(app.clientHeight * dpr);
}
window.addEventListener('resize', resize);
window.visualViewport?.addEventListener('resize', resize);
resize();

// ---------- game state ----------
let mode: 'title' | 'playing' = 'title';
let T = 0;

const player = {
  x: 400,
  y: 665,
  vx: 0,
  vy: 0,
  face: Math.PI / 2,
  atkCd: 0,
  swing: 0,
  swingAng: 0,
  coins: 0,
  stack: [] as Meat[],
  incoming: 0,
  bump: 0,
  inT: 0,
  outT: 0,
  serveT: 0,
  payT: 0,
  hp: PLAYER_MAX_HP,
  inv: 0,
  down: 0,
};
let shake = 0;
interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  ally?: boolean;
}
let bullets: Bullet[] = [];
let floaters: Floater[] = [];
let parts: Part[] = [];
let confetti: Confetti[] = [];
let confettiT = 0;
let zoomPulse = 0;
let counterBump = 0;
let fireBump = 0;
const spotPulse: Record<string, number> = {};
let needLeave = false;
let plusAcc = 0;
let plusTimer = 0;
const fire = { raw: 0, out: 0, progress: 0 };
let bears: Bear[] = [];
let respawns: number[] = [];
let drops: Drop[] = [];
let flies: Fly[] = [];
let survivors: Survivor[] = [];
let served = 0;
let phase = 1;
let p2step = 0;
let bigStove = false;
let fireCap = FIRE_CAP0;
let cashierDelay = 0.5;
let coinsPer = 5;
let warehouseBorn = -9;
let earnEvents: { t: number; v: number }[] = [];
let gainEvents: number[] = [];
let rateShown = 0;
let rateTimer = 0;
let firstClearTime = 0;
let optStep = 0;
let packLevel = 0;
let cannonKills = 0;
interface Shell {
  x0: number;
  y0: number;
  tx: number;
  ty: number;
  t: number;
  dur: number;
}
let shells: Shell[] = [];
const cannon = { built: false, lvl: 0, cd: 0, recoil: 0, aim: -Math.PI / 2, born: -9 };
let gameT0 = 0;
let expandT = -99;
let rateEpoch = -99;
let fireIn = 0;
let clearDelay = -1;
let clearFinal = false;
let clearAt = 0;
let spotStand = 0;
let cam = { x: 0, y: 0 };
let moved = false;
let npcs: Npc[] = [];
const hired = { cashier: false, carriers: 0, hunter: false, expanded: false };
const costLeft: Record<SpotKey, number> = { ...COSTS };
let elapsed = 0;
let cleared = false;
let clearTime = 0;
let inputLocked = false;
let autoT = 0;
let buildT = 0;

function newGame() {
  Object.assign(player, {
    x: 400,
    y: 665,
    vx: 0,
    vy: 0,
    face: Math.PI / 2,
    atkCd: 0,
    swing: 0,
    coins: 0,
    stack: [],
    incoming: 0,
    bump: 0,
    inT: 0,
    outT: 0,
    serveT: 0,
    payT: 0,
    hp: PLAYER_MAX_HP,
    inv: 0,
    down: 0,
  });
  shake = 0;
  floaters = [];
  parts = [];
  confetti = [];
  confettiT = 0;
  zoomPulse = 0;
  needLeave = false;
  bullets = [];
  setHp();
  Object.assign(fire, { raw: 0, out: 0, progress: 0 });
  bears = [];
  respawns = [];
  drops = [];
  flies = [];
  survivors = [];
  served = 0;
  phase = 1;
  p2step = 0;
  bigStove = false;
  fireCap = FIRE_CAP0;
  COOK_TIME = 1.0;
  cashierDelay = 0.5;
  coinsPer = 5;
  warehouseBorn = -9;
  earnEvents = [];
  gainEvents = [];
  rateShown = 0;
  rateTimer = 0;
  firstClearTime = 0;
  optStep = 0;
  packLevel = 0;
  maxCarry = MAX_CARRY0;
  cannonKills = 0;
  shells = [];
  Object.assign(cannon, { built: false, lvl: 0, cd: 0, recoil: 0, aim: -Math.PI / 2, born: -9 });
  gainedTotal = 0;
  gameT0 = T;
  expandT = -99;
  rateEpoch = -99;
  fireIn = 0;
  clearDelay = -1;
  spotStand = 0;
  baseAnim = -1;
  Object.assign(BASE_RECT, OLD_BASE);
  Object.assign(baseVis, OLD_BASE);
  rebuildWalls();
  counters = [makeCounter(0)];
  npcs = [];
  Object.assign(hired, { cashier: false, carriers: 0, hunter: false, expanded: false });
  Object.assign(costLeft, COSTS);
  elapsed = 0;
  cleared = false;
  clearTime = 0;
  inputLocked = false;
  autoT = 0;
  buildT = 0;
  setAutoLabel();
  for (let i = 0; i < BEAR_COUNT; i++) bears.push(makeBear(true));
  for (let i = 0; i < 4; i++) {
    survivors.push(makeSurvivor(i, 1, 0));
  }
  rateEl.textContent = '+0/秒';
  setCoinsText();
  snapCamera();
}

function makeSurvivor(slot: number, alpha: number, c: number, fromGate = false): Survivor {
  const bottom = BASE_RECT.y + BASE_RECT.h;
  return {
    x: fromGate ? 400 : counters[c].qx,
    y: fromGate ? bottom + 45 + slot * 40 : QUEUE_Y0 + slot * QUEUE_GAP,
    state: 'wait',
    incoming: false,
    phase: Math.random() * 6,
    alpha,
    t: 0,
    c,
    gate: fromGate,
  };
}

function makeBear(initial: boolean): Bear {
  let x = 100;
  let y = 100;
  for (let i = 0; i < 80; i++) {
    if (Math.random() < 0.9) {
      // mostly around the gate / cannon, where the cannon can reach them
      const a = rand(0, Math.PI * 2);
      const r = rand(150, 300);
      x = clamp(CANNON_POS.x + Math.cos(a) * r, 60, W - 60);
      y = clamp(CANNON_POS.y + Math.sin(a) * r, 60, H - 60);
    } else {
      x = rand(60, W - 60);
      y = rand(60, H - 60);
    }
    if (inRect(x, y, BASE_RECT, 50)) continue;
    const d = dist(x, y, player.x, player.y);
    if (initial ? d < 170 : d < 260) continue;
    // keep initial bears reasonably close to the base so the first fight is quick
    if (initial && d > 420) continue;
    break;
  }
  return { x, y, hp: BEAR_HP, tx: x, ty: y, wait: rand(0, 2), flash: 0, mode: 'wander', t: 0, fx: 0, fy: 1, lunge: 0 };
}

// ---------- input ----------
const stick = { active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0 };
const STICK_MAX = 52;
const keys = new Set<string>();

function localPos(e: PointerEvent) {
  const r = canvas.getBoundingClientRect();
  return { x: e.clientX - r.left, y: e.clientY - r.top };
}
canvas.addEventListener('pointerdown', (e) => {
  if (mode !== 'playing') return;
  e.preventDefault();
  if (stick.active || inputLocked) return;
  const p = localPos(e);
  stick.active = true;
  stick.id = e.pointerId;
  stick.ox = stick.x = p.x;
  stick.oy = stick.y = p.y;
  try {
    canvas.setPointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
});
canvas.addEventListener('pointermove', (e) => {
  if (!stick.active || e.pointerId !== stick.id) return;
  e.preventDefault();
  const p = localPos(e);
  stick.x = p.x;
  stick.y = p.y;
});
function endStick(e?: PointerEvent) {
  if (e && e.pointerId !== stick.id) return;
  stick.active = false;
  stick.id = -1;
}
canvas.addEventListener('pointerup', endStick);
canvas.addEventListener('pointercancel', endStick);
canvas.addEventListener('lostpointercapture', endStick);
window.addEventListener('blur', () => {
  keys.clear();
  endStick();
});

// Block scrolling / zoom / selection / context menu / pull-to-refresh.
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchend', (e) => e.preventDefault(), { passive: false });
for (const ev of ['gesturestart', 'gesturechange', 'gestureend', 'contextmenu', 'selectstart', 'dblclick', 'dragstart']) {
  document.addEventListener(ev, (e) => e.preventDefault());
}
document.addEventListener('wheel', (e) => e.preventDefault(), { passive: false });

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (mode === 'title' && (k === 'enter' || k === ' ')) {
    startGame();
    return;
  }
  keys.add(k);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function inputVector() {
  if (inputLocked) return { x: 0, y: 0 };
  if (stick.active) {
    const dx = stick.x - stick.ox;
    const dy = stick.y - stick.oy;
    const d = Math.hypot(dx, dy);
    if (d < 6) return { x: 0, y: 0 };
    const m = Math.min(1, d / (STICK_MAX * 0.8));
    return { x: (dx / d) * m, y: (dy / d) * m };
  }
  let x = 0;
  let y = 0;
  if (keys.has('a') || keys.has('arrowleft')) x -= 1;
  if (keys.has('d') || keys.has('arrowright')) x += 1;
  if (keys.has('w') || keys.has('arrowup')) y -= 1;
  if (keys.has('s') || keys.has('arrowdown')) y += 1;
  const d = Math.hypot(x, y);
  if (d > 0) return { x: x / d, y: y / d };
  return { x: 0, y: 0 };
}

function refreshMute() {
  muteBtn.textContent = isMuted() ? '🔇' : '🔊';
}
refreshMute();
muteBtn.addEventListener('click', () => {
  unlockAudio();
  setMuted(!isMuted());
  refreshMute();
});
for (const ev of ['pointerdown', 'touchend', 'click', 'keydown']) {
  document.addEventListener(ev, unlockAudio, { capture: true });
}

function fmtTime(t: number) {
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return m + ':' + String(sec).padStart(2, '0');
}
function setAutoLabel() {
  if (phase === 2) {
    autoLabel.textContent = '拠点完成 ' + p2step + '/5';
    return;
  }
  const n = (hired.cashier ? 1 : 0) + Math.min(3, cannon.lvl) + (hired.carriers >= 1 ? 1 : 0) + (hired.hunter ? 1 : 0) + (hired.expanded ? 1 : 0);
  autoLabel.textContent = '自動化 ' + n + '/7';
}
function maxCarriers() {
  return phase === 2 ? 5 : 3;
}
function carrierCost() {
  return phase === 2 ? CARRIER_COST2 : COSTS.carrier;
}
function showClear(final: boolean, at = elapsed) {
  cleared = true;
  clearTime = at;
  inputLocked = true;
  endStick();
  clearTitleEl.textContent = final ? '拠点完成！' : 'クリア！';
  clearMsgEl.textContent = final ? '大倉庫が完成！拠点が自分で回っている！' : '拠点が自分で回り始めた！';
  clearTimeEl.textContent = fmtTime(clearTime);
  moreBtn.style.display = final ? 'none' : '';
  document.getElementById('retry')!.classList.toggle('primary', final);
  watchBtn.style.display = final ? '' : 'none';
  clearEl.classList.add('on');
}
// income display: a short average of the coins earned from served survivors, plus - once the cash piles drain
// by themselves into the wallet - what the pile will pour in over the next 10 s. It follows changes quickly.
const RATE_WINDOW = 25;
function earn(v: number) {
  earnEvents.push({ t: T, v });
}
// after a state change (a building done, 'Grow more') the averages restart from that moment so they catch up quickly
function earnRate() {
  const now = T;
  while (earnEvents.length && now - earnEvents[0].t > RATE_WINDOW) earnEvents.shift();
  const start = Math.max(now - RATE_WINDOW, rateEpoch, gameT0);
  let sum = 0;
  for (const e of earnEvents) if (e.t >= start) sum += e.v;
  return sum / Math.max(5, now - start);
}
const drainRate = (p: number) => Math.max(0.7, p * 0.15);
function walletRate() {
  const W = 15;
  while (gainEvents.length && T - gainEvents[0] > W) gainEvents.shift();
  const start = Math.max(T - W, rateEpoch, gameT0);
  let n = 0;
  for (const t of gainEvents) if (t >= start) n++;
  return n / Math.max(5, T - start);
}
function currentRate() {
  const e = earnRate();
  if (!hired.expanded) return e;
  // run the pile forward 10 s: it gains e per second and drains at drainRate(pile) per second
  let p = totalPile();
  let gain = 0;
  for (let i = 0; i < 20; i++) {
    p += e * 0.5;
    const d = Math.min(p, drainRate(p) * 0.5);
    p -= d;
    gain += d;
  }
  // the wallet inflow of the last 12 s is smooth (the piles drain evenly); the forecast reacts to changes
  const w = 0.75 * clamp((T - expandT) / 15, 0, 1);
  return w * walletRate() + (1 - w) * (gain / 10);
}
function showRate() {
  if (T - rateEpoch < 5) return; // hold the last value for the first 5 s of the new stage, then show the fresh average
  const r = currentRate();
  rateShown = r;
  rateEl.textContent = '+' + (r < 10 ? r.toFixed(1) : String(Math.round(r))) + '/秒';
}
function restart() {
  newGame();
  clearEl.classList.remove('on');
  retryMini.classList.remove('on');
  moved = false;
  hintEl.classList.add('show');
  endStick();
}
document.getElementById('retry')!.addEventListener('click', restart);
retryMini.addEventListener('click', restart);
moreBtn.addEventListener('click', () => {
  rateEpoch = T;
  clearEl.classList.remove('on');
  phase = 2;
  cleared = false;
  inputLocked = false;
  needLeave = false;
  costLeft.carrier = hired.carriers >= maxCarriers() ? 0 : carrierCost();
  setAutoLabel();
});
watchBtn.addEventListener('click', () => {
  clearEl.classList.remove('on');
  retryMini.classList.add('on');
  inputLocked = false;
});
if (new URLSearchParams(location.search).has('debug')) {
  debugBtn.classList.add('on');
  debugBtn.addEventListener('click', () => {
    player.coins += 50;
    setCoinsText();
    bumpCoins();
  });
}

function startGame() {
  if (mode === 'playing') return;
  newGame();
  mode = 'playing';
  document.body.classList.add('playing');
  moved = false;
  hintEl.classList.add('show');
}
startBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  startGame();
});
titleEl.addEventListener('click', startGame);

// ---------- helpers ----------
function setCoinsText() {
  coinsEl.textContent = String(player.coins);
}
function showPlus(n: number) {
  plusAcc += n;
  plusEl.textContent = '+' + plusAcc;
  plusEl.classList.remove('pop');
  void plusEl.offsetWidth;
  plusEl.classList.add('pop');
  window.clearTimeout(plusTimer);
  plusTimer = window.setTimeout(() => (plusAcc = 0), 450);
}
let gainedTotal = 0;
function gainCoin(n = 1) {
  gainedTotal += n;
  gainEvents.push(T);
  player.coins += n;
  setCoinsText();
  bumpCoins();
  showPlus(n);
  sfx('coin');
}
function spawnBurst(x: number, y: number, color: string, n: number, speed = 90, size = 3) {
  for (let i = 0; i < n && parts.length < 160; i++) {
    const a = rand(0, Math.PI * 2);
    const v = rand(speed * 0.4, speed);
    parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.5, t: 0, max: rand(0.4, 0.8), color, size: size * rand(0.7, 1.3) });
  }
}
function addFloater(f: Floater) {
  if (floaters.length > 30) floaters.shift();
  // numbers that would land on top of a fresh one are pushed up / aside so each stays readable
  for (let tries = 0; tries < 4; tries++) {
    const hit = floaters.find((o) => o.t < 0.5 && Math.abs(o.x - f.x) < 56 && Math.abs(o.y - o.t * 40 - f.y) < 22);
    if (!hit) break;
    f.y -= 24;
    f.x += tries % 2 === 0 ? 18 : -18;
  }
  floaters.push(f);
}
function startConfetti() {
  const cols = ['#ff5a5f', '#ffd23f', '#3ddc97', '#4cc9f0', '#b388ff', '#ff9b4a'];
  confetti = [];
  const w = app.clientWidth;
  for (let i = 0; i < 130; i++) {
    confetti.push({ x: rand(0, w), y: rand(-300, -10), vx: rand(-40, 40), vy: rand(120, 260), rot: rand(0, 6), vr: rand(-8, 8), color: cols[i % cols.length], w: rand(6, 11), h: rand(4, 8) });
  }
  confettiT = 7;
}
function bumpCoins() {
  coinBox.classList.add('bump');
  setTimeout(() => coinBox.classList.remove('bump'), 120);
}
const hpFill = document.getElementById('hp-fill');
function setHp() {
  if (hpFill) hpFill.style.width = clamp((player.hp / PLAYER_MAX_HP) * 100, 0, 100) + '%';
}
function carryCount() {
  return player.stack.length + player.incoming;
}
function stackPos(i: number) {
  const col = Math.floor(i / 10);
  const row = i - col * 10;
  // columns fan out left/right of the back: 0, +11, -11, +22, -22 ...
  const off = col === 0 ? 0 : (col % 2 === 1 ? 1 : -1) * Math.ceil(col / 2) * 11;
  const sway = -player.vx * 0.015 * row;
  return { x: player.x + off + sway, y: player.y - 4 - row * 8 };
}
function stackTop() {
  return stackPos(player.stack.length);
}

function fly(
  kind: Fly['kind'],
  x0: number,
  y0: number,
  to: () => { x: number; y: number },
  dur: number,
  arrive: () => void,
  arc = 30,
  delay = 0,
) {
  flies.push({ kind, x0, y0, t: 0, dur, arc, to, arrive, delay });
}

function hudTarget() {
  // the cash display sits above the top edge of the playfield
  return { x: cam.x + VIEW_W - 70, y: cam.y - 26 };
}

function flyToPlayer(kind: Meat, x0: number, y0: number) {
  player.incoming++;
  const idxBefore = flies.length;
  fly(kind, x0, y0, stackTop, 0.24, () => {
    player.incoming--;
    player.stack.push(kind);
    player.bump = 1;
    sfx('meat');
  });
  flies[idxBefore].toPlayer = true;
}

// ---------- update ----------
function pickBearTarget(b: Bear) {
  for (let i = 0; i < 12; i++) {
    const a = rand(0, Math.PI * 2);
    const d = rand(50, 150);
    const x = clamp(b.x + Math.cos(a) * d, 50, W - 50);
    const y = clamp(b.y + Math.sin(a) * d, 50, H - 50);
    if (inRect(x, y, BASE_RECT, 30)) continue;
    // bears stay mostly where the cannon can reach them
    if (dist(x, y, CANNON_POS.x, CANNON_POS.y) > 320 && dist(b.x, b.y, CANNON_POS.x, CANNON_POS.y) < 340) continue;
    b.tx = x;
    b.ty = y;
    return;
  }
  b.tx = b.x;
  b.ty = b.y;
}

function update(dt: number) {
  if (!cleared) elapsed += dt;
  // --- movement
  const downed = player.down > 0;
  const v = downed ? { x: 0, y: 0 } : inputVector();
  if (v.x !== 0 || v.y !== 0) {
    if (!moved) {
      moved = true;
      hintEl.classList.remove('show');
    }
    player.face = Math.atan2(v.y, v.x);
  }
  const k = Math.min(1, dt * 14);
  player.vx += (v.x * PLAYER_SPEED - player.vx) * k;
  player.vy += (v.y * PLAYER_SPEED - player.vy) * k;
  player.x = clamp(player.x + player.vx * dt, PLAYER_R, W - PLAYER_R);
  player.y = clamp(player.y + player.vy * dt, 48, H - PLAYER_R);
  pushOut(player, 11);

  // --- bears
  for (const b of bears) {
    pushOut(b, 20);
    b.flash = Math.max(0, b.flash - dt);
    b.lunge = Math.max(0, b.lunge - dt);
    const pd = dist(b.x, b.y, player.x, player.y);
    if (!downed && pd > 0) {
      b.fx = (player.x - b.x) / pd;
      b.fy = (player.y - b.y) / pd;
    }
    if (downed && b.mode !== 'wander') {
      b.mode = 'wander';
      b.wait = rand(0.5, 1.5);
    }
    if (b.mode === 'wander') {
      if (!downed && pd < BEAR_AGGRO) {
        b.mode = 'chase';
      } else if (b.wait > 0) {
        b.wait -= dt;
        if (b.wait <= 0) pickBearTarget(b);
      } else {
        const d = dist(b.x, b.y, b.tx, b.ty);
        if (d < 4) b.wait = rand(1, 3);
        else {
          b.x += ((b.tx - b.x) / d) * 28 * dt;
          b.y += ((b.ty - b.y) / d) * 28 * dt;
        }
      }
    } else if (b.mode === 'chase') {
      if (pd > BEAR_AGGRO * 1.6) {
        b.mode = 'wander';
        b.wait = 0.3;
      } else if (pd < BEAR_STRIKE_START) {
        b.mode = 'wind';
        b.t = BEAR_WINDUP;
      } else {
        b.x += b.fx * BEAR_CHASE_SPEED * dt;
        b.y += b.fy * BEAR_CHASE_SPEED * dt;
      }
    } else if (b.mode === 'wind') {
      b.t -= dt;
      if (b.t <= 0) {
        b.lunge = 0.18;
        if (!downed && player.inv <= 0 && pd < BEAR_STRIKE_HIT) hurtPlayer(BEAR_DAMAGE);
        b.mode = 'recover';
        b.t = BEAR_RECOVER;
      }
    } else {
      b.t -= dt;
      if (b.t <= 0) b.mode = 'chase';
    }
  }
  for (let i = respawns.length - 1; i >= 0; i--) {
    respawns[i] -= dt;
    if (respawns[i] <= 0) {
      respawns.splice(i, 1);
      bears.push(makeBear(false));
    }
  }

  // --- auto shoot
  player.atkCd -= dt;
  player.swing = Math.max(0, player.swing - dt);
  let target: Bear | null = null;
  let best = SHOOT_RANGE;
  for (const b of bears) {
    const d = dist(b.x, b.y, player.x, player.y);
    if (d < best) {
      best = d;
      target = b;
    }
  }
  if (player.down <= 0 && target && player.atkCd <= 0) {
    player.atkCd = ATTACK_INTERVAL;
    player.swing = 0.12;
    const a = Math.atan2(target.y - (player.y - 4), target.x - player.x);
    player.face = a;
    sfx('shoot');
    bullets.push({
      x: player.x + Math.cos(a) * 20,
      y: player.y - 4 + Math.sin(a) * 20,
      vx: Math.cos(a) * BULLET_SPEED,
      vy: Math.sin(a) * BULLET_SPEED,
      life: 0.5,
    });
  }
  for (let i = bullets.length - 1; i >= 0; i--) {
    const bl = bullets[i];
    bl.x += bl.vx * dt;
    bl.y += bl.vy * dt;
    bl.life -= dt;
    let hit = false;
    for (const b of bears) {
      if (dist(bl.x, bl.y, b.x, b.y) < BEAR_R + 2) {
        hitBear(b, Math.atan2(bl.vy, bl.vx), bl.ally);
        hit = true;
        break;
      }
    }
    if (hit || bl.life <= 0) bullets.splice(i, 1);
  }

  // --- cannon: fires arcing shells at the nearest bear in range
  cannon.cd -= dt;
  cannon.recoil = Math.max(0, cannon.recoil - dt);
  if (cannon.built) {
    const L = CANNON_LV[Math.min(5, Math.max(1, cannon.lvl)) - 1];
    const range = L.range;
    let tb: Bear | null = null;
    let bd = range;
    for (const b of bears) {
      const d = dist(b.x, b.y, CANNON_POS.x, CANNON_POS.y);
      if (d < bd) {
        bd = d;
        tb = b;
      }
    }
    if (tb) cannon.aim = Math.atan2(tb.y - CANNON_POS.y, tb.x - CANNON_POS.x);
    if (tb && cannon.cd <= 0) {
      cannon.cd = L.cd;
      cannon.recoil = 0.3;
      const mx = CANNON_POS.x + Math.cos(cannon.aim) * 34;
      const my = CANNON_POS.y - 10 + Math.sin(cannon.aim) * 34;
      shells.push({ x0: mx, y0: my, tx: tb.x, ty: tb.y, t: 0, dur: clamp(bd / 520, 0.3, 0.8) });
      spawnBurst(mx, my, '#ffd27a', 8, 120, 4);
      spawnBurst(mx, my, '#9aa1ab', 6, 70, 5);
      sfx('boom');
    }
  }
  for (let i = shells.length - 1; i >= 0; i--) {
    const sh = shells[i];
    sh.t += dt / sh.dur;
    if (sh.t >= 1) {
      shells.splice(i, 1);
      spawnBurst(sh.tx, sh.ty, '#ff9b3a', 12, 170, 5);
      spawnBurst(sh.tx, sh.ty, '#ffe680', 8, 120, 4);
      spawnBurst(sh.tx, sh.ty, '#8a8f98', 8, 90, 6);
      sfx('boom');
      shake = Math.max(shake, 0.08);
      const L2 = CANNON_LV[Math.min(5, Math.max(1, cannon.lvl)) - 1];
      for (const b of bears.slice()) {
        const d = dist(b.x, b.y, sh.tx, sh.ty);
        if (d < 30) hitBear(b, Math.atan2(b.y - sh.ty, b.x - sh.tx), true, L2.dmg, true);
        else if (L2.sr > 0 && d < L2.sr) hitBear(b, Math.atan2(b.y - sh.ty, b.x - sh.tx), true, L2.sd, true);
      }
    }
  }

  // --- drops / pickup
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    d.t = Math.min(1, d.t + dt / 0.3);
    if (player.down <= 0 && d.t >= 1 && carryCount() < maxCarry && dist(d.x, d.y, player.x, player.y) < PICKUP_RANGE) {
      drops.splice(i, 1);
      flyToPlayer(d.kind, d.x, d.y);
    }
  }

  // --- pads
  const px = player.x;
  const py = player.y;
  if (player.down <= 0 && inRect(px, py, IN_PAD)) {
    player.inT -= dt;
    if (player.inT <= 0) {
      let idx = -1;
      for (let i = player.stack.length - 1; i >= 0; i--) {
        if (player.stack[i] === 'raw') {
          idx = i;
          break;
        }
      }
      if (idx >= 0 && fire.raw + fireIn < fireCap) {
        const from = stackPos(idx);
        player.stack.splice(idx, 1);
        fireIn++;
        fly('raw', from.x, from.y, () => ({ x: FIRE.x, y: FIRE.y }), 0.28, () => {
          fireIn--;
          fire.raw++;
          fireBump = 0.25;
        });
        player.inT = player.stack.length > 8 ? 0.05 : 0.15;
      }
    }
  } else player.inT = 0;

  if (player.down <= 0 && inRect(px, py, OUT_PAD)) {
    player.outT -= dt;
    if (player.outT <= 0 && fire.out > 0 && carryCount() < maxCarry) {
      fire.out--;
      const cx = OUT_PAD.x + OUT_PAD.w / 2;
      const cy = OUT_PAD.y + OUT_PAD.h / 2;
      flyToPlayer('cooked', cx, cy);
      player.outT = fire.out > 8 ? 0.05 : 0.12;
    }
  } else player.outT = 0;

  let onCounter = false;
  for (let ci = 0; ci < counters.length; ci++) {
    const c = counters[ci];
    if (player.down <= 0 && inRect(px, py, c.pad)) {
      onCounter = true;
      player.serveT -= dt;
      if (player.serveT <= 0) {
        let idx = -1;
        for (let i = player.stack.length - 1; i >= 0; i--) {
          if (player.stack[i] === 'cooked') {
            idx = i;
            break;
          }
        }
        if (idx >= 0) {
          if (hasCashier(ci)) {
            // with a cashier the hunter just puts meat on the counter
            const from = stackPos(idx);
            player.stack.splice(idx, 1);
            fly('cooked', from.x, from.y, () => c.meatPos, 0.25, () => {
              c.meat++;
              c.bump = 0.2;
            });
            player.serveT = player.stack.length > 8 ? 0.05 : 0.12;
          } else {
            const s = survivors.find((q) => q.c === ci && q.state === 'wait' && !q.incoming);
            if (s) {
              const from = stackPos(idx);
              player.stack.splice(idx, 1);
              s.incoming = true;
              fly('cooked', from.x, from.y, () => ({ x: s.x, y: s.y - 20 }), 0.3, () => warm(s));
              player.serveT = 0.25;
            }
          }
        }
      }
    }
  }
  if (!onCounter) player.serveT = 0;

  let paying = false;
  if (player.down <= 0) {
    for (const c of counters) {
      if (c.pile > 0 && dist(px, py, c.pay.x, c.pay.y) < COIN_RANGE) {
        paying = true;
        player.payT -= dt;
        if (player.payT <= 0) {
          c.pile--;
          fly('coin', c.pay.x + rand(-14, 14), c.pay.y - 6, () => ({ x: player.x, y: player.y - 8 }), 0.3, () => {
            gainCoin(1);
          }, 40);
          player.payT = 0.045;
        }
        break;
      }
    }
  }
  if (!paying) player.payT = 0;

  // --- construction spots
  let onSpot = false;
  if (needLeave && !activeSpots().some((q) => inRect(px, py, spotRect(q)))) needLeave = false;
  if (player.down <= 0 && !inputLocked && !needLeave) {
    for (const sp of activeSpots()) {
      if (isMaxSpot(sp)) continue;
      if (inRect(px, py, spotRect(sp))) {
        onSpot = true;
        // walking across a spot pays nothing: the player has to actually stop on it for a moment
        if (Math.hypot(player.vx, player.vy) > 30) spotStand = 0;
        else spotStand += dt;
        if (spotStand < 0.4) break;
        buildT -= dt;
        if (buildT <= 0 && player.coins > 0 && costLeft[sp.key] > 0) {
          player.coins--;
          costLeft[sp.key]--;
          setCoinsText();
          fly('coin', player.x, player.y - 8, () => ({ x: sp.x, y: sp.y }), 0.25, () => {
            spotPulse[sp.key] = 0.18;
            sfx('tick');
          }, 30);
          buildT = costLeft[sp.key] > 80 || COSTS[sp.key] > 100 ? 0.02 : 0.04;
          if (costLeft[sp.key] <= 0) completeSpot(sp.key);
        }
        break;
      }
    }
  }
  if (!onSpot) {
    buildT = 0;
    spotStand = 0;
  }

  // --- expansion: bills go straight into the wallet
  if (hired.expanded) {
    // the cash piles drain into the wallet at a speed that follows the pile size, which evens out the lumpy deliveries
    autoT -= dt;
    const tp = totalPile();
    if (autoT <= 0 && tp > 0) {
      let c = counters[0];
      for (const q of counters) if (q.pile > c.pile) c = q;
      c.pile--;
      fly('coin', c.pay.x + rand(-10, 10), c.pay.y - 6, hudTarget, 0.45, () => {
        gainCoin(1);
      }, 40);
      autoT = 1 / drainRate(tp);
    }
  }

  // --- the clear screen waits until the fence / warehouse pop has been seen
  if (clearDelay >= 0) {
    clearDelay -= dt;
    if (clearDelay < 0) showClear(clearFinal, clearAt);
  }
  // --- income meter / fence expansion animation
  rateTimer -= dt;
  if (rateTimer <= 0) {
    rateTimer = 0.5;
    showRate();
  }
  if (baseAnim >= 0) {
    baseAnim += dt;
    const k = Math.min(1, baseAnim / 0.9);
    const e = easeOutBack(k);
    baseVis.x = OLD_BASE.x + (NEW_BASE.x - OLD_BASE.x) * e;
    baseVis.y = OLD_BASE.y + (NEW_BASE.y - OLD_BASE.y) * e;
    baseVis.w = OLD_BASE.w + (NEW_BASE.w - OLD_BASE.w) * e;
    baseVis.h = OLD_BASE.h + (NEW_BASE.h - OLD_BASE.h) * e;
    if (k >= 1) {
      baseAnim = -1;
      Object.assign(baseVis, NEW_BASE);
    }
  }
  for (const c of counters) c.bump = Math.max(0, c.bump - dt);

  // --- helpers
  for (const n of npcs) {
    n.t -= dt;
    n.atk -= dt;
    if (n.kind === 'cashier') updateCashier(n);
    else if (n.kind === 'carrier') updateCarrier(n, dt);
    else updateHunter(n, dt);
    pushOut(n, 10);
    watchNpc(n, dt);
  }

  // --- cooking
  if (fire.raw > 0) {
    fire.progress += dt / COOK_TIME;
    if (fire.progress >= 1) {
      fire.progress -= 1;
      fire.raw--;
      fire.out++;
    }
  } else fire.progress = 0;

  // --- survivors
  const slots: number[] = counters.map(() => 0);
  const gin = gateInner(false);
  for (const s of survivors) {
    s.t += dt;
    const c = counters[s.c];
    if (s.state === 'wait') {
      if (s.gate) {
        // walk in through the bottom gate first
        const dy = gin.y - s.y;
        s.y += Math.sign(dy) * Math.min(Math.abs(dy), 110 * dt);
        s.x += (400 - s.x) * Math.min(1, dt * 6);
        if (Math.abs(dy) < 3) s.gate = false;
      } else {
        const ty = QUEUE_Y0 + slots[s.c] * QUEUE_GAP;
        const dy = ty - s.y;
        s.y += Math.sign(dy) * Math.min(Math.abs(dy), 110 * dt);
        if (s.y < 1000 || c.qx === 400) s.x += (c.qx - s.x) * Math.min(1, dt * 4);
      }
      s.alpha = 1;
      slots[s.c]++;
    } else if (s.state === 'warm') {
      if (s.t > 0.5) {
        s.state = 'leave';
        s.t = 0;
      }
    } else {
      s.y += 70 * dt;
      s.alpha = clamp(1 - (s.t - 0.7) / 0.7, 0, 1);
    }
  }
  survivors = survivors.filter((s) => !(s.state === 'leave' && s.t > 1.4));

  // --- flying objects
  for (let i = flies.length - 1; i >= 0; i--) {
    const f = flies[i];
    if (f.delay && f.delay > 0) {
      f.delay -= dt;
      continue;
    }
    f.t += dt / f.dur;
    if (f.t >= 1) {
      flies.splice(i, 1);
      f.arrive();
    }
  }

  player.bump = Math.max(0, player.bump - dt * 6);
  counterBump = Math.max(0, counterBump - dt);
  fireBump = Math.max(0, fireBump - dt);
  zoomPulse = Math.max(0, zoomPulse - dt);
  for (const k in spotPulse) spotPulse[k] = Math.max(0, spotPulse[k] - dt);
  for (let i = parts.length - 1; i >= 0; i--) {
    const q = parts[i];
    q.t += dt;
    q.vy += 260 * dt;
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    if (q.t > q.max) parts.splice(i, 1);
  }

  // --- player hp / invulnerability / healing / passing out
  player.inv = Math.max(0, player.inv - dt);
  shake = Math.max(0, shake - dt);
  for (let i = floaters.length - 1; i >= 0; i--) {
    floaters[i].t += dt;
    if (floaters[i].t > (floaters[i].life ?? 0.8)) floaters.splice(i, 1);
  }
  if (downed) {
    player.down -= dt;
    if (player.down <= 0) {
      player.down = 0;
      player.hp = PLAYER_MAX_HP;
      player.x = 400;
      player.y = 615;
      player.vx = player.vy = 0;
      player.inv = 1;
      snapCamera();
      setHp();
    }
  } else if (
    player.hp < PLAYER_MAX_HP &&
    inRect(player.x, player.y, BASE_RECT, -22) &&
    dist(player.x, player.y, FIRE.x, FIRE.y) < HEAL_RANGE
  ) {
    player.hp = Math.min(PLAYER_MAX_HP, player.hp + HEAL_PER_SEC * dt);
    setHp();
  }

  // --- camera
  const tx = clamp(player.x - VIEW_W / 2, 0, Math.max(0, W - VIEW_W));
  const ty = viewH >= H ? (H - viewH) / 2 : clamp(player.y - viewH / 2, 0, H - viewH);
  const ck = 1 - Math.exp(-10 * dt);
  cam.x += (tx - cam.x) * ck;
  cam.y += (ty - cam.y) * ck;
}

// Keep dropped meat out of the thin band along the fence, where it cannot be reached cleanly.
function settleDrop(x: number, y: number) {
  const M = 28;
  const outer = { x: BASE_RECT.x - M, y: BASE_RECT.y - M, w: BASE_RECT.w + 2 * M, h: BASE_RECT.h + 2 * M };
  const inner = { x: BASE_RECT.x + M, y: BASE_RECT.y + M, w: BASE_RECT.w - 2 * M, h: BASE_RECT.h - 2 * M };
  if (!inRect(x, y, outer) || inRect(x, y, inner) || Math.abs(x - 400) <= 36) return { x, y };
  const dOut = Math.min(x - outer.x, outer.x + outer.w - x, y - outer.y, outer.y + outer.h - y);
  const dIn = Math.min(x - inner.x, y - inner.y, inner.x + inner.w - x, inner.y + inner.h - y) * -1;
  if (dOut <= Math.abs(dIn)) {
    const l = x - outer.x;
    const r = outer.x + outer.w - x;
    const t = y - outer.y;
    const b = outer.y + outer.h - y;
    const m = Math.min(l, r, t, b);
    if (m === l) return { x: outer.x - 4, y };
    if (m === r) return { x: outer.x + outer.w + 4, y };
    if (m === t) return { x, y: outer.y - 4 };
    return { x, y: outer.y + outer.h + 4 };
  }
  const l = x - inner.x;
  const r = inner.x + inner.w - x;
  const t = y - inner.y;
  const b = inner.y + inner.h - y;
  const m = Math.min(l, r, t, b);
  if (m === l) return { x: inner.x + 4, y };
  if (m === r) return { x: inner.x + inner.w - 4, y };
  if (m === t) return { x, y: inner.y + 4 };
  return { x, y: inner.y + inner.h - 4 };
}

function hitBear(target: Bear, ka: number, ally = false, dmg = ATTACK_DAMAGE, byCannon = false) {
  target.hp -= dmg;
  target.flash = 0.14;
  addFloater({ x: target.x + rand(-8, 8), y: target.y - 38, text: '-' + dmg, t: 0, color: '#fff27a', size: dmg > 20 ? 26 : 20, life: 0.7 });
  spawnBurst(target.x, target.y, '#ffffff', 3, 70, 2.5);
  sfx('hit');
  if (target.mode === 'wander' && !ally) target.mode = 'chase';
  target.x = clamp(target.x + Math.cos(ka) * 4, 30, W - 30);
  target.y = clamp(target.y + Math.sin(ka) * 4, 30, H - 30);
  if (target.hp <= 0) {
    bears.splice(bears.indexOf(target), 1);
    if (byCannon) cannonKills++;
    respawns.push(BEAR_RESPAWN);
    spawnBurst(target.x, target.y, '#ffffff', 14, 150, 4);
    spawnBurst(target.x, target.y, '#bfe3ff', 8, 110, 3);
    sfx('kill');
    const pieces = Math.random() < 0.5 ? 2 : 3;
    for (let i = 0; i < pieces; i++) {
      const a = rand(0, Math.PI * 2);
      const d = rand(18, 42);
      const lp = settleDrop(clamp(target.x + Math.cos(a) * d, 20, W - 20), clamp(target.y + Math.sin(a) * d, 20, H - 20));
      drops.push({ sx: target.x, sy: target.y, x: lp.x, y: lp.y, t: 0, kind: 'raw' });
    }
    if (drops.length > 120) drops.splice(0, drops.length - 120);
  }
}

function hurtPlayer(dmg: number) {
  player.hp -= dmg;
  player.inv = INVULN;
  shake = 0.25;
  sfx('hurt');
  addFloater({ x: player.x, y: player.y - 40, text: '-' + dmg, t: 0, color: '#ff4b4b', size: 24 });
  if (player.hp <= 0) {
    player.hp = 0;
    player.down = DOWN_TIME;
    // drop everything on the back where we stand
    const n = player.stack.length;
    player.stack.forEach((kind, i) => {
      const a = (i / Math.max(1, n)) * Math.PI * 2;
      const d = 22 + (i % 3) * 8;
      const lp = settleDrop(clamp(player.x + Math.cos(a) * d, 20, W - 20), clamp(player.y + Math.sin(a) * d, 20, H - 20));
      drops.push({ kind, sx: player.x, sy: player.y - 10, x: lp.x, y: lp.y, t: 0 });
    });
    player.stack = [];
    // meat still flying to the hunter falls to the ground instead of being picked up
    for (let i = flies.length - 1; i >= 0; i--) {
      const f = flies[i];
      if (f.toPlayer && f.kind !== 'coin') {
        const lp = settleDrop(f.x0, f.y0);
        drops.push({ kind: f.kind, sx: f.x0, sy: f.y0, x: lp.x, y: lp.y, t: 0 });
        flies.splice(i, 1);
      }
    }
    player.incoming = 0;
    if (drops.length > 120) drops.splice(0, drops.length - 120);
  }
  setHp();
}

interface Spot {
  key: SpotKey;
  x: number;
  y: number;
}
function carrierSpotPos() {
  return phase === 2 ? P2_CARRIER_SPOT : SPOT1;
}
// the main chain of the first half; each step has to be built to move on
function p1Chain(): SpotKey | null {
  if (!hired.cashier) return 'cashier';
  if (cannon.lvl < 1) return 'cannon';
  if (hired.carriers < 1) return 'carrier';
  if (cannon.lvl < 2) return 'cannon2';
  if (!hired.hunter) return 'hunter';
  if (cannon.lvl < 3) return 'cannon3';
  if (!hired.expanded) return 'expand';
  return null;
}
function spotPosFor(key: SpotKey) {
  if (key === 'carrier') return carrierSpotPos();
  if (key === 'cashier') return SPOT1;
  if (isCannonKey(key)) return phase === 1 ? CANNON_SPOT : P2_OPT_SPOT;
  if (key === 'hunter' || key === 'expand') return SPOT2;
  if (key === 'pack1' || key === 'pack2') return P2_OPT_SPOT;
  return P2_SEQ_SPOT;
}
function activeSpots(): Spot[] {
  const out: Spot[] = [];
  if (phase === 1) {
    const main = p1Chain();
    if (main) out.push({ key: main, ...spotPosFor(main) });
    // extra carriers can be hired any time once the first cannon stands
    if (cannon.lvl >= 1 && main !== 'carrier') out.push({ key: 'carrier', ...SPOT1 });
  } else {
    out.push({ key: 'carrier', ...carrierSpotPos() });
    if (p2step < SEQ2.length) out.push({ key: SEQ2[p2step], ...P2_SEQ_SPOT });
    if (optStep < OPT2.length) out.push({ key: OPT2[optStep], ...P2_OPT_SPOT });
  }
  return out;
}
function isMaxSpot(sp: Spot) {
  return sp.key === 'carrier' && hired.carriers >= maxCarriers();
}
function spotRect(sp: Spot): Rect {
  return { x: sp.x - SPOT_SIZE / 2, y: sp.y - SPOT_SIZE / 2, w: SPOT_SIZE, h: SPOT_SIZE };
}
function makeNpc(kind: Npc['kind'], x: number, y: number, idx = 0): Npc {
  return { kind, x, y, vx: 0, face: Math.PI / 2, stack: [], state: 'idle', t: 0, atk: 0, idx, dest: 0, tgtBear: null, up: false, moving: false, via: null, born: T, tgtDrop: null, skip: new Map(), chkT: 0, chkX: x, chkY: y, stuck: 0, chkS: '' };
}
const hasCashier = (ci: number) => npcs.some((n) => n.kind === 'cashier' && n.idx === ci);

// The fence jumps outward. Anything standing where the new fence runs is moved clear first, and bears that
// end up inside are put back outside, so nothing can be buried in or locked behind the fence.
function startExpansion() {
  Object.assign(BASE_RECT, NEW_BASE);
  rebuildWalls();
  baseAnim = 0;
  expandT = T;
  const R = BASE_RECT;
  for (const b of bears) {
    if (!inRect(b.x, b.y, R, 30)) continue;
    const left = b.x - R.x;
    const right = R.x + R.w - b.x;
    const top = b.y - R.y;
    const bottom = R.y + R.h - b.y;
    const m = Math.min(left, right, top, bottom);
    const out = 70;
    if (m === left) b.x = R.x - out;
    else if (m === right) b.x = R.x + R.w + out;
    else if (m === top) b.y = R.y - out;
    else b.y = R.y + R.h + out;
    b.x = clamp(b.x, 40, W - 40);
    b.y = clamp(b.y, 40, H - 40);
    b.mode = 'wander';
    b.wait = rand(1, 2);
    b.tx = b.x;
    b.ty = b.y;
    spawnBurst(b.x, b.y, '#ffffff', 10, 100, 3);
  }
  pushOut(player, 11);
  for (const n of npcs) {
    n.via = null;
    n.tgtDrop = null;
    pushOut(n, 10);
  }
  for (const d of drops) {
    const lp = settleDrop(d.x, d.y);
    d.x = lp.x;
    d.y = lp.y;
    d.sx = lp.x;
    d.sy = lp.y;
  }
  for (const f of floaters) if (f.life && f.life > 1) f.t = Math.max(f.t, 0);
}

function completeSpot(key: SpotKey) {
  rateEpoch = T;
  const sp = spotPosFor(key);
  let msg = '';
  let big = false;
  if (key === 'cashier') {
    hired.cashier = true;
    npcs.push(makeNpc('cashier', counters[0].cashierPos.x, counters[0].cashierPos.y, 0));
    msg = 'レジ係が来た！';
  } else if (isCannonKey(key)) {
    cannon.built = true;
    cannon.lvl = cannonKeyLv(key);
    cannon.born = T;
    msg = key === 'cannon' ? '大砲が完成！' : '大砲 Lv' + cannon.lvl + '！';
    spawnBurst(CANNON_POS.x, CANNON_POS.y, '#ffd23f', 14, 120, 4);
    if (phase === 2) {
      optStep++;
      needLeave = true;
    }
  } else if (key === 'pack1' || key === 'pack2') {
    optStep++;
    needLeave = true;
    {
      packLevel++;
      maxCarry = packLevel === 1 ? 50 : 80;
      msg = 'リュック拡大！ 最大' + maxCarry + '個';
    }
  } else if (key === 'carrier') {
    hired.carriers++;
    npcs.push(makeNpc('carrier', sp.x, sp.y, hired.carriers - 1));
    costLeft.carrier = hired.carriers >= maxCarriers() ? 0 : carrierCost();
    msg = '運搬係が来た！';
  } else if (key === 'hunter') {
    hired.hunter = true;
    npcs.push(makeNpc('hunter', sp.x, sp.y, 0));
    msg = '狩り仲間が来た！';
  } else if (key === 'expand') {
    hired.expanded = true;
    msg = '拠点が拡張された！';
    startExpansion();
    big = true;
    clearDelay = 1.3;
    clearFinal = false;
    clearAt = elapsed;
    firstClearTime = elapsed;
  } else {
    p2step++;
    needLeave = true;
    if (key === 'stove') {
      bigStove = true;
      COOK_TIME = 0.4;
      fireCap = FIRE_CAP2;
      msg = '大かまど完成！';
      fireBump = 0.6;
      spawnBurst(FIRE.x, FIRE.y, '#ffb22e', 20, 140, 4);
    } else if (key === 'counter2') {
      const c = makeCounter(1);
      counters.push(c);
      npcs.push(makeNpc('cashier', c.cashierPos.x, c.cashierPos.y, 1));
      for (let i = 0; i < 4; i++) survivors.push(makeSurvivor(i, 1, 1, true));
      msg = '2台目のカウンター完成！';
    } else if (key === 'cashierUp') {
      cashierDelay = 0.22;
      coinsPer = 10;
      for (const n of npcs) if (n.kind === 'cashier') n.up = true;
      msg = 'レジ係が強化された！ +' + coinsPer;
    } else if (key === 'hunter2') {
      npcs.push(makeNpc('hunter', sp.x, sp.y, 1));
      msg = '2人目の狩り仲間が来た！';
    } else {
      warehouseBorn = T;
      msg = '大倉庫が完成！';
      big = true;
      clearDelay = 1.3;
      clearFinal = true;
      clearAt = elapsed;
    }
  }
  const fx = key === 'stove' ? FIRE : key === 'warehouse' ? WAREHOUSE : sp;
  addFloater({ x: sp.x, y: sp.y - 40, text: msg, t: 0, color: '#ffd23f', size: 24, life: 1.5 });
  spawnBurst(fx.x, fx.y, '#ffe680', 18, 130, 3.5);
  spawnBurst(fx.x, fx.y, '#ffffff', 8, 100, 2.5);
  if (big) {
    zoomPulse = 0.6;
    startConfetti();
    sfx('clear');
  } else sfx('hire');
  setAutoLabel();
}

// Walks toward (tx,ty), going through the gate when crossing the fence. Returns the distance left.
function navStep(n: Npc, tx: number, ty: number, speed: number, dt: number) {
  let wx = tx;
  let wy = ty;
  const inN = inRect(n.x, n.y, BASE_RECT);
  const inT = inRect(tx, ty, BASE_RECT);
  if (n.via) {
    wx = n.via.x;
    wy = n.via.y;
    if (dist(n.x, n.y, wx, wy) < 14) n.via = null;
  } else if (inN !== inT) {
    const top = gateTopFor(inN ? ty : n.y);
    const inner = gateInner(top);
    const outer = gateOuter(top);
    const aligned = Math.abs(n.x - 400) <= 25;
    if (inN) {
      const passed = top ? n.y <= BASE_RECT.y + 50 : n.y >= BASE_RECT.y + BASE_RECT.h - 50;
      if (passed && aligned) {
        n.via = outer;
        wx = outer.x;
        wy = outer.y;
      } else {
        wx = inner.x;
        wy = inner.y;
      }
    } else if (!aligned) {
      wx = outer.x;
      wy = outer.y;
    } else {
      n.via = inner;
      wx = inner.x;
      wy = inner.y;
    }
  }
  if (!inN && !n.via) {
    // outside the fence: walk around the corners instead of pushing into the wall
    const R = { x: BASE_RECT.x - 20, y: BASE_RECT.y - 20, w: BASE_RECT.w + 40, h: BASE_RECT.h + 40 };
    const blocked = (ax: number, ay: number, bx: number, by: number) => {
      for (let i = 1; i < 12; i++) {
        const t = i / 12;
        const qx = ax + (bx - ax) * t;
        const qy = ay + (by - ay) * t;
        if (dist(qx, qy, tx, ty) < 40) continue;
        if (inRect(qx, qy, R) && Math.abs(qx - 400) > 32) return true;
      }
      return false;
    };
    if (blocked(n.x, n.y, wx, wy)) {
      const cs = [
        { x: BASE_RECT.x - 36, y: BASE_RECT.y - 36 },
        { x: BASE_RECT.x + BASE_RECT.w + 36, y: BASE_RECT.y - 36 },
        { x: BASE_RECT.x - 36, y: BASE_RECT.y + BASE_RECT.h + 36 },
        { x: BASE_RECT.x + BASE_RECT.w + 36, y: BASE_RECT.y + BASE_RECT.h + 36 },
      ];
      let best = cs[0];
      let bs = 1e9;
      for (const c of cs) {
        if (dist(n.x, n.y, c.x, c.y) < 12 || blocked(n.x, n.y, c.x, c.y)) continue;
        const sc = dist(n.x, n.y, c.x, c.y) + dist(c.x, c.y, wx, wy);
        if (sc < bs) {
          bs = sc;
          best = c;
        }
      }
      n.via = best;
      wx = best.x;
      wy = best.y;
    }
  }
  const d = dist(n.x, n.y, wx, wy);
  n.moving = d > 3;
  if (d > 3) {
    const st = Math.min(d, speed * dt);
    n.vx = ((wx - n.x) / d) * speed;
    n.x += ((wx - n.x) / d) * st;
    n.y += ((wy - n.y) / d) * st;
    n.face = Math.atan2(wy - n.y, wx - n.x);
  }
  return dist(n.x, n.y, tx, ty);
}

// Anyone who is trying to move but makes no progress for 3 s gives up the current goal.
function watchNpc(n: Npc, dt: number) {
  n.chkT += dt;
  if (n.chkT < 3) return;
  n.chkT = 0;
  const moved = dist(n.x, n.y, n.chkX, n.chkY);
  n.chkX = n.x;
  n.chkY = n.y;
  const sameState = n.chkS === n.state;
  n.chkS = n.state;
  const trying = n.kind === 'hunter' ? n.moving || n.tgtDrop !== null : n.kind === 'carrier' && n.state !== 'idle' && sameState;
  if (!trying || moved >= 14) {
    n.stuck = 0;
    return;
  }
  n.stuck++;
  n.via = null;
  if (n.tgtDrop) {
    n.skip.set(n.tgtDrop, elapsed + 30);
    n.tgtDrop = null;
  }
  if (n.kind === 'carrier') n.state = 'idle';
  if (n.kind === 'hunter' && n.stuck >= 2) {
    // still stuck: head back through the nearest gate
    const tp = gateTopFor(n.y);
    n.via = inRect(n.x, n.y, BASE_RECT) ? gateInner(tp) : gateOuter(tp);
  }
}

function updateCashier(n: Npc) {
  const c = counters[n.idx];
  if (c && c.meat > 0 && n.t <= 0) {
    const s = survivors.find((q) => q.c === n.idx && q.state === 'wait' && !q.incoming && !q.gate);
    if (s) {
      c.meat--;
      s.incoming = true;
      fly('cooked', c.meatPos.x, c.meatPos.y - 10, () => ({ x: s.x, y: s.y - 20 }), 0.3, () => warm(s));
      n.t = cashierDelay;
    }
  }
}

function carrierIdlePos(idx: number) {
  return idx < 3 ? { x: 505 + idx * 28, y: 650 } : { x: 505 + (idx - 3) * 28, y: 682 };
}
function pickCounter(from: { x: number; y: number }) {
  let best = 0;
  let bs = 1e9;
  counters.forEach((c, i) => {
    const sc = c.meat * 30 + dist(from.x, from.y, c.dropPos.x, c.dropPos.y) * 0.05;
    if (sc < bs) {
      bs = sc;
      best = i;
    }
  });
  return best;
}

function updateCarrier(n: Npc, dt: number) {
  const SPEED = 105;
  const padC = { x: OUT_PAD.x + OUT_PAD.w / 2, y: OUT_PAD.y + OUT_PAD.h / 2 };
  if (n.state === 'idle') {
    const ip = carrierIdlePos(n.idx);
    navStep(n, ip.x, ip.y, SPEED, dt);
    // a carrier already on its way reserves one piece (reservations expire so a stuck one cannot block the rest)
    const heading = npcs.filter((q) => q.kind === 'carrier' && q.state === 'toPad' && q.t > 0).length;
    if (fire.out > heading) {
      n.state = 'toPad';
      n.t = 6;
    }
  } else if (n.state === 'toPad') {
    if (n.t <= 0) n.state = 'idle';
    else if (navStep(n, padC.x, padC.y, SPEED, dt) < 12) {
      const take = Math.min(fire.out, CARRIER_CAP);
      fire.out -= take;
      for (let i = 0; i < take; i++) n.stack.push('cooked');
      n.dest = pickCounter(n);
      n.state = take > 0 ? 'toCounter' : 'idle';
    }
  } else {
    const c = counters[Math.min(n.dest, counters.length - 1)];
    if (navStep(n, c.dropPos.x, c.dropPos.y, SPEED, dt) < 12) {
      for (let i = 0; i < n.stack.length; i++) {
        fly('cooked', n.x, n.y - 14 - i * 6, () => c.meatPos, 0.25, () => {
          c.meat++;
          c.bump = 0.2;
        });
      }
      n.stack = [];
      n.state = 'idle';
    }
  }
}

function updateHunter(n: Npc, dt: number) {
  const SPEED = 130;
  const inC = { x: IN_PAD.x + IN_PAD.w / 2, y: IN_PAD.y + IN_PAD.h / 2 };
  const mates = npcs.filter((q) => q.kind === 'hunter' && q !== n);
  if (n.tgtDrop && !drops.includes(n.tgtDrop)) n.tgtDrop = null;
  if (n.tgtDrop && mates.some((q) => q.tgtDrop === n.tgtDrop) && n.idx > 0) n.tgtDrop = null;
  if (!n.tgtDrop) {
    let bd = 1e9;
    for (const d of drops) {
      if (d.kind !== 'raw' || d.t < 1) continue;
      if ((n.skip.get(d) ?? 0) > elapsed) continue;
      if (mates.some((q) => q.tgtDrop === d)) continue;
      const dd = dist(d.x, d.y, n.x, n.y);
      if (dd < bd) {
        bd = dd;
        n.tgtDrop = d;
      }
    }
  }
  const full = n.stack.length >= HUNTER_CAP;
  if (n.state === 'deliver' || full || (n.stack.length > 0 && !n.tgtDrop && n.state !== 'hunt')) {
    n.state = 'deliver';
    navStep(n, inC.x, inC.y, SPEED, dt);
    if (inRect(n.x, n.y, IN_PAD) && n.stack.length > 0 && n.t <= 0 && fire.raw + fireIn < fireCap) {
      n.stack.pop();
      fireIn++;
      fly('raw', n.x, n.y - 14, () => ({ x: FIRE.x, y: FIRE.y }), 0.28, () => {
        fireIn--;
        fire.raw++;
        fireBump = 0.25;
      });
      n.t = 0.15;
    }
    if (n.stack.length === 0) n.state = 'hunt';
    return;
  }
  n.state = 'hunt';
  if (n.tgtDrop) {
    const d = n.tgtDrop;
    if (navStep(n, d.x, d.y, SPEED, dt) < 20) {
      drops.splice(drops.indexOf(d), 1);
      n.tgtDrop = null;
      n.stack.push('raw');
    }
    return;
  }
  // each hunter keeps its own bear: nearest one that nobody else is already after
  if (n.tgtBear && (!bears.includes(n.tgtBear) || mates.some((q) => q.tgtBear === n.tgtBear))) n.tgtBear = null;
  if (!n.tgtBear) {
    let bd = 1e9;
    let fallback: Bear | null = null;
    let fd = 1e9;
    for (const b of bears) {
      const d = dist(b.x, b.y, n.x, n.y);
      if (d < fd) {
        fd = d;
        fallback = b;
      }
      if (mates.some((q) => q.tgtBear === b)) continue;
      if (d < bd) {
        bd = d;
        n.tgtBear = b;
      }
    }
    if (!n.tgtBear) n.tgtBear = fallback;
  }
  const b = n.tgtBear;
  if (!b) return;
  const d = dist(b.x, b.y, n.x, n.y);
  if (d > 105) navStep(n, b.x, b.y, SPEED, dt);
  else n.moving = false;
  if (d <= 130 && n.atk <= 0) {
    n.atk = 0.4;
    sfx('shoot');
    const a = Math.atan2(b.y - (n.y - 4), b.x - n.x);
    n.face = a;
    bullets.push({ x: n.x + Math.cos(a) * 20, y: n.y - 4 + Math.sin(a) * 20, vx: Math.cos(a) * BULLET_SPEED, vy: Math.sin(a) * BULLET_SPEED, life: 0.5, ally: true });
  }
}

function snapCamera() {
  cam.x = clamp(player.x - VIEW_W / 2, 0, Math.max(0, W - VIEW_W));
  cam.y = viewH >= H ? (H - viewH) / 2 : clamp(player.y - viewH / 2, 0, H - viewH);
}

function warm(s: Survivor) {
  s.state = 'warm';
  s.t = 0;
  served++;
  const c = counters[s.c];
  for (let i = 0; i < coinsPer; i++) {
    fly('coin', s.x, s.y - 20, () => ({ x: c.pay.x + rand(-6, 6), y: c.pay.y - 4 }), 0.4, () => {
      c.pile++;
      earn(1);
    }, 40, i * 0.05);
  }
  const n = survivors.filter((q) => q.c === s.c && q.state === 'wait').length;
  survivors.push(makeSurvivor(n, 1, s.c, true));
}

// ---------- decorations ----------
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
interface Deco {
  x: number;
  y: number;
  s: number;
  kind: 'pine' | 'bump' | 'rock';
}
const decos: Deco[] = (() => {
  const r = seeded(7);
  const out: Deco[] = [];
  let guard = 0;
  while (out.length < 90 && guard++ < 1000) {
    const x = r() * W;
    const y = r() * H;
    if (inRect(x, y, NEW_BASE, 40)) continue;
    const k = r();
    out.push({ x, y, s: 0.7 + r() * 0.8, kind: k < 0.3 ? 'pine' : k < 0.85 ? 'bump' : 'rock' });
  }
  out.sort((a, b) => a.y - b.y);
  return out;
})();

const flakes = Array.from({ length: 50 }, () => ({
  x: Math.random() * VIEW_W,
  y: Math.random() * 900,
  r: 1 + Math.random() * 2,
  v: 30 + Math.random() * 50,
}));

// ---------- drawing ----------
function rr(x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(text: string, x: number, y: number, size = 14, color = '#fff', stroke = '#1d2c3f') {
  ctx.font = `800 ${size}px -apple-system, "Hiragino Sans", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.lineWidth = 4;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function drawMeat(x: number, y: number, kind: Meat, s = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  const raw = kind === 'raw';
  ctx.lineWidth = 1.6;
  ctx.strokeStyle = raw ? '#8f1d2c' : '#4a230d';
  ctx.fillStyle = raw ? '#d62f44' : '#7a3f1c';
  rr(-12, -2, 24, 7, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = raw ? '#ff6a7c' : '#b8733a';
  rr(-12, -6, 24, 7, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = raw ? '#ffd0d6' : '#e6b27a';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-6, -2.5);
  ctx.lineTo(5, -2.5);
  ctx.stroke();
  ctx.restore();
}

function drawCoin(x: number, y: number, r = 6) {
  // green cash bundle
  const w = r * 2.4;
  const h = r * 1.5;
  ctx.fillStyle = '#2f9e4f';
  ctx.strokeStyle = '#17582b';
  ctx.lineWidth = 1.6;
  rr(x - w / 2, y - h / 2, w, h, 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#8fe0a2';
  ctx.fillRect(x - w * 0.12, y - h / 2 + 1, w * 0.24, h - 2);
  ctx.fillStyle = '#d7f7de';
  ctx.beginPath();
  ctx.arc(x, y, h * 0.2, 0, Math.PI * 2);
  ctx.fill();
}

function drawPine(d: Deco) {
  const s = d.s;
  ctx.fillStyle = '#5b3f2a';
  ctx.fillRect(d.x - 3 * s, d.y - 4 * s, 6 * s, 10 * s);
  for (let i = 0; i < 3; i++) {
    const w = (22 - i * 4) * s;
    const yy = d.y - 4 * s - i * 14 * s;
    ctx.fillStyle = '#2f6b57';
    ctx.beginPath();
    ctx.moveTo(d.x, yy - 20 * s);
    ctx.lineTo(d.x + w, yy);
    ctx.lineTo(d.x - w, yy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#eef5fa';
    ctx.beginPath();
    ctx.moveTo(d.x, yy - 20 * s);
    ctx.lineTo(d.x + w * 0.55, yy - 8 * s);
    ctx.lineTo(d.x - w * 0.55, yy - 8 * s);
    ctx.closePath();
    ctx.fill();
  }
}

function wallLine(x0: number, y0: number, x1: number, y1: number) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(len / 16));
  ctx.strokeStyle = '#8c6439';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(x0, y0 - 6);
  ctx.lineTo(x1, y1 - 6);
  ctx.stroke();
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    ctx.fillStyle = '#c4935a';
    ctx.strokeStyle = '#6b4724';
    ctx.lineWidth = 1.8;
    rr(x - 4, y - 18, 8, 22, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#e3b883';
    ctx.fillRect(x - 2.5, y - 16, 2.5, 18);
  }
}
function gatePost(x: number, y: number) {
  ctx.fillStyle = '#a8763f';
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  rr(x - 7, y - 40, 14, 48, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e3b883';
  ctx.fillRect(x - 4, y - 38, 3, 44);
}
function drawFenceTop() {
  const R = baseVis;
  wallLine(R.x, R.y, GATE_X0, R.y);
  wallLine(GATE_X1, R.y, R.x + R.w, R.y);
  wallLine(R.x, R.y, R.x, R.y + R.h);
  wallLine(R.x + R.w, R.y, R.x + R.w, R.y + R.h);
  gatePost(GATE_X0, R.y);
  gatePost(GATE_X1, R.y);
  ctx.fillStyle = '#a8763f';
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  rr(GATE_X0 - 7, R.y - 50, GATE_X1 - GATE_X0 + 14, 12, 3);
  ctx.fill();
  ctx.stroke();
}
function drawFenceBottom() {
  const R = baseVis;
  const y = R.y + R.h;
  wallLine(R.x, y, GATE_X0, y);
  wallLine(GATE_X1, y, R.x + R.w, y);
  gatePost(GATE_X0, y);
  gatePost(GATE_X1, y);
}

const dirtBlots = (() => {
  const r = seeded(99);
  return Array.from({ length: 70 }, () => ({ u: r(), v: r(), a: 8 + r() * 14, b: 3 + r() * 5 }));
})();
function drawGround() {
  ctx.fillStyle = '#9db7cc';
  ctx.fillRect(cam.x - 50, cam.y - 50, VIEW_W + 100, viewH + 100);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#f6fafd');
  g.addColorStop(1, '#e6f0f7');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.lineWidth = 8;
  ctx.strokeStyle = '#6f8aa3';
  ctx.strokeRect(0, 0, W, H);
  const V = baseVis;
  // snow path from the bottom gate
  ctx.fillStyle = '#dbe8f2';
  ctx.fillRect(GATE_X0 + 6, V.y + V.h, GATE_X1 - GATE_X0 - 12, H - V.y - V.h);
  // dirt base
  ctx.fillStyle = '#cfa97c';
  ctx.fillRect(V.x, V.y, V.w, V.h);
  ctx.fillStyle = 'rgba(150,110,70,0.22)';
  for (const q of dirtBlots) {
    ctx.beginPath();
    ctx.ellipse(V.x + q.u * V.w, V.y + q.v * V.h, q.a, q.b, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const d of decos) {
    if (d.x < cam.x - 60 || d.x > cam.x + VIEW_W + 60 || d.y < cam.y - 80 || d.y > cam.y + viewH + 80) continue;
    if (d.kind === 'bump') {
      ctx.fillStyle = 'rgba(205,222,236,0.7)';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 26 * d.s, 9 * d.s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === 'rock') {
      ctx.fillStyle = '#8b9bab';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 12 * d.s, 8 * d.s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4f8fb';
      ctx.beginPath();
      ctx.ellipse(d.x, d.y - 3 * d.s, 9 * d.s, 4 * d.s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else drawPine(d);
  }
  drawFenceTop();
}

function drawPad(r: Rect, color: string, text: string, active: boolean, pallet = false, above = false) {
  if (pallet) {
    // wooden pallet: front face + top face
    ctx.fillStyle = '#8c6439';
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2;
    rr(r.x, r.y + 8, r.w, r.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c4935a';
    rr(r.x, r.y, r.w, r.h, 8);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(90,58,26,0.6)';
    ctx.lineWidth = 1.5;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(r.x + 3, r.y + (r.h * i) / 4);
      ctx.lineTo(r.x + r.w - 3, r.y + (r.h * i) / 4);
      ctx.stroke();
    }
    if (active) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      rr(r.x, r.y, r.w, r.h, 8);
      ctx.fill();
    }
    label(text, r.x + r.w / 2, r.y + r.h + 24, 14);
    return;
  }
  ctx.fillStyle = active ? color.replace('A', '0.55') : color.replace('A', '0.28');
  rr(r.x, r.y, r.w, r.h, 12);
  ctx.fill();
  ctx.setLineDash([8, 6]);
  ctx.lineWidth = 3;
  ctx.strokeStyle = color.replace('A', '0.95');
  ctx.stroke();
  ctx.setLineDash([]);
  label(text, r.x + r.w / 2, above ? r.y - 12 : r.y + r.h + 14, 14);
}

function drawCounter(c: Counter) {
  const x = c.boxX;
  const w = 140;
  const y = 782;
  const age = T - c.born;
  const pop = age < 0.5 ? easeOutBack(age / 0.5) : 1;
  ctx.save();
  ctx.translate(x + w / 2, y + 28);
  ctx.scale(pop, pop);
  ctx.translate(-(x + w / 2), -(y + 28));
  // front face
  ctx.fillStyle = '#a8763f';
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = 2;
  rr(x, y + 8, w, 20, 4);
  ctx.fill();
  ctx.stroke();
  // top face
  ctx.fillStyle = '#d9a566';
  rr(x - 4, y - 8, w + 8, 18, 5);
  ctx.fill();
  ctx.stroke();
  // grill
  ctx.fillStyle = '#3a3f47';
  rr(x + 10, y - 6, 44, 12, 3);
  ctx.fill();
  ctx.strokeStyle = '#ff8a3c';
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.moveTo(x + 16 + i * 10, y - 4);
    ctx.lineTo(x + 16 + i * 10, y + 4);
    ctx.stroke();
  }
  // cutting board + knife
  ctx.fillStyle = '#f0e0c0';
  ctx.strokeStyle = '#8c6439';
  ctx.lineWidth = 1.5;
  rr(x + 84, y - 6, 40, 12, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#cfd6de';
  ctx.fillRect(x + 100, y - 3, 14, 3);
  ctx.restore();
  if (c.meat > 0) {
    drawMeatTower(c.meatPos.x, c.meatPos.y - 4, c.meat, 'cooked', 16, c.bump);
    label('×' + c.meat, c.meatPos.x, c.meatPos.y - 22 - Math.min(c.meat, 10) * 6, 16);
  }
}

function drawCannon() {
  if (!cannon.built) return;
  const lv = Math.max(1, cannon.lvl);
  const age = T - cannon.born;
  const pop = age < 0.5 ? easeOutBack(age / 0.5) : 1;
  const { x, y } = CANNON_POS;
  ctx.save();
  ctx.translate(x, y + 20);
  ctx.scale(pop, pop);
  ctx.translate(-x, -(y + 20));
  ctx.fillStyle = 'rgba(40,60,90,0.2)';
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 34 + (lv >= 5 ? 8 : 0), 9, 0, 0, Math.PI * 2);
  ctx.fill();
  // wheels + carriage
  const cw2 = lv >= 5 ? 32 : 26;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#3a2410';
  ctx.fillStyle = '#8c6439';
  rr(x - cw2, y + 2, cw2 * 2, 16, 5);
  ctx.fill();
  ctx.stroke();
  for (const wx of [-cw2 + 4, cw2 - 4]) {
    ctx.fillStyle = '#5a3a1a';
    ctx.beginPath();
    ctx.arc(x + wx, y + 14, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#c4935a';
    ctx.beginPath();
    ctx.arc(x + wx, y + 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // barrel colour / bands grow with the level; level 5 gets a second barrel
  const body = ['#4a4f57', '#5a5f68', '#47617f', '#6b5a2a', '#8a6d1c'][lv - 1];
  const band = ['', '#c98a3a', '#c98a3a', '#ffd23f', '#ffe680'][lv - 1];
  const rc = cannon.recoil > 0 ? Math.sin((cannon.recoil / 0.3) * Math.PI) * 9 : 0;
  const a = cannon.aim;
  const barrels = lv >= 5 ? [-7, 7] : [0];
  for (const off of barrels) {
    ctx.save();
    ctx.translate(x - Math.cos(a) * rc + Math.sin(a) * off * -1, y - 8 - Math.sin(a) * rc + Math.cos(a) * off);
    ctx.rotate(a);
    ctx.fillStyle = body;
    ctx.strokeStyle = '#1d2026';
    ctx.lineWidth = 3;
    const bw = lv >= 5 ? 14 : 18;
    rr(-8, -bw / 2, 46 + (lv >= 3 ? 6 : 0), bw, 5);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#6b727c';
    rr(34 + (lv >= 3 ? 6 : 0), -bw / 2 - 2, 9, bw + 4, 3);
    ctx.fill();
    ctx.stroke();
    if (band) {
      ctx.fillStyle = band;
      ctx.fillRect(8, -bw / 2, 5, bw);
      if (lv >= 3) ctx.fillRect(20, -bw / 2, 5, bw);
      if (lv >= 4) ctx.fillRect(2, -bw / 2, 4, bw);
    }
    ctx.restore();
  }
  ctx.restore();
  label('Lv' + lv, x, y - 40, 16, '#ffe14d', '#5a3a10');
}

function drawShells() {
  for (const sh of shells) {
    const e = sh.t;
    const x = sh.x0 + (sh.tx - sh.x0) * e;
    const y = sh.y0 + (sh.ty - sh.y0) * e - Math.sin(Math.PI * e) * 70;
    ctx.fillStyle = 'rgba(40,60,90,0.25)';
    ctx.beginPath();
    ctx.ellipse(sh.x0 + (sh.tx - sh.x0) * e, sh.y0 + (sh.ty - sh.y0) * e + 4, 7, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a2d33';
    ctx.strokeStyle = '#ffb340';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 6.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function drawWarehouse() {
  if (warehouseBorn < 0) return;
  const age = T - warehouseBorn;
  const pop = age < 0.6 ? easeOutBack(age / 0.6) : 1;
  const { x, y } = WAREHOUSE;
  ctx.save();
  ctx.translate(x, y + 30);
  ctx.scale(pop, pop);
  ctx.translate(-x, -(y + 30));
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#4a2c14';
  // front wall
  ctx.fillStyle = '#c38a52';
  rr(x - 78, y - 12, 156, 52, 4);
  ctx.fill();
  ctx.stroke();
  // roof (top face)
  ctx.fillStyle = '#a2472f';
  ctx.beginPath();
  ctx.moveTo(x - 92, y - 10);
  ctx.lineTo(x - 66, y - 44);
  ctx.lineTo(x + 66, y - 44);
  ctx.lineTo(x + 92, y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#c95a3f';
  ctx.fillRect(x - 60, y - 40, 120, 8);
  // big door
  ctx.fillStyle = '#6b4424';
  rr(x - 26, y + 2, 52, 38, 3);
  ctx.fill();
  ctx.stroke();
  ctx.strokeStyle = '#3a2410';
  ctx.beginPath();
  ctx.moveTo(x, y + 2);
  ctx.lineTo(x, y + 40);
  ctx.stroke();
  // crates of meat
  for (const cx of [-62, 52]) {
    ctx.fillStyle = '#d9a566';
    ctx.strokeStyle = '#5a3a1a';
    ctx.lineWidth = 2;
    rr(x + cx - 10, y + 14, 22, 26, 3);
    ctx.fill();
    ctx.stroke();
    drawMeat(x + cx + 1, y + 20, 'cooked', 0.7);
  }
  ctx.restore();
}

function bracket(cx: number, cy: number, half: number, len: number, color: string) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      const x = cx + sx * half;
      const y = cy + sy * half;
      ctx.beginPath();
      ctx.moveTo(x - sx * len, y);
      ctx.arcTo(x, y, x, y - sy * len, 9);
      ctx.lineTo(x, y - sy * len);
      ctx.stroke();
    }
  }
  ctx.lineCap = 'butt';
}

function drawPersonIcon(cx: number, cy: number, color: string) {
  ctx.fillStyle = color;
  ctx.strokeStyle = '#1d2c3f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy - 7, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy + 12, 11, Math.PI, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

function spotScale(sp: Spot) {
  return 1 + (spotPulse[sp.key] ?? 0) * 0.6;
}
function drawSpot(sp: Spot) {
  const active = mode === 'playing' && inRect(player.x, player.y, spotRect(sp));
  const half = SPOT_SIZE / 2;
  const k = spotScale(sp);
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.scale(k, k);
  ctx.translate(-sp.x, -sp.y);
  ctx.fillStyle = active ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.28)';
  rr(sp.x - half, sp.y - half, SPOT_SIZE, SPOT_SIZE, 12);
  ctx.fill();
  bracket(sp.x, sp.y, half, 24, active ? '#ffe14d' : '#ffffff');
  const col = { cashier: '#2aa59a', carrier: '#f29a2e', hunter: '#3a9a52', hunter2: '#3a9a52', expand: '#ffd23f', cashierUp: '#2aa59a', stove: '', counter2: '', warehouse: '', cannon: '', cannon2: '', cannon3: '', cannon4: '', cannon5: '', pack1: '', pack2: '' }[sp.key];
  if (col) drawPersonIcon(sp.x, sp.y - 26, col);
  else {
    const ic = isCannonKey(sp.key) ? '💥' : sp.key === 'stove' ? '🔥' : sp.key === 'counter2' ? '🍖' : sp.key === 'warehouse' ? '🏠' : '🎒';
    ctx.font = '26px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(ic, sp.x, sp.y - 24);
  }
  if (sp.key === 'cashierUp') label('★', sp.x + 16, sp.y - 38, 16, '#ffe14d', '#7a4a00');
  if (isCannonKey(sp.key)) label('Lv' + cannonKeyLv(sp.key), sp.x + 22, sp.y - 38, 15, '#ffe14d', '#7a4a00');
  ctx.restore();
}
// the text goes on top of the characters so a player standing on the spot never hides it
function drawSpotLabel(sp: Spot) {
  const names = { cashier: 'レジ係', carrier: '運搬係 ' + hired.carriers + '/' + maxCarriers(), hunter: '狩り仲間', expand: '拠点の拡張', stove: '大かまど', counter2: '2台目のカウンター', cashierUp: 'レジ係の強化', hunter2: '2人目の狩り仲間', warehouse: '大倉庫', cannon: '大砲 Lv1', cannon2: '大砲 Lv2', cannon3: '大砲 Lv3', cannon4: '大砲 Lv4', cannon5: '大砲 Lv5', pack1: 'リュック→50', pack2: 'リュック→80' };
  ctx.save();
  const k = spotScale(sp);
  ctx.translate(sp.x, sp.y);
  ctx.scale(k, k);
  ctx.translate(-sp.x, -sp.y);
  label(names[sp.key], sp.x, sp.y + 6, sp.key === 'counter2' || sp.key === 'hunter2' || sp.key === 'pack1' || sp.key === 'pack2' ? 13 : 16);
  if (isMaxSpot(sp)) {
    label('MAX', sp.x, sp.y + 30, 22, '#ffe14d', '#7a4a00');
  } else {
    drawCoin(sp.x - 24, sp.y + 30, 7);
    label(String(costLeft[sp.key]), sp.x + 8, sp.y + 30, 22, '#9bf0b0');
  }
  ctx.restore();
}

function nextTarget(): { x: number; y: number } | null {
  if (mode !== 'playing' || inputLocked || player.down > 0) return null;
  const raw = player.stack.filter((m) => m === 'raw').length;
  const cooked = player.stack.length - raw;
  for (const sp of activeSpots()) {
    if (isMaxSpot(sp)) continue;
    const left = costLeft[sp.key];
    const full = sp.key === 'carrier' ? carrierCost() : COSTS[sp.key];
    if (left > 0 && player.coins > 0 && (player.coins >= left || left < full)) return { x: sp.x, y: sp.y };
  }
  if (cooked > 0) {
    const c = counters[pickCounter(player)];
    return { x: c.pad.x + c.pad.w / 2, y: c.pad.y + c.pad.h / 2 };
  }
  if (raw > 0) return { x: IN_PAD.x + IN_PAD.w / 2, y: IN_PAD.y + IN_PAD.h / 2 };
  if (!hired.expanded) {
    const pc = counters.find((q) => q.pile >= 5);
    if (pc) return { x: pc.pay.x, y: pc.pay.y };
  }
  if (fire.out > 0 && hired.carriers === 0 && player.stack.length < maxCarry) return { x: OUT_PAD.x + OUT_PAD.w / 2, y: OUT_PAD.y + OUT_PAD.h / 2 };
  let best: Bear | null = null;
  let bd = 1e9;
  for (const b of bears) {
    const d = dist(b.x, b.y, player.x, player.y);
    if (d < bd) {
      bd = d;
      best = b;
    }
  }
  return best ? { x: best.x, y: best.y } : null;
}

// Aim through the nearest gate when the goal is on the other side of the fence.
function arrowAim(t: { x: number; y: number }) {
  const inP = inRect(player.x, player.y, BASE_RECT);
  const inT = inRect(t.x, t.y, BASE_RECT);
  if (inP === inT) return t;
  const top = gateTopFor(inP ? t.y : player.y);
  const g = top ? gateOuter(top) : gateOuter(top);
  const gi = gateInner(top);
  // inside -> head for the gate mouth; outside -> head for the gate, then inward
  return inP ? { x: gi.x, y: top ? BASE_RECT.y : BASE_RECT.y + BASE_RECT.h } : { x: g.x, y: top ? BASE_RECT.y : BASE_RECT.y + BASE_RECT.h };
}

function drawArrow() {
  const t0 = nextTarget();
  if (!t0) return;
  const t = arrowAim(t0);
  const d = dist(t.x, t.y, player.x, player.y);
  if (d < 75) return;
  const a = Math.atan2(t.y - player.y, t.x - player.x);
  const r = 58 + Math.sin(T * 8) * 4;
  const cx = player.x + Math.cos(a) * r;
  const cy = player.y - 6 + Math.sin(a) * r * 0.8;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(a);
  ctx.fillStyle = '#ffe14d';
  ctx.strokeStyle = '#7a4a00';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(12, 0);
  ctx.lineTo(-7, -9);
  ctx.lineTo(-3, 0);
  ctx.lineTo(-7, 9);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawParts() {
  for (const q of parts) {
    const k = 1 - q.t / q.max;
    ctx.globalAlpha = Math.max(0, k);
    ctx.fillStyle = q.color;
    ctx.beginPath();
    ctx.arc(q.x, q.y, q.size * (0.5 + k * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawConfetti(dt: number) {
  const w = confettiCv.width;
  const h = confettiCv.height;
  confettiCtx.setTransform(1, 0, 0, 1, 0, 0);
  confettiCtx.clearRect(0, 0, w, h);
  if (confetti.length === 0) return;
  confettiT -= dt;
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ch2 = h / dpr;
  for (const c of confetti) {
    c.x += (c.vx + Math.sin(T * 3 + c.rot) * 30) * dt;
    c.y += c.vy * dt;
    c.rot += c.vr * dt;
    if (c.y > ch2 + 20 && confettiT > 1) c.y = -10;
    confettiCtx.save();
    confettiCtx.translate(c.x, c.y);
    confettiCtx.rotate(c.rot);
    confettiCtx.fillStyle = c.color;
    confettiCtx.fillRect(-c.w / 2, -c.h / 2, c.w, c.h);
    confettiCtx.restore();
  }
  if (confettiT <= 0) confetti = [];
}

const easeOutBack = (t: number) => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2);
function drawNpc(n: Npc) {
  const bob = n.moving ? -Math.abs(Math.sin(T * 11 + n.idx * 2)) * 6 : Math.sin(T * 3 + n.idx) * 0.8;
  const age = T - n.born;
  const pop = age < 0.5 ? easeOutBack(age / 0.5) : 1;
  // carried meat behind the body
  for (let i = 0; i < n.stack.length; i++) drawMeat(n.x - n.vx * 0.012 * i, n.y - 4 - i * 8 + bob, n.stack[i], 1.05);
  ctx.save();
  ctx.translate(n.x, n.y + bob + 16);
  ctx.scale(pop, pop * (n.moving ? 1 + Math.abs(Math.sin(T * 11 + n.idx * 2)) * 0.05 : 1));
  ctx.translate(0, -16);
  ctx.fillStyle = 'rgba(40,60,90,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 16 - bob, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  const body = { cashier: '#2aa59a', carrier: '#f29a2e', hunter: '#3a9a52' }[n.kind];
  const hat = { cashier: '#ffffff', carrier: '#b55f10', hunter: '#1f6b36' }[n.kind];
  if (n.kind === 'hunter') {
    ctx.strokeStyle = 'rgba(120,235,140,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(0, 15 - bob, 22, 8, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#14233a';
  ctx.fillStyle = body;
  rr(-12, -8, 24, 24, 9);
  ctx.fill();
  ctx.stroke();
  if (n.kind === 'cashier') {
    ctx.fillStyle = '#fff';
    rr(-8, -2, 16, 18, 4);
    ctx.fill();
    ctx.stroke();
    if (n.up) label('★', 0, -36, 18, '#ffe14d', '#7a4a00');
  }
  ctx.fillStyle = '#f3c9a0';
  ctx.beginPath();
  ctx.arc(0, -16, 10.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = hat;
  ctx.beginPath();
  ctx.arc(0, -18.5, 11, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1d1d1d';
  const ex = Math.cos(n.face) * 2.5;
  ctx.beginPath();
  ctx.arc(-4 + ex, -14, 1.6, 0, Math.PI * 2);
  ctx.arc(4 + ex, -14, 1.6, 0, Math.PI * 2);
  ctx.fill();
  if (n.kind === 'hunter') {
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2b30';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(n.face) * 6, -4 + Math.sin(n.face) * 6);
    ctx.lineTo(Math.cos(n.face) * 24, -4 + Math.sin(n.face) * 24);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFire() {
  const { x, y } = FIRE;
  const glow = ctx.createRadialGradient(x, y, 5, x, y, 90);
  glow.addColorStop(0, 'rgba(255,170,60,0.5)');
  glow.addColorStop(1, 'rgba(255,170,60,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(x - 100, y - 100, 200, 200);
  if (bigStove) {
    // big stone oven with a chimney
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4b4f57';
    ctx.fillStyle = '#9aa1ab';
    rr(x + 18, y - 62, 20, 36, 3);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b4bbc4';
    rr(x - 50, y - 34, 100, 58, 14);
    ctx.fill();
    ctx.stroke();
    ctx.strokeStyle = 'rgba(75,79,87,0.55)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x - 46, y - 22 + i * 14);
      ctx.lineTo(x + 46, y - 22 + i * 14);
      ctx.stroke();
    }
    ctx.fillStyle = '#2a1c14';
    ctx.beginPath();
    ctx.moveTo(x - 24, y + 22);
    ctx.lineTo(x - 24, y - 4);
    ctx.quadraticCurveTo(x, y - 30, x + 24, y - 4);
    ctx.lineTo(x + 24, y + 22);
    ctx.closePath();
    ctx.fill();
  }
  // logs
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#5a3418';
  ctx.lineWidth = bigStove ? 6 : 9;
  ctx.beginPath();
  ctx.moveTo(x - 26, y + 14);
  ctx.lineTo(x + 26, y - 2);
  ctx.moveTo(x + 26, y + 14);
  ctx.lineTo(x - 26, y - 2);
  ctx.stroke();
  ctx.lineCap = 'butt';
  const fl = 1 + Math.sin(T * 14) * 0.08 + Math.sin(T * 23) * 0.05 + fireBump * 1.2;
  const flame = (c: string, w: number, h: number, off: number) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - w + off, y + 6);
    ctx.quadraticCurveTo(x - w * 0.8 + off, y - h * 0.5 * fl, x + off * 0.5, y - h * fl);
    ctx.quadraticCurveTo(x + w * 0.8 + off, y - h * 0.5 * fl, x + w + off, y + 6);
    ctx.closePath();
    ctx.fill();
  };
  const fs = bigStove ? 0.62 : 1;
  flame('#ff7a1a', 22 * fs, 50 * fs, 0);
  flame('#ffb22e', 15 * fs, 36 * fs, Math.sin(T * 9) * 2);
  flame('#fff1a0', 8 * fs, 22 * fs, 0);
  // progress (below the fire, clear of the gate)
  if (fire.raw > 0) {
    const bw = 56;
    ctx.fillStyle = 'rgba(20,30,45,0.85)';
    rr(x - bw / 2, y + 24, bw, 11, 5.5);
    ctx.fill();
    ctx.fillStyle = '#ffb22e';
    rr(x - bw / 2 + 2, y + 26, (bw - 4) * clamp(fire.progress, 0, 1), 7, 3.5);
    ctx.fill();
    drawMeat(x + 46, y + 4, 'raw', 0.9);
    label(fire.raw >= fireCap ? 'MAX' : '×' + fire.raw, x + 46, y + 22, 16);
  }
}

// a tall tower of meat that splits into several columns of 10 when it gets big
function drawMeatTower(cx: number, cy: number, count: number, kind: Meat, colGap: number, bumpTop = 0) {
  const n = Math.min(count, 60);
  const cols = Math.ceil(n / 10);
  for (let col = 0; col < cols; col++) {
    const x = cx + (col - (cols - 1) / 2) * colGap;
    const rows = Math.min(10, n - col * 10);
    for (let r = 0; r < rows; r++) {
      const top = col === cols - 1 && r === rows - 1;
      drawMeat(x, cy - r * 6, kind, 0.95 * (1 + (top ? bumpTop * 0.8 : 0)));
    }
  }
}
function drawStackedMeat(cx: number, cy: number, count: number, kind: Meat) {
  drawMeatTower(cx, cy, count, kind, 15);
}

function drawBear(b: Bear) {
  ctx.save();
  const lg = b.lunge > 0 ? Math.sin((b.lunge / 0.18) * Math.PI) * 12 : 0;
  ctx.translate(b.x + b.fx * lg, b.y + b.fy * lg);
  if (b.mode === 'wind') {
    const k = 1 - b.t / BEAR_WINDUP;
    ctx.translate(Math.sin(T * 60) * 1.5 * k, 0);
  }
  ctx.fillStyle = 'rgba(40,60,90,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 20, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  const outline = '#6f8499';
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = outline;
  ctx.fillStyle = '#fbfcfe';
  ctx.beginPath();
  ctx.ellipse(0, 6, 26, 19, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * 15, -19, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  const hx = b.mode === 'wander' ? 0 : b.fx * 4;
  const hy = b.mode === 'wander' ? 0 : b.fy * 3;
  ctx.beginPath();
  ctx.arc(hx, -8 + hy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#dfe7ef';
  ctx.beginPath();
  ctx.ellipse(hx * 1.4, -3 + hy * 1.3, 8, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#243142';
  ctx.beginPath();
  ctx.ellipse(hx * 1.4, -5 + hy * 1.3, 3.2, 2.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(-7 + hx * 1.2, -12 + hy, 2, 0, Math.PI * 2);
  ctx.arc(7 + hx * 1.2, -12 + hy, 2, 0, Math.PI * 2);
  ctx.fill();
  if (b.flash > 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(0, 2, 29, 27, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  if (b.mode === 'wind') {
    const k = 1 - b.t / BEAR_WINDUP;
    ctx.fillStyle = `rgba(255,30,30,${0.25 + 0.45 * (Math.sin(k * 30) * 0.5 + 0.5)})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 32, 30, 0, 0, Math.PI * 2);
    ctx.fill();
    label('!', 0, -58, 24, '#ff3030', '#fff');
  }
  // HP bar
  const bw = 46;
  ctx.fillStyle = '#2c2231';
  rr(-bw / 2, -42, bw, 9, 4.5);
  ctx.fill();
  ctx.fillStyle = '#ff4b4b';
  const ratio = clamp(b.hp / BEAR_HP, 0, 1);
  if (ratio > 0) {
    rr(-bw / 2 + 1.5, -40.5, (bw - 3) * ratio, 6, 3);
    ctx.fill();
  }
  ctx.restore();
}

function drawSurvivor(s: Survivor) {
  ctx.save();
  ctx.globalAlpha = s.alpha;
  const shiver = s.state === 'wait' ? Math.sin(T * 45 + s.phase) * 1.4 : 0;
  ctx.translate(s.x + shiver, s.y);
  const warmFx = s.state !== 'wait';
  ctx.fillStyle = 'rgba(40,60,90,0.18)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#4a1414';
  // red parka
  ctx.fillStyle = '#d93a3a';
  rr(-12, -8, 24, 24, 9);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f2f2f2';
  ctx.fillRect(-12, -2, 24, 4);
  // face
  ctx.fillStyle = warmFx ? '#f6cfa6' : '#cfe4f5';
  ctx.beginPath();
  ctx.arc(0, -16, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  // fur hood
  ctx.fillStyle = '#c42d2d';
  ctx.beginPath();
  ctx.arc(0, -19, 11, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1d2c3f';
  ctx.beginPath();
  ctx.arc(-4, -15, 1.5, 0, Math.PI * 2);
  ctx.arc(4, -15, 1.5, 0, Math.PI * 2);
  ctx.fill();
  if (warmFx) {
    ctx.fillStyle = 'rgba(255,90,90,0.5)';
    ctx.beginPath();
    ctx.arc(-7, -12, 2.6, 0, Math.PI * 2);
    ctx.arc(7, -12, 2.6, 0, Math.PI * 2);
    ctx.fill();
    label('✓', 0, -38, 20, '#4bdc6e', '#fff');
  } else {
    ctx.strokeStyle = '#9fd4ff';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(-16, -22);
    ctx.lineTo(-20, -26);
    ctx.moveTo(16, -22);
    ctx.lineTo(20, -26);
    ctx.stroke();
  }
  ctx.restore();
  if (s.state === 'wait' && s === survivors.find((q) => q.state === 'wait')) {
    ctx.save();
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#2a3d55';
    ctx.lineWidth = 2;
    rr(s.x + 14, s.y - 52, 42, 28, 10);
    ctx.fill();
    ctx.stroke();
    drawMeat(s.x + 35, s.y - 36, 'cooked', 0.95);
    ctx.restore();
  }
}

function drawPlayer() {
  const p = player;
  const speed = Math.hypot(p.vx, p.vy);
  const bob = Math.sin(T * 16) * Math.min(1, speed / 80) * 2;
  const sq = 1 + p.bump * 0.12;
  ctx.save();
  ctx.translate(p.x, p.y);
  // light-blue ring at feet + shadow
  ctx.fillStyle = 'rgba(40,60,90,0.2)';
  ctx.beginPath();
  ctx.ellipse(0, 16, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(110,214,255,0.95)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 15, 24, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  if (p.down > 0) {
    ctx.rotate(Math.PI / 2);
    ctx.translate(-8, 0);
    label('★', 6, -30, 16, '#ffe14d');
  }
  if (p.inv > 0 && p.down <= 0 && Math.floor(T * 20) % 2 === 0) ctx.globalAlpha = 0.5;
  ctx.scale(1, sq);
  ctx.translate(0, bob);
  ctx.lineWidth = 2.2;
  ctx.strokeStyle = '#14233a';
  ctx.fillStyle = '#2f7fd6';
  rr(-13, -8, 26, 25, 10);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f3c9a0';
  ctx.beginPath();
  ctx.arc(0, -16, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#1f5fae';
  ctx.beginPath();
  ctx.arc(0, -19, 11.5, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e8f3ff';
  ctx.beginPath();
  ctx.arc(0, -31, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d1d1d';
  const ex = Math.cos(p.face) * 3;
  ctx.beginPath();
  ctx.arc(-4 + ex, -14, 1.7, 0, Math.PI * 2);
  ctx.arc(4 + ex, -14, 1.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  if (p.down <= 0) {
    // rifle
    const a = p.face;
    const rec = p.swing > 0 ? 3 : 0;
    ctx.save();
    ctx.translate(p.x, p.y - 4);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#2b2b30';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (6 - rec), Math.sin(a) * (6 - rec));
    ctx.lineTo(Math.cos(a) * (24 - rec), Math.sin(a) * (24 - rec));
    ctx.stroke();
    ctx.strokeStyle = '#8a5a2b';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (2 - rec), Math.sin(a) * (2 - rec));
    ctx.lineTo(Math.cos(a) * (10 - rec), Math.sin(a) * (10 - rec));
    ctx.stroke();
    if (p.swing > 0.06) {
      ctx.fillStyle = '#ffe680';
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 28, Math.sin(a) * 28, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    // green HP bar over head
    const bw = 40;
    ctx.fillStyle = '#1c2a22';
    rr(p.x - bw / 2, p.y + 28, bw, 9, 4.5);
    ctx.fill();
    ctx.fillStyle = p.hp / PLAYER_MAX_HP > 0.3 ? '#3ddc5f' : '#ffb02e';
    const rt = clamp(p.hp / PLAYER_MAX_HP, 0, 1);
    if (rt > 0) {
      rr(p.x - bw / 2 + 1.5, p.y + 29.5, (bw - 3) * rt, 6, 3);
      ctx.fill();
    }
  }
}

function drawBackStack() {
  const p = player;
  const bumpS = 1 + p.bump * 0.15;
  for (let i = 0; i < p.stack.length; i++) {
    const pos = stackPos(i);
    drawMeat(pos.x, pos.y, p.stack[i], 1.15 * (i === p.stack.length - 1 ? bumpS : 1));
  }
}
function drawCarryLabel() {
  const p = player;
  if (p.stack.length === 0) return;
  const top = stackPos(Math.min(p.stack.length, 10) - (p.stack.length >= 10 ? 0 : 0));
  const tp = { x: p.x, y: p.y - 4 - Math.min(p.stack.length, 10) * 8 };
  void top;
  if (p.stack.length >= maxCarry) label('MAX', tp.x, tp.y - 22, 20, '#ffe14d', '#7a1d1d');
  else label(String(p.stack.length), tp.x, tp.y - 20, 20, '#ffffff');
}

function drawStick() {
  if (!stick.active) return;
  ctx.save();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const dx = stick.x - stick.ox;
  const dy = stick.y - stick.oy;
  const d = Math.hypot(dx, dy);
  const m = Math.min(d, STICK_MAX);
  const kx = d > 0 ? stick.ox + (dx / d) * m : stick.ox;
  const ky = d > 0 ? stick.oy + (dy / d) * m : stick.oy;
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.strokeStyle = 'rgba(30,50,80,0.55)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(stick.ox, stick.oy, STICK_MAX, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(kx, ky, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawSnow(dt: number) {
  ctx.save();
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const f of flakes) {
    f.y += f.v * dt;
    f.x += Math.sin(T + f.y * 0.02) * 12 * dt - 20 * dt;
    if (f.y > viewH + 4) f.y = -4;
    if (f.x < -4) f.x = VIEW_W + 4;
    ctx.beginPath();
    ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function render(dt: number) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const shx = shake > 0 ? (Math.random() - 0.5) * 12 * (shake / 0.25) : 0;
  const shy = shake > 0 ? (Math.random() - 0.5) * 12 * (shake / 0.25) : 0;
  const zp = zoomPulse > 0 ? Math.sin((zoomPulse / 0.6) * Math.PI) * 0.06 : 0;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(cw / 2, ch / 2);
  ctx.scale(1 + zp, 1 + zp);
  ctx.translate(-cw / 2, -ch / 2);
  ctx.scale(scale, scale);
  ctx.translate(-cam.x + shx, -cam.y + shy);

  drawGround();

  const pad = (r: Rect) => mode === 'playing' && inRect(player.x, player.y, r);
  drawPad(IN_PAD, 'rgba(240,86,110,A)', '生肉を入れる', pad(IN_PAD));
  drawPad(OUT_PAD, 'rgba(176,110,50,A)', '焼き肉', pad(OUT_PAD), true);
  counters.forEach((c, ci) => {
    drawPad(c.pad, 'rgba(70,150,230,A)', ci === 0 ? '配給' : '配給2', pad(c.pad), false, true);
    // payment spot
    ctx.fillStyle = 'rgba(60,170,90,0.25)';
    rr(c.pay.x - 32, c.pay.y - 32, 64, 64, 14);
    ctx.fill();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = 'rgba(30,120,60,0.9)';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.setLineDash([]);
    label('代金', c.pay.x, c.pay.y + 46, 14);
    // coin pile
    for (let i = 0; i < Math.min(c.pile, 30); i++) {
      const col = Math.floor(i / 15);
      drawCoin(c.pay.x - 9 + col * 18, c.pay.y + 18 - (i % 15) * 4.2, 7);
    }
    if (c.pile > 0) label('×' + c.pile, c.pay.x, c.pay.y - 56, 16, '#9bf0b0');
  });

  // output pile on pickup pad
  if (fire.out > 0) {
    drawStackedMeat(OUT_PAD.x + OUT_PAD.w / 2, OUT_PAD.y + OUT_PAD.h / 2 + 12, fire.out, 'cooked');
    label('×' + fire.out, OUT_PAD.x + OUT_PAD.w + 24, OUT_PAD.y + 22, 16);
  }

  for (const sp of activeSpots()) drawSpot(sp);
  drawFire();

  for (const d of drops) {
    const k = d.t;
    const x = d.sx + (d.x - d.sx) * k;
    const y = d.sy + (d.y - d.sy) * k - Math.sin(Math.PI * k) * 24;
    ctx.fillStyle = 'rgba(40,60,90,0.18)';
    ctx.beginPath();
    ctx.ellipse(d.x + (x - d.x), d.y + 6, 10, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();
    drawMeat(x, y, d.kind, 1.1);
  }

  // y-sorted characters
  type Item = { y: number; draw: () => void };
  const items: Item[] = [];
  for (const b of bears) items.push({ y: b.y, draw: () => drawBear(b) });
  for (const s of survivors) items.push({ y: s.y, draw: () => drawSurvivor(s) });
  items.push({
    y: player.y,
    draw: () => {
      drawBackStack();
      drawPlayer();
    },
  });
  for (const n of npcs) items.push({ y: n.y, draw: () => drawNpc(n) });
  for (const c of counters) items.push({ y: 806, draw: () => drawCounter(c) });
  if (warehouseBorn >= 0) items.push({ y: WAREHOUSE.y + 40, draw: drawWarehouse });
  if (cannon.built) items.push({ y: CANNON_POS.y + 18, draw: drawCannon });
  items.push({ y: baseVis.y + baseVis.h + 1, draw: drawFenceBottom });
  items.sort((a, b) => a.y - b.y);
  for (const it of items) it.draw();
  drawCarryLabel();
  drawParts();
  for (const f of floaters) {
    const life = f.life ?? 0.8;
    const k = f.t / life;
    ctx.globalAlpha = k > 0.7 ? Math.max(0, (1 - k) / 0.3) : 1;
    const pop = k < 0.15 ? 0.6 + (k / 0.15) * 0.6 : 1.2 - Math.min(0.2, (k - 0.15) * 0.5);
    label(f.text, f.x, f.y - f.t * 40, (f.size ?? 22) * pop, f.color, f.color === '#fff27a' ? '#6b4a00' : '#fff');
  }
  ctx.globalAlpha = 1;
  for (const sp of activeSpots()) drawSpotLabel(sp);
  drawArrow();
  if (mode === 'playing' && player.down > 0) label('ダウン…', player.x, player.y - 50, 18, '#fff');
  drawShells();
  for (const bl of bullets) {
    ctx.strokeStyle = 'rgba(255,230,120,0.6)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(bl.x - bl.vx * 0.025, bl.y - bl.vy * 0.025);
    ctx.lineTo(bl.x, bl.y);
    ctx.stroke();
    ctx.fillStyle = '#fff4b0';
    ctx.beginPath();
    ctx.arc(bl.x, bl.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const f of flies) {
    const to = f.to();
    const t = f.t;
    const e = t * t * (3 - 2 * t);
    const x = f.x0 + (to.x - f.x0) * e;
    const y = f.y0 + (to.y - f.y0) * e - Math.sin(Math.PI * t) * f.arc;
    if (f.kind === 'coin') drawCoin(x, y, 7);
    else drawMeat(x, y, f.kind, 1.1);
  }

  drawSnow(dt);
  drawStick();
  drawConfetti(dt);
}

// ---------- loop ----------
let last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  T += dt;
  if (mode === 'playing') update(dt);
  render(dt);
  requestAnimationFrame(frame);
}
newGame();
requestAnimationFrame(frame);

// Read-only snapshot for tests / evaluators. (?test=1 adds helpers for setting up awkward situations.)
const emberApi: Record<string, unknown> = {
  snapshot: () => ({
    mode,
    coins: player.coins,
    hired: { ...hired },
    costLeft: { ...costLeft },
    counterMeat: totalCounterMeat(),
    phase,
    p2step,
    rate: Math.round(rateShown * 100) / 100,
    counters: counters.map((c) => ({ meat: c.meat, pile: c.pile })),
    base: { ...BASE_RECT },
    bigStove,
    cashierDelay,
    coinsPer,
    fireCap,
    firstClearTime,
    gainedTotal,
    maxCarry,
    cannon: { built: cannon.built, lvl: cannon.lvl, kills: cannonKills, stats: CANNON_LV[Math.max(1, cannon.lvl) - 1] },
    optStep,
    elapsed: Math.round(elapsed * 10) / 10,
    cleared,
    clearTime,
    npcs: npcs.map((n) => ({ kind: n.kind, x: Math.round(n.x), y: Math.round(n.y), state: n.state, stack: n.stack.length, via: n.via ? 1 : 0, stuck: n.stuck })),
    spots: activeSpots().map((sp) => ({ key: sp.key, x: sp.x, y: sp.y, max: isMaxSpot(sp) })),
    hp: Math.round(player.hp),
    down: player.down > 0,
    stack: [...player.stack],
    incoming: player.incoming,
    fire: { ...fire },
    bears: bears.length,
    bearPos: bears.map((b) => ({ x: Math.round(b.x), y: Math.round(b.y), hp: b.hp })),
    pendingRespawns: respawns.length,
    drops: drops.length,
    dropPos: drops.map((d) => ({ x: Math.round(d.x), y: Math.round(d.y), kind: d.kind })),
    served,
    pile: totalPile(),
    queue: survivors.filter((s) => s.state === 'wait').length,
    player: { x: Math.round(player.x), y: Math.round(player.y) },
    cookTime: COOK_TIME,
  }),
  audit: () => {
    const all: { x: number; y: number }[] = [player, ...npcs, ...bears];
    const inWall = (o: { x: number; y: number }) => walls.some((w) => o.x > w.x - 2 && o.x < w.x + w.w + 2 && o.y > w.y - 2 && o.y < w.y + w.h + 2);
    const band = (d: Drop) => {
      const M = 12;
      const o = { x: BASE_RECT.x - M, y: BASE_RECT.y - M, w: BASE_RECT.w + 2 * M, h: BASE_RECT.h + 2 * M };
      const i = { x: BASE_RECT.x + M, y: BASE_RECT.y + M, w: BASE_RECT.w - 2 * M, h: BASE_RECT.h - 2 * M };
      return inRect(d.x, d.y, o) && !inRect(d.x, d.y, i) && Math.abs(d.x - 400) > 36;
    };
    return {
      bearsInside: bears.filter((b) => inRect(b.x, b.y, BASE_RECT, 0)).length,
      inWall: all.filter(inWall).length,
      dropsInBand: drops.filter(band).length,
    };
  },
};
if (new URLSearchParams(location.search).has('test')) {
  emberApi.test = {
    teleport: (x: number, y: number) => {
      player.x = x;
      player.y = y;
    },
    bear: (x: number, y: number) => {
      const b = makeBear(false);
      b.x = x;
      b.y = y;
      b.tx = x;
      b.ty = y;
      bears.push(b);
    },
    drop: (x: number, y: number) => {
      drops.push({ kind: 'raw', sx: x, sy: y, x, y, t: 1 });
    },
    moveNpc: (i: number, x: number, y: number) => {
      npcs[i].x = x;
      npcs[i].y = y;
    },
    expand: () => {
      if (!hired.expanded) {
        hired.expanded = true;
        startExpansion();
      }
    },
  };
}
(window as unknown as { __ember: unknown }).__ember = emberApi;
