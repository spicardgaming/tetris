import React, { useState, useEffect, useRef } from "react";

// Tetris constants
const COLS = 10;
const ROWS = 20;
const VISIBLE_ROWS = 20; // visible rows
const LOCK_DELAY_MS = 500;

const TETROMINO_TYPES = ["I", "O", "T", "S", "Z", "J", "L"] as const;

const TETROMINOES = {
  I: {
    color: "bg-cyan-400",
    rotations: [
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      [
        [2, 0],
        [2, 1],
        [2, 2],
        [2, 3],
      ],
      [
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [1, 3],
      ],
    ],
  },
  O: {
    color: "bg-yellow-300",
    rotations: [
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [2, 1],
      ],
    ],
  },
  T: {
    color: "bg-purple-400",
    rotations: [
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
  },
  S: {
    color: "bg-green-400",
    rotations: [
      [
        [1, 0],
        [2, 0],
        [0, 1],
        [1, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 1],
        [2, 1],
        [0, 2],
        [1, 2],
      ],
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [1, 2],
      ],
    ],
  },
  Z: {
    color: "bg-red-400",
    rotations: [
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [2, 1],
      ],
      [
        [2, 0],
        [1, 1],
        [2, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [1, 0],
        [0, 1],
        [1, 1],
        [0, 2],
      ],
    ],
  },
  J: {
    color: "bg-blue-500",
    rotations: [
      [
        [0, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [2, 0],
        [1, 1],
        [1, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [2, 2],
      ],
      [
        [1, 0],
        [1, 1],
        [0, 2],
        [1, 2],
      ],
    ],
  },
  L: {
    color: "bg-orange-400",
    rotations: [
      [
        [2, 0],
        [0, 1],
        [1, 1],
        [2, 1],
      ],
      [
        [1, 0],
        [1, 1],
        [1, 2],
        [2, 2],
      ],
      [
        [0, 1],
        [1, 1],
        [2, 1],
        [0, 2],
      ],
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [1, 2],
      ],
    ],
  },
};

type Cell = { color: string; locked: boolean } | null;

type Piece = {
  type: keyof typeof TETROMINOES;
  rotation: number;
  x: number;
  y: number;
};

const createEmptyBoard = (): Cell[][] => {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
};

const shuffle = (array: readonly string[]) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const useBagRandomizer = () => {
  const bagRef = useRef<(keyof typeof TETROMINOES)[]>([]);

  const getNextType = (): keyof typeof TETROMINOES => {
    if (bagRef.current.length === 0) {
      bagRef.current = shuffle(TETROMINO_TYPES) as (keyof typeof TETROMINOES)[];
    }
    return bagRef.current.shift()!;
  };

  return getNextType;
};

const getCellsFromPiece = (piece: Piece) => {
  const def = TETROMINOES[piece.type];
  const shape = def.rotations[piece.rotation];
  return shape.map(([x, y]) => ({ x: piece.x + x, y: piece.y + y }));
};

const isValidPosition = (
  board: Cell[][],
  piece: Piece,
  offsetX = 0,
  offsetY = 0,
  rotation = piece.rotation
) => {
  const def = TETROMINOES[piece.type];
  const shape = def.rotations[rotation];
  for (const [px, py] of shape) {
    const x = piece.x + px + offsetX;
    const y = piece.y + py + offsetY;
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return false;
    if (board[y][x]) return false;
  }
  return true;
};

const computeGhostPiece = (board: Cell[][], piece: Piece): Piece => {
  let ghost: Piece = { ...piece };
  while (isValidPosition(board, ghost, 0, 1)) {
    ghost.y += 1;
  }
  return ghost;
};

const cloneBoard = (board: Cell[][]): Cell[][] => board.map((row) => [...row]);

const getDropInterval = (level: number) => {
  const base = 1000; // ms
  const step = 50; // per level
  return Math.max(100, base - (level - 1) * step);
};

