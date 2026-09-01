export interface StageDefinition {
  stageId: number;
  name: string;
  duration: number;
  checkpoints: number[];
  enemyInterval: number;
  enemySpeed: number;
  enemyHp: number;
  bulletInterval: number;
  boss: { hp: number; timeout: number; score: number };
}

export const stages: StageDefinition[] = [
  {
    stageId: 1,
    name: '暁の湾岸',
    duration: 32,
    checkpoints: [0, 12, 24, 32],
    enemyInterval: 1200,
    enemySpeed: 85,
    enemyHp: 1,
    bulletInterval: 1800,
    boss: { hp: 28, timeout: 35, score: 5000 },
  },
  {
    stageId: 2,
    name: '翠風渓谷',
    duration: 36,
    checkpoints: [0, 13, 26, 36],
    enemyInterval: 1050,
    enemySpeed: 100,
    enemyHp: 2,
    bulletInterval: 1600,
    boss: { hp: 40, timeout: 35, score: 7500 },
  },
  {
    stageId: 3,
    name: '雲海要塞',
    duration: 40,
    checkpoints: [0, 14, 28, 40],
    enemyInterval: 900,
    enemySpeed: 115,
    enemyHp: 2,
    bulletInterval: 1400,
    boss: { hp: 52, timeout: 40, score: 10000 },
  },
  {
    stageId: 4,
    name: '黄昏火山帯',
    duration: 44,
    checkpoints: [0, 15, 30, 44],
    enemyInterval: 780,
    enemySpeed: 130,
    enemyHp: 3,
    bulletInterval: 1200,
    boss: { hp: 68, timeout: 40, score: 15000 },
  },
  {
    stageId: 5,
    name: '星環中枢',
    duration: 48,
    checkpoints: [0, 16, 32, 48],
    enemyInterval: 650,
    enemySpeed: 145,
    enemyHp: 3,
    bulletInterval: 1000,
    boss: { hp: 85, timeout: 45, score: 25000 },
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
  });
  return errors;
}
