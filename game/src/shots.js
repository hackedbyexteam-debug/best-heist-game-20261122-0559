// shots.js — deterministic scenes for screenshots (?shot=start|play|play2|end).
// Instead of playing, the page renders one fixed frame: the title screen, a
// mid-heist moment with every required element visible, or the victory screen.
// Returns true when a shot was rendered (the main loop then stays off).

export function applyShot(app) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const { ctx, hud, LEVELS, createLevelState, mulberry32, Render, updateHUD } = app;

  if (shot === 'start') {
    Render.drawTitle(ctx, 0);
    return true;
  }

  if (shot === 'end') {
    // Victory screen over the finished penthouse.
    const state = createLevelState(LEVELS[2], mulberry32(7));
    state.vault.taken = true;
    state.loot.forEach((item) => { item.taken = true; });
    state.score = 24500;
    state.alarm = 0;
    Render.drawGame(ctx, state);
    Render.drawVictory(ctx, 31200, { loot: 24500, timeBonus: 3200, stealthBonus: 3500 });
    // Mirror the final tally in the HUD so it agrees with the panel.
    hud.level.textContent = 'JOB 3/3 — THE PENTHOUSE';
    hud.score.textContent = '$31,200';
    hud.loot.textContent = 'LOOT 22/22';
    hud.alarmFill.style.width = '0%';
    hud.alarmLabel.textContent = 'ALARM 0%';
    hud.alarmLabel.style.color = '#3dff8e';
    hud.lives.textContent = 'LIVES ●●●';
    hud.timer.textContent = '6:24';
    hud.objective.textContent = 'All three vaults cracked — clean getaway!';
    return true;
  }

  // Mid-heist scenes: a live room with the thief, patrolling guards and their
  // vision cones, sweeping cameras, loot, the vault and the alarm meter.
  const levelIndex = shot === 'play2' ? 2 : 1;
  const state = createLevelState(LEVELS[levelIndex], mulberry32(0xC0FFEE + levelIndex * 7919));
  stageHeist(state, levelIndex);
  Render.drawGame(ctx, state);

  // Fill the HUD so the alarm meter and score read in the screenshot too.
  app.levelState = state;
  app.levelIndex = levelIndex;
  app.totalScore = levelIndex === 2 ? 18400 : 9600;
  app.lives = 3;
  if (typeof updateHUD === 'function') {
    // updateHUD reads the module state of main.js, so mirror the staged values
    // through the HUD directly instead.
    hud.level.textContent = `JOB ${levelIndex + 1}/3 — ${LEVELS[levelIndex].name.toUpperCase()}`;
    hud.score.textContent = `$${(app.totalScore + state.score).toLocaleString('en-US')}`;
    const lootTotal = state.loot.length;
    const lootGot = state.loot.filter((item) => item.taken).length + (state.vault.taken ? 1 : 0);
    hud.loot.textContent = `LOOT ${lootGot}/${lootTotal + 1}`;
    const alarm = Math.round(state.alarm);
    hud.alarmFill.style.width = `${alarm}%`;
    hud.alarmFill.style.background = alarm >= 70 ? '#ff5040' : alarm >= 35 ? '#ffd24d' : '#3dff8e';
    hud.alarmLabel.textContent = `ALARM ${alarm}%`;
    hud.alarmLabel.style.color = alarm >= 35 ? '#ffd24d' : '#3dff8e';
    hud.lives.textContent = 'LIVES ●●●';
    hud.timer.textContent = levelIndex === 2 ? '2:41' : '1:12';
    hud.objective.textContent = state.vault.taken
      ? 'Vault cracked! Reach the green EXIT — now!'
      : 'Objective: crack the VAULT, grab the loot, reach the EXIT.';
  }
  return true;
}

// Pose one frozen moment of a heist: the thief mid-room, one guard turning
// toward them with its cone, the alarm part-way up, some loot already pocketed.
function stageHeist(state, levelIndex) {
  if (levelIndex === 1) {
    // The Bank: thief crossing the vault corridor, a guard closing in.
    state.player.x = 13.5;
    state.player.y = 8.5;
    state.player.dirX = 0;
    state.player.dirY = 1;
    state.player.sneaking = true;
    state.loot[0].taken = true;
    state.loot[1].taken = true;
    state.loot[3].taken = true;
    state.score = 1500;
    state.alarm = 38;
    state.peakAlarm = 38;
    state.time = 72;
    const g0 = state.guards[0];
    g0.x = 8.5; g0.y = 7.5; g0.facing = Math.PI / 2; g0.alert = 0.62; g0.state = 'patrol';
    const g1 = state.guards[1];
    g1.x = 20.5; g1.y = 15.5; g1.facing = Math.PI; g1.alert = 0.1;
    const g2 = state.guards[2];
    g2.x = 15.5; g2.y = 11.5; g2.facing = -Math.PI / 2; g2.alert = 0;
  } else {
    // The Penthouse: thief near the vault, a guard giving chase.
    state.player.x = 14.5;
    state.player.y = 10.5;
    state.player.dirX = -1;
    state.player.dirY = 0;
    state.player.sneaking = false;
    state.loot[0].taken = true;
    state.loot[2].taken = true;
    state.loot[4].taken = true;
    state.loot[6].taken = true;
    state.vault.taken = true;
    state.score = 9200;
    state.alarm = 64;
    state.peakAlarm = 64;
    state.time = 161;
    const g0 = state.guards[0];
    g0.x = 9.5; g0.y = 7.5; g0.facing = 0.5; g0.alert = 0.9; g0.state = 'chase';
    const g1 = state.guards[1];
    g1.x = 21.5; g1.y = 17.5; g1.facing = Math.PI; g1.alert = 0.3;
    const g2 = state.guards[2];
    g2.x = 6.5; g2.y = 12.5; g2.facing = Math.PI / 2; g2.alert = 0.15;
    const g3 = state.guards[3];
    g3.x = 16.5; g3.y = 8.5; g3.facing = Math.PI; g3.alert = 0.55;
    // Cameras mid-sweep, one of them looking at the thief.
    state.cameras[0].angle = Math.PI / 2 + 0.4;
    state.cameras[1].angle = 0.3;
    state.cameras[2].angle = Math.PI - 0.3;
  }
  // Sweep the cameras to a fixed mid-sweep pose for both scenes.
  if (levelIndex === 1) {
    state.cameras[0].angle = Math.PI / 2 - 0.5;
    state.cameras[1].angle = -0.4;
    state.cameras[2].angle = Math.PI + 0.35;
  }
}
