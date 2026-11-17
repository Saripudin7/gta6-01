// Keyboard + mouse input. Held keys steer and drive; one-shot actions
// (interact, pause, mission list, mute) are consumed once per frame by
// the game loop so a single keypress never fires twice.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    pressed: new Set(),
    mouse: { x: 0, y: 0, down: false, clicked: false },
  };

  const KEYMAP = {
    KeyW: 'up',
    ArrowUp: 'up',
    KeyS: 'down',
    ArrowDown: 'down',
    KeyA: 'left',
    ArrowLeft: 'left',
    KeyD: 'right',
    ArrowRight: 'right',
    ShiftLeft: 'sprint',
    ShiftRight: 'sprint',
    Space: 'brake',
    KeyE: 'interact',
    KeyF: 'interact',
    KeyP: 'pause',
    Escape: 'pause',
    KeyM: 'mission',
    KeyN: 'mute',
    Enter: 'enter',
  };

  window.addEventListener('keydown', (event) => {
    const action = KEYMAP[event.code];
    if (!action) return;
    if (action === 'up' || action === 'down' || action === 'left' || action === 'right' || action === 'brake') {
      event.preventDefault();
    }
    if (event.repeat) return;
    input.keys.add(action);
    input.pressed.add(action);
  });

  window.addEventListener('keyup', (event) => {
    const action = KEYMAP[event.code];
    if (action) input.keys.delete(action);
  });

  window.addEventListener('blur', () => {
    input.keys.clear();
  });

  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    input.mouse.x = (event.clientX - rect.left) * (canvas.width / rect.width);
    input.mouse.y = (event.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) {
      input.mouse.down = true;
      input.mouse.clicked = true;
    }
  });

  window.addEventListener('mouseup', () => {
    input.mouse.down = false;
  });

  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  input.consumePressed = function consumePressed() {
    const snapshot = input.pressed;
    input.pressed = new Set();
    return snapshot;
  };

  input.endFrame = function endFrame() {
    input.mouse.clicked = false;
  };

  return input;
}
