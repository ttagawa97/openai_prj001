import Phaser from 'phaser';
export class ExitScene extends Phaser.Scene {
  constructor() {
    super('exit');
  }
  create() {
    this.cameras.main.setBackgroundColor(0x000000);
    this.input.keyboard!.enabled = false;
    this.input.enabled = false;
  }
}
