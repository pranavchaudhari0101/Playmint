/**
 * ─── Vector engine ─────────────────────────────────────────────────
 * Pure game logic ported from the standalone original. An arrow can
 * exit only when every cell from it to the board edge in its firing
 * direction is clear of other arrows. Removal only ever opens rays
 * (monotonicity) — a solvable board can never dead-end mid-solve.
 * ──────────────────────────────────────────────────────────────────
 */

import type { Dir, VectorLevel } from './levels';

export const DIRS: Record<Dir, [number, number]> = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
};

export interface ArrowState {
  id: number;
  r: number;
  c: number;
  dir: Dir;
  alive: boolean;
}

export function initArrows(level: VectorLevel): ArrowState[] {
  return level.arrows.map((t, idx) => ({ id: idx, r: t[0], c: t[1], dir: t[2], alive: true }));
}

/** Cells from (r,c) in dir up to the edge, nearest first. */
export function rayCells(r: number, c: number, dir: Dir, rows: number, cols: number): string[] {
  const [dr, dc] = DIRS[dir];
  const cells: string[] = [];
  r += dr;
  c += dc;
  while (r >= 0 && r < rows && c >= 0 && c < cols) {
    cells.push(`${r},${c}`);
    r += dr;
    c += dc;
  }
  return cells;
}

export function occupiedSet(arrows: ArrowState[]): Set<string> {
  const s = new Set<string>();
  for (const a of arrows) if (a.alive) s.add(`${a.r},${a.c}`);
  return s;
}

export function isLegal(a: ArrowState, occ: Set<string>, rows: number, cols: number): boolean {
  if (!a.alive) return false;
  return rayCells(a.r, a.c, a.dir, rows, cols).every((k) => !occ.has(k));
}

export function legalArrows(arrows: ArrowState[], rows: number, cols: number): ArrowState[] {
  const occ = occupiedSet(arrows);
  return arrows.filter((a) => isLegal(a, occ, rows, cols));
}

/**
 * Greedy solver (always the first legal arrow). Returns the removal
 * order, or null if stuck. Monotonicity means null ⇒ unsolvable LEVEL,
 * never a wrong order.
 */
export function solveGreedy(level: VectorLevel): number[] | null {
  const arrows = initArrows(level);
  const order: number[] = [];
  for (;;) {
    const legal = legalArrows(arrows, level.rows, level.cols);
    if (legal.length === 0) break;
    const pick = legal[0];
    pick.alive = false;
    order.push(pick.id);
  }
  return arrows.every((a) => !a.alive) ? order : null;
}
