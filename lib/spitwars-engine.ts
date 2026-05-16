/**
 * Spit Wars Game Engine — client-side only
 * Manages all mutable game state through direct object mutation (same pattern as original).
 * Canvas rendering is handled in spitwars-canvas.tsx.
 */

import {
  WEAPONS,
  TEAMS,
  TERRAIN_POINTS,
  MOVES_PER_TURN,
  STARTING_HP,
  JETPACK_FUEL_MAX,
  randomFlavorMessage,
  type Weapon,
  type GameMode,
} from './spitwars-data';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Unit {
  id: number;
  team: number;
  name: string;
  x: number;
  y: number;
  hp: number;
  alive: boolean;
  facing: number; // 1 = right, -1 = left
  vx: number;
  vy: number;
  walkPhase: number;
  jetpackFuel: number;
  isJetpacking: boolean;
  hasShield: boolean;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  weapon: Weapon;
  active: boolean;
  team: number;
  trail: { x: number; y: number }[];
  age: number;
  bouncesLeft: number;
  isSubCluster?: boolean;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  life: number;
  maxLife: number;
  color: string;
}

export type GamePhase = 'aiming' | 'firing' | 'transitioning' | 'gameover';

export interface GameState {
  terrain: number[];
  units: Unit[];
  projs: Projectile[];
  particles: Particle[];
  currentTeam: number;
  curId: number;
  phase: GamePhase;
  wind: number;
  hum: [number, number]; // humiliation scores
  turnKey: number;
  winner: number | null;
  msg: string;
  movesLeft: number;
}

// ─── Terrain ─────────────────────────────────────────────────────────────────

function lerp(terrain: number[], x: number, worldW: number): number {
  const t = (x / worldW) * (TERRAIN_POINTS - 1);
  const i = Math.floor(t);
  const frac = t - i;
  if (i < 0) return terrain[0];
  if (i >= TERRAIN_POINTS - 1) return terrain[TERRAIN_POINTS - 1];
  return terrain[i] * (1 - frac) + terrain[i + 1] * frac;
}

function generateTerrain(canvasH: number): number[] {
  const seed = Math.random() * 100;
  const raw = Array.from({ length: TERRAIN_POINTS }, (_, i) => {
    const t = i / TERRAIN_POINTS;
    return (
      0.55 * canvasH +
      65 * Math.sin(t * Math.PI * 2.8 + seed) +
      30 * Math.sin(t * Math.PI * 5.2 + 0.7 * seed) +
      13 * Math.sin(t * Math.PI * 11.8 + 0.3 * seed) +
      27 * Math.cos(t * Math.PI * 3.7 + 0.5 * seed)
    );
  });
  // Smooth
  for (let pass = 0; pass < 4; pass++) {
    for (let i = 1; i < TERRAIN_POINTS - 1; i++) {
      raw[i] = (raw[i - 1] + 2 * raw[i] + raw[i + 1]) / 4;
    }
  }
  return raw.map((v) => Math.max(0.35 * canvasH, Math.min(0.85 * canvasH, v)));
}

// ─── Projectile speed helper ──────────────────────────────────────────────────

function calcSpeed(power: number, speedMult = 1): number {
  return (0.4 + (power / 100) * 20) * speedMult;
}

// ─── Engine class ─────────────────────────────────────────────────────────────

export class SpitWarsEngine {
  state: GameState;
  worldW: number;
  canvasH: number;
  mode: GameMode;

  // Callbacks
  onStateChange?: () => void;
  onImpact?: (x: number, y: number, weapon: Weapon, team: number, isCluster?: boolean) => void;

