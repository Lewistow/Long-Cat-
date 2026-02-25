/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MousePointer2, Maximize2, Info, Trophy, Target, TrendingUp } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis } from 'recharts';

// --- Types ---

interface Segment {
  x: number;
  y: number;
}

interface Tuna {
  x: number;
  y: number;
  id: string;
}

interface LeaderboardEntry {
  name: string;
  length: number;
}

interface GrowthData {
  time: number;
  length: number;
}

interface Meow {
  x: number;
  y: number;
  id: string;
  life: number;
}

// --- Constants ---

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 800;
const SEGMENT_DISTANCE = 12;
const INITIAL_SEGMENTS = 20;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [length, setLength] = useState(0);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [tuna, setTuna] = useState<Tuna[]>([]);
  const [growthData, setGrowthData] = useState<GrowthData[]>([]);
  const [meows, setMeows] = useState<Meow[]>([]);
  
  // State
  const segmentsRef = useRef<Segment[]>([]);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 400, y: 400 });
  const requestRef = useRef<number>(null);
  const startTimeRef = useRef<number>(0);

  const fetchLeaderboard = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      setLeaderboard(data);
    } catch (e) {
      console.error("Failed to fetch leaderboard", e);
    }
  };

  const submitScore = async () => {
    try {
      await fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "Anonymous Feline", length: segmentsRef.current.length * 0.1 })
      });
      fetchLeaderboard();
    } catch (e) {
      console.error("Failed to submit score", e);
    }
  };

  const spawnTuna = () => {
    const newTuna: Tuna = {
      x: 50 + Math.random() * (CANVAS_WIDTH - 100),
      y: 50 + Math.random() * (CANVAS_HEIGHT - 100),
      id: Math.random().toString(36).substr(2, 9)
    };
    setTuna(prev => [...prev, newTuna]);
  };

  const initGame = () => {
    segmentsRef.current = [];
    for (let i = 0; i < INITIAL_SEGMENTS; i++) {
      segmentsRef.current.push({ x: 400, y: 400 + i * SEGMENT_DISTANCE });
    }
    setTuna([]);
    setGrowthData([]);
    setMeows([]);
    startTimeRef.current = Date.now();
    spawnTuna();
    spawnTuna();
    setGameState('playing');
    fetchLeaderboard();
  };

  const update = () => {
    const segments = segmentsRef.current;
    const mouse = mouseRef.current;

    if (gameState !== 'playing') return;

    // 1. Update Head (Obsessive Laser Following)
    const head = segments[0];
    const dx = mouse.x - head.x;
    const dy = mouse.y - head.y;
    
    head.x += dx * 0.2;
    head.y += dy * 0.2;

    // 2. Update Body
    for (let i = 1; i < segments.length; i++) {
      const p = segments[i];
      const prev = segments[i - 1];
      const dist = Math.hypot(prev.x - p.x, prev.y - p.y);
      
      if (dist > SEGMENT_DISTANCE) {
        const angle = Math.atan2(prev.y - p.y, prev.x - p.x);
        p.x = prev.x - Math.cos(angle) * SEGMENT_DISTANCE;
        p.y = prev.y - Math.sin(angle) * SEGMENT_DISTANCE;
      }
    }

    // 3. Collision with Tuna
    setTuna(currentTuna => {
      const hitIdx = currentTuna.findIndex(t => Math.hypot(head.x - t.x, head.y - t.y) < 30);
      if (hitIdx !== -1) {
        // Grow body
        for (let i = 0; i < 15; i++) {
          const last = segments[segments.length - 1];
          segments.push({ x: last.x, y: last.y });
        }
        setLength(segments.length);
        spawnTuna();
        
        // Add Meow
        const newMeow: Meow = { x: head.x, y: head.y, id: Math.random().toString(), life: 1 };
        setMeows(prev => [...prev, newMeow]);

        // Add Growth Data
        setGrowthData(prev => [
          ...prev, 
          { time: Math.floor((Date.now() - startTimeRef.current) / 1000), length: segments.length * 0.1 }
        ].slice(-20));

        return currentTuna.filter((_, i) => i !== hitIdx);
      }
      return currentTuna;
    });

    // 4. Update Meows
    setMeows(prev => prev.map(m => ({ ...m, y: m.y - 2, life: m.life - 0.02 })).filter(m => m.life > 0));

    // 5. Boundary Check (Game Over)
    if (head.x < 0 || head.x > CANVAS_WIDTH || head.y < 0 || head.y > CANVAS_HEIGHT) {
      setGameState('gameover');
      submitScore();
    }

    draw();
    requestRef.current = requestAnimationFrame(update);
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const segments = segmentsRef.current;
    if (segments.length < 2) return;

    // Draw Body Path
    ctx.beginPath();
    ctx.moveTo(segments[0].x, segments[0].y);
    for (let i = 1; i < segments.length; i++) {
      ctx.lineTo(segments[i].x, segments[i].y);
    }
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 24;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();

    // Draw Tuna
    tuna.forEach(t => {
      ctx.fillStyle = '#FF6321';
      ctx.beginPath();
      ctx.ellipse(t.x, t.y, 15, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(t.x - 12, t.y);
      ctx.lineTo(t.x - 20, t.y - 8);
      ctx.lineTo(t.x - 20, t.y + 8);
      ctx.fill();
    });

    // Draw Meows
    meows.forEach(m => {
      ctx.globalAlpha = m.life;
      ctx.fillStyle = '#0a0a0a';
      ctx.font = 'bold 20px Inter';
      ctx.fillText('MEOW', m.x + 20, m.y);
    });
    ctx.globalAlpha = 1.0;

    // Draw "Cat" Details on Head
    const head = segments[0];
    const angle = Math.atan2(mouseRef.current.y - head.y, mouseRef.current.x - head.x);
    
    ctx.save();
    ctx.translate(head.x, head.y);
    ctx.rotate(angle);
    
    ctx.fillStyle = '#0a0a0a';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 14, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(-5, -12); ctx.lineTo(-15, -24); ctx.lineTo(4, -14); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-5, 12); ctx.lineTo(-15, 24); ctx.lineTo(4, 14); ctx.fill();

    ctx.fillStyle = '#f5f5f4';
    ctx.beginPath();
    ctx.arc(6, -5, 3, 0, Math.PI * 2);
    ctx.arc(6, 5, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Draw Laser Dot
    ctx.fillStyle = '#ff0000';
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0000';
    ctx.beginPath();
    ctx.arc(mouseRef.current.x, mouseRef.current.y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    mouseRef.current = { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  return (
    <div className="min-h-screen bg-[#f5f5f4] flex flex-col lg:flex-row overflow-hidden">
      {/* Left Rail: Branding & Stats */}
      <div className="w-full lg:w-96 border-b lg:border-b-0 lg:border-r border-black/10 p-8 flex flex-col justify-between z-10 bg-[#f5f5f4]">
        <div>
          <h1 className="text-8xl font-black tracking-tighter leading-[0.8] mb-4">
            LONG<br />CAT
          </h1>
          <p className="text-xs font-bold uppercase tracking-[0.3em] opacity-30 mb-12">Stretching Simulator v2.0</p>
          
          <div className="space-y-6">
            <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm">
              <span className="block text-[10px] uppercase font-black tracking-widest opacity-20 mb-2">KPI: Total Length</span>
              <span className="text-5xl font-serif italic font-black">{(length * 0.1).toFixed(1)}m</span>
            </div>

            {/* Growth Chart */}
            <div className="p-6 bg-white border border-black/5 rounded-2xl shadow-sm h-48">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] uppercase font-black tracking-widest opacity-20">Growth Velocity</span>
                <TrendingUp size={12} className="opacity-20" />
              </div>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={growthData}>
                  <Line type="monotone" dataKey="length" stroke="#0a0a0a" strokeWidth={3} dot={false} />
                  <YAxis hide domain={['dataMin', 'dataMax']} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-4">
              <span className="block text-[10px] uppercase font-black tracking-widest opacity-20">Global Leaderboard</span>
              {leaderboard.map((entry, i) => (
                <div key={i} className="flex justify-between items-center text-xs font-bold">
                  <span className="opacity-40">{i + 1}. {entry.name}</span>
                  <span>{entry.length.toFixed(1)}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="hidden lg:block">
          <div className="flex items-center gap-4 opacity-20 hover:opacity-100 transition-opacity cursor-help">
            <Target size={16} />
            <span className="text-[10px] uppercase font-black tracking-widest">Follow the laser</span>
          </div>
        </div>
      </div>

      {/* Main Stage */}
      <div className="flex-1 relative flex items-center justify-center p-4 lg:p-12">
        <div className="absolute top-12 right-12 hidden lg:block">
          <p className="vertical-text">Infinite Feline Expansion // 2026</p>
        </div>

        <div className="w-full max-w-[800px] aspect-square relative">
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            onMouseMove={handleMouseMove}
            onTouchMove={handleMouseMove}
            className="w-full h-full bg-white shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-2xl cursor-none"
          />

          <AnimatePresence>
            {(gameState === 'menu' || gameState === 'gameover') && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-xl rounded-2xl z-20 p-12 text-center"
              >
                {gameState === 'gameover' && (
                  <div className="mb-8">
                    <Trophy className="mx-auto mb-4 text-[#FF6321]" size={48} />
                    <h2 className="text-4xl font-serif italic font-black">Expansion Terminated.</h2>
                    <p className="text-sm font-bold uppercase tracking-widest opacity-40">Final Length: {(length * 0.1).toFixed(1)}m</p>
                  </div>
                )}
                
                <h2 className="text-4xl font-serif italic font-black mb-4">
                  {gameState === 'menu' ? "The cat is too short." : "Try again?"}
                </h2>
                <p className="text-sm font-medium opacity-40 mb-12 max-w-xs">
                  Guide the laser. Collect the tuna. Do not leave the designated expansion zone.
                </p>
                
                <button
                  onClick={initGame}
                  className="group flex items-center gap-4 px-12 py-6 bg-black text-white rounded-full font-black text-xs uppercase tracking-[0.4em] hover:scale-105 active:scale-95 transition-all"
                >
                  <MousePointer2 size={16} />
                  {gameState === 'menu' ? "Initiate" : "Re-Initiate"}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Right Rail: Controls */}
      <div className="w-full lg:w-24 border-t lg:border-t-0 lg:border-l border-black/10 p-8 flex flex-row lg:flex-col items-center justify-center gap-12 z-10 bg-[#f5f5f4]">
        <button onClick={() => window.location.reload()} className="opacity-20 hover:opacity-100 transition-opacity">
          <RotateCcw size={24} />
        </button>
        <button className="opacity-20 hover:opacity-100 transition-opacity">
          <Maximize2 size={24} />
        </button>
      </div>
    </div>
  );

  function RotateCcw({ size }: { size: number }) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </svg>
    );
  }
}
