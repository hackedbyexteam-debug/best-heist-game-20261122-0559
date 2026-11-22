// main.js — game flow: title, playing, paused, level complete, busted, victory.
// Owns the HUD (DOM), the animation loop, and the bridge to the engine.

import * as C from './config.js';
import { LEVELS } from './levels.js';
import { createLevelState, updateLevel, levelScoreBreakdown, throwCoin } from './engine.js';
import { Input } from './input.js';
import * as Render from './render.js';
import * as Audio from './audio.js';
import { mulberry32 } from './random.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hud = {
  level: document.getElementById('hud-level'),
  score: document.getElementById('hud-score'),
  loot: document.getElementById('hud-loot'),
  coins: document.getElementById('hud-coins'),
  alarmFill: document.getElementById('hud-alarm-fill'),
  alarmLabel: document.getElementById('hud-alarm-label'),
  lives: document.getElementById('hud-lives'),
  timer: document.getElementById('hud-timer'),
  objective: document.getElementById('hud-objective'),
  toast: document.getElementById('toast'),
  muteBtn: document.getElementById('btn-mute'),
  pauseBtn: document.getElementById('btn-pause'),
  restartBtn: document.getElementById('btn-restart'),
};

const input = new Input(canvas);
const BEST_KEY = 'midnight-vault-best-score';

let screen = 'title'; // title | playing | paused | levelComplete | gameOver | victory
let levelIndex = 0;
let levelState = null;
let totalScore = 0;
let totalLoot = 0;
let totalBonuses = 0;
let totalCoinCost = 0; // coin tosses spent across the run, in score dollars
let lives = C.STARTING_LIVES;
let lastBreakdown = null;
let toastTimer = null;
let lastTime = 0;

function loadBestScore() {
  try {
    return Number(window.localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBestScore(score) {
  try {
    if (score > loadBestScore()) window.localStorage.setItem(BEST_KEY, String(score));
  } catch {
    // storage unavailable (file://, private mode): best score just isn't kept
  }
}

function showToast(text, ms = 2600) {
  hud.toast.textContent = text;
  hud.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hud.toast.classList.remove('show'), ms);
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function money(n) {
  return `$${n.toLocaleString('en-US')}`;
}

function loadLevel(index) {
  const rng = mulberry32(0xC0FFEE + index * 7919);
  levelState = createLevelState(LEVELS[index], rng);
  hud.objective.textContent = 'Objective: crack the VAULT, grab the loot, reach the EXIT.';
}

function startGame() {
  Audio.unlockAudio();
  levelIndex = 0;
  totalScore = 0;
  totalLoot = 0;
  totalBonuses = 0;
  totalCoinCost = 0;
  lives = C.STARTING_LIVES;
  loadLevel(0);
  screen = 'playing';
}

function restartLevel() {
  loadLevel(levelIndex);
  screen = 'playing';
}

function handleEngineEvent(event) {
  switch (event.type) {
    case 'step':
      Audio.playStep();
      break;
    case 'pickup':
      Audio.playPickup(event.kind);
      showToast(`${event.kind.toUpperCase()} grabbed — +${money(event.value)}`, 1400);
      break;
    case 'coin':
      Audio.playCoin();
      showToast(`Coin tossed — −${money(event.cost)} (${event.left} left this job)`, 1800);
      break;
    case 'distracted':
      showToast('A guard heard the coin — he is going to look!', 2200);
      break;
    case 'vault':
      Audio.playVault();
      showToast(`VAULT CRACKED — +${money(event.value)}! Get to the EXIT!`, 3400);
      hud.objective.textContent = 'Vault cracked! Reach the green EXIT — now!';
      break;
    case 'spotted':
      Audio.playSpotted();
      showToast('SPOTTED! Break line of sight!', 1800);
      break;
    case 'chase':
      showToast('A guard is chasing you — run!', 2000);
      break;
    case 'lockdown':
      showToast('LOCKDOWN! Every guard is hunting you!', 3200);
      break;
    case 'lockdownEnd':
      showToast('Lockdown lifted — stay out of sight.', 2200);
      break;
    case 'caught': {
      Audio.playCaught();
      Audio.setAlarmSound(false);
      lives -= 1;
      if (lives > 0) {
        showToast(`CAUGHT! ${lives} ${lives === 1 ? 'life' : 'lives'} left — the job restarts.`, 2600);
        screen = 'caught';
        setTimeout(() => {
          if (screen === 'caught') restartLevel(); // restartLevel sets screen back to 'playing'
        }, 1200);
      } else {
        screen = 'gameOver';
        saveBestScore(totalScore);
      }
      break;
    }
    case 'levelComplete': {
      Audio.playLevelComplete();
      Audio.setAlarmSound(false);
      lastBreakdown = levelScoreBreakdown(levelState);
      totalScore += lastBreakdown.total;
      totalLoot += lastBreakdown.loot;
      totalBonuses += lastBreakdown.timeBonus + lastBreakdown.stealthBonus;
      totalCoinCost += lastBreakdown.coinCost;
      if (levelIndex + 1 >= LEVELS.length) {
        screen = 'victory';
        Audio.playVictory();
        saveBestScore(totalScore);
      } else {
        screen = 'levelComplete';
      }
      break;
    }
    default:
      break;
  }
}

function updateHUD() {
  if (!levelState) return;
  hud.level.textContent = `JOB ${levelIndex + 1}/3 — ${LEVELS[levelIndex].name.toUpperCase()}`;
  hud.score.textContent = money(totalScore + levelState.score);
  const lootTotal = levelState.loot.length;
  const lootGot = levelState.loot.filter((item) => item.taken).length + (levelState.vault.taken ? 1 : 0);
  hud.loot.textContent = `LOOT ${lootGot}/${lootTotal + 1}`;
  hud.coins.textContent = `COINS ${'●'.repeat(Math.max(0, levelState.coinsLeft))}${'○'.repeat(Math.max(0, C.COIN_MAX_PER_JOB - levelState.coinsLeft))}`;
  const alarm = Math.round(levelState.alarm);
  hud.alarmFill.style.width = `${alarm}%`;
  hud.alarmFill.style.background = alarm >= 70 ? '#ff5040' : alarm >= 35 ? '#ffd24d' : '#3dff8e';
  hud.alarmLabel.textContent = levelState.lockdownTimer > 0 ? 'LOCKDOWN!' : `ALARM ${alarm}%`;
  hud.alarmLabel.style.color = alarm >= 70 ? '#ff5040' : alarm >= 35 ? '#ffd24d' : '#3dff8e';
  hud.lives.innerHTML = `LIVES ${'●'.repeat(Math.max(0, lives))}${'○'.repeat(Math.max(0, C.STARTING_LIVES - lives))}`;
  hud.timer.textContent = formatTime(levelState.time);
  Audio.setAlarmSound(levelState.alarm >= 60 && screen === 'playing');
}

function frame(time) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000 || 0));
  lastTime = time;

  if (screen === 'title') {
    Render.drawTitle(ctx, loadBestScore());
    return;
  }
  if (screen === 'paused') {
    Render.drawGame(ctx, levelState);
    Render.drawPaused(ctx);
    return;
  }
  if (screen === 'levelComplete') {
    Render.drawGame(ctx, levelState);
    Render.drawLevelComplete(ctx, LEVELS[levelIndex].name, lastBreakdown, levelIndex, LEVELS.length);
    return;
  }
  if (screen === 'gameOver') {
    Render.drawGame(ctx, levelState);
    Render.drawGameOver(ctx, totalScore, LEVELS[levelIndex].name);
    return;
  }
  if (screen === 'victory') {
    Render.drawGame(ctx, levelState);
    Render.drawVictory(ctx, totalScore, { loot: totalLoot, timeBonus: totalBonuses, stealthBonus: 0, coinCost: totalCoinCost });
    return;
  }

  // Playing (and the brief 'caught' beat, which freezes the room).
  if (screen === 'playing') {
    const keys = input.moveVector();
    let moveX = keys.x;
    let moveY = keys.y;
    if (moveX === 0 && moveY === 0 && input.moveTarget) {
      const dx = input.moveTarget.x - levelState.player.x;
      const dy = input.moveTarget.y - levelState.player.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 0.12) {
        input.clearMoveTarget();
      } else {
        moveX = dx / dist;
        moveY = dy / dist;
      }
    } else if (moveX !== 0 || moveY !== 0) {
      input.clearMoveTarget();
    }
    const events = [];
    updateLevel(levelState, { moveX, moveY, sneaking: input.sneaking }, dt, events);
    events.forEach(handleEngineEvent);
  }
  Render.drawGame(ctx, levelState);
  updateHUD();
}

