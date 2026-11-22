// engine.js — the heist simulation: player movement, guard patrols and chases,
// sweeping cameras, vision cones, the alarm meter, loot, the vault and the exit.
// Pure logic: it knows nothing about the canvas or the DOM.

import * as C from './config.js';
import { parseLevel, isWall, inVisionCone, angleDiff } from './levels.js';

export function createLevelState(levelDef, rng) {
  const parsed = parseLevel(levelDef);
  const player = {
    x: parsed.playerStart.x,
    y: parsed.playerStart.y,
    dirX: 1,
    dirY: 0,
    moving: false,
    sneaking: false,
  };
  const guards = levelDef.guards.map((g) => {
    const [sx, sy] = g.waypoints[0];
    return {
      waypoints: g.waypoints.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 })),
      wpIndex: 1 % g.waypoints.length,
      x: sx + 0.5,
      y: sy + 0.5,
      facing: 0,
      state: 'patrol', // patrol | chase
      pauseTimer: 0,
      alert: 0,
      unseenTimer: 0,
      spotted: false, // currently has the player in its cone
    };
  });
  const cameras = levelDef.cameras.map((c) => ({
    x: c.x + 0.5,
    y: c.y + 0.5,
    baseAngle: c.baseAngle,
    sweep: c.sweep,
    period: c.period,
    phase: c.phase,
    angle: c.baseAngle,
    spotted: false,
  }));
  return {
    def: levelDef,
    grid: parsed.grid,
    width: parsed.width,
    height: parsed.height,
    loot: parsed.loot,
    exit: parsed.exit,
    vault: { ...parsed.vault, taken: false },
    player,
    guards,
    cameras,
    alarm: 0,
    peakAlarm: 0,
    lockdownTimer: 0,
    time: 0,
    score: 0, // loot dollars collected on this level
    particles: [],
    rng,
    over: false,
  };
}

function burst(state, x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    const a = state.rng() * Math.PI * 2;
    const speed = 1 + state.rng() * 2.5;
    state.particles.push({
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: 0.5 + state.rng() * 0.4,
      maxLife: 0.9,
      color,
      size: 2 + state.rng() * 2.5,
    });
  }
}

// Move a circle (x, y, radius) through the grid, axis by axis so it slides
// along walls instead of sticking. Returns the new position.
function moveCircle(grid, x, y, dx, dy, radius) {
  let nx = x + dx;
  if (circleHitsWall(grid, nx, y, radius)) nx = x;
  let ny = y + dy;
  if (circleHitsWall(grid, nx, ny, radius)) ny = y;
  return { x: nx, y: ny };
}

function circleHitsWall(grid, x, y, radius) {
  const minTx = Math.floor(x - radius);
  const maxTx = Math.floor(x + radius);
  const minTy = Math.floor(y - radius);
  const maxTy = Math.floor(y + radius);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isWall(grid, tx, ty)) continue;
      const closestX = Math.max(tx, Math.min(x, tx + 1));
      const closestY = Math.max(ty, Math.min(y, ty + 1));
      const ddx = x - closestX;
      const ddy = y - closestY;
      if (ddx * ddx + ddy * ddy < radius * radius) return true;
    }
  }
  return false;
}