  constructor(worldW: number, canvasH: number, mode: GameMode) {
    this.worldW = worldW;
    this.canvasH = canvasH;
    this.mode = mode;

    const terrain = generateTerrain(canvasH);
    const unitDefs = [
      { id: 0, team: 0, name: 'Gerald' },
      { id: 1, team: 0, name: 'Butters' },
      { id: 2, team: 1, name: 'Karen' },
      { id: 3, team: 1, name: 'Chad' },
    ];

    const units: Unit[] = unitDefs.map((def, idx) => {
      const xFrac = [0.12, 0.22, 0.78, 0.88][idx];
      const x = xFrac * worldW;
      return {
        ...def,
        x,
        y: lerp(terrain, x, worldW),
        hp: STARTING_HP,
        alive: true,
        facing: idx < 2 ? 1 : -1,
        vx: 0,
        vy: 0,
        walkPhase: 0,
        jetpackFuel: JETPACK_FUEL_MAX,
        isJetpacking: false,
        hasShield: false,
      };
    });

    this.state = {
      terrain,
      units,
      projs: [],
      particles: [],
      currentTeam: 0,
      curId: 0,
      phase: 'aiming',
      wind: (Math.random() - 0.5) * 5,
      hum: [0, 0],
      turnKey: 0,
      winner: null,
      msg: 'Gerald fires first!',
      movesLeft: MOVES_PER_TURN,
    };
  }

  // ─── Public: get interpolated terrain height ────────────────────────────────

  terrainAt(x: number): number {
    return lerp(this.state.terrain, x, this.worldW);
  }

  // ─── Public: try to use a move ─────────────────────────────────────────────

  useMove(): boolean {
    const s = this.state;
    if (s.movesLeft <= 0) return false;
    s.movesLeft--;
    this.onStateChange?.();
    return true;
  }

  // ─── Public: move unit left or right ──────────────────────────────────────

  walk(dir: number): void {
    const s = this.state;
    if (s.phase !== 'aiming' || s.winner !== null) return;
    const unit = s.units.find((u) => u.id === s.curId);
    if (!unit?.alive) return;

    if (unit.isJetpacking) {
      unit.vx = Math.max(-5, Math.min(5, unit.vx + 1.5 * dir));
      unit.facing = dir;
      this.onStateChange?.();
      return;
    }

    const newX = unit.x + 30 * dir;
    const terrainY = lerp(s.terrain, newX, this.worldW);
    const isCliff = Math.abs(terrainY - unit.y) >= 25;
    const outOfBounds = newX <= 20 || newX >= this.worldW - 20;
    if (isCliff || outOfBounds) return;
    if (!this.useMove()) return;

    unit.facing = dir;
    unit.x = newX;
    unit.y = terrainY;
    unit.walkPhase = 2 * Math.sin(0.02 * Date.now());
    setTimeout(() => { if (unit) unit.walkPhase = 0; }, 200);
    this.onStateChange?.();
    this.checkAutoEndTurn();
  }

  // ─── Public: jump ─────────────────────────────────────────────────────────

  jump(): void {
    const s = this.state;
    if (s.phase !== 'aiming' || s.winner !== null) return;
    const unit = s.units.find((u) => u.id === s.curId);
    if (!unit?.alive) return;
    if (!this.useMove()) return;
    unit.vy = -7;
    unit.vx = 4 * unit.facing;
    this.onStateChange?.();
    this.checkAutoEndTurn();
  }

  // ─── Public: jetpack start / stop ─────────────────────────────────────────

  jetpackStart(): void {
    const s = this.state;
    if (s.phase !== 'aiming' || s.winner !== null) return;
    const unit = s.units.find((u) => u.id === s.curId);
    if (!unit?.alive || unit.jetpackFuel <= 0) return;
    if (!unit.isJetpacking) {
      if (!this.useMove()) return;
    }
    unit.isJetpacking = true;
    this.onStateChange?.();
  }

  jetpackStop(): void {
    const unit = this.state.units.find((u) => u.id === this.state.curId);
    if (!unit) return;
    const wasJetpacking = unit.isJetpacking;
    unit.isJetpacking = false;
    if (wasJetpacking) {
      this.state.movesLeft = 0;
      this.onStateChange?.();
      setTimeout(() => this.endTurn(), 500);
    } else {
      this.onStateChange?.();
    }
  }

  // ─── Public: raise shield ─────────────────────────────────────────────────

  shield(): void {
    const s = this.state;
    if (s.phase !== 'aiming' || s.winner !== null) return;
    const unit = s.units.find((u) => u.id === s.curId);
    if (!unit?.alive || unit.hasShield) return;
    if (!this.useMove()) return;
    unit.hasShield = true;
    s.msg = `${unit.name} raised a shield!`;
    s.movesLeft = 0;
    this.onStateChange?.();
    setTimeout(() => this.endTurn(), 500);
  }

