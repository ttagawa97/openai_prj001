import type { BossDefinition } from './boss';

export interface StageDefinition {
  stageId: number;
  name: string;
  duration: number;
  checkpoints: number[];
  enemyInterval: number;
  enemySpeed: number;
  enemyHp: number;
  airBulletInterval: number;
  groundBulletInterval: number;
  boss: BossDefinition;
}

const standardBossPhases: BossDefinition['phases'] = [
  {
    id: 'approach',
    startsAtHpRatio: 0.67,
    patterns: ['aimed', 'fan-3'],
    bulletIntervalMultiplier: 1,
    bulletSpeedMultiplier: 1,
  },
  {
    id: 'crossfire',
    startsAtHpRatio: 0.34,
    patterns: ['fan-5', 'cross-4'],
    bulletIntervalMultiplier: 0.86,
    bulletSpeedMultiplier: 1.08,
  },
  {
    id: 'last-stand',
    startsAtHpRatio: 0.01,
    patterns: ['radial-8', 'fan-3'],
    bulletIntervalMultiplier: 0.72,
    bulletSpeedMultiplier: 1.16,
  },
];

const bossParts = (leftArm: number, rightArm: number, core: number): BossDefinition['parts'] => ({
  'left-arm': { hp: leftArm, offsetX: -70, offsetY: 8 },
  'right-arm': { hp: rightArm, offsetX: 70, offsetY: 8 },
  core: { hp: core, offsetX: 0, offsetY: 0 },
});

const standardBossMovementCycle: BossDefinition['movementCycle'] = {
  periodMs: 6200,
  stopWindows: [
    { fromMs: 2300, toMs: 3300 },
    { fromMs: 5000, toMs: 5700 },
  ],
  horizontalAmplitude: 145,
  verticalAmplitude: 18,
};

export const stages: StageDefinition[] = [
  {
    stageId: 1,
    name: '暁の湾岸',
    duration: 32,
    checkpoints: [0, 12, 24, 32],
    enemyInterval: 1200,
    enemySpeed: 85,
    enemyHp: 1,
    airBulletInterval: 2800,
    groundBulletInterval: 1800,
    boss: {
      name: '機動巡洋艦 セレノア',
      hp: 28,
      timeout: 35,
      score: 5000,
      bulletInterval: 850,
      parts: bossParts(7, 7, 14),
      movementCycle: standardBossMovementCycle,
      phases: standardBossPhases,
    },
  },
  {
    stageId: 2,
    name: '翠風渓谷',
    duration: 36,
    checkpoints: [0, 13, 26, 36],
    enemyInterval: 1050,
    enemySpeed: 100,
    enemyHp: 1,
    airBulletInterval: 2500,
    groundBulletInterval: 1600,
    boss: {
      name: '渓谷守備艦',
      hp: 40,
      timeout: 35,
      score: 7500,
      bulletInterval: 750,
      parts: bossParts(10, 10, 20),
      movementCycle: standardBossMovementCycle,
      phases: standardBossPhases,
    },
  },
  {
    stageId: 3,
    name: '雲海要塞',
    duration: 40,
    checkpoints: [0, 14, 28, 40],
    enemyInterval: 900,
    enemySpeed: 115,
    enemyHp: 1,
    airBulletInterval: 2200,
    groundBulletInterval: 1400,
    boss: {
      name: '雲海要塞中枢',
      hp: 52,
      timeout: 40,
      score: 10000,
      bulletInterval: 650,
      parts: bossParts(13, 13, 26),
      movementCycle: standardBossMovementCycle,
      phases: standardBossPhases,
    },
  },
  {
    stageId: 4,
    name: '黄昏火山帯',
    duration: 44,
    checkpoints: [0, 15, 30, 44],
    enemyInterval: 780,
    enemySpeed: 130,
    enemyHp: 1,
    airBulletInterval: 1900,
    groundBulletInterval: 1200,
    boss: {
      name: '火山帯制圧艦',
      hp: 68,
      timeout: 40,
      score: 15000,
      bulletInterval: 550,
      parts: bossParts(17, 17, 34),
      movementCycle: standardBossMovementCycle,
      phases: standardBossPhases,
    },
  },
  {
    stageId: 5,
    name: '星環中枢',
    duration: 48,
    checkpoints: [0, 16, 32, 48],
    enemyInterval: 650,
    enemySpeed: 145,
    enemyHp: 1,
    airBulletInterval: 1600,
    groundBulletInterval: 1000,
    boss: {
      name: '星環中枢機構',
      hp: 85,
      timeout: 45,
      score: 25000,
      bulletInterval: 450,
      parts: bossParts(21, 21, 43),
      movementCycle: standardBossMovementCycle,
      phases: standardBossPhases,
    },
  },
];

export function validateStages(definitions: StageDefinition[]): string[] {
  const errors: string[] = [];
  if (definitions.length !== 5) errors.push('ステージは5件必要です');
  definitions.forEach((stage, index) => {
    if (stage.stageId !== index + 1) errors.push(`stageId ${index + 1} が不正です`);
    if (stage.checkpoints[0] !== 0 || stage.checkpoints.at(-1) !== stage.duration)
      errors.push(`stage ${stage.stageId} のチェックポイントが不正です`);
    if (stage.boss.hp <= 0 || stage.boss.timeout <= 0)
      errors.push(`stage ${stage.stageId} のボス設定が不正です`);
    if (stage.enemyHp !== 1) errors.push(`stage ${stage.stageId} の通常敵耐久力が不正です`);
    if (
      stage.airBulletInterval <= 0 ||
      stage.groundBulletInterval <= 0 ||
      stage.boss.bulletInterval <= 0
    )
      errors.push(`stage ${stage.stageId} の弾発射間隔が不正です`);
  });
  return errors;
}
