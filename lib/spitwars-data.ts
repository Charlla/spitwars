// Spit Wars game constants — extracted from the minified bundle

export interface Weapon {
  id: string;
  name: string;
  e: string; // emoji
  dmg: number;
  blast: number;
  windMult: number;
  bounces?: number;
  clusters?: number;
  speed?: number;
  fixedAngle?: number;
  aimType: 'standard' | 'power-only' | 'target';
  desc: string;
}

export const WEAPONS: Weapon[] = [
  { id: 'spit',     name: 'Spit Bomb',  e: '💦', dmg: 45, blast: 42, windMult: 1,   bounces: 1,            aimType: 'standard',   desc: 'Bounces 1x'     },
  { id: 'mortar',   name: 'Mortar',     e: '💣', dmg: 60, blast: 58, windMult: 0.8, fixedAngle: 72,        aimType: 'power-only', desc: 'High arc'       },
  { id: 'missile',  name: 'Missile',    e: '🚀', dmg: 55, blast: 38, windMult: 0.3, speed: 1.4,            aimType: 'standard',   desc: 'Fast + stable'  },
  { id: 'airstrike',name: 'Air Strike', e: '🎯', dmg: 75, blast: 65, windMult: 0.1,                        aimType: 'target',     desc: 'Mark target'    },
  { id: 'cluster',  name: 'Cluster',    e: '💥', dmg: 35, blast: 32, windMult: 1.2, clusters: 3,           aimType: 'standard',   desc: 'Splits 3x'      },
];

export interface Team {
  id: number;
  name: string;
  color: string;
  names: string[];
}

export const TEAMS: Team[] = [
  { id: 0, name: 'LLAMAS',  color: '#f97316', names: ['Gerald', 'Butters'] },
  { id: 1, name: 'ALPACAS', color: '#06b6d4', names: ['Karen',  'Chad']   },
];

export const FLAVOR_MESSAGES: ((name?: string) => string)[] = [
  (n) => `${n ?? 'Someone'} has no regrets. ALL the regrets.`,
  (n) => `The Andes weep for ${n ?? 'them'}.`,
  ()  => 'Certified grass-eater moment.',
  (n) => `${n ?? 'Someone'}'s aim is... aspirational.`,
  ()  => 'SPIT HAPPENS!',
  (n) => `${n ?? 'Someone'} felt that in their wool.`,
  ()  => 'Even the condors are laughing.',
  ()  => 'That crater is a feature, not a bug.',
  ()  => 'Gerald would\'ve nailed that. Gerald always does.',
  (n) => `Wind is hard. ${n ?? 'They know'} now.`,
  (n) => `${n ?? 'Someone'} aimed with their heart. Their heart lied.`,
  ()  => 'Jetpack sputtered! Classic.',
];

export function randomFlavorMessage(name?: string): string {
  const fn = FLAVOR_MESSAGES[Math.floor(Math.random() * FLAVOR_MESSAGES.length)];
  return fn(name);
}

// Terrain generation constants
export const TERRAIN_POINTS = 480;
export const MOVES_PER_TURN = 5;
export const STARTING_HP = 100;
export const JETPACK_FUEL_MAX = 100;

// Game modes
export type GameMode = 'passplay' | 'ai' | 'online';
export type AiPersonality = 'karen' | 'chad';
