import { canvasFont, recordScore, theme, type CarnivalGame } from '../../carnival';

const { width: WIDTH, height: HEIGHT } = theme.canvas;

export const PITCHES_PER_ROUND = 10;
export const MOUND = { x: WIDTH / 2, y: HEIGHT - 80 } as const;
export const GLOVE_Y = 130;
export const GLOVE_RADIUS = 30;
/** How far the catcher moves the glove from the middle, and how fast. */
export const GLOVE_RANGE = 220;
export const GLOVE_SPEED = 150;
const RESULT_TIME = 0.8;

export type PitchType = 'fastball' | 'curveball' | 'slider';

export interface Pitch {
  name: string;
  /** Seconds from the mound to the glove. */
  flightTime: number;
  /** Pixels the ball moves sideways from the aim point by the time it arrives. */
  breakX: number;
  points: number;
}

export const PITCHES: Record<PitchType, Pitch> = {
  fastball: { name: 'Fastball', flightTime: 0.45, breakX: 0, points: 10 },
  curveball: { name: 'Curveball', flightTime: 0.9, breakX: 120, points: 20 },
  slider: { name: 'Slider', flightTime: 0.65, breakX: -70, points: 15 },
};
export const PITCH_ORDER: readonly PitchType[] = ['fastball', 'curveball', 'slider'];

export interface Ball {
  type: PitchType;
  aimX: number;
  /** Seconds since the ball left the mound. */
  age: number;
  x: number;
  y: number;
}

export interface BaseballPitchState {
  selected: PitchType;
  ball: Ball | null;
  /** Centre of the catcher's glove; it slides side to side. */
  gloveX: number;
  /** Pixels per second; negative moves left. */
  gloveSpeed: number;
  pitchesLeft: number;
  score: number;
  /** The last pitch's result, shown for a moment after it lands. */
  result: { caught: boolean; age: number } | null;
  phase: 'playing' | 'over';
}

export function createState(): BaseballPitchState {
  return {
    selected: 'fastball',
    ball: null,
    gloveX: WIDTH / 2,
    gloveSpeed: GLOVE_SPEED,
    pitchesLeft: PITCHES_PER_ROUND,
    score: 0,
    result: null,
    phase: 'playing',
  };
}

/** Picks the pitch for the next throw. Returns false while a ball is in the air. */
export function selectPitch(state: BaseballPitchState, type: PitchType): boolean {
  if (state.phase !== 'playing' || state.ball) return false;
  state.selected = type;
  return true;
}

/**
 * Where a pitch is after `age` seconds, aimed at `aimX`. It travels straight up
 * the screen from the mound to the glove, and its break grows as it goes.
 */
export function ballPosition(type: PitchType, aimX: number, age: number) {
  const pitch = PITCHES[type];
  const t = Math.min(Math.max(age / pitch.flightTime, 0), 1);
  return {
    x: MOUND.x + (aimX - MOUND.x) * t + pitch.breakX * t * t,
    y: MOUND.y + (GLOVE_Y - MOUND.y) * t,
  };
}

/** Where a pitch aimed at `aimX` crosses the glove's line. */
export function landingX(type: PitchType, aimX: number): number {
  return aimX + PITCHES[type].breakX;
}

export function isCaught(ballX: number, gloveX: number): boolean {
  return Math.abs(ballX - gloveX) <= GLOVE_RADIUS;
}

/** Throws the selected pitch at `aimX`. Returns false if nothing was thrown. */
export function throwPitch(state: BaseballPitchState, aimX: number): boolean {
  if (state.phase !== 'playing' || state.ball || state.pitchesLeft === 0) return false;
  state.ball = { type: state.selected, aimX, age: 0, ...ballPosition(state.selected, aimX, 0) };
  state.pitchesLeft -= 1;
  return true;
}

/** Advances the game by `dt` seconds. */
export function step(state: BaseballPitchState, dt: number): void {
  if (state.phase === 'over') return;

  state.gloveX += state.gloveSpeed * dt;
  const left = WIDTH / 2 - GLOVE_RANGE;
  const right = WIDTH / 2 + GLOVE_RANGE;
  if (state.gloveX > right) {
    state.gloveX = right;
    state.gloveSpeed = -Math.abs(state.gloveSpeed);
  } else if (state.gloveX < left) {
    state.gloveX = left;
    state.gloveSpeed = Math.abs(state.gloveSpeed);
  }

  if (state.result) {
    state.result.age += dt;
    if (state.result.age >= RESULT_TIME) state.result = null;
  }

  const ball = state.ball;
  if (ball) {
    ball.age += dt;
    Object.assign(ball, ballPosition(ball.type, ball.aimX, ball.age));
    if (ball.age >= PITCHES[ball.type].flightTime) {
      const caught = isCaught(ball.x, state.gloveX);
      if (caught) state.score += PITCHES[ball.type].points;
      state.result = { caught, age: 0 };
      state.ball = null;
    }
  }

  if (state.pitchesLeft === 0 && !state.ball) state.phase = 'over';
}

const BUTTON = { width: 150, height: 40, gap: 12, y: HEIGHT - 52 } as const;

/** The pitch buttons along the bottom, left to right in PITCH_ORDER. */
export function pitchButtons() {
  return PITCH_ORDER.map((type, i) => ({
    type,
    x: 16 + i * (BUTTON.width + BUTTON.gap),
    y: BUTTON.y,
    width: BUTTON.width,
    height: BUTTON.height,
  }));
}