  // ─── Public: fire weapon ─────────────────────────────────────────────────

  fire(angle: number, power: number, weaponIdx: number, dir: number, targetX?: number): void {
    const s = this.state;
    if (s.phase !== 'aiming' || s.winner !== null) return;
    const unit = s.units.find((u) => u.id === s.curId);
    if (!unit?.alive) return;

    const weapon = WEAPONS[weaponIdx];
    const spd = calcSpeed(power, weapon.speed ?? 1);

    if (weapon.aimType === 'target') {
      const tx = targetX ?? this.worldW / 2;
      s.projs = [{
        x: tx + (Math.random() - 0.5) * 30,
        y: -30,
        vx: 0,
        vy: 8,
        weapon,
        active: true,
        team: s.currentTeam,
        trail: [],
        age: 0,
        bouncesLeft: 0,
      }];
    } else if (weapon.aimType === 'power-only') {
      const rad = ((weapon.fixedAngle ?? 72) * Math.PI) / 180;
      s.projs = [{
        x: unit.x + 17 * dir,
        y: unit.y - 16,
        vx: Math.cos(rad) * spd * dir,
        vy: -Math.sin(rad) * spd,
        weapon,
        active: true,
        team: s.currentTeam,
        trail: [],
        age: 0,
        bouncesLeft: weapon.bounces ?? 0,
      }];
    } else {
      const rad = (angle * Math.PI) / 180;
      s.projs = [{
        x: unit.x + 17 * dir,
        y: unit.y - 16,
        vx: Math.cos(rad) * spd * dir,
        vy: -Math.sin(rad) * spd,
        weapon,
        active: true,
        team: s.currentTeam,
        trail: [],
        age: 0,
        bouncesLeft: weapon.bounces ?? 0,
      }];
    }

    s.phase = 'firing';
    this.onStateChange?.();
  }

  // ─── Public: apply impact (called by canvas loop on collision) ─────────────

  applyImpact(x: number, y: number, weapon: Weapon, attackingTeam: number, isCluster = true): void {
    const s = this.state;
    if (s.phase === 'gameover') return;

    // Crater the terrain
    s.terrain = s.terrain.map((h, i) => {
      const dx = (i / (TERRAIN_POINTS - 1)) * this.worldW - x;
      if (Math.abs(dx) >= weapon.blast) return h;
      return Math.max(h, y + Math.sqrt(Math.max(0, weapon.blast ** 2 - dx ** 2)));
    });

    // Damage units
    s.units = s.units.map((u) => {
      if (!u.alive) return u;
      const dist = Math.sqrt((u.x - x) ** 2 + (u.y - 11 - y) ** 2);
      if (dist < weapon.blast + 11 + 8) {
        let dmg = Math.max(1, Math.round(weapon.dmg * (1 - dist / (weapon.blast + 11 + 16))));
        if (u.hasShield) {
          dmg = Math.floor(dmg / 2);
          const newHp = Math.max(0, u.hp - dmg);
          return { ...u, hp: newHp, alive: newHp > 0, hasShield: false };
        }
        const newHp = Math.max(0, u.hp - dmg);
        return { ...u, hp: newHp, alive: newHp > 0 };
      }
      return u;
    });

    // Re-anchor units to terrain
    s.units = s.units.map((u) =>
      u.alive ? { ...u, y: lerp(s.terrain, u.x, this.worldW) } : u
    );

    // Humiliation meter
    s.hum[1 - attackingTeam] = Math.min(100, s.hum[1 - attackingTeam] + 22);

    // Explosion particles
    for (let i = 0; i < 28; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = 6 * Math.random() + 1;
      s.particles.push({
        x, y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd - 2.5,
        r: 5 * Math.random() + 2,
        life: 50,
        maxLife: 50,
        color: ['#f97316', '#fbbf24', '#ef4444', '#fff', '#fed7aa'][Math.floor(Math.random() * 5)],
      });
    }

    // Cluster sub-projectiles
    if (weapon.clusters && isCluster) {
      for (let i = 0; i < weapon.clusters; i++) {
        const rad = Math.PI / 4 + (i / (weapon.clusters - 1)) * (Math.PI / 2);
        const spd = 4 + 2 * Math.random();
        s.projs.push({
          x, y: y - 5,
          vx: Math.cos(rad) * spd * (Math.random() > 0.5 ? 1 : -1),
          vy: -Math.sin(rad) * spd,
          weapon: { ...weapon, clusters: 0, blast: weapon.blast * 0.6, dmg: weapon.dmg * 0.6 },
          active: true,
          team: attackingTeam,
          trail: [],
          age: 0,
          bouncesLeft: 0,
          isSubCluster: true,
        });
      }
      return; // don't end turn yet — wait for sub-clusters
    }

    // Flavor message
    const actor = s.units.find((u) => u.id === s.curId);
    s.msg = randomFlavorMessage(actor?.name);

    // Check win condition
    const team0Alive = s.units.filter((u) => u.team === 0 && u.alive).length;
    const team1Alive = s.units.filter((u) => u.team === 1 && u.alive).length;
    if (team0Alive === 0) { s.winner = 1; s.phase = 'gameover'; s.projs = []; this.onStateChange?.(); return; }
    if (team1Alive === 0) { s.winner = 0; s.phase = 'gameover'; s.projs = []; this.onStateChange?.(); return; }

    // If more projectiles still active, let them finish
    if (s.projs.some((p) => p.active)) return;

    // Transition to next turn
    this.scheduleNextTurn();
  }

