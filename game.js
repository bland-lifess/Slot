/* =========================================================
   SLOT SURGE — game.js
   Everything gameplay-related lives here. Organized top to
   bottom as: data -> state -> utilities -> machine rendering
   -> spin core -> evaluation -> presentation/VFX -> particles
   -> round flow -> shop -> game over -> HUD -> event wiring.
   ========================================================= */

/* ---------------------------------------------------------
   CONFIG & DATA
   --------------------------------------------------------- */
const CONFIG = {
  reelCount: 5,
  baseSpins: 11,
  baseQuota: 100,
  quotaGrowth: 1.32,
  freeSpinBase: 5,
  rerollCost: 20,
  cashOutPerSpin: 12,
  shopCardCount: 4,
};

// pay: coins awarded for 3 / 4 / 5 matching symbols on a payline (left to right).
// Tuned via Monte Carlo simulation of full runs (see design notes in README) so
// round 1 is very winnable and the climb gets meaningfully harder from there.
const SYMBOLS = {
  cherry: { name: 'Cherry', pay: { 3: 8, 4: 20, 5: 50 }, svg: `
    <path d="M32 13 C30 21,26 27,24 31 M32 13 C34 19,38 23,41 27" stroke="#2c5c2c" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="25" cy="15" rx="9" ry="5" fill="url(#gGreen)" stroke="#1c3d1c" stroke-width="1.5" transform="rotate(-25 25 15)"/>
    <circle cx="23" cy="42" r="13" fill="url(#gRed)" stroke="#3d0810" stroke-width="2"/>
    <circle cx="41" cy="39" r="13" fill="url(#gRedDeep)" stroke="#3d0810" stroke-width="2"/>
    <ellipse cx="18" cy="36" rx="2.6" ry="1.6" fill="#fff" opacity="0.75" transform="rotate(-30 18 36)"/>
    <ellipse cx="36" cy="33" rx="2.6" ry="1.6" fill="#fff" opacity="0.6" transform="rotate(-30 36 33)"/>` },

  lemon: { name: 'Lemon', pay: { 3: 12, 4: 28, 5: 70 }, svg: `
    <path d="M32 8 C44 8,51 19,51 32 C51 46,43 57,32 57 C21 57,13 46,13 32 C13 19,20 8,32 8 Z" fill="url(#gYellow)" stroke="#5c4707" stroke-width="2"/>
    <path d="M29 9 C31 5,35 5,37 8" stroke="#3d5c1f" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="23" cy="23" rx="5.5" ry="3.5" fill="#fff" opacity="0.7" transform="rotate(-35 23 23)"/>` },

  bell: { name: 'Bell', pay: { 3: 18, 4: 45, 5: 110 }, svg: `
    <rect x="28" y="6" width="8" height="9" rx="2" fill="url(#gChrome)"/>
    <path d="M32 13 C24 13,22 20,22 24 C13 28,10 38,10 45 L54 45 C54 38,51 28,42 24 C42 20,40 13,32 13 Z" fill="url(#gChrome)" stroke="#2a2a2d" stroke-width="2"/>
    <rect x="8" y="45" width="48" height="7" rx="3.5" fill="url(#gChromeDome)" stroke="#2a2a2d" stroke-width="1.5"/>
    <circle cx="32" cy="57" r="5.5" fill="url(#gChromeDome)" stroke="#2a2a2d" stroke-width="1.5"/>
    <ellipse cx="23" cy="27" rx="4" ry="9" fill="#fff" opacity="0.45"/>` },

  gem: { name: 'Gem', pay: { 3: 30, 4: 75, 5: 200 }, svg: `
    <polygon points="32,8 48,24 32,58 16,24" fill="url(#gCyan)" stroke="#0a3f4d" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="32,8 48,24 32,24" fill="#eafeff" opacity="0.85"/>
    <polygon points="16,24 32,24 32,8" fill="#bff5ff" opacity="0.6"/>
    <line x1="16" y1="24" x2="48" y2="24" stroke="#0a3f4d" stroke-width="1.2"/>
    <line x1="32" y1="24" x2="32" y2="58" stroke="#0a3f4d" stroke-width="1.2"/>` },

  seven: { name: 'Seven', pay: { 3: 55, 4: 140, 5: 380 }, svg: `
    <text x="33" y="49" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="44" text-anchor="middle" fill="#3d0810">7</text>
    <text x="31" y="47" font-family="Arial,Helvetica,sans-serif" font-weight="900" font-size="44" text-anchor="middle" fill="url(#gRed)" stroke="#f5f5f2" stroke-width="1">7</text>` },

  wild: { name: 'Star', isWild: true, pay: { 3: 95, 4: 230, 5: 580 }, svg: `
    <polygon points="32,8 37.9,23.9 54.8,24.6 41.5,35.1 46.1,51.4 32,42 17.9,51.4 22.5,35.1 9.2,24.6 26.1,23.9" fill="url(#gChrome)" stroke="#2a2a2d" stroke-width="2" stroke-linejoin="round"/>
    <polygon points="32,16 35.5,25.5 45.5,26 38,32.5 40.5,42 32,36.5 23.5,42 26,32.5 18.5,26 28.5,25.5" fill="#ffffff" opacity="0.55"/>` },

  clover: { name: 'Clover', isClover: true, pay: { 3: 12, 4: 32, 5: 80 }, svg: `
    <path d="M32 34 C32 43,30 51,28 56" stroke="#1c3d1c" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <circle cx="22" cy="22" r="11" fill="url(#gGreen)" stroke="#123312" stroke-width="1.5"/>
    <circle cx="42" cy="22" r="11" fill="url(#gGreen)" stroke="#123312" stroke-width="1.5"/>
    <circle cx="22" cy="42" r="11" fill="url(#gGreen)" stroke="#123312" stroke-width="1.5"/>
    <circle cx="42" cy="42" r="11" fill="url(#gGreen)" stroke="#123312" stroke-width="1.5"/>
    <circle cx="32" cy="32" r="7" fill="#6fd977"/>` },

  coin: { name: 'Coin', isCoin: true, flatValue: 9, svg: `
    <circle cx="32" cy="32" r="24" fill="url(#gChrome)" stroke="#2a2a2d" stroke-width="2.5"/>
    <circle cx="32" cy="32" r="17" fill="none" stroke="#2a2a2d" stroke-width="2"/>
    <text x="32" y="41" font-family="Arial,sans-serif" font-weight="900" font-size="23" text-anchor="middle" fill="#2a2a2d">$</text>
    <path d="M13 21 A24 24 0 0 1 30 9" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.75"/>` },

  skull: { name: 'Skull', isSkull: true, svg: `
    <path d="M32 8 C46 8,52 20,50 32 C50 36,48 38,46 40 L46 46 L40 46 L40 42 L36 42 L36 46 L28 46 L28 42 L24 42 L24 46 L18 46 L18 40 C16 38,14 36,14 32 C12 20,18 8,32 8 Z" fill="url(#gBone)" stroke="#3a3a3e" stroke-width="2"/>
    <ellipse cx="23" cy="28" rx="6" ry="7" fill="#19191b"/>
    <ellipse cx="41" cy="28" rx="6" ry="7" fill="#19191b"/>
    <path d="M32 32 L28.5 39 L35.5 39 Z" fill="#19191b"/>` },

  bonus: { name: 'Bonus', isScatter: true, svg: `
    <path d="M32 26 C22 26,18 18,24 14 C29 11,32 18,32 26 Z" fill="url(#gRed)" stroke="#3d0810" stroke-width="1.5"/>
    <path d="M32 26 C42 26,46 18,40 14 C35 11,32 18,32 26 Z" fill="url(#gRed)" stroke="#3d0810" stroke-width="1.5"/>
    <rect x="12" y="28" width="40" height="28" fill="url(#gDark)" stroke="#e0102a" stroke-width="2"/>
    <rect x="12" y="28" width="40" height="8" fill="#2a2a2d" stroke="#e0102a" stroke-width="1.5"/>
    <rect x="27" y="28" width="10" height="28" fill="url(#gRed)" stroke="#3d0810" stroke-width="1.5"/>` },
};

