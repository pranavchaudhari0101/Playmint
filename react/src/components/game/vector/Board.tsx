import React, { useMemo, useState } from 'react';
import { isLegal, occupiedSet, rayCells, type ArrowState } from './engine';
import type { VectorLevel } from './levels';

/**
 * React port of the original DOM board: legal-move glow, hover ray
 * preview, denied shake, directional exit animations. Arrow rotation
 * comes from the direction (up = 0°, right = 90°, …).
 */

const ARROW_ROT: Record<string, number> = { up: 0, right: 90, down: 180, left: 270 };

interface BoardProps {
  level: VectorLevel;
  arrows: ArrowState[];
  exiting: ArrowState[];
  hintId: number | null;
  onTap(id: number): void;
}

export const Board: React.FC<BoardProps> = ({ level, arrows, exiting, hintId, onTap }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [deniedId, setDeniedId] = useState<number | null>(null);

  const occ = useMemo(() => occupiedSet(arrows), [arrows]);

  const hoveredArrow = hovered !== null ? arrows.find((a) => a.id === hovered) : null;
  const hoveredCells = useMemo(() => {
    if (!hoveredArrow) return null;
    const legal = isLegal(hoveredArrow, occ, level.rows, level.cols);
    return {
      legal,
      cells: new Set(rayCells(hoveredArrow.r, hoveredArrow.c, hoveredArrow.dir, level.rows, level.cols)),
    };
  }, [hoveredArrow, occ, level.rows, level.cols]);

  function handleTap(id: number) {
    const arrow = arrows.find((a) => a.id === id);
    if (!arrow) return;
    if (isLegal(arrow, occ, level.rows, level.cols)) {
      onTap(id);
    } else {
      setDeniedId(id);
      setTimeout(() => setDeniedId((cur) => (cur === id ? null : cur)), 340);
    }
  }

  const cells = [];
  for (let r = 0; r < level.rows; r++) {
    for (let c = 0; c < level.cols; c++) {
      const k = `${r},${c}`;
      const inRay = hoveredCells?.cells.has(k);
      cells.push(
        <div
          key={k}
          className={[
            'cell',
            inRay && hoveredCells?.legal ? 'hoverpath' : '',
            inRay && !hoveredCells?.legal ? 'hoverpath-blocked' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          style={{ gridRow: r + 1, gridColumn: c + 1 }}
        />,
      );
    }
  }

  const renderArrow = (a: ArrowState, isExiting: boolean) => {
    const legal = !isExiting && isLegal(a, occ, level.rows, level.cols);
    const classes = [
      'arrow',
      legal ? 'legal' : '',
      isExiting ? `leaving-${a.dir}` : '',
      deniedId === a.id ? 'denied' : '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div key={a.id} style={{ gridRow: a.r + 1, gridColumn: a.c + 1, position: 'relative' }}>
        <button
          type="button"
          data-testid={legal ? 'legal-arrow' : undefined}
          data-arrow-id={a.id}
          className={classes}
          style={hintId === a.id && !isExiting ? { transform: 'scale(1.18)' } : undefined}
          aria-label={`Arrow facing ${a.dir}, ${legal ? 'path clear, tap to remove' : 'blocked'}`}
          disabled={isExiting}
          onClick={() => handleTap(a.id)}
          onMouseEnter={() => !isExiting && setHovered(a.id)}
          onMouseLeave={() => setHovered((cur) => (cur === a.id ? null : cur))}
        >
          <svg viewBox="0 0 24 24" style={{ transform: `rotate(${ARROW_ROT[a.dir]}deg)` }}>
            <path className="tri" d="M12 2 L21 20 L12 15.5 L3 20 Z" />
          </svg>
        </button>
      </div>
    );
  };

  return (
    <div id="board-wrap">
      <div className="corner tl" />
      <div className="corner tr" />
      <div className="corner bl" />
      <div className="corner br" />
      <div
        id="board"
        role="grid"
        aria-label="Puzzle board"
        data-testid="vector-board"
        style={{
          gridTemplateColumns: `repeat(${level.cols}, 1fr)`,
          gridTemplateRows: `repeat(${level.rows}, 1fr)`,
        }}
      >
        {cells}
        {arrows.map((a) => renderArrow(a, false))}
        {exiting.map((a) => renderArrow(a, true))}
      </div>
    </div>
  );
};