  // ─── Private: schedule turn transition ────────────────────────────────────

  scheduleNextTurn(delay = 2200): void {
    const s = this.state;
    const nextTeam = 1 - s.currentTeam;
    const candidates = s.units.filter((u) => u.team === nextTeam && u.alive);
    if (!candidates.length) return;
    const nextId = candidates[Math.floor(s.turnKey / 2) % candidates.length].id;

    s.phase = 'transitioning';
    s.projs = [];
    this.onStateChange?.();

    setTimeout(() => {
      s.currentTeam = nextTeam;
      s.curId = nextId;
      s.wind = (Math.random() - 0.5) * 16 * (Math.random() > 0.7 ? 1.5 : 1);
      s.turnKey++;
      s.movesLeft = MOVES_PER_TURN;
      s.units = s.units.map((u) => (u.team !== nextTeam ? { ...u, hasShield: false } : u));
      s.units = s.units.map((u) => (u.id === nextId ? { ...u, jetpackFuel: JETPACK_FUEL_MAX } : u));
      s.phase = 'aiming';
      this.onStateChange?.();
    }, delay);
  }

  // ─── Private: end of moves auto-end ───────────────────────────────────────

  checkAutoEndTurn(): void {
    const s = this.state;
    if (s.phase === 'aiming' && s.movesLeft <= 0) {
      setTimeout(() => {
        if (this.state.movesLeft <= 0 && this.state.phase === 'aiming') {
          this.endTurn();
        }
      }, 800);
    }
  }

  endTurn(): void {
    const s = this.state;
    if (s.phase !== 'aiming') return;
    s.msg = 'Out of moves!';
    this.scheduleNextTurn(1200);
  }

  // ─── Public: tick physics (called every animation frame) ─────────────────

  tick(frame: number): void {
    const s = this.state;

    // Tick particles
    s.particles = s.particles.filter((p) => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18;
      p.life--;
      return p.life > 0;
    });

    // Tick units (physics)
    s.units = s.units.map((u) => {
      if (!u.alive) return u;

      // Jetpack thrust
      if (u.isJetpacking && u.jetpackFuel > 0) {
        u.vy = Math.max(-6, u.vy - 0.5);
        u.vx += 0.015 * s.wind;
        u.jetpackFuel -= 1.5;
        if (u.jetpackFuel <= 0) { u.isJetpacking = false; u.jetpackFuel = 0; }
      }

      u.x += u.vx;
      u.vx *= 0.95;

      // Only apply gravity if airborne
      const tY = lerp(s.terrain, u.x, this.worldW);
      if (u.vy !== 0 || u.y < tY - 2 || u.isJetpacking) {
        u.vy += 0.25;
        u.y += u.vy;
        u.x = Math.max(20, Math.min(this.worldW - 20, u.x));
        if (u.y > this.canvasH + 50) { u.hp = 0; u.alive = false; return u; }
        const groundY = lerp(s.terrain, u.x, this.worldW);
        if (u.y >= groundY) {
          if (u.vy > 12) {
            const fallDmg = Math.floor((u.vy - 12) * 4);
            u.hp = Math.max(0, u.hp - fallDmg);
            if (u.hp <= 0) u.alive = false;
          }
          u.y = groundY;
          u.vy = 0;
          u.vx = 0;
          u.isJetpacking = false;
        }
      }

      return u;
    });