/** The pitch button at a point on the canvas, if there is one. */
export function buttonAt(x: number, y: number): PitchType | undefined {
  return pitchButtons().find(
    (b) => x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height,
  )?.type;
}

function draw(ctx: CanvasRenderingContext2D, state: BaseballPitchState, aimX: number) {
  const { colors } = theme;

  ctx.fillStyle = colors.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Booth awning.
  const stripe = WIDTH / 16;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = i % 2 === 0 ? colors.stripeA : colors.stripeB;
    ctx.fillRect(i * stripe, 0, stripe, 40);
  }

  // The catcher's backstop and the dirt between mound and plate.
  ctx.fillStyle = colors.surface;
  ctx.fillRect(WIDTH / 2 - GLOVE_RANGE - 60, 60, (GLOVE_RANGE + 60) * 2, 120);
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.ellipse(MOUND.x, MOUND.y, 50, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  // Catcher, crouched behind the glove.
  ctx.fillStyle = colors.muted;
  ctx.beginPath();
  ctx.arc(state.gloveX, GLOVE_Y - 30, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(state.gloveX - 26, GLOVE_Y - 14, 52, 40);

  // Glove.
  ctx.fillStyle = colors.wood;
  ctx.beginPath();
  ctx.arc(state.gloveX, GLOVE_Y, GLOVE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Aim marker on the glove's line.
  if (state.phase === 'playing' && !state.ball) {
    ctx.strokeStyle = colors.text;
    ctx.globalAlpha = 0.6;
    ctx.setLineDash([6, 6]);
    ctx.beginPath();
    ctx.moveTo(MOUND.x, MOUND.y);
    ctx.lineTo(aimX, GLOVE_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Pitcher on the mound.
  ctx.fillStyle = colors.accent;
  ctx.beginPath();
  ctx.arc(MOUND.x, MOUND.y - 24, 16, 0, Math.PI * 2);
  ctx.fill();

  if (state.ball) {
    ctx.fillStyle = colors.stripeB;
    ctx.beginPath();
    ctx.arc(state.ball.x, state.ball.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = colors.stripeA;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  if (state.result) {
    ctx.globalAlpha = 1 - state.result.age / RESULT_TIME;
    ctx.fillStyle = state.result.caught ? colors.accent : colors.danger;
    ctx.font = canvasFont('title', 'bold');
    ctx.textAlign = 'center';
    ctx.fillText(state.result.caught ? 'Caught!' : 'Missed', WIDTH / 2, 240);
    ctx.globalAlpha = 1;
  }

  ctx.font = canvasFont('small', 'bold');
  for (const [i, button] of pitchButtons().entries()) {
    const pitch = PITCHES[button.type];
    const active = button.type === state.selected;
    ctx.fillStyle = active ? colors.accent : colors.surface;
    ctx.beginPath();
    ctx.roundRect(button.x, button.y, button.width, button.height, theme.radius);
    ctx.fill();
    ctx.fillStyle = active ? colors.background : colors.text;
    ctx.textAlign = 'center';
    ctx.fillText(
      `${i + 1} ${pitch.name} (${pitch.points})`,
      button.x + button.width / 2,
      button.y + button.height / 2 + 5,
    );
  }

  ctx.fillStyle = colors.text;
  ctx.font = canvasFont('body', 'bold');
  ctx.textAlign = 'right';
  ctx.fillText(`Score ${state.score}`, WIDTH - 16, HEIGHT - 44);
  ctx.fillText(`Pitches ${state.pitchesLeft}/${PITCHES_PER_ROUND}`, WIDTH - 16, HEIGHT - 18);

  if (state.phase === 'over') {
    ctx.fillStyle = colors.background;
    ctx.globalAlpha = 0.8;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    ctx.fillStyle = colors.accent;
    ctx.font = canvasFont('title', 'bold');
    ctx.fillText(`Game over! You scored ${state.score}`, WIDTH / 2, HEIGHT / 2);
    ctx.fillStyle = colors.text;
    ctx.font = canvasFont('body');
    ctx.fillText('Click to play again', WIDTH / 2, HEIGHT / 2 + 40);
  }
}

export const baseballPitch: CarnivalGame = {
  id: 'baseball-pitch',
  name: 'Baseball Pitch',
  description: "Pick a pitch and throw it into the catcher's glove. Curveballs score more.",

  start(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let state = createState();
    let scoreRecorded = false;
    let aimX = WIDTH / 2;

    const toCanvas = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: ((event.clientX - rect.left) / rect.width) * WIDTH,
        y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
      };
    };
    const onMove = (event: PointerEvent) => {
      aimX = toCanvas(event).x;
    };
    const onDown = (event: PointerEvent) => {
      const point = toCanvas(event);
      if (state.phase === 'over') {
        state = createState();
        scoreRecorded = false;
        return;
      }
      const button = buttonAt(point.x, point.y);
      if (button) {
        selectPitch(state, button);
      } else {
        aimX = point.x;
        throwPitch(state, aimX);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      const type = PITCH_ORDER[Number(event.key) - 1];
      if (type) selectPitch(state, type);
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);

    let frame = 0;
    let last = performance.now();
    const loop = (time: number) => {
      // Cap the step so a background tab doesn't teleport everything.
      const dt = Math.min((time - last) / 1000, 0.05);
      last = time;
      step(state, dt);
      if (state.phase === 'over' && !scoreRecorded) {
        recordScore(baseballPitch.id, state.score);
        scoreRecorded = true;
      }
      draw(ctx, state, aimX);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  },
};

export default baseballPitch;
