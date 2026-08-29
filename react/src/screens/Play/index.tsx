import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/state/AuthContext';
import { api } from '@/api/endpoints';
import { LEVELS } from '@/components/game/vector/levels';
import { initArrows, occupiedSet, rayCells, type ArrowState } from '@/components/game/vector/engine';
import { Board } from '@/components/game/vector/Board';
import type { GameProgressState } from '@/api/types';
import '@/components/game/vector/vector.css';
import { ArrowLeft, Flame, RotateCcw, Lightbulb, Zap, Trophy, ShieldCheck, Clock } from 'lucide-react';

const PROGRESS_KEY = 'sparks.vector.progress';

interface LocalProgress {
  unlocked: number;
  best: Record<number, number>;
  credited: number[];
}

function loadLocalProgress(): LocalProgress {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        unlocked: Number(parsed.unlocked) || 1,
        best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
        credited: Array.isArray(parsed.credited) ? parsed.credited.map(Number) : [],
      };
    }
  } catch (e) {
    // ignore
  }
  return { unlocked: 1, best: {}, credited: [] };
}

function saveLocalProgress(p: LocalProgress) {
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
  } catch (e) {
    // ignore
  }
}

export const Play: React.FC = () => {
  const navigate = useNavigate();
  const { setWallet } = useAuth();

  // Local state + server synced state
  const [localProgress, setLocalProgress] = useState<LocalProgress>(loadLocalProgress());
  const [serverProgress, setServerProgress] = useState<GameProgressState | null>(null);

  const unlockedCount = Math.max(
    localProgress.unlocked,
    serverProgress?.unlockedLevel ?? 1
  );

  const [levelIdx, setLevelIdx] = useState(Math.min(unlockedCount - 1, LEVELS.length - 1));
  const level = LEVELS[levelIdx];

  const [arrows, setArrows] = useState<ArrowState[]>(initArrows(level));
  const [exiting, setExiting] = useState<ArrowState[]>([]);
  const [moves, setMoves] = useState(0);
  const [solved, setSolved] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [hintId, setHintId] = useState<number | null>(null);

  const [claiming, setClaiming] = useState(false);

  const startTimeRef = useRef(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch server-authoritative progress on mount
  useEffect(() => {
    let active = true;
    api.game
      .getProgress('vector')
      .then((res) => {
        if (!active) return;
        setServerProgress(res);
        // Merge with local storage
        setLocalProgress((cur) => {
          const merged: LocalProgress = {
            unlocked: Math.max(cur.unlocked, res.unlockedLevel),
            best: { ...cur.best, ...res.bestTimes },
            credited: Array.from(new Set([...cur.credited, ...res.completedLevels])),
          };
          saveLocalProgress(merged);
          return merged;
        });
      })
      .catch((err) => {
        console.warn('Could not sync game progress with server:', err);
      });

    return () => {
      active = false;
    };
  }, []);

  // Reset and load arrows on levelIdx change
  useEffect(() => {
    setArrows(initArrows(LEVELS[levelIdx]));
    setExiting([]);
    setMoves(0);
    setSolved(false);
    setElapsed(0);
    setHintId(null);
    setClaiming(false);
    startTimeRef.current = Date.now();
  }, [levelIdx]);

  // Game timer
  useEffect(() => {
    if (solved) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [solved]);

  const restartLevel = useCallback(() => {
    setArrows(initArrows(LEVELS[levelIdx]));
    setExiting([]);
    setMoves(0);
    setSolved(false);
    setElapsed(0);
    setHintId(null);
    startTimeRef.current = Date.now();
  }, [levelIdx]);

  const showHint = useCallback(() => {
    const occ = occupiedSet(arrows);
    const legal = arrows.filter((a) =>
      rayCells(a.r, a.c, a.dir, level.rows, level.cols).every((k: string) => !occ.has(k))
    );
    if (legal.length > 0) {
      setHintId(legal[0].id);
      setTimeout(() => setHintId(null), 500);
    }
  }, [arrows, level.rows, level.cols]);

  // Keyboard shortcut controls
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'r' || e.key === 'R') {
        restartLevel();
      } else if (e.key === 'h' || e.key === 'H') {
        showHint();
      } else if (e.key === 'Escape') {
        navigate('/');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [restartLevel, showHint, navigate]);

  function handleTap(id: number) {
    if (solved) return;
    const target = arrows.find((a) => a.id === id);
    if (!target) return;

    setMoves((m) => m + 1);

    // Move from active arrows to exiting
    setArrows((cur) => cur.filter((a) => a.id !== id));
    setExiting((cur) => [...cur, target]);

    setTimeout(() => {
      setExiting((cur) => cur.filter((a) => a.id !== id));
    }, 300);

    // Check win condition
    if (arrows.length === 1) {
      setTimeout(() => {
        handleWin();
      }, 320);
    }
  }

  function handleWin() {
    setSolved(true);
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);

    setLocalProgress((cur) => {
      const next = { ...cur };
      if (next.unlocked < levelIdx + 2) {
        next.unlocked = Math.min(LEVELS.length, levelIdx + 2);
      }
      const prevBest = next.best[level.level];
      if (prevBest === undefined || secs < prevBest) {
        next.best[level.level] = secs;
      }
      saveLocalProgress(next);
      return next;
    });
  }

  async function handleCollect() {
    setClaiming(true);
    const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);

    try {
      // Complete level on backend
      const res = await api.game.completeLevel(level.level, secs, moves, 'vector');
      setServerProgress(res.progress);
      setWallet(res.wallet);

      setLocalProgress((cur) => {
        const next: LocalProgress = {
          unlocked: Math.max(cur.unlocked, res.progress.unlockedLevel),
          best: { ...cur.best, ...res.progress.bestTimes },
          credited: Array.from(new Set([...cur.credited, level.level])),
        };
        saveLocalProgress(next);
        return next;
      });

      // Navigate to earn moment with dynamic earned sparks
      navigate('/earn', {
        state: {
          earned: res.totalEarned,
          balance: res.wallet.balance,
        },
      });
    } catch (e) {
      console.error('Failed to complete level on server:', e);
      // Fallback to legacy earn
      try {
        const res = await api.wallet.earn(150, 'MATCH_WIN', `vector-L${level.level}`);
        setLocalProgress((cur) => {
          const next = { ...cur, credited: [...cur.credited, level.level] };
          saveLocalProgress(next);
          return next;
        });
        navigate('/earn', { state: { earned: 150, balance: res.newBalance } });
      } catch (err) {
        console.error('Earn fallback failed:', err);
      }
    } finally {
      setClaiming(false);
    }
  }

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  const timeStr = `${mins}:${String(secs).padStart(2, '0')}`;

  const isCredited =
    (localProgress.credited ?? []).map(Number).includes(Number(level.level)) ||
    (serverProgress?.completedLevels ?? []).map(Number).includes(Number(level.level));

  const streakDays = serverProgress?.streakDays ?? 1;
  const streakMultiplier = serverProgress?.streakMultiplier ?? 1.0;
  const dailyEarned = serverProgress?.dailyEarned ?? 0;
  const dailyCap = serverProgress?.dailyCap ?? 1500;
  const quotaPercent = Math.min(100, Math.round((dailyEarned / dailyCap) * 100));

  const potentialSparks = Math.round(150 * streakMultiplier);

  return (
    <div className="vector-game">
      <button className="back-pill" onClick={() => navigate('/')}>
        <ArrowLeft size={14} />
        Exit to Hub
      </button>

      <header>
        <div className="eyebrow">Arrow Logic Puzzle</div>
        <h1>Vector</h1>
        <p className="sub">
          Tap an arrow to send it off the board — it can only leave if its straight-line ray to the outer edge is completely clear.
        </p>
      </header>

      <div className="deck-layout">
        {/* ── Left Stage: Game Board & HUD ──────────────────────────── */}
        <div className="game-stage">
          <div className="hud">
            <span>
              LEVEL <b id="hud-level">{String(level.level).padStart(2, '0')}</b>/10
            </span>
            <span className="divider" />
            <span>
              REMAINING <b id="hud-remaining">{arrows.length}</b>
            </span>
            <span className="divider" />
            <span>
              MOVES <b>{moves}</b>
            </span>
            <span className="divider" />
            <span>
              TIME <b id="hud-time">{timeStr}</b>
            </span>
          </div>

          <Board
            level={level}
            arrows={arrows}
            exiting={exiting}
            hintId={hintId}
            onTap={handleTap}
          />

          <div id="controls">
            <button className="btn" onClick={restartLevel} title="Shortcut: Press R">
              <RotateCcw size={13} />
              Restart <span className="kbd-hint">R</span>
            </button>
            <button className="btn" onClick={showHint} title="Shortcut: Press H">
              <Lightbulb size={13} />
              Legal Move <span className="kbd-hint">H</span>
            </button>
          </div>
        </div>

        {/* ── Right Column: Pro Tactical Command Deck ──────────────── */}
        <aside className="command-sidebar">
          {/* Economy & Quota Panel */}
          <div className="command-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Zap size={13} className="text-[#FDB827]" />
                Daily Economy Quota
              </div>
              <div className="streak-badge">
                <Flame size={12} fill="currentColor" />
                {streakDays}d Streak · {streakMultiplier}x
              </div>
            </div>

            <div className="flex items-baseline justify-between text-xs font-mono">
              <span className="text-[#96B3C1]">Daily Earned</span>
              <span className="font-bold text-[#EAF2F4]">
                {dailyEarned} / {dailyCap} ⚡
              </span>
            </div>

            <div className="quota-bar-wrap">
              <div className="quota-bar-fill" style={{ width: `${quotaPercent}%` }} />
            </div>

            <div className="mt-3 flex items-center justify-between text-[0.7rem] font-mono text-[#96B3C1]">
              <span>Next Level Reward</span>
              <span className="font-bold text-[#6FD9A6]">+{potentialSparks} Sparks</span>
            </div>
          </div>

          {/* Level Matrix */}
          <div className="command-panel">
            <div className="panel-header">
              <div className="panel-title">
                <Trophy size={13} className="text-[#6FD9A6]" />
                Level Matrix
              </div>
              <span className="text-[0.7rem] font-mono text-[#96B3C1]">
                {localProgress.credited.length} / 10 Cleared
              </span>
            </div>

            <div className="level-matrix">
              {LEVELS.map((L, i) => {
                const isUnlocked = i < unlockedCount;
                const isDone = localProgress.credited.includes(L.level);
                const isCurrent = i === levelIdx;
                const bestTime = localProgress.best[L.level];

                let cls = 'matrix-btn lvl-dot';
                if (isCurrent) cls += ' current';
                if (isDone) cls += ' done';
                if (!isUnlocked) cls += ' locked';

                return (
                  <button
                    key={L.level}
                    className={cls}
                    disabled={!isUnlocked}
                    onClick={() => isUnlocked && setLevelIdx(i)}
                    title={`Level ${L.level}${isDone ? ' (Completed)' : isUnlocked ? ' (Unlocked)' : ' (Locked)'}${bestTime !== undefined ? ` · Best: ${bestTime}s` : ''}`}
                  >
                    {L.level}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tactical Directive */}
          <div className="command-panel">
            <div className="panel-title mb-2">
              <ShieldCheck size={13} className="text-[#FF8C42]" />
              Tactical Rules
            </div>
            <p className="text-xs leading-relaxed text-[#96B3C1]">
              Every arrow that can legally move can safely move. There is never a dead end — only paths not yet spotted.
            </p>
            <div className="mt-2 flex items-center gap-1.5 text-[0.7rem] font-mono text-[#6C8B9A]">
              <Clock size={11} />
              <span>Optimal order: {level.criticalPath} sequence steps</span>
            </div>
          </div>
        </aside>
      </div>

      <footer>
        Sparks are credited to the server ledger upon first victory. Idempotent & verified across devices.
      </footer>

      {/* ── Win Overlay ────────────────────────────────────────────── */}
      {solved && (
        <div className="win-overlay show" data-testid="win-overlay">
          <div className="win-card">
            <div className="tag">Tactical Clear</div>
            <h2 id="win-title">Level {level.level} complete</h2>

            <div className="win-stats">
              <div>
                Arrows Cleared: <b>{level.arrows.length}</b>
              </div>
              <div>
                Moves Made: <b>{moves}</b>
              </div>
              <div>
                Time Elapsed: <b>{timeStr}</b>
              </div>
              {!isCredited && streakMultiplier > 1 && (
                <div className="mt-1 font-bold text-[#FDB827]">
                  🔥 {streakMultiplier}x Streak Multiplier Active
                </div>
              )}
            </div>

            {!isCredited ? (
              <div className="flex flex-col gap-2">
                <button
                  className="btn-gold"
                  onClick={handleCollect}
                  disabled={claiming}
                >
                  {claiming ? 'Recording Ledger…' : `Collect +${potentialSparks} ⚡`}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    const next = (levelIdx + 1) % LEVELS.length;
                    setLevelIdx(next);
                  }}
                >
                  Skip Reward & Next Level →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="earn-note">
                  Reward already earned for this level
                </div>
                <button
                  className="btn-gold"
                  style={{
                    color: '#fff',
                    backgroundColor: '#1B4562',
                    borderColor: '#1B4562',
                  }}
                  onClick={() => {
                    const next = (levelIdx + 1) % LEVELS.length;
                    setLevelIdx(next);
                  }}
                >
                  Next Level →
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
