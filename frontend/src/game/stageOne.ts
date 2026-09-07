import type { EnemyArchetypeId } from './enemies';
import type { MovementPath } from './stageTimeline';

export type StageOneSection = 'introduction' | 'development' | 'midboss' | 'finale';

export interface StageOneWave {
  id: string;
  atMs: number;
  section: StageOneSection;
  enemies: Array<{
    archetypeId: EnemyArchetypeId;
    spawnX: number;
    movementPath: MovementPath;
  }>;
}

export interface StageOneMapSegment {
  id: string;
  fromMs: number;
  toMs: number;
  waterColor: number;
  shoreSide: 'left' | 'right' | 'both';
  terrain: Array<{ x: number; width: number; color: number }>;
}

export const stageOneMapSegments: StageOneMapSegment[] = [
  {
    id: 'harbor-mouth',
    fromMs: 0,
    toMs: 8_000,
    waterColor: 0x0b3552,
    shoreSide: 'left',
    terrain: [{ x: 0, width: 92, color: 0x314b42 }],
  },
  {
    id: 'breakwater',
    fromMs: 8_000,
    toMs: 16_000,
    waterColor: 0x10405c,
    shoreSide: 'both',
    terrain: [
      { x: 0, width: 62, color: 0x48515a },
      { x: 474, width: 66, color: 0x48515a },
    ],
  },
  {
    id: 'cargo-basin',
    fromMs: 16_000,
    toMs: 24_000,
    waterColor: 0x12364c,
    shoreSide: 'right',
    terrain: [{ x: 424, width: 116, color: 0x594936 }],
  },
  {
    id: 'sunrise-channel',
    fromMs: 24_000,
    toMs: 32_000,
    waterColor: 0x174b63,
    shoreSide: 'both',
    terrain: [
      { x: 0, width: 45, color: 0x364f45 },
      { x: 495, width: 45, color: 0x364f45 },
    ],
  },
];

const linear = (velocityX: number, velocityY = 85): MovementPath => ({
  kind: 'linear',
  velocityX,
  velocityY,
});
const sine = (amplitude: number): MovementPath => ({
  kind: 'sine',
  velocityY: 82,
  amplitude,
  periodMs: 2100,
});

export const stageOneWaves: StageOneWave[] = [
  {
    id: 'intro-air',
    atMs: 1_000,
    section: 'introduction',
    enemies: [
      { archetypeId: 'air-scout', spawnX: 220, movementPath: linear(-12) },
      { archetypeId: 'air-scout', spawnX: 320, movementPath: linear(12) },
    ],
  },
  {
    id: 'intro-ground',
    atMs: 3_600,
    section: 'introduction',
    enemies: [{ archetypeId: 'ground-tank', spawnX: 105, movementPath: linear(0, 38) }],
  },
  {
    id: 'intro-chain',
    atMs: 6_000,
    section: 'introduction',
    enemies: [
      { archetypeId: 'air-scout', spawnX: 410, movementPath: sine(42) },
      { archetypeId: 'ground-tank', spawnX: 130, movementPath: linear(0, 38) },
    ],
  },
  {
    id: 'development-cross',
    atMs: 9_000,
    section: 'development',
    enemies: [
      { archetypeId: 'air-scout', spawnX: 120, movementPath: linear(28) },
      { archetypeId: 'air-scout', spawnX: 420, movementPath: linear(-28) },
    ],
  },
  {
    id: 'development-chain',
    atMs: 12_500,
    section: 'development',
    enemies: [
      { archetypeId: 'ground-tank', spawnX: 465, movementPath: linear(-5, 38) },
      { archetypeId: 'air-scout', spawnX: 270, movementPath: sine(55) },
    ],
  },
  {
    id: 'midboss-escort',
    atMs: 17_000,
    section: 'midboss',
    enemies: [
      { archetypeId: 'air-scout', spawnX: 105, movementPath: sine(30) },
      { archetypeId: 'air-scout', spawnX: 435, movementPath: sine(30) },
    ],
  },
  {
    id: 'finale-ground',
    atMs: 22_000,
    section: 'finale',
    enemies: [
      { archetypeId: 'ground-tank', spawnX: 75, movementPath: linear(8, 38) },
      { archetypeId: 'ground-tank', spawnX: 465, movementPath: linear(-8, 38) },
    ],
  },
  {
    id: 'finale-chain',
    atMs: 25_000,
    section: 'finale',
    enemies: [
      { archetypeId: 'air-scout', spawnX: 165, movementPath: linear(18) },
      { archetypeId: 'ground-tank', spawnX: 375, movementPath: linear(0, 38) },
      { archetypeId: 'air-scout', spawnX: 455, movementPath: linear(-18) },
    ],
  },
  {
    id: 'finale-air',
    atMs: 28_000,
    section: 'finale',
    enemies: [
      { archetypeId: 'air-scout', spawnX: 120, movementPath: sine(50) },
      { archetypeId: 'air-scout', spawnX: 270, movementPath: sine(35) },
      { archetypeId: 'air-scout', spawnX: 420, movementPath: sine(50) },
    ],
  },
];

export const stageOneMidboss = {
  atMs: 15_500,
  name: '湾岸哨戒艇 アルバ',
  hp: 12,
  score: 2_000,
} as const;
