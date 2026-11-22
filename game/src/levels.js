// levels.js — the three heists. Each map is a grid of characters:
//   #  wall            .  floor
//   P  player start    E  exit (locked until the vault is cracked)
//   V  the vault (main loot)   g gold   c cash   d diamond   a art
// Guards patrol the waypoint lists (tile coordinates, [x, y]).
// Cameras sit on a wall tile and sweep a cone into the room.

export const LEVELS = [
  {
    id: 1,
    name: 'The Gallery',
    subtitle: 'Job 1 of 3 — the Harlow Museum',
    parSeconds: 90,
    map: [
      '##############################',
      '#P....#......#......g........#',
      '#.....#..a...#......#....g...#',
      '#..g..#......#..d...#........#',
      '#.....#......#......#....a...#',
      '#.....+......#......#........#',
      '#.....#......#......#........#',
      '###.####..####..#####..#######',
      '#............................#',
      '#..g.....##....V.....##....g.#',
      '#............................#',
      '#....##.##...##.##...##.##...#',
      '#....#...#...#...#...#...#...#',
      '#..a.#.g.#...#.g.#...#.g.#.a.#',
      '#....#...#...#...#...#...#...#',
      '#....##.##...##.##...##.##...#',
      '#............................#',
      '#..g..........##.........g...#',
      '#...........................E#',
      '##############################',
    ],
    guards: [
      { waypoints: [[4, 8], [14, 8], [25, 8]] },
      { waypoints: [[4, 16], [14, 16], [25, 16]] },
    ],
    cameras: [
      { x: 17, y: 7, baseAngle: Math.PI / 2, sweep: 0.9, period: 4.5, phase: 0 },
      { x: 9, y: 11, baseAngle: Math.PI / 2, sweep: 0.7, period: 5.0, phase: 1.3 },
    ],
  },
  {
    id: 2,
    name: 'The Bank',
    subtitle: 'Job 2 of 3 — the Meridian Bank vault floor',
    parSeconds: 120,
    map: [
      '##############################',
      '#P...#.......#......#....g...#',
      '#....#...a...#..d...#........#',
      '#.g..#.......#......#...a....#',
      '#....+.......#......+........#',
      '#....#.......#......#....g...#',
      '##.####..#####..#####..####.##',
      '#............................#',
      '#..g....####....V....####..g.#',
      '#............................#',
      '#..###.###..###.####..###.####',
      '#..#.....#..#......#..#.....##',
      '#..#.g...#..#.a....#..#.g...##',
      '#..#.....#..#......#..#.....##',
      '#..###.###..###.####..###.####',
      '#............................#',
      '#.g..........##.....c....g...#',
      '#............................#',
      '#......c....................E#',
      '##############################',
    ],
    guards: [
      { waypoints: [[3, 7], [14, 7], [26, 7]] },
      { waypoints: [[3, 15], [14, 15], [26, 15]] },
      { waypoints: [[15, 7], [15, 15], [15, 9]] },
    ],
    cameras: [
      { x: 12, y: 6, baseAngle: Math.PI / 2, sweep: 1.0, period: 4.0, phase: 0 },
      { x: 3, y: 10, baseAngle: 0, sweep: 0.8, period: 5.0, phase: 2.0 },
      { x: 26, y: 10, baseAngle: Math.PI, sweep: 0.8, period: 5.0, phase: 3.1 },
    ],
  },
  {
    id: 3,
    name: 'The Penthouse',
    subtitle: 'Job 3 of 3 — the Aurelia Casino penthouse',
    parSeconds: 150,
    map: [
      '##############################',
      '#P....#....g...#......#...a..#',
      '#.....#........#..d...#......#',
      '#..g..+....a...#......+..g...#',
      '#.....#........#......#......#',
      '#..c..#....g...#..c...#..d...#',
      '###.####..######..######.#####',
      '#............................#',
      '#.g.....####...V...####....g.#',
      '#............................#',
      '#...##.###..###.####..##.###.#',
      '#...#....#..#......#..#....#.#',
      '#.a.#.g..#..#.d....#..#.g..#.#',
      '#...#....#..#......#..#....#.#',
      '#...##.###..###.####..##.###.#',
      '#............................#',
      '#..g....c.....##......c...g..#',
      '#............................#',
      '#....a......................E#',
      '##############################',
    ],
    guards: [
      { waypoints: [[3, 7], [14, 7], [26, 7]] },
      { waypoints: [[3, 17], [14, 17], [26, 17]] },
      { waypoints: [[6, 7], [6, 17], [24, 17], [24, 7]] },
      { waypoints: [[12, 9], [18, 9]] },
    ],
    cameras: [
      { x: 14, y: 6, baseAngle: Math.PI / 2, sweep: 1.1, period: 3.6, phase: 0 },
      { x: 4, y: 10, baseAngle: 0, sweep: 0.9, period: 4.4, phase: 1.0 },
      { x: 25, y: 10, baseAngle: Math.PI, sweep: 0.9, period: 4.4, phase: 2.2 },
      { x: 14, y: 19, baseAngle: -Math.PI / 2, sweep: 0.8, period: 5.0, phase: 0.6 },
    ],
  },
];

