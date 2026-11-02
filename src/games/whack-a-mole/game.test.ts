import { describe, expect, it } from 'vitest';
import {
  COLUMNS,
  POINTS_PER_MOLE,
  ROUND_SECONDS,
  ROWS,
  SPAWN_INTERVAL,
  UP_TIME,
  createState,
  popUp,
  spawnInterval,
  step,
  upTime,
  whack,
} from './game';

describe('whack-a-mole', () => {
  it('starts with every mole down, a full clock and no score', () => {
    const state = createState();
    expect(state.holes).toHaveLength(COLUMNS * ROWS);
    expect(state.holes.every((h) => h.upFor === 0)).toBe(true);
    expect(state.timeLeft).toBe(ROUND_SECONDS);
    expect(state.score).toBe(0);
    expect(state.phase).toBe('playing');
  });

  it('pops a mole up once the first interval has passed', () => {
    const state = createState();
    step(state, SPAWN_INTERVAL.start - 0.01, () => 0);
    expect(state.holes.some((h) => h.upFor > 0)).toBe(false);
    step(state, 0.02, () => 0);
    expect(state.holes.filter((h) => h.upFor > 0)).toHaveLength(1);
  });

  it('drops a mole back down when its time is up', () => {
    const state = createState();
    popUp(state, () => 0);
    const hole = state.holes[0];
    state.nextPop = 100;
    step(state, UP_TIME.start + 0.01);
    expect(hole.upFor).toBe(0);
  });

  it('scores a whack on a mole that is up and sends it down', () => {
    const state = createState();
    popUp(state, () => 0);
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y)).toBe(true);
    expect(state.score).toBe(POINTS_PER_MOLE);
    expect(hole.upFor).toBe(0);
  });

  it('scores nothing for a whack on an empty hole', () => {
    const state = createState();
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(0);
  });

  it('scores a mole only once', () => {
    const state = createState();
    popUp(state, () => 0);
    const hole = state.holes[0];
    whack(state, hole.x, hole.y);
    expect(whack(state, hole.x, hole.y)).toBe(false);
    expect(state.score).toBe(POINTS_PER_MOLE);
  });

  it('pops moles up faster and for less time as the round goes on', () => {
    const state = createState();
    const early = { interval: spawnInterval(state), up: upTime(state) };
    state.timeLeft = 1;
    expect(spawnInterval(state)).toBeLessThan(early.interval);
    expect(upTime(state)).toBeLessThan(early.up);
  });

  it('never pops two moles from the same hole', () => {
    const state = createState();
    for (let i = 0; i < state.holes.length; i++) expect(popUp(state, () => 0)).toBe(true);
    expect(popUp(state, () => 0)).toBe(false);
  });

  it('ends the round when the clock runs out and stops scoring', () => {
    const state = createState();
    popUp(state, () => 0);
    for (let t = 0; t < ROUND_SECONDS; t += 0.05) step(state, 0.05);
    step(state, 0.05);
    expect(state.phase).toBe('over');
    expect(state.timeLeft).toBe(0);
    const hole = state.holes[0];
    expect(whack(state, hole.x, hole.y)).toBe(false);
  });
});