// Weighted reel strip — repeats = frequency. Shared by all 5 reels.
const BASE_STRIP = [
  'cherry', 'cherry', 'cherry', 'cherry', 'cherry',
  'lemon', 'lemon', 'lemon', 'lemon',
  'bell', 'bell', 'bell',
  'gem', 'gem',
  'seven',
  'wild',
  'clover', 'clover', 'clover',
  'coin', 'coin', 'coin',
  'skull',
  'bonus',
];

// Each entry maps reel index (0-4) -> row (0=top,1=mid,2=bottom)
const PAYLINES = [
  [0, 0, 0, 0, 0], // top row
  [1, 1, 1, 1, 1], // middle row
  [2, 2, 2, 2, 2], // bottom row
  [0, 1, 2, 1, 0], // V
  [2, 1, 0, 1, 2], // inverted V
];

const UPGRADE_POOL = [
  { id: 'add_seven', name: 'Hot Sevens', desc: 'Add a Seven to the reels.', symbolIcon: 'seven', baseCost: 60,
    apply: (s) => s.strip.push('seven') },
  { id: 'add_gem', name: 'Gem Rush', desc: 'Add a Gem to the reels.', symbolIcon: 'gem', baseCost: 40,
    apply: (s) => s.strip.push('gem') },
  { id: 'add_wild', name: 'Wild Surge', desc: 'Add a Star (wild) to the reels.', symbolIcon: 'wild', baseCost: 70,
    apply: (s) => s.strip.push('wild') },
  { id: 'add_clover', name: "Fortune's Favor", desc: 'Add a Clover. Fills your luck meter faster.', symbolIcon: 'clover', baseCost: 35,
    apply: (s) => s.strip.push('clover') },
  { id: 'add_coin', name: 'Coin Magnet', desc: 'Add a Coin symbol for flat bonus cash.', symbolIcon: 'coin', baseCost: 35,
    apply: (s) => s.strip.push('coin') },
  { id: 'add_bonus', name: 'Bonus Beacon', desc: 'Add a Bonus scatter. More free spin rounds.', symbolIcon: 'bonus', baseCost: 55,
    available: (s) => s.strip.filter((x) => x === 'bonus').length < 3, apply: (s) => s.strip.push('bonus') },
  { id: 'remove_cherry', name: 'Thin the Herd', desc: 'Remove a Cherry to concentrate the odds.', symbolIcon: 'cherry', baseCost: 45,
    available: (s) => s.strip.includes('cherry'), apply: (s) => removeOne(s.strip, 'cherry') },
  { id: 'remove_lemon', name: 'Zest Purge', desc: 'Remove a Lemon to concentrate the odds.', symbolIcon: 'lemon', baseCost: 40,
    available: (s) => s.strip.includes('lemon'), apply: (s) => removeOne(s.strip, 'lemon') },
  { id: 'remove_skull', name: 'Skull Ward', desc: 'Permanently remove a Skull.', symbolIcon: 'skull', baseCost: 65,
    available: (s) => s.strip.includes('skull'), apply: (s) => removeOne(s.strip, 'skull') },
  { id: 'extra_spin', name: 'Extra Spin', desc: '+1 spin every round, forever.', glyphIcon: 'refresh', baseCost: 80,
    apply: (s) => { s.spinsTotal += 1; } },
  { id: 'global_mult', name: 'Payout Boost', desc: '+8% to all payline winnings, permanently.', glyphIcon: 'chart', baseCost: 100,
    apply: (s) => { s.globalMultiplier = +(s.globalMultiplier + 0.08).toFixed(2); } },
  { id: 'coin_boost', name: 'Fat Stacks', desc: 'Coin symbols pay 50% more.', symbolIcon: 'coin', baseCost: 50,
    apply: (s) => { s.coinBonusMultiplier = +(s.coinBonusMultiplier + 0.5).toFixed(2); } },
  { id: 'luck_boost', name: 'Four-Leaf Charm', desc: 'Luck meter fills faster.', symbolIcon: 'clover', baseCost: 55,
    available: (s) => s.luckMeterMax > 4, apply: (s) => { s.luckMeterMax = Math.max(4, s.luckMeterMax - 1); } },
  { id: 'insurance', name: 'Quota Insurance', desc: 'Miss a quota once and survive with +3 spins.', glyphIcon: 'shield', baseCost: 90,
    available: (s) => !s.hasInsurance, apply: (s) => { s.hasInsurance = true; } },
  { id: 'freespin_boost', name: 'Bonus Extender', desc: '+2 spins during every Free Spins round.', glyphIcon: 'starburst', baseCost: 60,
    apply: (s) => { s.freeSpinBonusCount += 2; } },
];