// Parse a level's ASCII map into a grid plus the objects it contains.
// Rows are padded with '#' to the widest row so a typo cannot break the grid.
export function parseLevel(level) {
  const width = Math.max(...level.map.map((row) => row.length));
  const height = level.map.length;
  const grid = [];
  const loot = [];
  let playerStart = null;
  let exit = null;
  let vault = null;
  for (let y = 0; y < height; y++) {
    const row = level.map[y].padEnd(width, '#');
    const cells = [];
    for (let x = 0; x < width; x++) {
      const ch = row[x];
      if (ch === '#') cells.push(1);
      else cells.push(0);
      if (ch === 'P') playerStart = { x: x + 0.5, y: y + 0.5 };
      if (ch === 'E') exit = { x: x + 0.5, y: y + 0.5, tileX: x, tileY: y };
      if (ch === 'V') vault = { x: x + 0.5, y: y + 0.5, tileX: x, tileY: y };
      if (ch === 'g') loot.push({ kind: 'gold', x: x + 0.5, y: y + 0.5, taken: false });
      if (ch === 'c') loot.push({ kind: 'cash', x: x + 0.5, y: y + 0.5, taken: false });
      if (ch === 'd') loot.push({ kind: 'diamond', x: x + 0.5, y: y + 0.5, taken: false });
      if (ch === 'a') loot.push({ kind: 'art', x: x + 0.5, y: y + 0.5, taken: false });
    }
    grid.push(cells);
  }
  if (!playerStart || !exit || !vault) {
    throw new Error(`Level ${level.id} is missing P, E or V on its map`);
  }
  return { width, height, grid, loot, playerStart, exit, vault };
}

export function isWall(grid, tx, ty) {
  if (ty < 0 || ty >= grid.length || tx < 0 || tx >= grid[0].length) return true;
  return grid[ty][tx] === 1;
}

// Line of sight between two tile-space points: true when no wall blocks the ray.
// The tile the ray starts in never blocks it (a camera sits inside a wall tile).
export function hasLineOfSight(grid, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist * 8));
  const originTx = Math.floor(x0);
  const originTy = Math.floor(y0);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const tx = Math.floor(x0 + dx * t);
    const ty = Math.floor(y0 + dy * t);
    if (tx === originTx && ty === originTy) continue;
    if (isWall(grid, tx, ty)) return false;
  }
  return true;
}

// Angle difference wrapped to [-PI, PI].
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// True when (px, py) sits inside the vision cone from (ox, oy).
export function inVisionCone(grid, ox, oy, facing, range, halfAngle, px, py) {
  const dx = px - ox;
  const dy = py - oy;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 0.001) return true;
  if (Math.abs(angleDiff(Math.atan2(dy, dx), facing)) > halfAngle) return false;
  return hasLineOfSight(grid, ox, oy, px, py);
}
