import Phaser from 'phaser';
import { applyPlayerDestroyed, newSession, resolveBoss, type GameSession } from '../game/state';
import { activeAttacks, clampPlayer, groundTargetPosition } from '../game/rules';
import { stages, validateStages, type StageDefinition } from '../game/stages';
import {
  activateSyncBurst,
  expireChain,
  isSyncBurstActive,
  registerDefeat,
  SYNC_GAUGE_MAX,
} from '../game/combat';
import {
  collectDueEvents,
  findTimelineCursor,
  generateStageTimeline,
  STAGE_SEEDS,
  validateStageTimeline,
  type MovementPath,
  type StageTimeline,
  type TimelineEnemy,
} from '../game/stageTimeline';
import { createBulletPattern, type BulletPatternId } from '../game/bulletPatterns';
import { enemyArchetypes, type EnemyArchetypeId } from '../game/enemies';
import { stageOneMapSegments } from '../game/stageOne';
import {
  destructionEffectProfile,
  playerDestructionEffectProfile,
  type DestructionScale,
} from '../game/destructionEffects';
import { addLock, isInsideLockOnRadius, quadraticLaserPoint } from '../game/lockOn';
import { NORMAL_ENEMY_HP, scaledEnemyBulletSpeed } from '../game/balance';
import {
  advanceBossMotion,
  advanceBossTimer,
  beginBossEncounter,
  currentBossPhase,
  damageBossPart,
  nextBossPattern,
  type BossPartId,
  type BossEncounter,
} from '../game/boss';
import {
  playBossPhase,
  playCheckpoint,
  playClear,
  playDestruction,
  playEnemyHit,
  playGroundLaser,
  playLockOn,
  playPlayerDestroyed,
  playShot,
  playSyncBurst,
  playWarning,
  startBgm,
  stopBgm,
} from '../audio';

type Enemy = Phaser.Physics.Arcade.Sprite & {
  archetypeId: EnemyArchetypeId;
  targetClass: 'air' | 'ground';
  hp: number;
  points: number;
  lastShot: number;
  movementPath: MovementPath;
  pathOriginX: number;
  spawnedAt: number;
  attackSequence: number;
  isMidboss?: boolean;
  bossPart?: BossPartId;
  bossOffsetX?: number;
  bossOffsetY?: number;
};

