// Solmar Bay — keyboard and mouse input.
// Tracks held keys, edge-triggered presses (so E fires once per tap), and the
// mouse position in canvas pixels plus the world point under the cursor.

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();       // currently held codes
    this.pressedKeys = new Set();// codes pressed since the last frame
    this.mouseX = 0;
    this.mouseY = 0;
    this.mouseDown = false;
    this.mouseClicked = false;   // left button pressed since last frame
    this.mouseWorldX = 0;
    this.mouseWorldY = 0;
    this.anyKey = false;         // any key or click since last frame
    this._attach();
  }

  _attach() {
    window.addEventListener('keydown', (event) => {
      if (event.repeat) return;
      this.keys.add(event.code);
      this.pressedKeys.add(event.code);
      this.anyKey = true;
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
    });
    window.addEventListener('keyup', (event) => {
      this.keys.delete(event.code);
    });
    window.addEventListener('blur', () => {
      this.keys.clear();
    });
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = event.clientX - rect.left;
      this.mouseY = event.clientY - rect.top;
    });
    this.canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouseDown = true;
        this.mouseClicked = true;
        this.anyKey = true;
      }
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  // True while the key is held down.
  held(code) {
    return this.keys.has(code);
  }

  // True once, on the frame the key went down.
  pressed(code) {
    return this.pressedKeys.has(code);
  }

  // Movement axes from WASD or the arrow keys. Returns {x, y} in -1..1.
  moveAxis() {
    let x = 0;
    let y = 0;
    if (this.held('KeyA') || this.held('ArrowLeft')) x -= 1;
    if (this.held('KeyD') || this.held('ArrowRight')) x += 1;
    if (this.held('KeyW') || this.held('ArrowUp')) y -= 1;
    if (this.held('KeyS') || this.held('ArrowDown')) y += 1;
    return { x, y };
  }

  // Is the player trying to run (on foot) right now?
  running() {
    return this.held('ShiftLeft') || this.held('ShiftRight');
  }

  // Convert the mouse position into world coordinates for aiming.
  updateMouseWorld(camera, scale) {
    this.mouseWorldX = camera.x + this.mouseX / scale;
    this.mouseWorldY = camera.y + this.mouseY / scale;
  }

  // Clear the edge-triggered flags at the end of each frame.
  endFrame() {
    this.pressedKeys.clear();
    this.mouseClicked = false;
    this.anyKey = false;
  }
}