const getLineClearScore = (lines: number, level: number) => {
  if (lines === 0) return 0;
  if (lines === 1) return 100 * level;
  if (lines === 2) return 300 * level;
  if (lines === 3) return 500 * level;
  if (lines === 4) return 800 * level;
  return 0;
};

const TetrisGame: React.FC = () => {
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "gameOver">("menu");
  const [board, setBoard] = useState<Cell[][]>(createEmptyBoard);
  const [activePiece, setActivePiece] = useState<Piece | null>(null);
  const [nextPieces, setNextPieces] = useState<(keyof typeof TETROMINOES)[]>([]);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [linesCleared, setLinesCleared] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [highScoreName, setHighScoreName] = useState<string | null>(null);
  const [highScoreCountry, setHighScoreCountry] = useState<string | null>(null);
  const [isNewRecordModalOpen, setIsNewRecordModalOpen] = useState(false);
  const [newRecordName, setNewRecordName] = useState("");
  const [newRecordCountry, setNewRecordCountry] = useState("");
  const [clearingLines, setClearingLines] = useState<number[]>([]);
  const [clearPhase, setClearPhase] = useState(0);

  const lastDropTimeRef = useRef<number | null>(null);
  const lockStartRef = useRef<number | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const getNextType = useBagRandomizer();

  const focusRef = useRef<HTMLDivElement | null>(null);

  // Load last record from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tetris_high_score");
      if (stored) {
        const parsed = parseInt(stored, 10);
        if (!Number.isNaN(parsed)) {
          setHighScore(parsed);
        }
      }
      const storedName = localStorage.getItem("tetris_high_score_name");
      if (storedName) {
        setHighScoreName(storedName);
      }
      const storedCountry = localStorage.getItem("tetris_high_score_country");
      if (storedCountry) {
        setHighScoreCountry(storedCountry);
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  const resetGame = () => {
    setBoard(createEmptyBoard());
    setScore(0);
    setLevel(1);
    setLinesCleared(0);
    setClearingLines([]);
    setClearPhase(0);
    lastDropTimeRef.current = null;
    lockStartRef.current = null;

    const firstType = getNextType();
    const nextType = getNextType();

    setNextPieces([nextType]);
    setActivePiece({
      type: firstType,
      rotation: 0,
      x: 3,
      y: 0,
    });
  };

  const startNewGame = () => {
    resetGame();
    setGameState("playing");
  };

  const spawnNextPiece = (currentBoard: Cell[][]) => {
    let nextType: keyof typeof TETROMINOES;
    let newNext: keyof typeof TETROMINOES;

    if (nextPieces.length === 0) {
      nextType = getNextType();
      newNext = getNextType();
    } else {
      nextType = nextPieces[0];
      newNext = getNextType();
    }

    const newPiece: Piece = {
      type: nextType,
      rotation: 0,
      x: 3,
      y: 0,
    };

    setNextPieces([newNext]);

    if (!isValidPosition(currentBoard, newPiece, 0, 0, newPiece.rotation)) {
      setGameState("gameOver");
      setActivePiece(null);

      const isNewRecord = score > highScore;
      if (isNewRecord) {
        try {
          localStorage.setItem("tetris_high_score", String(score));
        } catch (e) {
          // ignore storage errors
        }
        setHighScore(score);
        setIsNewRecordModalOpen(true);
        setNewRecordName("");
        setNewRecordCountry("");
      }

      return;
    }

    setActivePiece(newPiece);
    lockStartRef.current = null;
  };

  const lockPieceAndHandleBoard = (pieceOverride: Piece | null = null, boardOverride: Cell[][] | null = null) => {
    const piece = pieceOverride || activePiece;
    if (!piece) return;

    const workingBoard = cloneBoard(boardOverride || board);
    const def = TETROMINOES[piece.type];
    const shape = def.rotations[piece.rotation];

    for (const [px, py] of shape) {
      const x = piece.x + px;
      const y = piece.y + py;
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) {
        workingBoard[y][x] = {
          color: def.color,
          locked: true,
        };
      }
    }

    const fullLines: number[] = [];
    for (let y = 0; y < ROWS; y++) {
      const isFull = workingBoard[y].every((cell) => cell !== null);
      if (isFull) fullLines.push(y);
    }

    lockStartRef.current = null;

    if (fullLines.length === 0) {
      setBoard(workingBoard);
      spawnNextPiece(workingBoard);
      return;
    }

    setBoard(workingBoard);
    setClearingLines(fullLines);
    setClearPhase(1);
  };

  const tryMove = (dx: number, dy: number) => {
    if (!activePiece || gameState !== "playing") return;
    if (isValidPosition(board, activePiece, dx, dy)) {
      setActivePiece((prev) => (prev ? { ...prev, x: prev.x + dx, y: prev.y + dy } : prev));
      if (dy > 0) {
        lockStartRef.current = null;
      }
    } else if (dy > 0) {
      if (!lockStartRef.current) {
        lockStartRef.current = performance.now();
      } else {
        const now = performance.now();
        if (now - lockStartRef.current >= LOCK_DELAY_MS) {
          lockPieceAndHandleBoard();
        }
      }
    }
  };

  const hardDrop = () => {
    if (!activePiece || gameState !== "playing") return;

    let testPiece: Piece = { ...activePiece };
    let dropDistance = 0;

    while (isValidPosition(board, testPiece, 0, 1)) {
      testPiece.y += 1;
      dropDistance++;
    }

    if (dropDistance === 0) {
      lockPieceAndHandleBoard(activePiece, board);
      return;
    }

    setScore((prev) => prev + dropDistance * 2);
    lockPieceAndHandleBoard(testPiece, board);
  };

  const softDrop = () => {
    if (!activePiece || gameState !== "playing") return;
    if (isValidPosition(board, activePiece, 0, 1)) {
      setActivePiece((prev) => (prev ? { ...prev, y: prev.y + 1 } : prev));
      setScore((prev) => prev + 1);
      lockStartRef.current = null;
    } else {
      if (!lockStartRef.current) {
        lockStartRef.current = performance.now();
      } else {
        const now = performance.now();
        if (now - lockStartRef.current >= LOCK_DELAY_MS) {
          lockPieceAndHandleBoard();
        }
      }
    }
  };

  const rotatePiece = (direction = 1) => {
    if (!activePiece || gameState !== "playing") return;
    const newRotation = (activePiece.rotation + direction + 4) % 4;

    const offsets = [
      { x: 0, y: 0 },
      { x: -1, y: 0 },
      { x: 1, y: 0 },
      { x: -2, y: 0 },
      { x: 2, y: 0 },
    ];

    for (const off of offsets) {
      if (isValidPosition(board, activePiece, off.x, off.y, newRotation)) {
        setActivePiece((prev) =>
          prev
            ? {
                ...prev,
                rotation: newRotation,
                x: prev.x + off.x,
                y: prev.y + off.y,
              }
            : prev
        );
        return;
      }
    }
  };

  useEffect(() => {
    setLevel(Math.max(1, Math.floor(score / 5000) + 1));
  }, [score]);

  // Game loop for gravity
  useEffect(() => {
    const loop = (timestamp: number) => {
      if (gameState === "playing") {
        const interval = getDropInterval(level);
        if (lastDropTimeRef.current == null) {
          lastDropTimeRef.current = timestamp;
        }
        const delta = timestamp - lastDropTimeRef.current;
        if (delta >= interval) {
          tryMove(0, 1);
          lastDropTimeRef.current = timestamp;
        }
      } else {
        lastDropTimeRef.current = null;
      }
      animationFrameRef.current = requestAnimationFrame(loop);
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameState, level, board, activePiece]);

  // Line clear blink animation
  useEffect(() => {
    if (clearingLines.length === 0) return;

    if (clearPhase < 3) {
      const timeout = setTimeout(() => {
        setClearPhase((prev) => prev + 1);
      }, 120);
      return () => clearTimeout(timeout);
    }

    if (clearPhase === 3) {
      const linesToClear = [...clearingLines];
      const workingBoard = cloneBoard(board);
      const remainingRows: Cell[][] = [];

      for (let y = 0; y < ROWS; y++) {
        if (linesToClear.includes(y)) continue;
        remainingRows.push(workingBoard[y]);
      }

      while (remainingRows.length < ROWS) {
        remainingRows.unshift(Array<Cell>(COLS).fill(null));
      }

      const finalBoard = remainingRows;
      const linesThisMove = linesToClear.length;

      setBoard(finalBoard);
      setLinesCleared((prev) => prev + linesThisMove);
      setScore((prevScore) => prevScore + getLineClearScore(linesThisMove, level));
      setClearingLines([]);
      setClearPhase(0);
      spawnNextPiece(finalBoard);
    }
  }, [clearingLines, clearPhase, board, level]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (gameState === "menu") {
        if (e.code === "Space" || e.code === "Enter") {
          startNewGame();
        }
        return;
      }

      if (gameState === "gameOver") {
        if (e.code === "Space" || e.code === "Enter") {
          startNewGame();
        }
        return;
      }

      if (e.code === "KeyP" || e.code === "Escape") {
        setGameState((prev) => (prev === "playing" ? "paused" : prev === "paused" ? "playing" : prev));
        return;
      }

      if (gameState !== "playing") return;

      switch (e.code) {
        case "ArrowLeft":
          e.preventDefault();
          tryMove(-1, 0);
          break;
        case "ArrowRight":
          e.preventDefault();
          tryMove(1, 0);
          break;
        case "ArrowDown":
          e.preventDefault();
          softDrop();
          break;
        case "ArrowUp":
          e.preventDefault();
          rotatePiece(1);
          break;
        case "Space":
          e.preventDefault();
          hardDrop();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown as any);
    return () => window.removeEventListener("keydown", handleKeyDown as any);
  }, [gameState, board, activePiece, level]);

  useEffect(() => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  }, []);

  const ghostPiece = activePiece ? computeGhostPiece(board, activePiece) : null;
  const ghostCells = ghostPiece ? getCellsFromPiece(ghostPiece) : [];
  const activeCells = activePiece ? getCellsFromPiece(activePiece) : [];

  const cellIsIn = (cells: { x: number; y: number }[], x: number, y: number) =>
    cells.some((c) => c.x === x && c.y === y);

  const renderBoardCell = (x: number, y: number) => {
    const isActive = cellIsIn(activeCells, x, y);
    const isGhost = !isActive && cellIsIn(ghostCells, x, y);
    const lockedCell = board[y][x];
    const isClearingLine = clearingLines.includes(y);

    let cellClass = "bg-slate-900/60";
    let extra = "";

    if (lockedCell) {
      cellClass = lockedCell.color;
    }
    if (isGhost) {
      cellClass = "border border-dashed border-slate-400/60 bg-transparent";
    }
    if (isActive && activePiece) {
      const def = TETROMINOES[activePiece.type];
      cellClass = def.color + " shadow-lg";
    }

    if (isClearingLine && lockedCell && !isActive && !isGhost) {
      if (clearPhase === 1) {
        extra = " opacity-70";
      } else if (clearPhase === 2) {
        extra = " opacity-40";
      } else if (clearPhase === 3) {
        extra = " opacity-10";
      }
    }

    return (
      <div
        key={`${x}-${y}`}
        className={`w-5 h-5 sm:w-6 sm:h-6 border border-slate-800 ${cellClass}${extra} transition-colors duration-100`}
      />
    );
  };

  const handleSaveNewRecord = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newRecordName.trim() || "Anonymous";
    const country = newRecordCountry.trim();
    try {
      localStorage.setItem("tetris_high_score_name", name);
      localStorage.setItem("tetris_high_score_country", country);
    } catch (err) {
      // ignore storage errors
    }
    setHighScoreName(name);
    setHighScoreCountry(country || null);
    setIsNewRecordModalOpen(false);
  };

  const renderNextPieceMini = (type: keyof typeof TETROMINOES, index: number) => {
    const def = TETROMINOES[type];
    const shape = def.rotations[0];

    const minX = Math.min(...shape.map(([x]) => x));
    const maxX = Math.max(...shape.map(([x]) => x));
    const minY = Math.min(...shape.map(([, y]) => y));
    const maxY = Math.max(...shape.map(([, y]) => y));

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    const matrix: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
    for (const [x, y] of shape) {
      matrix[y - minY][x - minX] = true;
    }

    return (
      <div key={index} className="flex justify-center items-center p-1 bg-slate-900/60 rounded-xl">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${width}, 1fr)`,
            gridTemplateRows: `repeat(${height}, 1fr)`,
          }}
        >
          {matrix.map((row, y) =>
            row.map((filled, x) => (
              <div
                key={`${y}-${x}`}
                className={`w-4 h-4 border border-slate-800 ${filled ? def.color : "bg-slate-950/40"}`}
              />
            ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={focusRef}
      tabIndex={0}
      className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-slate-50 p-4 outline-none"
    >
      <div className="w-full max-w-4xl mx-auto flex flex-col sm:flex-row sm:gap-6 gap-4">
        {/* Main game area */}
        <div className="relative mx-auto sm:mx-0 w-full max-w-xl">
          {/* Board frame */}
          <div className="rounded-3xl bg-slate-900/70 p-3 sm:p-4 shadow-2xl border border-slate-700/60">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-slate-400">Tetris</div>
                <h1 className="text-lg sm:text-xl font-semibold">Falling Blocks</h1>
              </div>
              <div className="text-[10px] sm:text-xs text-right text-slate-400">
                <div>Arrows: Move / Rotate</div>
                <div>Space: Hard Drop</div>
                <div>P / Esc: Pause</div>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-2xl p-2 sm:p-3 border border-slate-800/80">
              <div className="grid grid-rows-[auto]">
                <div className="grid grid-cols-[minmax(0,1fr)]">
                  <div className="grid grid-rows-[auto] justify-center">
                    <div
                      className="grid"
                      style={{
                        gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
                        gridTemplateRows: `repeat(${VISIBLE_ROWS}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: VISIBLE_ROWS }).map((_, row) =>
                        Array.from({ length: COLS }).map((_, col) => renderBoardCell(col, row))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Overlays */}
          {gameState === "menu" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-3xl">
              <div className="text-center px-6">
                <h2 className="text-2xl font-bold mb-3">Tetris</h2>
                <p className="text-sm text-slate-300 mb-4">
                   Use arrow keys to move and rotate pieces. Space — hard drop, P or Esc — pause.
                </p>
                <button
                  onClick={startNewGame}
                  className="px-6 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm shadow-lg hover:shadow-xl transition-transform hover:-translate-y-0.5"
                >
                  Start game
                </button>
              </div>
            </div>
          )}

          {gameState === "paused" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 rounded-3xl">
              <div className="text-center px-6">
                <h2 className="text-2xl font-bold mb-2">Pause</h2>
                <p className="text-sm text-slate-300 mb-4">Press P or Esc to resume.</p>
                <button
                  onClick={() => setGameState("playing")}
                  className="px-5 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-sm shadow-lg hover:shadow-xl transition-transform hover:-translate-y-0.5"
                >
                  Resume
                </button>
              </div>
            </div>
          )}

          {gameState === "gameOver" && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 rounded-3xl">
              <div className="text-center px-6">
                <h2 className="text-2xl font-bold mb-2">Game over</h2>
                <p className="text-sm text-slate-300 mb-1">Score: {score}</p>
                <p className="text-xs text-slate-400 mb-4">High score: {highScore}</p>
                <div className="flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    onClick={startNewGame}
                    className="px-5 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm shadow-lg hover:shadow-xl transition-transform hover:-translate-y-0.5"
                  >
                    Play again
                  </button>
                  <button
                    onClick={() => setGameState("menu")}
                    className="px-5 py-2 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-50 font-semibold text-sm border border-slate-500/80"
                  >
                    Back to menu
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="flex-1 max-w-xs mx-auto sm:mx-0">
          <div className="h-full rounded-3xl bg-slate-900/70 p-4 shadow-2xl border border-slate-700/60 flex flex-col gap-4">
            {/* Statistics */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Statistics
              </h2>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950/70 rounded-2xl p-2 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase mb-1">Score</div>
                  <div className="text-base font-semibold tabular-nums">{score}</div>
                </div>
                <div className="bg-slate-950/70 rounded-2xl p-2 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase mb-1">Lines</div>
                  <div className="text-base font-semibold tabular-nums">{linesCleared}</div>
                </div>
                <div className="bg-slate-950/70 rounded-2xl p-2 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400 uppercase mb-1">Level</div>
                  <div className="text-base font-semibold tabular-nums">{level}</div>
                </div>
              </div>
              <div className="mt-2 bg-slate-950/70 rounded-2xl p-2 border border-slate-800/80 text-center text-xs">
  <div className="text-[10px] text-slate-400 uppercase mb-1">High score</div>
  <div className="text-base font-semibold tabular-nums">{highScore}</div>

  {(highScoreName || highScoreCountry) && (
    <div className="text-[10px] text-slate-400 mt-0.5">
      {highScoreName && <span>{highScoreName}</span>}
      {highScoreName && highScoreCountry && <span> · </span>}
      {highScoreCountry && <span>{highScoreCountry}</span>}
    </div>
  )}
</div>
            </div>

            {/* Next piece */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-400 mb-2">
                Next piece
              </h2>
              <div className="bg-slate-950/70 rounded-2xl p-3 border border-slate-800/80 flex items-center justify-center">
                {!nextPieces[0] ? (
                  <div className="text-xs text-slate-500 text-center">Generating piece queue…</div>
                ) : (
                  renderNextPieceMini(nextPieces[0], 0)
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="mt-auto text-[11px] text-slate-400 bg-slate-950/60 rounded-2xl p-3 border border-slate-800/80">
              <div className="font-semibold mb-1 uppercase tracking-[0.18em] text-slate-500">Controls</div>
              <ul className="space-y-0.5">
                <li>◀ ▶ — move horizontally</li>
                <li>▲ — rotate clockwise</li>
                <li>▼ — soft drop (faster fall)</li>
                <li>Space — hard drop (instant fall)</li>
                <li>P or Esc — pause / resume</li>
              </ul>
            </div>
          
          <div className="w-full flex flex-col items-center mt-3 gap-2">
  <img
    src="/spikrard-gaming-logo-white.png"
    alt="Spikrard Gaming logo"
    className="w-28 opacity-90"
  />

  <a
    href="https://50-spins.com/"
    target="_blank"
    rel="noopener noreferrer"
    className="text-xs text-slate-300 hover:text-white underline underline-offset-4"
  >
    Free spins from partners 
  </a>
</div>

          </div>
        </div>
      </div>
      {isNewRecordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl p-4 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold mb-2 text-center">New record!</h2>
<p className="text-xs text-slate-300 mb-3 text-center">
  Please enter your name and country in English to save the record.
</p>
<form onSubmit={handleSaveNewRecord} className="space-y-3">

              <div>
<label className="block text-[11px] text-slate-400 mb-1">Name (English only)</label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  value={newRecordName}
                  onChange={(e) => setNewRecordName(e.target.value)}
                  placeholder="Player"
                />
              </div>
              <div>
<label className="block text-[11px] text-slate-400 mb-1">Country (English only)</label>
                <input
                  type="text"
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                  value={newRecordCountry}
                  onChange={(e) => setNewRecordCountry(e.target.value)}
placeholder="e.g. USA"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsNewRecordModalOpen(false)}
                  className="px-3 py-1.5 rounded-full text-xs bg-slate-700 hover:bg-slate-600 border border-slate-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-full text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TetrisGame;
