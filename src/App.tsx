/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music, Terminal } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface Track {
  id: number;
  title: string;
  artist: string;
  url: string;
  cover: string;
}

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 };
const GAME_SPEED = 100;

const TRACKS: Track[] = [
  {
    id: 1,
    title: "NEURAL_STATIC",
    artist: "VOID_ENGINE",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
    cover: "https://picsum.photos/seed/glitch1/200/200"
  },
  {
    id: 2,
    title: "DATA_BLEED",
    artist: "CYBER_GHOST",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
    cover: "https://picsum.photos/seed/glitch2/200/200"
  },
  {
    id: 3,
    title: "GHOST_IN_SHELL",
    artist: "ROOT_ACCESS",
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
    cover: "https://picsum.photos/seed/glitch3/200/200"
  }
];

export default function App() {
  // --- Game State ---
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [food, setFood] = useState<Point>({ x: 5, y: 5 });
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(true);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameLoopRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);

  // --- Music State ---
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [isPlayingMusic, setIsPlayingMusic] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentTrack = TRACKS[currentTrackIndex];

  // --- Music Logic ---
  useEffect(() => {
    audioRef.current = new Audio(currentTrack.url);
    audioRef.current.onended = () => handleSkip();
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [currentTrackIndex]);

  useEffect(() => {
    if (audioRef.current) {
      if (isPlayingMusic) {
        audioRef.current.play().catch(e => console.log("AUDIO_STREAM_ERROR", e));
      } else {
        audioRef.current.pause();
      }
    }
  }, [isPlayingMusic, currentTrackIndex]);

  const toggleMusic = () => setIsPlayingMusic(!isPlayingMusic);
  
  const handleSkip = () => {
    setCurrentTrackIndex((prev) => (prev + 1) % TRACKS.length);
  };

  const handlePrev = () => {
    setCurrentTrackIndex((prev) => (prev - 1 + TRACKS.length) % TRACKS.length);
  };

  // --- Game Logic ---
  const generateFood = useCallback((currentSnake: Point[]) => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      if (!currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y)) {
        break;
      }
    }
    return newFood;
  }, []);

  const resetGame = () => {
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setIsGameOver(false);
    setIsPaused(false);
    setFood(generateFood(INITIAL_SNAKE));
  };

  const moveSnake = useCallback(() => {
    if (isGameOver || isPaused) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
      };

      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        setIsPaused(true);
        if (score > highScore) setHighScore(score);
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        setFood(generateFood(newSnake));
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, food, isGameOver, isPaused, score, highScore, generateFood]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      switch (key) {
        case 'w': if (direction.y === 0) setDirection({ x: 0, y: -1 }); break;
        case 's': if (direction.y === 0) setDirection({ x: 0, y: 1 }); break;
        case 'a': if (direction.x === 0) setDirection({ x: -1, y: 0 }); break;
        case 'd': if (direction.x === 0) setDirection({ x: 1, y: 0 }); break;
        case ' ': setIsPaused(p => !p); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Scanlines on canvas
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 4) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Food (Magenta Glitch)
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(food.x * cellSize + 2, food.y * cellSize + 2, cellSize - 4, cellSize - 4);
    
    // Snake (Cyan Glitch)
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#00ffff' : '#00aaaa';
      ctx.fillRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
      
      if (isHead) {
        ctx.strokeStyle = '#fff';
        ctx.strokeRect(segment.x * cellSize + 1, segment.y * cellSize + 1, cellSize - 2, cellSize - 2);
      }
    });
  }, [snake, food]);

  const gameLoop = useCallback((time: number) => {
    if (time - lastMoveTimeRef.current > GAME_SPEED) {
      moveSnake();
      lastMoveTimeRef.current = time;
    }
    draw();
    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [moveSnake, draw]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="crt-overlay" />
      <div className="scanline" />

      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, skewX: 20 }}
        animate={{ opacity: 1, skewX: 0 }}
        className="text-center mb-12 relative z-10"
      >
        <h1 
          className="text-2xl md:text-4xl font-display font-bold glitch-text uppercase tracking-tighter text-glitch-cyan"
          data-text="SYSTEM_OVERRIDE:SNAKE"
        >
          SYSTEM_OVERRIDE:SNAKE
        </h1>
        <div className="h-1 w-full bg-glitch-magenta mt-2 animate-pulse" />
        <p className="text-[10px] font-mono mt-2 text-glitch-magenta/80 tracking-widest">
          [STATUS: UNSTABLE] // [ENCRYPTION: ACTIVE]
        </p>
      </motion.div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
        
        {/* Left: Data Stream */}
        <motion.div 
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3 space-y-4"
        >
          <div className="pixel-border bg-black p-4 space-y-4">
            <div className="flex items-center space-x-2 text-glitch-cyan border-b border-glitch-cyan pb-2">
              <Terminal size={14} />
              <span className="text-[10px] uppercase">DATA_LOG</span>
            </div>
            <div className="space-y-2 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-zinc-500">SCORE:</span>
                <span className="text-glitch-cyan">{score.toString().padStart(6, '0')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">HIGH:</span>
                <span className="text-glitch-magenta">{highScore.toString().padStart(6, '0')}</span>
              </div>
            </div>
          </div>

          <div className="pixel-border bg-black p-4">
            <div className="text-[8px] text-zinc-500 mb-2 uppercase">Input_Mapping</div>
            <div className="grid grid-cols-3 gap-1 text-[8px] font-mono text-glitch-cyan">
              <div /> <div className="border border-glitch-cyan p-1 text-center">W</div> <div />
              <div className="border border-glitch-cyan p-1 text-center">A</div>
              <div className="border border-glitch-cyan p-1 text-center">S</div>
              <div className="border border-glitch-cyan p-1 text-center">D</div>
            </div>
          </div>
        </motion.div>

        {/* Center: Mainframe */}
        <motion.div 
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-6 flex flex-col items-center"
        >
          <div className="pixel-border bg-black p-1 relative">
            <canvas 
              ref={canvasRef}
              width={400}
              height={400}
              className="w-full aspect-square max-w-[400px] border-2 border-zinc-900"
            />
            
            <AnimatePresence>
              {(isPaused || isGameOver) && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/90 flex flex-col items-center justify-center p-8 text-center"
                >
                  <h3 className={`text-xl font-display mb-4 ${isGameOver ? 'text-glitch-magenta' : 'text-glitch-cyan'}`}>
                    {isGameOver ? 'CRITICAL_FAILURE' : 'SYSTEM_HALTED'}
                  </h3>
                  <p className="text-[8px] font-mono text-zinc-500 mb-8 uppercase">
                    {isGameOver ? 'SEGMENTATION_FAULT: CORE_DUMPED' : 'AWAITING_USER_COMMAND'}
                  </p>
                  <button 
                    onClick={isGameOver ? resetGame : () => setIsPaused(false)}
                    className="pixel-button text-[10px]"
                  >
                    {isGameOver ? 'REBOOT_SYSTEM' : 'RESUME_EXECUTION'}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Right: Audio Core */}
        <motion.div 
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <div className="pixel-border bg-black p-4 flex flex-col items-center">
            <div className="flex items-center space-x-2 text-glitch-magenta border-b border-glitch-magenta w-full pb-2 mb-4">
              <Music size={14} />
              <span className="text-[10px] uppercase">AUDIO_CORE</span>
            </div>
            
            <div className="relative w-full aspect-square mb-4 border-2 border-glitch-magenta p-1">
              <img 
                src={currentTrack.cover} 
                alt="DATA" 
                className={`w-full h-full object-cover grayscale contrast-150 ${isPlayingMusic ? 'animate-pulse' : ''}`}
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-glitch-magenta/10 pointer-events-none" />
            </div>

            <div className="text-left w-full mb-6 font-mono">
              <div className="text-[10px] text-glitch-cyan truncate">{currentTrack.title}</div>
              <div className="text-[8px] text-zinc-500 uppercase">{currentTrack.artist}</div>
            </div>

            <div className="flex items-center justify-between w-full">
              <button onClick={handlePrev} className="text-zinc-500 hover:text-glitch-cyan"><SkipBack size={16} /></button>
              <button 
                onClick={toggleMusic}
                className="pixel-button p-2"
              >
                {isPlayingMusic ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button onClick={handleSkip} className="text-zinc-500 hover:text-glitch-cyan"><SkipForward size={16} /></button>
            </div>

            <div className="mt-6 w-full space-y-1">
              <div className="flex justify-between text-[6px] text-zinc-500 font-mono">
                <span>FREQ_MOD</span>
                <span>{isPlayingMusic ? 'ACTIVE' : 'IDLE'}</span>
              </div>
              <div className="h-1 bg-zinc-900 w-full">
                <motion.div 
                  animate={{ width: isPlayingMusic ? '100%' : '0%' }}
                  className="h-full bg-glitch-magenta"
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Terminal Footer */}
      <footer className="mt-12 text-[8px] font-mono text-zinc-700 uppercase tracking-[0.4em] relative z-10">
        {">>"} TERMINAL_ID: {Math.random().toString(36).substring(7).toUpperCase()} // NODE_01 // {new Date().toISOString()}
      </footer>
    </div>
  );
}
