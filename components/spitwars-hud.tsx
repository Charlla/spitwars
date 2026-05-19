'use client';

import React from 'react';
import { TEAMS, WEAPONS } from '@/lib/spitwars-data';
import type { GameState } from '@/lib/spitwars-engine';

interface HudProps {
  state: GameState;
  movesLeft: number;
  selectedWeapon: number;
  canControl: boolean;
  isAiTurn: boolean;
  angleRef: React.RefObject<HTMLDivElement | null>;
  angleTextRef: React.RefObject<HTMLSpanElement | null>;
  powerRef: React.RefObject<HTMLDivElement | null>;
  powerTextRef: React.RefObject<HTMLSpanElement | null>;
  targetRef: React.RefObject<HTMLDivElement | null>;
  targetTextRef: React.RefObject<HTMLSpanElement | null>;
  onWeaponSelect: (idx: number) => void;
  onLeft: () => void;
  onRight: () => void;
  onJump: () => void;
  onJetpackStart: () => void;
  onJetpackStop: () => void;
  onShield: () => void;
  onFire: () => void;
  onQuit: () => void;
}

export function SpitWarsHUD({
  state,
  movesLeft,
  selectedWeapon,
  canControl,
  isAiTurn,
  angleRef,
  angleTextRef,
  powerRef,
  powerTextRef,
  targetRef,
  targetTextRef,
  onWeaponSelect,
  onLeft,
  onRight,
  onJump,
  onJetpackStart,
  onJetpackStop,
  onShield,
  onFire,
  onQuit,
}: HudProps) {
  const team = TEAMS[state.currentTeam];
  const currentUnit = state.units.find((u) => u.id === state.curId);
  const weapon = WEAPONS[selectedWeapon];
  const isFiring = state.phase === 'firing';

  return (
    <div className="bg-[#0a0a18] border-t border-[#1e3a2f] px-2 py-1.5 flex flex-col gap-1.5">
      {/* Top row: team info + HP bars + weapon selector */}
      <div className="flex gap-1.5 items-stretch">
        {/* Current player badge */}
        <div
          className="flex flex-col justify-center px-2 py-1 rounded-lg min-w-[60px]"
          style={{
            background: `rgba(${state.currentTeam === 0 ? '249,115,22' : '6,182,212'},.1)`,
            border: `1px solid ${team.color}33`,
          }}
        >
          <div className="text-[7px] text-gray-500">
            {isAiTurn ? 'AI' : state.phase === 'transitioning' ? 'WAIT' : 'YOU'}
          </div>
          <div className="text-[10px] font-bold leading-tight" style={{ color: team.color }}>
            {currentUnit?.name ?? '-'}
          </div>
          <div className="flex gap-0.5 mt-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: i < movesLeft ? '#fbbf24' : '#374151' }}
              />
            ))}
          </div>
        </div>

        {/* HP bars for all units */}
        <div className="flex-1 flex gap-1 items-center">
          {[0, 1].map((teamIdx) => (
            <div key={teamIdx} className="flex-1 flex flex-col gap-0.5">
              {state.units
                .filter((u) => u.team === teamIdx)
                .map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-0.5"
                    style={{ opacity: u.alive ? 1 : 0.3 }}
                  >
                    <span
                      className="w-1 h-1 rounded-full flex-shrink-0"
                      style={{ background: TEAMS[teamIdx].color }}
                    />
                    <div className="flex-1 h-1 bg-gray-800 rounded overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${u.hp}%`,
                          background: u.hp > 60 ? '#22c55e' : u.hp > 30 ? '#eab308' : '#ef4444',
                        }}
                      />
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>

        {/* Weapon selector */}
        <div className="flex gap-0.5">
          {WEAPONS.map((w, i) => (
            <button
              key={w.id}
              onClick={() => canControl && state.phase === 'aiming' && onWeaponSelect(i)}
              className="w-9 h-9 flex flex-col items-center justify-center rounded-md transition-all"
              style={{
                background: selectedWeapon === i ? 'rgba(251,191,36,.15)' : 'rgba(255,255,255,.03)',
                border: `1px solid ${selectedWeapon === i ? '#fbbf24' : '#374151'}`,
                opacity: canControl && state.phase === 'aiming' ? 1 : 0.4,
                cursor: canControl && state.phase === 'aiming' ? 'pointer' : 'default',
              }}
            >
              <span className="text-sm leading-none">{w.e}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Movement buttons */}
      <div className="flex gap-1 justify-center">
        {[
          { label: 'LEFT',   action: onLeft,   color: '#9ca3af', bg: 'rgba(255,255,255,.05)' },
          { label: 'JUMP',   action: onJump,   color: '#22c55e', bg: 'rgba(34,197,94,.1)' },
        ].map(({ label, action, color, bg }) => (
          <button
            key={label}
            onClick={action}
            disabled={!canControl}
            className="w-12 h-8 text-[10px] font-bold rounded-md flex items-center justify-center"
            style={{
              background: canControl ? bg : 'rgba(255,255,255,.02)',
              border: `1px solid ${canControl ? `${color}44` : '#374151'}`,
              color: canControl ? color : '#4b5563',
            }}
          >
            {label}
          </button>
        ))}

        {/* Jetpack */}
        <button
          onPointerDown={onJetpackStart}
          onPointerUp={onJetpackStop}
          onPointerLeave={onJetpackStop}
          disabled={!canControl || (currentUnit?.jetpackFuel ?? 0) <= 0}
          className="w-12 h-8 text-[10px] font-bold rounded-md flex items-center justify-center"
          style={{
            background: 'rgba(253,224,71,.1)',
            border: `1px solid ${(currentUnit?.jetpackFuel ?? 0) > 0 ? '#fde047' : '#374151'}`,
            color: (currentUnit?.jetpackFuel ?? 0) > 0 ? '#fde047' : '#4b5563',
            opacity: (currentUnit?.jetpackFuel ?? 0) <= 0 ? 0.4 : 1,
          }}
        >
          JET
        </button>

        {/* Shield */}
        <button
          onClick={onShield}
          disabled={!canControl || !!currentUnit?.hasShield}
          className="w-12 h-8 text-[10px] font-bold rounded-md flex items-center justify-center"
          style={{
            background: currentUnit?.hasShield ? 'rgba(96,165,250,.2)' : 'rgba(255,255,255,.05)',
            border: `1px solid ${currentUnit?.hasShield ? '#60a5fa' : '#374151'}`,
            color: currentUnit?.hasShield || canControl ? '#60a5fa' : '#4b5563',
            opacity: currentUnit?.hasShield ? 0.4 : 1,
          }}
        >
          SHIELD
        </button>

        {[
          { label: 'RIGHT', action: onRight, color: '#9ca3af', bg: 'rgba(255,255,255,.05)' },
        ].map(({ label, action, color, bg }) => (
          <button
            key={label}
            onClick={action}
            disabled={!canControl}
            className="w-12 h-8 text-[10px] font-bold rounded-md flex items-center justify-center"
            style={{
              background: canControl ? bg : 'rgba(255,255,255,.02)',
              border: `1px solid ${canControl ? `${color}44` : '#374151'}`,
              color: canControl ? color : '#4b5563',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Aim/power controls + Fire */}
      <div className="flex gap-1.5 items-center">
        <div className="flex-1 flex flex-col gap-1">
          {/* Angle / Target indicator */}
          {weapon.aimType === 'target' ? (
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-red-500 w-7">TARGET</span>
              <div className="flex-1 h-2 bg-gray-900 rounded relative overflow-hidden border border-red-900">
                <div
                  ref={targetRef}
                  className="absolute left-0 top-0 h-full"
                  style={{ width: '50%', background: 'linear-gradient(90deg, #ef4444, #dc2626)' }}
                />
              </div>
              <span ref={targetTextRef} className="text-[8px] text-red-400 font-bold w-7 text-right">
                -
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="text-[7px] text-cyan-500 w-7">ANGLE</span>
              <div
                className="flex-1 h-2 bg-gray-900 rounded relative overflow-hidden border border-gray-700"
                style={{ opacity: weapon.aimType === 'power-only' ? 0.5 : 1 }}
              >
                <div
                  ref={angleRef}
                  className="absolute left-0 top-0 h-full"
                  style={{ width: '50%', background: 'linear-gradient(90deg, #06b6d4, #0891b2)' }}
                />
              </div>
              <span ref={angleTextRef} className="text-[8px] text-cyan-400 font-bold w-12 text-right">
                45deg
              </span>
            </div>
          )}

          {/* Power bar */}
          <div className="flex items-center gap-1">
            <span className="text-[7px] text-orange-500 w-7">POWER</span>
            <div
              className="flex-1 h-2 bg-gray-900 rounded relative overflow-hidden border border-gray-700"
              style={{ opacity: weapon.aimType === 'target' ? 0.3 : 1 }}
            >
              <div
                ref={powerRef}
                className="absolute left-0 top-0 h-full"
                style={{ width: '50%', background: 'linear-gradient(90deg, #22c55e, #f97316, #ef4444)' }}
              />
            </div>
            <span ref={powerTextRef} className="text-[8px] text-orange-400 font-bold w-7 text-right">
              50%
            </span>
          </div>
        </div>

        {/* Fire button */}
        <button
          onClick={onFire}
          disabled={!canControl}
          className="w-14 h-10 font-bold text-xs tracking-wider rounded-lg flex items-center justify-center"
          style={{
            background: canControl
              ? `linear-gradient(135deg,${team.color},${state.currentTeam === 0 ? '#dc2626' : '#0891b2'})`
              : '#2d2d2d',
            color: canControl ? 'white' : '#555',
            cursor: canControl ? 'pointer' : 'not-allowed',
            boxShadow: canControl ? `0 0 12px ${team.color}44` : 'none',
          }}
        >
          {isFiring ? '...' : 'FIRE'}
        </button>
      </div>

      {/* Bottom: flavor message + menu */}
      <div className="flex justify-between items-center text-[9px] text-gray-500 mt-0.5">
        <span className="truncate flex-1">{state.msg}</span>
        <button
          onClick={onQuit}
          aria-label="Open menu and pause"
          className="ml-2 inline-flex items-center gap-1 rounded-md border border-game-border-strong px-2 py-1 text-game-ink-muted hover:text-game-ink hover:border-game-accent/60"
        >
          ≡ MENU
        </button>
      </div>
    </div>
  );
}