    // Check if current unit fell to doom
    const cur = s.units.find((u) => u.id === s.curId);
    if (cur && !cur.alive && s.phase === 'aiming') {
      s.msg = `${cur.name} fell to their doom!`;
      const t0 = s.units.filter((u) => u.team === 0 && u.alive).length;
      const t1 = s.units.filter((u) => u.team === 1 && u.alive).length;
      if (t0 === 0) { s.winner = 1; s.phase = 'gameover'; }
      else if (t1 === 0) { s.winner = 0; s.phase = 'gameover'; }
      else { s.movesLeft = 0; this.endTurn(); }
      this.onStateChange?.();
    }

    // Tick projectiles
    if (s.phase === 'firing') {
      let anyActive = false;
      s.projs = s.projs.map((proj) => {
        if (!proj.active) return proj;
        anyActive = true;

        const trail = [...(proj.trail ?? []), { x: proj.x, y: proj.y }].slice(-14);
        let { x, y, vx, vy, bouncesLeft } = proj;

        vx += 0.012 * s.wind * (proj.weapon.windMult ?? 1);
        vy += 0.25;
        x += vx;
        y += vy;

        // Out of bounds
        if (x < -80 || x > this.worldW + 80 || y > this.canvasH + 50) {
          this.onImpact?.(
            Math.max(5, Math.min(this.worldW - 5, x)),
            Math.min(this.canvasH - 5, y),
            proj.weapon,
            proj.team,
          );
          return { ...proj, active: false };
        }

        // Terrain collision
        const tY = lerp(s.terrain, x, this.worldW);
        if (y >= tY) {
          if (bouncesLeft > 0) {
            return { ...proj, x, y: tY - 2, vx: 0.7 * vx, vy: -(0.5 * vy), trail, age: proj.age + 1, bouncesLeft: bouncesLeft - 1 };
          }
          this.onImpact?.(x, tY, proj.weapon, proj.team);
          return { ...proj, active: false };
        }

        // Unit collision (enemy only)
        const hit = s.units.find(
          (u) => u.alive && u.team !== proj.team && Math.sqrt((u.x - x) ** 2 + (u.y - 11 - y) ** 2) < 21
        );
        if (hit) {
          this.onImpact?.(x, y, proj.weapon, proj.team);
          return { ...proj, active: false };
        }

        return { ...proj, x, y, vx, vy, trail, age: proj.age + 1 };
      });

      // All projectiles landed
      if (!anyActive && s.projs.length > 0) {
        const actor = s.units.find((u) => u.id === s.curId);
        s.msg = randomFlavorMessage(actor?.name);

        const t0 = s.units.filter((u) => u.team === 0 && u.alive).length;
        const t1 = s.units.filter((u) => u.team === 1 && u.alive).length;
        if (t0 === 0) { s.winner = 1; s.phase = 'gameover'; s.projs = []; this.onStateChange?.(); return; }
        if (t1 === 0) { s.winner = 0; s.phase = 'gameover'; s.projs = []; this.onStateChange?.(); return; }

        this.scheduleNextTurn();
      }
    }
  }

  // ─── Online: apply remote game state snapshot ─────────────────────────────

  applySnapshot(snapshot: Partial<GameState>): void {
    Object.assign(this.state, snapshot);
    this.onStateChange?.();
  }

  // ─── Snapshot for transmission ─────────────────────────────────────────────

  snapshot(): Partial<GameState> {
    const s = this.state;
    return {
      terrain: s.terrain,
      units: s.units.map((u) => ({ ...u })),
      projs: [],
      particles: [],
      currentTeam: s.currentTeam,
      curId: s.curId,
      phase: s.phase,
      wind: s.wind,
      hum: [...s.hum] as [number, number],
      turnKey: s.turnKey,
      winner: s.winner,
      msg: s.msg,
      movesLeft: s.movesLeft,
    };
  }
}
