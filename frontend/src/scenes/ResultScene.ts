import Phaser from 'phaser';
import { submitScore } from '../api';
import type { GameOutcome } from '@skyline/shared';
import { stopBgm } from '../audio';

export class ResultScene extends Phaser.Scene {
  private ready = false;
  private returning = false;
  private z!: Phaser.Input.Keyboard.Key;
  private enter!: Phaser.Input.Keyboard.Key;

  constructor() {
    super('result');
  }
  create(data: { score: number; stage: number; outcome: GameOutcome }) {
    this.ready = false;
    this.returning = false;
    this.z = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.enter = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    stopBgm();
    this.cameras.main.setBackgroundColor(0x08111f);
    this.add
      .text(270, 310, data.outcome === 'game_clear' ? 'GAME CLEAR' : 'GAME OVER', {
        fontSize: '52px',
        color: data.outcome === 'game_clear' ? '#48D7FF' : '#FF4D5A',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);
    this.add
      .text(270, 405, `SCORE  ${data.score}`, { fontSize: '30px', color: '#F4F7FF' })
      .setOrigin(0.5);
    const status = this.add
      .text(270, 500, 'スコアを登録中...', { fontSize: '18px', color: '#FFCC33' })
      .setOrigin(0.5);
    submitScore({ score: data.score, reachedStage: data.stage, outcome: data.outcome })
      .then(() => status.setText('スコアを登録しました'))
      .catch((error) => {
        console.error(error);
        status.setText('スコア登録に失敗しました');
      })
      .finally(() => {
        this.time.delayedCall(data.outcome === 'game_clear' ? 1800 : 400, () => {
          this.ready = true;
          status.setText(`${status.text}\n\nZ / Enter：タイトルへ`);
        });
      });
  }

  update() {
    if (
      this.ready &&
      !this.returning &&
      (Phaser.Input.Keyboard.JustDown(this.z) || Phaser.Input.Keyboard.JustDown(this.enter))
    ) {
      this.returning = true;
      this.scene.start('menu');
    }
  }
}
