import { describe, expect, it } from 'vitest';
import {
  GLOVE_RADIUS,
  GLOVE_RANGE,
  GLOVE_Y,
  MOUND,
  PITCHES,
  PITCHES_PER_ROUND,
  ballPosition,
  buttonAt,
  createState,
  isCaught,
  landingX,
  pitchButtons,
  selectPitch,
  step,
  throwPitch,
  type BaseballPitchState,
  type PitchType,
} from './game';

/** Throws `type` so it lands at `targetX`, with the glove held still at `gloveX`. */
function pitchAt(state: BaseballPitchState, type: PitchType, targetX: number, gloveX: number) {
  selectPitch(state, type);
  throwPitch(state, targetX - PITCHES[type].breakX);
  state.gloveX = gloveX;
  state.gloveSpeed = 0;
  step(state, PITCHES[type].flightTime);
}

describe('baseball pitch', () => {
  it('starts with a fastball selected, a full set of pitches and no score', () => {
    const state = createState();
    expect(state.selected).toBe('fastball');
    expect(state.pitchesLeft).toBe(PITCHES_PER_ROUND);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('lets you pick a pitch before you throw', () => {
    const state = createState();
    expect(selectPitch(state, 'curveball')).toBe(true);
    throwPitch(state, 400);
    expect(state.ball?.type).toBe('curveball');
  });

  it('cannot change the pitch while the ball is in the air', () => {
    const state = createState();
    throwPitch(state, 400);
    expect(selectPitch(state, 'slider')).toBe(false);
    expect(state.selected).toBe('fastball');
  });

  it('throws one ball at a time and uses one pitch per throw', () => {
    const state = createState();
    expect(throwPitch(state, 400)).toBe(true);
    expect(throwPitch(state, 400)).toBe(false);
    expect(state.pitchesLeft).toBe(PITCHES_PER_ROUND - 1);
  });

  it('throws a fastball straight at the aim', () => {
    expect(landingX('fastball', 300)).toBe(300);
    expect(ballPosition('fastball', 300, PITCHES.fastball.flightTime)).toEqual({
      x: 300,
      y: GLOVE_Y,
    });
  });

  it('breaks a curveball away from the aim, more at the end of its flight', () => {
    const aim = 300;
    const half = ballPosition('curveball', aim, PITCHES.curveball.flightTime / 2);
    const straightHalf = MOUND.x + (aim - MOUND.x) / 2;
    expect(half.x - straightHalf).toBeLessThan(PITCHES.curveball.breakX / 2);
    expect(landingX('curveball', aim)).toBe(aim + PITCHES.curveball.breakX);
    expect(PITCHES.curveball.breakX).not.toBe(0);
  });

  it('scores the pitch points when it lands in the glove', () => {
    for (const type of ['fastball', 'curveball', 'slider'] as const) {
      const state = createState();
      pitchAt(state, type, 450, 450 + GLOVE_RADIUS - 1);
      expect(state.score, type).toBe(PITCHES[type].points);
      expect(state.result?.caught).toBe(true);
      expect(state.ball).toBeNull();
    }
  });

  it('scores nothing when the pitch misses the glove', () => {
    const state = createState();
    pitchAt(state, 'curveball', 300, 300 + GLOVE_RADIUS + 5);
    expect(state.score).toBe(0);
    expect(state.result?.caught).toBe(false);
  });

  it('scores a curveball more than a fastball', () => {
    expect(PITCHES.curveball.points).toBeGreaterThan(PITCHES.fastball.points);
  });

  it('slides the glove side to side within its range', () => {
    const state = createState();
    for (let i = 0; i < 200; i++) {
      step(state, 0.05);
      expect(Math.abs(state.gloveX - 400)).toBeLessThanOrEqual(GLOVE_RANGE);
    }
  });

  it('ends the round once the last pitch has landed', () => {
    const state = createState();
    state.pitchesLeft = 1;
    throwPitch(state, 400);
    step(state, 0.1);
    expect(state.phase).toBe('playing');
    step(state, PITCHES.fastball.flightTime);
    expect(state.phase).toBe('over');
    expect(throwPitch(state, 400)).toBe(false);
  });

  it('detects a catch inside the glove and a miss outside it', () => {
    expect(isCaught(420, 400)).toBe(true);
    expect(isCaught(400 + GLOVE_RADIUS + 1, 400)).toBe(false);
  });

  it('finds the pitch button under a click', () => {
    const [first, second] = pitchButtons();
    expect(buttonAt(first.x + 5, first.y + 5)).toBe('fastball');
    expect(buttonAt(second.x + 5, second.y + 5)).toBe('curveball');
    expect(buttonAt(400, 100)).toBeUndefined();
  });
});
