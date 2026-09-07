import Phaser from 'phaser';
import { adjustVolume, gameSettings } from '../game/settings';

const C = { bg: 0x08111f, text: '#F4F7FF', accent: '#48D7FF', warning: '#FFCC33' };

export class SettingsScene extends Phaser.Scene {
  private selected = 0;
  private values: Phaser.GameObjects.Text[] = [];

  constructor() {
    super('settings');
  }

  create() {
    this.selected = 0;
    this.values = [];
    this.cameras.main.setBackgroundColor(C.bg);
    this.add
      .text(270, 170, '設定', { fontSize: '40px', color: C.accent, fontStyle: 'bold' })
      .setOrigin(0.5);
    ['BGM音量', '効果音量'].forEach((label, index) => {
      this.add.text(125, 340 + index * 100, label, { fontSize: '25px', color: C.text });
      this.values.push(
        this.add
          .text(415, 340 + index * 100, '', { fontSize: '25px', color: C.text })
          .setOrigin(1, 0),
      );
    });
    this.add
      .text(270, 690, '上下：項目選択　左右：音量変更\nZ / Enter / Escape：戻る', {
        fontSize: '18px',
        color: C.warning,
        align: 'center',
        lineSpacing: 10,
      })
      .setOrigin(0.5);
    this.input.keyboard!.on('keydown-UP', () => {
      this.selected = (this.selected + 1) % 2;
      this.draw();
    });
    this.input.keyboard!.on('keydown-DOWN', () => {
      this.selected = (this.selected + 1) % 2;
      this.draw();
    });
    const adjust = (direction: -1 | 1) => {
      if (this.selected === 0)
        gameSettings.bgmVolume = adjustVolume(gameSettings.bgmVolume, direction);
      else gameSettings.sfxVolume = adjustVolume(gameSettings.sfxVolume, direction);
      this.draw();
    };
    this.input.keyboard!.on('keydown-LEFT', () => adjust(-1));
    this.input.keyboard!.on('keydown-RIGHT', () => adjust(1));
    const back = () => this.scene.start('menu');
    ['keydown-Z', 'keydown-ENTER', 'keydown-ESC'].forEach((event) =>
      this.input.keyboard!.on(event, back),
    );
    this.draw();
  }

  private draw() {
    [gameSettings.bgmVolume, gameSettings.sfxVolume].forEach((volume, index) =>
      this.values[index]!.setColor(index === this.selected ? C.accent : C.text).setText(
        `${index === this.selected ? '▶ ' : ''}${volume === 0 ? 'ミュート' : `${volume}%`}`,
      ),
    );
  }
}
