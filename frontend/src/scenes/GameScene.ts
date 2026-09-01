import Phaser from 'phaser';
import { applyPlayerDestroyed, newSession, resolveBoss, type GameSession } from '../game/state';
import { activeAttacks, clampPlayer, groundTargetPosition } from '../game/rules';
import { stages, validateStages, type StageDefinition } from '../game/stages';
import { playBomb, playClear, playExplosion, playShot, startBgm, stopBgm } from '../audio';

type Enemy = Phaser.Physics.Arcade.Sprite & {
  targetClass: 'air' | 'ground';
  hp: number;
  points: number;
  lastShot: number;
};

export class GameScene extends Phaser.Scene {
  private session!: GameSession;
  private stageDef!: StageDefinition;
  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private playerBullets!: Phaser.Physics.Arcade.Group;
  private enemyBullets!: Phaser.Physics.Arcade.Group;
  private bombs!: Phaser.Physics.Arcade.Group;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private z!: Phaser.Input.Keyboard.Key;
  private x!: Phaser.Input.Keyboard.Key;
  private elapsed = 0;
  private lastSpawn = 0;
  private lastAir = 0;
  private lastBomb = 0;
  private boss?: Enemy;
  private bossRemaining = 0;
  private hud!: Phaser.GameObjects.Text;
  private bossHud!: Phaser.GameObjects.Text;
  private groundTarget!: Phaser.GameObjects.Graphics;
  private invulnerable = false;
  constructor() {
    super('game');
  }