// Small bold glyphs for the handful of upgrades that don't map to a reel
// symbol. Same rendering path as SYMBOLS so shop cards never fall back to emoji.
const GLYPHS = {
  refresh: `<path d="M48 20 A20 20 0 1 0 52 34" stroke="url(#gRed)" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M48 8 L48 22 L36 20 Z" fill="url(#gRed)"/>`,
  chart: `<rect x="10" y="38" width="9" height="18" fill="#8a8a90"/><rect x="23" y="26" width="9" height="30" fill="#c7c7cb"/><rect x="36" y="14" width="9" height="42" fill="url(#gRed)"/><path d="M12 22 L28 11 L44 18 L56 6" stroke="#f5f5f2" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M46 5 L57 5 L57 16" stroke="#f5f5f2" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  shield: `<path d="M32 6 L54 14 L54 30 C54 45 44 55 32 58 C20 55 10 45 10 30 L10 14 Z" fill="url(#gRed)" stroke="#3d0810" stroke-width="2"/><path d="M21 31 L28 39 L45 21" stroke="#f5f5f2" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
  starburst: `<polygon points="32,4 38,22 56,22 42,34 47,52 32,42 17,52 22,34 8,22 26,22" fill="url(#gChrome)" stroke="#2a2a2d" stroke-width="2" stroke-linejoin="round"/>`,
};

function upgradeIconSVG(offer) {
  const inner = offer.symbolIcon ? SYMBOLS[offer.symbolIcon].svg : GLYPHS[offer.glyphIcon];
  return `<svg class="sym-icon" viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
}

const UI_ICONS = {
  speakerOn: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 24 L8 40 L18 40 L30 50 L30 14 L18 24 Z" fill="#e8e8ea"/><path d="M38 20 A18 18 0 0 1 38 44" stroke="#e8e8ea" stroke-width="4.5" fill="none" stroke-linecap="round"/><path d="M45 12 A28 28 0 0 1 45 52" stroke="#e8e8ea" stroke-width="4.5" fill="none" stroke-linecap="round" opacity="0.55"/></svg>`,
  speakerOff: `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 24 L8 40 L18 40 L30 50 L30 14 L18 24 Z" fill="#e8e8ea"/><path d="M40 22 L56 42 M56 22 L40 42" stroke="#e0102a" stroke-width="5" stroke-linecap="round"/></svg>`,
};

/* ---------------------------------------------------------
   STATE
   --------------------------------------------------------- */
let state = {};
let lastRenderedCoins = 0;

function freshState() {
  return {
    coins: 0,
    round: 1,
    quota: calcQuota(1),
    spinsTotal: CONFIG.baseSpins,
    spinsLeft: CONFIG.baseSpins,
    coinsThisRound: 0,
    streak: 0,
    globalMultiplier: 1,
    coinBonusMultiplier: 1,
    luckMeter: 0,
    luckMeterMax: 10,
    luckySpinReady: false,
    strip: [...BASE_STRIP],
    freeSpinsLeft: 0,
    freeSpinMultiplier: 2,
    freeSpinBonusCount: 0,
    hasInsurance: false,
    usedInsurance: false,
    isSpinning: false,
    shopOffers: [],
    stats: { biggestWin: 0, roundsCleared: 0, longestStreak: 0 },
  };
}

/* ---------------------------------------------------------
   UTILITIES
   --------------------------------------------------------- */
function formatNum(n) { return Math.round(n).toLocaleString('en-US'); }
function sleep(ms) { return new Promise((res) => setTimeout(res, ms)); }
function weightedPick(strip) { return strip[Math.floor(Math.random() * strip.length)]; }
function removeOne(arr, val) { const i = arr.indexOf(val); if (i !== -1) arr.splice(i, 1); }
function debounce(fn, wait) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
}
function getStreakMultiplier() { return 1 + Math.min(state.streak, 10) * 0.1; }
function calcQuota(round) { return Math.round((CONFIG.baseQuota * Math.pow(CONFIG.quotaGrowth, round - 1)) / 5) * 5; }
function scaledCost(baseCost, round) { return Math.round((baseCost * (1 + 0.12 * (round - 1))) / 5) * 5; }

