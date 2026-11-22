// input.js — keyboard + mouse input. Keys are tracked as a live set so the
// engine can read held keys every frame; clicks set a move target on the floor.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.moveTarget = null; // {x, y} in tile coordinates, or null
    this._canvas = canvas;
    this._onKeyDown = (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
        event.preventDefault();
      }
      this.keys.add(event.key.toLowerCase());
      this._pressHandlers.forEach((fn) => fn(event.key.toLowerCase(), event));
    };
    this._onKeyUp = (event) => {
      this.keys.delete(event.key.toLowerCase());
    };
    this._onClick = (event) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (event.clientX - rect.left) * scaleX;
      const py = (event.clientY - rect.top) * scaleY;
      // The canvas shows the room at a 60px HUD offset in render coordinates;
      // the room itself starts at y = 0 in canvas space, so convert directly.
      this.moveTarget = { x: px / 32, y: py / 32 };
      this._clickHandlers.forEach((fn) => fn(this.moveTarget, event));
    };
    this._pressHandlers = [];
    this._clickHandlers = [];
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('click', this._onClick);
  }

  onPress(fn) {
    this._pressHandlers.push(fn);
  }

  onClick(fn) {
    this._clickHandlers.push(fn);
  }

  isDown(...names) {
    return names.some((name) => this.keys.has(name));
  }

  // Movement vector from WASD / arrow keys, normalised.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.isDown('a', 'arrowleft')) x -= 1;
    if (this.isDown('d', 'arrowright')) x += 1;
    if (this.isDown('w', 'arrowup')) y -= 1;
    if (this.isDown('s', 'arrowdown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  get sneaking() {
    return this.isDown('shift');
  }

  clearMoveTarget() {
    this.moveTarget = null;
  }
}