// One simulation step. `input` is { moveX, moveY, sneaking }.
// `events` collects { type, ... } for the UI/sound layer to consume.
export function updateLevel(state, input, dt, events) {
  if (state.over) return;
  state.time += dt;
  const player = state.player;

  // --- player movement ---
  const speed = input.sneaking ? C.PLAYER_SNEAK_SPEED : C.PLAYER_SPEED;
  let mx = input.moveX;
  let my = input.moveY;
  const len = Math.hypot(mx, my);
  if (len > 0.001) {
    mx /= len;
    my /= len;
    player.dirX = mx;
    player.dirY = my;
    player.moving = true;
    const moved = moveCircle(state.grid, player.x, player.y, mx * speed * dt, my * speed * dt, C.PLAYER_RADIUS);
    player.x = moved.x;
    player.y = moved.y;
    player.stepTimer = (player.stepTimer || 0) + dt;
    if (player.stepTimer > (input.sneaking ? 0.55 : 0.34)) {
      player.stepTimer = 0;
      events.push({ type: 'step' });
    }
  } else {
    player.moving = false;
  }
  player.sneaking = input.sneaking;

  // --- cameras sweep and watch ---
  let cameraSees = false;
  for (const cam of state.cameras) {
    cam.angle = cam.baseAngle + cam.sweep * Math.sin((2 * Math.PI * state.time) / cam.period + cam.phase);
    cam.spotted = inVisionCone(
      state.grid, cam.x, cam.y, cam.angle, C.CAMERA_VIEW_RANGE, C.CAMERA_VIEW_HALF_ANGLE, player.x, player.y,
    );
    if (cam.spotted) cameraSees = true;
  }

  // --- guards patrol, watch, chase ---
  let guardSees = false;
  let anyChase = false;
  for (const guard of state.guards) {
    const sees = inVisionCone(
      state.grid, guard.x, guard.y, guard.facing, C.GUARD_VIEW_RANGE, C.GUARD_VIEW_HALF_ANGLE, player.x, player.y,
    );
    const wasSpotted = guard.spotted;
    guard.spotted = sees;
    if (sees) {
      guardSees = true;
      const rate = C.GUARD_ALERT_RISE * (player.sneaking ? C.SNEAK_DETECTION_FACTOR : 1);
      guard.alert = Math.min(1, guard.alert + rate * dt);
      guard.unseenTimer = 0;
      if (!wasSpotted) events.push({ type: 'spotted', x: guard.x, y: guard.y });
      if (guard.alert >= C.GUARD_CHASE_ALERT && guard.state !== 'chase') {
        guard.state = 'chase';
        events.push({ type: 'chase', x: guard.x, y: guard.y });
      }
    } else {
      guard.alert = Math.max(0, guard.alert - C.GUARD_ALERT_FALL * dt);
      guard.unseenTimer += dt;
      if (guard.state === 'chase' && guard.unseenTimer > C.GUARD_GIVE_UP_SECONDS) {
        guard.state = 'patrol';
        guard.unseenTimer = 0;
      }
    }

    if (guard.state === 'chase') {
      anyChase = true;
      const dx = player.x - guard.x;
      const dy = player.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0.001) {
        guard.facing = Math.atan2(dy, dx);
        const moved = moveCircle(
          state.grid, guard.x, guard.y,
          (dx / dist) * C.GUARD_CHASE_SPEED * dt,
          (dy / dist) * C.GUARD_CHASE_SPEED * dt,
          C.GUARD_RADIUS,
        );
        guard.x = moved.x;
        guard.y = moved.y;
      }
      if (dist < C.GUARD_CATCH_RADIUS) {
        state.over = true;
        events.push({ type: 'caught' });
        return;
      }
    } else {
      // Patrol: walk to the current waypoint, pause, then take the next one.
      const target = guard.waypoints[guard.wpIndex];
      const dx = target.x - guard.x;
      const dy = target.y - guard.y;
      const dist = Math.hypot(dx, dy);
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
      } else if (dist < 0.08) {
        guard.pauseTimer = C.GUARD_PAUSE_AT_WAYPOINT;
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        // While paused the guard scans: face the next leg of the patrol.
        const next = guard.waypoints[guard.wpIndex];
        guard.facing = Math.atan2(next.y - guard.y, next.x - guard.x);
      } else {
        guard.facing = Math.atan2(dy, dx);
        const moved = moveCircle(
          state.grid, guard.x, guard.y,
          (dx / dist) * C.GUARD_PATROL_SPEED * dt,
          (dy / dist) * C.GUARD_PATROL_SPEED * dt,
          C.GUARD_RADIUS,
        );
        guard.x = moved.x;
        guard.y = moved.y;
      }
    }
  }

  // --- alarm meter ---
  const sneakFactor = player.sneaking ? C.SNEAK_DETECTION_FACTOR : 1;
  if (state.lockdownTimer > 0) {
    state.lockdownTimer -= dt;
    state.alarm = C.ALARM_LOCKDOWN_AT;
    if (state.lockdownTimer <= 0) {
      state.alarm = 55;
      events.push({ type: 'lockdownEnd' });
    }
  } else if (guardSees || cameraSees) {
    const rise = (guardSees ? C.ALARM_RISE_GUARD : 0) + (cameraSees ? C.ALARM_RISE_CAMERA : 0);
    state.alarm = Math.min(C.ALARM_LOCKDOWN_AT, state.alarm + rise * sneakFactor * dt);
    if (state.alarm >= C.ALARM_LOCKDOWN_AT) {
      state.lockdownTimer = C.LOCKDOWN_SECONDS;
      for (const guard of state.guards) guard.state = 'chase';
      events.push({ type: 'lockdown' });
    } else if (state.alarm >= C.ALARM_CHASE_AT && !anyChase) {
      for (const guard of state.guards) guard.state = 'chase';
    }
  } else {
    state.alarm = Math.max(0, state.alarm - C.ALARM_DECAY * dt);
  }
  state.peakAlarm = Math.max(state.peakAlarm, state.alarm);

  // --- loot pickup ---
  for (const item of state.loot) {
    if (item.taken) continue;
    const dist = Math.hypot(item.x - player.x, item.y - player.y);
    if (dist < 0.6) {
      item.taken = true;
      const value = C.LOOT_VALUES[item.kind];
      state.score += value;
      burst(state, item.x, item.y, C.COLORS[item.kind] || '#ffd24d', 12);
      events.push({ type: 'pickup', kind: item.kind, value, x: item.x, y: item.y });
    }
  }

  // --- the vault ---
  if (!state.vault.taken) {
    const dist = Math.hypot(state.vault.x - player.x, state.vault.y - player.y);
    if (dist < 0.75) {
      state.vault.taken = true;
      state.score += C.LOOT_VALUES.vault;
      burst(state, state.vault.x, state.vault.y, C.COLORS.vault, 26);
      events.push({ type: 'vault', value: C.LOOT_VALUES.vault });
    }
  }

  // --- exit: only opens once the vault is cracked ---
  if (state.vault.taken) {
    const dist = Math.hypot(state.exit.x - player.x, state.exit.y - player.y);
    if (dist < 0.75) {
      state.over = true;
      events.push({ type: 'levelComplete', time: state.time, loot: state.score, peakAlarm: state.peakAlarm });
      return;
    }
  }

  // --- particles ---
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.life <= 0) state.particles.splice(i, 1);
  }
}

// Level score: loot dollars + a time bonus against par + a stealth bonus
// for keeping the peak alarm low.
export function levelScoreBreakdown(levelState) {
  const par = levelState.def.parSeconds;
  const timeBonus = Math.max(0, Math.round((par - levelState.time) * 10));
  const stealthBonus = Math.max(0, Math.round((100 - levelState.peakAlarm) * 20));
  return {
    loot: levelState.score,
    timeBonus,
    stealthBonus,
    total: levelState.score + timeBonus + stealthBonus,
  };
}

export { angleDiff };