function animateCount(el, from, to, duration = 700) {
  const start = performance.now();
  const change = to - from;
  function tick(now) {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = formatNum(from + change * eased);
    if (t < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------------------------------------------------------
   SCREEN MANAGEMENT
   --------------------------------------------------------- */
function showScreen(id) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
}

/* ---------------------------------------------------------
   MACHINE DOM
   --------------------------------------------------------- */
function getCellSizePx() {
  const val = getComputedStyle(document.documentElement).getPropertyValue('--cell-size').trim();
  return parseFloat(val) || 60;
}

function makeSymbolCell(symKey, reelIdx, row, isFinal) {
  const div = document.createElement('div');
  div.className = 'symbol-cell' + (isFinal ? ' final-symbol' : '');
  div.dataset.reel = reelIdx;
  div.dataset.symbol = symKey;
  if (isFinal) div.dataset.row = row;
  div.innerHTML = `<svg class="sym-icon" viewBox="0 0 64 64" aria-hidden="true">${SYMBOLS[symKey].svg}</svg>`;
  return div;
}

function initLights() {
  ['lights-top', 'lights-bottom'].forEach((id) => {
    const el = document.getElementById(id);
    el.innerHTML = '';
    for (let i = 0; i < 14; i++) {
      const dot = document.createElement('span');
      dot.className = 'light-dot';
      dot.style.animationDelay = (i * 0.09) + 's';
      el.appendChild(dot);
    }
  });
}

function buildMachineDOM() {
  const reelsEl = document.getElementById('reels');
  reelsEl.innerHTML = '';
  for (let i = 0; i < CONFIG.reelCount; i++) {
    const reel = document.createElement('div');
    reel.className = 'reel';
    reel.dataset.reel = i;
    reel.dataset.prefixCount = 0;
    const strip = document.createElement('div');
    strip.className = 'reel-strip';
    for (let row = 0; row < 3; row++) {
      strip.appendChild(makeSymbolCell(weightedPick(state.strip), i, row, true));
    }
    reel.appendChild(strip);
    reelsEl.appendChild(reel);
  }
  initLights();
}

// Keep the settled reel art aligned with --cell-size across resizes/orientation changes.
window.addEventListener('resize', debounce(() => {
  const cellSize = getCellSizePx();
  document.querySelectorAll('.reel').forEach((reelEl) => {
    const stripEl = reelEl.querySelector('.reel-strip');
    if (!stripEl) return;
    const prefixCount = parseInt(reelEl.dataset.prefixCount || '0', 10);
    stripEl.style.transition = 'none';
    stripEl.style.transform = `translateY(-${prefixCount * cellSize}px)`;
  });
}, 150));

/* ---------------------------------------------------------
   SPIN CORE
   --------------------------------------------------------- */
function spinReelSymbols(strip) {
  const start = Math.floor(Math.random() * strip.length);
  return [0, 1, 2].map((o) => strip[(start + o) % strip.length]);
}

function applyLuckyModifiers(grid) {
  const goodPool = state.strip.filter((s) => s !== 'skull');
  for (let r = 0; r < grid.length; r++) {
    for (let i = 0; i < 3; i++) {
      if (grid[r][i] === 'skull') grid[r][i] = goodPool[Math.floor(Math.random() * goodPool.length)];
    }
  }
  const highTier = ['seven', 'wild', 'gem'];
  const rr = Math.floor(Math.random() * grid.length);
  grid[rr][1] = highTier[Math.floor(Math.random() * highTier.length)];
}

// Builds a translateY keyframe list that only ever stops on whole-cell
// boundaries. The reel travels `totalCells` cells: most of them blur by
// as fast, uniform steps() ticks, then the last few are broken into
// individually-timed clicks with growing gaps between them, so the motion
// visibly grinds to a halt cell-by-cell instead of easing to a random
// in-between height. Every value here is an exact multiple of cellSize,
// so the final rest position is always perfectly grid-aligned.
function buildReelKeyframes(totalCells, cellSize) {
  const decelSteps = Math.min(5, Math.max(1, totalCells - 3));
  const fastSteps = totalCells - decelSteps;
  const fastTimeFrac = 0.4;

  const keyframes = [{ transform: 'translateY(0px)', offset: 0, easing: `steps(${fastSteps}, end)` }];
  keyframes.push({ transform: `translateY(-${fastSteps * cellSize}px)`, offset: fastTimeFrac });

  const weights = Array.from({ length: decelSteps }, (_, i) => i + 1); // 1,2,3... => growing gaps
  const weightSum = weights.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  const tickOffsets = [];
  for (let i = 0; i < decelSteps; i++) {
    keyframes[keyframes.length - 1].easing = 'steps(1, end)';
    cumulative += weights[i];
    const frac = i === decelSteps - 1 ? 1 : fastTimeFrac + (1 - fastTimeFrac) * (cumulative / weightSum);
    const cellsSoFar = fastSteps + i + 1;
    keyframes.push({ transform: `translateY(-${cellsSoFar * cellSize}px)`, offset: frac });
    tickOffsets.push(frac);
  }
  return { keyframes, tickOffsets };
}

function animateReel(reelIndex, finalSymbols, startDelay, duration) {
  return new Promise((resolve) => {
    const reelEl = document.querySelector(`.reel[data-reel="${reelIndex}"]`);
    const stripEl = reelEl.querySelector('.reel-strip');
    const cellSize = getCellSizePx();
    const prefixCount = 14 + Math.floor(Math.random() * 5);
    const suffixCount = 2;

    stripEl.style.transition = 'none';
    stripEl.style.transform = 'translateY(0px)';
    stripEl.innerHTML = '';

    for (let i = 0; i < prefixCount; i++) {
      stripEl.appendChild(makeSymbolCell(weightedPick(state.strip), reelIndex, -1, false));
    }
    finalSymbols.forEach((sym, row) => stripEl.appendChild(makeSymbolCell(sym, reelIndex, row, true)));
    for (let i = 0; i < suffixCount; i++) {
      stripEl.appendChild(makeSymbolCell(weightedPick(state.strip), reelIndex, -1, false));
    }

    reelEl.dataset.prefixCount = prefixCount;
    const { keyframes, tickOffsets } = buildReelKeyframes(prefixCount, cellSize);

    // Force reflow so the reset transform above is committed before animating.
    void stripEl.offsetHeight;

    setTimeout(() => {
      // Soft mechanical clicks during the decelerating tail, landing exactly
      // in sync with each visible cell-jump.
      tickOffsets.slice(0, -1).forEach((frac) => {
        setTimeout(() => SFX.playReelTick(reelIndex), frac * duration);
      });

      const anim = stripEl.animate(keyframes, { duration, fill: 'forwards' });
      anim.onfinish = () => {
        SFX.playReelStop(reelIndex);
        reelEl.classList.add('bounce');
        setTimeout(() => reelEl.classList.remove('bounce'), 220);
        resolve();
      };
    }, startDelay);
  });
}

async function spin() {
  if (state.isSpinning) return;
  if (state.spinsLeft <= 0 && state.freeSpinsLeft <= 0) return;

  state.isSpinning = true;
  setSpinButtonEnabled(false);
  hideBanner();
  clearPaylineHighlights();
  SFX.startSpinLoop();

  const usingFreeSpin = state.freeSpinsLeft > 0;

  const grid = [];
  for (let r = 0; r < CONFIG.reelCount; r++) grid.push(spinReelSymbols(state.strip));

  if (state.luckySpinReady) {
    applyLuckyModifiers(grid);
    state.luckySpinReady = false;
  }

  const animPromises = [];
  for (let i = 0; i < CONFIG.reelCount; i++) {
    animPromises.push(animateReel(i, grid[i], i * 260, 650 + i * 170));
  }
  await Promise.all(animPromises);
  SFX.stopSpinLoop();

  const results = evaluateGrid(grid);
  const spinMultiplier = usingFreeSpin ? state.freeSpinMultiplier : 1;

  if (usingFreeSpin) state.freeSpinsLeft--; else state.spinsLeft--;

  await presentResults(results, spinMultiplier, usingFreeSpin);

  state.isSpinning = false;
  updateHUD();
  checkRoundEnd();
  setSpinButtonEnabled(true);
}

/* ---------------------------------------------------------
   EVALUATION
   --------------------------------------------------------- */
function getPayout(symbolKey, count) {
  const sym = SYMBOLS[symbolKey];
  if (!sym || !sym.pay) return 0;
  return sym.pay[count] || 0;
}

function countMatches(lineSymbols) {
  let baseIdx = 0;
  while (lineSymbols[baseIdx] === 'wild' && baseIdx < lineSymbols.length - 1) baseIdx++;
  const base = lineSymbols[baseIdx];
  let count = 0;
  for (let i = 0; i < lineSymbols.length; i++) {
    if (lineSymbols[i] === base || lineSymbols[i] === 'wild') count++;
    else break;
  }
  return { count, symbol: base };
}

function evaluateGrid(grid) {
  const paylineResults = [];
  PAYLINES.forEach((rows, idx) => {
    const lineSymbols = rows.map((row, reel) => grid[reel][row]);
    const { count, symbol } = countMatches(lineSymbols);
    if (count >= 3 && symbol !== 'skull' && symbol !== 'bonus' && symbol !== 'coin') {
      const payout = getPayout(symbol, count) * state.globalMultiplier;
      if (payout > 0) paylineResults.push({ paylineIndex: idx, rows, count, symbol, payout });
    }
  });

  let scatterCount = 0, cloverCount = 0, skullCount = 0, coinBonus = 0;
  grid.forEach((reel) => reel.forEach((sym) => {
    if (sym === 'bonus') scatterCount++;
    if (sym === 'clover') cloverCount++;
    if (sym === 'skull') skullCount++;
    if (sym === 'coin') coinBonus += SYMBOLS.coin.flatValue * state.coinBonusMultiplier;
  }));

  return { grid, paylineResults, scatterCount, cloverCount, skullCount, coinBonus };
}

/* ---------------------------------------------------------
   PRESENTATION / VFX
   --------------------------------------------------------- */
function getWinTier(amount) {
  const q = state.quota;
  if (amount >= q * 2) return 'jackpot';
  if (amount >= q * 1) return 'mega';
  if (amount >= q * 0.5) return 'big';
  if (amount >= q * 0.22) return 'nice';
  return null;
}

async function showWinTierCelebration(tier, amount) {
  const cfg = {
    nice: { text: 'NICE WIN', shake: 'sm', confetti: 18, wait: 900 },
    big: { text: 'BIG WIN!', shake: 'md', confetti: 40, wait: 1200 },
    mega: { text: 'MEGA WIN!!', shake: 'lg', confetti: 85, wait: 1500 },
    jackpot: { text: 'JACKPOT!!!', shake: 'lg', confetti: 150, wait: 1900 },
  }[tier];
  showBigBanner(cfg.text, `+${formatNum(amount)} coins`);
  screenShake(cfg.shake);
  spawnConfettiBurst(cfg.confetti);
  if (tier === 'jackpot' || tier === 'mega') {
    flashScreen('rgba(245,245,242,0.35)');
    SFX.playFanfare(true);
  } else {
    SFX.playFanfare(false);
  }
  await sleep(cfg.wait);
}

function highlightPayline(rows) {
  rows.forEach((row, reelIdx) => {
    const cell = document.querySelector(`.reel[data-reel="${reelIdx}"] .final-symbol[data-row="${row}"]`);
    if (cell) cell.classList.add('winning-cell');
  });
  drawPaylineLine(rows);
}

function clearPaylineHighlights() {
  document.querySelectorAll('.winning-cell').forEach((el) => el.classList.remove('winning-cell'));
  const svg = document.getElementById('payline-svg');
  if (svg) svg.innerHTML = '';
}

function drawPaylineLine(rows) {
  const reelsEl = document.getElementById('reels');
  const svg = document.getElementById('payline-svg');
  const rect = reelsEl.getBoundingClientRect();
  svg.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`);
  const pts = [];
  rows.forEach((row, reelIdx) => {
    const cell = document.querySelector(`.reel[data-reel="${reelIdx}"] .final-symbol[data-row="${row}"]`);
    if (!cell) return;
    const cr = cell.getBoundingClientRect();
    pts.push(`${cr.left - rect.left + cr.width / 2},${cr.top - rect.top + cr.height / 2}`);
  });
  if (pts.length < 2) return;
  const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
  poly.setAttribute('points', pts.join(' '));
  poly.setAttribute('class', 'payline-line');
  svg.appendChild(poly);
}

function spawnCoinBurstAtPayline(rows) {
  rows.forEach((row, reelIdx) => {
    const cell = document.querySelector(`.reel[data-reel="${reelIdx}"] .final-symbol[data-row="${row}"]`);
    if (!cell) return;
    const r = cell.getBoundingClientRect();
    spawnParticles(r.left + r.width / 2, r.top + r.height / 2, 7, ['#e8e8ea', '#9a9a9e', '#ffffff'], 'coin');
  });
}

function spawnCoinPopupsForSymbol(grid, symbolKey) {
  for (let reelIdx = 0; reelIdx < grid.length; reelIdx++) {
    for (let row = 0; row < 3; row++) {
      if (grid[reelIdx][row] === symbolKey) {
        const cell = document.querySelector(`.reel[data-reel="${reelIdx}"] .final-symbol[data-row="${row}"]`);
        if (cell) {
          const r = cell.getBoundingClientRect();
          spawnParticles(r.left + r.width / 2, r.top + r.height / 2, 5, ['#e8e8ea', '#ffffff'], 'coin');
          cell.classList.add('winning-cell');
          setTimeout(() => cell.classList.remove('winning-cell'), 850);
        }
      }
    }
  }
}

async function presentResults(results, spinMultiplier, wasFreeSpin) {
  let totalGain = 0;

  for (const win of results.paylineResults) {
    highlightPayline(win.rows);
    const amount = Math.round(win.payout * spinMultiplier);
    totalGain += amount;
    state.coins += amount;
    state.coinsThisRound += amount;
    spawnCoinBurstAtPayline(win.rows);
    SFX.playCoinBlip(win.count);
    updateHUD();
    await sleep(260);
  }

  if (results.coinBonus > 0) {
    const amount = Math.round(results.coinBonus * spinMultiplier);
    totalGain += amount;
    state.coins += amount;
    state.coinsThisRound += amount;
    spawnCoinPopupsForSymbol(results.grid, 'coin');
    SFX.playCoinBlip(3);
    updateHUD();
    await sleep(200);
  }

  if (results.paylineResults.length > 0) {
    state.streak++;
    state.stats.longestStreak = Math.max(state.stats.longestStreak, state.streak);
  } else {
    state.streak = 0;
  }

  if (results.cloverCount > 0) {
    state.luckMeter += results.cloverCount;
    if (state.luckMeter >= state.luckMeterMax) {
      state.luckySpinReady = true;
      state.luckMeter = 0;
      showToast('LUCKY SPIN READY');
    }
  }

  if (results.skullCount >= 3) {
    showToast('UNLUCKY...');
    flashScreen('rgba(143,10,28,0.32)');
    SFX.playUnlucky();
  }

  if (totalGain > 0) {
    state.stats.biggestWin = Math.max(state.stats.biggestWin, totalGain);
    const tier = getWinTier(totalGain);
    if (tier) await showWinTierCelebration(tier, totalGain);
    showLastWin(totalGain);
  }

  if (results.scatterCount >= 3 && !wasFreeSpin) {
    triggerFreeSpins(CONFIG.freeSpinBase);
    await sleep(1500);
  }

  checkQuotaReached();
}

/* ---------------------------------------------------------
   PARTICLES (canvas)
   --------------------------------------------------------- */
const fxCanvas = document.getElementById('fx-canvas');
const fxCtx = fxCanvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  fxCanvas.width = window.innerWidth * dpr;
  fxCanvas.height = window.innerHeight * dpr;
  fxCanvas.style.width = window.innerWidth + 'px';
  fxCanvas.style.height = window.innerHeight + 'px';
  fxCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// 3D parallax: rotate the machine scene toward the pointer (or a touch
// drag, or a gentle idle sway when nothing is interacting with it). The
// depth comes entirely from CSS translateZ on layers inside #machine-3d
// (see style.css) — this just supplies the rotation, and perspective
// projection does the rest, so the parallax is geometrically correct
// rather than faked with manual per-layer offsets.
function initParallax() {
  const scene = document.getElementById('machine-3d');
  if (!scene) return;
  const maxTilt = 9;
  let targetX = 0, targetY = 0, curX = 0, curY = 0;
  let idle = true, idleAngle = Math.random() * 10;
  let idleTimer = null;

  function fromPointer(clientX, clientY) {
    const rect = scene.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width - 0.5;
    const py = (clientY - rect.top) / rect.height - 0.5;
    targetY = Math.max(-1, Math.min(1, px)) * maxTilt;
    targetX = Math.max(-1, Math.min(1, -py)) * maxTilt;
  }

  function wake() {
    idle = false;
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => { idle = true; }, 1800);
  }

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') { wake(); fromPointer(e.clientX, e.clientY); }
  });
  scene.addEventListener('touchmove', (e) => {
    if (e.touches[0]) { wake(); fromPointer(e.touches[0].clientX, e.touches[0].clientY); }
  }, { passive: true });
  window.addEventListener('pointerleave', () => { idleTimer = setTimeout(() => { idle = true; }, 400); });

  function tick() {
    if (idle) {
      idleAngle += 0.006;
      targetY = Math.sin(idleAngle) * (maxTilt * 0.45);
      targetX = Math.cos(idleAngle * 0.6) * (maxTilt * 0.28);
    }
    curX += (targetX - curX) * 0.08;
    curY += (targetY - curY) * 0.08;
    scene.style.transform = `rotateX(${curX.toFixed(2)}deg) rotateY(${curY.toFixed(2)}deg)`;
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}
initParallax();

function spawnParticles(x, y, count, colors, shape) {
  for (let i = 0; i < count; i++) {
    particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: -(Math.random() * 8 + 3),
      g: 0.32,
      size: Math.random() * 5 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: 0.014 + Math.random() * 0.012,
      rot: Math.random() * 360,
      spin: (Math.random() - 0.5) * 18,
      shape: shape || 'square',
    });
  }
}

function spawnConfettiBurst(count) {
  const colors = ['#e0102a', '#ff3b52', '#f5f5f2', '#c7c7cb', '#8f0a1c'];
  const w = window.innerWidth;
  for (let i = 0; i < count; i++) {
    particles.push({
      x: Math.random() * w,
      y: -20,
      vx: (Math.random() - 0.5) * 3,
      vy: Math.random() * 2 + 2,
      g: 0.15,
      size: Math.random() * 6 + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 1,
      decay: 0.006 + Math.random() * 0.006,
      rot: Math.random() * 360,
      spin: (Math.random() - 0.5) * 14,
      shape: 'confetti',
    });
  }
}

function particleTick() {
  fxCtx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  particles = particles.filter((p) => p.life > 0 && p.y < window.innerHeight + 60);
  particles.forEach((p) => {
    p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life -= p.decay; p.rot += p.spin;
    fxCtx.save();
    fxCtx.globalAlpha = Math.max(p.life, 0);
    fxCtx.translate(p.x, p.y);
    fxCtx.rotate((p.rot * Math.PI) / 180);
    fxCtx.fillStyle = p.color;
    if (p.shape === 'coin') {
      fxCtx.beginPath();
      fxCtx.ellipse(0, 0, p.size, p.size * 0.82, 0, 0, Math.PI * 2);
      fxCtx.fill();
      fxCtx.strokeStyle = 'rgba(255,255,255,0.5)';
      fxCtx.lineWidth = 1;
      fxCtx.stroke();
    } else {
      fxCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
    }
    fxCtx.restore();
  });
  requestAnimationFrame(particleTick);
}
requestAnimationFrame(particleTick);

/* ---------------------------------------------------------
   SCREEN-LEVEL FX HELPERS
   --------------------------------------------------------- */
function screenShake(intensity) {
  const el = document.getElementById('app');
  el.classList.remove('shake-sm', 'shake-md', 'shake-lg');
  void el.offsetWidth;
  el.classList.add('shake-' + intensity);
  setTimeout(() => el.classList.remove('shake-' + intensity), 600);
}

function flashScreen(color) {
  const el = document.getElementById('screen-flash');
  el.style.background = color;
  el.classList.remove('active');
  void el.offsetWidth;
  el.classList.add('active');
}

function showBigBanner(title, subtitle) {
  const el = document.getElementById('win-banner');
  el.innerHTML = `<div class="banner-title">${title}</div><div class="banner-sub">${subtitle}</div>`;
  el.classList.remove('hidden', 'pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

function showToast(text) {
  const el = document.getElementById('win-banner');
  el.innerHTML = `<div class="banner-toast">${text}</div>`;
  el.classList.remove('hidden', 'pop');
  void el.offsetWidth;
  el.classList.add('pop');
  setTimeout(hideBanner, 1300);
}

function hideBanner() {
  document.getElementById('win-banner').classList.add('hidden');
}

function showLastWin(amount) {
  const el = document.getElementById('last-win-display');
  el.textContent = `+${formatNum(amount)}`;
  el.classList.remove('show');
  void el.offsetWidth;
  el.classList.add('show');
}

/* ---------------------------------------------------------
   ROUND FLOW
   --------------------------------------------------------- */
function checkQuotaReached() {
  // Safe to call every spin: showing an already-shown button is a no-op.
  // Free spins hide it (see triggerFreeSpins) so it can't be clicked mid-bonus,
  // and it correctly reappears here right after the bonus round ends.
  if (state.coinsThisRound >= state.quota && state.freeSpinsLeft <= 0) {
    showCashOutButton();
  }
}

function checkRoundEnd() {
  if (state.freeSpinsLeft > 0) return; // bonus round still running

  if (state.coinsThisRound >= state.quota && state.spinsLeft <= 0) {
    hideCashOutButton();
    roundClearSequence();
    return;
  }
  if (state.spinsLeft <= 0 && state.coinsThisRound < state.quota) {
    if (state.hasInsurance && !state.usedInsurance) {
      state.usedInsurance = true;
      state.spinsLeft += 3;
      showToast('INSURANCE! +3 SPINS');
      updateHUD();
    } else {
      gameOver();
    }
  }
}

function cashOut() {
  if (state.isSpinning || state.freeSpinsLeft > 0) return;
  const bonus = state.spinsLeft * CONFIG.cashOutPerSpin;
  state.coins += bonus;
  state.spinsLeft = 0;
  hideCashOutButton();
  showToast(`CASHED OUT +${bonus}`);
  updateHUD();
  roundClearSequence();
}

function triggerFreeSpins(base) {
  const total = base + (state.freeSpinBonusCount || 0);
  state.freeSpinsLeft += total;
  hideCashOutButton();
  showBigBanner('FREE SPINS!', `+${total} spins at 2x pay`);
  flashScreen('rgba(245,245,242,0.3)');
  SFX.playFreeSpins();
  updateHUD();
}

async function roundClearSequence() {
  state.stats.roundsCleared++;
  SFX.playQuotaMet();
  showBigBanner('ROUND CLEAR', `+${formatNum(state.coinsThisRound)} coins earned`);
  await sleep(1300);
  openShop();
}

/* ---------------------------------------------------------
   SHOP
   --------------------------------------------------------- */
function generateShopOffers(count) {
  const pool = UPGRADE_POOL.filter((u) => !u.available || u.available(state));
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map((u) => ({
    ...u,
    cost: scaledCost(u.baseCost, state.round),
    key: u.id + '_' + Math.random().toString(36).slice(2, 8),
  }));
}

function openShop() {
  state.shopOffers = generateShopOffers(CONFIG.shopCardCount);
  document.getElementById('shop-round').textContent = state.round;
  renderShop();
  updateShopHUD();
  showScreen('shop-screen');
}

function renderShop() {
  const container = document.getElementById('shop-cards');
  container.innerHTML = '';
  state.shopOffers.forEach((offer) => {
    const card = document.createElement('div');
    card.className = 'shop-card';
    card.dataset.key = offer.key;
    const affordable = state.coins >= offer.cost;
    card.innerHTML = `
      <div class="shop-card-icon">${upgradeIconSVG(offer)}</div>
      <div class="shop-card-name">${offer.name}</div>
      <div class="shop-card-desc">${offer.desc}</div>
      <button class="shop-buy-btn${affordable ? '' : ' unaffordable'}" data-key="${offer.key}"><span class="inline-icon"><svg viewBox="0 0 64 64" aria-hidden="true">${SYMBOLS.coin.svg}</svg></span>${offer.cost}</button>
    `;
    container.appendChild(card);
  });
  container.querySelectorAll('.shop-buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => buyUpgrade(btn.dataset.key));
  });
}

function updateShopHUD() {
  document.getElementById('shop-coin-display').textContent = formatNum(state.coins);
  document.getElementById('reroll-cost').textContent = CONFIG.rerollCost;
}

function shakeCard(key) {
  const card = document.querySelector(`.shop-card[data-key="${key}"]`);
  if (!card) return;
  card.classList.remove('shake-x');
  void card.offsetWidth;
  card.classList.add('shake-x');
}

function buyUpgrade(key) {
  const idx = state.shopOffers.findIndex((o) => o.key === key);
  if (idx === -1) return;
  const offer = state.shopOffers[idx];
  if (state.coins < offer.cost) {
    SFX.playError();
    shakeCard(key);
    return;
  }
  state.coins -= offer.cost;
  offer.apply(state);
  SFX.playPurchase();

  const pool = UPGRADE_POOL.filter((u) => (!u.available || u.available(state)) && u.id !== offer.id);
  const replacement = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  if (replacement) {
    state.shopOffers[idx] = {
      ...replacement,
      cost: scaledCost(replacement.baseCost, state.round),
      key: replacement.id + '_' + Math.random().toString(36).slice(2, 8),
    };
  } else {
    state.shopOffers.splice(idx, 1);
  }
  renderShop();
  updateShopHUD();
}

function rerollShop() {
  if (state.coins < CONFIG.rerollCost) { SFX.playError(); return; }
  state.coins -= CONFIG.rerollCost;
  state.shopOffers = generateShopOffers(state.shopOffers.length || CONFIG.shopCardCount);
  SFX.playPurchase();
  renderShop();
  updateShopHUD();
}

function continueToNextRound() {
  state.round += 1;
  state.quota = calcQuota(state.round);
  state.spinsLeft = state.spinsTotal;
  state.coinsThisRound = 0;
  hideCashOutButton();
  buildMachineDOM();
  showScreen('game-screen');
  updateHUD();
}

/* ---------------------------------------------------------
   GAME OVER / RESET
   --------------------------------------------------------- */
function gameOver() {
  SFX.stopSpinLoop();
  SFX.playGameOver();
  document.getElementById('stat-rounds').textContent = state.stats.roundsCleared;
  document.getElementById('stat-coins').textContent = formatNum(state.coins);
  document.getElementById('stat-bigwin').textContent = formatNum(state.stats.biggestWin);
  document.getElementById('stat-streak').textContent = state.stats.longestStreak;
  showScreen('gameover-screen');
}

function beginNewGame() {
  SFX.init();
  state = freshState();
  lastRenderedCoins = 0;
  buildMachineDOM();
  hideCashOutButton();
  hideBanner();
  showScreen('game-screen');
  updateHUD();
  SFX.startAmbient();
}

/* ---------------------------------------------------------
   HUD
   --------------------------------------------------------- */
function setSpinButtonEnabled(enabled) {
  const btn = document.getElementById('spin-btn');
  btn.disabled = !enabled;
  btn.classList.toggle('disabled', !enabled);
  const lever = document.getElementById('lever-wrap');
  lever.disabled = !enabled;
  lever.classList.toggle('disabled', !enabled);
}

function pullLever() {
  const lever = document.getElementById('lever-wrap');
  if (lever.classList.contains('pulling')) return;
  lever.classList.add('pulling');
  SFX.playClick();
  setTimeout(() => lever.classList.remove('pulling'), 500);
  spin();
}
function showCashOutButton() { document.getElementById('cashout-btn').classList.remove('hidden'); }
function hideCashOutButton() { document.getElementById('cashout-btn').classList.add('hidden'); }

function updateHUD() {
  document.getElementById('round-display').textContent = state.round;

  const coinEl = document.getElementById('coin-display');
  animateCount(coinEl, lastRenderedCoins, state.coins);
  lastRenderedCoins = state.coins;

  document.getElementById('spins-display').textContent = state.freeSpinsLeft > 0
    ? `${state.freeSpinsLeft} free`
    : state.spinsLeft;

  document.getElementById('quota-target').textContent = formatNum(state.quota);
  document.getElementById('quota-current').textContent = formatNum(Math.min(state.coinsThisRound, state.quota));
  const pct = Math.min(100, (state.coinsThisRound / state.quota) * 100);
  document.getElementById('quota-fill').style.width = pct + '%';

  document.getElementById('luck-fill').style.width = (state.luckMeter / state.luckMeterMax * 100) + '%';

  const streakBadge = document.getElementById('streak-badge');
  if (state.streak >= 2) {
    streakBadge.classList.remove('hidden');
    document.getElementById('streak-mult').textContent = 'x' + getStreakMultiplier().toFixed(1);
  } else {
    streakBadge.classList.add('hidden');
  }

  const freeTag = document.getElementById('free-spins-tag');
  if (state.freeSpinsLeft > 0) {
    freeTag.classList.remove('hidden');
    document.getElementById('free-spins-count').textContent = state.freeSpinsLeft;
  } else {
    freeTag.classList.add('hidden');
  }
}

/* ---------------------------------------------------------
   EVENT WIRING
   --------------------------------------------------------- */
document.getElementById('start-btn').addEventListener('click', beginNewGame);
document.getElementById('restart-btn').addEventListener('click', beginNewGame);

document.getElementById('howto-btn').addEventListener('click', () => {
  SFX.playClick();
  document.getElementById('howto-modal').classList.remove('hidden');
});
document.querySelectorAll('.close-modal').forEach((btn) => {
  btn.addEventListener('click', () => {
    SFX.playClick();
    btn.closest('.modal').classList.add('hidden');
  });
});

document.getElementById('spin-btn').addEventListener('click', spin);
document.getElementById('lever-wrap').addEventListener('click', pullLever);
document.getElementById('cashout-btn').addEventListener('click', cashOut);

document.getElementById('mute-btn').innerHTML = UI_ICONS.speakerOn;
document.getElementById('mute-btn').addEventListener('click', () => {
  const muted = SFX.toggleMute();
  document.getElementById('mute-btn').innerHTML = muted ? UI_ICONS.speakerOff : UI_ICONS.speakerOn;
});
document.getElementById('luck-icon').innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${SYMBOLS.clover.svg}</svg>`;
document.getElementById('shop-coin-icon').innerHTML = `<svg viewBox="0 0 64 64" aria-hidden="true">${SYMBOLS.coin.svg}</svg>`;

document.getElementById('reroll-btn').addEventListener('click', rerollShop);
document.getElementById('continue-btn').addEventListener('click', () => {
  SFX.playClick();
  continueToNextRound();
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    const gameScreen = document.getElementById('game-screen');
    if (!gameScreen.classList.contains('hidden') && !state.isSpinning) {
      e.preventDefault();
      spin();
    }
  }
});
