/**
 * ─── Vector — level data ───────────────────────────────────────────
 * The ten levels, transcribed verbatim from the original standalone
 * game (vector-arrow-puzzle.html). Boards were generated + verified
 * solvable offline via reverse construction; levels.test.ts re-locks
 * that guarantee in CI (greedy + random-order solves).
 *
 *   arrows:  [row, col, dir]  (0-indexed, row-major)
 *   criticalPath: minimum forced-sequence depth (design metadata)
 * ──────────────────────────────────────────────────────────────────
 */

export type Dir = 'up' | 'down' | 'left' | 'right';

export interface VectorLevel {
  level: number;
  rows: number;
  cols: number;
  arrows: Array<[number, number, Dir]>;
  criticalPath: number;
}

export const LEVELS: VectorLevel[] = [
  { level: 1, rows: 4, cols: 4, arrows: [[2, 0, 'left'], [2, 3, 'right'], [3, 1, 'left'], [0, 2, 'up']], criticalPath: 1 },
  { level: 2, rows: 4, cols: 4, arrows: [[0, 3, 'right'], [0, 2, 'right'], [3, 1, 'left'], [2, 0, 'left'], [2, 3, 'up']], criticalPath: 2 },
  { level: 3, rows: 5, cols: 5, arrows: [[4, 1, 'down'], [3, 1, 'down'], [2, 1, 'down'], [0, 4, 'right'], [2, 3, 'right'], [1, 0, 'up'], [0, 1, 'down']], criticalPath: 4 },
  { level: 4, rows: 5, cols: 5, arrows: [[0, 2, 'up'], [1, 2, 'up'], [3, 0, 'down'], [1, 0, 'left'], [1, 1, 'left'], [0, 3, 'up'], [4, 1, 'down'], [4, 4, 'right']], criticalPath: 2 },
  { level: 5, rows: 5, cols: 5, arrows: [[0, 4, 'right'], [4, 4, 'right'], [4, 3, 'right'], [4, 2, 'right'], [4, 1, 'right'], [3, 4, 'right'], [0, 0, 'right'], [2, 3, 'right'], [3, 3, 'down']], criticalPath: 4 },
  { level: 6, rows: 6, cols: 6, arrows: [[0, 0, 'left'], [0, 1, 'left'], [5, 4, 'down'], [4, 4, 'down'], [3, 4, 'down'], [3, 3, 'left'], [4, 2, 'right'], [0, 3, 'up'], [1, 4, 'up'], [1, 1, 'left'], [4, 0, 'up']], criticalPath: 3 },
  { level: 7, rows: 6, cols: 6, arrows: [[2, 0, 'up'], [5, 2, 'right'], [5, 0, 'up'], [0, 4, 'up'], [1, 1, 'up'], [0, 3, 'up'], [0, 5, 'right'], [2, 5, 'right'], [2, 4, 'right'], [2, 3, 'right'], [2, 2, 'right'], [2, 1, 'right']], criticalPath: 5 },
  { level: 8, rows: 6, cols: 6, arrows: [[4, 5, 'right'], [5, 1, 'down'], [0, 4, 'up'], [2, 2, 'down'], [0, 1, 'up'], [1, 1, 'up'], [2, 1, 'up'], [3, 1, 'up'], [0, 5, 'up'], [2, 0, 'left'], [2, 5, 'right'], [2, 4, 'right'], [2, 3, 'right']], criticalPath: 4 },
  { level: 9, rows: 7, cols: 7, arrows: [[0, 4, 'left'], [6, 5, 'down'], [4, 3, 'left'], [2, 6, 'left'], [6, 4, 'down'], [5, 4, 'down'], [4, 4, 'down'], [3, 0, 'left'], [3, 1, 'left'], [3, 2, 'left'], [3, 3, 'left'], [3, 4, 'left'], [6, 2, 'right'], [5, 3, 'left'], [1, 5, 'up']], criticalPath: 5 },
  { level: 10, rows: 7, cols: 7, arrows: [[4, 6, 'right'], [4, 5, 'right'], [4, 4, 'right'], [4, 3, 'right'], [4, 2, 'right'], [0, 6, 'up'], [0, 4, 'up'], [1, 6, 'up'], [6, 0, 'left'], [6, 1, 'left'], [6, 2, 'left'], [0, 0, 'up'], [1, 0, 'up'], [2, 0, 'up'], [3, 0, 'up'], [3, 2, 'down'], [5, 0, 'up']], criticalPath: 6 },
];

export const LEVEL_COUNT = LEVELS.length;
