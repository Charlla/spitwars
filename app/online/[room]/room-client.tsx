'use client';

/**
 * Online Room Client
 *
 * Flow:
 * 1. Host and guest see a waiting room until both are present
 * 2. Once both connected, game starts (host = LLAMAS team 0, guest = ALPACAS team 1)
 * 3. Each turn: active player submits action via PATCH /api/rooms/[code]
 * 4. Supabase Realtime broadcasts the change to both players
 *    (with a slow-poll fallback so a dropped websocket can't strand a player)
 * 5. Non-active player receives the snapshot and renders the updated state
 *
 * Online play is OTP-gated: identity always comes from the session cookie.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { SpitWarsEngine } from '@/lib/spitwars-engine';
import { SpitWarsHUD } from '@/components/spitwars-hud';
import { computeCanvasSize, RotateHint } from '@/components/spitwars-canvas';
import { TEAMS, WEAPONS } from '@/lib/spitwars-data';
import type { SessionPlayer } from '@/lib/auth';
import type { GameState } from '@/lib/spitwars-engine';

interface RoomData {
  id: string;
  code: string;
  host_id: string;
  host_name: string;
  guest_id: string | null;
  guest_name: string | null;
  status: 'waiting' | 'playing' | 'finished';
  game_state: Partial<GameState> | null;
  updated_at: string;
}

interface Props {
  room: RoomData;
  player: SessionPlayer | null;
}

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

interface AimState {
  power: number;
  powerDir: number;
  angle: number;
  angleDir: number;
  targetX: number;
  targetDir: number;
  targetSpeed: number;
  targetLastChanged: number;
}

function drawScene(
  ctx: CanvasRenderingContext2D,
  CW: number,
  CH: number,
  WW: number,
  vpX: number,
  state: GameState,
) {
  ctx.clearRect(0, 0, CW, CH);
  const sky = ctx.createLinearGradient(0, 0, 0, CH);
  sky.addColorStop(0, '#050510');
  sky.addColorStop(0.6, '#0d1b2a');
  sky.addColorStop(1, '#14293f');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, CW, CH);

  ctx.save();
  ctx.translate(-vpX, 0);

  // Terrain
  const tGrad = ctx.createLinearGradient(0, 0.2 * CH, 0, CH);
  tGrad.addColorStop(0, '#4a7c59');
  tGrad.addColorStop(0.35, '#3d5a3e');
  tGrad.addColorStop(1, '#5c3d2e');
  ctx.fillStyle = tGrad;
  ctx.beginPath();
  ctx.moveTo(0, CH);
  for (let i = 0; i < state.terrain.length; i++) {
    ctx.lineTo((i / (state.terrain.length - 1)) * WW, state.terrain[i]);
  }
  ctx.lineTo(WW, CH);
  ctx.closePath();
  ctx.fill();

  // Terrain edge
  ctx.strokeStyle = '#6aab73';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  for (let i = 0; i < state.terrain.length; i++) {
    const x = (i / (state.terrain.length - 1)) * WW;
    i === 0 ? ctx.moveTo(x, state.terrain[i]) : ctx.lineTo(x, state.terrain[i]);
  }
  ctx.stroke();

  // Units (simplified rendering for online view)
  state.units.forEach((unit) => {
    if (!unit.alive) return;
    const team = TEAMS[unit.team];
    const isActive = unit.id === state.curId;

    // Glow for active
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

    // Simple llama rectangle representation
    ctx.fillStyle = team.color;
    ctx.beginPath();
    ctx.ellipse(unit.x, unit.y - 8, 8, 6, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(unit.x + 6 * unit.facing, unit.y - 18, 5, 4, 0, 0, 2 * Math.PI);
    ctx.fill();
    // Ears
    ctx.fillRect(unit.x + 4 * unit.facing, unit.y - 25, 2, 5);
    ctx.fillRect(unit.x + 8 * unit.facing, unit.y - 25, 2, 5);
    // Eye
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(unit.x + 8 * unit.facing, unit.y - 17, 1.5, 0, 2 * Math.PI);
    ctx.fill();

    // HP bar
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    ctx.fillRect(unit.x - 14, unit.y - 32, 28, 5);
    ctx.fillStyle = unit.hp > 60 ? '#22c55e' : unit.hp > 30 ? '#eab308' : '#ef4444';
    ctx.fillRect(unit.x - 14, unit.y - 32, 28 * (unit.hp / 100), 5);

    // Name
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'center';
    ctx.fillText(unit.name, unit.x, unit.y - 35);
  });

  // Projectiles (simple dot)
  state.projs.forEach((proj) => {
    if (!proj.active) return;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 4, 0, 2 * Math.PI);
    ctx.fill();
  });

  ctx.restore();

  // Wind HUD
  const wW = 100;
  const wX = (CW - wW) / 2;
  ctx.fillStyle = 'rgba(0,0,0,.7)';
  ctx.fillRect(wX, 8, wW, 20);
  ctx.font = 'bold 9px monospace';
  ctx.fillStyle = '#64748b';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('WIND', wX + 6, 18);
  const windFrac = state.wind / 8;
  const barX2 = wX + 36;
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(barX2, 14, 40, 6);
  ctx.fillStyle = '#60a5fa';
  if (state.wind >= 0) ctx.fillRect(barX2 + 20, 14, 40 * windFrac / 2, 6);
  else ctx.fillRect(barX2 + 20 + 40 * windFrac / 2, 14, -(40 * windFrac) / 2, 6);
  ctx.fillStyle = '#60a5fa';
  ctx.textAlign = 'right';
  ctx.fillText((state.wind >= 0 ? '>' : '<') + Math.abs(state.wind).toFixed(1), wX + wW - 5, 18);
  ctx.textBaseline = 'alphabetic';
}

export function OnlineRoom({ room: initialRoom, player }: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<RoomData>(initialRoom);
  const [canvasSize, setCanvasSize] = useState(() => computeCanvasSize(390, 780, 1));
  const [uiState, setUiState] = useState<GameState | null>(null);
  const [movesLeft, setMovesLeft] = useState(5);
  const [selectedWeapon, setSelectedWeapon] = useState(0);
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(true);
  const [roomGone, setRoomGone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [rematching, setRematching] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<SpitWarsEngine | null>(null);
  const rafRef = useRef<number>(0);
  const frameRef = useRef<number>(0);
  const roomRef = useRef<RoomData>(initialRoom);
  const connectedRef = useRef(true);
  const sendChainRef = useRef<Promise<unknown>>(Promise.resolve());
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

  const angleRef = useRef<HTMLDivElement>(null);
  const angleTextRef = useRef<HTMLSpanElement>(null);
  const powerRef = useRef<HTMLDivElement>(null);
  const powerTextRef = useRef<HTMLSpanElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const targetTextRef = useRef<HTMLSpanElement>(null);

  // Host = team 0 (LLAMAS), guest = team 1 (ALPACAS). Session identity only.
  const isHost = !!player && room.host_id === player.id;
  const isGuestSlot = !!player && room.guest_id === player.id;
  const isParticipant = isHost || isGuestSlot;
  const myTeam = isHost ? 0 : 1;

  // ─── Room update reconciliation (realtime + poll share this path) ──────────

  const applyRoomUpdate = useCallback((updated: RoomData) => {
    roomRef.current = updated;
    setRoom(updated);
    // Apply game state snapshot to the engine — but never while it's our own
    // aiming turn (we are authoritative for our own moves; an echo of our last
    // submission would rewind local-only movement).
    const engine = engineRef.current;
    if (updated.game_state && engine) {
      const s = engine.state;
      const ourAimingTurn = s.winner === null && s.phase === 'aiming' && s.currentTeam === myTeam;
      if (!ourAimingTurn) engine.applySnapshot(updated.game_state);
    }
  }, [myTeam]);

  // ─── Resize ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => {
      setCanvasSize(computeCanvasSize(window.innerWidth, window.innerHeight, window.devicePixelRatio));
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ─── Supabase Realtime subscription ─────────────────────────────────────────

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`room:${room.code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'spitwars_rooms',
          filter: `code=eq.${room.code}`,
        },
        (payload) => {
          applyRoomUpdate(payload.new as RoomData);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'spitwars_rooms',
          filter: `code=eq.${room.code}`,
        },
        () => setRoomGone(true)
      )
      .subscribe((status) => {
        const ok = status === 'SUBSCRIBED';
        connectedRef.current = ok;
        setConnected(ok);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.code, applyRoomUpdate]);

  // ─── Poll fallback — covers dropped websockets / missed events ─────────────

  useEffect(() => {
    if (roomGone) return;
    const intervalMs = room.status === 'waiting' ? 4000 : 7000;
    const interval = setInterval(async () => {
      // While playing with a healthy realtime channel, skip the poll.
      if (room.status !== 'waiting' && connectedRef.current) return;
      try {
        const res = await fetch(`/api/rooms/${room.code}`);
        if (res.status === 404) {
          setRoomGone(true);
          return;
        }
        if (!res.ok) return;
        const data = await res.json();
        if (data.room && data.room.updated_at !== roomRef.current.updated_at) {
          applyRoomUpdate(data.room as RoomData);
        }
      } catch {
        // offline — banner already shows via realtime status
      }
    }, intervalMs);
    return () => clearInterval(interval);
  }, [room.status, room.code, roomGone, applyRoomUpdate]);

  // ─── Submit state to server (serialised — never drop a snapshot) ──────────

  const submitState = useCallback((snapshot: Partial<GameState>) => {
    const send = () =>
      fetch(`/api/rooms/${room.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'state', game_state: snapshot }),
      }).catch(() => null);
    sendChainRef.current = sendChainRef.current.then(send, send);
    return sendChainRef.current;
  }, [room.code]);

  // ─── Init engine when game starts ───────────────────────────────────────────

  useEffect(() => {
    if (room.status !== 'playing') return;
    const { WW, CH } = canvasSize;

    let engine: SpitWarsEngine;

    if (!engineRef.current) {
      // Fresh mount — new engine; restore the saved battle if one exists
      // (covers reloading mid-game).
      engine = new SpitWarsEngine(WW, CH, 'online');
      engineRef.current = engine;
      if (room.game_state) engine.applySnapshot(room.game_state);
    } else if (room.game_state) {
      // Re-sync from saved state — unless it's our own aiming turn (we are
      // authoritative for our local moves; see applyRoomUpdate).
      engine = engineRef.current;
      const s = engine.state;
      const ourAimingTurn = s.winner === null && s.phase === 'aiming' && s.currentTeam === myTeam;
      if (!ourAimingTurn) engine.applySnapshot(room.game_state);
    } else {
      // Rematch — state was reset, build a fresh battlefield.
      engine = new SpitWarsEngine(WW, CH, 'online');
      engineRef.current = engine;
    }

    engine.onStateChange = () => {
      setUiState({ ...engine.state, units: engine.state.units.map((u) => ({ ...u })) });
      setMovesLeft(engine.state.movesLeft);
    };

    engine.onImpact = (x, y, weapon, team, isCluster) => {
      engine.applyImpact(x, y, weapon, team, isCluster);
      vpRef.current.holdAtImpact = true;
      vpRef.current.impactX = x;
    };

    setUiState({ ...engine.state, units: engine.state.units.map((u) => ({ ...u })) });
    setMovesLeft(engine.state.movesLeft);

    if (!room.game_state) {
      // Host seeds initial state (first game and every rematch)
      if (isHost) {
        const snapshot = engine.snapshot();
        submitState(snapshot);
      }
    }

    vpRef.current.x = Math.max(0, engine.state.units[0].x - canvasSize.CW / 2);
    vpRef.current.targetX = vpRef.current.x;
    vpRef.current.holdAtImpact = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.status, room.game_state === null, canvasSize.WW, canvasSize.CH]);

  // ─── Animation loop ─────────────────────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { CW, CH, WW, dpr } = canvasSize;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // crisp rendering on retina

    const loop = () => {
      rafRef.current = requestAnimationFrame(loop);
      frameRef.current++;
      const engine = engineRef.current;
      if (!engine) return;

      const vp = vpRef.current;
      const aim = aimRef.current;
      const s = engine.state;

      engine.tick(frameRef.current);

      const weapon = WEAPONS[selectedWeapon];
      const curUnit = s.units.find((u) => u.id === s.curId && u.alive);

      // Oscillate aim if it's my turn
      if (s.phase === 'aiming' && s.currentTeam === myTeam) {
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

      // Aim direction
      if (curUnit) {
        const enemies = s.units.filter((u) => u.team !== s.currentTeam && u.alive);
        const avgEnemyX = enemies.length ? enemies.reduce((a, u) => a + u.x, 0) / enemies.length : WW / 2;
        aimDirFacingRef.current.dir = avgEnemyX > curUnit.x ? 1 : -1;
      }

      // Viewport
      const activeProj = s.phase === 'firing' ? s.projs.find((p) => p.active) : null;
      if (activeProj) {
        vp.targetX = Math.max(0, Math.min(WW - CW, activeProj.x - CW / 2));
      } else if (vp.holdAtImpact) {
        vp.targetX = Math.max(0, Math.min(WW - CW, vp.impactX - CW / 2));
      } else if (curUnit) {
        vp.targetX = Math.max(0, Math.min(WW - CW, curUnit.x - CW / 2));
      }
      if (!vp.isDragging) vp.x += (vp.targetX - vp.x) * 0.07;

      drawScene(ctx, CW, CH, WW, vp.x, s);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [canvasSize, selectedWeapon, myTeam]);

  // ─── After each engine state change on my turn, push to server ────────────

  useEffect(() => {
    if (!uiState || !engineRef.current || !isParticipant) return;
    if (uiState.currentTeam !== myTeam) return; // only push my own moves
    if (uiState.phase === 'firing' || uiState.phase === 'transitioning') {
      // Push snapshot after firing
      const snapshot = engineRef.current.snapshot();
      submitState(snapshot);
    }
    if (uiState.winner !== null) {
      const snapshot = engineRef.current.snapshot();
      // Record stats only after the final state has landed (the server derives
      // the winner from the room's own finished game_state).
      submitState(snapshot).then(() => {
        fetch('/api/games', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_code: room.code, winner_team: uiState.winner, mode: 'online' }),
        }).catch(() => null);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uiState?.phase, uiState?.turnKey, uiState?.winner]);

  // ─── Drag handlers ───────────────────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const vp = vpRef.current;
    if (vp.snapTimer) clearTimeout(vp.snapTimer);
    vp.isDragging = true;
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

  // ─── Controls ────────────────────────────────────────────────────────────

  const canControl = isParticipant &&
    uiState?.currentTeam === myTeam &&
    uiState?.phase === 'aiming' &&
    uiState?.winner === null &&
    room.status === 'playing';

  const handleFire = useCallback(() => {
    const eng = engineRef.current;
    if (!eng || !canControl) return;
    const s = eng.state;
    const curUnit = s.units.find((u) => u.id === s.curId);
    if (!curUnit) return;
    const enemies = s.units.filter((u) => u.team !== s.currentTeam && u.alive);
    const avgEnemyX = enemies.length ? enemies.reduce((a, u) => a + u.x, 0) / enemies.length : canvasSize.WW / 2;
    const dir = avgEnemyX > curUnit.x ? 1 : -1;
    eng.fire(aimRef.current.angle, aimRef.current.power, selectedWeapon, dir, aimRef.current.targetX);
  }, [canControl, selectedWeapon, canvasSize.WW]);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — code is visible on screen anyway
    }
  };

  const shareRoom = async () => {
    const url = `${window.location.origin}/online/${room.code}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Spit Wars', text: `Battle me in Spit Wars! Room ${room.code}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // user cancelled the share sheet
    }
  };

  const leaveRoom = async () => {
    if (leaving) return;
    setLeaving(true);
    try {
      await fetch(`/api/rooms/${room.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
    } catch {
      // leaving anyway
    }
    router.push('/online');
  };

  const joinRoom = async () => {
    if (joining) return;
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch(`/api/rooms/${room.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'join' }),
      });
      const data = await res.json();
      if (res.ok && data.room) applyRoomUpdate(data.room as RoomData);
      else setJoinError(data.error ?? 'Could not join room');
    } catch {
      setJoinError('Network error — try again.');
    } finally {
      setJoining(false);
    }
  };

  const rematch = async () => {
    if (rematching) return;
    setRematching(true);
    try {
      const res = await fetch(`/api/rooms/${room.code}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'rematch' }),
      });
      const data = await res.json();
      if (res.ok && data.room) applyRoomUpdate(data.room as RoomData);
    } catch {
      // poll/realtime will catch up
    } finally {
      setRematching(false);
    }
  };

  const { CW, CH } = canvasSize;
  const currentState = uiState;
  const isMyTurn = currentState?.currentTeam === myTeam;
  const winner = currentState?.winner;
  const winTeam = winner !== null && winner !== undefined ? TEAMS[winner] : null;

  const bigBtn =
    'inline-flex items-center justify-center min-h-12 px-6 py-3 font-bold rounded-lg text-white';

  // ─── Room closed by host ───────────────────────────────────────────────────

  if (roomGone) {
    return (
      <div className="min-h-screen bg-[#060614] text-white font-mono flex flex-col items-center justify-center p-4 text-center">
        <div className="text-2xl font-bold tracking-widest text-orange-400 mb-3">ROOM CLOSED</div>
        <div className="text-sm text-gray-400 mb-6">The host closed this room.</div>
        <button
          onClick={() => router.push('/online')}
          className={bigBtn}
          style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
        >
          BACK TO LOBBY
        </button>
      </div>
    );
  }

  // ─── Not signed in — online play is OTP-gated ─────────────────────────────

  if (!player) {
    return (
      <div className="min-h-screen bg-[#060614] text-white font-mono flex flex-col items-center justify-center p-4 text-center">
        <div className="text-2xl font-bold tracking-widest text-orange-400 mb-3">
          ROOM #{room.code}
        </div>
        <div className="text-sm text-gray-400 mb-6 max-w-xs">
          {room.status === 'waiting'
            ? `${room.host_name} is waiting for an opponent. Sign in to join the battle.`
            : `${room.host_name} vs ${room.guest_name ?? '…'} — sign in to play online.`}
        </div>
        <a
          href={`/auth?next=${encodeURIComponent(`/online/${room.code}`)}`}
          className={bigBtn + ' w-full max-w-xs'}
          style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
        >
          SIGN IN TO PLAY
        </a>
        <a href="/game" className="mt-4 text-[11px] text-gray-600 hover:text-gray-400 underline">
          or play solo without an account
        </a>
      </div>
    );
  }

  // ─── Signed in but not in this room ────────────────────────────────────────

  if (!isParticipant) {
    return (
      <div className="min-h-screen bg-[#060614] text-white font-mono flex flex-col items-center justify-center p-4 text-center">
        <div className="text-2xl font-bold tracking-widest text-orange-400 mb-4">
          ROOM #{room.code}
        </div>
        <div className="text-sm text-gray-400 mb-6">
          {room.status === 'waiting'
            ? `${room.host_name} is waiting for an opponent`
            : `${room.host_name} vs ${room.guest_name} — game in progress`}
        </div>
        {joinError && (
          <div className="text-red-400 text-xs mb-3" role="alert">{joinError}</div>
        )}
        {room.status === 'waiting' ? (
          <button
            onClick={joinRoom}
            disabled={joining}
            className={bigBtn + ' disabled:opacity-50'}
            style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
          >
            {joining ? 'JOINING…' : 'JOIN THIS BATTLE'}
          </button>
        ) : (
          <button
            onClick={() => router.push('/online')}
            className={bigBtn}
            style={{ background: 'linear-gradient(135deg,#f97316,#dc2626)' }}
          >
            BACK TO LOBBY
          </button>
        )}
      </div>
    );
  }

  // ─── Waiting room ────────────────────────────────────────────────────────

  if (room.status === 'waiting') {
    return (
      <div className="min-h-screen bg-[#060614] text-white font-mono flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-xs text-center">
          <div className="text-2xl font-bold tracking-widest bg-gradient-to-r from-orange-500 to-cyan-500 bg-clip-text text-transparent mb-6">
            WAITING FOR OPPONENT
          </div>

          <div className="bg-white/[.03] border border-[#1e3a2f] rounded-xl p-6 mb-4">
            <div className="text-[9px] text-gray-500 tracking-widest mb-2">ROOM CODE</div>
            <button
              className="text-4xl font-bold tracking-widest mb-4 block w-full"
              style={{ color: '#f97316' }}
              onClick={copyCode}
              aria-label={`Room code ${room.code.split('').join(' ')} — tap to copy`}
            >
              {room.code}
            </button>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="flex-1 min-h-11 text-xs text-gray-300 border border-gray-700 rounded-lg px-3 py-2 hover:border-gray-500"
              >
                {copied ? 'COPIED!' : 'COPY'}
              </button>
              <button
                onClick={shareRoom}
                className="flex-1 min-h-11 text-xs font-bold rounded-lg px-3 py-2 text-white"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
              >
                SHARE LINK
              </button>
            </div>
          </div>

          <div className="text-sm text-gray-500 mb-4">
            Share the code with your opponent.<br />
            The game starts when they join.
          </div>

          <div className="flex items-center justify-center gap-2 mb-6">
            <div
              className="w-2 h-2 rounded-full animate-pulse"
              style={{ background: '#22c55e' }}
              aria-hidden
            />
            <span className="text-[11px] text-gray-500">
              {room.host_name} (host) — waiting
            </span>
          </div>

          {!connected && (
            <div className="text-[11px] text-yellow-500 mb-4" role="status">
              Reconnecting… (we&apos;ll keep checking for your opponent)
            </div>
          )}

          <button
            onClick={leaveRoom}
            disabled={leaving}
            className="min-h-11 px-4 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 rounded-lg disabled:opacity-50"
          >
            {leaving ? 'CANCELLING…' : isHost ? 'CANCEL ROOM' : 'LEAVE'}
          </button>
        </div>
      </div>
    );
  }

  // ─── Game room ────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#060614] text-white font-mono select-none flex flex-col">
      <RotateHint />

      {/* Room info strip */}
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-[#0a0a18] border-b border-[#1e3a2f] text-[10px]">
        <span style={{ color: '#f97316' }} className="font-bold truncate min-w-0">{room.host_name}</span>
        <span className="text-gray-600 flex-shrink-0">VS</span>
        <span style={{ color: '#06b6d4' }} className="font-bold truncate min-w-0">{room.guest_name ?? '—'}</span>
        <span className="text-gray-700 flex-shrink-0">#{room.code}</span>
      </div>

      {/* Connection banner */}
      {!connected && (
        <div className="bg-yellow-500/10 border-b border-yellow-600 text-yellow-400 text-[11px] text-center py-1" role="status">
          Reconnecting to opponent…
        </div>
      )}

      {/* Canvas */}
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
            width={CW * canvasSize.dpr}
            height={CH * canvasSize.dpr}
            className="block rounded-lg"
            style={{ pointerEvents: 'none', border: '1px solid #1e3a2f', width: CW, height: CH }}
          />

          {/* Waiting for opponent's turn */}
          {currentState && !isMyTurn && currentState.phase === 'aiming' && winner === null && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-cyan-500/10 border border-cyan-500 px-4 py-1.5 rounded-full text-sm text-cyan-400 whitespace-nowrap">
              {`${isHost ? (room.guest_name ?? 'Opponent') : room.host_name} is thinking…`}
            </div>
          )}

          {/* My turn indicator */}
          {isMyTurn && currentState?.phase === 'aiming' && winner === null && (
            <div className="absolute top-12 left-1/2 -translate-x-1/2 bg-orange-500/10 border border-orange-500 px-4 py-1.5 rounded-full text-sm text-orange-400">
              YOUR TURN
            </div>
          )}

          {/* Game over overlay */}
          {winner !== null && winner !== undefined && winTeam && (
            <div className="absolute inset-0 bg-[#050510]/95 flex flex-col items-center justify-center gap-3 rounded-lg p-4">
              <div className="text-3xl font-bold tracking-widest text-center" style={{ color: winTeam.color }}>
                {myTeam === winner ? 'YOU WIN!' : 'YOU LOSE'}
              </div>
              <div className="text-sm text-gray-500">Spit happens.</div>
              <div className="flex flex-wrap justify-center gap-3 mt-4">
                <button
                  onClick={rematch}
                  disabled={rematching}
                  className={bigBtn + ' disabled:opacity-50'}
                  style={{ background: `linear-gradient(135deg,${winTeam.color},#dc2626)` }}
                >
                  {rematching ? 'STARTING…' : 'REMATCH'}
                </button>
                <button
                  onClick={leaveRoom}
                  disabled={leaving}
                  className="min-h-12 px-6 py-3 border border-gray-600 text-gray-400 rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
                >
                  {leaving ? 'LEAVING…' : 'LEAVE'}
                </button>
              </div>
              <div className="text-[10px] text-gray-600 mt-1">
                Rematch keeps both players in this room.
              </div>
            </div>
          )}

          {/* Leave confirm overlay */}
          {confirmLeave && winner === null && (
            <div className="absolute inset-0 bg-[#050510]/95 flex flex-col items-center justify-center gap-4 rounded-lg p-4">
              <div className="text-xl font-bold tracking-widest text-orange-400">LEAVE BATTLE?</div>
              <div className="text-xs text-gray-500 text-center max-w-[240px]">
                {isHost
                  ? 'Leaving closes the room for both players.'
                  : 'Your opponent will be left waiting for a new challenger.'}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmLeave(false)}
                  className={bigBtn}
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#0891b2)' }}
                >
                  KEEP PLAYING
                </button>
                <button
                  onClick={leaveRoom}
                  disabled={leaving}
                  className="min-h-12 px-6 py-3 border border-red-900 text-red-400 rounded-lg hover:bg-red-950 transition disabled:opacity-50"
                >
                  {leaving ? 'LEAVING…' : 'LEAVE'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* HUD — only shown when game is active */}
      {currentState && winner === null && (
        <SpitWarsHUD
          state={currentState}
          movesLeft={movesLeft}
          selectedWeapon={selectedWeapon}
          canControl={!!canControl}
          isAiTurn={false}
          angleRef={angleRef}
          angleTextRef={angleTextRef}
          powerRef={powerRef}
          powerTextRef={powerTextRef}
          targetRef={targetRef}
          targetTextRef={targetTextRef}
          onWeaponSelect={setSelectedWeapon}
          onLeft={() => canControl && engineRef.current?.walk(-1)}
          onRight={() => canControl && engineRef.current?.walk(1)}
          onJump={() => canControl && engineRef.current?.jump()}
          onJetpackStart={() => canControl && engineRef.current?.jetpackStart()}
          onJetpackStop={() => engineRef.current?.jetpackStop()}
          onShield={() => canControl && engineRef.current?.shield()}
          onFire={handleFire}
          onQuit={() => setConfirmLeave(true)}
        />
      )}
    </div>
  );
}
