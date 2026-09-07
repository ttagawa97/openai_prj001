import Phaser from 'phaser';

const C = { bg: 0x08111f, text: '#F4F7FF', accent: '#48D7FF', warning: '#FFCC33' };

export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private labels: Phaser.GameObjects.Text[] = [];
  constructor() {
    super('menu');
  }
  create() {
    this.selected = 0;
    this.labels = [];
    this.cameras.main.setBackgroundColor(C.bg);
    this.add
      .text(270, 185, '蒼穹ストライカー', { fontSize: '42px', color: C.accent, fontStyle: 'bold' })
      .setOrigin(0.5);
    this.add
      .text(270, 235, 'SKYLINE STRIKER', { fontSize: '17px', color: C.text, letterSpacing: 5 })
      .setOrigin(0.5);
    ['ゲーム開始', 'スコア表示', '設定', '終了'].forEach((label, i) =>
      this.labels.push(
        this.add.text(270, 375 + i * 68, label, { fontSize: '28px', color: C.text }).setOrigin(0.5),
      ),
    );
    this.add
      .text(
        270,
        790,
        'カーソルキー：移動 / 選択\nZ：空中攻撃 / 決定　 X：地上攻撃\nC：SYNC BURST',
        {
          fontSize: '17px',
          color: C.warning,
          align: 'center',
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5);
    this.input.keyboard!.on('keydown-UP', () => {
      this.selected = (this.selected + 3) % 4;
      this.drawSelection();
    });
    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selected = (this.selected + 1) % 4;
      this.drawSelection();
    });
    const decide = () => {
      if (this.selected === 0) this.scene.start('game');
      else if (this.selected === 1) this.scene.start('ranking');
      else if (this.selected === 2) this.scene.start('settings');
      else this.scene.start('exit');
    };
    this.input.keyboard!.on('keydown-Z', decide);
    this.input.keyboard!.on('keydown-ENTER', decide);
    this.drawSelection();
  }
  private drawSelection() {
    this.labels.forEach((label, i) =>
      label
        .setColor(i === this.selected ? C.accent : C.text)
        .setText(
          `${i === this.selected ? '▶ ' : ''}${['ゲーム開始', 'スコア表示', '設定', '終了'][i]}`,
        ),
    );
  }
}