export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private stageDef!: StageDefinition;
  private stageTimeline!: StageTimeline;
  private timelineCursor = 0;
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private z!: Phaser.Input.Keyboard.Key;
  private x!: Phaser.Input.Keyboard.Key;
  private c!: Phaser.Input.Keyboard.Key;
  private elapsed = 0;
  private lastAir = 0;
  private lastGroundLaser = 0;
  private boss?: Enemy;
  private bossParts: Partial<Record<BossPartId, Enemy>> = {};
  private bossEncounter?: BossEncounter;
  private bossPhaseId?: string;
  private bossAnchor = { x: 270, y: 120 };
  private hud!: Phaser.GameObjects.Text;
  private bossHud!: Phaser.GameObjects.Text;
  private stageTitle?: Phaser.GameObjects.Text;
  private bossWarning?: Phaser.GameObjects.Text;
  private groundTarget!: Phaser.GameObjects.Graphics;
  private lockOnDisplay!: Phaser.GameObjects.Graphics;
  private groundLocks: Enemy[] = [];
  private stageBackdrop!: Phaser.GameObjects.Graphics;
  private midbossLabel?: Phaser.GameObjects.Text;
  private invulnerable = false;
  constructor() {
    super('game');
  }

  create() {
    const errors = validateStages(stages);
    if (errors.length) throw new Error(errors.join(', '));
    this.session = newSession();
    this.makeTextures();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.z = this.input.keyboard!.addKey('Z');
    this.x = this.input.keyboard!.addKey('X');
    this.c = this.input.keyboard!.addKey('C');
    this.playerBullets = this.physics.add.group({ maxSize: 80 });
    this.enemyBullets = this.physics.add.group({ maxSize: 240 });
    this.enemies = this.physics.add.group({ maxSize: 50 });
    this.player = this.physics.add.sprite(270, 800, 'player').setCollideWorldBounds(true);
    const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
    playerBody.setSize(12, 12).setOffset(16, 16);
    this.groundTarget = this.createCrosshair().setAlpha(0.85).setDepth(5);
    this.lockOnDisplay = this.add.graphics().setDepth(13);
    this.stageBackdrop = this.add.graphics().setDepth(-10);
    this.hud = this.add
      .text(14, 12, '', {
        fontSize: '19px',
        color: '#F4F7FF',
        backgroundColor: '#08111FCC',
        padding: { x: 8, y: 5 },
      })
      .setDepth(20);
    this.bossHud = this.add
      .text(270, 52, '', { fontSize: '17px', color: '#FFCC33', align: 'center' })
      .setOrigin(0.5)
      .setDepth(20)
      .setVisible(false);
    this.physics.add.overlap(this.playerBullets, this.enemies, (b, e) =>
      this.hitEnemy(b as Phaser.Physics.Arcade.Sprite, e as Enemy, 'air'),
    );
    this.physics.add.overlap(this.player, this.enemyBullets, (_p, b) => {
      (b as Phaser.Physics.Arcade.Sprite).disableBody(true, true);
      this.destroyPlayer();
    });
    this.physics.add.overlap(this.player, this.enemies, () => this.destroyPlayer());
    this.startStage(1, 0);
  }

  update(_time: number, delta: number) {
    if (this.session.playerState !== 'playing') return;
    const speed = 280;
    this.player.setVelocity(
      (this.cursors.left.isDown ? -speed : 0) + (this.cursors.right.isDown ? speed : 0),
      (this.cursors.up.isDown ? -speed : 0) + (this.cursors.down.isDown ? speed : 0),
    );
    if (this.player.body!.velocity.length() > speed)
      this.player.body!.velocity.normalize().scale(speed);
    const pos = clampPlayer(this.player.x, this.player.y);
    this.player.setPosition(pos.x, pos.y);
    const target = groundTargetPosition(this.player.x, this.player.y);
    this.groundTarget.setPosition(target.x, target.y);
    this.updateGroundLocks(target);
    this.elapsed += delta / 1000;
    this.updateStageBackdrop();
    expireChain(this.session.combat, this.time.now);
    if (Phaser.Input.Keyboard.JustDown(this.c)) this.tryActivateSyncBurst();
    const burstActive = isSyncBurstActive(this.session.combat, this.time.now);
    const attacks = activeAttacks(this.z.isDown, this.x.isDown);
    if (attacks.includes('air') && this.time.now - this.lastAir > (burstActive ? 75 : 150))
      this.fireAir();
    if (
      attacks.includes('ground') &&
      this.time.now - this.lastGroundLaser > (burstActive ? 300 : 600)
    )
      this.fireGroundLasers();
    if (!this.boss) {
      this.processTimeline();
    } else if (this.bossEncounter) {
      const status = advanceBossTimer(this.bossEncounter, delta);
      advanceBossMotion(this.stageDef.boss, this.bossEncounter, delta);
      this.updateBossParts();
      const phase = currentBossPhase(this.stageDef.boss, this.bossEncounter);
      if (phase.id !== this.bossPhaseId) {
        this.bossPhaseId = phase.id;
        if (this.bossEncounter.attackCount > 0) this.showBossPhaseChange();
      }
      const partLabel = this.bossEncounter.coreExposed
        ? `CORE ${this.bossEncounter.parts.core.hp}`
        : `ARM L${this.bossEncounter.parts['left-arm'].hp} R${this.bossEncounter.parts['right-arm'].hp}`;
      this.bossHud.setText(
        `${this.stageDef.boss.name}　${phase.id}　${this.bossEncounter.motionMode}\n${partLabel}　HP ${this.bossEncounter.hp} / ${this.bossEncounter.maxHp}　 TIME ${Math.ceil(this.bossEncounter.remainingMs / 1000)}`,
      );
      if (status === 'retreated') this.finishBoss(false);
    }
    this.enemies.getChildren().forEach((obj) => this.updateEnemy(obj as Enemy));
    [...this.playerBullets.getChildren(), ...this.enemyBullets.getChildren()].forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      if (s.active && (s.x < -40 || s.x > 580 || s.y < -40 || s.y > 1000))
        s.disableBody(true, true);
    });
    const burstRemaining = Math.max(0, this.session.combat.burstEndsAt - this.time.now) / 1000;
    const syncStatus = burstActive
      ? `BURST ${burstRemaining.toFixed(1)}s`
      : this.session.combat.syncGauge === SYNC_GAUGE_MAX
        ? 'C:READY'
        : `${this.session.combat.syncGauge}/${SYNC_GAUGE_MAX}`;
    this.hud.setText(
      `SCORE ${String(this.session.score).padStart(8, '0')}　 STAGE ${this.session.currentStage}　 LIFE ${this.session.lives}\n` +
        `CHAIN ${this.session.combat.chainCount}　 x${this.session.combat.scoreMultiplier}　 SYNC ${syncStatus}`,
    );
  }

  private startStage(stage: number, progress: number) {
    this.groundLocks = [];
    this.lockOnDisplay.clear();
    this.stageDef = stages[stage - 1]!;
    this.stageTimeline = generateStageTimeline(this.stageDef, STAGE_SEEDS[stage - 1]!);
    const timelineErrors = validateStageTimeline(this.stageTimeline, this.stageDef);
    if (timelineErrors.length) throw new Error(timelineErrors.join(', '));
    this.elapsed = progress;
    this.timelineCursor = findTimelineCursor(this.stageTimeline, progress * 1000);
    startBgm('stage');
    this.cameras.main.setBackgroundColor(
      [0x081a2f, 0x0d2b28, 0x222345, 0x321c22, 0x12142e][stage - 1]!,
    );
    this.updateStageBackdrop();
    this.stageTitle?.destroy();
    this.stageTitle = this.add
      .text(270, 150, `STAGE ${stage}\n${this.stageDef.name}`, {
        fontSize: '28px',
        color: '#48D7FF',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0.9)
      .setScrollFactor(0);
    this.tweens.add({
      targets: this.stageTitle,
      alpha: 0,
      y: 130,
      delay: 1200,
      duration: 700,
      onComplete: () => {
        this.stageTitle?.destroy();
        this.stageTitle = undefined;
      },
    });
  }
  private makeTextures() {
    const make = (key: string, color: number, points: number[]) => {
      const g = this.make.graphics({ x: 0, y: 0 }, false);
      g.fillStyle(color);
      g.fillPoints(
        points.reduce<Phaser.Geom.Point[]>((a, v, i) => {
          if (i % 2 === 0) a.push(new Phaser.Geom.Point(v, points[i + 1]!));
          return a;
        }, []),
        true,
      );
      g.generateTexture(key, 44, 44);
      g.destroy();
    };
    make('player', 0x48d7ff, [22, 0, 42, 40, 22, 32, 2, 40]);
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    // 偵察機：前進翼
    g.fillStyle(0xff4d5a);
    g.fillPoints(
      [
        [22, 43],
        [15, 28],
        [2, 22],
        [15, 16],
        [18, 2],
        [26, 2],
        [29, 16],
        [42, 22],
        [29, 28],
      ].map(([x, y]) => new Phaser.Geom.Point(x!, y!)),
      true,
    );
    g.fillStyle(0xf4f7ff).fillTriangle(22, 30, 18, 18, 26, 18);
    g.generateTexture('airScout', 44, 44);
    // 迎撃機：細長い三角翼
    g.clear();
    g.fillStyle(0xff704f);
    g.fillTriangle(22, 43, 7, 4, 37, 4);
    g.fillStyle(0xf4f7ff).fillTriangle(22, 31, 18, 13, 26, 13);
    g.generateTexture('airInterceptor', 44, 44);
    // 重攻撃機：幅広の多角形翼
    g.clear();
    g.fillStyle(0xc93cff);
    g.fillPoints(
      [
        [22, 43],
        [13, 31],
        [1, 28],
        [7, 8],
        [18, 14],
        [22, 1],
        [26, 14],
        [37, 8],
        [43, 28],
        [31, 31],
      ].map(([x, y]) => new Phaser.Geom.Point(x!, y!)),
      true,
    );
    g.fillStyle(0xf4f7ff).fillCircle(22, 22, 5);
    g.generateTexture('airGunship', 44, 44);
    // ステージ1ボス：中央装甲と左右アームを別パーツとして描画する
    g.clear();
    g.fillStyle(0x6f7fa7);
    g.fillPoints(
      [
        [22, 2],
        [36, 14],
        [32, 38],
        [22, 43],
        [12, 38],
        [8, 14],
      ].map(([x, y]) => new Phaser.Geom.Point(x!, y!)),
      true,
    );
    g.fillStyle(0x26334f).fillTriangle(22, 12, 15, 31, 29, 31);
    g.lineStyle(2, 0xb7c5ef).strokeTriangle(22, 12, 15, 31, 29, 31);
    g.generateTexture('stageOneBoss', 44, 44);
    g.clear();
    g.fillStyle(0x6f7fa7).fillRoundedRect(5, 10, 34, 24, 6);
    g.fillStyle(0xffcc33).fillCircle(13, 22, 6).fillCircle(31, 22, 6);
    g.fillStyle(0x26334f).fillRect(17, 3, 10, 36);
    g.lineStyle(2, 0xb7c5ef).strokeRoundedRect(5, 10, 34, 24, 6);
    g.generateTexture('stageOneBossArm', 44, 44);
    g.clear();
    g.fillStyle(0x203450).fillCircle(22, 22, 17);
    g.fillStyle(0x48d7ff).fillCircle(22, 22, 11);
    g.fillStyle(0xf4f7ff).fillCircle(19, 18, 4);
    g.lineStyle(3, 0x7cff6b).strokeCircle(22, 22, 18);
    g.generateTexture('stageOneBossCore', 44, 44);
    // 戦車：履帯と円形砲塔
    g.clear();
    g.fillStyle(0x5a3b08).fillRect(2, 8, 8, 34).fillRect(34, 8, 8, 34);
    g.fillStyle(0xffcc33).fillRect(9, 12, 26, 27);
    g.fillStyle(0x08111f).fillRect(19, 0, 6, 21);
    g.fillStyle(0xffe58a).fillCircle(22, 23, 10);
    g.lineStyle(2, 0x5a3b08).strokeCircle(22, 23, 10).strokeRect(9, 12, 26, 27);
    g.generateTexture('groundTank', 44, 44);
    // 対空戦車：角型車体と二連砲
    g.clear();
    g.fillStyle(0x8a6512).fillRect(3, 12, 38, 29);
    g.fillStyle(0xffcc33).fillRect(9, 17, 26, 20);
    g.fillStyle(0x08111f).fillRect(14, 0, 5, 22).fillRect(25, 0, 5, 22);
    g.lineStyle(2, 0xffe58a).strokeRect(3, 12, 38, 29);
    g.generateTexture('groundFlak', 44, 44);
    // 固定砲台：八角形基部
    g.clear();
    g.fillStyle(0xff9f1c);
    g.fillPoints(
      [
        [12, 2],
        [32, 2],
        [42, 12],
        [42, 32],
        [32, 42],
        [12, 42],
        [2, 32],
        [2, 12],
      ].map(([x, y]) => new Phaser.Geom.Point(x!, y!)),
      true,
    );
    g.fillStyle(0x5a3b08).fillCircle(22, 22, 11).fillRect(19, 0, 6, 23);
    g.lineStyle(2, 0xffe58a).strokeCircle(22, 22, 11);
    g.generateTexture('groundTurret', 44, 44);
    g.clear().fillStyle(0xf4f7ff).fillCircle(4, 4, 4).generateTexture('bullet', 8, 8);
    g.destroy();
  }
  private fireAir() {
    this.lastAir = this.time.now;
    playShot();
    const b = this.playerBullets.get(
      this.player.x,
      this.player.y - 28,
      'bullet',
    ) as Phaser.Physics.Arcade.Sprite;
    if (b) b.enableBody(true, this.player.x, this.player.y - 28, true, true).setVelocityY(-650);
  }
  private fireGroundLasers() {
    if (this.groundLocks.length === 0) return;
    this.lastGroundLaser = this.time.now;
    playGroundLaser();
    const targets = [...this.groundLocks];
    this.groundLocks = [];
    targets.forEach((target, index) => this.launchGuidedLaser(target, index));
  }
  private updateGroundLocks(reticle: { x: number; y: number }) {
    this.groundLocks = this.groundLocks.filter(
      (enemy) => enemy.active && enemy.targetClass === 'ground' && enemy.y < 990,
    );
    this.enemies.getChildren().forEach((object) => {
      const enemy = object as Enemy;
      if (enemy.active && enemy.targetClass === 'ground' && isInsideLockOnRadius(reticle, enemy)) {
        const nextLocks = addLock(this.groundLocks, enemy);
        if (nextLocks !== this.groundLocks) playLockOn(nextLocks.length);
        this.groundLocks = nextLocks;
      }
    });
    this.lockOnDisplay.clear();
    this.groundLocks.forEach((enemy, index) => {
      const pulse = 1 + Math.sin(this.time.now / 90) * 0.12;
      this.lockOnDisplay.lineStyle(3, 0x7cff6b, 0.95);
      this.lockOnDisplay.strokeCircle(enemy.x, enemy.y, (24 + index * 2) * pulse);
      for (let tick = 0; tick <= index; tick += 1)
        this.lockOnDisplay
          .fillStyle(0x7cff6b)
          .fillCircle(enemy.x - index * 6 + tick * 12, enemy.y - 34, 3);
    });
  }
  private launchGuidedLaser(target: Enemy, index: number) {
    const start = { x: this.player.x, y: this.player.y - 18 };
    const attackSequence = target.attackSequence;
    const curveSide = index % 2 === 0 ? -1 : 1;
    const progress = { value: 0 };
    const laser = this.add.graphics().setDepth(18);
    this.tweens.add({
      targets: progress,
      value: 1,
      duration: 360 + index * 55,
      ease: 'Sine.In',
      onUpdate: () => {
        const end = { x: target.x, y: target.y };
        const control = {
          x: (start.x + end.x) / 2 + curveSide * (105 + index * 24),
          y: Math.min(start.y, end.y) - 110,
        };
        laser.clear();
        laser.lineStyle(8, 0x48d7ff, 0.18);
        this.drawLaserCurve(laser, start, control, end, progress.value);
        laser.lineStyle(3, 0x7cff6b, 0.95);
        this.drawLaserCurve(laser, start, control, end, progress.value);
        const head = quadraticLaserPoint(start, control, end, progress.value);
        laser.fillStyle(0xffffff, 1).fillCircle(head.x, head.y, 5);
      },
      onComplete: () => {
        laser.destroy();
        if (target.active && target.attackSequence === attackSequence)
          this.damageEnemy(target, 'ground');
      },
    });
  }
  private drawLaserCurve(
    graphics: Phaser.GameObjects.Graphics,
    start: { x: number; y: number },
    control: { x: number; y: number },
    end: { x: number; y: number },
    progress: number,
  ) {
    graphics.beginPath().moveTo(start.x, start.y);
    const steps = Math.max(2, Math.ceil(progress * 20));
    for (let step = 1; step <= steps; step += 1) {
      const point = quadraticLaserPoint(start, control, end, (progress * step) / steps);
      graphics.lineTo(point.x, point.y);
    }
    graphics.strokePath();
  }
  private createCrosshair() {
    const crosshair = this.add.graphics();
    crosshair.lineStyle(2, 0x7cff6b, 1);
    crosshair.strokeCircle(0, 0, 15);
    crosshair.lineBetween(-25, 0, -8, 0);
    crosshair.lineBetween(8, 0, 25, 0);
    crosshair.lineBetween(0, -25, 0, -8);
    crosshair.lineBetween(0, 8, 0, 25);
    crosshair.fillStyle(0x7cff6b, 1);
    crosshair.fillCircle(0, 0, 2);
    return crosshair;
  }
  private processTimeline() {
    const due = collectDueEvents(this.stageTimeline, this.timelineCursor, this.elapsed * 1000);
    this.timelineCursor = due.nextCursor;
    due.events.forEach((event) => {
      if (event.type === 'enemy_wave')
        event.enemies.forEach((enemy) => this.spawnTimelineEnemy(enemy));
      else if (event.type === 'checkpoint') {
        if (event.progressSeconds > this.session.checkpointProgress) {
          this.session.checkpointProgress = event.progressSeconds;
          this.session.checkpointId = event.checkpointId;
          if (event.progressSeconds < this.stageDef.duration) this.showCheckpoint();
        }
      } else if (event.type === 'boss_warning') this.showBossWarning(event.message);
      else if (event.type === 'midboss_start') this.spawnMidboss(event.name, event.hp, event.score);
      else this.spawnBoss();
    });
  }
  private showBossWarning(message: string) {
    playWarning();
    this.bossWarning?.destroy();
    this.bossWarning = this.add
      .text(270, 300, message, {
        fontSize: '44px',
        color: '#FF4D5A',
        fontStyle: 'bold',
        backgroundColor: '#08111FCC',
        padding: { x: 18, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(25);
    this.tweens.add({
      targets: this.bossWarning,
      alpha: 0.25,
      duration: 180,
      yoyo: true,
      repeat: 4,
    });
  }
  private tryActivateSyncBurst() {
    if (!activateSyncBurst(this.session.combat, this.time.now)) return;
    playSyncBurst();
    this.enemyBullets.clear(true, true);
    this.createEffectBurst(this.player.x, this.player.y, 0x7cff6b, 18, 110);
    this.player.setTint(0x7cff6b);
    this.cameras.main.flash(120, 72, 215, 255, false);
    this.time.delayedCall(4000, () => {
      if (!isSyncBurstActive(this.session.combat, this.time.now)) this.player.clearTint();
    });
  }
  private spawnTimelineEnemy(definition: TimelineEnemy) {
    const archetype = enemyArchetypes[definition.archetypeId];
    const e = this.enemies.get(definition.spawnX, definition.spawnY, archetype.textureKey) as Enemy;
    if (!e) return;
    e.enableBody(true, definition.spawnX, definition.spawnY, true, true)
      .setTexture(archetype.textureKey)
      .setScale(1)
      .setImmovable(false)
      .setAlpha(1)
      .clearTint();
    e.archetypeId = definition.archetypeId;
    e.targetClass = archetype.targetClass;
    e.hp = NORMAL_ENEMY_HP;
    e.points = archetype.score;
    e.lastShot = this.time.now;
    e.movementPath = definition.movementPath;
    e.pathOriginX = definition.spawnX;
    e.spawnedAt = this.time.now;
    e.attackSequence = (e.attackSequence ?? 0) + 1;
    e.isMidboss = false;
    if (definition.movementPath.kind === 'linear')
      e.setVelocity(
        definition.movementPath.velocityX * archetype.speedMultiplier,
        definition.movementPath.velocityY * archetype.speedMultiplier,
      );
    else e.setVelocity(0, definition.movementPath.velocityY * archetype.speedMultiplier);
  }
  private isBossPart(enemy: Enemy) {
    return Boolean(enemy.bossPart && this.bossEncounter);
  }
  private updateBossParts() {
    if (!this.boss || !this.bossEncounter) return;
    const cycle = this.stageDef.boss.movementCycle;
    if (this.bossEncounter.motionMode === 'move') {
      const t = this.bossEncounter.motionElapsedMs / cycle.periodMs;
      this.bossAnchor = {
        x: 270 + Math.sin(t * Math.PI * 2) * cycle.horizontalAmplitude,
        y: 120 + Math.sin(t * Math.PI * 4) * cycle.verticalAmplitude,
      };
    }
    Object.values(this.bossParts).forEach((part) => {
      if (!part?.active) return;
      part.setPosition(
        this.bossAnchor.x + (part.bossOffsetX ?? 0),
        this.bossAnchor.y + (part.bossOffsetY ?? 0),
      );
      part.setVelocity(0, 0);
    });
  }
  private updateEnemy(e: Enemy) {
    if (!e.active) return;
    if (this.isBossPart(e)) {
      if (e.bossPart === 'core' && !this.bossEncounter!.coreExposed) return;
      const bossPhase = currentBossPhase(this.stageDef.boss, this.bossEncounter!);
      const stopMultiplier = this.bossEncounter!.motionMode === 'barrage-stop' ? 0.52 : 1;
      const bulletInterval =
        this.stageDef.boss.bulletInterval * bossPhase.bulletIntervalMultiplier * stopMultiplier;
      if (this.time.now - e.lastShot > bulletInterval) {
        e.lastShot = this.time.now;
        this.fireEnemyAttack(e);
      }
      return;
    }
    if (e.movementPath?.kind === 'sine') {
      const age = this.time.now - e.spawnedAt;
      e.setX(
        Phaser.Math.Clamp(
          e.pathOriginX +
            Math.sin((age / e.movementPath.periodMs) * Math.PI * 2) * e.movementPath.amplitude,
          30,
          510,
        ),
      );
    }
    if (e.y > 1000) {
      e.disableBody(true, true);
      return;
    }
    const bulletInterval =
      e.targetClass === 'air'
        ? this.stageDef.airBulletInterval * enemyArchetypes[e.archetypeId].attackCooldownMultiplier
        : this.stageDef.groundBulletInterval *
          enemyArchetypes[e.archetypeId].attackCooldownMultiplier;
    if (this.time.now - e.lastShot > bulletInterval) {
      e.lastShot = this.time.now;
      this.fireEnemyAttack(e);
    }
  }
  private fireEnemyAttack(enemy: Enemy) {
    const archetype = enemyArchetypes[enemy.archetypeId];
    const bossPhase = this.isBossPart(enemy)
      ? currentBossPhase(this.stageDef.boss, this.bossEncounter!)
      : undefined;
    const pattern: BulletPatternId =
      bossPhase && this.bossEncounter
        ? this.bossEncounter.motionMode === 'barrage-stop' && enemy.bossPart !== 'core'
          ? 'radial-8'
          : nextBossPattern(this.stageDef.boss, this.bossEncounter)
        : archetype.attackPattern;
    const target = { x: this.player.x, y: this.player.y };
    const speed = scaledEnemyBulletSpeed(
      (190 + this.session.currentStage * 12) *
        (bossPhase ? bossPhase.bulletSpeedMultiplier : archetype.bulletSpeedMultiplier),
    );
    if (pattern !== 'telegraphed-fan-3') {
      this.spawnEnemyBullets(enemy.x, enemy.y + 20, target, pattern, speed);
      return;
    }
    const attackSequence = enemy.attackSequence;
    const telegraph = this.add.graphics().setDepth(12);
    telegraph.lineStyle(3, 0xff4d5a, 0.55).lineBetween(enemy.x, enemy.y, target.x, target.y);
    this.time.delayedCall(450, () => {
      telegraph.destroy();
      if (!enemy.active || enemy.attackSequence !== attackSequence) return;
      this.spawnEnemyBullets(enemy.x, enemy.y + 20, target, pattern, speed);
    });
  }
  private spawnEnemyBullets(
    originX: number,
    originY: number,
    target: { x: number; y: number },
    pattern: BulletPatternId,
    speed: number,
  ) {
    createBulletPattern(pattern, { x: originX, y: originY }, target, speed).forEach((velocity) => {
      const bullet = this.enemyBullets.get(
        originX,
        originY,
        'bullet',
      ) as Phaser.Physics.Arcade.Sprite;
      if (!bullet) return;
      bullet
        .setScale(1)
        .setAlpha(1)
        .setTint(0xff4d5a)
        .enableBody(true, originX, originY, true, true)
        .setVelocity(velocity.x, velocity.y);
    });
  }
  private hitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: Enemy, attack: 'air' | 'ground') {
    if (!enemy.active || enemy.targetClass !== attack) return;
    bullet.disableBody(true, true);
    this.damageEnemy(enemy, attack);
  }
  private damageEnemy(enemy: Enemy, attack: 'air' | 'ground') {
    if (!enemy.active || enemy.targetClass !== attack) return;
    enemy.setTintFill(0xffffff);
    playEnemyHit();
    this.time.delayedCall(50, () => enemy.active && enemy.clearTint());
    if (enemy.bossPart && this.bossEncounter) {
      const result = damageBossPart(this.bossEncounter, enemy.bossPart, 1);
      enemy.hp = this.bossEncounter.parts[enemy.bossPart].hp;
      if (result.partDestroyed) {
        this.createDestructionEffect(
          enemy.x,
          enemy.y,
          'air',
          enemy.bossPart === 'core' ? 'boss' : 'midboss',
        );
        enemy.disableBody(true, true);
      }
      if (result.coreExposed) this.exposeBossCore();
      if (result.status === 'defeated') {
        const score = this.awardDefeat('air', this.stageDef.boss.score);
        this.showScorePopup(enemy.x, enemy.y, score);
        this.finishBoss(true);
      }
      return;
    }
    enemy.hp -= 1;
    if (enemy.hp <= 0) {
      const score = this.awardDefeat(enemy.targetClass, enemy.points);
      this.showScorePopup(enemy.x, enemy.y, score);
      this.createDestructionEffect(
        enemy.x,
        enemy.y,
        enemy.targetClass,
        enemy.isMidboss ? 'midboss' : 'normal',
      );
      if (enemy.isMidboss) {
        this.midbossLabel?.destroy();
        this.midbossLabel = undefined;
      }
      enemy.disableBody(true, true);
    }
  }
  private spawnMidboss(name: string, hp: number, score: number) {
    const e = this.enemies.get(270, 105, 'airGunship') as Enemy;
    if (!e) return;
    e.enableBody(true, 270, 105, true, true)
      .setTexture('airGunship')
      .setScale(1.75)
      .setVelocity(70, 24)
      .setAlpha(1)
      .clearTint();
    e.archetypeId = 'air-gunship';
    e.targetClass = 'air';
    e.hp = hp;
    e.points = score;
    e.lastShot = this.time.now;
    e.movementPath = { kind: 'sine', velocityY: 24, amplitude: 150, periodMs: 2800 };
    e.pathOriginX = 270;
    e.spawnedAt = this.time.now;
    e.attackSequence = (e.attackSequence ?? 0) + 1;
    e.isMidboss = true;
    this.midbossLabel?.destroy();
    this.midbossLabel = this.add
      .text(270, 82, name, { fontSize: '16px', color: '#FFCC33', backgroundColor: '#08111FCC' })
      .setOrigin(0.5)
      .setDepth(20);
  }
  private updateStageBackdrop() {
    this.stageBackdrop.clear();
    if (this.session.currentStage !== 1) return;
    const elapsedMs = this.elapsed * 1000;
    const segment =
      stageOneMapSegments.find((item) => elapsedMs >= item.fromMs && elapsedMs < item.toMs) ??
      stageOneMapSegments.at(-1)!;
    this.stageBackdrop.fillStyle(segment.waterColor).fillRect(0, 0, 540, 960);
    segment.terrain.forEach((terrain) => {
      this.stageBackdrop.fillStyle(terrain.color).fillRect(terrain.x, 0, terrain.width, 960);
      this.stageBackdrop.lineStyle(3, 0x7a9a83, 0.8).lineBetween(terrain.x, 0, terrain.x, 960);
      this.stageBackdrop.lineBetween(terrain.x + terrain.width, 0, terrain.x + terrain.width, 960);
    });
    const offset = (this.elapsed * 95) % 120;
    this.stageBackdrop.lineStyle(2, 0x72c7df, 0.18);
    for (let y = -120 + offset; y < 960; y += 120) this.stageBackdrop.lineBetween(80, y, 460, y);
  }
  private awardDefeat(target: 'air' | 'ground', baseScore: number) {
    const reward = registerDefeat(this.session.combat, target, baseScore, this.time.now);
    this.session.score += reward.score;
    if (reward.alternating && this.session.combat.chainCount % 2 === 0)
      this.showCombatNotice(`CHAIN x${this.session.combat.scoreMultiplier}`, 0x7cff6b);
    return reward.score;
  }
  private spawnBossPart(partId: BossPartId, texture: string, scale: number) {
    const partDef = this.stageDef.boss.parts[partId];
    const e = this.enemies.get(
      this.bossAnchor.x + partDef.offsetX,
      this.bossAnchor.y + partDef.offsetY,
      texture,
    ) as Enemy;
    if (!e) return undefined;
    e.enableBody(
      true,
      this.bossAnchor.x + partDef.offsetX,
      this.bossAnchor.y + partDef.offsetY,
      true,
      true,
    )
      .setTexture(texture)
      .setScale(scale)
      .setImmovable(false)
      .setVelocity(0, 0)
      .setAlpha(partId === 'core' ? 0.65 : 1)
      .clearTint();
    e.targetClass = 'air';
    e.archetypeId = 'air-gunship';
    e.hp = partDef.hp;
    e.points = 0;
    e.lastShot = this.time.now;
    e.movementPath = { kind: 'linear', velocityX: 0, velocityY: 0 };
    e.pathOriginX = e.x;
    e.spawnedAt = this.time.now;
    e.attackSequence = (e.attackSequence ?? 0) + 1;
    e.isMidboss = false;
    e.bossPart = partId;
    e.bossOffsetX = partDef.offsetX;
    e.bossOffsetY = partDef.offsetY;
    const body = e.body as Phaser.Physics.Arcade.Body;
    body.setSize(partId === 'core' ? 24 : 34, partId === 'core' ? 28 : 24);
    return e;
  }
  private exposeBossCore() {
    const core = this.bossParts.core;
    if (!core?.active) return;
    core.setTexture('stageOneBossCore').setAlpha(1).setTint(0x48d7ff);
    this.cameras.main.flash(180, 72, 215, 255, false);
    this.createEffectBurst(core.x, core.y, 0x48d7ff, 22, 120);
    this.showCombatNotice('CORE EXPOSED', 0x48d7ff);
    this.time.delayedCall(220, () => core.active && core.clearTint());
  }
  private spawnBoss() {
    this.bossWarning?.destroy();
    this.bossWarning = undefined;
    this.enemies.clear(true, true);
    this.enemyBullets.clear(true, true);
    this.groundLocks = [];
    this.lockOnDisplay.clear();
    this.bossAnchor = { x: 270, y: 120 };
    this.bossParts = {
      core: this.spawnBossPart(
        'core',
        this.session.currentStage === 1 ? 'stageOneBoss' : 'airGunship',
        2.8,
      ),
      'left-arm': this.spawnBossPart(
        'left-arm',
        this.session.currentStage === 1 ? 'stageOneBossArm' : 'airGunship',
        2,
      ),
      'right-arm': this.spawnBossPart(
        'right-arm',
        this.session.currentStage === 1 ? 'stageOneBossArm' : 'airGunship',
        2,
      ),
    };
    if (this.bossParts['right-arm']) this.bossParts['right-arm'].setFlipX(true);
    this.boss = this.bossParts.core;
    if (!this.boss) return;
    this.bossEncounter = beginBossEncounter(this.stageDef.boss);
    this.bossPhaseId = this.stageDef.boss.phases[0]!.id;
    startBgm('boss');
    this.cameras.main.shake(350, 0.006);
    this.createEffectBurst(this.boss.x, this.boss.y, 0x48d7ff, 20, 140);
    this.session.bossState = 'active';
    this.bossHud.setVisible(true);
    this.session.checkpointProgress = this.stageDef.duration;
    this.session.checkpointId = `stage-${this.session.currentStage}-boss`;
  }
  private finishBoss(defeated: boolean) {
    if (!this.boss) return;
    Object.values(this.bossParts).forEach((part) => part?.disableBody(true, true));
    this.boss = undefined;
    this.bossParts = {};
    this.bossEncounter = undefined;
    this.bossPhaseId = undefined;
    this.bossHud.setVisible(false);
    const outcome = resolveBoss(this.session, defeated);
    if (outcome === 'game_clear') {
      playClear();
      this.scene.start('result', { score: this.session.score, stage: 5, outcome });
    } else this.startStage(this.session.currentStage, 0);
  }
  private destroyPlayer() {
    if (this.invulnerable || this.session.playerState !== 'playing') return;
    this.invulnerable = true;
    this.createPlayerExplosion(this.player.x, this.player.y);
    this.player.setVisible(false).setVelocity(0);
    const result = applyPlayerDestroyed(this.session);
    if (result === 'game_over') {
      stopBgm();
      this.time.delayedCall(700, () =>
        this.scene.start('result', {
          score: this.session.score,
          stage: this.session.currentStage,
          outcome: 'game_over',
        }),
      );
      return;
    }
    this.time.delayedCall(900, () => {
      this.enemies.clear(true, true);
      this.enemyBullets.clear(true, true);
      this.groundLocks = [];
      this.lockOnDisplay.clear();
      this.bossWarning?.destroy();
      this.bossWarning = undefined;
      this.boss = undefined;
      this.bossParts = {};
      this.bossEncounter = undefined;
      this.bossPhaseId = undefined;
      this.bossHud.setVisible(false);
      this.elapsed = this.session.checkpointProgress;
      this.timelineCursor = findTimelineCursor(
        this.stageTimeline,
        this.session.checkpointProgress * 1000,
      );
      this.player.setPosition(270, 800).setVisible(true);
      this.session.playerState = 'playing';
      this.player.setAlpha(1);
      this.tweens.add({ targets: this.player, alpha: 0.25, duration: 100, yoyo: true, repeat: 6 });
      this.time.delayedCall(1400, () => {
        this.player.setAlpha(1);
        this.invulnerable = false;
      });
    });
  }

  private showCheckpoint() {
    playCheckpoint();
    this.showCombatNotice('CHECKPOINT', 0x48d7ff);
  }

  private showBossPhaseChange() {
    playBossPhase();
    this.cameras.main.flash(180, 255, 77, 90, false);
    this.cameras.main.shake(220, 0.004);
    this.showCombatNotice('ATTACK SHIFT', 0xffcc33);
  }

  private showCombatNotice(message: string, color: number) {
    const text = this.add
      .text(270, 245, message, {
        fontSize: '26px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(24);
    this.tweens.add({
      targets: text,
      y: 215,
      alpha: 0,
      duration: 850,
      onComplete: () => text.destroy(),
    });
  }

  private showScorePopup(x: number, y: number, score: number) {
    const text = this.add
      .text(x, y, `+${score}`, { fontSize: '17px', color: '#F4F7FF', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(15);
    this.tweens.add({
      targets: text,
      y: y - 42,
      alpha: 0,
      duration: 650,
      onComplete: () => text.destroy(),
    });
  }

  private createEffectBurst(x: number, y: number, color: number, count: number, distance: number) {
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2;
      const particle = this.add.circle(x, y, index % 3 === 0 ? 5 : 3, color, 0.9).setDepth(14);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 420 + (index % 4) * 55,
        onComplete: () => particle.destroy(),
      });
    }
  }

  private createDestructionEffect(
    x: number,
    y: number,
    target: 'air' | 'ground',
    scale: DestructionScale,
  ) {
    const profile = destructionEffectProfile(target, scale);
    playDestruction(scale);
    this.physics.world.pause();
    this.time.delayedCall(profile.hitStopMs, () => this.physics.world.resume());
    this.cameras.main.shake(profile.cameraShakeMs, profile.cameraShake);

    const flash = this.add.circle(x, y, 14, profile.coreColor, 0.95).setDepth(17);
    this.tweens.add({
      targets: flash,
      scale: scale === 'normal' ? 3.2 : 5.5,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });
    const shockwave = this.add
      .circle(x, y, 18, profile.coreColor, 0)
      .setStrokeStyle(scale === 'normal' ? 3 : 5, profile.coreColor, 0.9)
      .setDepth(16);
    this.tweens.add({
      targets: shockwave,
      scale: profile.radius / 18,
      alpha: 0,
      duration: profile.durationMs,
      ease: 'Cubic.Out',
      onComplete: () => shockwave.destroy(),
    });

    for (let index = 0; index < profile.particleCount; index += 1) {
      const angle = (index / profile.particleCount) * Math.PI * 2;
      const spread = profile.radius * (0.55 + (index % 5) * 0.1);
      const particle = this.add
        .circle(x, y, index % 4 === 0 ? 6 : 3, index % 3 === 0 ? 0xffffff : profile.coreColor, 0.95)
        .setDepth(16);
      this.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * spread,
        y: y + Math.sin(angle) * spread,
        alpha: 0,
        scale: 0.15,
        duration: profile.durationMs * (0.65 + (index % 4) * 0.1),
        ease: 'Quad.Out',
        onComplete: () => particle.destroy(),
      });
    }

    for (let index = 0; index < profile.fragmentCount; index += 1) {
      const angle = (index / profile.fragmentCount) * Math.PI * 2 + 0.2;
      const fragment = this.add
        .rectangle(x, y, 5 + (index % 3) * 3, 12 + (index % 2) * 7, profile.fragmentColor)
        .setRotation(angle)
        .setDepth(15);
      this.tweens.add({
        targets: fragment,
        x: x + Math.cos(angle) * profile.radius * 0.75,
        y: y + Math.sin(angle) * profile.radius * 0.75 + 45,
        rotation: angle + Math.PI * (2 + (index % 3)),
        alpha: 0,
        duration: profile.durationMs + 180,
        ease: 'Quad.Out',
        onComplete: () => fragment.destroy(),
      });
    }

    for (let burst = 1; burst < profile.explosionBursts; burst += 1) {
      this.time.delayedCall(burst * 90, () => {
        const offsetX = ((burst * 47) % 90) - 45;
        const offsetY = ((burst * 31) % 70) - 35;
        this.createEffectBurst(
          x + offsetX,
          y + offsetY,
          burst % 2 === 0 ? profile.coreColor : 0xff7a32,
          8,
          55 + burst * 9,
        );
      });
    }
  }

  private createPlayerExplosion(x: number, y: number) {
    const profile = playerDestructionEffectProfile();
    playPlayerDestroyed();
    this.physics.world.pause();
    this.time.delayedCall(profile.hitStopMs, () => this.physics.world.resume());
    this.cameras.main.flash(140, 72, 215, 255, false);
    this.cameras.main.shake(profile.cameraShakeMs, profile.cameraShake);

    const core = this.add.circle(x, y, 16, profile.coreColor, 1).setDepth(19);
    this.tweens.add({
      targets: core,
      scale: 5,
      alpha: 0,
      duration: 190,
      onComplete: () => core.destroy(),
    });
    const shockwave = this.add
      .circle(x, y, 20, profile.coreColor, 0)
      .setStrokeStyle(5, profile.coreColor, 0.95)
      .setDepth(18);
    this.tweens.add({
      targets: shockwave,
      scale: profile.radius / 20,
      alpha: 0,
      duration: profile.durationMs,
      ease: 'Cubic.Out',
      onComplete: () => shockwave.destroy(),
    });
    for (let index = 0; index < profile.fragmentCount; index += 1) {
      const angle = (index / profile.fragmentCount) * Math.PI * 2;
      const fragment = this.add
        .triangle(x, y, 0, 0, 9, 18, 18, 0, profile.fragmentColor, 1)
        .setDepth(18)
        .setRotation(angle);
      this.tweens.add({
        targets: fragment,
        x: x + Math.cos(angle) * profile.radius,
        y: y + Math.sin(angle) * profile.radius,
        rotation: angle + Math.PI * 3,
        alpha: 0,
        duration: profile.durationMs + (index % 3) * 70,
        ease: 'Quad.Out',
        onComplete: () => fragment.destroy(),
      });
    }
    for (let burst = 0; burst < profile.explosionBursts; burst += 1)
      this.time.delayedCall(burst * 85, () =>
        this.createEffectBurst(
          x + ((burst * 41) % 56) - 28,
          y + ((burst * 29) % 48) - 24,
          burst % 2 === 0 ? profile.coreColor : 0xfff2d0,
          10,
          75 + burst * 18,
        ),
      );
  }
}
