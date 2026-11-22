// config.js — tuning constants for The Midnight Vault.
// All speeds are in tiles per second, all distances in tiles.

export const TILE = 32; // pixels per map tile
export const VIEW_W = 960; // canvas pixels (30 tiles)
export const VIEW_H = 640; // canvas pixels (20 tiles)

export const PLAYER_SPEED = 3.6; // tiles/s walking
export const PLAYER_SNEAK_SPEED = 2.0; // tiles/s while sneaking (Shift)
export const PLAYER_RADIUS = 0.32; // tiles, collision circle

export const GUARD_PATROL_SPEED = 1.55;
export const GUARD_CHASE_SPEED = 2.6;
export const GUARD_RADIUS = 0.34;
export const GUARD_VIEW_RANGE = 5.2; // tiles
export const GUARD_VIEW_HALF_ANGLE = 0.66; // radians (~38 deg)
export const GUARD_PAUSE_AT_WAYPOINT = 1.4; // seconds
export const GUARD_CATCH_RADIUS = 0.52; // tiles — touching a guard ends the run

export const CAMERA_VIEW_RANGE = 6.0;
export const CAMERA_VIEW_HALF_ANGLE = 0.52; // radians (~30 deg)

export const ALARM_RISE_GUARD = 52; // alarm points per second while a guard sees you
export const ALARM_RISE_CAMERA = 40; // alarm points per second while a camera sees you
export const ALARM_DECAY = 13; // alarm points per second while unseen
export const ALARM_CHASE_AT = 70; // alarm level where every guard gives chase
export const ALARM_LOCKDOWN_AT = 100;
export const LOCKDOWN_SECONDS = 8;

export const SNEAK_DETECTION_FACTOR = 0.55; // sneaking slows alarm rise
export const GUARD_ALERT_RISE = 1.5; // per second while the guard sees you
export const GUARD_ALERT_FALL = 0.55; // per second while the guard cannot see you
export const GUARD_CHASE_ALERT = 0.85; // alert level where this guard gives chase
export const GUARD_GIVE_UP_SECONDS = 2.5; // unseen for this long: guard gives up the chase

export const LOOT_VALUES = { gold: 500, cash: 300, diamond: 1000, art: 1500, vault: 5000 };

export const STARTING_LIVES = 3;

export const COLORS = {
  floorA: '#1d2333',
  floorB: '#1a1f2e',
  carpet: '#3a2333',
  wall: '#0d1017',
  wallTop: '#2b3247',
  wallEdge: '#454f6b',
  player: '#e8e6df',
  playerSuit: '#23232e',
  guard: '#c94f4f',
  guardDark: '#7e2f2f',
  cone: 'rgba(255, 214, 90, 0.20)',
  coneEdge: 'rgba(255, 214, 90, 0.55)',
  coneAlert: 'rgba(255, 70, 60, 0.30)',
  coneAlertEdge: 'rgba(255, 70, 60, 0.8)',
  cameraCone: 'rgba(120, 200, 255, 0.16)',
  cameraConeEdge: 'rgba(120, 200, 255, 0.5)',
  gold: '#ffd24d',
  diamond: '#7fe7ff',
  cash: '#7ddb8a',
  art: '#ff9de2',
  vault: '#ffcf3d',
  exit: '#3dff8e',
  exitLocked: '#5a6b62',
  hud: '#10141f',
};
