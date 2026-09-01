import Phaser from 'phaser';
import { getRanking } from '../api';

export class RankingScene extends Phaser.Scene {
  constructor() {
    super('ranking');
  }
  create() {
    this.cameras.main.setBackgroundColor(0x08111f);
    this.add
      .text(270, 100, 'SCORE RANKING', { fontSize: '36px', color: '#48D7FF', fontStyle: 'bold' })
      .setOrigin(0.5);
    const body = this.add
      .text(270, 210, '読み込み中...', {
        fontSize: '20px',
        color: '#F4F7FF',
        align: 'center',
        lineSpacing: 15,
      })
      .setOrigin(0.5, 0);
    getRanking()
      .then((scores) =>
        body.setText(
          scores.length
            ? scores
                .map(
                  (s) =>
                    `${String(s.rank).padStart(2)}.　${String(s.score).padStart(9)}　STAGE ${s.reachedStage}`,
                )
                .join('\n')
            : '記録なし',
        ),
      )
      .catch((error) => {
        console.error(error);
        body.setText('ランキングの取得に失敗しました');
      });
    this.add
      .text(270, 875, 'Z / Enter / Escape：戻る', { fontSize: '18px', color: '#FFCC33' })
      .setOrigin(0.5);
    const back = () => this.scene.start('menu');
    ['keydown-Z', 'keydown-ENTER', 'keydown-ESC'].forEach((event) =>
      this.input.keyboard!.on(event, back),
    );
  }
}
