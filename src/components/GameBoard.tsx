'use client';
import React, { useState, useEffect, useRef } from 'react';
import styles from './GameBoard.module.css';

const MAX_PLAYERS = 8;
const PLAYER_COLORS = ['red', 'green', 'blue', 'yellow', 'purple', 'orange', 'cyan', 'magenta'] as const;
const CELL_SIZE = 60; // px

type Player = typeof PLAYER_COLORS[number];
type Cell = { owner: Player | null; atoms: number };
type Board = Cell[][];

interface GameSettings {
  rows: number;
  cols: number;
  players: number;
  fillScreen: boolean;
}

const GameBoard: React.FC = () => {
  const [board, setBoard] = useState<Board>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player>(PLAYER_COLORS[0]);
  const [gameOver, setGameOver] = useState<boolean>(false);
  const [winner, setWinner] = useState<Player | null>(null);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [settings, setSettings] = useState<GameSettings>({
    rows: 6,
    cols: 9,
    players: 2,
    fillScreen: false,
  });
  const [explodingCells, setExplodingCells] = useState<[number, number][]>([]);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (gameStarted) {
      initializeBoard();
    }
  }, [gameStarted, settings]);

  useEffect(() => {
    const handleResize = () => {
      if (settings.fillScreen && boardRef.current) {
        const { width, height } = boardRef.current.getBoundingClientRect();
        const newCols = Math.floor(width / CELL_SIZE);
        const newRows = Math.floor(height / CELL_SIZE);
        setSettings(prev => ({ ...prev, rows: newRows, cols: newCols }));
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [settings.fillScreen]);

  const initializeBoard = () => {
    const newBoard: Board = Array(settings.rows).fill(null).map(() => 
      Array(settings.cols).fill(null).map(() => ({ owner: null, atoms: 0 }))
    );
    setBoard(newBoard);
    setCurrentPlayer(PLAYER_COLORS[0]);
    setGameOver(false);
    setWinner(null);
  };

  const handleCellClick = async (row: number, col: number) => {
    if (gameOver || board[row][col].owner !== null && board[row][col].owner !== currentPlayer) return;

    let newBoard = board.map(row => [...row]);
    newBoard[row][col] = { ...newBoard[row][col], owner: currentPlayer, atoms: newBoard[row][col].atoms + 1 };

    if (newBoard[row][col].atoms > getCriticalMass(row, col)) {
      newBoard = await explode(row, col, newBoard, currentPlayer);
    }

    setBoard(newBoard);

    if (!gameOver) {
      const gameResult = checkGameState(newBoard);
      if (gameResult.gameOver) {
        setGameOver(true);
        setWinner(gameResult.winner);
      } else {
        const nextPlayerIndex = (PLAYER_COLORS.indexOf(currentPlayer) + 1) % settings.players;
        setCurrentPlayer(PLAYER_COLORS[nextPlayerIndex]);
      }
    }
  };

  const getCriticalMass = (row: number, col: number): number => {
    const isCorner = (row === 0 || row === settings.rows - 1) && (col === 0 || col === settings.cols - 1);
    const isEdge = row === 0 || row === settings.rows - 1 || col === 0 || col === settings.cols - 1;
    return isCorner ? 1 : isEdge ? 2 : 3;
  };

  const explode = async (row: number, col: number, board: Board, player: Player): Promise<Board> => {
    const queue: [number, number][] = [[row, col]];
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    let explodedCells = 0;
    const totalCells = settings.rows * settings.cols;

    while (queue.length > 0) {
      const currentExploding: [number, number][] = [];
      const currentQueue = [...queue];
      queue.length = 0;

      for (const [currentRow, currentCol] of currentQueue) {
        board[currentRow][currentCol] = { owner: null, atoms: 0 };
        currentExploding.push([currentRow, currentCol]);
        explodedCells++;

        directions.forEach(([dx, dy]) => {
          const newRow = currentRow + dx;
          const newCol = currentCol + dy;
          if (newRow >= 0 && newRow < settings.rows && newCol >= 0 && newCol < settings.cols) {
            board[newRow][newCol] = { owner: player, atoms: board[newRow][newCol].atoms + 1 };
            if (board[newRow][newCol].atoms > getCriticalMass(newRow, newCol)) {
              queue.push([newRow, newCol]);
            }
          }
        });
      }

      setExplodingCells(currentExploding);
      setBoard([...board]);
      await new Promise(resolve => setTimeout(resolve, 200));

      if (explodedCells >= totalCells) {
        setGameOver(true);
        setWinner(player);
        return board;
      }
    }

    setExplodingCells([]);
    return board;
  };

  const checkGameState = (board: Board): { gameOver: boolean; winner: Player | null } => {
    const players = new Set<Player>();
    let emptyCells = 0;

    for (const row of board) {
      for (const cell of row) {
        if (cell.owner === null) {
          emptyCells++;
        } else {
          players.add(cell.owner);
        }
      }
    }

    if (players.size === 1 && emptyCells === 0) {
      return { gameOver: true, winner: players.values().next().value };
    }

    return { gameOver: false, winner: null };
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (name === 'fillScreen') {
      const fillScreen = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({ ...prev, fillScreen }));
      if (fillScreen && boardRef.current) {
        const { width, height } = boardRef.current.getBoundingClientRect();
        const newCols = Math.floor(width / CELL_SIZE);
        const newRows = Math.floor(height / CELL_SIZE);
        setSettings(prev => ({ ...prev, rows: newRows, cols: newCols, fillScreen }));
      }
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : parseInt(value, 10)
      }));
    }
  };

  const getMinMaxPlayers = () => {
    const totalCells = settings.rows * settings.cols;
    const minPlayers = 2;
    const maxPlayers = Math.min(Math.floor(totalCells / 3), MAX_PLAYERS);
    return { minPlayers, maxPlayers };
  };

  const resetGame = () => {
    setGameStarted(false);
    setSettings({
      rows: 6,
      cols: 9,
      players: 2,
      fillScreen: false,
    });
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Chain Reaction</h1>
      {!gameStarted ? (
        <div className={styles.settings}>
          {!settings.fillScreen && (
            <>
              <label className={styles.settingLabel}>
                Rows: {settings.rows}
                <input type="range" name="rows" value={settings.rows} onChange={handleSettingsChange} min="3" max="20" />
              </label>
              <label className={styles.settingLabel}>
                Columns: {settings.cols}
                <input type="range" name="cols" value={settings.cols} onChange={handleSettingsChange} min="3" max="20" />
              </label>
            </>
          )}
          <label className={styles.settingLabel}>
            Players:
            <select name="players" value={settings.players} onChange={handleSettingsChange}>
              {Array.from({ length: getMinMaxPlayers().maxPlayers - getMinMaxPlayers().minPlayers + 1 }, (_, i) => i + getMinMaxPlayers().minPlayers).map(num => (
                <option key={num} value={num}>{num}</option>
              ))}
            </select>
          </label>
          <label className={styles.settingLabel}>
            Fill Screen:
            <input type="checkbox" name="fillScreen" checked={settings.fillScreen} onChange={handleSettingsChange} />
          </label>
          <button className={styles.button} onClick={() => setGameStarted(true)}>Start Game</button>
        </div>
      ) : (
        <>
          <div 
            ref={boardRef}
            className={`${styles.board} ${settings.fillScreen ? styles.fillScreen : ''}`} 
            style={{ 
              gridTemplateColumns: `repeat(${settings.cols}, ${CELL_SIZE}px)`,
              gridTemplateRows: `repeat(${settings.rows}, ${CELL_SIZE}px)`
            }}
          >
            {board.map((row, rowIndex) => (
              row.map((cell, colIndex) => (
                <div
                  key={`${rowIndex}-${colIndex}`}
                  className={`${styles.cell} ${cell.owner ? styles[cell.owner] : ''} ${explodingCells.some(([r, c]) => r === rowIndex && c === colIndex) ? styles.exploding : ''}`}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {cell.atoms > 0 && (
                    <div className={styles.atoms}>
                      {Array(cell.atoms).fill(null).map((_, i) => (
                        <div key={i} className={`${styles.atom} ${styles[cell.owner || '']}`} />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ))}
          </div>
          <div className={styles.info}>
            {gameOver ? (
              <p>{winner} wins!</p>
            ) : (
              <p>Current Player: <span className={styles[currentPlayer]}>{currentPlayer}</span></p>
            )}
          </div>
          <button className={styles.button} onClick={resetGame}>
            New Game
          </button>
        </>
      )}
    </div>
  );
};

export default GameBoard;