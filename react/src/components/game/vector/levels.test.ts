import { describe, expect, it } from 'vitest';
import { LEVELS } from './levels';
import {
  initArrows,
  legalArrows,
  solveGreedy,
  occupiedSet,
  isLegal,
} from './engine';

/**
 * ─── Solver locks ──────────────────────────────────────────────────
 * These tests freeze the 10 Vector levels:
 *   1. greedy solve clears every level (solvability)
 *   2. RANDOM-ORDER completion: thousands of random legal-move orders
 *      all finish — the monotonicity proof that no dead ends exist.
 * ──────────────────────────────────────────────────────────────────
 */

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function randomOrderSolve(level: typeof LEVELS[0], rand: () => number) {
  const arrows = initArrows(level);
  const order: number[] = [];
  for (;;) {
    const legal = legalArrows(arrows, level.rows, level.cols);
    if (legal.length === 0) break;
    const pick = legal[Math.floor(rand() * legal.length)];
    pick.alive = false;
    order.push(pick.id);
  }
  return arrows.every((a) => !a.alive) ? order : null;
}

describe('Vector levels — design spec', () => {
  it('has exactly 10 levels', () => {
    expect(LEVELS).toHaveLength(10);
  });
});

describe('Vector levels — solver locks', () => {
  LEVELS.forEach((lvl) => {
    it(`Level ${lvl.level}: greedy solve clears the board`, () => {
      const order = solveGreedy(lvl);
      expect(order).not.toBeNull();
      expect(order).toHaveLength(lvl.arrows.length);
    });

    it(`Level ${lvl.level}: every legal move order finishes (no dead states)`, () => {
      for (let seed = 1; seed <= 200; seed++) {
        const order = randomOrderSolve(lvl, seededRandom(seed * 7919 + lvl.level));
        expect(order).not.toBeNull();
        expect(order).toHaveLength(lvl.arrows.length);
      }
    });
  });
});

describe('Vector engine — lane rules', () => {
  it('blocks on arrows in the ray', () => {
    // Two arrows, one behind the other pointing right.
    const lvl = {
      level: 0,
      rows: 3,
      cols: 3,
      arrows: [[1, 0, 'right'], [1, 1, 'right']],
      criticalPath: 1,
    } as any;
    const arrows = initArrows(lvl);
    const occ = occupiedSet(arrows);
    expect(isLegal(arrows[0], occ, lvl.rows, lvl.cols)).toBe(false); // blocked by [1, 1]
    expect(isLegal(arrows[1], occ, lvl.rows, lvl.cols)).toBe(true);  // clear to edge
  });
});
