// render.js — everything drawn on the canvas: the room, vision cones, cameras,
// loot, the thief, the guards, particles and the menu / end screens.

import * as C from './config.js';
import { isWall } from './levels.js';

const T = C.TILE;

function tileToPx(v) {
  return v * T;
}

function drawCone(ctx, x, y, facing, range, halfAngle, fill, edge) {
  const px = tileToPx(x);
  const py = tileToPx(y);
  const r = range * T;
  ctx.beginPath();
  ctx.moveTo(px, py);
  ctx.arc(px, py, r, facing - halfAngle, facing + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = edge;
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawFloor(ctx, state) {
  for (let ty = 0; ty < state.height; ty++) {
    for (let tx = 0; tx < state.width; tx++) {
      const px = tx * T;
      const py = ty * T;
      if (state.grid[ty][tx] === 1) {
        ctx.fillStyle = C.COLORS.wall;
        ctx.fillRect(px, py, T, T);
        ctx.fillStyle = C.COLORS.wallTop;
        ctx.fillRect(px, py, T, 4);
        ctx.fillStyle = C.COLORS.wallEdge;
        ctx.fillRect(px, py + T - 2, T, 2);
      } else {
        ctx.fillStyle = (tx + ty) % 2 === 0 ? C.COLORS.floorA : C.COLORS.floorB;
        ctx.fillRect(px, py, T, T);
      }
    }
  }
  // A carpet runner leading to the vault.
  const vx = tileToPx(state.vault.x);
  const vy = tileToPx(state.vault.y);
  ctx.fillStyle = C.COLORS.carpet;
  ctx.fillRect(vx - 3.5 * T, vy - 1.5 * T, 7 * T, 3 * T);
  ctx.strokeStyle = 'rgba(255, 210, 77, 0.25)';
  ctx.lineWidth = 2;
  ctx.strokeRect(vx - 3.5 * T + 4, vy - 1.5 * T + 4, 7 * T - 8, 3 * T - 8);
}

function drawExit(ctx, state) {
  const px = tileToPx(state.exit.x);
  const py = tileToPx(state.exit.y);
  const open = state.vault.taken;
  const pulse = 0.6 + 0.4 * Math.sin(performance.now() / 280);
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = open ? `rgba(61, 255, 142, ${0.25 + 0.35 * pulse})` : 'rgba(90, 107, 98, 0.35)';
  ctx.fillRect(-T / 2 + 3, -T / 2 + 3, T - 6, T - 6);
  ctx.strokeStyle = open ? C.COLORS.exit : C.COLORS.exitLocked;
  ctx.lineWidth = 3;
  ctx.strokeRect(-T / 2 + 3, -T / 2 + 3, T - 6, T - 6);
  ctx.fillStyle = open ? C.COLORS.exit : '#8a9a90';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(open ? 'EXIT' : 'LOCK', 0, 0);
  ctx.restore();
}

function drawVault(ctx, state) {
  const px = tileToPx(state.vault.x);
  const py = tileToPx(state.vault.y);
  const taken = state.vault.taken;
  const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 300);
  ctx.save();
  ctx.translate(px, py);
  if (!taken) {
    ctx.fillStyle = `rgba(255, 207, 61, ${0.25 * pulse})`;
    ctx.beginPath();
    ctx.arc(0, 0, T * 0.75, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = taken ? '#3a3325' : '#8a6d1f';
  ctx.strokeStyle = taken ? '#6b5a2e' : '#ffd24d';
  ctx.lineWidth = 2.5;
  roundRect(ctx, -13, -13, 26, 26, 5);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fillStyle = taken ? '#241f14' : C.COLORS.vault;
  ctx.fill();
  ctx.strokeStyle = '#2a2113';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (!taken) {
    ctx.fillStyle = '#1d2333';
    ctx.font = 'bold 10px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('VAULT', 0, -22);
  }
  ctx.restore();
}

function drawLoot(ctx, state) {
  const now = performance.now() / 500;
  for (const item of state.loot) {
    if (item.taken) continue;
    const px = tileToPx(item.x);
    const py = tileToPx(item.y) + Math.sin(now + item.x * 2) * 2;
    const bob = 1 + 0.12 * Math.sin(now + item.y);
    ctx.save();
    ctx.translate(px, py);
    ctx.scale(bob, bob);
    if (item.kind === 'gold') {
      ctx.fillStyle = 'rgba(255, 210, 77, 0.3)';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.COLORS.gold;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a87e10';
      ctx.font = 'bold 10px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('$', 0, 0.5);
    } else if (item.kind === 'cash') {
      ctx.fillStyle = 'rgba(125, 219, 138, 0.3)';
      ctx.fillRect(-11, -7, 22, 14);
      ctx.fillStyle = C.COLORS.cash;
      ctx.fillRect(-9, -5, 18, 10);
      ctx.fillStyle = '#1e5c2a';
      ctx.fillRect(-3, -3, 6, 6);
    } else if (item.kind === 'diamond') {
      ctx.fillStyle = 'rgba(127, 231, 255, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.COLORS.diamond;
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(8, 0);
      ctx.lineTo(0, 9);
      ctx.lineTo(-8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.moveTo(0, -9);
      ctx.lineTo(4, -3);
      ctx.lineTo(-4, -3);
      ctx.closePath();
      ctx.fill();
    } else if (item.kind === 'art') {
      ctx.fillStyle = '#5c2b4d';
      ctx.fillRect(-11, -9, 22, 18);
      ctx.fillStyle = C.COLORS.art;
      ctx.fillRect(-9, -7, 18, 14);
      ctx.fillStyle = '#ff5fa8';
      ctx.beginPath();
      ctx.arc(-2, -1, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#7a2b57';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-9, -7, 18, 14);
    }
    ctx.restore();
  }
}

function drawCameras(ctx, state) {
  for (const cam of state.cameras) {
    drawCone(
      ctx, cam.x, cam.y, cam.angle, C.CAMERA_VIEW_RANGE, C.CAMERA_VIEW_HALF_ANGLE,
      C.COLORS.cameraCone, C.COLORS.cameraConeEdge,
    );
  }
  for (const cam of state.cameras) {
    const px = tileToPx(cam.x);
    const py = tileToPx(cam.y);
    ctx.save();
    ctx.translate(px, py);
    ctx.fillStyle = '#0b0e14';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = cam.spotted ? '#ff5040' : '#78c8ff';
    ctx.lineWidth = 2;
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.rotate(cam.angle);
    ctx.fillStyle = cam.spotted ? '#ff5040' : '#78c8ff';
    ctx.beginPath();
    ctx.arc(7, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b0e14';
    ctx.beginPath();
    ctx.arc(7, 0, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawGuards(ctx, state) {
  for (const guard of state.guards) {
    const alert = guard.alert;
    const chasing = guard.state === 'chase';
    const fill = chasing || alert > 0.45 ? C.COLORS.coneAlert : C.COLORS.cone;
    const edge = chasing || alert > 0.45 ? C.COLORS.coneAlertEdge : C.COLORS.coneEdge;
    drawCone(ctx, guard.x, guard.y, guard.facing, C.GUARD_VIEW_RANGE, C.GUARD_VIEW_HALF_ANGLE, fill, edge);
  }
  for (const guard of state.guards) {
    const px = tileToPx(guard.x);
    const py = tileToPx(guard.y);
    const chasing = guard.state === 'chase';
    ctx.save();
    ctx.translate(px, py);
    // Body
    ctx.fillStyle = chasing ? '#e04848' : C.COLORS.guard;
    ctx.beginPath();
    ctx.arc(0, 0, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = C.COLORS.guardDark;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    // Cap brim in the facing direction
    ctx.rotate(guard.facing);
    ctx.fillStyle = '#2b1d1d';
    ctx.fillRect(4, -6, 9, 12);
    ctx.fillStyle = '#f4f1e8';
    ctx.beginPath();
    ctx.arc(2, -4, 1.8, 0, Math.PI * 2);
    ctx.arc(2, 4, 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Alert marker
    if (chasing) {
      drawMarker(ctx, px, py - 24, '!', '#ff5040');
    } else if (guard.alert > 0.3) {
      drawMarker(ctx, px, py - 24, '?', '#ffd65a');
    }
  }
}

function drawMarker(ctx, x, y, text, color) {
  ctx.save();
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.beginPath();
  ctx.arc(x, y, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 0.5);
  ctx.restore();
}

function drawPlayer(ctx, state) {
  const p = state.player;
  const px = tileToPx(p.x);
  const py = tileToPx(p.y);
  ctx.save();
  ctx.translate(px, py);
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(232, 230, 223, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  // Hooded thief: dark suit, pale mask band, direction tick.
  ctx.fillStyle = C.COLORS.playerSuit;
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#0a0a12';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.rotate(Math.atan2(p.dirY, p.dirX));
  ctx.fillStyle = C.COLORS.player;
  ctx.fillRect(2, -7, 8, 14);
  ctx.fillStyle = '#14141f';
  ctx.fillRect(4, -5, 5, 3);
  ctx.fillRect(4, 2, 5, 3);
  ctx.restore();
}

function drawParticles(ctx, state) {
  for (const p of state.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(tileToPx(p.x), tileToPx(p.y), p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLighting(ctx, state) {
  // A soft darkness that keeps the thief lit and the room readable.
  const px = tileToPx(state.player.x);
  const py = tileToPx(state.player.y);
  const grad = ctx.createRadialGradient(px, py, 60, px, py, 520);
  grad.addColorStop(0, 'rgba(5, 6, 12, 0)');
  grad.addColorStop(1, 'rgba(5, 6, 12, 0.34)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  // Red alarm pulse when things go wrong.
  if (state.alarm > 55 || state.lockdownTimer > 0) {
    const pulse = state.lockdownTimer > 0
      ? 0.22 + 0.1 * Math.sin(performance.now() / 120)
      : ((state.alarm - 55) / 45) * 0.18;
    const rgrad = ctx.createRadialGradient(
      C.VIEW_W / 2, C.VIEW_H / 2, C.VIEW_H * 0.35,
      C.VIEW_W / 2, C.VIEW_H / 2, C.VIEW_H * 0.75,
    );
    rgrad.addColorStop(0, 'rgba(255, 40, 30, 0)');
    rgrad.addColorStop(1, `rgba(255, 40, 30, ${Math.max(0, pulse)})`);
    ctx.fillStyle = rgrad;
    ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  }
}

export function drawGame(ctx, state) {
  ctx.clearRect(0, 0, C.VIEW_W, C.VIEW_H);
  drawFloor(ctx, state);
  drawExit(ctx, state);
  drawVault(ctx, state);
  drawLoot(ctx, state);
  drawCameras(ctx, state);
  drawGuards(ctx, state);
  drawPlayer(ctx, state);
  drawParticles(ctx, state);
  drawLighting(ctx, state);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function panel(ctx, title, lines, accent) {
  const w = 560;
  const h = 130 + lines.length * 30;
  const x = (C.VIEW_W - w) / 2;
  const y = (C.VIEW_H - h) / 2;
  ctx.save();
  ctx.fillStyle = 'rgba(10, 13, 22, 0.92)';
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, C.VIEW_W / 2, y + 48);
  ctx.fillStyle = '#e8e6df';
  ctx.font = '17px system-ui, sans-serif';
  lines.forEach((line, i) => {
    ctx.fillText(line, C.VIEW_W / 2, y + 96 + i * 30);
  });
  ctx.restore();
  return { x, y, w, h };
}

export function drawTitle(ctx, bestScore) {
  ctx.fillStyle = '#0b0e17';
  ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  // A faint museum floor behind the title.
  ctx.strokeStyle = 'rgba(255, 210, 77, 0.08)';
  ctx.lineWidth = 1;
  for (let x = 0; x <= C.VIEW_W; x += 64) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, C.VIEW_H); ctx.stroke();
  }
  for (let y = 0; y <= C.VIEW_H; y += 64) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(C.VIEW_W, y); ctx.stroke();
  }
  ctx.save();
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 58px system-ui, sans-serif';
  ctx.fillText('THE MIDNIGHT VAULT', C.VIEW_W / 2, 150);
  ctx.fillStyle = '#e8e6df';
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText('A three-job stealth heist — sneak, steal, vanish.', C.VIEW_W / 2, 196);
  ctx.fillStyle = '#9aa3b8';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Crack the vault in each hideout, grab the loot, and reach the EXIT', C.VIEW_W / 2, 232);
  ctx.fillText('before the guards and cameras raise the alarm.', C.VIEW_W / 2, 256);
  ctx.fillStyle = '#e8e6df';
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.fillText('WASD / Arrows — move      Shift — sneak      Click — walk there', C.VIEW_W / 2, 330);
  ctx.fillText('M — mute      P — pause      R — restart level', C.VIEW_W / 2, 358);
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 24px system-ui, sans-serif';
  const blink = 0.65 + 0.35 * Math.sin(performance.now() / 350);
  ctx.globalAlpha = blink;
  ctx.fillText('— PRESS ENTER OR CLICK TO START —', C.VIEW_W / 2, 440);
  ctx.globalAlpha = 1;
  if (bestScore > 0) {
    ctx.fillStyle = '#9aa3b8';
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Best score: $${bestScore.toLocaleString('en-US')}`, C.VIEW_W / 2, 490);
  }
  ctx.restore();
}

export function drawLevelComplete(ctx, levelName, breakdown, levelIndex, totalLevels) {
  panel(ctx, 'JOB DONE', [
    `${levelName} — vault cracked and clean getaway.`,
    `Loot  $${breakdown.loot.toLocaleString('en-US')}    Time bonus  $${breakdown.timeBonus.toLocaleString('en-US')}    Stealth bonus  $${breakdown.stealthBonus.toLocaleString('en-US')}`,
    `Level score: $${breakdown.total.toLocaleString('en-US')}`,
    levelIndex + 1 < totalLevels ? 'Press ENTER for the next job.' : 'Press ENTER for the final tally.',
  ], '#3dff8e');
}

export function drawGameOver(ctx, totalScore, levelName) {
  panel(ctx, 'BUSTED', [
    `The crew got caught in ${levelName}.`,
    `The take so far: $${totalScore.toLocaleString('en-US')}`,
    'Press ENTER to try the job again.',
  ], '#ff5040');
}

export function drawVictory(ctx, totalScore, breakdown) {
  panel(ctx, 'CLEAN GETAWAY', [
    'All three vaults cracked. The crew vanishes into the night.',
    `Final take: $${totalScore.toLocaleString('en-US')}   (loot $${breakdown.loot.toLocaleString('en-US')} + bonuses $${(breakdown.timeBonus + breakdown.stealthBonus).toLocaleString('en-US')})`,
    'Press ENTER to run it all again.',
  ], '#ffd24d');
}

export function drawPaused(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(5, 6, 12, 0.6)';
  ctx.fillRect(0, 0, C.VIEW_W, C.VIEW_H);
  ctx.fillStyle = '#e8e6df';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PAUSED', C.VIEW_W / 2, C.VIEW_H / 2 - 10);
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('Press P to keep moving.', C.VIEW_W / 2, C.VIEW_H / 2 + 30);
  ctx.restore();
}