  create() {
    const errors = validateStages(stages);
    if (errors.length) throw new Error(errors.join(', '));
    this.session = newSession();
    startBgm();
    this.makeTextures();
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.z = this.input.keyboard!.addKey('Z');
    this.x = this.input.keyboard!.addKey('X');
    this.playerBullets = this.physics.add.group({ maxSize: 80 });
    this.enemyBullets = this.physics.add.group({ maxSize: 100 });
    this.bombs = this.physics.add.group({ maxSize: 12 });
    this.enemies = this.physics.add.group({ maxSize: 50 });
    this.player = this.physics.add.sprite(270, 800, 'player').setCollideWorldBounds(true);
    this.groundTarget = this.createCrosshair().setAlpha(0.85).setDepth(5);
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
    this.physics.add.overlap(this.bombs, this.enemies, (b, e) =>
      this.hitEnemy(b as Phaser.Physics.Arcade.Sprite, e as Enemy, 'ground'),
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
    this.elapsed += delta / 1000;
    const attacks = activeAttacks(this.z.isDown, this.x.isDown);
    if (attacks.includes('air') && this.time.now - this.lastAir > 150) this.fireAir();
    if (attacks.includes('ground') && this.time.now - this.lastBomb > 600) this.fireBomb();
    if (!this.boss) {
      if (this.time.now - this.lastSpawn > this.stageDef.enemyInterval) this.spawnWave();
      this.updateCheckpoint();
      if (this.elapsed >= this.stageDef.duration) this.spawnBoss();
    } else {
      this.bossRemaining -= delta / 1000;
      this.bossHud.setText(
        `BOSS  ${Math.max(0, this.boss.hp)} / ${this.stageDef.boss.hp}　 TIME ${Math.ceil(Math.max(0, this.bossRemaining))}`,
      );
      if (this.bossRemaining <= 0) this.finishBoss(false);
    }
    this.enemies.getChildren().forEach((obj) => this.updateEnemy(obj as Enemy));
    [
      ...this.playerBullets.getChildren(),
      ...this.enemyBullets.getChildren(),
      ...this.bombs.getChildren(),
    ].forEach((obj) => {
      const s = obj as Phaser.Physics.Arcade.Sprite;
      if (s.active && (s.y < -40 || s.y > 1000)) s.disableBody(true, true);
    });
    this.hud.setText(
      `SCORE ${String(this.session.score).padStart(8, '0')}　　 STAGE ${this.session.currentStage}　　 LIFE ${this.session.lives}`,
    );
  }

  private startStage(stage: number, progress: number) {
    this.stageDef = stages[stage - 1]!;
    this.elapsed = progress;
    this.lastSpawn = this.time.now;
    this.cameras.main.setBackgroundColor(
      [0x081a2f, 0x0d2b28, 0x222345, 0x321c22, 0x12142e][stage - 1]!,
    );
    this.add
      .text(270, 150, `STAGE ${stage}\n${this.stageDef.name}`, {
        fontSize: '28px',
        color: '#48D7FF',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setAlpha(0.9)
      .setScrollFactor(0);
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
    g.generateTexture('airEnemy', 44, 44);
    g.clear();
    g.fillStyle(0x5a3b08).fillRect(2, 8, 8, 34).fillRect(34, 8, 8, 34);
    g.fillStyle(0xffcc33).fillRect(9, 12, 26, 27);
    g.fillStyle(0x08111f).fillRect(19, 0, 6, 21);
    g.fillStyle(0xffe58a).fillCircle(22, 23, 10);
    g.lineStyle(2, 0x5a3b08).strokeCircle(22, 23, 10).strokeRect(9, 12, 26, 27);
    g.generateTexture('groundEnemy', 44, 44);
    g.clear().fillStyle(0xf4f7ff).fillCircle(4, 4, 4).generateTexture('bullet', 8, 8);
    g.clear().fillStyle(0x7cff6b).fillCircle(8, 8, 8).generateTexture('bomb', 16, 16);
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
  private fireBomb() {
    this.lastBomb = this.time.now;
    playBomb();
    const target = groundTargetPosition(this.player.x, this.player.y);
    const marker = this.createCrosshair()
      .setPosition(target.x, target.y)
      .setAlpha(0.55)
      .setDepth(4);
    const b = this.bombs.get(
      this.player.x,
      this.player.y - 15,
      'bomb',
    ) as Phaser.Physics.Arcade.Sprite;
    if (b) {
      b.enableBody(true, this.player.x, this.player.y - 15, true, true);
      this.tweens.add({
        targets: b,
        x: target.x,
        y: target.y,
        scale: 0.3,
        duration: 400,
        onComplete: () => {
          this.physics.overlap(b, this.enemies, (_bomb, e) =>
            this.hitEnemy(b, e as Enemy, 'ground'),
          );
          b.disableBody(true, true);
          marker.destroy();
        },
      });
    }
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
  private spawnWave() {
    this.lastSpawn = this.time.now;
    const ground = Math.random() < 0.3;
    const texture = ground ? 'groundEnemy' : 'airEnemy';
    const e = this.enemies.get(Phaser.Math.Between(40, 500), -30, texture) as Enemy;
    if (!e) return;
    e.enableBody(true, e.x, -30, true, true);
    e.targetClass = ground ? 'ground' : 'air';
    e.hp = this.stageDef.enemyHp;
    e.points = ground ? 350 : 200;
    e.lastShot = this.time.now;
    e.setVelocity(
      ground ? Phaser.Math.Between(-20, 20) : Phaser.Math.Between(-45, 45),
      ground ? this.stageDef.enemySpeed * 0.45 : this.stageDef.enemySpeed,
    );
  }
  private updateEnemy(e: Enemy) {
    if (!e.active) return;
    if (e.y > 1000) {
      e.disableBody(true, true);
      return;
    }
    if (this.time.now - e.lastShot > this.stageDef.bulletInterval) {
      e.lastShot = this.time.now;
      const b = this.enemyBullets.get(e.x, e.y + 20, 'bullet') as Phaser.Physics.Arcade.Sprite;
      if (b) {
        b.setTint(0xff4d5a).enableBody(true, e.x, e.y + 20, true, true);
        this.physics.moveToObject(b, this.player, 190 + this.session.currentStage * 12);
      }
    }
  }
  private hitEnemy(bullet: Phaser.Physics.Arcade.Sprite, enemy: Enemy, attack: 'air' | 'ground') {
    if (!enemy.active || enemy.targetClass !== attack) return;
    bullet.disableBody(true, true);
    enemy.hp -= 1;
    enemy.setTintFill(0xffffff);
    this.time.delayedCall(50, () => enemy.active && enemy.clearTint());
    if (enemy.hp <= 0) {
      playExplosion();
      this.session.score += enemy.points;
      if (enemy === this.boss) {
        this.session.score += this.stageDef.boss.score;
        this.finishBoss(true);
      } else enemy.disableBody(true, true);
    }
  }
  private updateCheckpoint() {
    const passed = [...this.stageDef.checkpoints].reverse().find((cp) => cp <= this.elapsed)!;
    if (passed > this.session.checkpointProgress) {
      this.session.checkpointProgress = passed;
      this.session.checkpointId = `stage-${this.session.currentStage}-cp-${passed}`;
    }
  }
  private spawnBoss() {
    this.enemies.clear(true, true);
    this.enemyBullets.clear(true, true);
    const e = this.enemies.get(270, 120, 'airEnemy') as Enemy;
    e.enableBody(true, 270, 120, true, true).setScale(2.4).setImmovable(true);
    e.targetClass = 'air';
    e.hp = this.stageDef.boss.hp;
    e.points = 0;
    e.lastShot = this.time.now;
    this.boss = e;
    this.bossRemaining = this.stageDef.boss.timeout;
    this.session.bossState = 'active';
    this.bossHud.setVisible(true);
    this.session.checkpointProgress = this.stageDef.duration;
    this.session.checkpointId = `stage-${this.session.currentStage}-boss`;
  }
  private finishBoss(defeated: boolean) {
    if (!this.boss) return;
    this.boss.disableBody(true, true);
    this.boss = undefined;
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
    playExplosion();
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
      this.boss = undefined;
      this.bossHud.setVisible(false);
      this.elapsed = this.session.checkpointProgress;
      this.player.setPosition(270, 800).setVisible(true);
      this.session.playerState = 'playing';
      this.invulnerable = false;
    });
  }
}