function advance() {
  Audio.unlockAudio();
  Audio.playClick();
  if (screen === 'title') {
    startGame();
  } else if (screen === 'levelComplete') {
    levelIndex += 1;
    loadLevel(levelIndex);
    screen = 'playing';
  } else if (screen === 'gameOver') {
    lives = C.STARTING_LIVES;
    totalScore = 0;
    totalLoot = 0;
    totalBonuses = 0;
    totalCoinCost = 0;
    loadLevel(levelIndex);
    screen = 'playing';
  } else if (screen === 'victory') {
    startGame();
  }
}

input.onPress((key) => {
  Audio.unlockAudio();
  if (key === 'enter' || key === ' ') {
    if (screen !== 'playing' && screen !== 'paused' && screen !== 'caught') advance();
  } else if (key === 'm') {
    Audio.setMuted(!Audio.isMuted());
    hud.muteBtn.textContent = Audio.isMuted() ? 'SOUND: OFF' : 'SOUND: ON';
  } else if (key === 'p') {
    if (screen === 'playing') screen = 'paused';
    else if (screen === 'paused') screen = 'playing';
  } else if (key === 'r') {
    if (screen === 'playing' || screen === 'paused') restartLevel();
  } else if (key === 'q') {
    // The coin toss tool: costs score, at most 3 per job.
    if (screen === 'playing' && levelState) {
      const events = [];
      const result = throwCoin(levelState, events);
      if (!result.ok) {
        if (result.reason === 'empty') showToast('No coins left this job — make them count!', 1800);
        else if (result.reason === 'blocked') showToast('No room to toss a coin here.', 1800);
      }
      events.forEach(handleEngineEvent);
    }
  }
});

input.onClick(() => {
  Audio.unlockAudio();
  if (screen !== 'playing') advance();
});

hud.muteBtn.addEventListener('click', () => {
  Audio.unlockAudio();
  Audio.setMuted(!Audio.isMuted());
  hud.muteBtn.textContent = Audio.isMuted() ? 'SOUND: OFF' : 'SOUND: ON';
});
hud.pauseBtn.addEventListener('click', () => {
  if (screen === 'playing') screen = 'paused';
  else if (screen === 'paused') screen = 'playing';
});
hud.restartBtn.addEventListener('click', () => {
  if (screen === 'playing' || screen === 'paused') restartLevel();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && screen === 'playing') screen = 'paused';
});

// A ?shot= URL renders one fixed scene for screenshots instead of playing.
if (!applyShot({ canvas, ctx, hud, LEVELS, createLevelState, mulberry32, Render, updateHUD })) {
  loadLevel(0);
  requestAnimationFrame(frame);
}
