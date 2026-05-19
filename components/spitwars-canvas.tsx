'use client';

/**
 * SpitWarsCanvas — the full game canvas component.
 * Handles rendering, physics tick loop, and user input.
 * Extracted directly from the minified bundle, adapted to TypeScript + React.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SpitWarsEngine } from '@/lib/spitwars-engine';
import { SpitWarsHUD } from './spitwars-hud';
import PauseOverlay from './games/PauseOverlay';
import { TEAMS, WEAPONS } from '@/lib/spitwars-data';
import type { GameMode, AiPersonality, Weapon } from '@/lib/spitwars-data';
import type { GameState } from '@/lib/spitwars-engine';

// ─── Viewport state ──────────────────────────────────────────────────────────

interface ViewportState {
  x: number;
  targetX: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartVP: number;
  noSnap: boolean;
  snapTimer: ReturnType<typeof setTimeout> | null;
  holdAtImpact: boolean;
  impactX: number;
}

// ─── Aim state ────────────────────────────────────────────────────────────────

interface AimState {
  power: number;        // 0–100
  powerDir: number;     // oscillation direction
  angle: number;        // -45 to 85
  angleDir: number;
  targetX: number;      // for airstrike
  targetDir: number;
  targetSpeed: number;
  targetLastChanged: number;
}

// ─── Canvas sizes ─────────────────────────────────────────────────────────────

interface CanvasSize {
  CW: number; // canvas width (viewport)
  CH: number; // canvas height
  WW: number; // world width = 2×CW
}

// ─── Llama SVG component ─────────────────────────────────────────────────────

function LlamaSvg({ flip, color, delay }: { flip?: boolean; color: string; delay: number }) {
  return (
    <svg
      viewBox="0 0 100 80"
      className="w-20 h-16"
      style={{ transform: flip ? 'scaleX(-1)' : 'none' }}
    >
      <ellipse cx="50" cy="55" rx="22" ry="18" fill={color} />
      <rect x="32" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="42" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="54" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="64" y="62" width="5" height="16" rx="2" fill={color} opacity="0.8" />
      <rect x="60" y="25" width="10" height="35" rx="4" fill={color} />
      <ellipse cx="68" cy="20" rx="12" ry="10" fill={color} />
      <ellipse cx="60" cy="10" rx="3" ry="6" fill={color} />
      <ellipse cx="76" cy="10" rx="3" ry="6" fill={color} />
      <circle cx="72" cy="18" r="2" fill="#1a1a2e" />
      <ellipse cx="78" cy="22" rx="5" ry="4" fill={color} opacity="0.7" />
      <g className="animate-pulse" style={{ animationDelay: `${delay}ms` }}>
        <circle cx="88" cy="20" r="2.5" fill="#60a5fa" opacity="0.9" />
        <circle cx="94" cy="18" r="2" fill="#60a5fa" opacity="0.7" />
        <circle cx="98" cy="22" r="1.5" fill="#60a5fa" opacity="0.5" />
      </g>
    </svg>
  );
}

// ─── Menu screen ──────────────────────────────────────────────────────────────

function MenuScreen({ onStart }: { onStart: (mode: GameMode, ai: AiPersonality) => void }) {
  const [mode, setMode] = useState<GameMode>('passplay');
  const [ai, setAi] = useState<AiPersonality>('karen');

  return (
    <div className="min-h-screen bg-[#060614] flex flex-col items-center justify-center font-mono text-white p-4 overflow-hidden">
      <div className="flex items-center justify-center gap-2 mb-2">
        <LlamaSvg color="#f59e0b" delay={0} />
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold tracking-widest bg-gradient-to-r from-orange-500 via-yellow-400 to-cyan-500 bg-clip-text text-transparent">
            SPITWARS
          </div>
          <div className="text-[10px] text-gray-600 tracking-widest mt-1">SPIT HAPPENS.</div>
          <div className="text-[8px] text-cyan-600 tracking-wider mt-0.5 border border-cyan-800 rounded px-1.5 py-0.5">
            EARLY ALPHA
          </div>
        </div>
        <LlamaSvg color="#06b6d4" flip delay={200} />
      </div>

      <div className="bg-white/[.03] border border-[#1e3a2f] rounded-xl p-4 w-full max-w-xs flex flex-col gap-3">
        <div className="text-[9px] text-gray-500 tracking-widest">GAME MODE</div>
        <div className="flex gap-2">
          {([['passplay', 'PASS & PLAY'], ['ai', 'VS AI']] as const).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="flex-1 py-2.5 rounded-lg font-bold text-sm transition-all"
              style={{
                border: `1px solid ${mode === m ? '#f97316' : '#374151'}`,
                background: mode === m ? 'rgba(249,115,22,.15)' : 'transparent',
                color: mode === m ? '#f97316' : '#6b7280',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === 'ai' && (
          <div>
            <div className="text-[9px] text-gray-500 tracking-widest mb-2">AI PERSONALITY</div>
            <div className="flex gap-2">
              {([
                ['karen', 'KAREN', 'Methodical'],
                ['chad', 'CHAD', 'Chaotic'],
              ] as const).map(([p, name, desc]) => (
                <button
                  key={p}
                  onClick={() => setAi(p)}
                  className="flex-1 py-2 px-2 rounded-lg transition-all"
                  style={{
                    border: `1px solid ${ai === p ? '#06b6d4' : '#374151'}`,
                    background: ai === p ? 'rgba(6,182,212,.12)' : 'transparent',
                    color: ai === p ? '#06b6d4' : '#6b7280',
                  }}
                >
                  <div className="text-sm font-bold">{name}</div>
                  <div className="text-[9px] opacity-70">{desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => onStart(mode, ai)}
          className="w-full py-3 font-bold tracking-widest rounded-lg text-white mt-1"
          style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
        >
          START BATTLE
        </button>

        {/* Controls reference */}
        <div className="text-[9px] text-gray-500 leading-relaxed">
          <div className="bg-black/30 rounded-lg p-2.5">
            <div className="text-[8px] text-gray-400 mb-1.5 font-bold">CONTROLS:</div>
            <div className="flex flex-col gap-1 text-[8px]">
              {[
                ['MOVES', '5 per turn (walk, jump, jetpack, shield)', 'text-yellow-400'],
                ['JUMP', 'Leap in facing direction', 'text-green-400'],
                ['JET', 'Hold to fly (uses fuel)', 'text-[#fde047]'],
                ['SHIELD', 'Halves next hit (ends turn)', 'text-[#60a5fa]'],
                ['FIRE', 'Ends turn immediately', 'text-orange-400'],
              ].map(([key, val, cls]) => (
                <div key={key} className="flex gap-2">
                  <span className={`${cls} w-14`}>{key}</span>
                  <span>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center">
        <div className="text-[9px] text-gray-700">spitwars.com</div>
      </div>
    </div>
  );
}

// ─── Rendering helpers ────────────────────────────────────────────────────────

function lerp(terrain: number[], x: number, worldW: number): number {
  const pts = terrain.length;
  const t = (x / worldW) * (pts - 1);
  const i = Math.floor(t);
  const f = t - i;
  if (i < 0) return terrain[0];
  if (i >= pts - 1) return terrain[pts - 1];
  return terrain[i] * (1 - f) + terrain[i + 1] * f;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  CW: number,
  CH: number,
  WW: number,
  vpX: number,
  frame: number,
  state: GameState,
  aimAngle: number,
  aimDir: number,
  aimType: string,
  targetX: number | null,
  actionMode: string,
) {
  ctx.clearRect(0, 0, CW, CH);

  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, CH);
  sky.addColorStop(0, '#050510');
  sky.addColorStop(0.6, '#0d1b2a');
  sky.addColorStop(1, '#14293f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, CH);

  // Stars
  ctx.save();
  for (let i = 0; i < 120; i++) {
    ctx.globalAlpha = 0.3 + (i % 3) / 2 * 0.6;
    ctx.fillStyle = '#fff';
    ctx.fillRect(137.5 * i % CW, 89.3 * i % (0.65 * CH), i % 9 === 0 ? 2 : 1, i % 9 === 0 ? 2 : 1);
  }
  ctx.restore();

  // Moon
  ctx.fillStyle = 'rgba(255,252,210,.88)';
  ctx.beginPath();
  ctx.arc(CW - 36, 38, 22, 0, 2 * Math.PI);
  ctx.fill();
  ctx.fillStyle = '#0d1b2a';
  ctx.beginPath();
  ctx.arc(CW - 44, 34, 20, 0, 2 * Math.PI);
  ctx.fill();

  // Background mountains
  ctx.fillStyle = '#0b1520';
  for (let i = 0; i < 14; i++) {
    const mx = 120 * i + 80 - 0.28 * vpX;
    if (mx < -70 || mx > CW + 70) continue;
    const my = CH * (0.34 + 0.08 * Math.sin(1.7 * i));
    ctx.beginPath();
    ctx.moveTo(mx - 62, 0.78 * CH);
    ctx.lineTo(mx, my);
    ctx.lineTo(mx + 62, 0.78 * CH);
    ctx.fill();
  }

  // World translation
  ctx.save();
  ctx.translate(-vpX, 0);

  // Terrain fill
  const terrainGrad = ctx.createLinearGradient(0, 0.2 * CH, 0, CH);
  terrainGrad.addColorStop(0, '#4a7c59');
  terrainGrad.addColorStop(0.35, '#3d5a3e');
  terrainGrad.addColorStop(1, '#5c3d2e');
  ctx.fillStyle = terrainGrad;
  ctx.beginPath();
  ctx.moveTo(0, CH);
  for (let i = 0; i < state.terrain.length; i++) {
    ctx.lineTo((i / (state.terrain.length - 1)) * WW, state.terrain[i]);
  }
  ctx.lineTo(WW, CH);
  ctx.closePath();
  ctx.fill();

  // Terrain edge
  ctx.save();
  ctx.shadowColor = '#7ec98a';
  ctx.shadowBlur = 5;
  ctx.strokeStyle = '#6aab73';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < state.terrain.length; i++) {
    const x = (i / (state.terrain.length - 1)) * WW;
    i === 0 ? ctx.moveTo(x, state.terrain[i]) : ctx.lineTo(x, state.terrain[i]);
  }
  ctx.stroke();
  ctx.restore();

  // Particles
  state.particles.forEach((p) => {
    ctx.globalAlpha = p.life / p.maxLife;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.5, p.r * p.life / p.maxLife), 0, 2 * Math.PI);
    ctx.fill();
  });
  ctx.globalAlpha = 1;

  // Units
  state.units.forEach((unit) => {
    if (!unit.alive && unit.hp > 0) return;
    const team = TEAMS[unit.team];
    const isActive = unit.id === state.curId;

    // Jetpack flame
    if (unit.isJetpacking && unit.alive) {
      ctx.save();
      ctx.translate(unit.x - 8 * unit.facing, unit.y - 16);
      const flameH = 8 + 6 * Math.random();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.moveTo(-3, 0); ctx.lineTo(0, flameH); ctx.lineTo(3, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.moveTo(-2, 0); ctx.lineTo(0, 0.6 * flameH); ctx.lineTo(2, 0);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // Active glow
    if (isActive && state.phase === 'aiming') {
      ctx.save();
      ctx.shadowColor = team.color;
      ctx.shadowBlur = 16;
      ctx.fillStyle = team.color + '44';
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y - 16, 15, 20, 0, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }

    // Draw llama body
    drawLlama(ctx, unit.x, unit.y, unit.facing, team.color, isActive, frame, {
      walkPhase: unit.walkPhase,
      dead: !unit.alive,
    });

    // Shield bubble
    if (unit.hasShield && unit.alive) {
      const pulse = 2 + 2 * Math.sin(0.008 * frame);
      ctx.save();
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.3)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y - 16, 25 + pulse, 26 + pulse, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = '#60a5fa';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y - 16, 23 + pulse, 24 + pulse, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y - 16, 21 + pulse, 22 + pulse, 0, 0, 2 * Math.PI);
      ctx.stroke();
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + 0.002 * frame;
        ctx.fillStyle = '#93c5fd';
        ctx.beginPath();
        ctx.arc(unit.x + Math.cos(ang) * (24 + pulse), unit.y - 16 + Math.sin(ang) * (25 + pulse), 2.5, 0, 2 * Math.PI);
        ctx.fill();
      }
      ctx.restore();
    }

    // Name label
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'center';
    ctx.fillText(unit.name, unit.x, unit.y - 40);

    // HP bar
    if (unit.alive) {
      ctx.fillStyle = 'rgba(0,0,0,.55)';
      ctx.fillRect(unit.x - 14, unit.y - 50, 28, 5);
      ctx.fillStyle = unit.hp > 60 ? '#22c55e' : unit.hp > 30 ? '#eab308' : '#ef4444';
      ctx.fillRect(unit.x - 14, unit.y - 50, 28 * (unit.hp / 100), 5);
    }

    // Active turn ring
    if (isActive && state.phase === 'aiming') {
      ctx.save();
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.ellipse(unit.x, unit.y - 16, 19, 22, 0, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.restore();
    }
  });

  // Aim line (not for target or jetpack mode)
  if (state.phase === 'aiming' && actionMode === 'weapon' && aimType !== 'target') {
    const activeUnit = state.units.find((u) => u.id === state.curId && u.alive);
    if (activeUnit) {
      const team = TEAMS[activeUnit.team];
      const rad = (aimAngle * Math.PI) / 180;
      const tipX = activeUnit.x + 80 * Math.cos(rad) * aimDir;
      const tipY = activeUnit.y - 16 - 80 * Math.sin(rad);
      ctx.save();
      ctx.strokeStyle = team.color + '88';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(activeUnit.x, activeUnit.y - 16);
      ctx.lineTo(tipX, tipY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = team.color + 'cc';
      ctx.beginPath();
      ctx.arc(tipX, tipY, 5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.restore();
    }
  }

  // Jetpack fuel indicator
  if (state.phase === 'aiming' && actionMode === 'jetpack') {
    const unit = state.units.find((u) => u.id === state.curId && u.alive);
    if (unit) {
      ctx.fillStyle = 'rgba(0,0,0,.7)';
      ctx.beginPath();
      (ctx as CanvasRenderingContext2D & { roundRect: (x:number,y:number,w:number,h:number,r:number)=>void })
        .roundRect(unit.x - 20, unit.y - 60, 40, 8, 3);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.fillRect(unit.x - 18, unit.y - 58, 36 * (unit.jetpackFuel / 100), 4);
      ctx.font = '6px monospace';
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.fillText('FUEL', unit.x, unit.y - 64);
    }
  }

  // Airstrike target indicator
  if (state.phase === 'aiming' && actionMode === 'weapon' && aimType === 'target' && targetX !== null) {
    const tY = lerp(state.terrain, targetX, WW);
    ctx.save();
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(targetX, tY - 20, 18, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(targetX, tY - 20, 8, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(targetX - 25, tY - 20);
    ctx.lineTo(targetX + 25, tY - 20);
    ctx.moveTo(targetX, tY - 45);
    ctx.lineTo(targetX, tY + 5);
    ctx.stroke();
    ctx.strokeStyle = '#ef444488';
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(targetX, -10);
    ctx.lineTo(targetX, tY - 50);
    ctx.stroke();
    ctx.restore();
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ef4444';
    ctx.textAlign = 'center';
    ctx.fillText('DROP ZONE', targetX, tY + 18);
  }

  // Projectiles
  state.projs.forEach((proj) => {
    if (!proj.active) return;

    // Trail
    if (proj.trail && proj.trail.length > 1) {
      ctx.strokeStyle = 'rgba(255,140,0,.35)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      proj.trail.forEach((pt, i) => {
        i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      });
      ctx.stroke();
    }

    drawProjectile(ctx, proj, frame);
  });

  ctx.restore(); // end world translation

  // Wind indicator (fixed, HUD-style on canvas)
  const wIndW = 100;
  const wIndX = (CW - wIndW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,.7)';
  ctx.beginPath();
  (ctx as CanvasRenderingContext2D & { roundRect: (...a: number[]) => void }).roundRect(wIndX, 8, wIndW, 24, 6);
  ctx.fill();
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WIND', wIndX + 6, 20);
  const barX = wIndX + 36;
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(barX, 16, 40, 6);
  const windFrac = state.wind / 8;
  ctx.fillStyle = '#60a5fa';
  if (state.wind >= 0) ctx.fillRect(barX + 20, 16, 40 * windFrac / 2, 6);
  else ctx.fillRect(barX + 20 + 40 * windFrac / 2, 16, -(40 * windFrac) / 2, 6);
  ctx.fillStyle = '#475569';
  ctx.fillRect(barX + 20 - 0.5, 16, 1, 6);
  ctx.fillStyle = '#60a5fa';
  ctx.textAlign = 'right';
  ctx.fillText((state.wind >= 0 ? '>' : '<') + Math.abs(state.wind).toFixed(1), wIndX + wIndW - 5, 20);
  ctx.textBaseline = 'alphabetic';

  // Minimap (bottom strip)
  const mapY = CH - 12;
  ctx.fillStyle = 'rgba(0,0,0,.5)';
  ctx.fillRect(6, mapY, 80, 6);
  ctx.fillStyle = 'rgba(96,165,250,.25)';
  ctx.fillRect(6 + vpX / WW * 80, mapY, CW / WW * 80, 6);
  state.units.forEach((u) => {
    if (!u.alive) return;
    ctx.fillStyle = TEAMS[u.team].color;
    ctx.fillRect(6 + u.x / WW * 80 - 1, mapY, 2, 6);
  });
}

// ─── Draw individual projectile ───────────────────────────────────────────────

function drawProjectile(
  ctx: CanvasRenderingContext2D,
  proj: { x: number; y: number; vx: number; vy: number; weapon: Weapon; age: number; isSubCluster?: boolean },
  frame: number,
) {
  const { x, y, vx, vy, weapon } = proj;
  const angle = Math.atan2(vy, vx);

  ctx.save();
  ctx.translate(x, y);

  if (weapon.id === 'spit') {
    ctx.rotate(angle + Math.PI / 2);
    ctx.fillStyle = '#60a5fa';
    ctx.strokeStyle = '#1e40af';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.bezierCurveTo(-4, -5, -4.5, 2, 0, 6);
    ctx.bezierCurveTo(4.5, 2, 4, -5, 0, -6);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.6)';
    ctx.beginPath();
    ctx.ellipse(-1.4, -2, 1, 2, 0, 0, 2 * Math.PI);
    ctx.fill();
  } else if (weapon.id === 'mortar' || (weapon.id === 'cluster' && proj.isSubCluster)) {
    ctx.fillStyle = '#1f2937'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.beginPath(); ctx.arc(-2, -2.4, 2, 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = '#6b4e2a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, -6); ctx.quadraticCurveTo(-2, -10, -3, -12); ctx.stroke();
    const flick = 1.3 + 0.6 * Math.sin(0.35 * frame);
    ctx.fillStyle = '#fde047';
    ctx.beginPath(); ctx.arc(-3, -12, flick + 0.6, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = '#fb923c';
    ctx.beginPath(); ctx.arc(-3, -12, flick, 0, 2 * Math.PI); ctx.fill();
  } else if (weapon.id === 'cluster') {
    ctx.fillStyle = '#451a03'; ctx.strokeStyle = '#1c0a00'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, 7, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.02 * frame;
      ctx.fillStyle = '#f97316';
      ctx.beginPath(); ctx.arc(9 * Math.cos(a), 9 * Math.sin(a), 1.3, 0, 2 * Math.PI); ctx.fill();
    }
    ctx.fillStyle = '#fb923c'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, 2 * Math.PI); ctx.fill();
  } else if (weapon.id === 'missile') {
    ctx.rotate(angle);
    const exhaust = 3 * Math.random();
    ctx.fillStyle = '#fde047';
    ctx.beginPath(); ctx.moveTo(-8, -3); ctx.lineTo(-14 - exhaust, 0); ctx.lineTo(-8, 3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f97316';
    ctx.beginPath(); ctx.moveTo(-8, -2); ctx.lineTo(-12 - 0.7 * exhaust, 0); ctx.lineTo(-8, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(-8, -1); ctx.lineTo(-10, 0); ctx.lineTo(-8, 1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e5e7eb'; ctx.strokeStyle = '#374151'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(3, -3.2); ctx.lineTo(-8, -3.2); ctx.lineTo(-8, 3.2); ctx.lineTo(3, 3.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(3, -3.2); ctx.lineTo(3, 3.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bae6fd';
    ctx.beginPath(); ctx.arc(-2, 0, 1.5, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#6b7280';
    ctx.beginPath(); ctx.moveTo(-8, -3.2); ctx.lineTo(-11, -5.5); ctx.lineTo(-7, -3.2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-8, 3.2); ctx.lineTo(-11, 5.5); ctx.lineTo(-7, 3.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  } else if (weapon.id === 'airstrike') {
    ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#fef3c7'; ctx.strokeStyle = '#78350f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(3, -2.8); ctx.lineTo(-7, -2.8); ctx.lineTo(-7, 2.8); ctx.lineTo(3, 2.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ef4444';
    ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(3, -2.8); ctx.lineTo(3, 2.8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fde047';
    ctx.beginPath(); ctx.moveTo(-7, -1); ctx.lineTo(-11 - 2 * Math.random(), 0); ctx.lineTo(-7, 1); ctx.closePath(); ctx.fill();
  }

  ctx.restore();
}

// ─── Draw a llama character ───────────────────────────────────────────────────

function drawLlama(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  facing: number,
  color: string,
  isActive: boolean,
  frame: number,
  opts: { walkPhase?: number; dead?: boolean },
) {
  const { walkPhase = 0, dead = false } = opts;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing, 1);

  const bob = 0.5 * Math.sin(0.003 * frame);
  const nod = 4 * Math.sin(0.005 * frame) + (walkPhase !== 0 ? 3 * Math.sin(0.03 * frame) : 0);
  const sway = 0.4 * Math.sin(0.0025 * frame);
  const blink = frame % 3400 < 130 ? 0.15 : 1;

  const wool = '#ecdfc4';
  const leg = '#c9b896';
  const dark = '#2d1f12';

  if (dead) ctx.globalAlpha = 0.4;

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.ellipse(0, 1, 14, 3.2, 0, 0, 2 * Math.PI); ctx.fill();

  // Back legs
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.lineJoin = 'round';
  ctx.fillStyle = leg;
  const p = walkPhase;
  ctx.beginPath(); ctx.roundRect(-9 + 1.5 * p, -9 + 0.5 * Math.abs(p), 3.2, 9 - 0.8 * Math.abs(p), 1); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(4 - 1.5 * p, -9 + 0.5 * Math.abs(p), 3.2, 9 - 0.8 * Math.abs(p), 1); ctx.fill(); ctx.stroke();

  // Body
  ctx.fillStyle = wool;
  ctx.beginPath(); ctx.ellipse(-1, -14 + bob, 11, 7, -0.08, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  ctx.save(); ctx.fillStyle = leg; ctx.globalAlpha = dead ? 0.15 : 0.35;
  ctx.beginPath(); ctx.ellipse(-2, -11 + bob, 9, 3, -0.08, 0, 2 * Math.PI); ctx.fill(); ctx.restore();

  // Ear flap
  ctx.save(); ctx.translate(-11, -17 + bob); ctx.rotate((nod + 8) * Math.PI / 180);
  ctx.fillStyle = leg;
  ctx.beginPath(); ctx.ellipse(-2.2, 1, 3, 1.6, 0.3, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#a08a6a';
  ctx.beginPath(); ctx.arc(-4.5, 1.5, 1.6, 0, 2 * Math.PI); ctx.fill();
  ctx.restore();

  // Front legs
  ctx.fillStyle = wool; const fp = -p;
  ctx.beginPath(); ctx.roundRect(-6 + 1.5 * fp, -9 + 0.5 * Math.abs(fp), 3.2, 9 - 0.8 * Math.abs(fp), 1); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.roundRect(6 - 1.5 * fp, -9 + 0.5 * Math.abs(fp), 3.2, 9 - 0.8 * Math.abs(fp), 1); ctx.fill(); ctx.stroke();

  // Neck
  ctx.fillStyle = '#a08a6a';
  ctx.beginPath(); ctx.ellipse(4, -22 + bob, 3.2, 2.2, 0.3, 0, 2 * Math.PI); ctx.fill();

  // Head
  ctx.fillStyle = wool;
  ctx.beginPath(); ctx.moveTo(6, -17 + bob);
  ctx.bezierCurveTo(10, -22, 12, -26 + sway, 12, -28 + sway);
  ctx.lineTo(15, -28 + sway);
  ctx.bezierCurveTo(14, -24, 11, -20, 9, -15);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  const hy = -30 + sway;
  ctx.beginPath(); ctx.ellipse(14, hy, 5.5, 4, 0.15, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.ellipse(18, hy + 1.3, 3.1, 2.3, 0.4, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();

  // Ears
  ctx.fillStyle = leg;
  ctx.beginPath(); ctx.moveTo(11, hy - 3); ctx.lineTo(9.4, hy - 7); ctx.lineTo(12.6, hy - 3.2); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(15.2, hy - 3); ctx.lineTo(16.8, hy - 7); ctx.lineTo(17.2, hy - 3); ctx.closePath(); ctx.fill(); ctx.stroke();

  ctx.fillStyle = '#d3a78c';
  ctx.beginPath(); ctx.moveTo(11, hy - 3.4); ctx.lineTo(10.6, hy - 5.6); ctx.lineTo(11.9, hy - 3.6); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#a08a6a';
  ctx.beginPath(); ctx.ellipse(14, hy - 4.2, 2.2, 1.4, 0.1, 0, 2 * Math.PI); ctx.fill();

  // Eye
  if (dead) {
    ctx.strokeStyle = '#1a1a1a'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(14.3, hy - 0.8); ctx.lineTo(15.7, hy + 0.8);
    ctx.moveTo(15.7, hy - 0.8); ctx.lineTo(14.3, hy + 0.8); ctx.stroke();
  } else {
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath(); ctx.ellipse(15, hy, 0.95, 1.35 * blink, 0, 0, 2 * Math.PI); ctx.fill();
    if (blink > 0.5) {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(15.2, hy - 0.4, 0.35, 0, 2 * Math.PI); ctx.fill();
    }
  }

  // Nostril + mouth
  ctx.fillStyle = '#4a3520';
  ctx.beginPath(); ctx.arc(19.2, hy + 1.5, 0.5, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = '#4a3520'; ctx.lineWidth = 0.9;
  ctx.beginPath(); ctx.moveTo(18.3, hy + 2.5); ctx.lineTo(19.8, hy + 2.7); ctx.stroke();

  // Spit barrel (gun) — only shown when alive and active
  if (!dead) {
    ctx.fillStyle = color; ctx.strokeStyle = dark; ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(8, -20 + bob);
    ctx.lineTo(13.5, -22 + sway);
    ctx.lineTo(13.5, -19 + sway);
    ctx.lineTo(10, -17 + bob);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }

  ctx.restore();
}

// ─── Main game component ─────────────────────────────────────────────────────

interface GameCanvasProps {
  mode: GameMode;
  aiPersonality: AiPersonality;
  onQuit: () => void;
  onGameEnd?: (winnerTeam: number) => void;
}

export function SpitWarsGameCanvas({ mode, aiPersonality, onQuit, onGameEnd }: GameCanvasProps) {
  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ CW: 390, CH: 480, WW: 780 });
  const [uiState, setUiState] = useState<GameState | null>(null);
  const [movesLeft, setMovesLeft] = useState(5);
  const [selectedWeapon, setSelectedWeapon] = useState(0);
  const [passPlay, setPassPlay] = useState(false);
  const [passTeam, setPassTeam] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SpitWarsEngine | null>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const pausedRef = useRef(false);
  const vpRef = useRef<ViewportState>({
    x: 0, targetX: 0, isDragging: false, dragStartX: 0, dragStartVP: 0,
    noSnap: false, snapTimer: null, holdAtImpact: false, impactX: 0,
  });
  const aimRef = useRef<AimState>({
    power: 50, powerDir: 1,
    angle: 45, angleDir: 0.5,
    targetX: 400, targetDir: 3, targetSpeed: 1, targetLastChanged: 0,
  });
  const aimDirFacingRef = useRef<{ angle: number; dir: number }>({ angle: 45, dir: 1 });

  // HUD DOM refs (for non-React performance-critical updates)
  const angleRef = useRef<HTMLDivElement>(null);
  const angleTextRef = useRef<HTMLSpanElement>(null);
  const powerRef = useRef<HTMLDivElement>(null);
  const powerTextRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const targetTextRef = useRef<HTMLSpanElement>(null);

  // ─── Resize ────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const CW = Math.min(w - 16, 420);
      const CH = Math.min(h - 260, 520);
      setCanvasSize({ CW, CH, WW: 2 * CW });
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Init engine ───────────────────────────────────────────────────────────

  useEffect(() => {
    const { CW, CH, WW } = canvasSize;
    const engine = new SpitWarsEngine(WW, CH, mode);

    engine.onStateChange = () => {
      setUiState({ ...engine.state, units: engine.state.units.map((u) => ({ ...u })) });
      setMovesLeft(engine.state.movesLeft);
    };

    engine.onImpact = (x, y, weapon, team, isCluster) => {
      engine.applyImpact(x, y, weapon, team, isCluster);
      vpRef.current.holdAtImpact = true;
      vpRef.current.impactX = x;
    };

    engineRef.current = engine;

    // Initial state
    setUiState({ ...engine.state, units: engine.state.units.map((u) => ({ ...u })) });
    setMovesLeft(engine.state.movesLeft);

    // Reset aim
    const resetAim = () => {
      aimRef.current = {
        power: 50, powerDir: 1,
        angle: 45, angleDir: 0.5,
        targetX: WW / 2, targetDir: 3, targetSpeed: 1, targetLastChanged: Date.now(),
      };
    };
    resetAim();
    engine.onStateChange = () => {
      setUiState({ ...engine.state, units: engine.state.units.map((u) => ({ ...u })) });
      setMovesLeft(engine.state.movesLeft);
      // When turn transitions, reset aim
      if (engine.state.phase === 'aiming') {
        resetAim();
      }
    };

    // Center viewport on first unit
    const firstUnit = engine.state.units[0];
    vpRef.current.x = Math.max(0, firstUnit.x - CW / 2);
    vpRef.current.targetX = vpRef.current.x;

    return () => {
      cancelAnimationFrame(rafRef.current);
      engineRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.WW, canvasSize.CH]);

  // ─── Animation loop ────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { CW, CH, WW } = canvasSize;

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      if (pausedRef.current) return;
      frameRef.current++;
      const frame = frameRef.current;
      const engine = engineRef.current;
      if (!engine) return;

      const vp = vpRef.current;
      const aim = aimRef.current;
      const s = engine.state;

      engine.tick(frame);

      const weapon = WEAPONS[selectedWeapon];
      const curUnit = s.units.find((u) => u.id === s.curId && u.alive);

      // Oscillate power
      if (s.phase === 'aiming') {
        aim.power += 1.2 * aim.powerDir;
        if (aim.power >= 100) { aim.power = 100; aim.powerDir = -1; }
        if (aim.power <= 0) { aim.power = 0; aim.powerDir = 1; }
        if (powerRef.current) powerRef.current.style.width = `${aim.power}%`;
        if (powerTextRef.current) powerTextRef.current.textContent = `${Math.round(aim.power)}%`;

        if (weapon.aimType === 'target') {
          const now = Date.now();
          if (now - aim.targetLastChanged > 150 + 150 * Math.random()) {
            aim.targetSpeed = 0.3 + 2.7 * Math.random();
            aim.targetLastChanged = now;
          }
          aim.targetX += 5 * aim.targetDir * aim.targetSpeed;
          if (aim.targetX >= WW - 50) { aim.targetX = WW - 50; aim.targetDir = -1; }
          if (aim.targetX <= 50) { aim.targetX = 50; aim.targetDir = 1; }
          if (targetRef.current) targetRef.current.style.width = `${(aim.targetX / WW) * 100}%`;
          if (targetTextRef.current) targetTextRef.current.textContent = `${Math.round(aim.targetX)}`;
        } else if (weapon.aimType === 'power-only') {
          if (angleRef.current) angleRef.current.style.width = `${((weapon.fixedAngle ?? 72) - 5) / 80 * 100}%`;
          if (angleTextRef.current) angleTextRef.current.textContent = `${weapon.fixedAngle ?? 72}deg FIXED`;
          aimDirFacingRef.current.angle = weapon.fixedAngle ?? 72;
        } else {
          aim.angle += 0.7 * aim.angleDir;
          if (aim.angle >= 85) { aim.angle = 85; aim.angleDir = -1; }
          if (aim.angle <= -45) { aim.angle = -45; aim.angleDir = 1; }
          const pct = (aim.angle + 45) / 130 * 100;
          if (angleRef.current) angleRef.current.style.width = `${pct}%`;
          if (angleTextRef.current) angleTextRef.current.textContent = `${Math.round(aim.angle)}deg`;
          aimDirFacingRef.current.angle = aim.angle;
        }
      }

      // Determine aim direction (towards enemies)
      if (curUnit) {
        const enemies = s.units.filter((u) => u.team !== s.currentTeam && u.alive);
        const avgEnemyX = enemies.length ? enemies.reduce((a, u) => a + u.x, 0) / enemies.length : WW / 2;
        aimDirFacingRef.current.dir = avgEnemyX > curUnit.x ? 1 : -1;
      }

      // Viewport tracking
      const activeProj = s.phase === 'firing' ? s.projs.find((p) => p.active) : null;
      if (activeProj) {
        vp.targetX = Math.max(0, Math.min(WW - CW, activeProj.x - CW / 2));
        vp.impactX = activeProj.x;
      } else if (vp.holdAtImpact) {
        vp.targetX = Math.max(0, Math.min(WW - CW, vp.impactX - CW / 2));
      } else if (s.phase === 'aiming' && weapon.aimType === 'target') {
        vp.targetX = Math.max(0, Math.min(WW - CW, aim.targetX - CW / 2));
      } else if (curUnit) {
        vp.targetX = Math.max(0, Math.min(WW - CW, curUnit.x - CW / 2));
      }

      if (!vp.isDragging && (s.phase === 'firing' || s.phase === 'transitioning' || !vp.noSnap)) {
        vp.x += (vp.targetX - vp.x) * 0.07;
      }

      // Render
      drawScene(ctx, CW, CH, WW, vp.x, frame, s,
        aimDirFacingRef.current.angle, aimDirFacingRef.current.dir,
        weapon.aimType, weapon.aimType === 'target' ? aim.targetX : null,
        'weapon',
      );
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasSize, selectedWeapon]);

  // ─── AI turn ───────────────────────────────────────────────────────────────

  useEffect(() => {
    const s = uiState;
    if (!s) return;
    if (mode !== 'ai' || s.phase !== 'aiming' || s.currentTeam !== 1 || s.winner !== null) return;

    const engine = engineRef.current;
    if (!engine) return;

    const timer = setTimeout(() => {
      const unit = engine.state.units.find((u) => u.id === engine.state.curId);
      if (!unit) return;

      const enemies = engine.state.units.filter((u) => u.team === 0 && u.alive);
      if (!enemies.length) return;
      const target = enemies[Math.floor(Math.random() * enemies.length)];
      const dx = target.x - unit.x;
      const dist = Math.abs(dx);

      let angle = Math.max(15, Math.min(75, 30 + 0.023 * dist));
      let power = Math.min(90, 20 + 0.075 * dist);
      let weaponIdx = 0;
      const dir = dx > 0 ? 1 : -1;
      const aiTargetX = target.x + (Math.random() - 0.5) * 40;

      if (aiPersonality === 'karen') {
        angle += (Math.random() - 0.5) * 14;
        power += (Math.random() - 0.5) * 12;
        weaponIdx = dist > 600 ? 3 : Math.floor(3 * Math.random());
      } else {
        // Chad — chaotic
        angle += (Math.random() - 0.5) * 35;
        power = Math.min(100, power + 38 * Math.random());
        weaponIdx = Math.floor(Math.random() * WEAPONS.length);
      }

      setSelectedWeapon(weaponIdx);

      const fireTimer = setTimeout(() => {
        engineRef.current?.fire(angle, power, weaponIdx, dir, aiTargetX);
      }, 600);

      return () => clearTimeout(fireTimer);
    }, 1500);

    return () => clearTimeout(timer);
  }, [uiState?.phase, uiState?.currentTeam, uiState?.turnKey, mode, aiPersonality]);

  // ─── Pass-and-play transition check ───────────────────────────────────────

  useEffect(() => {
    if (!uiState) return;
    if (mode !== 'passplay') return;
    // Show pass screen when team changes mid-game
    // (handled by engine — but we watch for phase === 'transitioning')
    // We set passPlay state based on uiState transitions
  }, [uiState?.currentTeam, uiState?.turnKey, mode]);

  // ─── Viewport drag handlers ────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const vp = vpRef.current;
    if (vp.snapTimer) clearTimeout(vp.snapTimer);
    vp.isDragging = true;
    vp.noSnap = true;
    vp.dragStartX = e.clientX;
    vp.dragStartVP = vp.x;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const vp = vpRef.current;
    if (!vp.isDragging) return;
    const { WW, CW } = canvasSize;
    vp.x = Math.max(0, Math.min(WW - CW, vp.dragStartVP - (e.clientX - vp.dragStartX)));
  }, [canvasSize]);

  const handlePointerUp = useCallback(() => {
    const vp = vpRef.current;
    vp.isDragging = false;
    vp.snapTimer = setTimeout(() => { vp.noSnap = false; }, 3000);
  }, []);

  // ─── Controls ─────────────────────────────────────────────────────────────

  const engine = engineRef.current;
  const currentState = uiState;
  const isAiTurn = mode === 'ai' && (currentState?.currentTeam ?? 0) === 1;
  const canControl = !isAiTurn && currentState?.phase === 'aiming' && currentState.winner === null && !passPlay;

  const handleFire = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || !canControl) return;
    const s = eng.state;
    const curUnit = s.units.find((u) => u.id === s.curId);
    if (!curUnit) return;

    const enemies = s.units.filter((u) => u.team !== s.currentTeam && u.alive);
    const avgEnemyX = enemies.length ? enemies.reduce((a, u) => a + u.x, 0) / enemies.length : canvasSize.WW / 2;
    const dir = avgEnemyX > curUnit.x ? 1 : -1;

    eng.fire(
      aimRef.current.angle,
      aimRef.current.power,
      selectedWeapon,
      dir,
      aimRef.current.targetX,
    );
  }, [canControl, selectedWeapon, canvasSize.WW]);

  // ─── Game over / pass play overlay ─────────────────────────────────────────

  const handleGameEnd = useCallback((winnerTeam: number) => {
    onGameEnd?.(winnerTeam);
  }, [onGameEnd]);

  if (!currentState) return null;

  const { CW, CH } = canvasSize;
  const winner = currentState.winner;
  const winTeam = winner !== null ? TEAMS[winner] : null;

  return (
    <div className="min-h-screen bg-[#060614] text-white font-mono select-none flex flex-col">
      {/* Canvas area */}
      <div className="flex items-start justify-center pt-2 pb-0 px-2">
        <div
          className="relative touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          style={{ cursor: 'grab' }}
        >
          <canvas
            ref={canvasRef}
            width={CW}
            height={CH}
            className="block rounded-lg"
            style={{ pointerEvents: 'none', border: '1px solid #1e3a2f' }}
          />

          {/* Pass-and-play overlay */}
          {passPlay && (
            <div className="absolute inset-0 bg-[#050510]/95 flex flex-col items-center justify-center gap-3 rounded-lg">
              <div className="text-4xl">PASS THE PHONE</div>
              <div className="text-xl font-bold tracking-widest" style={{ color: TEAMS[passTeam].color }}>
                {TEAMS[passTeam].name}
              </div>
              <div className="text-sm text-gray-400">Get ready!</div>
              <div className="w-32 h-1.5 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-full rounded"
                  style={{
                    background: TEAMS[passTeam].color,
                    animation: 'fillBar 2s linear forwards',
                  }}
                />
              </div>
              <style>{`@keyframes fillBar{from{width:0}to{width:100%}}`}</style>
            </div>
          )}

          {/* Game over overlay */}
          {winner !== null && winTeam && (
            <div className="absolute inset-0 bg-[#050510]/95 flex flex-col items-center justify-center gap-3 rounded-lg">
              <div className="text-3xl font-bold tracking-widest" style={{ color: winTeam.color }}>
                {winTeam.name} WIN!
              </div>
              <div className="text-sm text-gray-500">Spit happens.</div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    handleGameEnd(winner);
                    // Re-init
                    const { WW: ww, CH: ch } = canvasSize;
                    const eng = new SpitWarsEngine(ww, ch, mode);
                    eng.onStateChange = () => {
                      setUiState({ ...eng.state, units: eng.state.units.map((u) => ({ ...u })) });
                      setMovesLeft(eng.state.movesLeft);
                    };
                    eng.onImpact = (x, y, weapon, team, isCluster) => {
                      eng.applyImpact(x, y, weapon, team, isCluster);
                      vpRef.current.holdAtImpact = true;
                      vpRef.current.impactX = x;
                    };
                    engineRef.current = eng;
                    setUiState({ ...eng.state, units: eng.state.units.map((u) => ({ ...u })) });
                    setMovesLeft(eng.state.movesLeft);
                    setSelectedWeapon(0);
                    vpRef.current.x = Math.max(0, eng.state.units[0].x - CW / 2);
                    vpRef.current.targetX = vpRef.current.x;
                    vpRef.current.holdAtImpact = false;
                  }}
                  className="px-6 py-2.5 font-bold rounded-lg text-white"
                  style={{ background: `linear-gradient(135deg,${winTeam.color},#dc2626)` }}
                >
                  REMATCH
                </button>
                <button
                  onClick={onQuit}
                  className="px-6 py-2.5 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-800 transition"
                >
                  MENU
                </button>
              </div>
            </div>
          )}

          {/* AI thinking indicator */}
          {isAiTurn && currentState.phase === 'aiming' && !passPlay && winner === null && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-cyan-500/10 border border-cyan-500 px-4 py-1.5 rounded-full text-sm text-cyan-400">
              {aiPersonality === 'karen' ? 'Karen calculating...' : 'Chad going YOLO...'}
            </div>
          )}

          {/* Transitioning */}
          {currentState.phase === 'transitioning' && !passPlay && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-yellow-500/10 border border-yellow-500 px-4 py-1.5 rounded-full text-sm text-yellow-400">
              Assessing damage...
            </div>
          )}
        </div>
      </div>

      {/* HUD */}
      {!passPlay && winner === null && (
        <SpitWarsHUD
          state={currentState}
          movesLeft={movesLeft}
          selectedWeapon={selectedWeapon}
          canControl={canControl}
          isAiTurn={isAiTurn}
          angleRef={angleRef}
          angleTextRef={angleTextRef}
          powerRef={powerRef}
          powerTextRef={powerTextRef}
          targetRef={targetRef}
          targetTextRef={targetTextRef}
          onWeaponSelect={setSelectedWeapon}
          onLeft={() => engineRef.current?.walk(-1)}
          onRight={() => engineRef.current?.walk(1)}
          onJump={() => engineRef.current?.jump()}
          onJetpackStart={() => engineRef.current?.jetpackStart()}
          onJetpackStop={() => engineRef.current?.jetpackStop()}
          onShield={() => engineRef.current?.shield()}
          onFire={handleFire}
          onQuit={() => { pausedRef.current = true; setMenuOpen(true) }}
        />
      )}
      {menuOpen && (
        <PauseOverlay
          open={menuOpen}
          title="PAUSED"
          onResume={() => { pausedRef.current = false; setMenuOpen(false) }}
          onQuit={() => { pausedRef.current = false; setMenuOpen(false); onQuit() }}
        />
      )}

      {/* Footer */}
      <div className="flex-1 flex items-end justify-center pb-4">
        <div className="text-center">
          <div className="text-xs font-bold tracking-widest text-gray-700">SPITWARS</div>
          <div className="text-[8px] text-gray-800">spitwars.com</div>
        </div>
      </div>
    </div>
  );
}

// ─── Exported wrapper with menu ───────────────────────────────────────────────

export default function SpitWarsLocal() {
  const [screen, setScreen] = useState<'menu' | 'game'>('menu');
  const [gameMode, setGameMode] = useState<GameMode>('passplay');
  const [aiPersonality, setAiPersonality] = useState<AiPersonality>('karen');

  if (screen === 'menu') {
    return (
      <MenuScreen
        onStart={(m, ai) => {
          setGameMode(m);
          setAiPersonality(ai);
          setScreen('game');
        }}
      />
    );
  }

  return (
    <SpitWarsGameCanvas
      mode={gameMode}
      aiPersonality={aiPersonality}
      onQuit={() => setScreen('menu')}
      onGameEnd={(winnerTeam) => {
        // For VS AI mode, log the result (only if logged in — API silently 401s otherwise)
        if (gameMode === 'ai') {
          fetch('/api/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ mode: 'local', winner_team: winnerTeam }),
          }).catch(() => {
            // silent — guests get 401, that's fine
          });
        }
      }}
    />
  );
}
